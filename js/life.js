// Vida v10.7: pueblos que crecen con el tiempo y con tu ayuda, personas que de noche se van a su casa,
// historias por zona (notas que se juntan como rompecabezas), aves en bandada y peces en el agua limpia.
import * as THREE from 'three';
import { SOLID, LIQ, doorId } from './blocks.js';
import { BIOME } from './worldgen.js';
import { STORIES } from './npc.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const SETTLE_CELL = 260;
const TOWN_NAMES = ['Esperanza', 'Nuevo Amanecer', 'La Tranquera', 'Villa Brote', 'Los Faroles', 'Refugio Sur', 'El Remanso', 'Puerto Seco'];
const STORY_BY_BIOME = { [BIOME.CITY]: 'ciudad', [BIOME.DESERT]: 'desierto', [BIOME.CRATER]: 'crater', [BIOME.MILITARY]: 'militar', [BIOME.SCRAPSEA]: 'chatarra', [BIOME.TUNDRA]: 'frio', [BIOME.SWAMP]: 'pantano', [BIOME.MUSHROOM]: 'pantano', [BIOME.FOREST]: 'bosque', [BIOME.OCEAN]: 'islas', [BIOME.ISLAND]: 'islas' };

export function createLife(ctx) {
  const { game: g, flash, sfx, scene, particles, uniforms } = ctx;
  const p = g.player, w = g.world, meta = g.meta;
  const api = {};
  const auth = () => ctx.isAuthority();
  meta.towns = meta.towns || {};
  meta.storyRead = meta.storyRead || [];

  // ---------- historias por zona ----------
  p.storyNote = (x, z) => {
    const b = g.gen.column(x, z).biome, id = STORY_BY_BIOME[b];
    const si = STORIES.findIndex((s) => s.id === id);
    if (si < 0) return null;
    const S = STORIES[si];
    // da la siguiente parte que todavía no tenés (si ya las tenés todas, cualquiera)
    for (let k = 0; k < S.parts.length; k++) { const n = 2000 + si * 10 + k; if (!meta.storyRead.includes(n)) return n; }
    return 2000 + si * 10 + Math.floor(Math.random() * S.parts.length);
  };
  function openStories() {
    ctx.openPanel('📜 Historias encontradas', (list) => {
      list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Cada zona tiene una historia en 4 partes. Las notas aparecen en cofres, cajas y ruinas de esa zona: juntalas todas.</p>');
      STORIES.forEach((S, si) => {
        const got = S.parts.map((_, k) => meta.storyRead.includes(2000 + si * 10 + k));
        const n = got.filter(Boolean).length;
        const box = document.createElement('div'); box.className = 'quest';
        box.innerHTML = `<p><b>${S.icon} ${esc(S.name)}</b> <small class="muted">${n}/4${n === 4 ? ' · ✔ completa' : ''}</small></p>` +
          S.parts.map(([t, body], k) => got[k] ? `<p style="font-size:16px"><b>${esc(t)}</b><br>${esc(body)}</p>` : '<p class="muted" style="font-size:15px">🔒 Parte sin encontrar</p>').join('');
        list.appendChild(box);
      });
    });
  }
  const prevEvent = api.event;
  api.event = (n, id) => {
    if (n === 'story') {
      const si = Math.floor((id - 2000) / 10), S = STORIES[si];
      const n2 = S.parts.filter((_, k) => meta.storyRead.includes(2000 + si * 10 + k)).length;
      flash(n2 === 4 ? `📜 ¡Completaste «${S.name}»!` : `📜 Parte ${n2}/4 de «${S.name}» (pausa → Mundo → Historias)`);
      if (n2 === 4) { p.onEvent('v10', 'historia'); p.give(353, 8); }
    }
    if (n === 'quest' || n === 'trade') helpTown(n === 'quest' ? 2 : 0.25);
    prevEvent?.(n, id);
  };

  // ---------- pueblos que crecen ----------
  function nearTowns() {
    const out = [];
    const gx0 = Math.floor(p.pos.x / SETTLE_CELL), gz0 = Math.floor(p.pos.z / SETTLE_CELL);
    if (meta.worldType !== 'magic' && meta.worldType !== 'islands') for (let gx = gx0 - 1; gx <= gx0 + 1; gx++) for (let gz = gz0 - 1; gz <= gz0 + 1; gz++) { const s = g.gen.settlementAt?.(gx, gz); if (s) out.push({ key: `s${gx},${gz}`, ...s }); }
    for (const k of meta.eldraSpawned || []) if (k.startsWith('village:')) { const [x, y, z] = k.slice(8).split(',').map(Number); out.push({ key: 'v' + x + ',' + z, x, y, z }); }
    return out;
  }
  function town(t) {
    let T = meta.towns[t.key];
    if (!T) { T = meta.towns[t.key] = { x: t.x, y: t.y, z: t.z, level: 0, prog: 0, name: TOWN_NAMES[Object.keys(meta.towns).length % TOWN_NAMES.length], houses: [] }; }
    return T;
  }
  function nearestTown(r = 90) {
    let best = null, bd = r;
    for (const T of Object.values(meta.towns)) { const d = Math.hypot(T.x - p.pos.x, T.z - p.pos.z); if (d < bd) { bd = d; best = T; } }
    return best;
  }
  function helpTown(n) { const T = nearestTown(); if (T) { T.prog += n; } }
  const need = (T) => 3 + T.level * 2;
  // casa nueva: busca un lugar plano alrededor del centro
  function buildHouse(T) {
    const magic = meta.worldType === 'magic';
    const wall = magic ? 209 : T.level % 2 ? 13 : 23, corner = magic ? 222 : 15, roof = magic ? 212 : 23;
    for (let tries = 0; tries < 24; tries++) {
      const a = Math.random() * Math.PI * 2, r = 14 + T.level * 4 + Math.random() * 8;
      const x0 = Math.floor(T.x + Math.cos(a) * r), z0 = Math.floor(T.z + Math.sin(a) * r);
      let ok = true, ys = [];
      for (let dx = 0; dx < 6 && ok; dx++) for (let dz = 0; dz < 6 && ok; dz++) {
        const y = g.mobs.surfaceY(x0 + dx, z0 + dz); if (y == null) { ok = false; break; }
        const b = w.getBlock(x0 + dx, y - 1, z0 + dz); if (LIQ[b]) ok = false; ys.push(y);
      }
      if (!ok) continue;
      const lo = Math.min(...ys), hi = Math.max(...ys);
      if (hi - lo > 2) continue;
      if (T.houses.some((h) => Math.abs(h[0] - x0) < 8 && Math.abs(h[1] - z0) < 8)) continue;
      const y = hi;
      for (let dx = 0; dx < 6; dx++) for (let dz = 0; dz < 6; dz++) {
        for (let k = lo; k < y; k++) w.setBlock(x0 + dx, k, z0 + dz, 4);
        w.setBlock(x0 + dx, y - 1, z0 + dz, 23);
        const edge = dx === 0 || dz === 0 || dx === 5 || dz === 5, cor = (dx === 0 || dx === 5) && (dz === 0 || dz === 5);
        for (let k = 0; k < 3; k++) w.setBlock(x0 + dx, y + k, z0 + dz, edge ? (cor ? corner : k === 1 && (dx === 2 || dz === 3) ? 14 : wall) : 0);
        w.setBlock(x0 + dx, y + 3, z0 + dz, roof);
      }
      for (let dx = 1; dx < 5; dx++) for (let dz = 1; dz < 5; dz++) w.setBlock(x0 + dx, y + 4, z0 + dz, roof);
      w.setBlock(x0 + 2, y + 5, z0 + 2, roof); w.setBlock(x0 + 3, y + 5, z0 + 3, roof);
      w.setBlock(x0 + 3, y, z0, doorId(0, 'x', 0)); w.setBlock(x0 + 3, y + 1, z0, doorId(0, 'x', 1));
      w.setBlock(x0 + 1, y, z0 + 4, 33); w.setBlock(x0 + 4, y + 2, z0 + 4, 26); w.setBlock(x0 + 4, y, z0 + 1, 38);
      T.houses.push([x0, z0]);
      const s = g.mobs.add(magic ? 'halfling' : 'settler', x0 + 2.5, y + 0.1, z0 + 2.5); s.keep = true; s.home = s.pos.clone();
      particles.burst(x0 + 3, y + 4, z0 + 3, [255, 220, 140], 20, 1.2);
      return true;
    }
    return false;
  }
  let townAcc = 3, lastDay = meta.nights || 0;
  function townTick(dt) {
    townAcc += dt; if (townAcc < 5) return; townAcc = 0;
    for (const t of nearTowns()) { const T = town(t); if (!T.seen && Math.hypot(T.x - p.pos.x, T.z - p.pos.z) < 40) { T.seen = true; flash(`🏘 Llegaste a ${T.name}. Si lo ayudás (misiones, comercio) y pasan los días, el pueblo crece.`); } }
    const day = meta.nights || 0;
    if (day !== lastDay) { lastDay = day; for (const T of Object.values(meta.towns)) if (T.seen) T.prog += 1; }
    if (!auth()) return;
    for (const T of Object.values(meta.towns)) {
      if (T.level >= 6 || T.prog < need(T)) continue;
      if (Math.hypot(T.x - p.pos.x, T.z - p.pos.z) > 70) continue; // se construye cuando estás cerca (sectores cargados)
      if (buildHouse(T)) { T.prog -= need(T); T.level++; flash(`🏘 ¡${T.name} creció! Hay una casa nueva y un vecino más (nivel ${T.level}).`); sfx.achievement?.(); p.onEvent('v10', 'pueblo'); }
    }
  }
  api.markers = () => Object.values(meta.towns).filter((T) => T.seen).map((T) => ({ x: T.x, z: T.z, color: '#9cff7a', kind: 'poi', label: `🏘 ${T.name} (${T.level})` }));

  // ---------- rutina: de noche cada uno a su casa ----------
  const HOMEBODIES = new Set(['settler', 'halfling', 'dwarf', 'elf', 'leader']);
  let routineAcc = 0;
  function routineTick(dt) {
    routineAcc += dt; if (routineAcc < 1.5) return; routineAcc = 0;
    const night = uniforms.daylight.value < 0.3;
    for (const m of g.mobs.list.values()) {
      if (!HOMEBODIES.has(m.type) || !m.home) continue;
      if (night) {
        m.goal = m.home;
        if (m.pos.distanceTo(m.home) < 1.6 && Math.random() < 0.3 && m.pos.distanceTo(p.pos) < 24) particles.burst(m.pos.x - 0.5, m.pos.y + m.def.h + 0.2, m.pos.z - 0.5, [200, 210, 255], 1, 0.15);
      } else if (m.goal === m.home) m.goal = null;
    }
  }

  // ---------- aves en bandada ----------
  const flocks = [];
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2a2622, side: THREE.DoubleSide });
  const wing = (s) => { const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, s * 0.5, 0, 0.18, 0, 0, 0.32]), 3)); return g2; };
  const wingR = wing(1), wingL = wing(-1);
  function makeFlock() {
    const grp = new THREE.Group(), n = 5 + Math.floor(Math.random() * 6), birds = [];
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group(); const l = new THREE.Mesh(wingL, birdMat), r = new THREE.Mesh(wingR, birdMat);
      b.add(l, r); b.userData.l = l; b.userData.r = r; b.scale.setScalar(1.3);
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      b.position.set(side * row * 1.4, Math.random() * 0.4, row * 1.6); b.userData.ph = Math.random() * 6;
      grp.add(b); birds.push(b);
    }
    const a = Math.random() * Math.PI * 2, d = 90;
    grp.position.set(p.pos.x - Math.cos(a) * d, p.pos.y + 28 + Math.random() * 20, p.pos.z - Math.sin(a) * d);
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    grp.rotation.y = Math.atan2(-dir.x, -dir.z);
    scene.add(grp);
    return { grp, birds, dir, speed: 6 + Math.random() * 3 };
  }
  function birdsTick(dt) {
    const b = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
    const ok = uniforms.daylight.value > 0.5 && ![BIOME.CRATER, BIOME.ASHEN, BIOME.ABYSS].includes(b) && !(g.weather?.k > 0.5) && !ctx.settings.battery;
    if (ok && flocks.length < 2 && Math.random() < dt * 0.05) flocks.push(makeFlock());
    const t = performance.now() / 1000;
    for (const f of [...flocks]) {
      f.grp.position.addScaledVector(f.dir, f.speed * dt);
      for (const bd of f.birds) { const s = Math.sin(t * 9 + bd.userData.ph); bd.userData.l.rotation.z = -s * 0.6; bd.userData.r.rotation.z = s * 0.6; }
      if (f.grp.position.distanceTo(p.pos) > 160) { scene.remove(f.grp); flocks.splice(flocks.indexOf(f), 1); }
    }
  }

  // ---------- peces en el agua limpia ----------
  const fish = [], fishGeo = new THREE.BoxGeometry(0.28, 0.12, 0.12);
  const FISH_COLS = [0xf0a030, 0x5ab0e0, 0xe05a8a, 0xf0e070, 0x9a9aa0];
  let fishAcc = 0;
  function fishTick(dt) {
    fishAcc += dt;
    if (fishAcc > 1.5 && fish.length < 18 && !ctx.settings.battery) {
      fishAcc = 0;
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 12;
      const x = Math.floor(p.pos.x + Math.cos(a) * r), z = Math.floor(p.pos.z + Math.sin(a) * r);
      for (let y = Math.floor(p.pos.y) + 4; y > Math.floor(p.pos.y) - 12; y--) {
        const bb = w.getBlock(x, y, z), below = w.getBlock(x, y - 2, z);
        if (LIQ[bb] === 2 && LIQ[below] === 2) {
          const col = FISH_COLS[Math.floor(Math.random() * FISH_COLS.length)], n = 3 + Math.floor(Math.random() * 4);
          for (let i = 0; i < n; i++) {
            const m = new THREE.Mesh(fishGeo, new THREE.MeshLambertMaterial({ color: col }));
            m.position.set(x + 0.5 + (Math.random() - 0.5), y - 1 + Math.random(), z + 0.5 + (Math.random() - 0.5));
            m.userData = { v: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(), t: 20 + Math.random() * 20 };
            scene.add(m); fish.push(m);
          }
          break;
        }
      }
    }
    for (const m of [...fish]) {
      const u = m.userData; u.t -= dt;
      const away = m.position.distanceTo(p.pos) < 2.5;
      if (away) u.v.copy(m.position).sub(p.pos).setY(0).normalize();
      else if (Math.random() < dt * 0.6) u.v.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 1.5);
      const next = m.position.clone().addScaledVector(u.v, (away ? 3.5 : 1.1) * dt);
      if (LIQ[w.getBlock(Math.floor(next.x), Math.floor(next.y), Math.floor(next.z))] === 2) m.position.copy(next); else u.v.negate();
      m.rotation.y = Math.atan2(-u.v.z, u.v.x);
      m.position.y += Math.sin(performance.now() / 300 + m.id) * 0.002;
      if (u.t <= 0 || m.position.distanceTo(p.pos) > 30) { scene.remove(m); m.material.dispose(); fish.splice(fish.indexOf(m), 1); }
    }
  }

  // ---------- botones ----------
  const wb = document.querySelector('#worldBtns');
  const bs = document.createElement('button'); bs.textContent = '📜 Historias';
  bs.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); openStories(); };
  wb?.appendChild(bs);
  api.update = (dt) => { townTick(dt); routineTick(dt); birdsTick(dt); fishTick(dt); };
  api.dispose = () => { bs.remove(); for (const f of flocks) scene.remove(f.grp); for (const m of fish) scene.remove(m); p.storyNote = null; };
  return api;
}
