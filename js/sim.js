// Simulación del mundo: contenedores y máquinas (cervecería, taberna, destilería, generador, tolvas),
// cultivos, líquidos que fluyen, electricidad y lógica (palancas, sensores, puertas, alarmas, torretas),
// protección de terreno y marcadores de aparición. La corre quien tiene la autoridad.
import { BLOCKS, CHUNK, HEIGHT, LIQ, LIQ_LEVEL, SOLID, OPAQUE, liquidId, CROPS, ITEMS, doorId, FLAMMABLE } from './blocks.js';

export const CONTAINER_SLOTS = { chest: 27, generator: 1, mill: 2, kettle: 6, fermenter: 6, cask: 9, tap: 9, still: 3, hopper: 5 };
const BEERS = [296, 297, 298, 316, 317, 318, 319];
export const MACHINE_INFO = {
  chest: { title: 'Cofre', labels: [] },
  generator: { title: 'Generador', labels: ['Combustible (carbón)'], accept: [[257]] },
  mill: { title: 'Molino de grano', labels: ['Malta', 'Molienda'], accept: [[287, 288], []] },
  kettle: {
    title: 'Olla de cocción', labels: ['Agua limpia', 'Malta molida ×4', 'Lúpulo ×2', 'Extra (opcional)', 'Carbón', 'Mosto'],
    accept: [[279, 277], [289, 290], [284], [261, 257, 327, 313], [257], []],
  },
  fermenter: {
    title: 'Fermentador', labels: ['Mosto', 'Levadura', 'Botellas ×4', 'Cerveza', 'Levadura recuperada', 'Limpieza (agua)'],
    accept: [[292, 293, 294, 320, 321, 322], [291], [295], [], [], [279, 277]],
  },
  cask: { title: 'Barril de añejamiento', labels: [], accept: new Array(9).fill(BEERS) },
  tap: { title: 'Chopera', labels: ['Cerveza', 'Cerveza', 'Cerveza', 'Cerveza', 'Cerveza', 'Cerveza', 'Caja', 'Caja', 'Caja'], accept: [...new Array(6).fill(BEERS), [], [], []] },
  still: { title: 'Alambique', labels: ['Para destilar', 'Carbón', 'Alcohol'], accept: [[...BEERS, 292, 293, 285, 282, 327], [257], []] },
  hopper: { title: 'Tolva', labels: [], accept: null },
};
const BEER_OF = { 292: 296, 293: 297, 294: 298, 320: 316, 321: 317, 322: 319 };
const GRIST_OF = { 287: 289, 288: 290 };
const ADJUNCT_WORT = { 261: 294, 257: 320, 327: 321, 313: 322 };
const AGE_STEP = 300; // segundos de añejamiento por estrella

const k3 = (x, y, z) => x + ',' + y + ',' + z;
const p3 = (k) => k.split(',').map(Number);
const CROP_IDS = new Set();
for (const c of Object.values(CROPS)) for (let s = 0; s < 4; s++) CROP_IDS.add(c.base + s);
export const BATTERY_MAX = 900; // segundos de energía
const CONDUCT = new Set([75, 78, 136, 138, 241, 243]); // cables, cercos, palanca, sensor, pulsador y placa encendidos
const SEATS = new Set([111, 112, 113, 114]);

export class Sim {
  constructor(world, meta) {
    this.world = world; this.meta = meta;
    this.containers = new Map(Object.entries(meta.containers || {}));
    for (const c of this.containers.values()) if (c.slots && CONTAINER_SLOTS[c.type] && c.slots.length < CONTAINER_SLOTS[c.type]) while (c.slots.length < CONTAINER_SLOTS[c.type]) c.slots.push(null);
    this.crops = new Set();
    this.elec = new Set();
    this.powered = new Set();
    this.fluidQ = new Set();
    this.markers = [];
    this.fires = new Map(); // "x,y,z" -> segundos encendido
    this.sprinklers = new Set();
    this.wet = new Set(); // aspersores con agua
    this.growMul = 1; // estación del año
    this.raining = false;
    this.onFire = null;
    this.authority = true;
    this.acc = { fluid: 0, crop: 0, power: 0, sync: 0, hopper: 0, turret: 0, fire: 0, pipe: 0 };
    this.dirtyContainers = new Set();
    this.onContainerSync = null;
    this.onTurretShot = null; this.onAlarm = null; this.onMarker = null;
    this.daylight = 1;
    this.entities = () => []; // posiciones de jugadores y criaturas (para sensores)
    this.mobs = null;
    world.onChunkReady = (c) => this.scanChunk(c);
    const prev = world.onBlockChanged;
    world.onBlockChanged = (x, y, z, old, id) => { prev?.(x, y, z, old, id); this.blockChanged(x, y, z, old, id); };
  }

