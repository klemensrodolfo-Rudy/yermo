// Visual v10: luz de la antorcha en la mano, partículas ambientales (luciérnagas, hojas, polvo, burbujas),
// color por bioma y momento del día, auroras en lugares fríos y opciones de cámara.
import * as THREE from 'three';
import { BLOCKS, ITEMS, LIQ, LIQ_LEVEL, EMIT, LCOL, RENDER, SOLID } from './blocks.js';
import { BIOME } from './worldgen.js';
import { Avatar } from './net.js';

// color por bioma: [saturación, contraste, brillo, tono]
const GRADE = {
  [BIOME.FOREST]: [0.95, 1.04, 1, 0], [BIOME.DESERT]: [1.08, 1.05, 1.02, -4], [BIOME.SWAMP]: [0.9, 1.02, 0.97, 8],
  [BIOME.CITY]: [0.85, 1.07, 0.99, 0], [BIOME.CRATER]: [1.05, 1.1, 1, 6], [BIOME.BREW]: [1.12, 1.03, 1.02, -2],
  [BIOME.MUSHROOM]: [1.18, 1.05, 1, 6], [BIOME.TUNDRA]: [0.88, 1.03, 1.03, 4], [BIOME.ZOO]: [1.1, 1.04, 1.02, -3],
  [BIOME.VALE]: [1.15, 1.04, 1.03, -2], [BIOME.ELFWOOD]: [1.12, 1.03, 1.01, 5], [BIOME.PEAKS]: [0.95, 1.06, 1.02, 0],
  [BIOME.MIRE]: [0.85, 1.02, 0.95, 10], [BIOME.ASHEN]: [1.1, 1.1, 0.98, -6], [BIOME.OCEAN]: [1.12, 1.03, 1.02, 0], [BIOME.ISLAND]: [1.18, 1.04, 1.03, -2],
};
const COLD = new Set([BIOME.TUNDRA, BIOME.PEAKS]);

