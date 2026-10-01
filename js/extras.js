// Extras v9.1: accesibilidad (teclas, daltonismo, letra grande), modo chicos, fechas reales
// (hora real, estaciones del hemisferio sur y feriados) y el dron compañero.
import * as THREE from 'three';
import { BLOCKS, LOOT_TABLES } from './blocks.js';

// ---------- teclas configurables ----------
export const ACTIONS = [
  ['forward', 'Avanzar', 'KeyW'], ['back', 'Retroceder', 'KeyS'], ['left', 'Izquierda', 'KeyA'], ['right', 'Derecha', 'KeyD'],
  ['jump', 'Saltar / subir', 'Space'], ['sprint', 'Correr', 'ShiftLeft'], ['down', 'Bajar (vuelo, ascensor)', 'KeyC'],
  ['inventory', 'Mochila', 'KeyE'], ['drop', 'Tirar ítem', 'KeyQ'], ['mount', 'Subir / bajar de vehículo', 'KeyF'],
  ['map', 'Mapa', 'KeyM'], ['chat', 'Chat', 'KeyT'], ['journal', 'Diario', 'KeyJ'], ['emotes', 'Gestos', 'KeyB'],
  ['camera', 'Cámara', 'KeyV'], ['waypoint', 'Poner marcador', 'KeyN'], ['voice', 'Control por voz', 'KeyK'], ['book', 'Libro', 'KeyO'], ['horn', 'Bocina', 'KeyH'], ['lights', 'Faros', 'KeyL'], ['save', 'Guardar', 'KeyG'],
];
const keyName = (c) => (!c ? '—' : c.startsWith('Key') ? c.slice(3) : c.startsWith('Digit') ? c.slice(5) : { Space: 'Espacio', ShiftLeft: 'Shift', ShiftRight: 'Shift der.', ControlLeft: 'Ctrl', ControlRight: 'Ctrl der.', AltLeft: 'Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', Enter: 'Enter', CapsLock: 'Bloq Mayús' }[c] || c);

// matrices de corrección para daltonismo (daltonize sobre la simulación de Machado et al.)
const SIM = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const SHIFT = { protan: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]], deutan: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]], tritan: [[1, 0, 0.7], [0, 1, 0.7], [0, 0, 0]] };
function corrMatrix(kind) {
  const S = SIM[kind], E = SHIFT[kind], I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const D = I.map((r, i) => r.map((v, j) => v - S[i][j]));
  const M = I.map((r, i) => r.map((v, j) => v + E[i][0] * D[0][j] + E[i][1] * D[1][j] + E[i][2] * D[2][j]));
  return M.map((r) => [...r.map((v) => v.toFixed(4)), 0, 0].join(' ')).join(' ') + ' 0 0 0 1 0';
}