  // ---------- contenedores ----------
  container(x, y, z, create = true) {
    const k = k3(x, y, z);
    let c = this.containers.get(k);
    const type = BLOCKS[this.world.getBlock(x, y, z)]?.container;
    if (!c && create && type === 'sign') { c = { type: 'sign', text: '' }; this.containers.set(k, c); return c; }
    if (!c && create && type) {
      c = { type, slots: new Array(CONTAINER_SLOTS[type]).fill(null), progress: 0, burn: 0 };
      this.containers.set(k, c);
    }
    return c;
  }
  touch(k) { this.dirtyContainers.add(k); }
  removeContainer(x, y, z) {
    const k = k3(x, y, z);
    const c = this.containers.get(k);
    if (!c || !c.slots) return [];
    this.containers.delete(k);
    this.onContainerSync?.(k, null);
    return c.slots.filter(Boolean);
  }
  serialize() { return Object.fromEntries(this.containers); }
  setRemote(k, c) { if (c) this.containers.set(k, c); else this.containers.delete(k); }

  // ---------- protección de terreno (tótems) ----------
  claim(x, y, z, owner, team) { const k = k3(x, y, z); const c = { type: 'claim', owner, team }; this.containers.set(k, c); this.onContainerSync?.(k, c); }
  claimAt(x, z) {
    for (const [k, c] of this.containers) {
      if (c.type !== 'claim') continue;
      const [cx, , cz] = p3(k);
      if (Math.abs(cx - x) <= 12 && Math.abs(cz - z) <= 12) return { ...c, k };
    }
    return null;
  }
  canEdit(x, z, name, team) {
    const c = this.claimAt(x, z);
    if (!c) return true;
    return c.owner === name || (team && team !== 'none' && c.team === team);
  }

  // ---------- eventos de bloques ----------
  scanChunk(c) {
    const d = c.data, x0 = c.cx * CHUNK, z0 = c.cz * CHUNK;
    for (let i = 0; i < d.length; i++) {
      const b = d[i];
      if (b < 73) continue;
      const x = x0 + (i & 15), z = z0 + ((i >> 4) & 15), y = i >> 8;
      const B = BLOCKS[b];
      if (CROP_IDS.has(b) && B.crop.stage < 3) this.crops.add(k3(x, y, z));
      else if (B.elec) this.elec.add(k3(x, y, z));
      if (B.marker) this.markers.push({ type: B.marker, x, y, z });
      if (b === 181) this.fires.set(k3(x, y, z), 0);
      if (b === 189 || b === 1127) this.sprinklers.add(k3(x, y, z));
    }
  }

  blockChanged(x, y, z, old, id) {
    const k = k3(x, y, z);
    if (CROP_IDS.has(id) && BLOCKS[id].crop.stage < 3) this.crops.add(k); else this.crops.delete(k);
    if (id === 181) { if (!this.fires.has(k)) this.fires.set(k, 0); } else this.fires.delete(k);
    if (id === 189 || id === 1127) this.sprinklers.add(k); else this.sprinklers.delete(k);
    if (BLOCKS[id]?.elec) this.elec.add(k); else if (BLOCKS[old]?.elec) { this.elec.delete(k); this.powered.delete(k); }
    if (BLOCKS[old]?.elec || BLOCKS[id]?.elec) this.acc.power = 10;
    if ((BLOCKS[old]?.container || BLOCKS[old]?.claim) && !BLOCKS[id]?.container && !BLOCKS[id]?.claim) this.containers.delete(k);
    if (this.authority) {
      this.fluidQ.add(k);
      for (const [dx, dy, dz] of N6) this.fluidQ.add(k3(x + dx, y + dy, z + dz));
    }
  }

  // ---------- tick ----------
  update(dt, daylight) {
    this.daylight = daylight;
    if (!this.authority) { this.markers.length = 0; return; }
    const a = this.acc;
    a.fluid += dt; a.crop += dt; a.power += dt; a.sync += dt; a.hopper += dt; a.turret += dt; a.fire += dt; a.pipe += dt;
    if (a.fire > 0.7) { this.tickFire(a.fire); a.fire = 0; }
    if (a.pipe > 3) { a.pipe = 0; this.tickPipes(); }
    if (a.fluid > 0.3) { a.fluid = 0; this.tickFluids(); }
    if (a.crop > 1) { a.crop = 0; this.tickCrops(); }
    this.tickMachines(dt);
    if (a.hopper > 1) { a.hopper = 0; this.tickHoppers(); }
    if (a.power > 1) { a.power = 0; this.tickPower(); }
    if (a.turret > 0.8) { a.turret = 0; this.tickTurrets(); }
    // marcadores de aparición (vehículos del autódromo, NPC, jefe del laboratorio)
    while (this.markers.length) {
      const m = this.markers.shift();
      const k = k3(m.x, m.y, m.z);
      const st = this.containers.get(k);
      if (st?.type === 'marker' && st.done) continue;
      if (m.type === 'alpha') { this.containers.set(k, { type: 'marker', done: false, boss: true }); continue; }
      this.containers.set(k, { type: 'marker', done: true });
      this.touch(k);
      this.onMarker?.(m.type, m.x, m.y, m.z);
    }
    if (a.sync > 0.4) {
      a.sync = 0;
      for (const k of this.dirtyContainers) this.onContainerSync?.(k, this.containers.get(k) ?? null);
      this.dirtyContainers.clear();
    }
  }