export function createVisuals(ctx) {
  const { game: g, scene, uniforms, skyUniforms, settings } = ctx;
  const p = g.player, w = g.world;
  const api = {};
  const canvas = ctx.renderer.domElement;
  Avatar.world = w;

  // ---------- opciones de cámara ----------
  settings.fov = settings.fov ?? 75; settings.bob = settings.bob ?? true; settings.invertY = !!settings.invertY;
  settings.shake = settings.shake ?? true; settings.grade = settings.grade ?? true; settings.ambient = settings.ambient ?? true;
  const applyCam = () => { p.baseFov = settings.fov; p.bobMul = settings.bob ? 1 : 0; p.invertY = settings.invertY; p.shakeMul = settings.shake ? 1 : 0; };
  applyCam();
  const box = document.querySelector('#camOpts');
  if (box) {
    box.innerHTML = `<label>Campo de visión: <b class="fovV">${settings.fov}</b>°</label><input class="fov" type="range" min="60" max="105" value="${settings.fov}">
      <div class="checks"><label class="check"><input type="checkbox" class="bob"> 🚶 Balanceo al caminar</label><label class="check"><input type="checkbox" class="shk"> 💥 Sacudón de cámara</label>
      <label class="check"><input type="checkbox" class="inv"> ↕ Invertir mirada vertical</label><label class="check"><input type="checkbox" class="grd"> 🎨 Color cinematográfico</label>
      <label class="check"><input type="checkbox" class="amb"> ✨ Partículas del ambiente</label><label style="margin:8px 0 0">Mira <select class="xh"><option value="cruz">Cruz</option><option value="punto">Punto</option><option value="aro">Aro</option></select></label><label class="check"><input type="checkbox" class="tps"> 💡 Consejos la primera vez</label><label class="check"><input type="checkbox" class="bpv"> 🧱 Vista previa al construir</label><label class="check"><input type="checkbox" class="atl"> ⛏ Herramienta automática al romper</label></div>`;
    const $ = (s) => box.querySelector(s);
    $('.bob').checked = settings.bob; $('.shk').checked = settings.shake; $('.inv').checked = settings.invertY; $('.grd').checked = settings.grade; $('.amb').checked = settings.ambient;
    const save = () => { applyCam(); ctx.saveSettings?.(); };
    $('.fov').oninput = (e) => { settings.fov = +e.target.value; $('.fovV').textContent = settings.fov; save(); };
    $('.bob').onchange = (e) => { settings.bob = e.target.checked; save(); };
    $('.shk').onchange = (e) => { settings.shake = e.target.checked; save(); };
    $('.inv').onchange = (e) => { settings.invertY = e.target.checked; save(); };
    $('.grd').onchange = (e) => { settings.grade = e.target.checked; save(); };
    $('.amb').onchange = (e) => { settings.ambient = e.target.checked; save(); };
    $('.xh').value = settings.crosshair || 'cruz'; $('.xh').onchange = (e) => { settings.crosshair = e.target.value; save(); };
    $('.bpv').checked = settings.buildPreview !== false; $('.bpv').onchange = (e) => { settings.buildPreview = e.target.checked; save(); };
    $('.atl').checked = !!settings.autoTool; $('.atl').onchange = (e) => { settings.autoTool = e.target.checked; save(); };
    $('.tps').checked = settings.tips !== false; $('.tps').onchange = (e) => { settings.tips = e.target.checked; save(); };
  }

  // ---------- luz en la mano ----------
  function handLight() {
    const h = g.inv.hand;
    let L = 0, col = 0xffb86a;
    if (h) {
      const b = BLOCKS[h.id], it = ITEMS[h.id];
      if (b?.light >= 8) { L = b.light; if (h.id === 28 || h.id === 221) col = h.id === 28 ? 0xc8ff8a : 0xfff4d8; else if (h.id === 217) col = 0xb8a0ff; }
      else if (it?.spell === 'light') { L = 12; col = 0xfff4d8; }
    }
    if (!L && g.player.buffs?.vision > 0) { L = 15; col = 0xa8ffd0; }
    const t = performance.now() / 1000;
    const flick = col === 0xffb86a ? 0.9 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.05 : 1;
    const target = L ? Math.min(1, L / 14) * flick : 0;
    uniforms.plOn.value += (target - uniforms.plOn.value) * 0.25;
    uniforms.plCol.value.setHex(col);
    uniforms.plR.value = 5 + L * 0.55;
    uniforms.plPos.value.copy(ctx.camera.position).add(new THREE.Vector3(0.3, -0.35, -0.3).applyQuaternion(ctx.camera.quaternion));
  }

  // ---------- partículas del ambiente ----------
  const N = 260;
  const pos = new Float32Array(N * 3).fill(-1e4), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N), kind = new Uint8Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; scene.add(pts);
  let next = 0, spawnAcc = 0;
  // 1 luciérnaga · 2 hoja · 3 polvo · 4 burbuja · 5 chispa de ceniza
  function spawn(k, x, y, z) {
    const i = next = (next + 1) % N;
    pos.set([x, y, z], i * 3); kind[i] = k;
    const C = { 1: [0.85, 1, 0.35], 2: [0.55, 0.6, 0.25], 3: [0.55, 0.5, 0.42], 4: [0.6, 0.8, 1], 5: [1, 0.5, 0.15] }[k];
    col.set(C, i * 3);
    const r = Math.random;
    if (k === 1) { vel.set([(r() - 0.5) * 0.6, (r() - 0.5) * 0.3, (r() - 0.5) * 0.6], i * 3); life[i] = 5 + r() * 5; }
    else if (k === 2) { vel.set([0.6 + r() * 0.4, -0.7 - r() * 0.4, 0.2], i * 3); life[i] = 7; }
    else if (k === 3) { vel.set([(r() - 0.5) * 0.15, 0.05, (r() - 0.5) * 0.15], i * 3); life[i] = 6; }
    else if (k === 4) { vel.set([0, 0.9 + r() * 0.6, 0], i * 3); life[i] = 3; }
    else { vel.set([(r() - 0.5) * 0.4, 0.8 + r() * 0.5, (r() - 0.5) * 0.4], i * 3); life[i] = 3; }
  }
  function ambient(dt) {
    pts.visible = settings.ambient && !settings.battery;
    if (!pts.visible) return;
    const t = performance.now() / 1000, night = 1 - uniforms.daylight.value;
    const b = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
    spawnAcc += dt;
    while (spawnAcc > 0.06) {
      spawnAcc -= 0.06;
      const r = Math.random, x = p.pos.x + (r() - 0.5) * 30, z = p.pos.z + (r() - 0.5) * 30, y = p.pos.y + r() * 6 - 1;
      if (p.headInWater) { if (r() < 0.6) spawn(4, p.pos.x + (r() - 0.5) * 6, p.pos.y + r() * 2, p.pos.z + (r() - 0.5) * 6); continue; }
      const green = [BIOME.FOREST, BIOME.BREW, BIOME.VALE, BIOME.ELFWOOD, BIOME.SWAMP, BIOME.MIRE, BIOME.ISLAND, BIOME.ZOO, BIOME.MUSHROOM].includes(b);
      if (night > 0.55 && green && r() < 0.5) spawn(1, x, p.pos.y + r() * 3, z);
      else if ([BIOME.VALE, BIOME.ELFWOOD, BIOME.ISLAND, BIOME.ZOO].includes(b) && night < 0.5 && r() < 0.25) spawn(2, x, y + 6, z);
      else if ([BIOME.DESERT, BIOME.CITY, BIOME.CRATER].includes(b) && r() < 0.35) spawn(3, x, y, z);
      else if (b === BIOME.ASHEN && r() < 0.4) spawn(5, x, p.pos.y - 1, z);
    }
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const o = i * 3, k = kind[i];
      if (k === 1) { vel[o] += Math.sin(t * 2 + i) * dt * 0.8; vel[o + 2] += Math.cos(t * 1.7 + i) * dt * 0.8; vel[o + 1] += Math.sin(t * 3 + i) * dt * 0.4; }
      if (k === 2) { vel[o] = 0.6 + Math.sin(t * 1.5 + i) * 0.5; }
      const wd = k === 2 || k === 3 || k === 5 ? 1.8 : k === 1 ? 0.3 : 0;
      pos[o] += (vel[o] + wind.x * wd) * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += (vel[o + 2] + wind.z * wd) * dt;
      const fade = Math.min(1, life[i], 1);
      const blink = k === 1 ? 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7) : 1;
      const base = { 1: [0.85, 1, 0.35], 2: [0.5, 0.6, 0.25], 3: [0.45, 0.42, 0.36], 4: [0.5, 0.7, 1], 5: [1, 0.45, 0.12] }[k];
      const day = k === 2 || k === 3 ? Math.max(0.3, uniforms.daylight.value) : 1;
      col[o] = base[0] * fade * blink * day; col[o + 1] = base[1] * fade * blink * day; col[o + 2] = base[2] * fade * blink * day;
      if (life[i] <= 0) pos[o + 1] = -1e4;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  }

  // ---------- color por bioma y aurora ----------
  let gr = [1, 1, 1, 0], aur = 0;
  function grade(dt) {
    const b = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
    const day = uniforms.daylight.value;
    let target = settings.grade ? (GRADE[b] || [1, 1.03, 1, 0]) : [1, 1, 1, 0];
    if (settings.grade) {
      const dusk = Math.max(0, 1 - Math.abs(g.time - 0.77) * 14) + Math.max(0, 1 - Math.abs(g.time - 0.23) * 14);
      target = [target[0] * (1 + dusk * 0.12) * (0.85 + day * 0.15), target[1], target[2], target[3] - dusk * 4];
      if (p.headInWater) target = uniforms.uwFar.value > 20 ? [1.12, 1.03, 1.0, -6] : [1.15, 1.02, 0.95, 10];
    }
    for (let i = 0; i < 4; i++) gr[i] += (target[i] - gr[i]) * Math.min(1, dt * 1.5);
    const f = `saturate(${gr[0].toFixed(3)}) contrast(${gr[1].toFixed(3)}) brightness(${gr[2].toFixed(3)}) hue-rotate(${gr[3].toFixed(1)}deg)`;
    if (!g.photoFilter && canvas.style.filter !== f && !document.documentElement.classList.contains('cb')) canvas.style.filter = settings.grade ? f : '';
    const want = COLD.has(b) || (g.season?.().name === 'Invierno' && b !== BIOME.DESERT) ? 1 : 0;
    aur += (want - aur) * Math.min(1, dt * 0.3);
    skyUniforms.aurora.value = aur;
  }

  // ---------- viento: dirección que gira despacio, ráfagas y más fuerza con tormenta ----------
  const wind = { x: 0.3, z: 0.1, k: 0.3 };
  g.wind = wind;
  function windTick(dt) {
    const t = performance.now() / 1000, W = g.weather;
    const ang = Math.sin(t * 0.013) * 2.2 + Math.sin(t * 0.0041) * 1.3;
    const storm = W ? W.windK : 0;
    const gust = Math.max(0, Math.sin(t * 0.37) * Math.sin(t * 0.21 + 1.3)) * 0.35;
    const k = Math.min(1.4, 0.18 + storm * 0.95 + gust + (g.nature?.storm || 0) * 0.8);
    wind.k += (k - wind.k) * Math.min(1, dt * 0.8);
    wind.x = Math.cos(ang) * wind.k; wind.z = Math.sin(ang) * wind.k;
    uniforms.wind.value.set(wind.x, wind.z);
    if (W) { W.wx = wind.x; W.wz = wind.z; }
    const co = skyUniforms.cloudOff.value; co.x += (0.006 + wind.x * 0.03) * dt; co.y += (0.002 + wind.z * 0.03) * dt;
    uniforms.cloudOff.value.copy(co); uniforms.cloudCov.value = skyUniforms.clouds.value;
    // la nieve se acumula mientras nieva y se derrite despacio después
    const snowing = W && W.type === 'snow' ? W.k : 0;
    const cold = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome === BIOME.TUNDRA;
    uniforms.snow.value = Math.max(0, Math.min(1, uniforms.snow.value + (snowing > 0.3 ? dt / 80 : -dt / (cold ? 600 : 120))));
  }

  // ---------- humo de fogatas y fuego ----------
  const SN = 160, sPos = new Float32Array(SN * 3).fill(-1e4), sCol = new Float32Array(SN * 3), sVel = new Float32Array(SN * 3), sLife = new Float32Array(SN);
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const smoke = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.9, map: glowTex, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false }));
  smoke.frustumCulled = false; scene.add(smoke);
  let sNext = 0, sources = [], lights = [], lava = [], scanAcc = 3, puffAcc = 0, emberAcc = 0;
  // halos alrededor de las luces (de noche o en lugares oscuros)
  const PAL = [[1, 0.65, 0.3], [0.5, 1, 0.35], [0.75, 0.45, 1], [0.6, 0.8, 1], [1, 0.25, 0.2], [1, 0.45, 0.15], [0.35, 0.9, 1], [1, 0.95, 0.85]];
  const halos = [];
  for (let i = 0; i < 48; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.visible = false; scene.add(s); halos.push(s); }
  function haloTick() {
    const dark = Math.max(0, 1 - uniforms.daylight.value * 1.4), t = performance.now() / 1000;
    for (let i = 0; i < halos.length; i++) {
      const h = halos[i], L = lights[i];
      if (!L || dark < 0.05 || settings.battery) { h.visible = false; continue; }
      h.visible = true; h.position.set(L[0], L[1], L[2]);
      const flick = L[5] ? 0.85 + Math.sin(t * 11 + i) * 0.08 + Math.sin(t * 6.7 + i * 2) * 0.07 : 1;
      const s = (L[5] ? 1.3 : 2.2) * (L[4] / 15) * flick; h.scale.set(s, s, 1);
      h.material.color.setRGB(...PAL[L[3]] || PAL[0]); h.material.opacity = 0.55 * dark * flick;
    }
  }
  function smokeTick(dt) {
    scanAcc += dt;
    if (scanAcc > 2.5) {
      scanAcc = 0; sources = [];
      const x0 = Math.floor(p.pos.x), y0 = Math.floor(p.pos.y), z0 = Math.floor(p.pos.z);
      lights = []; lava = [];
      for (let dx = -18; dx <= 18; dx++) for (let dz = -18; dz <= 18; dz++) for (let dy = -6; dy <= 6; dy++) {
        const b = w.getBlock(x0 + dx, y0 + dy, z0 + dz);
        if ((b === 108 || b === 181) && sources.length < 24) sources.push([x0 + dx + 0.5, y0 + dy + (b === 108 ? 0.6 : 0.9), z0 + dz + 0.5]);
        if (LIQ[b] === 3 && lava.length < 30 && w.getBlock(x0 + dx, y0 + dy + 1, z0 + dz) === 0) lava.push([x0 + dx, y0 + dy + 0.9, z0 + dz]);
        if (b > 0 && EMIT[b] >= 10 && !LIQ[b] && lights.length < 48) lights.push([x0 + dx + 0.5, y0 + dy + (RENDER[b] === 2 ? 0.75 : 0.5), z0 + dz + 0.5, LCOL[b], EMIT[b], RENDER[b] === 2 || b === 108 || b === 181]);
      }
    }
    puffAcc += dt;
    while (puffAcc > 0.18) {
      puffAcc -= 0.18;
      for (const s of sources) {
        if (Math.random() < 0.5) continue;
        const i = sNext = (sNext + 1) % SN;
        sPos.set([s[0] + (Math.random() - 0.5) * 0.3, s[1], s[2] + (Math.random() - 0.5) * 0.3], i * 3);
        sVel.set([(Math.random() - 0.5) * 0.15, 0.9 + Math.random() * 0.4, (Math.random() - 0.5) * 0.15], i * 3);
        sLife[i] = 4 + Math.random() * 2;
      }
    }
    const day = Math.max(0.25, uniforms.daylight.value);
    for (let i = 0; i < SN; i++) {
      if (sLife[i] <= 0) continue;
      sLife[i] -= dt;
      const o = i * 3;
      sVel[o] += (wind.x * 1.6 - sVel[o]) * dt * 0.6; sVel[o + 2] += (wind.z * 1.6 - sVel[o + 2]) * dt * 0.6;
      sPos[o] += sVel[o] * dt; sPos[o + 1] += sVel[o + 1] * dt; sPos[o + 2] += sVel[o + 2] * dt;
      const f = Math.min(1, sLife[i] / 2) * Math.min(1, (6 - sLife[i]) * 2);
      const c = 0.32 * f * day;
      sCol[o] = c; sCol[o + 1] = c; sCol[o + 2] = c * 1.05;
      if (sLife[i] <= 0) sPos[o + 1] = -1e4;
    }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
  }

  // ---------- sonido ambiente: qué hay cerca ----------
  let ambAcc = 1;
  const GREEN = new Set([BIOME.FOREST, BIOME.BREW, BIOME.VALE, BIOME.ELFWOOD, BIOME.ISLAND, BIOME.ZOO, BIOME.MUSHROOM, BIOME.SWAMP, BIOME.MIRE]);
  function ambienceTick(dt) {
    ambAcc += dt; if (ambAcc < 0.4) return; ambAcc = 0;
    const sfx = ctx.sfx; if (!sfx?.ctx) return;
    sfx.ambVol = (settings.ambVol ?? 70) / 100;
    const x0 = Math.floor(p.pos.x), y0 = Math.floor(p.pos.y), z0 = Math.floor(p.pos.z);
    let water = 0, flowing = 0, fire = 0;
    for (let dx = -8; dx <= 8; dx += 2) for (let dz = -8; dz <= 8; dz += 2) for (let dy = -4; dy <= 4; dy += 2) {
      const b = w.getBlock(x0 + dx, y0 + dy, z0 + dz);
      if (LIQ[b] === 1 || LIQ[b] === 2) { water++; if (LIQ_LEVEL[b] > 0) flowing++; }
      else if (b === 108 || b === 181) fire++;
    }
    let sea = 0;
    for (let a = 0; a < 8; a++) { const c = g.gen.column(Math.floor(p.pos.x + Math.cos(a) * 20), Math.floor(p.pos.z + Math.sin(a) * 20)); if (c.h < 40 && (c.biome === BIOME.OCEAN || c.biome === BIOME.SCRAPSEA)) sea++; }
    const b = g.gen.column(x0, z0).biome, day = uniforms.daylight.value, rain = g.weather?.rainK || 0;
    const open = y0 > 30;
    sfx.ambience({
      waves: Math.min(1, sea / 4) * (open ? 1 : 0.3),
      water: Math.min(1, flowing / 6 + (water > 30 && sea === 0 ? 0.15 : 0)),
      birds: day > 0.6 && GREEN.has(b) && rain < 0.2 && open && !p.headInWater ? (b === BIOME.ELFWOOD || b === BIOME.ISLAND || b === BIOME.VALE ? 1 : 0.6) : 0,
      crickets: day < 0.35 && GREEN.has(b) && rain < 0.2 && open && !p.headInWater ? 1 : 0,
      fire: Math.min(1, fire / 2),
      underwater: p.headInWater ? 1 : 0,
    });
    sfx.setWind(Math.min(1, g.wind?.k ?? 0.3));
  }
  // ---------- brasas que saltan de la lava ----------
  function embers(dt) {
    if (!lava.length || !pts.visible) return;
    emberAcc += dt;
    while (emberAcc > 0.12) { emberAcc -= 0.12; const L = lava[Math.floor(Math.random() * lava.length)]; spawn(5, L[0] + Math.random(), L[1], L[2] + Math.random()); }
  }

  // ---------- sombras redondas bajo criaturas y objetos ----------
  const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
  const blobs = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 1 })); m.visible = false; m.renderOrder = 1; scene.add(m); blobs.push(m); }
  const ground = (x, y, z) => { for (let k = 0; k < 10; k++) { const b = w.getBlock(Math.floor(x), Math.floor(y) - k, Math.floor(z)); if (b === -1) return null; if (SOLID[b]) return Math.floor(y) - k + 1; } return null; };
  function blobTick() {
    let i = 0;
    const put = (x, y, z, r) => {
      if (i >= blobs.length) return;
      const gy = ground(x, y + 0.3, z); if (gy == null) return;
      const hgt = y - gy, b = blobs[i++];
      b.visible = true; b.position.set(x, gy + 0.02, z);
      const s = r * 2.2 * (1 + hgt * 0.08); b.scale.set(s, 1, s);
      b.material.opacity = Math.max(0, 0.9 - hgt * 0.12) * (0.5 + uniforms.daylight.value * 0.5);
    };
    for (const m of g.mobs.list.values()) { if (m.dying || m.pos.distanceTo(p.pos) > 30) continue; put(m.pos.x, m.pos.y, m.pos.z, Math.max(0.3, m.def.hw * (m.baby ? 0.6 : 1))); }
    for (const d of g.drops.list.values()) { if (d.pos.distanceTo(p.pos) > 16) continue; put(d.pos.x, d.pos.y, d.pos.z, 0.18); }
    if (g.features?.thirdPerson && !p.riding) put(p.pos.x, p.pos.y, p.pos.z, 0.35);
    for (; i < blobs.length; i++) blobs[i].visible = false;
  }

  // destellos al sacar minerales
  api.event = (n, id) => {
    if (n !== 'break' || !/mineral|veta|cristal|uranio|oro/i.test(BLOCKS[id]?.name || '')) return;
    const t = p.target || { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z };
    const c = ctx.mapView?.tileColor?.[BLOCKS[id].tex?.side] || [255, 255, 255];
    const bright = c.map((v) => Math.min(255, v * 1.7 + 40));
    ctx.particles.burst(t.x, t.y, t.z, bright, 16, 0.9);
    for (let i = 0; i < 6; i++) spawn(1, t.x + Math.random(), t.y + Math.random(), t.z + Math.random());
  };
  api.update = (dt) => { windTick(dt); handLight(); ambient(dt); grade(dt); smokeTick(dt); haloTick(); embers(dt); blobTick(); ambienceTick(dt); };
  api.dispose = () => { for (const b of blobs) scene.remove(b); for (const h of halos) scene.remove(h); scene.remove(smoke); sGeo.dispose(); scene.remove(pts); geo.dispose(); canvas.style.filter = ''; uniforms.plOn.value = 0; skyUniforms.aurora.value = 0; };
  return api;
}
