// Visual v10: luz de la antorcha en la mano, partículas ambientales (luciérnagas, hojas, polvo, burbujas),
// color por bioma y momento del día, auroras en lugares fríos y opciones de cámara.
import * as THREE from 'three';
import { BLOCKS, ITEMS } from './blocks.js';
import { BIOME } from './worldgen.js';

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
      <label class="check"><input type="checkbox" class="amb"> ✨ Partículas del ambiente</label><label style="margin:8px 0 0">Mira <select class="xh"><option value="cruz">Cruz</option><option value="punto">Punto</option><option value="aro">Aro</option></select></label><label class="check"><input type="checkbox" class="tps"> 💡 Consejos la primera vez</label></div>`;
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
      pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt;
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
      if (p.headInWater) target = [1.15, 1.02, 0.95, 10];
    }
    for (let i = 0; i < 4; i++) gr[i] += (target[i] - gr[i]) * Math.min(1, dt * 1.5);
    const f = `saturate(${gr[0].toFixed(3)}) contrast(${gr[1].toFixed(3)}) brightness(${gr[2].toFixed(3)}) hue-rotate(${gr[3].toFixed(1)}deg)`;
    if (!g.photoFilter && canvas.style.filter !== f && !document.documentElement.classList.contains('cb')) canvas.style.filter = settings.grade ? f : '';
    const want = COLD.has(b) || (g.season?.().name === 'Invierno' && b !== BIOME.DESERT) ? 1 : 0;
    aur += (want - aur) * Math.min(1, dt * 0.3);
    skyUniforms.aurora.value = aur;
  }

  api.update = (dt) => { handLight(); ambient(dt); grade(dt); };
  api.dispose = () => { scene.remove(pts); geo.dispose(); canvas.style.filter = ''; uniforms.plOn.value = 0; skyUniforms.aurora.value = 0; };
  return api;
}