  skyOpen(x, y, z) {
    for (let yy = y + 1; yy < HEIGHT; yy++) {
      const b = this.world.getBlock(x, yy, z);
      if (b === -1) return true;
      if (OPAQUE[b] || SOLID[b]) return false;
    }
    return true;
  }
  lightNear(x, y, z) {
    const w = this.world;
    for (let dx = -4; dx <= 4; dx++) for (let dy = -2; dy <= 3; dy++) for (let dz = -4; dz <= 4; dz++) {
      const b = w.getBlock(x + dx, y + dy, z + dz);
      if (b > 0 && BLOCKS[b].light >= 12) return true;
    }
    return false;
  }
  near(x, y, z, r, test) {
    const w = this.world;
    for (let dx = -r; dx <= r; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -r; dz <= r; dz++) if (test(w.getBlock(x + dx, y + dy, z + dz))) return true;
    return false;
  }
  countNear(x, y, z, r, test) {
    const w = this.world; let n = 0;
    for (let dx = -r; dx <= r; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -r; dz <= r; dz++) if (test(w.getBlock(x + dx, y + dy, z + dz))) n++;
    return n;
  }

  // ---------- cultivos ----------
  tickCrops() {
    const w = this.world;
    for (const k of [...this.crops]) {
      const [x, y, z] = p3(k);
      const b = w.getBlock(x, y, z);
      if (b === -1) continue;
      if (!CROP_IDS.has(b)) { this.crops.delete(k); continue; }
      const below = w.getBlock(x, y - 1, z);
      if (below !== 39 && below !== 84) { w.setBlock(x, y, z, 0); continue; }
      if (Math.random() > this.growMul / 22 * (this.wet.size && this.nearWet(x, y, z) ? 2 : 1)) continue;
      const lit = (this.daylight > 0.35 && this.skyOpen(x, y, z)) || this.lightNear(x, y, z);
      if (!lit) continue;
      w.setBlock(x, y, z, b + 1);
    }
  }

  // ---------- fuego: quema madera, plantas y tela; se apaga con agua o lluvia ----------
  tickFire(dt) {
    const w = this.world;
    if (this.fires.size > 400) for (const k of [...this.fires.keys()].slice(0, this.fires.size - 400)) { const [x, y, z] = p3(k); w.setBlock(x, y, z, 0); }
    for (const [k, age] of [...this.fires]) {
      const [x, y, z] = p3(k);
      const b = w.getBlock(x, y, z);
      if (b === -1) continue;
      if (b !== 181) { this.fires.delete(k); continue; }
      const t = age + dt;
      this.fires.set(k, t);
      const water = this.touches(x, y, z, (n) => LIQ[n] === 1 || LIQ[n] === 2);
      const rained = this.raining && this.skyOpen(x, y, z) && Math.random() < 0.3;
      const fuel = [];
      for (const [dx, dy, dz] of N6) if (FLAMMABLE[w.getBlock(x + dx, y + dy, z + dz)]) fuel.push([x + dx, y + dy, z + dz]);
      if (water || rained || this.nearWet(x, y, z, 4) || (!fuel.length && t > 3) || t > 14 + Math.random() * 8) { w.setBlock(x, y, z, 0); continue; }
      // consumir un bloque vecino (se transforma en fuego) o prender el aire de al lado
      if (fuel.length && Math.random() < 0.18 * dt * 1.4) {
        const [fx, fy, fz] = fuel[Math.floor(Math.random() * fuel.length)];
        const ok = this.canBurn?.(fx, fz) ?? true;
        if (ok) { w.setBlock(fx, fy, fz, 181); this.onFire?.(fx, fy, fz); }
      }
      if (Math.random() < 0.3 * dt) {
        const [dx, dy, dz] = N6[Math.floor(Math.random() * 6)];
        const nx = x + dx, ny = y + dy + (Math.random() < 0.5 ? 1 : 0), nz = z + dz;
        if (w.getBlock(nx, ny, nz) === 0 && this.touches(nx, ny, nz, (n) => FLAMMABLE[n]) && (this.canBurn?.(nx, nz) ?? true)) w.setBlock(nx, ny, nz, 181);
      }
    }
  }
  ignite(x, y, z) {
    const w = this.world;
    if (w.getBlock(x, y, z) !== 0) return false;
    w.setBlock(x, y, z, 181);
    return true;
  }

