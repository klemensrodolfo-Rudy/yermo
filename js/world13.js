// Mundo v13.1: faros que giran su haz de noche, el salar que se inunda con la lluvia y queda como
// espejo, y caravanas de comerciantes que viajan entre lugares (y se pueden escoltar por una paga).
import * as THREE from 'three';
import { SEA } from './blocks.js';
import { BIOME } from './worldgen.js';

const LAMP = 1146;

export function createWorld13(ctx) {
  const { game: g, flash, sfx } = ctx;
  const p = g.player, w = g.world;
  const api = {};
  const auth = () => ctx.isAuthority();

  // ---------- faros ----------
  const lamps = new Map(); // "x,z" -> {x, y, z}
  function scan(c) {
    const d = c.data; if (!d) return;
    for (let i = 0; i < d.length; i++) if (d[i] === LAMP) { const x = c.cx * 16 + (i & 15), z = c.cz * 16 + ((i >> 4) & 15), y = i >> 8; const k = x + ',' + z; const o = lamps.get(k); if (!o || y > o.y) lamps.set(k, { x, y, z }); }
  }
  const prevReady = w.onChunkReady;
  w.onChunkReady = (c) => { prevReady?.(c); scan(c); };
  for (const c of w.chunks.values()) if (c.state === 'ready') scan(c);
  const beamGeo = new THREE.CylinderGeometry(3.2, 0.35, 46, 16, 1, true); beamGeo.translate(0, 23, 0); beamGeo.rotateX(Math.PI / 2);
  // degradé: fuerte junto a la lámpara y se desvanece hacia la punta
  const grad = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,244,210,0)'); gr.addColorStop(0.55, 'rgba(255,244,210,0.25)'); gr.addColorStop(1, 'rgba(255,244,210,1)'); x.fillStyle = gr; x.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(c); })();
  const beamMat = new THREE.MeshBasicMaterial({ map: grad, color: 0xfff4d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beams = new Map();
  function tickLamps(dt) {
    const night = 1 - Math.min(1, Math.max(0, (ctx.uniforms.daylight.value - 0.25) / 0.35));
    beamMat.opacity = night * 0.45;
    for (const [k, L] of lamps) {
      const near = (L.x - p.pos.x) ** 2 + (L.z - p.pos.z) ** 2 < 200 * 200 && w.getBlock(L.x, L.y, L.z) === LAMP;
      let b = beams.get(k);
      if (!near || night < 0.05) { if (b) b.visible = false; if (!near && w.getBlock(L.x, L.y, L.z) >= 0 && w.getBlock(L.x, L.y, L.z) !== LAMP) lamps.delete(k); continue; }
      if (!b) { b = new THREE.Group(); for (const s of [0, Math.PI]) { const m = new THREE.Mesh(beamGeo, beamMat); m.rotation.y = s; b.add(m); } b.position.set(L.x + 0.5, L.y + 0.5, L.z + 0.5); ctx.scene.add(b); beams.set(k, b); }
      b.visible = true; b.rotation.y += dt * 0.7;
    }
  }

  // ---------- salar inundado: una lámina de agua que refleja el cielo ----------
  let flood = 0;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  sheet.rotation.x = -Math.PI / 2; sheet.renderOrder = 2; sheet.visible = false; ctx.scene.add(sheet);
  let biomeAcc = 0, inSalt = false;
  function tickFlood(dt) {
    biomeAcc += dt; if (biomeAcc > 1) { biomeAcc = 0; inSalt = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome === BIOME.SALT; }
    const raining = g.weather && (g.weather.type === 'rain' || g.weather.type === 'storm') && g.weather.k > 0.3;
    flood = Math.max(0, Math.min(1, flood + (raining ? dt / 40 : -dt / 300)));
    sheet.visible = inSalt && flood > 0.02;
    if (!sheet.visible) return;
    sheet.position.set(Math.round(p.pos.x), SEA + 2.55, Math.round(p.pos.z));
    sheet.material.color.copy(ctx.uniforms.skyHorC.value).lerp(ctx.uniforms.skyTopC.value, 0.45).multiplyScalar(1.15);
    sheet.material.opacity = flood * 0.62;
  }

  // ---------- caravanas ----------
  let car = null, nextCar = 240 + Math.random() * 240;
  const surf = (x, z) => g.mobs.surfaceY(Math.floor(x), Math.floor(z));
  function landAt(x, z) { const c = g.gen.column(Math.floor(x), Math.floor(z)); return c.h > SEA && c.biome !== BIOME.CITY && c.biome !== BIOME.ABYSS && c.biome !== BIOME.OCEAN; }
  function spawnCaravan() {
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, sx = p.pos.x + Math.cos(a) * 34, sz = p.pos.z + Math.sin(a) * 34;
      const b = a + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), tx = sx + Math.cos(b) * 190, tz = sz + Math.sin(b) * 190;
      if (!landAt(sx, sz) || !landAt(tx, tz)) continue;
      const sy = surf(sx, sz); if (sy == null) continue;
      const lead = g.mobs.add('trader', sx, sy, sz); if (!lead) return;
      const goats = [1, 2].map((i) => g.mobs.add('goat', sx - Math.cos(b) * 2 * i, sy, sz - Math.sin(b) * 2 * i)).filter(Boolean);
      for (const m of [lead, ...goats]) { m.keep = true; m.tamed = true; m.caravan = true; }
      car = { lead, goats, to: [tx, tz], from: [sx, sz], dist0: 190, accepted: false, away: 0, ambushed: false, done: false };
      lead.puppet = (m, dt) => moveTo(m, dt, car.to[0], car.to[1], 1.6);
      goats.forEach((gm, i) => { gm.puppet = (m, dt) => { const L = car?.lead; if (!L) return; const back = i === 0 ? car.lead : goats[i - 1]; const dx = back.pos.x - m.pos.x, dz = back.pos.z - m.pos.z; if (Math.hypot(dx, dz) > 2.2) moveTo(m, dt, back.pos.x, back.pos.z, 1.7); else m.walking = false; }; });
      if (Math.hypot(sx - p.pos.x, sz - p.pos.z) < 60) flash('🐐 Pasa una caravana de comerciantes cerca: hablá con el que va adelante');
      return;
    }
  }
  function moveTo(m, dt, tx, tz, speed) {
    const dx = tx - m.pos.x, dz = tz - m.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.5) { m.walking = false; return; }
    const st = Math.min(d, speed * dt);
    m.pos.x += dx / d * st; m.pos.z += dz / d * st;
    const y = surf(m.pos.x, m.pos.z); if (y != null) m.pos.y += (y - m.pos.y) * Math.min(1, dt * 8);
    m.yaw = Math.atan2(-dx, -dz); m.walking = true;
  }
  function endCaravan(msg) {
    if (!car) return;
    if (msg) flash(msg);
    for (const m of [car.lead, ...car.goats]) if (m && g.mobs.list.has(m.id)) { m.puppet = null; m.keep = false; setTimeout(() => { if (g.mobs.list.has(m.id) && m.pos.distanceTo(p.pos) > 30) g.mobs.remove(m); }, 20000); }
    car = null; nextCar = 420 + Math.random() * 420;
  }
  function tickCaravan(dt) {
    if (!auth()) return;
    if (!car) {
      nextCar -= dt;
      if (nextCar <= 0) { nextCar = 60; if (ctx.uniforms.daylight.value > 0.5 && !p.inWater) spawnCaravan(); }
      return;
    }
    const L = car.lead;
    if (!g.mobs.list.has(L.id) || L.dying) { endCaravan(car.accepted ? '💀 Atacaron la caravana. No llegó a destino.' : null); return; }
    const left = Math.hypot(car.to[0] - L.pos.x, car.to[1] - L.pos.z), dp = L.pos.distanceTo(p.pos);
    if (car.accepted) {
      car.away = dp > 45 ? car.away + dt : 0;
      if (car.away > 25) { endCaravan('🐐 Te alejaste mucho: la caravana siguió sin escolta.'); return; }
      // emboscada a mitad de camino
      if (!car.ambushed && left < car.dist0 * 0.55) {
        car.ambushed = true;
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, x = L.pos.x + Math.cos(a) * 12, z = L.pos.z + Math.sin(a) * 12, y = surf(x, z); if (y != null) g.mobs.add(ctx.uniforms.daylight.value > 0.5 ? 'wolf' : 'ghoul', x, y, z); }
        flash('⚔ ¡Emboscada! Defendé la caravana');
      }
    }
    if (left < 2) {
      if (car.accepted && dp < 45) {
        const extra = [442, 440, 416, 441][Math.floor(Math.random() * 4)];
        p.give(353, 25); p.give(extra, extra === 416 ? 4 : 1); sfx.achievement?.();
        p.onEvent('v13', 'escolta'); p.onEvent('quest');
        endCaravan('💰 ¡La caravana llegó sana y salva! Te pagaron 25 fichas y un regalo.');
      } else endCaravan(null);
    }
  }
  api.onInteractMob = (m) => {
    if (!car || m !== car.lead) return false;
    if (car.accepted) { flash(`🐐 Faltan ${Math.round(Math.hypot(car.to[0] - m.pos.x, car.to[1] - m.pos.z))} bloques. ¡No te alejes!`); return true; }
    ctx.openPanel('🐐 Caravana de comerciantes', (list) => {
      list.insertAdjacentHTML('beforeend', `<p>Vamos a un pueblo a ${Math.round(Math.hypot(car.to[0] - m.pos.x, car.to[1] - m.pos.z))} bloques. Por el camino hay bandidos y bichos… ¿nos acompañás?</p><p class="muted" style="font-size:15px">Si llegamos con vos cerca, te pagamos <b>25 fichas</b> y un regalo. Si te alejás mucho, seguimos solos.</p>`);
      const b = document.createElement('button'); b.className = 'primary'; b.textContent = '🛡 Escoltar la caravana';
      b.onclick = () => { car.accepted = true; ctx.closeInventory(); flash('🛡 ¡Vamos! Quedate cerca de la caravana hasta que llegue'); };
      list.appendChild(b);
    });
    return true;
  };
  api.markers = () => (car ? [{ x: car.lead.pos.x, z: car.lead.pos.z, color: car.accepted ? '#9cff3a' : '#ffd84a', kind: 'npc', label: '🐐 Caravana', cat: 'gente' }, ...(car.accepted ? [{ x: car.to[0], z: car.to[1], color: '#9cff3a', kind: 'poi', label: '🏁 Destino', cat: 'marcas' }] : [])] : []);

  api.update = (dt) => { tickLamps(dt); tickFlood(dt); tickCaravan(dt); };
  api.dispose = () => {
    w.onChunkReady = prevReady;
    for (const b of beams.values()) ctx.scene.remove(b);
    ctx.scene.remove(sheet); sheet.geometry.dispose(); sheet.material.dispose(); beamGeo.dispose(); beamMat.dispose(); grad.dispose();
    if (car) for (const m of [car.lead, ...car.goats]) if (m) m.puppet = null;
  };
  return api;
}
