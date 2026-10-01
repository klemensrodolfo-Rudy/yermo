// Generación procedural del mundo postapocalíptico.
import { Simplex, hash2, hash3, mulberry32 } from './noise.js';
import { CHUNK, HEIGHT, SEA } from './blocks.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;

export const BIOME = { FOREST: 0, DESERT: 1, SWAMP: 2, CITY: 3, CRATER: 4, BREW: 5, MUSHROOM: 6, TUNDRA: 7, CIRCUIT: 8, SCRAPSEA: 9, MILITARY: 10, ABYSS: 11, ZOO: 12 };
export const BIOME_NAMES = ['Bosque muerto', 'Desierto de ceniza', 'Pantano tóxico', 'Ciudad en ruinas', 'Cráter', 'Valle cervecero', 'Bosque de hongos', 'Tundra nuclear', 'Autódromo abandonado', 'Mar de chatarra', 'Zona militar', 'El Abismo', 'Bioparque'];
// El Abismo: mazmorra infinita lejos del mundo normal; cada nivel ocupa ABYSS_W bloques en x
export const ABYSS_X = 300000, ABYSS_W = 256;
export const abyssLevel = (x) => (x >= ABYSS_X - 64 ? Math.floor((x - ABYSS_X) / ABYSS_W) + 1 : 0);
export const abyssStart = (level) => ({ x: ABYSS_X + (level - 1) * ABYSS_W + 12.5, y: 21, z: 0.5 });

const LOT = 32;          // tamaño de manzana
const ROAD = 5;          // ancho de calle
const CRATER_CELL = 160;
const BUNKER_CELL = 176;
const GAS_CELL = 150;
const TOWER_CELL = 230;
const BREWERY_CELL = 90;
const SPRING_CELL = 36;
const CIRCUIT_CELL = 640;
const SETTLE_CELL = 260;
const LAB_CELL = 330;
const TRACK_W = 5; // medio ancho de la pista
const SHIP_CELL = 70, PLANE_CELL = 110, MIL_CELL = 64, UNDER_CELL = 900;
const ZOO_CELL = 1000, ZOO_R = 88;
// recintos del bioparque: 0-3 anillo interior, 4-7 exterior (en sentido antihorario desde +x)
export const ZOO_SECTORS = ['LEONES', 'JIRAFAS Y CEBRAS', 'ELEFANTES Y RINOCERONTES', 'GORILAS Y MONOS', 'HIPOPÓTAMOS Y COCODRILOS', 'PINGÜINOS Y OSOS', 'REPTILES', 'AVES Y CANGUROS'];

export class WorldGen {
  constructor(seed, type = 'normal') {
    this.seed = seed | 0;
    this.type = type;
    this.nBrew = new Simplex(seed + 9);
    this.nTemp = new Simplex(seed + 10);
    this.nMush = new Simplex(seed + 11);
    this.nRiver = new Simplex(seed + 12);
    this.nScrap = new Simplex(seed + 13);
    this.nMil = new Simplex(seed + 14);
    this.nCont = new Simplex(seed + 1);
    this.nDetail = new Simplex(seed + 2);
    this.nHills = new Simplex(seed + 3);
    this.nUrban = new Simplex(seed + 4);
    this.nMoist = new Simplex(seed + 5);
    this.nCave = new Simplex(seed + 6);
    this.nCave2 = new Simplex(seed + 7);
    this.nRuin = new Simplex(seed + 8);
    // desplazamiento por semilla: el ruido simplex vale ~0 en el origen
    this.ox = (hash2(seed, 1, 2) - 0.5) * 200000;
    this.oz = (hash2(seed, 3, 4) - 0.5) * 200000;
  }