  // ---------- cañerías: una bomba con energía pegada al agua alimenta los aspersores conectados ----------
  tickPipes() {
    const w = this.world, wet = new Set();
    for (const k of this.elec) {
      const [x, y, z] = p3(k);
      if (w.getBlock(x, y, z) !== 188 || !this.powered.has(k)) continue;
      if (!this.touches(x, y, z, (n) => LIQ[n] === 2 || LIQ[n] === 1)) continue;
      const seen = new Set([k]), q = [k];
      while (q.length && seen.size < 400) {
        const [cx, cy, cz] = p3(q.shift());
        for (const [dx, dy, dz] of N6) {
          const nk = k3(cx + dx, cy + dy, cz + dz);
          if (seen.has(nk)) continue;
          const nb = w.getBlock(cx + dx, cy + dy, cz + dz);
          if (!BLOCKS[nb]?.pipe) continue;
          seen.add(nk);
          if (nb === 189) wet.add(nk); else q.push(nk);
        }
      }
    }
    // regadores de huerta: alcanza con que toquen agua (sin bomba ni cañerías)
    for (const k of this.sprinklers) {
      const [x, y, z] = p3(k);
      if (w.getBlock(x, y, z) === 1127 && this.touches(x, y, z, (n) => LIQ[n] === 2)) wet.add(k);
    }
    this.wet = wet;
    // los aspersores apagan fuego cercano
    for (const k of wet) {
      const [x, y, z] = p3(k);
      for (const [fk] of this.fires) { const [fx, fy, fz] = p3(fk); if (Math.abs(fx - x) <= 4 && Math.abs(fz - z) <= 4 && Math.abs(fy - y) <= 4) w.setBlock(fx, fy, fz, 0); }
    }
  }
  nearWet(x, y, z, r = 4) {
    for (const k of this.wet) { const [sx, sy, sz] = p3(k); if (Math.abs(sx - x) <= r && Math.abs(sz - z) <= r && y <= sy + 1 && y >= sy - 4) return true; }
    return false;
  }