export function setupAccess({ settings, saveSettings, flash }) {
  settings.keys = settings.keys || {};
  let MAP = {};
  const rebuild = () => {
    MAP = {};
    for (const [id, , def] of ACTIONS) { const b = settings.keys[id]; if (b && b !== def) MAP[b] = def; }
    for (const [id, , def] of ACTIONS) { const b = settings.keys[id]; if (b && b !== def && !(def in MAP)) MAP[def] = 'Unbound'; }
  };
  rebuild();
  const isField = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
  let capture = null;
  const remap = (e) => {
    if (capture && e.type === 'keydown') { e.preventDefault(); e.stopImmediatePropagation(); capture(e.code); return; }
    if (isField(e) || !(e.code in MAP)) return;
    Object.defineProperty(e, 'code', { value: MAP[e.code] });
  };
  addEventListener('keydown', remap, true);
  addEventListener('keyup', remap, true);

  // filtro de color y letra grande
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
  svg.innerHTML = '<filter id="cbf" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>';
  document.body.appendChild(svg);
  const style = document.createElement('style');
  style.textContent = `html.cb #game, html.cb #hud { filter: url(#cbf); }
    #hud, #inv .card, .overlay > .card, #menu .mgrid, #menu .mhead { zoom: var(--uiz, 1); }
    html.contrast #hud { text-shadow: 2px 2px 0 #000, -1px -1px 0 #000; } html.contrast #crosshair::before, html.contrast #crosshair::after { background: #ff0 !important; }
    #access .krow { display: grid; grid-template-columns: 1fr 120px; gap: 6px; align-items: center; margin: 2px 0; }
    #access .krow button { margin: 0; padding: 4px 6px; } #access .krow button.wait { background: #d9823b; color: #000; }`;
  document.head.appendChild(style);
  const applyLook = () => {
    const cb = settings.cb || '';
    document.documentElement.classList.toggle('cb', !!cb);
    if (cb) svg.querySelector('feColorMatrix').setAttribute('values', corrMatrix(cb));
    const z = (settings.uiScale ?? (settings.bigui ? 118 : 100)) / 100;
    document.documentElement.style.setProperty('--uiz', z);
    document.documentElement.classList.toggle('contrast', !!settings.contrast);
  };
  applyLook();

  // panel
  const ov = document.createElement('div'); ov.id = 'access'; ov.className = 'overlay'; ov.hidden = true;
  ov.innerHTML = `<div class="card" style="width:min(480px,100%)"><h2>Controles y accesibilidad</h2>
    <label for="accCb">Colores para daltonismo</label>
    <select id="accCb"><option value="">Normal</option><option value="deutan">Deuteranopía (verde-rojo, el más común)</option><option value="protan">Protanopía (rojo)</option><option value="tritan">Tritanopía (azul-amarillo)</option></select>
    <label>Tamaño de la interfaz: <b class="uzV"></b></label><input id="accBig" type="range" min="80" max="140" step="5">
    <label class="check"><input type="checkbox" id="accContrast"> Alto contraste (textos con borde y mira amarilla)</label>
    <label class="check"><input type="checkbox" id="accVoice"> 🎙 Control por voz al entrar a un mundo (también con K o el botón 🎙)</label>
    <div class="touchOpts"><h3 style="margin:12px 0 4px">Pantalla táctil</h3>
      <label>Tamaño de los botones: <b class="tsV"></b></label><input class="tsz" type="range" min="70" max="140" step="5">
      <label>Opacidad: <b class="toV"></b></label><input class="tal" type="range" min="25" max="100" step="5">
      <label>Sensibilidad para mirar: <b class="tlV"></b></label><input class="tse" type="range" min="40" max="220" step="10">
      <label class="check"><input type="checkbox" class="hap"> 📳 Vibrar al tocar y al recibir daño</label>
      <label class="check"><input type="checkbox" class="fix"> 🕹 Joystick fijo (si no, aparece donde apoyás el pulgar)</label></div>
    <h3 style="margin:12px 0 4px">Teclas</h3><p class="muted" style="font-size:15px;margin:0 0 6px">Tocá una acción y apretá la tecla nueva (Esc cancela).</p>
    <div id="accKeys"></div>
    <div class="row2"><button id="accReset">Teclas por defecto</button><button id="accClose" class="primary">Listo</button></div></div>`;
  document.body.appendChild(ov);
  const $ = (s) => ov.querySelector(s);
  const renderKeys = () => {
    const box = $('#accKeys'); box.innerHTML = '';
    for (const [id, label, def] of ACTIONS) {
      const row = document.createElement('div'); row.className = 'krow';
      row.innerHTML = `<span>${label}</span><button>${keyName(settings.keys[id] || def)}</button>`;
      const b = row.querySelector('button');
      b.onclick = () => {
        b.textContent = '…'; b.classList.add('wait');
        capture = (code) => {
          capture = null;
          if (code !== 'Escape') {
            // si la tecla ya la usaba otra acción, se intercambian
            const cur = settings.keys[id] || def;
            for (const [oid, , odef] of ACTIONS) if (oid !== id && (settings.keys[oid] || odef) === code) settings.keys[oid] = cur;
            settings.keys[id] = code;
            rebuild(); saveSettings();
          }
          renderKeys();
        };
      };
      box.appendChild(row);
    }
  };
  $('#accCb').onchange = (e) => { settings.cb = e.target.value; applyLook(); saveSettings(); };
  const touchUI = () => {
    $('.tsz').value = settings.touchSize ?? 100; $('.tsV').textContent = ($('.tsz').value) + '%';
    $('.tal').value = settings.touchAlpha ?? 85; $('.toV').textContent = ($('.tal').value) + '%';
    $('.tse').value = settings.touchSens ?? 100; $('.tlV').textContent = ($('.tse').value) + '%';
    $('.hap').checked = settings.haptics !== false; $('.fix').checked = !!settings.fixedStick;
  };
  const tset = (k, v) => { settings[k] = v; saveSettings(); touchUI(); window.dispatchEvent(new Event('touchopts')); };
  $('.tsz').oninput = (e) => tset('touchSize', +e.target.value);
  $('.tal').oninput = (e) => tset('touchAlpha', +e.target.value);
  $('.tse').oninput = (e) => tset('touchSens', +e.target.value);
  $('.hap').onchange = (e) => tset('haptics', e.target.checked);
  $('.fix').onchange = (e) => tset('fixedStick', e.target.checked);
  $('#accBig').oninput = (e) => { settings.uiScale = +e.target.value; $('.uzV').textContent = settings.uiScale + '%'; applyLook(); };
  $('#accBig').onchange = () => saveSettings();
  $('#accContrast').onchange = (e) => { settings.contrast = e.target.checked; applyLook(); saveSettings(); };
  $('#accVoice').onchange = (e) => { settings.voiceCtl = e.target.checked; saveSettings(); };
  $('#accReset').onclick = () => { settings.keys = {}; rebuild(); saveSettings(); renderKeys(); flash?.('Teclas por defecto'); };
  let onClose = null;
  $('#accClose').onclick = () => { capture = null; ov.hidden = true; onClose?.(); };
  return {
    open(cb) {
      onClose = cb;
      $('#accCb').value = settings.cb || ''; $('#accBig').value = settings.uiScale ?? (settings.bigui ? 118 : 100); $('.uzV').textContent = $('#accBig').value + '%'; $('#accContrast').checked = !!settings.contrast; $('#accVoice').checked = !!settings.voiceCtl;
      touchUI(); $('.touchOpts').hidden = !document.body.classList.contains('touch');
      renderKeys(); ov.hidden = false;
    },
    keyName: (id) => keyName(settings.keys[id] || ACTIONS.find((a) => a[0] === id)?.[2]),
  };
}