  crater(wx, wz) {
    // devuelve {d, r} del cráter más cercano o null
    const gx = Math.floor(wx / CRATER_CELL), gz = Math.floor(wz / CRATER_CELL);
    let best = null;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const cx = gx + dx, cz = gz + dz;
      if (hash2(this.seed + 91, cx, cz) > 0.45) continue;
      const px = (cx + 0.2 + hash2(this.seed + 92, cx, cz) * 0.6) * CRATER_CELL;
      const pz = (cz + 0.2 + hash2(this.seed + 93, cx, cz) * 0.6) * CRATER_CELL;
      const r = 9 + hash2(this.seed + 94, cx, cz) * 12;
      const d = Math.hypot(wx - px, wz - pz);
      if (d < r * 1.5 && (!best || d / r < best.d / best.r)) best = { d, r };
    }
    return best;
  }

  // ---------- bioparque (zoológico abandonado) ----------
  zooAt(gx, gz) {
    const s = this.seed, k = gx + ',' + gz;
    this._zoo = this._zoo || new Map();
    if (this._zoo.has(k)) return this._zoo.get(k);
    let res = null;
    if (hash2(s + 301, gx, gz) < 0.5) {
      const x = Math.floor((gx + 0.3 + hash2(s + 302, gx, gz) * 0.4) * ZOO_CELL);
      const z = Math.floor((gz + 0.3 + hash2(s + 303, gx, gz) * 0.4) * ZOO_CELL);
      const c = this.baseColumn(x, z);
      if ([BIOME.FOREST, BIOME.DESERT, BIOME.BREW].includes(c.biome) && c.h > SEA + 2 && !this.circuitNear(x, z)) res = { id: k, x, z, y: Math.min(60, Math.max(c.h, SEA + 3)), R: ZOO_R };
    }
    this._zoo.set(k, res);
    return res;
  }
  zooNear(wx, wz) {
    const gx = Math.floor(wx / ZOO_CELL), gz = Math.floor(wz / ZOO_CELL);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const z = this.zooAt(gx + dx, gz + dz);
      if (z && Math.abs(wx - z.x) <= z.R + 24 && Math.abs(wz - z.z) <= z.R + 24 && Math.hypot(wx - z.x, wz - z.z) <= z.R + 24) return z;
    }
    return null;
  }
  nearestZoo(x, z, cells = 3) {
    let best = null;
    const gx0 = Math.floor(x / ZOO_CELL), gz0 = Math.floor(z / ZOO_CELL);
    for (let gx = gx0 - cells; gx <= gx0 + cells; gx++) for (let gz = gz0 - cells; gz <= gz0 + cells; gz++) {
      const c = this.zooAt(gx, gz);
      if (c) { const d = Math.hypot(c.x - x, c.z - z); if (!best || d < best.d) best = { d, c }; }
    }
    return best?.c ?? null;
  }
  // centro de cada recinto y posición de su cartel
  zooSectors(z) {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const outer = i >= 4, q = i % 4, mid = (q + 0.5) * Math.PI / 2;
      const rad = outer ? (61 + z.R - 3) / 2 : 42;
      const signR = outer ? 61.5 : 29.5;
      out.push({ i, name: ZOO_SECTORS[i], cx: z.x + Math.round(Math.cos(mid) * rad), cz: z.z + Math.round(Math.sin(mid) * rad), sx: z.x + Math.round(Math.cos(mid) * signR), sz: z.z + Math.round(Math.sin(mid) * signR) });
    }
    return out;
  }
  zooSigns(z) {
    const list = this.zooSectors(z).map((s) => ({ x: s.sx, z: s.sz, text: s.name }));
    list.push({ x: z.x + 3, z: z.z + z.R - 9, text: 'BIOPARQUE · CERRADO POR FIN DEL MUNDO' });
    list.push({ x: z.x - 3, z: z.z + 9, text: 'NO DAR DE COMER A LOS ANIMALES (YA NO HAY QUIÉN LOS CUIDE)' });
    return list;
  }
  zoos(cx, cz, set, colAt) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const z = this.zooNear(x0 + 8, z0 + 8) || this.zooNear(x0, z0) || this.zooNear(x0 + 15, z0 + 15) || this.zooNear(x0 + 15, z0) || this.zooNear(x0, z0 + 15);
    if (!z) return;
    const S = (wx, yy, wz, id) => set(wx - x0, yy, wz - z0, id);
    const sectors = this.zooSectors(z);
    const signs = this.zooSigns(z);
    const sectorOf = (dx, dz, r) => {
      if (r < 29.5 || r > z.R - 3 || (r > 54.5 && r < 61.5)) return -1;
      let a = Math.atan2(dz, dx); if (a < 0) a += Math.PI * 2;
      return Math.floor(a / (Math.PI / 2)) % 4 + (r > 58 ? 4 : 0);
    };
    // árboles: celdas de 9 bloques en los recintos de sabana
    const TREE_SECT = new Set([1, 3, 7, 0]);
    const treeAt = (gx, gz) => {
      if (hash2(s + 311, gx, gz) > 0.55) return null;
      const tx = gx * 9 + 2 + Math.floor(hash2(s + 312, gx, gz) * 5), tz = gz * 9 + 2 + Math.floor(hash2(s + 313, gx, gz) * 5);
      const dx = tx - z.x, dz = tz - z.z, r = Math.hypot(dx, dz), sec = sectorOf(dx, dz, r);
      if (!TREE_SECT.has(sec) || (sec === 0 && hash2(s + 314, gx, gz) > 0.3)) return null;
      if (Math.abs(dx) < 6 || Math.abs(dz) < 6) return null;
      return { x: tx, z: tz, y: colAt(tx, tz).h, hgt: 4 + Math.floor(hash2(s + 315, gx, gz) * 3) };
    };
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const wx = x0 + lx, wz = z0 + lz;
      const dx = wx - z.x, dz = wz - z.z, r = Math.hypot(dx, dz);
      if (r > z.R) continue;
      const y = colAt(wx, wz).h;
      for (let yy = y + 1; yy < y + 10; yy++) S(wx, yy, wz, 0); // despejar
      const cracked = hash2(s + 320, wx, wz);
      const pathBlock = cracked < 0.07 ? 84 : cracked < 0.25 ? 10 : 9;
      // caminos: dos anillos y una cruz; plaza central
      const onRing = Math.abs(r - 26) < 1.7 || Math.abs(r - 58) < 1.7;
      const onSpoke = (Math.abs(dx) < 1.7 || Math.abs(dz) < 1.7) && r > 12;
      if (r < 13) S(wx, y, wz, hash2(s + 321, wx, wz) < 0.15 ? 10 : 9);
      else if (onRing || onSpoke) S(wx, y, wz, pathBlock);
      // fuente de la plaza
      if (r < 3.6) { S(wx, y, wz, r < 2.6 ? 47 : 13); if (r >= 2.6) S(wx, y + 1, wz, 59); }
      if (dx === 0 && dz === 0) { S(wx, y, wz, 9); S(wx, y + 1, wz, 9); S(wx, y + 2, wz, 9); S(wx, y + 3, wz, 28); }
      if (dx === 0 && dz === 5) S(wx, y, wz, 203); // marcador: carteles y animales
      // bancos en la plaza
      if (Math.abs(r - 10) < 0.5 && (Math.abs(dx) < 1 || Math.abs(dz) < 1) === false && hash2(s + 322, wx, wz) < 0.25) S(wx, y + 1, wz, 60);
      // faroles a lo largo de los caminos
      if (Math.abs(r - 28.2) < 0.5 && hash2(s + 323, wx, wz) < 0.06) { for (let k = 1; k <= 3; k++) S(wx, y + k, wz, 85); S(wx, y + 4, wz, 28); }
      // cercos de los recintos (con tramos caídos)
      const sec = sectorOf(dx, dz, r);
      const edge = (Math.abs(r - 29.5) < 0.5 || Math.abs(r - 54.5) < 0.5 || Math.abs(r - 61.5) < 0.5 || Math.abs(r - (z.R - 3)) < 0.5 || ((Math.abs(dx) === 3 || Math.abs(dz) === 3) && r > 29 && r < z.R - 3 && !(r > 55 && r < 61)));
      if (edge && !onSpoke && !onRing && hash2(s + 324, wx, wz) > 0.2) {
        const wall = sec === 2 || sec === 4 || (sec < 0 && r > 54 && r < 62);
        S(wx, y + 1, wz, wall ? 13 : 85);
      }
      if (sec < 0 || edge) continue;
      const S0 = sectors[sec], ds = Math.hypot(wx - S0.cx, wz - S0.cz);
      // temas de cada recinto
      if (sec === 0 && ds < 5) { for (let k = 1; k <= Math.round((5 - ds) * 0.9); k++) S(wx, y + k, wz, 2); }
      if (sec === 0 && ds >= 5 && ds < 9 && hash2(s + 325, wx, wz) < 0.4) S(wx, y, wz, 6);
      if ((sec === 2 && ds < 6) || (sec === 4 && ds < 10) || (sec === 7 && ds < 4)) { S(wx, y, wz, 47); S(wx, y - 1, wz, 47); }
      else if ((sec === 2 && ds < 7.5) || (sec === 4 && ds < 12)) S(wx, y, wz, 7);
      if (sec === 5) {
        S(wx, y, wz, ds < 6 ? 47 : ds < 7.5 ? 148 : 147);
        if (ds < 6) S(wx, y - 1, wz, 47);
        if (ds > 9 && ds < 11 && hash2(s + 326, wx, wz) < 0.3) S(wx, y + 1, wz, 148);
      }
      if (sec === 6) {
        // casa de reptiles: paredes de hormigón, ventanales y techo
        const hx = wx - S0.cx, hz = wz - S0.cz;
        if (Math.abs(hx) <= 6 && Math.abs(hz) <= 4) {
          const wallR = Math.abs(hx) === 6 || Math.abs(hz) === 4;
          S(wx, y, wz, wallR ? 9 : 192);
          for (let k = 1; k <= 4; k++) S(wx, y + k, wz, k === 4 ? 59 : wallR ? (k === 2 && (hx + hz) % 2 === 0 ? 14 : 9) : 0);
          if (wallR && Math.abs(hx) <= 1 && hz === -4) { S(wx, y + 1, wz, 0); S(wx, y + 2, wz, 0); }
          if (!wallR && Math.abs(hz) === 3 && Math.abs(hx) < 5 && hx % 3 === 0) S(wx, y + 1, wz, 14);
          if (hx === 0 && hz === 0) S(wx, y + 3, wz, 28);
        } else if (hash2(s + 327, wx, wz) < 0.5) S(wx, y, wz, 192);
      }
      if (sec === 3) {
        // plataformas para los monos
        const hx = wx - S0.cx, hz = wz - S0.cz;
        if (Math.abs(hx) <= 3 && Math.abs(hz) <= 3) { S(wx, y + 4, wz, 60); if (Math.abs(hx) === 3 && Math.abs(hz) === 3) for (let k = 1; k < 4; k++) S(wx, y + k, wz, 15); }
      }
    }
    // carteles
    for (const sg of signs) if (sg.x >= x0 && sg.x < x0 + 16 && sg.z >= z0 && sg.z < z0 + 16) S(sg.x, colAt(sg.x, sg.z).h + 1, sg.z, 191);
    // arco de entrada (sur)
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const wx = x0 + lx, wz = z0 + lz, dx = wx - z.x, dz = wz - z.z;
      if (dz !== z.R - 6 || Math.abs(dx) > 4) continue;
      const y = colAt(wx, wz).h;
      if (Math.abs(dx) >= 3) for (let k = 1; k <= 6; k++) S(wx, y + k, wz, 13);
      S(wx, y + 7, wz, 13); if (Math.abs(dx) < 3) S(wx, y + 6, wz, 59);
    }
    // boletería
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const wx = x0 + lx, wz = z0 + lz, hx = wx - z.x - 7, hz = wz - z.z - (z.R - 12);
      if (hx < 0 || hx > 3 || hz < 0 || hz > 3) continue;
      const y = colAt(wx, wz).h, wall = hx === 0 || hx === 3 || hz === 0 || hz === 3;
      S(wx, y, wz, 9);
      for (let k = 1; k <= 3; k++) S(wx, y + k, wz, k === 3 ? 59 : wall ? (k === 2 && hx === 0 ? 14 : 9) : 0);
    }
    // acacias
    const gx0 = Math.floor((x0 - 4) / 9), gx1 = Math.floor((x0 + 20) / 9), gz0 = Math.floor((z0 - 4) / 9), gz1 = Math.floor((z0 + 20) / 9);
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const t = treeAt(gx, gz);
      if (!t) continue;
      for (let k = 1; k <= t.hgt; k++) S(t.x, t.y + k, t.z, 15);
      for (let ox = -3; ox <= 3; ox++) for (let oz = -3; oz <= 3; oz++) {
        const d = Math.hypot(ox, oz);
        if (d <= 3.2 && hash3(s + 316, t.x + ox, t.y, t.z + oz) > 0.12) S(t.x + ox, t.y + t.hgt + 1, t.z + oz, 202);
        if (d <= 1.8) S(t.x + ox, t.y + t.hgt + 2, t.z + oz, 202);
      }
      S(t.x, t.y + t.hgt + 1, t.z, 15);
    }
  }

  // ---------- autódromo ----------
  circuitAt(gx, gz) {
    const s = this.seed;
    const k = gx + ',' + gz;
    this._circ = this._circ || new Map();
    if (this._circ.has(k)) return this._circ.get(k);
    let res = null;
    if (hash2(s + 141, gx, gz) < 0.55) {
      const x = Math.floor((gx + 0.3 + hash2(s + 142, gx, gz) * 0.4) * CIRCUIT_CELL);
      const z = Math.floor((gz + 0.3 + hash2(s + 143, gx, gz) * 0.4) * CIRCUIT_CELL);
      const c = this.baseColumn(x, z);
      if ((c.biome === BIOME.FOREST || c.biome === BIOME.DESERT || c.biome === BIOME.TUNDRA) && c.h > SEA + 2) {
        const a = 36 + Math.floor(hash2(s + 144, gx, gz) * 24), R = 22 + Math.floor(hash2(s + 145, gx, gz) * 8);
        res = { id: k, x, z, y: Math.max(c.h, SEA + 3), a, R, bx: a + R + 16, bz: R + 22 };
      }
    }
    this._circ.set(k, res);
    return res;
  }
  circuitNear(wx, wz) {
    const gx = Math.floor(wx / CIRCUIT_CELL), gz = Math.floor(wz / CIRCUIT_CELL);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const c = this.circuitAt(gx + dx, gz + dz);
      if (c && Math.abs(wx - c.x) <= c.bx && Math.abs(wz - c.z) <= c.bz) return c;
    }
    return null;
  }
  // distancia de un punto a la línea central de la pista (forma de estadio)
  trackDist(c, wx, wz) {
    const dx = Math.abs(wx - c.x), dz = wz - c.z;
    if (dx <= c.a) return Math.abs(Math.abs(dz) - c.R);
    return Math.abs(Math.hypot(dx - c.a, dz) - c.R);
  }
  // recorrido para carreras: puntos sobre la línea central, empezando en la largada
  circuitPath(c, n = 24) {
    const L = 4 * c.a + 2 * Math.PI * c.R, pts = [];
    for (let i = 0; i < n; i++) {
      let s = (i / n) * L, x, z;
      // tramo 1: recta inferior (z = +R) de x=0 hacia +a
      if (s < c.a) { x = s; z = c.R; }
      else if ((s -= c.a) < Math.PI * c.R) { const t = s / c.R; x = c.a + Math.sin(t) * c.R; z = Math.cos(t) * c.R; }
      else if ((s -= Math.PI * c.R) < 2 * c.a) { x = c.a - s; z = -c.R; }
      else if ((s -= 2 * c.a) < Math.PI * c.R) { const t = s / c.R; x = -c.a - Math.sin(t) * c.R; z = -Math.cos(t) * c.R; }
      else { s -= Math.PI * c.R; x = -c.a + s; z = c.R; }
      pts.push({ x: c.x + x, z: c.z + z, y: c.y + 1 });
    }
    return pts;
  }

  column(wx, wz) {
    if (wx >= ABYSS_X - 64) return { h: 120, biome: BIOME.ABYSS, urbanT: 0, cityLevel: 47, temp: 0, level: abyssLevel(wx) };
    const zoo = this.zooNear(wx, wz);
    if (zoo) {
      const b = this.baseColumn(wx, wz);
      const d = Math.hypot(wx - zoo.x, wz - zoo.z);
      const t = smooth(zoo.R + 24, zoo.R - 2, d);
      const zh = zoo.y + Math.round(this.nDetail.noise2(wx / 34, wz / 34) * 1.4);
      return { ...b, h: Math.round(lerp(b.h, zh, t)), biome: d < zoo.R ? BIOME.ZOO : b.biome, urbanT: d < zoo.R ? 0 : b.urbanT, zoo };
    }
    const circ = this.circuitNear(wx, wz);
    if (circ) {
      const b = this.baseColumn(wx, wz);
      return { h: circ.y, biome: BIOME.CIRCUIT, urbanT: 0, cityLevel: b.cityLevel, circuit: circ, temp: b.temp };
    }
    return this.baseColumn(wx, wz);
  }

  baseColumn(wx, wz) {
    const cx0 = wx, cz0 = wz;
    wx += this.ox; wz += this.oz;
    const cont = this.nCont.fbm2(wx / 420, wz / 420, 3);
    const detail = this.nDetail.fbm2(wx / 64, wz / 64, 4);
    const hillsN = this.nHills.fbm2(wx / 160, wz / 160, 3);
    const urban = this.nUrban.fbm2(wx / 700, wz / 700, 2);
    const moist = this.nMoist.fbm2(wx / 380, wz / 380, 2);

    let h = 46 + cont * 12 + detail * 5;
    h += Math.pow(Math.max(0, hillsN), 1.6) * 38;

    const swampT = smooth(0.18, 0.38, moist);
    const desertT = smooth(-0.18, -0.38, moist);
    let urbanT = smooth(0.12, 0.3, urban);

    if (desertT > 0) {
      // mesetas escalonadas + dunas
      const dune = Math.abs(this.nDetail.noise2(wx / 22, wz / 22)) * 3;
      const terr = Math.floor(h / 7) * 7 + Math.pow((h % 7) / 7, 4) * 7;
      h = lerp(h, terr + dune, desertT);
    }
    if (swampT > 0) h = lerp(h, SEA - 1.5 + detail * 3.5, swampT);
    const cityLevel = 47 + cont * 4;
    if (urbanT > 0) h = lerp(h, cityLevel, urbanT);
    // valle cervecero: colinas suaves y verdes
    const th = this.type === 'brew' ? -0.08 : 0.36;
    const brewT = smooth(th, th + 0.12, this.nBrew.fbm2(wx / 520, wz / 520, 2)) * (1 - urbanT);
    if (brewT > 0) h = lerp(h, 48 + cont * 4 + detail * 3 + Math.sin(wx / 23) * Math.cos(wz / 29) * 2, brewT);

    // tundra (frío) y bosque de hongos
    const temp = this.nTemp.fbm2(wx / 640, wz / 640, 2);
    const tundraT = smooth(-0.26, -0.42, temp) * (1 - urbanT) * (1 - brewT);
    if (tundraT > 0) h = lerp(h, h + 5 + Math.abs(detail) * 6, tundraT);
    const mushT = smooth(0.38, 0.5, this.nMush.fbm2(wx / 470, wz / 470, 2)) * (1 - urbanT) * (1 - brewT) * (1 - tundraT);
    if (mushT > 0) h = lerp(h, 47 + cont * 5 + detail * 4, mushT);
    // ríos
    const rv = Math.abs(this.nRiver.fbm2(wx / 330, wz / 330, 2));
    const riverT = smooth(0.034, 0.012, rv) * (1 - urbanT) * smooth(0.3, 0, brewT - 0.7);
    if (riverT > 0) h = lerp(h, Math.min(h, SEA - 3), riverT);

    // mar de chatarra (planicies bajas con barcos varados) y zona militar
    const scrapT = smooth(0.42, 0.55, this.nScrap.fbm2(wx / 600, wz / 600, 2)) * (1 - urbanT) * (1 - brewT) * (1 - tundraT) * (1 - mushT);
    if (scrapT > 0) h = lerp(h, SEA - 0.6 + detail * 2.2, scrapT);
    const milT = smooth(0.45, 0.56, this.nMil.fbm2(wx / 650, wz / 650, 2)) * (1 - urbanT) * (1 - brewT) * (1 - scrapT) * (1 - mushT);
    if (milT > 0) h = lerp(h, 48 + cont * 3 + detail * 1.5, milT);

    let biome = BIOME.FOREST;
    if (urbanT > 0.5) biome = BIOME.CITY;
    else if (brewT > 0.5) biome = BIOME.BREW;
    else if (tundraT > 0.5) biome = BIOME.TUNDRA;
    else if (mushT > 0.5) biome = BIOME.MUSHROOM;
    else if (scrapT > 0.5) biome = BIOME.SCRAPSEA;
    else if (milT > 0.5) biome = BIOME.MILITARY;
    else if (swampT > 0.5) biome = BIOME.SWAMP;
    else if (desertT > 0.5) biome = BIOME.DESERT;

    let craterDepth = 0;
    if (urbanT < 0.5 && brewT < 0.3) {
      const c = this.crater(cx0, cz0);
      if (c) {
        const k = c.d / c.r;
        if (k < 1) { craterDepth = (1 - k * k) * c.r * 0.55; h -= craterDepth; if (k < 0.85) biome = BIOME.CRATER; }
        else if (k < 1.5) h += Math.sin((k - 1) / 0.5 * Math.PI) * 2.5;
      }
    }
    return { h: Math.max(4, Math.min(HEIGHT - 20, Math.round(h))), biome, urbanT, cityLevel: Math.round(cityLevel), temp, river: riverT > 0.5 };
  }

  generate(cx, cz) {
    if (cx * CHUNK >= ABYSS_X - 64) return this.generateAbyss(cx, cz);
    const data = new Uint8Array(CHUNK * CHUNK * HEIGHT);
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const seed = this.seed;
    const I = (x, y, z) => x + (z << 4) + (y << 8);
    const set = (x, y, z, id) => {
      if (x < 0 || x >= CHUNK || z < 0 || z >= CHUNK || y < 0 || y >= HEIGHT) return;
      data[I(x, y, z)] = id;
    };
    const setAir = (x, y, z, id) => {
      if (x < 0 || x >= CHUNK || z < 0 || z >= CHUNK || y < 0 || y >= HEIGHT) return;
      const i = I(x, y, z);
      if (data[i] === 0 || data[i] === 16) data[i] = id;
    };

    const cols = new Array(CHUNK * CHUNK);
    for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
      const wx = x0 + x, wz = z0 + z;
      const c = this.column(wx, wz);
      cols[x + z * CHUNK] = c;
      const h = c.h;
      const b = c.biome;
      const u = mod(wx, LOT), v = mod(wz, LOT);
      const isRoad = b === BIOME.CITY && (u < ROAD || v < ROAD);
      const isWalk = b === BIOME.CITY && !isRoad && (u < ROAD + 2 || v < ROAD + 2 || u >= LOT - 2 || v >= LOT - 2);

      for (let y = 0; y <= h; y++) {
        let id;
        if (y === 0 || (y < 3 && hash3(seed, wx, y, wz) < 0.5)) id = 1;
        else if (y < h - 4) id = y < 18 + this.nDetail.noise2(wx / 30, wz / 30) * 4 ? 3 : 2;
        else {
          const depth = h - y;
          switch (b) {
            case BIOME.DESERT: id = depth < 4 ? 6 : 2; break;
            case BIOME.SWAMP: id = depth < 3 ? 7 : 4; break;
            case BIOME.CRATER: id = depth === 0 ? (hash2(seed + 5, wx, wz) < 0.7 ? 22 : 6) : depth < 3 ? 8 : 2; break;
            case BIOME.CITY:
              if (isRoad) id = depth === 0 ? (hash2(seed + 6, wx, wz) < 0.06 ? 8 : 11) : depth < 3 ? 8 : 2;
              else if (isWalk) id = depth === 0 ? (hash2(seed + 7, wx, wz) < 0.15 ? 10 : 9) : 4;
              else id = depth === 0 ? 5 : 4;
              break;
            case BIOME.BREW: id = depth === 0 ? (h < SEA + 1 ? 4 : 84) : 4; break;
            case BIOME.MUSHROOM: id = depth === 0 ? (h < SEA + 1 ? 7 : 143) : 4; break;
            case BIOME.TUNDRA: id = depth === 0 ? (h < SEA + 1 ? 8 : 147) : depth < 3 ? 4 : 2; break;
            case BIOME.CIRCUIT: id = depth === 0 ? 5 : depth < 3 ? 4 : 2; break;
            case BIOME.ZOO: id = depth === 0 ? 84 : depth < 3 ? 4 : 2; break;
            case BIOME.SCRAPSEA: id = depth < 3 ? 192 : 4; break;
            case BIOME.MILITARY: id = depth === 0 ? (hash2(seed + 191, wx, wz) < 0.004 ? 182 : hash2(seed + 192, wx, wz) < 0.3 ? 8 : 5) : 4; break;
            default:
              id = depth === 0 ? (h < SEA + 1 ? 7 : 5) : 4;
          }
        }
        data[I(x, y, z)] = id;
      }
      const waterId = b === BIOME.BREW ? 47 : 17;
      for (let y = h + 1; y <= SEA; y++) data[I(x, y, z)] = waterId;
      if (b === BIOME.TUNDRA && h < SEA) data[I(x, SEA, z)] = 148; // lagos congelados

      // metro: túnel bajo las calles de la ciudad
      if (isRoad && c.urbanT > 0.75) {
        const fy = c.cityLevel - 10;
        for (let y = fy; y <= fy + 5; y++) data[I(x, y, z)] = y === fy || y === fy + 5 ? 9 : 0;
        const center = (u === 2 && v >= ROAD) || (v === 2 && u >= ROAD);
        if (center) data[I(x, fy + 1, z)] = 101;
        // andén: aparece un tren del subte en algunas vías
        if (u === 2 && v === ROAD + 9 && hash2(seed + 78, Math.floor(wx / LOT), Math.floor(wz / LOT)) < 0.12) data[I(x, fy, z)] = 201;
        if ((u === 0 || v === 0) && mod(u + v, 12) === 6) data[I(x, fy + 5, z)] = 28;
        // acceso con escalera de mano en algunas esquinas
        if (u === 0 && v === 3 && hash2(seed + 77, Math.floor(wx / LOT), Math.floor(wz / LOT)) < 0.45) {
          for (let y = fy + 1; y <= h; y++) data[I(x, y, z)] = 61;
        }
      }

      // cuevas
      const topCarve = h <= SEA + 1 ? h - 6 : h - 1;
      for (let y = 4; y < topCarve; y++) {
        const n1 = this.nCave.noise3(wx / 42, y / 26, wz / 42);
        const n2 = this.nCave2.noise3(wx / 42, y / 26, wz / 42);
        let carve = n1 * n1 + n2 * n2 < 0.011;
        if (!carve && y < 36) carve = this.nCave.noise3(wx / 70 + 50, y / 34, wz / 70) > 0.58;
        if (carve) data[I(x, y, z)] = y < 9 ? (this.nCave2.noise2(wx / 60, wz / 60) > 0.15 ? 55 : 17) : 0;
      }
    }

    // --- vetas de minerales (dentro del chunk) ---
    const rnd = mulberry32((seed * 31 + cx * 73856093) ^ (cz * 19349663));
    const veins = [
      { id: 18, n: 14, maxY: 90, size: 8 },
      { id: 19, n: 10, maxY: 70, size: 6 },
      { id: 20, n: 7, maxY: 48, size: 6 },
      { id: 21, n: 3, maxY: 24, size: 4 },
    ];
    for (const v of veins) for (let k = 0; k < v.n; k++) {
      let x = (rnd() * 16) | 0, y = 3 + ((rnd() * (v.maxY - 3)) | 0), z = (rnd() * 16) | 0;
      const s = 2 + ((rnd() * v.size) | 0);
      for (let j = 0; j < s; j++) {
        if (x >= 0 && x < 16 && z >= 0 && z < 16 && y > 0 && y < HEIGHT) {
          const i = I(x, y, z);
          if (data[i] === 2 || data[i] === 3) data[i] = v.id;
        }
        const r = rnd();
        if (r < 0.33) x += rnd() < 0.5 ? -1 : 1; else if (r < 0.66) y += rnd() < 0.5 ? -1 : 1; else z += rnd() < 0.5 ? -1 : 1;
      }
    }

    const colAt = (wx, wz) => {
      const lx = wx - x0, lz = wz - z0;
      if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16) return cols[lx + lz * 16];
      return this.column(wx, wz);
    };

    // --- árboles muertos y chatarra dispersa ---
    const M = 4;
    for (let wz = z0 - M; wz < z0 + CHUNK + M; wz++) for (let wx = x0 - M; wx < x0 + CHUNK + M; wx++) {
      const r = hash2(seed + 11, wx, wz);
      if (r > 0.02) continue;
      const c = colAt(wx, wz);
      if (c.h <= SEA) continue;
      const dens = c.biome === BIOME.FOREST ? 0.015 : c.biome === BIOME.SWAMP ? 0.008 : c.biome === BIOME.DESERT ? 0.0015 : c.biome === BIOME.BREW ? 0.004 : c.biome === BIOME.TUNDRA ? 0.004 : 0;
      if (c.biome === BIOME.MUSHROOM) { if (r < 0.011) this.giantMushroom(set, setAir, wx - x0, c.h + 1, wz - z0, wx, wz); continue; }
      if (c.biome === BIOME.CIRCUIT || c.biome === BIOME.ZOO) continue;
      if (c.biome === BIOME.CITY) continue;
      const lx = wx - x0, lz = wz - z0;
      if (r < dens) this.deadTree(set, setAir, lx, c.h + 1, lz, wx, wz);
      else if (r > 0.017 && c.biome !== BIOME.CRATER) {
        // chatarra / barriles en superficie
        const t = hash2(seed + 12, wx, wz);
        if (t < 0.5) { setAir(lx, c.h + 1, lz, 12); if (t < 0.25) setAir(lx + 1, c.h + 1, lz, 12); if (t < 0.12) setAir(lx, c.h + 2, lz, 12); }
        else if (t < 0.65) setAir(lx, c.h + 1, lz, 29);
        else if (t < 0.8) setAir(lx, c.h + 1, lz, 31);
      }
    }

    // --- valle cervecero: cebada, lúpulo y papas silvestres + manantiales ---
    for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
      const c = cols[x + z * 16];
      if (c.biome !== BIOME.BREW || c.h <= SEA) continue;
      if (data[I(x, c.h, z)] !== 84 || data[I(x, c.h + 1, z)] !== 0) continue;
      const r = hash2(seed + 71, x0 + x, z0 + z);
      const patch = this.nBrew.noise2((x0 + x) / 9, (z0 + z) / 9);
      if (patch > 0.45 && r < 0.55) set(x, c.h + 1, z, 91 + (r < 0.4 ? 1 : 0));
      else if (patch < -0.55 && r < 0.3) set(x, c.h + 1, z, 95 + (r < 0.2 ? 1 : 0));
      else if (r < 0.006) set(x, c.h + 1, z, 100);
    }
    this.springs(cx, cz, set, colAt, data, I);

    // --- cráter: uranio expuesto y barriles ---
    for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
      const c = cols[x + z * 16];
      if (c.biome !== BIOME.CRATER) continue;
      const r = hash2(seed + 21, x0 + x, z0 + z);
      if (r < 0.012) { set(x, c.h, z, 21); }
      else if (r < 0.018) setAir(x, c.h + 1, z, 29);
    }

    // --- ciudad ---
    this.city(data, cx, cz, cols, set, setAir, colAt, I);
    // --- búnkeres y otras estructuras ---
    this.bunkers(cx, cz, set);
    this.gasStations(cx, cz, set);
    this.radioTowers(cx, cz, set);
    this.breweries(cx, cz, set);
    this.circuits(cx, cz, set, colAt);
    this.zoos(cx, cz, set, colAt);
    this.settlements(cx, cz, set);
    this.labs(cx, cz, set);
    this.wrecks(cx, cz, set);
    this.military(cx, cz, set);
    this.undercity(cx, cz, set);

    return data;
  }

  deadTree(set, setAir, lx, y, lz, wx, wz) {
    const s = this.seed;
    const hgt = 4 + Math.floor(hash2(s + 13, wx, wz) * 5);
    for (let i = 0; i < hgt; i++) set(lx, y + i, lz, 15);
    const arms = 1 + Math.floor(hash2(s + 14, wx, wz) * 3);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let a = 0; a < arms; a++) {
      const d = dirs[Math.floor(hash3(s + 15, wx, a, wz) * 4)];
      const ay = y + hgt - 1 - Math.floor(hash3(s + 16, wx, a, wz) * 3);
      const len = 1 + Math.floor(hash3(s + 17, wx, a, wz) * 3);
      let px = lx, pz = lz, py = ay;
      for (let k = 1; k <= len; k++) {
        px += d[0]; pz += d[1];
        if (k === len || hash3(s + 18, wx, k * 7 + a, wz) < 0.4) py++;
        setAir(px, py, pz, 15);
      }
      setAir(px, py + 1, pz, 16);
      setAir(px + d[0], py, pz + d[1], 16);
      if (hash3(s + 19, wx, a, wz) < 0.5) setAir(px + d[1], py, pz + d[0], 16);
    }
    setAir(lx, y + hgt, lz, 16);
  }

  lotInfo(lx, lz) {
    const s = this.seed;
    const cxw = lx * LOT + (LOT + ROAD) / 2, czw = lz * LOT + (LOT + ROAD) / 2;
    const c = this.column(cxw, czw);
    if (c.urbanT < 0.6) return null;
    const r = hash2(s + 31, lx, lz);
    const inner0 = ROAD + 2, inner1 = LOT - 3; // [7, 29]
    const info = { base: c.h, kind: r < 0.72 ? 'building' : r < 0.86 ? 'rubble' : 'plaza' };
    const ins = (k) => Math.floor(hash2(s + 32 + k, lx, lz) * 3);
    info.x0 = lx * LOT + inner0 + ins(0);
    info.x1 = lx * LOT + inner1 - ins(1);
    info.z0 = lz * LOT + inner0 + ins(2);
    info.z1 = lz * LOT + inner1 - ins(3);
    info.floors = 2 + Math.floor(Math.pow(hash2(s + 37, lx, lz), 1.4) * 11);
    info.height = info.floors * 4;
    info.mat = hash2(s + 38, lx, lz) < 0.3 ? 13 : 9;
    info.hospital = info.kind === 'building' && hash2(s + 40, lx, lz) < 0.14;
    if (info.hospital) { info.mat = 83; info.floors = Math.min(info.floors, 5); info.height = info.floors * 4; }
    info.collapse = hash2(s + 39, lx, lz);
    return info;
  }

  city(data, cx, cz, cols, set, setAir, colAt, I) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    let anyCity = false;
    for (const c of cols) if (c.urbanT > 0.3) { anyCity = true; break; }
    if (!anyCity) return;

    // autos oxidados sobre calles
    for (let wz = z0 - 5; wz < z0 + CHUNK + 5; wz++) for (let wx = x0 - 5; wx < x0 + CHUNK + 5; wx++) {
      const u = mod(wx, LOT), v = mod(wz, LOT);
      const alongX = v >= 1 && v <= 2 && u >= ROAD + 1;
      const alongZ = u >= 1 && u <= 2 && v >= ROAD + 1;
      if (!alongX && !alongZ) continue;
      if (hash2(s + 41, wx, wz) > 0.012) continue;
      const c = colAt(wx, wz);
      if (c.biome !== BIOME.CITY) continue;
      const y = c.h + 1;
      const L = alongX ? [1, 0] : [0, 1], W = alongX ? [0, 1] : [1, 0];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) {
        const px = wx + L[0] * a + W[0] * b - x0, pz = wz + L[1] * a + W[1] * b - z0;
        setAir(px, y, pz, 12);
        if (a >= 1 && a <= 2) setAir(px, y + 1, pz, hash2(s + 42, wx + a, wz + b) < 0.5 ? 12 : 14);
      }
    }

    const lx0 = Math.floor(x0 / LOT), lx1 = Math.floor((x0 + CHUNK - 1) / LOT);
    const lz0 = Math.floor(z0 / LOT), lz1 = Math.floor((z0 + CHUNK - 1) / LOT);
    for (let lx = lx0; lx <= lx1; lx++) for (let lz = lz0; lz <= lz1; lz++) {
      const L = this.lotInfo(lx, lz);
      if (!L) continue;
      const base = L.base;
      if (L.kind === 'building') {
        const { x0: bx0, x1: bx1, z0: bz0, z1: bz1, height, mat } = L;
        for (let wx = Math.max(bx0, x0); wx <= Math.min(bx1, x0 + 15); wx++)
          for (let wz = Math.max(bz0, z0); wz <= Math.min(bz1, z0 + 15); wz++) {
            const lx_ = wx - x0, lz_ = wz - z0;
            const edgeX = wx === bx0 || wx === bx1, edgeZ = wz === bz0 || wz === bz1;
            const wall = edgeX || edgeZ;
            const corner = edgeX && edgeZ;
            // altura en ruinas por columna
            const rn = this.nRuin.noise2(wx / 9 + lx * 3, wz / 9 + lz * 3) * 0.5 + 0.5;
            let top = height;
            if (L.collapse > 0.3) top = Math.round(height * (1 - rn * (0.15 + L.collapse * 0.4)));
            if (corner) top = Math.max(top, Math.round(height * 0.8));
            // cimientos
            for (let y = base - 3; y <= base; y++) set(lx_, y, lz_, mat === 13 ? 9 : mat);
            for (let y = base + 1; y <= base + height + 1; y++) set(lx_, y, lz_, 0);
            for (let dy = 1; dy <= top; dy++) {
              const y = base + dy;
              const isFloor = dy % 4 === 0;
              let id = 0;
              if (wall) {
                const along = edgeX ? wz : wx;
                const winRow = dy % 4 === 2 || dy % 4 === 3;
                const winCol = mod(along, 3) !== 0 && !corner;
                if (winRow && winCol) id = hash3(s + 43, wx, y, wz) < 0.25 ? 14 : 0;
                else id = mat;
                // puerta en planta baja
                if (dy <= 2 && !corner && mod(along - (edgeX ? bz0 : bx0), 9) === 4) id = 0;
              } else if (isFloor) {
                id = 9;
              }
              if (id !== 0 && id !== 14) {
                if (this.nRuin.noise2(wx / 5 + y * 0.37, wz / 5 - y * 0.23) > 0.55) id = 0; // agujeros
                else if (id === 9 && hash3(s + 44, wx, y, wz) < 0.12) id = 10;
              }
              if (id) set(lx_, y, lz_, id);
            }
            // varillas oxidadas asomando en el borde roto
            if (wall && top < height && top > 2 && hash2(s + 45, wx, wz) < 0.25) set(lx_, base + top + 1, lz_, 12);
            // suelo interior
            if (!wall) {
              set(lx_, base, lz_, 9);
              for (let f = 0; f < L.floors; f++) {
                const y = base + f * 4 + 1;
                if (f * 4 >= top) break;
                const r = hash3(s + 46, wx, y, wz);
                if (r < (L.hospital ? 0.03 : 0.012)) set(lx_, y, lz_, L.hospital ? 82 : 31);
                else if (r < 0.018) set(lx_, y, lz_, 29);
                else if (r < 0.05) set(lx_, y, lz_, 30);
              }
            }
          }
        // escombros alrededor de la base
        for (let wx = Math.max(bx0 - 2, x0); wx <= Math.min(bx1 + 2, x0 + 15); wx++)
          for (let wz = Math.max(bz0 - 2, z0); wz <= Math.min(bz1 + 2, z0 + 15); wz++) {
            if (wx >= bx0 && wx <= bx1 && wz >= bz0 && wz <= bz1) continue;
            const r = hash2(s + 47, wx, wz);
            if (r < 0.35 * L.collapse) {
              setAir(wx - x0, base + 1, wz - z0, 30);
              if (r < 0.1 * L.collapse) setAir(wx - x0, base + 2, wz - z0, 30);
            }
          }
      } else if (L.kind === 'rubble') {
        for (let wx = Math.max(L.x0, x0); wx <= Math.min(L.x1, x0 + 15); wx++)
          for (let wz = Math.max(L.z0, z0); wz <= Math.min(L.z1, z0 + 15); wz++) {
            const n = this.nRuin.noise2(wx / 6, wz / 6) * 0.5 + 0.5;
            const hh = Math.floor(n * 6 * L.collapse + n * 2);
            for (let y = 1; y <= hh; y++) {
              const r = hash3(s + 48, wx, y, wz);
              set(wx - x0, base + y, wz - z0, r < 0.6 ? 30 : r < 0.8 ? 10 : r < 0.9 ? 12 : 13);
            }
          }
      } else {
        // plaza: árbol muerto en el centro, bolsas de arena
        const cxw = Math.floor((L.x0 + L.x1) / 2), czw = Math.floor((L.z0 + L.z1) / 2);
        this.deadTree(set, setAir, cxw - x0, base + 1, czw - z0, cxw, czw);
        for (let wx = Math.max(L.x0, x0); wx <= Math.min(L.x1, x0 + 15); wx++)
          for (let wz = Math.max(L.z0, z0); wz <= Math.min(L.z1, z0 + 15); wz++) {
            const d = Math.max(Math.abs(wx - cxw), Math.abs(wz - czw));
            if (d === 6 && hash2(s + 49, wx, wz) < 0.7) setAir(wx - x0, base + 1, wz - z0, 32);
          }
      }
    }
  }

  bunkerAt(gx, gz) {
    const s = this.seed;
    if (hash2(s + 61, gx, gz) > 0.55) return null;
    const x = Math.floor((gx + 0.25 + hash2(s + 62, gx, gz) * 0.5) * BUNKER_CELL);
    const z = Math.floor((gz + 0.25 + hash2(s + 63, gx, gz) * 0.5) * BUNKER_CELL);
    const c = this.column(x, z);
    if ((c.biome !== BIOME.FOREST && c.biome !== BIOME.DESERT) || c.h < SEA + 4) return null;
    return { x, z, fy: c.h - 12 };
  }

  bunkers(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const gx0 = Math.floor((x0 - 24) / BUNKER_CELL), gx1 = Math.floor((x0 + 40) / BUNKER_CELL);
    const gz0 = Math.floor((z0 - 24) / BUNKER_CELL), gz1 = Math.floor((z0 + 40) / BUNKER_CELL);
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const b = this.bunkerAt(gx, gz);
      if (!b) continue;
      const { x, z, fy } = b;
      const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
      // sala 11x11 exterior, 5 de alto interior
      for (let wx = x - 5; wx <= x + 5; wx++) for (let wz = z - 5; wz <= z + 5; wz++) for (let y = fy; y <= fy + 5; y++) {
        const shell = wx === x - 5 || wx === x + 5 || wz === z - 5 || wz === z + 5 || y === fy || y === fy + 5;
        S(wx, y, wz, shell ? (y === fy ? 9 : 27) : 0);
      }
      S(x, fy + 5, z, 28);
      const r = (k) => hash2(this.seed + 64 + k, x, z);
      S(x - 4, fy + 1, z - 4, 31); S(x - 4, fy + 1, z + 4, 31);
      if (r(1) < 0.7) S(x + 4, fy + 1, z + 4, 31);
      if (r(2) < 0.5) S(x - 4, fy + 2, z - 4, 31);
      S(x - 3, fy + 1, z - 4, 33);
      if (r(3) < 0.6) S(x + 4, fy + 1, z - 4, 29);
      S(x - 4, fy + 1, z, 24);
      // puerta y escalera hacia +x hasta la superficie
      for (let y = fy + 1; y <= fy + 3; y++) for (let wz = z - 1; wz <= z; wz++) S(x + 5, y, wz, 0);
      for (let i = 0; i < 14; i++) {
        const sx = x + 6 + i, sy = fy + i;
        for (let wz = z - 2; wz <= z + 1; wz++) {
          const side = wz === z - 2 || wz === z + 1;
          S(sx, sy, wz, side ? 9 : 9);
          for (let y = sy + 1; y <= sy + 4; y++) S(sx, y, wz, side ? (y === sy + 4 ? 0 : 27) : 0);
        }
      }
      // marco de bolsas de arena en la salida
      const ex = x + 6 + 12;
      for (let wz = z - 3; wz <= z + 2; wz++) { S(ex + 2, fy + 13, wz, 32); }
    }
  }

  // manantiales de agua limpia en el valle
  springs(cx, cz, set, colAt, data, I) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const g0x = Math.floor((x0 - 4) / SPRING_CELL), g1x = Math.floor((x0 + 20) / SPRING_CELL);
    const g0z = Math.floor((z0 - 4) / SPRING_CELL), g1z = Math.floor((z0 + 20) / SPRING_CELL);
    for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
      if (hash2(s + 81, gx, gz) > 0.45) continue;
      const px = Math.floor((gx + 0.3 + hash2(s + 82, gx, gz) * 0.4) * SPRING_CELL);
      const pz = Math.floor((gz + 0.3 + hash2(s + 83, gx, gz) * 0.4) * SPRING_CELL);
      const c = this.column(px, pz);
      if (c.biome !== BIOME.BREW) continue;
      const r = 2 + Math.floor(hash2(s + 84, gx, gz) * 2);
      for (let wx = px - r; wx <= px + r; wx++) for (let wz = pz - r; wz <= pz + r; wz++) {
        const d = Math.hypot(wx - px, wz - pz);
        if (d > r + 0.3) continue;
        const lx = wx - x0, lz = wz - z0;
        if (lx < 0 || lx > 15 || lz < 0 || lz > 15) continue;
        for (let y = c.h - (d < r - 1 ? 2 : 1) + 1; y <= c.h + 2; y++) set(lx, y, lz, y <= c.h ? 47 : 0);
        set(lx, c.h - (d < r - 1 ? 2 : 1), lz, 8);
      }
    }
  }

  gasStations(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const g0x = Math.floor((x0 - 16) / GAS_CELL), g1x = Math.floor((x0 + 32) / GAS_CELL);
    const g0z = Math.floor((z0 - 16) / GAS_CELL), g1z = Math.floor((z0 + 32) / GAS_CELL);
    for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
      if (hash2(s + 101, gx, gz) > 0.5) continue;
      const px = Math.floor((gx + 0.3 + hash2(s + 102, gx, gz) * 0.4) * GAS_CELL);
      const pz = Math.floor((gz + 0.3 + hash2(s + 103, gx, gz) * 0.4) * GAS_CELL);
      const c = this.column(px, pz);
      if ((c.biome !== BIOME.FOREST && c.biome !== BIOME.DESERT) || c.h <= SEA + 1) continue;
      const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
      const y0 = c.h;
      // playón de hormigón y techo sobre columnas
      for (let wx = px - 7; wx <= px + 7; wx++) for (let wz = pz - 5; wz <= pz + 5; wz++) {
        for (let y = y0 - 2; y <= y0; y++) S(wx, y, wz, 9);
        for (let y = y0 + 1; y <= y0 + 6; y++) S(wx, y, wz, 0);
        if (wx >= px - 6 && wx <= px + 1 && wz >= pz - 4 && wz <= pz + 4 && hash2(s + 104, wx, wz) < 0.88) S(wx, y0 + 5, wz, 59);
      }
      for (const [dx, dz] of [[-6, -4], [-6, 4], [1, -4], [1, 4]]) for (let y = y0 + 1; y <= y0 + 4; y++) S(px + dx, y, pz + dz, 27);
      S(px - 3, y0 + 1, pz - 1, 102); S(px - 3, y0 + 1, pz + 1, 102);
      // negocio
      for (let wx = px + 3; wx <= px + 7; wx++) for (let wz = pz - 3; wz <= pz + 3; wz++) for (let y = y0 + 1; y <= y0 + 4; y++) {
        const wall = wx === px + 3 || wx === px + 7 || wz === pz - 3 || wz === pz + 3;
        const roof = y === y0 + 4;
        let id = wall || roof ? 13 : 0;
        if (wall && !roof && wx === px + 3 && Math.abs(wz - pz) <= 0 && y <= y0 + 2) id = 0; // puerta
        if (wall && !roof && y === y0 + 2 && (wz === pz - 2 || wz === pz + 2) && wx === px + 3) id = 14;
        S(wx, y, wz, id);
      }
      S(px + 6, y0 + 1, pz - 2, 31); S(px + 6, y0 + 1, pz + 2, 31);
      if (hash2(s + 105, gx, gz) < 0.5) S(px + 5, y0 + 1, pz + 2, 31);
      S(px + 4, y0 + 1, pz + 2, 29);
    }
  }

  radioTowers(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const g0x = Math.floor((x0 - 8) / TOWER_CELL), g1x = Math.floor((x0 + 24) / TOWER_CELL);
    const g0z = Math.floor((z0 - 8) / TOWER_CELL), g1z = Math.floor((z0 + 24) / TOWER_CELL);
    for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
      if (hash2(s + 111, gx, gz) > 0.5) continue;
      const px = Math.floor((gx + 0.3 + hash2(s + 112, gx, gz) * 0.4) * TOWER_CELL);
      const pz = Math.floor((gz + 0.3 + hash2(s + 113, gx, gz) * 0.4) * TOWER_CELL);
      const c = this.column(px, pz);
      if (c.biome === BIOME.CITY || c.biome === BIOME.SWAMP || c.h <= SEA + 2) continue;
      const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
      const y0 = c.h, H = 26 + Math.floor(hash2(s + 114, gx, gz) * 10);
      for (let wx = px - 3; wx <= px + 3; wx++) for (let wz = pz - 3; wz <= pz + 3; wz++) { S(wx, y0, wz, 9); S(wx, y0 - 1, wz, 9); for (let y = y0 + 1; y < y0 + 4; y++) S(wx, y, wz, 0); }
      for (let y = y0 + 1; y <= y0 + H; y++) {
        const w = y < y0 + H * 0.5 ? 1 : 0;
        for (let dx = -w; dx <= w; dx++) for (let dz = -w; dz <= w; dz++) {
          if (w && dx === 0 && dz === 0) continue;
          S(px + dx, y, pz + dz, 103);
        }
        if (!w) S(px, y, pz, 103);
      }
      S(px, y0 + H + 1, pz, 28);
      S(px + 2, y0 + 1, pz + 2, 31); S(px - 2, y0 + 1, pz - 2, 76);
    }
  }

  breweries(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const g0x = Math.floor((x0 - 16) / BREWERY_CELL), g1x = Math.floor((x0 + 32) / BREWERY_CELL);
    const g0z = Math.floor((z0 - 16) / BREWERY_CELL), g1z = Math.floor((z0 + 32) / BREWERY_CELL);
    for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
      const b = this.breweryAt(gx, gz);
      if (!b) continue;
      const { x: px, z: pz, y: y0 } = b;
      const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
      // terreno parejo alrededor
      for (let wx = px - 9; wx <= px + 9; wx++) for (let wz = pz - 9; wz <= pz + 9; wz++) {
        S(wx, y0, wz, 84); S(wx, y0 - 1, wz, 4); S(wx, y0 - 2, wz, 4);
        for (let y = y0 + 1; y <= y0 + 8; y++) S(wx, y, wz, 0);
      }
      // edificio de ladrillo 11x9
      const X0 = px - 5, X1 = px + 5, Z0 = pz - 4, Z1 = pz + 4;
      for (let wx = X0; wx <= X1; wx++) for (let wz = Z0; wz <= Z1; wz++) {
        S(wx, y0, wz, 23);
        for (let y = y0 + 1; y <= y0 + 5; y++) {
          const wall = wx === X0 || wx === X1 || wz === Z0 || wz === Z1;
          let id = 0;
          if (y === y0 + 5) id = hash2(s + 121, wx, wz) < 0.85 ? 60 : 0;
          else if (wall) {
            id = 13;
            const along = wx === X0 || wx === X1 ? wz : wx;
            if (y === y0 + 2 || y === y0 + 3) if (Math.abs(along - (wx === X0 || wx === X1 ? pz : px)) === 2) id = hash2(s + 122, wx, y + wz) < 0.5 ? 14 : 0;
            if (wz === Z1 && Math.abs(wx - px) <= 0 && y <= y0 + 2) id = 0; // puerta
          }
          S(wx, y, wz, id);
        }
      }
      S(px, y0 + 3, Z1 + 1, 88); // cartel sobre la puerta
      // equipamiento
      S(px - 3, y0 + 1, pz - 2, 80); S(px - 1, y0 + 1, pz - 2, 81); S(px + 1, y0 + 1, pz - 2, 81);
      S(px + 3, y0 + 1, pz - 2, 79); S(px + 3, y0 + 1, pz + 1, 24); S(px + 3, y0 + 1, pz + 2, 25);
      S(px - 4, y0 + 1, pz + 1, 86); S(px - 4, y0 + 1, pz + 2, 86); S(px - 4, y0 + 2, pz + 1, 86); S(px - 3, y0 + 1, pz + 3, 86);
      S(px - 4, y0 + 1, pz - 3, 87); S(px + 4, y0 + 1, pz - 3, 87);
      if (hash2(s + 123, gx, gz) < 0.6) S(px - 1, y0 + 1, pz + 3, 87);
      S(px, y0 + 4, pz, 28);
      // huerta: cebada al este, lúpulo con postes al oeste
      for (let wx = px + 7; wx <= px + 9; wx++) for (let wz = pz - 4; wz <= pz + 4; wz++) { S(wx, y0, wz, 39); S(wx, y0 + 1, wz, hash2(s + 124, wx, wz) < 0.7 ? 92 : 90); }
      for (let wz = pz - 4; wz <= pz + 4; wz += 2) {
        for (let y = y0 + 1; y <= y0 + 3; y++) S(px - 8, y, wz, 85);
        S(px - 7, y0, wz, 39); S(px - 7, y0 + 1, wz, 96); S(px - 9, y0, wz, 39); S(px - 9, y0 + 1, wz, 95);
      }
    }
  }

  breweryAt(gx, gz) {
    const s = this.seed;
    if (hash2(s + 131, gx, gz) > (this.type === 'brew' ? 0.8 : 0.6)) return null;
    const x = Math.floor((gx + 0.3 + hash2(s + 132, gx, gz) * 0.4) * BREWERY_CELL);
    const z = Math.floor((gz + 0.3 + hash2(s + 133, gx, gz) * 0.4) * BREWERY_CELL);
    const c = this.column(x, z);
    if (c.biome !== BIOME.BREW || c.h <= SEA + 1) return null;
    return { x, z, y: c.h };
  }

  giantMushroom(set, setAir, lx, y, lz, wx, wz) {
    const s = this.seed;
    const hgt = 5 + Math.floor(hash2(s + 151, wx, wz) * 6);
    const cap = hash2(s + 152, wx, wz) < 0.5 ? 145 : 146;
    const r = 2 + Math.floor(hash2(s + 153, wx, wz) * 2);
    for (let i = 0; i < hgt; i++) set(lx, y + i, lz, 144);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > r + 0.4) continue;
      setAir(lx + dx, y + hgt, lz + dz, cap);
      if (d > r - 0.8) setAir(lx + dx, y + hgt - 1, lz + dz, cap);
    }
    setAir(lx, y + hgt + 1, lz, cap);
  }

  circuits(cx, cz, set, colAt) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const c = this.circuitNear(x0 + 8, z0 + 8) || this.circuitNear(x0, z0) || this.circuitNear(x0 + 15, z0 + 15) || this.circuitNear(x0 + 15, z0) || this.circuitNear(x0, z0 + 15);
    if (!c) return;
    const s = this.seed, y = c.y;
    const S = (wx, yy, wz, id) => set(wx - x0, yy, wz - z0, id);
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const wx = x0 + lx, wz = z0 + lz;
      if (Math.abs(wx - c.x) > c.bx || Math.abs(wz - c.z) > c.bz) continue;
      const dx = wx - c.x, dz = wz - c.z;
      const d = this.trackDist(c, wx, wz);
      for (let yy = y + 1; yy < y + 14; yy++) S(wx, yy, wz, 0); // despejar
      for (let yy = y - 3; yy <= y; yy++) S(wx, yy, wz, yy === y ? 5 : 4);
      if (d < TRACK_W) S(wx, y, wz, dx === 0 && dz > 0 ? 151 : 150);
      else if (d < TRACK_W + 1) S(wx, y, wz, 149);
      // barreras de neumáticos en el exterior de las curvas
      const outside = Math.abs(dx) > c.a ? Math.hypot(Math.abs(dx) - c.a, dz) > c.R : Math.abs(dz) > c.R;
      if (outside && d >= TRACK_W + 3 && d < TRACK_W + 4 && Math.abs(dx) > c.a - 4) { S(wx, y + 1, wz, 153); if (hash2(s + 161, wx, wz) < 0.5) S(wx, y + 2, wz, 153); }
      // boxes: fila de garajes al sur de la recta principal
      const pz = dz - (c.R + TRACK_W + 4);
      if (pz >= 0 && pz < 9 && Math.abs(dx) <= c.a * 0.7) {
        S(wx, y, wz, pz < 3 ? 150 : 9);
        const gi = Math.floor((dx + c.a) / 6), gxl = ((dx % 6) + 6) % 6;
        if (pz >= 3) {
          const wall = pz === 8 || gxl === 0;
          for (let yy = y + 1; yy <= y + 4; yy++) S(wx, yy, wz, wall ? 9 : 0);
          S(wx, y + 5, wz, 59);
          if (pz === 5 && gxl === 3) {
            const r = hash2(s + 162, gi, c.x);
            S(wx, y, wz, r < 0.45 ? 154 : r < 0.75 ? 155 : r < 0.9 ? 156 : 9);
          }
        }
      }
      // torre de control
      const tx = dx - Math.floor(c.a * 0.75), tz = dz - (c.R + TRACK_W + 4);
      if (tx >= 0 && tx < 6 && tz >= 0 && tz < 6) {
        const wall = tx === 0 || tx === 5 || tz === 0 || tz === 5;
        for (let yy = y + 1; yy <= y + 13; yy++) {
          let id = 0;
          if (wall) id = yy > y + 9 && yy < y + 13 ? 14 : 9;
          if (yy === y + 5 || yy === y + 13) id = 9;
          if (tz === 0 && tx === 2 && yy <= y + 2) id = 0;
          if (tx === 4 && tz === 4 && yy < y + 13) id = yy === y + 5 ? 0 : 61; // escalera
          S(wx, yy, wz, id);
        }
        S(wx, y, wz, tx === 2 && tz === 2 ? 157 : 9);
        if (tx === 2 && tz === 2) S(wx, y + 12, wz, 28);
      }
      // tribunas en la recta de enfrente
      const gz = -(dz + c.R + TRACK_W + 3);
      if (gz >= 0 && gz < 7 && Math.abs(dx) <= c.a * 0.8) for (let yy = y + 1; yy <= y + 1 + gz; yy++) S(wx, yy, wz, yy === y + 1 + gz ? 177 : 9);
      // semáforo de largada
      if (dx === 2 && Math.abs(dz - (c.R + TRACK_W + 1)) < 0.5) { S(wx, y + 1, wz, 9); S(wx, y + 2, wz, 152); }
    }
  }

  settlementAt(gx, gz) {
    const s = this.seed;
    if (hash2(s + 171, gx, gz) > 0.5) return null;
    const x = Math.floor((gx + 0.3 + hash2(s + 172, gx, gz) * 0.4) * SETTLE_CELL);
    const z = Math.floor((gz + 0.3 + hash2(s + 173, gx, gz) * 0.4) * SETTLE_CELL);
    const c = this.column(x, z);
    if (![BIOME.FOREST, BIOME.DESERT, BIOME.TUNDRA, BIOME.MUSHROOM].includes(c.biome) || c.h <= SEA + 1) return null;
    return { x, z, y: c.h };
  }
  settlements(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const g0x = Math.floor((x0 - 20) / SETTLE_CELL), g1x = Math.floor((x0 + 36) / SETTLE_CELL);
    const g0z = Math.floor((z0 - 20) / SETTLE_CELL), g1z = Math.floor((z0 + 36) / SETTLE_CELL);
    for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
      const st = this.settlementAt(gx, gz);
      if (!st) continue;
      const { x: px, z: pz, y: y0 } = st;
      const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
      for (let wx = px - 15; wx <= px + 15; wx++) for (let wz = pz - 15; wz <= pz + 15; wz++) {
        const d = Math.max(Math.abs(wx - px), Math.abs(wz - pz));
        for (let y = y0 + 1; y <= y0 + 16; y++) S(wx, y, wz, 0);
        S(wx, y0, wz, d < 14 ? 30 : 5); S(wx, y0 - 1, wz, 4);
        // muralla con portones
        if (d === 14 && !(Math.abs(wx - px) < 2 || Math.abs(wz - pz) < 2)) for (let y = y0 + 1; y <= y0 + 3; y++) S(wx, y, wz, y === y0 + 3 ? 12 : hash2(s + 174, wx, wz) < 0.5 ? 32 : 27);
      }
      // chozas
      const huts = [[-8, -8, 1], [8, -8, 0], [-8, 8, 0], [8, 8, 0]];
      for (const [hx, hz, main] of huts) {
        const cxh = px + hx, czh = pz + hz;
        for (let wx = cxh - 3; wx <= cxh + 3; wx++) for (let wz = czh - 3; wz <= czh + 3; wz++) {
          const wall = Math.abs(wx - cxh) === 3 || Math.abs(wz - czh) === 3;
          S(wx, y0, wz, 23);
          for (let y = y0 + 1; y <= y0 + 4; y++) {
            let id = y === y0 + 4 ? 12 : wall ? 23 : 0;
            if (wall && wz === czh + 3 * Math.sign(-hz) && wx === cxh && y <= y0 + 2) id = 0; // puerta hacia el centro
            S(wx, y, wz, id);
          }
        }
        S(cxh, y0 + 3, czh, 26 + 0);
        if (main) { S(cxh, y0, czh, 158); S(cxh + 2, y0 + 1, czh - 2, 38); S(cxh - 2, y0 + 1, czh - 2, 24); }
        else { S(cxh + 2, y0 + 1, czh + 2, 33); S(cxh - 2, y0 + 1, czh + 2, 31); }
      }
      S(px, y0 + 1, pz, 108); // fogata central
      for (let wx = px - 3; wx <= px + 3; wx++) { S(wx, y0, pz + 5, 39); S(wx, y0 + 1, pz + 5, 100); }
      S(px + 4, y0 + 1, pz - 1, 86); S(px - 4, y0 + 1, pz + 1, 110);
    }
  }

  labAt(gx, gz) {
    const s = this.seed;
    if (hash2(s + 181, gx, gz) > 0.5) return null;
    const x = Math.floor((gx + 0.3 + hash2(s + 182, gx, gz) * 0.4) * LAB_CELL);
    const z = Math.floor((gz + 0.3 + hash2(s + 183, gx, gz) * 0.4) * LAB_CELL);
    const c = this.column(x, z);
    if (c.biome === BIOME.CITY || c.biome === BIOME.CIRCUIT || c.h <= SEA + 1) return null;
    return { x, z, y: c.h };
  }
  labs(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const g0x = Math.floor((x0 - 20) / LAB_CELL), g1x = Math.floor((x0 + 36) / LAB_CELL);
    const g0z = Math.floor((z0 - 20) / LAB_CELL), g1z = Math.floor((z0 + 36) / LAB_CELL);
    for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
      const L = this.labAt(gx, gz);
      if (!L) continue;
      const { x: px, z: pz, y: sy } = L;
      const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
      const floors = [30, 22, 14];
      // caseta de entrada y pozo con escalera
      for (let wx = px - 2; wx <= px + 2; wx++) for (let wz = pz - 2; wz <= pz + 2; wz++) {
        const wall = Math.abs(wx - px) === 2 || Math.abs(wz - pz) === 2;
        S(wx, sy, wz, 9);
        for (let y = sy + 1; y <= sy + 4; y++) S(wx, y, wz, y === sy + 4 ? 27 : wall && !(wz === pz + 2 && wx === px && y <= sy + 2) ? 83 : 0);
      }
      S(px, sy + 3, pz + 3, 29);
      // pisos: grilla 3×3 de salas de 9×9 unidas por pasillos
      floors.forEach((fy, fi) => {
        for (let wx = px - 14; wx <= px + 14; wx++) for (let wz = pz - 14; wz <= pz + 14; wz++) {
          const rx = ((wx - px + 14) % 10), rz = ((wz - pz + 14) % 10);
          const wallX = rx === 0, wallZ = rz === 0;
          const edge = Math.abs(wx - px) === 14 || Math.abs(wz - pz) === 14;
          for (let y = fy; y <= fy + 5; y++) {
            let id;
            if (y === fy || y === fy + 5) id = y === fy ? 9 : 83;
            else if (edge) id = 83;
            else if (wallX || wallZ) {
              const door = (wallX && (rz === 5 || rz === 4)) || (wallZ && (rx === 5 || rx === 4));
              id = door && y <= fy + 3 ? 0 : 83;
            } else id = 0;
            S(wx, y, wz, id);
          }
          if (!wallX && !wallZ && !edge) {
            const r = hash3(s + 184, wx, fy, wz);
            if (rx === 5 && rz === 5) S(wx, fy + 5, wz, 28);
            else if (r < 0.012) S(wx, fy + 1, wz, 178);
            else if (r < 0.02) S(wx, fy + 1, wz, 82);
            else if (r < 0.03 && fi > 0) S(wx, fy + 1, wz, 160);
            else if (r < 0.034) S(wx, fy + 1, wz, 29);
          }
        }
      });
      // escaleras de mano: pozo de entrada y bajadas entre pisos
      for (let y = floors[0] + 1; y <= sy; y++) S(px, y, pz, 63);
      for (let fi = 0; fi < floors.length - 1; fi++) for (let y = floors[fi + 1] + 1; y <= floors[fi]; y++) S(px + 12, y, pz + 12, 63);
      // sala del jefe con el núcleo en el último piso
      S(px, floors[2] + 1, pz, 159);
      S(px + 5, floors[2] + 1, pz + 5, 197);
      void s;
    }
  }

  nearestCircuit(x, z, cells = 3) {
    let best = null;
    const gx0 = Math.floor(x / CIRCUIT_CELL), gz0 = Math.floor(z / CIRCUIT_CELL);
    for (let gx = gx0 - cells; gx <= gx0 + cells; gx++) for (let gz = gz0 - cells; gz <= gz0 + cells; gz++) {
      const c = this.circuitAt(gx, gz);
      if (c) { const d = Math.hypot(c.x - x, c.z - z); if (!best || d < best.d) best = { d, c }; }
    }
    return best?.c ?? null;
  }

  // ---------- barcos varados y aviones caídos ----------
  wrecks(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
    const cells = (cell, pad) => { const out = []; for (let gx = Math.floor((x0 - pad) / cell); gx <= Math.floor((x0 + 16 + pad) / cell); gx++) for (let gz = Math.floor((z0 - pad) / cell); gz <= Math.floor((z0 + 16 + pad) / cell); gz++) out.push([gx, gz]); return out; };
    for (const [gx, gz] of cells(SHIP_CELL, 20)) {
      if (hash2(s + 201, gx, gz) > 0.55) continue;
      const px = Math.floor((gx + 0.3 + hash2(s + 202, gx, gz) * 0.4) * SHIP_CELL), pz = Math.floor((gz + 0.3 + hash2(s + 203, gx, gz) * 0.4) * SHIP_CELL);
      const c = this.column(px, pz);
      if (c.biome !== BIOME.SCRAPSEA) continue;
      const alongX = hash2(s + 204, gx, gz) < 0.5, L = 14 + Math.floor(hash2(s + 205, gx, gz) * 12), Wd = 4, Hh = 6;
      const base = SEA - 2;
      for (let a = -L; a <= L; a++) for (let b = -Wd; b <= Wd; b++) {
        const wx = alongX ? px + a : px + b, wz = alongX ? pz + b : pz + a;
        const taper = Math.abs(a) > L - 5 ? (Math.abs(a) - (L - 5)) : 0; // proa en punta
        if (Math.abs(b) > Wd - taper * 0.8) continue;
        const shell = Math.abs(b) >= Wd - taper * 0.8 - 1 || Math.abs(a) === L;
        const tilt = Math.round(b * 0.35); // escorado
        for (let y = base; y <= base + Hh + tilt; y++) {
          const deck = y === base + 4 + tilt;
          const hole = hash3(s + 206, wx, y, wz) < 0.08;
          if (shell && !hole) S(wx, y, wz, 193);
          else if (deck) S(wx, y, wz, hole ? 0 : 23);
          else if (y > base) S(wx, y, wz, y <= SEA ? 17 : 0);
          else S(wx, y, wz, 193);
        }
        if (!shell && Math.abs(a) % 7 === 3 && b === 0) S(wx, base + 5 + tilt, wz, 31);
        if (!shell && a === 0 && b === 1) { for (let y = base + 5; y < base + 13; y++) S(wx, y, wz, 12); }
      }
    }
    for (const [gx, gz] of cells(PLANE_CELL, 16)) {
      if (hash2(s + 211, gx, gz) > 0.35) continue;
      const px = Math.floor((gx + 0.3 + hash2(s + 212, gx, gz) * 0.4) * PLANE_CELL), pz = Math.floor((gz + 0.3 + hash2(s + 213, gx, gz) * 0.4) * PLANE_CELL);
      const c = this.column(px, pz);
      if (![BIOME.SCRAPSEA, BIOME.DESERT, BIOME.MILITARY, BIOME.FOREST].includes(c.biome) || c.h <= SEA) continue;
      const y0 = c.h;
      for (let a = -10; a <= 10; a++) for (let b = -2; b <= 2; b++) for (let y = 0; y <= 3; y++) {
        const r = Math.hypot(b, y - 1.5);
        if (r > 2.3) continue;
        const broken = a > 6 && hash3(s + 214, a, y, b) < 0.5;
        S(px + a, y0 + y, pz + b, r > 1.3 && !broken ? 27 : 0);
      }
      for (let b = -9; b <= 9; b++) if (Math.abs(b) > 2 && !(b > 6 && hash2(s + 215, gx, b) < 0.5)) { S(px - 1, y0 + 1, pz + b, 27); S(px, y0 + 1, pz + b, 27); }
      for (let y = 2; y <= 5; y++) S(px + 10, y0 + y, pz, 27);
      S(px - 4, y0 + 1, pz, 31); S(px + 2, y0 + 1, pz, 198);
    }
  }

  // ---------- zona militar: recintos con alambrado, tanques y minas ----------
  military(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
    for (let gx = Math.floor((x0 - 16) / MIL_CELL); gx <= Math.floor((x0 + 32) / MIL_CELL); gx++) for (let gz = Math.floor((z0 - 16) / MIL_CELL); gz <= Math.floor((z0 + 32) / MIL_CELL); gz++) {
      const r = hash2(s + 221, gx, gz);
      const px = Math.floor((gx + 0.35 + hash2(s + 222, gx, gz) * 0.3) * MIL_CELL), pz = Math.floor((gz + 0.35 + hash2(s + 223, gx, gz) * 0.3) * MIL_CELL);
      const c = this.column(px, pz);
      if (c.biome !== BIOME.MILITARY) continue;
      const y0 = c.h;
      if (r < 0.5) {
        // recinto: alambrado, barracas de camuflaje, cajas y torre de vigilancia
        for (let wx = px - 10; wx <= px + 10; wx++) for (let wz = pz - 10; wz <= pz + 10; wz++) {
          const edge = Math.abs(wx - px) === 10 || Math.abs(wz - pz) === 10;
          S(wx, y0, wz, 8);
          for (let y = y0 + 1; y <= y0 + 6; y++) S(wx, y, wz, 0);
          if (edge && !(Math.abs(wx - px) < 2 && wz === pz + 10)) { S(wx, y0 + 1, wz, 194); S(wx, y0 + 2, wz, 194); }
        }
        for (let wx = px - 7; wx <= px - 1; wx++) for (let wz = pz - 7; wz <= pz - 2; wz++) for (let y = y0 + 1; y <= y0 + 4; y++) {
          const wall = wx === px - 7 || wx === px - 1 || wz === pz - 7 || wz === pz - 2;
          S(wx, y, wz, y === y0 + 4 ? 195 : wall && !(wz === pz - 2 && wx === px - 4 && y <= y0 + 2) ? 195 : 0);
        }
        S(px - 5, y0 + 1, pz - 5, 198); S(px - 3, y0 + 1, pz - 5, 198); S(px - 5, y0 + 1, pz - 3, 33);
        for (let y = y0 + 1; y <= y0 + 7; y++) { S(px + 6, y, pz + 6, 12); S(px + 8, y, pz + 6, 12); S(px + 6, y, pz + 8, 12); S(px + 8, y, pz + 8, 12); }
        for (let wx = px + 5; wx <= px + 9; wx++) for (let wz = pz + 5; wz <= pz + 9; wz++) S(wx, y0 + 8, wz, 60);
        S(px + 7, y0 + 9, pz + 7, 198);
        for (let y = y0 + 1; y <= y0 + 8; y++) S(px + 7, y, pz + 5, 63);
      } else if (r < 0.85) {
        // tanque abandonado
        const ax = hash2(s + 224, gx, gz) < 0.5;
        const B = (a, b, y, id) => S(ax ? px + a : px + b, y, ax ? pz + b : pz + a, id);
        for (let a = -3; a <= 3; a++) for (let b = -2; b <= 2; b++) { B(a, b, y0 + 1, Math.abs(b) === 2 ? 11 : 195); B(a, b, y0 + 2, Math.abs(b) === 2 ? 0 : 195); }
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) B(a, b, y0 + 3, 195);
        for (let a = 2; a <= 6; a++) B(a, 0, y0 + 3, 27);
        B(-3, 0, y0 + 3, 198);
      }
    }
  }

  // ---------- ciudad subterránea bajo algunas ciudades ----------
  undercityAt(gx, gz) {
    const s = this.seed;
    if (hash2(s + 231, gx, gz) > 0.6) return null;
    const x = Math.floor((gx + 0.35 + hash2(s + 232, gx, gz) * 0.3) * UNDER_CELL), z = Math.floor((gz + 0.35 + hash2(s + 233, gx, gz) * 0.3) * UNDER_CELL);
    const c = this.column(x, z);
    if (c.biome !== BIOME.CITY) return null;
    return { x, z, y: 12, top: c.h };
  }
  undercity(cx, cz, set) {
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const gx = Math.floor((x0 + 8) / UNDER_CELL), gz = Math.floor((z0 + 8) / UNDER_CELL);
    const U = this.undercityAt(gx, gz);
    if (!U) return;
    const { x: px, z: pz, y: fy } = U;
    if (Math.abs(x0 + 8 - px) > 60 || Math.abs(z0 + 8 - pz) > 45) return;
    const S = (wx, y, wz, id) => set(wx - x0, y, wz - z0, id);
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
      const wx = x0 + lx, wz = z0 + lz;
      const e = Math.hypot((wx - px) / 52, (wz - pz) / 38);
      if (e > 1) continue;
      const ceil = fy + 10 + Math.floor((1 - e) * 6);
      for (let y = fy; y <= ceil; y++) S(wx, y, wz, y === fy ? (((wx - px) % 12 + 12) % 12 < 3 || ((wz - pz) % 12 + 12) % 12 < 3 ? 11 : 9) : 0);
      S(wx, ceil + 1, wz, 2);
      // postes de luz en las esquinas
      const ux = ((wx - px) % 12 + 12) % 12, uz = ((wz - pz) % 12 + 12) % 12;
      if (ux === 1 && uz === 1) { for (let y = fy + 1; y <= fy + 4; y++) S(wx, y, wz, 85); S(wx, fy + 5, wz, 28); }
      // casitas de ladrillo en cada manzana
      if (ux >= 4 && ux <= 10 && uz >= 4 && uz <= 10 && e < 0.8) {
        const bi = hash2(s + 234, Math.floor((wx - px) / 12), Math.floor((wz - pz) / 12));
        if (bi < 0.7) {
          const wall = ux === 4 || ux === 10 || uz === 4 || uz === 10;
          for (let y = fy + 1; y <= fy + 4; y++) S(wx, y, wz, y === fy + 4 ? 13 : wall && !(uz === 4 && ux === 7 && y <= fy + 2) ? 13 : 0);
          if (ux === 5 && uz === 9) S(wx, fy + 1, wz, bi < 0.2 ? 38 : bi < 0.4 ? 31 : 33);
          if (ux === 9 && uz === 9) S(wx, fy + 1, wz, bi < 0.35 ? 86 : 24);
          if (ux === 7 && uz === 7) S(wx, fy + 4, wz, 28);
        } else if (ux === 7 && uz === 7) { S(wx, fy, wz, 199); S(wx + 1, fy + 1, wz, 106); S(wx - 1, fy + 1, wz, 86); S(wx, fy + 1, wz + 2, 108); }
      }
      // pozo de acceso con escalera hasta la superficie
      if (wx === px + 2 && wz === pz + 2) { for (let y = fy + 1; y <= U.top + 1; y++) S(wx, y, wz, 63); S(wx, U.top + 2, wz, 0); }
      if (wx === px + 2 && wz === pz + 1) for (let y = fy + 1; y <= U.top; y++) S(wx, y, wz, 9);
    }
  }

  // ---------- el abismo: niveles de salas talladas en roca, cada vez más difíciles ----------
  generateAbyss(cx, cz) {
    const data = new Uint8Array(CHUNK * CHUNK * HEIGHT);
    const x0 = cx * CHUNK, z0 = cz * CHUNK, s = this.seed;
    const I = (x, y, z) => x + (z << 4) + (y << 8);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y < HEIGHT - 1; y++) data[I(x, y, z)] = y === 0 ? 1 : 196;
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
      const wx = x0 + x, wz = z0 + z;
      const level = abyssLevel(wx);
      if (level < 1 || Math.abs(wz) > 110) continue;
      const lx = wx - (ABYSS_X + (level - 1) * ABYSS_W); // 0..255 dentro del nivel
      if (lx < 4 || lx > ABYSS_W - 4) continue;
      // salas en una grilla de 24×24, unidas por pasillos
      const gx = Math.floor((lx - 4) / 24), gz = Math.floor((wz + 108) / 24);
      const rx = (lx - 4) % 24, rz = (wz + 108) % 24;
      const seedL = s + level * 7919;
      const roomOn = gx === 0 && gz === 4 ? 1 : hash2(seedL, gx, gz) < 0.75 ? 1 : 0;
      const rw = 6 + Math.floor(hash2(seedL + 1, gx, gz) * 5);
      const inRoom = roomOn && Math.abs(rx - 12) <= rw && Math.abs(rz - 12) <= rw;
      const corrX = rz >= 11 && rz <= 13 && (hash2(seedL + 2, gx, gz) < 0.8 || gz === 4);
      const corrZ = rx >= 11 && rx <= 13 && hash2(seedL + 3, gx, gz) < 0.6;
      if (!(inRoom || corrX || corrZ)) continue;
      const ceil = inRoom ? 27 + Math.floor(hash2(seedL + 4, gx, gz) * 3) : 24;
      for (let y = 20; y <= ceil; y++) data[I(x, y, z)] = 0;
      data[I(x, 19, z)] = level % 3 === 0 ? 3 : 196;
      if (inRoom) {
        const r = hash3(seedL + 5, wx, 20, wz);
        if (rx === 12 && rz === 12) data[I(x, ceil, z)] = 28;
        else if (r < 0.006 + level * 0.001) data[I(x, 20, z)] = 200;
        else if (r < 0.012 + level * 0.002) data[I(x, 20, z)] = 160;
        else if (r < 0.016) data[I(x, 20, z)] = 21;
      }
    }
    // portales: vuelta al mundo en la sala de llegada, y bajada al nivel siguiente en la última columna
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
      const wx = x0 + x, wz = z0 + z, level = abyssLevel(wx);
      if (level < 1) continue;
      const lx = wx - (ABYSS_X + (level - 1) * ABYSS_W);
      // pasillo principal garantizado de punta a punta
      if (wz >= -1 && wz <= 1 && lx >= 4 && lx <= 4 + 9 * 24 + 12) for (let y = 20; y <= 23; y++) data[I(x, y, z)] = 0;
      if (lx === 6 && wz === 0) data[I(x, 20, z)] = 197;        // vuelta a la superficie
      if (lx === 4 + 9 * 24 + 12 && wz === 0) data[I(x, 20, z)] = 197; // bajada al nivel siguiente
    }
    return data;
  }

  findSpawn(pref) {
    if (pref === 'zoo') {
      const z = this.nearestZoo(0, 0);
      if (z) return { x: z.x + 0.5, y: z.y + 2, z: z.z + z.R - 10.5 };
    }
    if (pref === 'circuit') {
      const c = this.nearestCircuit(0, 0);
      if (c) return { x: c.x + 5.5, y: c.y + 1.5, z: c.z + c.R + TRACK_W + 2.5 };
    }
    if (pref === 'settlement') {
      for (let r = 0; r < 8; r++) for (let gx = -r; gx <= r; gx++) for (let gz = -r; gz <= r; gz++) {
        const st = this.settlementAt(gx, gz);
        if (st) return { x: st.x + 0.5, y: st.y + 1.5, z: st.z + 3.5 };
      }
    }
    if (this.type === 'brew') {
      // junto a una cervecería, si hay una cerca
      for (let r = 0; r < 6; r++) for (let gx = -r; gx <= r; gx++) for (let gz = -r; gz <= r; gz++) {
        const b = this.breweryAt(gx, gz);
        if (b) return { x: b.x + 0.5, y: b.y + 2, z: b.z + 7.5 };
      }
      for (let r = 0; r < 800; r += 8) for (let a = 0; a < 16; a++) {
        const wx = Math.round(Math.cos(a / 16 * Math.PI * 2) * r), wz = Math.round(Math.sin(a / 16 * Math.PI * 2) * r);
        const c = this.column(wx, wz);
        if (c.h > SEA + 1 && c.biome === BIOME.BREW) return { x: wx + 0.5, y: c.h + 2, z: wz + 0.5 };
      }
    }
    for (let r = 0; r < 400; r += 8) {
      for (let a = 0; a < 16; a++) {
        const wx = Math.round(Math.cos(a / 16 * Math.PI * 2) * r), wz = Math.round(Math.sin(a / 16 * Math.PI * 2) * r);
        const c = this.column(wx, wz);
        if (c.h > SEA + 1 && c.biome === BIOME.FOREST) return { x: wx + 0.5, y: c.h + 2, z: wz + 0.5 };
      }
    }
    const c = this.column(0, 0);
    return { x: 0.5, y: Math.max(c.h, SEA) + 2, z: 0.5 };
  }
}