  // ---------- máquinas ----------
  tickMachines(dt) {
    for (const [k, c] of this.containers) {
      if (!c.slots || c.type === 'chest' || c.type === 'hopper') continue;
      const s = c.slots;
      const p0 = c.progress;
      if (c.type === 'generator') {
        if (c.burn > 0) c.burn = Math.max(0, c.burn - dt);
        if (c.burn <= 0 && s[0]?.id === 257) { take(s, 0, 1); c.burn = 90; this.touch(k); }
        c.status = c.burn > 0 ? `Encendido · ${Math.ceil(c.burn)} s de carbón` : 'Apagado: poné carbón';
      } else if (c.type === 'mill') {
        const out = s[0] && GRIST_OF[s[0].id];
        if (out && fits(s[1], out)) {
          c.progress += dt;
          if (c.progress >= 3) { c.progress = 0; take(s, 0, 1); put(s, 1, out, 1); this.touch(k); }
          c.status = 'Moliendo…';
        } else { c.progress = 0; c.status = s[0] ? 'Sacá la molienda' : 'Poné malta'; }
        c.max = 3;
      } else if (c.type === 'kettle') {
        const grain = s[1]?.id, adj = s[3]?.id;
        const wort = ADJUNCT_WORT[adj] ?? (grain === 290 ? 293 : 292);
        const need = [];
        if (s[0]?.id !== 279) need.push('agua limpia');
        if (!s[1] || s[1].count < 4) need.push('4 de malta molida');
        if (!s[2] || s[2].count < 2) need.push('2 de lúpulo');
        if (s[4]?.id !== 257) need.push('carbón');
        if (!fits(s[5], wort, 2)) need.push('lugar en la salida');
        if (!need.length) {
          c.progress += dt;
          c.status = 'Macerando y hirviendo…';
          if (c.progress >= 25) {
            c.progress = 0;
            s[0] = { id: 277, count: 1 };
            take(s, 1, 4); take(s, 2, 2); take(s, 4, 1); if (ADJUNCT_WORT[adj]) take(s, 3, 1);
            put(s, 5, wort, 2);
            this.touch(k);
          }
        } else { c.progress = 0; c.status = 'Falta: ' + need.join(', '); }
        c.max = 25;
      } else if (c.type === 'fermenter') {
        const [x, y, z] = p3(k);
        c.dirt = c.dirt || 0;
        // limpieza con agua limpia
        if (s[5]?.id === 279 && c.dirt > 0) { s[5] = { id: 277, count: 1 }; c.dirt = 0; this.touch(k); }
        const shade = !this.skyOpen(x, y, z);
        const cold = this.near(x, y, z, 1, (b) => b === 109) && this.poweredNear(x, y, z, 109);
        const time = shade ? 60 : 110;
        let beer = s[0] && BEER_OF[s[0].id];
        if (beer === 296 && cold) beer = 318; // mosto pálido con heladera → Lager
        const q = Math.min(4, 1 + (shade ? 1 : 0) + (c.dirt < 3 ? 1 : 0) + (cold ? 1 : 0));
        const need = [];
        if (!beer) need.push('mosto');
        if (s[1]?.id !== 291) need.push('levadura');
        if (!s[2] || s[2].count < 4) need.push('4 botellas');
        if (beer && !fits(s[3], beer, 4, q)) need.push('lugar en la salida');
        if (!need.length) {
          c.progress += dt;
          c.status = `Fermentando${shade ? ' bajo techo' : ' al sol (lento)'}${cold ? ' · en frío' : ''} · calidad ${'★'.repeat(q)}${c.dirt >= 3 ? ' · ¡equipo sucio!' : ''}`;
          if (c.progress >= time) {
            c.progress = 0;
            take(s, 0, 1); take(s, 1, 1); take(s, 2, 4);
            put(s, 3, beer, 4, q);
            c.dirt++;
            if (Math.random() < 0.7 && fits(s[4], 291, 2)) put(s, 4, 291, 2);
            this.touch(k);
          }
        } else { c.progress = 0; c.status = 'Falta: ' + need.join(', ') + (c.dirt >= 3 ? ' · limpialo con agua limpia' : ''); }
        c.max = time;
      } else if (c.type === 'cask') {
        // añejamiento: cada 5 minutos la cerveza gana una estrella (máx. 5)
        let any = false;
        for (const st of s) {
          if (!st || (st.q ?? 1) >= 5) continue;
          any = true;
          st.age = (st.age || 0) + dt;
          if (st.age >= AGE_STEP) { st.age = 0; st.q = (st.q ?? 1) + 1; this.touch(k); }
        }
        const top = s.filter(Boolean).reduce((m, st) => Math.max(m, st.age || 0), 0);
        c.progress = top; c.max = AGE_STEP;
        c.status = any ? 'Añejando… cada 5 min suma una estrella (máx. ★★★★★)' : s.some(Boolean) ? 'Todo añejado al máximo' : 'Guardá cervezas para añejarlas';
      } else if (c.type === 'tap') {
        // taberna: con barra y sillas cerca, los clientes compran cerveza
        const [x, y, z] = p3(k);
        c.chk = (c.chk || 0) - dt;
        if (c.chk <= 0) {
          c.chk = 5;
          c.bar = this.near(x, y, z, 5, (b) => b === 106);
          c.seats = this.countNear(x, y, z, 6, (b) => SEATS.has(b));
          c.sign = this.near(x, y, z, 8, (b) => b === 175);
        }
        const beerSlot = [0, 1, 2, 3, 4, 5].find((i) => s[i]);
        if (!c.bar || !c.seats) { c.progress = 0; c.status = 'Para abrir la taberna: poné una barra y sillas cerca'; }
        else if (beerSlot == null) { c.progress = 0; c.status = `Taberna abierta (${c.seats} lugares) · sin cerveza para vender`; }
        else {
          const interval = Math.max(20, 60 - c.seats * 6);
          c.progress += dt; c.max = interval;
          c.status = `Taberna abierta · ${c.seats} lugares${c.sign ? ' · con cartel' : ''} · vende cada ${interval} s`;
          if (c.progress >= interval) {
            c.progress = 0;
            const q = s[beerSlot].q ?? 1;
            take(s, beerSlot, 1);
            const pay = 1 + q + (c.sign ? 1 : 0);
            addTo(s, [6, 7, 8], 258, pay);
            if (q >= 4) addTo(s, [6, 7, 8], 259, 1);
            if (q >= 5) addTo(s, [6, 7, 8], 260, 1);
            c.sold = (c.sold || 0) + 1;
            this.touch(k);
          }
        }
      } else if (c.type === 'still') {
        const ok = s[0] && s[1]?.id === 257 && fits(s[2], 323);
        if (ok) {
          c.progress += dt; c.max = 20; c.status = 'Destilando…';
          if (c.progress >= 20) { c.progress = 0; take(s, 0, 1); take(s, 1, 1); put(s, 2, 323, 1); this.touch(k); }
        } else { c.progress = 0; c.max = 20; c.status = !s[0] ? 'Poné cerveza, mosto, papas o cebada' : s[1]?.id !== 257 ? 'Falta carbón' : 'Sacá el alcohol'; }
      }
      if (c.progress !== p0 && Math.floor(c.progress * 2) !== Math.floor(p0 * 2)) this.touch(k);
    }
  }

