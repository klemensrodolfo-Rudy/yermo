// Naturaleza v9.6: plantines que crecen solos, crías de animales domesticados, mascotas que suben de nivel,
// clima extremo por bioma (tormenta de arena, niebla espesa) y mareas en el archipiélago.
import * as THREE from 'three';
import { SOLID, SEA } from './blocks.js';
import { BIOME } from './worldgen.js';
import { TAME } from './features2.js';

const PET_LV = [0, 30, 90, 200, 400]; // experiencia para cada nivel (1 a 5)
export const PET_TRICKS = ['', 'Te sigue y te defiende', 'Trae lo que está tirado', 'Gruñe si viene peligro', 'Pega más fuerte', 'Mejor amigo: más vida y collar dorado'];
const COLLARS = { Rojo: 0xc8302a, Azul: 0x2a5ac8, Verde: 0x3a9a3a, Violeta: 0x8a3ac8, Rosa: 0xe86ab0, Negro: 0x222222, Dorado: 0xe8c040 };

export function createNature(ctx) {
  const { game: g, net, sfx, flash, scene, uniforms, skyUniforms, particles } = ctx;
  const p = g.player, w = g.world, meta = g.meta, sim = g.sim, inv = g.inv;
  const api = {};
  const auth = () => ctx.isAuthority();
  const k3 = (x, y, z) => x + ',' + y + ',' + z;
  meta.saplings = meta.saplings || [];

  // ---------- plantines ----------
  const prevPlace = p.onPlace;
  p.onPlace = (x, y, z, id) => {
    if (id === 248) { const k = k3(x, y, z); if (!meta.saplings.includes(k)) meta.saplings.push(k); if (meta.saplings.length > 400) meta.saplings.shift(); flash('🌱 Plantaste un árbol: si tiene lugar, en unos minutos crece solo'); }
    prevPlace?.(x, y, z, id);
  };
  function growTree(x, y, z) {
    const type = meta.worldType === 'islands' ? 'palm' : 'oak';
    const H = type === 'palm' ? 5 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 3);
    for (let k = 1; k <= H + 2; k++) if (SOLID[w.getBlock(x, y + k, z)]) return false; // no hay lugar
    w.setBlock(x, y, z, type === 'palm' ? 232 : 222);
    for (let k = 1; k < H; k++) w.setBlock(x, y + k, z, type === 'palm' ? 232 : 222);
    const leaf = type === 'palm' ? 233 : 206, ty = y + H;
    const L = (a, b, c) => { if (w.getBlock(a, b, c) === 0) w.setBlock(a, b, c, leaf); };
    if (type === 'palm') {
      L(x, ty, z);
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { L(x + ax, ty, z + az); L(x + ax * 2, ty, z + az * 2); L(x + ax * 3, ty - 1, z + az * 3); }
    } else {
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = -1; dy <= 1; dy++) {
        if (Math.abs(dx) + Math.abs(dz) + Math.max(0, dy) * 2 > 3 || Math.random() < 0.08) continue;
        L(x + dx, ty + dy, z + dz);
      }
      L(x, ty + 2, z);
    }
    particles.burst(x, y + 1, z, [120, 220, 90], 14, 0.8);
    return true;
  }
  let saplingAcc = 0;
  function saplingTick() {
    for (const k of [...meta.saplings]) {
      const [x, y, z] = k.split(',').map(Number), b = w.getBlock(x, y, z);
      if (b === -1) continue; // chunk sin cargar
      if (b !== 248) { meta.saplings.splice(meta.saplings.indexOf(k), 1); continue; }
      if (Math.random() < 0.06 && growTree(x, y, z)) { meta.saplings.splice(meta.saplings.indexOf(k), 1); if (Math.hypot(x - p.pos.x, z - p.pos.z) < 30) flash('🌳 ¡Creció un árbol!'); p.onEvent('v9', 'arbol'); }
    }
  }

  // ---------- crías ----------
  const FOOD = { dog: [271, 272], wolf: [271, 272] };
  for (const [t, d] of Object.entries(TAME)) FOOD[t] = d.food;
  function setBaby(m, on) {
    m.baby = on;
    m.group.scale.setScalar(on ? 0.55 : 1);
  }
  function tryBreed(m) {
    for (const o of g.mobs.list.values()) {
      if (o === m || o.type !== m.type || !(o.loveT > 0) || o.baby || o.pos.distanceTo(m.pos) > 6) continue;
      m.loveT = 0; o.loveT = 0;
      const b = g.mobs.add(m.type, (m.pos.x + o.pos.x) / 2, Math.max(m.pos.y, o.pos.y) + 0.2, (m.pos.z + o.pos.z) / 2);
      b.keep = true; b.tamed = m.tamed; b.owner = m.owner; b.growT = 300; setBaby(b, true);
      particles.burst(b.pos.x - 0.5, b.pos.y + 0.8, b.pos.z - 0.5, [255, 120, 160], 16, 0.6);
      flash(`🍼 ¡Nació una cría de ${m.def.name.toLowerCase()}!`); sfx.craft?.(); p.onEvent('v9', 'cria');
      return;
    }
  }

  // ---------- mascotas ----------
  const petLevel = (m) => { let l = 1; for (let i = 1; i < PET_LV.length; i++) if ((m.petXp || 0) >= PET_LV[i]) l = i + 1; return l; };
  function petLabel(m) {
    if (!m.petName) { if (m.petSpr) { m.group.remove(m.petSpr); m.petSpr = null; } return; }
    const txt = `${m.petName} ★${petLevel(m)}`;
    if (m.petSpr?.userData.txt === txt) return;
    if (m.petSpr) { m.group.remove(m.petSpr); m.petSpr.material.map.dispose(); m.petSpr.material.dispose(); }
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
    const c2 = cv.getContext('2d'); c2.fillStyle = 'rgba(0,0,0,0.5)'; c2.fillRect(0, 0, 256, 48);
    c2.fillStyle = '#ffe08a'; c2.font = '32px VT323, monospace'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(txt, 128, 25);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    spr.scale.set(1.4, 0.26, 1); spr.position.y = m.def.h + 0.45; spr.userData.txt = txt;
    m.group.add(spr); m.petSpr = spr;
  }
  function paintCollar(m) {
    const col = m.petLvl >= 5 && !m.collar ? COLLARS.Dorado : COLLARS[m.collar] ?? null;
    if (col != null && m.parts?.collar) m.parts.collar.material.color.setHex(col);
  }
  g.mobs.onPetHit = (m) => { m.petXp = (m.petXp || 0) + 4; };
  function openPet(m) {
    ctx.openPanel(`Tu ${m.def.name.toLowerCase()}`, (list) => {
      const lv = petLevel(m), next = PET_LV[lv];
      list.insertAdjacentHTML('beforeend', `<p><b>${m.petName || 'Sin nombre'}</b> · nivel ${lv}${next ? ` (${Math.floor(m.petXp || 0)}/${next} de experiencia)` : ' (máximo)'}</p>
        <p class="muted" style="font-size:15px">Gana experiencia acompañándote y peleando a tu lado.<br>${PET_TRICKS.slice(1).map((t, i) => `${i + 1 <= lv ? '✔' : '🔒'} Nivel ${i + 1}: ${t}`).join('<br>')}</p>
        <label>Nombre</label><div class="row2"><input class="pname" maxlength="16" value="${(m.petName || '').replace(/"/g, '')}"><button class="pok">Poner nombre</button></div>
        ${m.parts?.collar ? `<label>Collar</label><div class="pcol" style="display:flex;gap:4px;flex-wrap:wrap"></div>` : ''}
        <div class="row2" style="margin-top:8px"><button class="psit">${m.sit ? 'Que me siga' : 'Que se quede acá'}</button></div>`);
      const $ = (s) => list.querySelector(s);
      $('.pname').addEventListener('keydown', (e) => e.stopPropagation());
      $('.pok').onclick = () => { m.petName = $('.pname').value.trim().slice(0, 16) || null; petLabel(m); flash(m.petName ? `Ahora se llama ${m.petName}` : 'Le sacaste el nombre'); p.onEvent('v9', 'nombre'); };
      $('.psit').onclick = () => { m.sit = !m.sit; ctx.closeInventory(); };
      const pc = $('.pcol');
      if (pc) for (const [n, c] of Object.entries(COLLARS)) {
        if (n === 'Dorado' && lv < 5) continue;
        const b = document.createElement('button'); b.title = n; b.style.cssText = `width:30px;height:30px;padding:0;margin:0;background:#${c.toString(16).padStart(6, '0')}`;
        b.onclick = () => { m.collar = n; paintCollar(m); };
        pc.appendChild(b);
      }
    });
  }
  api.onInteractMob = (m, hand) => {
    const mine = m.owner === p.name, tamed = mine || m.tamed;
    if (!tamed) return false;
    // comida: modo amor (crías)
    if (hand && FOOD[m.type]?.includes(hand.id) && !m.baby) {
      if (m.loveT > 0) { flash('Ya está con ganas… buscale pareja cerca'); return true; }
      inv.consumeHand(); m.loveT = 30;
      particles.burst(m.pos.x - 0.5, m.pos.y + m.def.h, m.pos.z - 0.5, [255, 90, 140], 8, 0.4);
      if (mine) m.petXp = (m.petXp || 0) + 2;
      tryBreed(m);
      return true;
    }
    if (mine && !hand) { openPet(m); return true; }
    return false;
  };

  // ---------- clima extremo y mareas ----------
  let storm = 0, fog = 0, local = null, localT = 60, lastBiome = -1;
  const sandN = 500, sandPos = new Float32Array(sandN * 3);
  const sandGeo = new THREE.BufferGeometry(); sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPos, 3));
  const sand = new THREE.Points(sandGeo, new THREE.PointsMaterial({ color: 0xd8b070, size: 0.12, transparent: true, opacity: 0, depthWrite: false }));
  sand.frustumCulled = false; scene.add(sand);
  for (let i = 0; i < sandN; i++) sandPos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.3) * 12, (Math.random() - 0.5) * 40], i * 3);
  const isl = meta.worldType === 'islands';
  const tide = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshBasicMaterial({ color: 0x3a8ab0, transparent: true, opacity: 0.55, depthWrite: false }));
  tide.rotation.x = -Math.PI / 2; tide.visible = isl; tide.renderOrder = 2; scene.add(tide);
  api.tideLevel = 0;
  const C = (h) => new THREE.Color(h);
  function weatherTick(dt) {
    const biome = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
    const desert = biome === BIOME.DESERT || biome === BIOME.ASHEN || biome === BIOME.CANYON, marsh = biome === BIOME.SWAMP || biome === BIOME.MIRE;
    // cada tanto se arma (o se pasa) un fenómeno del bioma
    localT -= dt;
    if (localT <= 0) { localT = 60 + Math.random() * 120; local = Math.random() < 0.4 ? 'on' : null; }
    const night = g.time > 0.75 || g.time < 0.3;
    const wantStorm = desert && (local || g.weather.type === 'ash') ? 1 : 0;
    const wantFog = marsh && (local || night) ? 1 : 0;
    storm += Math.sign(wantStorm - storm) * Math.min(Math.abs(wantStorm - storm), dt / 8);
    fog += Math.sign(wantFog - fog) * Math.min(Math.abs(wantFog - fog), dt / 10);
    api.storm = storm;
    if (biome !== lastBiome) { if (wantStorm && storm < 0.1) flash('🌪 Se viene una tormenta de arena'); if (wantFog && fog < 0.1 && marsh) flash('🌫 Se levanta una niebla espesa'); lastBiome = biome; }
    const tint = (c, k, near, far) => {
      if (k <= 0.001) return;
      uniforms.fogColor.value.lerp(c, k);
      skyUniforms.horizon.value.lerp(c, k); skyUniforms.top.value.lerp(c.clone().multiplyScalar(0.9), k * 0.8);
      uniforms.fogNear.value = THREE.MathUtils.lerp(uniforms.fogNear.value, near, k);
      uniforms.fogFar.value = THREE.MathUtils.lerp(uniforms.fogFar.value, far, k);
    };
    const day = Math.max(0.25, uniforms.daylight.value);
    tint(C(0xc8a060).multiplyScalar(day), storm, 5, 34);
    tint(C(0x8a9a8c).multiplyScalar(day), fog, 3, 20);
    // arena volando
    sand.material.opacity = storm * 0.8; sand.visible = storm > 0.02;
    if (sand.visible) {
      for (let i = 0; i < sandN; i++) {
        const W = g.wind || { x: 1, z: 0.3, k: 1 }, wl = Math.max(0.3, Math.hypot(W.x, W.z));
        const o = i * 3; let x = sandPos[o] + dt * 14 * W.x / wl, y = sandPos[o + 1] + Math.sin(i + performance.now() / 300) * dt, z = sandPos[o + 2] + dt * 14 * W.z / wl;
        if (x - p.pos.x > 20) x -= 40; if (x - p.pos.x < -20) x += 40; if (z - p.pos.z > 20) z -= 40; if (z - p.pos.z < -20) z += 40;
        if (y - p.pos.y > 10) y -= 13; if (y - p.pos.y < -3) y += 13;
        sandPos[o] = x; sandPos[o + 1] = y; sandPos[o + 2] = z;
      }
      sandGeo.attributes.position.needsUpdate = true;
    }
    // marea: sube y baja dos veces por día
    if (isl) {
      api.tideLevel = (Math.sin(g.time * Math.PI * 4) + 1) / 2;
      tide.position.set(Math.round(p.pos.x), SEA + 0.86 + api.tideLevel * 0.95, Math.round(p.pos.z));
      tide.material.color.setRGB(0.18, 0.45, 0.6).multiplyScalar(Math.max(0.25, uniforms.daylight.value));
      tide.visible = !p.headInWater;
    }
  }

  // ---------- bucle ----------
  let petAcc = 0, slowAcc = 0;
  api.update = (dt) => {
    weatherTick(dt);
    petAcc += dt;
    if (petAcc > 1) {
      petAcc = 0;
      for (const m of g.mobs.list.values()) {
        if (m.loveT > 0) { m.loveT -= 1; if (Math.random() < 0.5) particles.burst(m.pos.x - 0.5, m.pos.y + m.def.h, m.pos.z - 0.5, [255, 90, 140], 2, 0.2); if (auth()) tryBreed(m); }
        if (m.baby && (m.group.scale.x > 0.6 || m.group.scale.x < 0.5)) setBaby(m, true);
        if (m.baby && auth()) { m.growT = (m.growT ?? 300) - 1; if (m.growT <= 0) setBaby(m, false); }
        if (m.owner !== p.name) continue;
        // mascota: experiencia por acompañarte
        if (m.pos.distanceTo(p.pos) < 12 && !m.sit) m.petXp = (m.petXp || 0) + 0.1;
        const lv = petLevel(m);
        if (lv !== m.petLvl) {
          if (m.petLvl && lv > m.petLvl) { flash(`🐾 ¡${m.petName || 'Tu mascota'} subió a nivel ${lv}! ${PET_TRICKS[lv]}`); sfx.achievement?.(); if (lv >= 5) p.onEvent('v9', 'mejoramigo'); }
          m.petLvl = lv; m.hp = Math.max(m.hp, m.def.hp * (1 + (lv - 1) * 0.25));
          paintCollar(m);
        }
        m.petDmg = 1 + (lv >= 4 ? 0.6 : 0) + (lv - 1) * 0.1;
        petLabel(m);
        // nivel 2: trae lo que está tirado
        if (lv >= 2 && auth()) for (const d of g.drops.list.values()) if (d.age > 1.5 && d.pos.distanceTo(m.pos) < 5 && d.pos.distanceTo(p.pos) > 1.5) { d.pos.lerp(p.pos, 0.35); d.vel.set(0, 0, 0); }
        // nivel 3: avisa si viene peligro
        if (lv >= 3) {
          let danger = null;
          for (const o of g.mobs.list.values()) if (o.def.hostile && !o.dying && !(o.def.neutral && !o.provoked) && o.pos.distanceTo(p.pos) < 18) { danger = o; break; }
          if (danger && !m.warned) { flash(`🐕 ${m.petName || 'Tu mascota'} gruñe: viene ${danger.def.name.toLowerCase()}`); sfx.bark?.(); m.warned = true; }
          else if (!danger) m.warned = false;
        }
      }
    }
    slowAcc += dt;
    if (slowAcc > 10) { slowAcc = 0; if (auth()) saplingTick(); }
  };
  api.dispose = () => { scene.remove(sand); sandGeo.dispose(); scene.remove(tide); g.mobs.onPetHit = null; };
  return api;
}