// ---------- fechas reales ----------
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
export function holidayToday(now = new Date()) {
  const m = now.getMonth() + 1, d = now.getDate(), md = m * 100 + d;
  const es = easter(now.getFullYear()), diff = Math.round((now - es) / 864e5);
  if (md >= 1220 && md <= 1226) return { id: 'navidad', name: '🎄 Navidad', msg: '¡Feliz Navidad! Nieva en el yermo y hay regalos escondidos cerca.' };
  if (md === 1231 || md === 101) return { id: 'anio', name: '🎆 Año nuevo', msg: '¡Feliz año nuevo! De noche hay fuegos artificiales.' };
  if (diff >= -2 && diff <= 1) return { id: 'pascua', name: '🥚 Pascua', msg: '¡Felices Pascuas! Buscá los huevos de chocolate escondidos.' };
  if (md === 525 || md === 709) return { id: 'patria', name: '🇦🇷 Fiesta patria', msg: '¡Feliz día de la patria! Fuegos artificiales celestes y blancos a la noche.' };
  if (md === 720) return { id: 'amigo', name: '🤝 Día del amigo', msg: '¡Feliz día del amigo! Tenés un regalo en la mochila.' };
  if ((md >= 1025 && md <= 1031) || md === 1101) return { id: 'halloween', name: '🎃 Noche de brujas', msg: 'Noche de brujas: los monstruos usan calabazas y sueltan caramelos.' };
  return null;
}
// estación real del hemisferio sur: 0 primavera, 1 verano, 2 otoño, 3 invierno
export const realSeason = (now = new Date()) => Math.floor(((now.getMonth() + 4) % 12) / 3);
export const realTimeOfDay = (now = new Date()) => (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;

// ---------- por partida ----------
export function createExtras(ctx) {
  const { game: g, sfx, flash, scene, camera, particles } = ctx;
  const p = g.player, inv = g.inv, w = g.world, meta = g.meta;
  const api = {};
  const hol = holidayToday();
  api.holiday = hol;
  const today = new Date().toISOString().slice(0, 10);
  if (hol && meta.holidaySeen !== today + hol.id) {
    meta.holidaySeen = today + hol.id;
    setTimeout(() => flash(hol.msg), 3500);
    if (!meta.remote) {
      if (hol.id === 'amigo' || hol.id === 'navidad') p.give(397, hol.id === 'navidad' ? 2 : 1);
      if (hol.id === 'halloween') p.give(396, 5);
    }
  }
  // huevos de pascua y regalos de navidad: aparecen tirados cerca
  let hideAcc = 20;
  function hideTreats() {
    const id = hol?.id === 'pascua' ? 395 : hol?.id === 'navidad' ? 397 : 0;
    if (!id || !ctx.isAuthority()) return;
    let n = 0; for (const d of g.drops.list.values()) if (d.item === id) n++;
    if (n >= 4) return;
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 20;
    const x = Math.floor(p.pos.x + Math.cos(a) * r), z = Math.floor(p.pos.z + Math.sin(a) * r);
    const y = g.mobs.surfaceY(x, z); if (y == null) return;
    g.drops.spawn(id, 1, new THREE.Vector3(x + 0.5, y + 0.3, z + 0.5), new THREE.Vector3());
  }

  // fuegos artificiales (año nuevo y fiestas patrias, de noche)
  const FW = 600;
  const fwGeo = new THREE.BufferGeometry();
  const fwPos = new Float32Array(FW * 3), fwCol = new Float32Array(FW * 3), fwVel = new Float32Array(FW * 3), fwLife = new Float32Array(FW);
  fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
  const fwPts = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fwPts.frustumCulled = false; fwPts.visible = false; scene.add(fwPts);
  let fwNext = 0, fwAcc = 0;
  const PAL = hol?.id === 'patria' ? [[0.45, 0.75, 1], [1, 1, 1], [1, 0.85, 0.3]] : [[1, 0.3, 0.3], [0.4, 1, 0.4], [0.4, 0.6, 1], [1, 0.9, 0.3], [1, 0.4, 1]];
  function firework(x = p.pos.x + (Math.random() - 0.5) * 60, y = p.pos.y + 30 + Math.random() * 20, z = p.pos.z + (Math.random() - 0.5) * 60) {
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    for (let k = 0; k < 60; k++) {
      const i = fwNext = (fwNext + 1) % FW;
      fwPos.set([x, y, z], i * 3);
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), s = 7 + Math.random() * 2;
      fwVel.set([Math.sin(ph) * Math.cos(th) * s, Math.cos(ph) * s, Math.sin(ph) * Math.sin(th) * s], i * 3);
      fwCol.set(c, i * 3); fwLife[i] = 1.6 + Math.random() * 0.6;
    }
    fwPts.visible = true;
    sfx.firework?.();
  }
  function fwTick(dt) {
    if (!fwPts.visible) return;
    let any = false;
    for (let i = 0; i < FW; i++) {
      if (fwLife[i] <= 0) continue;
      any = true; fwLife[i] -= dt;
      fwVel[i * 3 + 1] -= 4 * dt;
      for (let a = 0; a < 3; a++) { fwVel[i * 3 + a] *= 1 - dt * 1.2; fwPos[i * 3 + a] += fwVel[i * 3 + a] * dt; }
      const f = Math.max(0, Math.min(1, fwLife[i]));
      if (fwLife[i] <= 0) fwPos[i * 3 + 1] = -1e4;
      else for (let a = 0; a < 3; a++) fwCol[i * 3 + a] = Math.min(fwCol[i * 3 + a], f);
    }
    fwGeo.attributes.position.needsUpdate = true; fwGeo.attributes.color.needsUpdate = true;
    if (!any) fwPts.visible = false;
  }

  // ---------- dron compañero ----------
  let drone = null, scanAcc = 0, alertAcc = 0, droneMsg = '';
  const hud = document.createElement('div'); hud.id = 'droneHud'; hud.hidden = true;
  hud.style.cssText = 'position:absolute;right:12px;top:140px;max-width:280px;background:rgba(20,18,15,.62);border-right:3px solid #6ab0ff;padding:4px 8px;font-size:16px;color:#d8e8ff;pointer-events:none;text-align:right';
  document.querySelector('#hud').appendChild(hud);
  const ORE = new Set(); for (let id = 1; id < BLOCKS.length; id++) if (BLOCKS[id] && /mineral|veta|cristal arcano|uranio/i.test(BLOCKS[id].name || '') && !BLOCKS[id].hidden) ORE.add(id);
  function buildDrone() {
    const grp = new THREE.Group();
    const M = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e ? c : 0x000000, emissiveIntensity: e });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), M(0xd8dce0)); grp.add(body);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), M(0x6ab0ff, 1)); eye.position.set(0, -0.02, -0.22); grp.add(eye);
    const rotors = [];
    for (const [x, z] of [[0.28, 0.28], [-0.28, 0.28], [0.28, -0.28], [-0.28, -0.28]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), M(0x3a3e44)); arm.position.set(x, 0.06, z); grp.add(arm);
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.05), M(0x22262a)); r.position.set(x, 0.1, z); grp.add(r); rotors.push(r);
    }
    grp.position.copy(p.pos).add(new THREE.Vector3(0, 2.4, 0));
    scene.add(grp);
    return { grp, rotors, eye, body };
  }
  const hasDrone = () => p.creative || inv.count(393) > 0;
  api.droneObj = () => drone;
  api.setDrone = (on) => {
    meta.drone = !!on;
    if (on && !drone) { drone = buildDrone(); flash('🛸 Dron desplegado: junta lo que tirás cerca, busca minerales y te avisa si viene algo'); p.onEvent('v9', 'dron'); }
    if (!on && drone) { scene.remove(drone.grp); drone = null; hud.hidden = true; flash('Dron guardado en la mochila'); }
  };
  api.onUseItem = (hand, it) => {
    if (it.firework) { p.useCd = 0.6; p.mouse.right = false; firework(p.pos.x, p.pos.y + 14 + Math.random() * 6, p.pos.z); if (!p.creative) inv.consumeHand(); p.onEvent('v9', 'cohete'); return true; }
    if (it.gift) {
      p.useCd = 0.6; p.mouse.right = false;
      const pool = [...LOOT_TABLES.normal, [385, 2, 5, 0.5], [394, 2, 4, 0.5], [396, 2, 5, 0.5]];
      const got = [];
      for (let k = 0; k < 3; k++) { const [id, a, b] = pool[Math.floor(Math.random() * pool.length)]; const n = a + Math.floor(Math.random() * (b - a + 1)); p.give(id, n); got.push(id); }
      if (!p.creative) inv.consumeHand();
      particles.burst(p.pos.x - 0.5, p.pos.y + 1, p.pos.z - 0.5, [230, 60, 60], 12, 0.5); sfx.craft();
      flash('🎁 ¡Abriste un regalo!');
      return true;
    }
    if (hand.id !== 393) return false;
    p.useCd = 0.5; p.mouse.right = false;
    api.setDrone(!drone);
    return true;
  };
  function droneTick(dt) {
    if (drone && !hasDrone()) api.setDrone(false);
    if (!drone) return;
    // vuela sobre el hombro derecho
    const side = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw)), fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const tgt = p.pos.clone().add(new THREE.Vector3(0, 2.05 + Math.sin(performance.now() / 600) * 0.12, 0)).addScaledVector(side, 1.4).addScaledVector(fwd, 1.6);
    drone.grp.position.lerp(tgt, Math.min(1, dt * 3));
    drone.grp.rotation.y += ((p.yaw - drone.grp.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 3);
    for (const r of drone.rotors) r.rotation.y += dt * 40;
    // imán: acerca lo que está tirado
    if (ctx.isAuthority()) for (const d of g.drops.list.values()) {
      const dd = d.pos.distanceTo(p.pos);
      if (dd < 8 && dd > 1 && d.age > 1) { d.pos.lerp(p.pos, Math.min(1, dt * 2.5)); d.vel.set(0, 0, 0); }
    }
    // alerta de criaturas hostiles
    alertAcc += dt;
    if (alertAcc > 0.7) {
      alertAcc = 0;
      let near = null, nd = 16;
      for (const m of g.mobs.list.values()) { if (!m.def.hostile || m.dying || m.owner || (m.def.neutral && !m.provoked)) continue; const d = m.pos.distanceTo(p.pos); if (d < nd) { nd = d; near = m; } }
      drone.eye.material.color.setHex(near ? 0xff4a3a : 0x6ab0ff); drone.eye.material.emissive.setHex(near ? 0xff4a3a : 0x6ab0ff);
      const alert = near ? `⚠ ${near.def.name} a ${Math.round(nd)} m` : '';
      hud.innerHTML = [alert, droneMsg].filter(Boolean).join('<br>') || '🛸 Dron: todo tranquilo';
      hud.hidden = false;
      if (near && !api.alerted) { api.alerted = true; sfx.click(); } else if (!near) api.alerted = false;
    }
    // escáner de minerales y cofres
    scanAcc += dt;
    if (scanAcc > 6) {
      scanAcc = 0;
      const x0 = Math.floor(p.pos.x), y0 = Math.floor(p.pos.y), z0 = Math.floor(p.pos.z);
      let best = null, bd = 1e9;
      for (let dx = -12; dx <= 12; dx++) for (let dy = -10; dy <= 6; dy++) for (let dz = -12; dz <= 12; dz++) {
        const b = w.getBlock(x0 + dx, y0 + dy, z0 + dz);
        if (b <= 0 || !(ORE.has(b) || BLOCKS[b]?.loot)) continue;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) { bd = d; best = [x0 + dx, y0 + dy, z0 + dz, b]; }
      }
      if (best) {
        droneMsg = `📡 ${BLOCKS[best[3]].name} a ${Math.round(Math.sqrt(bd))} m${best[1] < y0 - 1 ? ' (abajo)' : ''}`;
        const from = drone.grp.position, to = new THREE.Vector3(best[0] + 0.5, best[1] + 0.5, best[2] + 0.5), n = 14;
        for (let i = 0; i <= n; i++) { const q = from.clone().lerp(to, i / n); particles.burst(q.x - 0.5, q.y - 0.5, q.z - 0.5, [110, 180, 255], 1, 0.05); }
      } else droneMsg = '📡 Nada interesante cerca';
    }
  }

  // noche de brujas: calabazas en la cabeza de los monstruos y caramelos
  api.event = (n, id) => {
    if (n === 'kill' && hol?.id === 'halloween' && Math.random() < 0.7) p.give(396, 1 + (Math.random() < 0.3 ? 1 : 0));
  };
  let pumpAcc = 0;
  const pumpMat = new THREE.MeshLambertMaterial({ color: 0xe0801a, emissive: 0x6a2a00 });
  function pumpkins() {
    for (const m of g.mobs.list.values()) {
      if (m.pumpkin || !m.def.hostile || !m.parts?.head) continue;
      m.pumpkin = true;
      const s = Math.max(0.45, Math.min(0.8, m.def.hw * 1.3));
      const box = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.85, s), pumpMat);
      box.position.y = s * 0.35; m.parts.head.add(box);
    }
  }

  // ---------- bucle ----------
  api.update = (dt) => {
    if (hol?.id === 'halloween') { pumpAcc += dt; if (pumpAcc > 1) { pumpAcc = 0; pumpkins(); } }
    const r = meta.rules || {};
    if (r.realTime && !meta.remote) g.time = realTimeOfDay();
    if (hol) {
      hideAcc += dt;
      if (hideAcc > 25) { hideAcc = 0; hideTreats(); }
      const night = g.time > 0.8 || g.time < 0.2;
      if ((hol.id === 'anio' || hol.id === 'patria') && night) { fwAcc += dt; if (fwAcc > 1.4) { fwAcc = 0; firework(); } }
      if (hol.id === 'navidad' && g.weather && !g.weather.winter) g.weather.winter = true;
    }
    fwTick(dt);
    droneTick(dt);
  };
  if (meta.drone && hasDrone()) api.setDrone(true);
  api.dispose = () => { if (drone) scene.remove(drone.grp); scene.remove(fwPts); fwGeo.dispose(); hud.remove(); };
  return api;
}