  // ---------- tolvas: pasan objetos del contenedor de arriba al de abajo ----------
  tickHoppers() {
    for (const [k, c] of this.containers) {
      if (c.type !== 'hopper') continue;
      const [x, y, z] = p3(k);
      const above = this.containers.get(k3(x, y + 1, z));
      if (above?.slots) {
        const outIdx = outputSlots(above);
        for (const i of outIdx) {
          const st = above.slots[i];
          if (!st) continue;
          if (insert(c.slots, st.id, 1, st.q, null)) { take(above.slots, i, 1); this.touch(k3(x, y + 1, z)); this.touch(k); }
          break;
        }
      }
      const below = this.containers.get(k3(x, y - 1, z)) ?? this.container(x, y - 1, z, true);
      if (below?.slots) {
        const accept = MACHINE_INFO[below.type]?.accept;
        for (let i = 0; i < c.slots.length; i++) {
          const st = c.slots[i];
          if (!st) continue;
          if (insert(below.slots, st.id, 1, st.q, accept)) { take(c.slots, i, 1); this.touch(k3(x, y - 1, z)); this.touch(k); break; }
        }
      }
    }
  }

  // ---------- líquidos ----------
  tickFluids() {
    const w = this.world;
    let budget = 400;
    const q = this.fluidQ;
    this.fluidQ = new Set();
    for (const k of q) {
      if (budget-- <= 0) { this.fluidQ.add(k); continue; }
      const [x, y, z] = p3(k);
      if (y < 1 || y >= HEIGHT - 1) continue;
      const b = w.getBlock(x, y, z);
      if (b === -1) continue;
      const kind = LIQ[b];
      if (kind && LIQ_LEVEL[b] === 0) {
        if (kind === 3 && this.touches(x, y, z, (n) => LIQ[n] === 1 || LIQ[n] === 2)) w.setBlock(x, y, z, 2);
        continue;
      }
      if (b !== 0 && !kind) continue;
      let best = null;
      const above = w.getBlock(x, y + 1, z);
      if (LIQ[above]) best = { kind: LIQ[above], level: 1 };
      else {
        for (const [dx, dz] of N4) {
          const n = w.getBlock(x + dx, y, z + dz);
          if (!LIQ[n]) continue;
          const nk = LIQ[n], step = nk === 3 ? 2 : 1, max = nk === 3 ? 6 : 7;
          const nl = LIQ_LEVEL[n];
          if (nl + step > max) continue;
          const under = w.getBlock(x + dx, y - 1, z + dz);
          if (!SOLID[under] && !(LIQ[under] && LIQ_LEVEL[under] === 0)) continue;
          if (!best || nl + step < best.level) best = { kind: nk, level: nl + step };
        }
      }
      let want = 0;
      if (best && (b === 0 || LIQ[b] === best.kind)) want = liquidId(best.kind, best.level);
      else if (best && b !== 0) want = b;
      if (kind === 3 && want && this.touches(x, y, z, (n) => LIQ[n] === 1 || LIQ[n] === 2)) want = 8;
      if (want !== b) w.setBlock(x, y, z, want);
    }
  }
  touches(x, y, z, fn) {
    for (const [dx, dy, dz] of N6) if (fn(this.world.getBlock(x + dx, y + dy, z + dz))) return true;
    return false;
  }

  // ---------- electricidad y lógica ----------
  poweredNear(x, y, z, id) {
    for (const [dx, dy, dz] of N6) { const k = k3(x + dx, y + dy, z + dz); if (this.powered.has(k) && this.world.getBlock(x + dx, y + dy, z + dz) === id) return true; }
    return false;
  }
  // pulsador: se prende un ratito
  pressButton(x, y, z) {
    if (this.world.getBlock(x, y, z) !== 240) return;
    this.world.setBlock(x, y, z, 241);
    this.buttons = this.buttons || new Map();
    this.buttons.set(k3(x, y, z), performance.now() + 1500);
    this.acc.power = 10;
  }
  tickPower() {
    const w = this.world;
    // pulsadores que se apagan y placas de presión (alguien parado encima)
    const now = performance.now();
    if (this.buttons) for (const [k, t] of [...this.buttons]) if (now > t) { const [x, y, z] = p3(k); if (w.getBlock(x, y, z) === 241) w.setBlock(x, y, z, 240); this.buttons.delete(k); }
    const ents0 = this.entities();
    for (const k of this.elec) {
      const [x, y, z] = p3(k), b = w.getBlock(x, y, z);
      if (b !== 242 && b !== 243) continue;
      const on = ents0.some((e) => Math.abs(e.x - x - 0.5) < 0.75 && Math.abs(e.z - z - 0.5) < 0.75 && e.y >= y - 0.2 && e.y < y + 0.9);
      if (on && b === 242) w.setBlock(x, y, z, 243); else if (!on && b === 243) w.setBlock(x, y, z, 242);
    }
    // sensores de movimiento: se activan con jugadores o criaturas a menos de 5 bloques
    const ents = this.entities();
    for (const k of this.elec) {
      const [x, y, z] = p3(k);
      const b = w.getBlock(x, y, z);
      if (b !== 137 && b !== 138) continue;
      const near = ents.some((p) => Math.abs(p.x - x - 0.5) < 5 && Math.abs(p.y - y) < 4 && Math.abs(p.z - z - 0.5) < 5);
      if (near && b === 137) w.setBlock(x, y, z, 138); else if (!near && b === 138) w.setBlock(x, y, z, 137);
    }
    const sources = [], batteries = [];
    for (const k of this.elec) {
      const [x, y, z] = p3(k);
      const b = w.getBlock(x, y, z);
      if (b === 76) { const c = this.containers.get(k); if (c && c.burn > 0) sources.push(k); }
      else if (b === 77 && this.daylight > 0.45 && this.skyOpen(x, y, z)) sources.push(k);
      else if (b === 244) sources.push(k);
      else if (b === 1121 && (this.windK || 0) > 0.12 && this.skyOpen(x, y + 1, z)) sources.push(k);
      else if (b === 1120) batteries.push(k);
    }
    const spread = (srcs) => {
      const pw = new Set(srcs);
      const queue = [...srcs];
      while (queue.length && pw.size < 2048) {
        const k = queue.shift();
        const [x, y, z] = p3(k);
        for (const [dx, dy, dz] of N6) {
          const nk = k3(x + dx, y + dy, z + dz);
          if (pw.has(nk) || !this.elec.has(nk)) continue;
          const nb = w.getBlock(x + dx, y + dy, z + dz);
          if (nb === 135 || nb === 137 || nb === 240 || nb === 242) continue; // palanca, sensor, pulsador o placa apagados: cortan el circuito
          pw.add(nk);
          if (CONDUCT.has(nb)) queue.push(nk);
        }
      }
      return pw;
    };
    let powered = spread(sources);
    // baterías: se cargan si les llega energía; si no, la entregan mientras les quede
    if (batteries.length) {
      const extra = [];
      for (const k of batteries) {
        let c = this.containers.get(k);
        if (!c) { c = { type: 'battery', charge: 0 }; this.containers.set(k, c); }
        const before = c.charge || 0;
        if (powered.has(k)) c.charge = Math.min(BATTERY_MAX, before + 2);
        else if (c.charge > 0) { c.charge = Math.max(0, c.charge - 1); extra.push(k); }
        if (Math.floor(c.charge / 30) !== Math.floor(before / 30) || (c.charge === 0) !== (before === 0)) this.touch(k);
      }
      if (extra.length) powered = spread([...sources, ...extra]);
    }
    // bloques musicales: suenan cuando les llega energía
    for (const k of powered) if (!this.powered.has(k)) { const [x, y, z] = p3(k), b = w.getBlock(x, y, z); if (b === 245 || b === 246) this.onNote?.(x, y, z, b); }
    this.powered = powered;
    for (const k of this.elec) {
      const [x, y, z] = p3(k);
      const b = w.getBlock(x, y, z);
      if (b === 73 && powered.has(k)) { w.setBlock(x, y, z, 74); this.onPowerOn?.(); }
      else if (b === 74 && !powered.has(k)) w.setBlock(x, y, z, 73);
      else if (b === 139 && powered.has(k)) w.setBlock(x, y, z, 140);
      else if (b === 140 && !powered.has(k)) w.setBlock(x, y, z, 139);
      else if (BLOCKS[b]?.powerOn && powered.has(k)) w.setBlock(x, y, z, BLOCKS[b].powerOn);
      else if (BLOCKS[b]?.powerOff && !powered.has(k)) w.setBlock(x, y, z, BLOCKS[b].powerOff);
      if (b === 140 && powered.has(k)) this.onAlarm?.(x, y, z);
    }
    // puertas automáticas: se abren si hay un cable con energía pegado
    this.autoDoors = this.autoDoors || new Set();
    const seen = new Set();
    for (const k of powered) {
      const [x, y, z] = p3(k);
      if (![75, 136, 138, 241, 243, 244].includes(w.getBlock(x, y, z))) continue;
      for (const [dx, dy, dz] of N6) {
        const d = BLOCKS[w.getBlock(x + dx, y + dy, z + dz)]?.door;
        if (!d) continue;
        const by = d.top ? y + dy - 1 : y + dy, dk = k3(x + dx, by, z + dz);
        seen.add(dk);
        if (!d.open) { w.setBlock(x + dx, by, z + dz, doorId(1, d.axis, 0, d.base)); w.setBlock(x + dx, by + 1, z + dz, doorId(1, d.axis, 1, d.base)); this.autoDoors.add(dk); }
      }
    }
    for (const dk of [...this.autoDoors]) {
      if (seen.has(dk)) continue;
      const [x, y, z] = p3(dk);
      const d = BLOCKS[w.getBlock(x, y, z)]?.door;
      if (d?.open) { w.setBlock(x, y, z, doorId(0, d.axis, 0, d.base)); w.setBlock(x, y + 1, z, doorId(0, d.axis, 1, d.base)); }
      this.autoDoors.delete(dk);
    }
  }
  fencePowered(x, y, z) { return this.powered.has(k3(x, y, z)); }
  insertInto(c, id, n, q) { for (let i = 0; i < n; i++) if (!insert(c.slots, id, 1, q, null)) return false; return true; }
  toggleLever(x, y, z) {
    const b = this.world.getBlock(x, y, z);
    if (b === 135) this.world.setBlock(x, y, z, 136); else if (b === 136) this.world.setBlock(x, y, z, 135);
    this.acc.power = 10;
  }

  // torretas: disparan a la criatura hostil más cercana con línea de visión
  tickTurrets() {
    if (!this.mobs) return;
    for (const k of this.powered) {
      const [x, y, z] = p3(k);
      if (this.world.getBlock(x, y, z) !== 141) continue;
      let best = null, bd = 14;
      for (const m of this.mobs.list.values()) {
        if (!m.def.hostile || m.dying) continue;
        const d = Math.hypot(m.pos.x - x - 0.5, m.pos.y + m.def.h / 2 - y - 1, m.pos.z - z - 0.5);
        if (d < bd) { bd = d; best = m; }
      }
      if (!best) continue;
      const o = { x: x + 0.5, y: y + 1.1, z: z + 0.5 };
      const t = { x: best.pos.x, y: best.pos.y + best.def.h * 0.6, z: best.pos.z };
      const d = { x: t.x - o.x, y: t.y - o.y, z: t.z - o.z }; const L = Math.hypot(d.x, d.y, d.z); d.x /= L; d.y /= L; d.z /= L;
      const hit = this.world.raycast(o, d, L - 0.5);
      if (hit) continue;
      this.mobs.hit(best, 4, d, null);
      this.onTurretShot?.(o, t);
    }
  }
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function take(s, i, n) { if (!s[i]) return; s[i].count -= n; if (s[i].count <= 0) s[i] = null; }
function put(s, i, id, n, q) { if (!s[i]) { s[i] = { id, count: n }; if (q) s[i].q = q; } else s[i].count += n; }
function fits(slot, id, n = 1, q) { return !slot || (slot.id === id && slot.count + n <= 64 && (q == null || (slot.q ?? null) === (q ?? null))); }
function addTo(s, idxs, id, n) {
  for (const i of idxs) { if (s[i] && s[i].id === id && s[i].count + n <= 64) { s[i].count += n; return; } }
  for (const i of idxs) if (!s[i]) { s[i] = { id, count: n }; return; }
}
// slots de donde una tolva puede sacar (salidas de máquinas o todo un cofre)
function outputSlots(c) {
  return { chest: [...Array(27).keys()], hopper: [0, 1, 2, 3, 4], mill: [1], kettle: [5], fermenter: [3, 4], still: [2], tap: [6, 7, 8], cask: [...Array(9).keys()], generator: [] }[c.type] ?? [];
}
function insert(slots, id, n, q, accept) {
  for (let i = 0; i < slots.length; i++) {
    if (accept && !(accept[i]?.length && accept[i].includes(id))) continue;
    const s = slots[i];
    if (s && s.id === id && (s.q ?? null) === (q ?? null) && s.count + n <= 64) { s.count += n; return true; }
  }
  for (let i = 0; i < slots.length; i++) {
    if (accept && !(accept[i]?.length && accept[i].includes(id))) continue;
    if (!slots[i]) { slots[i] = { id, count: n }; if (q) slots[i].q = q; return true; }
  }
  return false;
}
export { k3 };
void ITEMS;
