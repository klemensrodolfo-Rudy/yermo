// UX v10: marcadores propios (en pantalla y en el mapa), mapa grande con zoom y arrastre, modo foto con
// filtros y cuenta regresiva, y consejos que aparecen la primera vez que ves algo.
import * as THREE from 'three';
import { BLOCKS, ITEMS, itemName, PLACEABLE, isBlock } from './blocks.js';
import { BIOME_NAMES } from './worldgen.js';
import { MOB_TYPES } from './entities.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const COLORS = ['#ffd84a', '#ff6a5a', '#6ab0ff', '#9cff7a', '#ff8ad8', '#ffffff', '#b07aff', '#ffa040'];

export function createUX(ctx) {
  const { game: g, sfx, flash, camera, settings } = ctx;
  const p = g.player, meta = g.meta, mv = ctx.mapView;
  const api = {};
  const $ = (s) => document.querySelector(s);
  meta.waypoints = meta.waypoints || [];

  // ---------- marcadores ----------
  const home = () => { const s = meta.spawn || meta.origin; return s ? { name: '🏠 Casa', color: '#ffd84a', x: s.x, y: s.y, z: s.z, home: true } : null; };
  const all = () => [home(), ...meta.waypoints].filter(Boolean);
  function addWaypoint(x, y, z, name) {
    const n = (name ?? prompt('Nombre del marcador', `Marcador ${meta.waypoints.length + 1}`))?.trim();
    if (!n) return;
    meta.waypoints.push({ name: n.slice(0, 24), color: COLORS[meta.waypoints.length % COLORS.length], x: Math.round(x), y: Math.round(y), z: Math.round(z), on: true });
    if (meta.waypoints.length > 40) meta.waypoints.shift();
    flash(`📍 Marcador «${n}» puesto`); sfx.ding?.(); p.onEvent('v10', 'marcador');
  }
  api.addHere = () => addWaypoint(p.pos.x, p.pos.y, p.pos.z);
  function openWaypoints() {
    ctx.openPanel('📍 Marcadores', (list) => {
      list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Se ven en pantalla con la distancia y en el mapa. <b>N</b> pone uno donde estás; en el mapa grande, tocá un lugar.</p>');
      const b = document.createElement('button'); b.className = 'primary'; b.textContent = '📍 Marcar donde estoy'; b.onclick = () => { api.addHere(); openWaypoints(); }; list.appendChild(b);
      for (const w of all()) {
        const row = document.createElement('div'); row.className = 'trade';
        const d = Math.round(Math.hypot(w.x - p.pos.x, w.z - p.pos.z));
        row.innerHTML = `<div class="tgive" style="flex:1"><b style="color:${w.color}">◆</b> ${esc(w.name)} <small>${d} m · ${w.x}, ${w.y}, ${w.z}</small></div>`;
        if (!w.home) {
          const t = document.createElement('button'); t.textContent = w.on === false ? '👁 Mostrar' : '🙈 Ocultar'; t.onclick = () => { w.on = w.on === false; openWaypoints(); };
          const c = document.createElement('button'); c.textContent = '🎨'; c.title = 'Cambiar color'; c.onclick = () => { w.color = COLORS[(COLORS.indexOf(w.color) + 1) % COLORS.length]; openWaypoints(); };
          const x = document.createElement('button'); x.textContent = '✕'; x.title = 'Borrar'; x.onclick = () => { meta.waypoints.splice(meta.waypoints.indexOf(w), 1); openWaypoints(); };
          row.append(t, c, x);
        }
        list.appendChild(row);
      }
    });
  }
  api.openWaypoints = openWaypoints;
  api.markers = () => all().filter((w) => w.on !== false).map((w) => ({ x: w.x + 0.5, z: w.z + 0.5, color: w.color, kind: w.home ? 'home' : 'poi', label: w.name, cat: w.treasure ? 'tesoros' : w.home ? 'camas' : 'marcas' }));
  // en pantalla: etiqueta con la distancia; si queda fuera de la vista, se pega al borde
  const box = $('#wps'), els = new Map(), v = new THREE.Vector3();
  function drawWaypoints() {
    const W = innerWidth, H = innerHeight, seen = new Set(), stack = {};
    const Z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uiz')) || 1;
    if (ctx.isPhoto?.() || $('#hud').hidden) { box.hidden = true; return; } box.hidden = false;
    for (const w of all()) {
      if (w.on === false) continue;
      const d = Math.hypot(w.x - p.pos.x, w.y - p.pos.y, w.z - p.pos.z);
      if (d < 4 || d > 3000) continue;
      const key = w.name + w.x + w.z; seen.add(key);
      let el = els.get(key);
      if (!el) { el = document.createElement('div'); el.className = 'wp'; el.innerHTML = '<span></span><i></i>'; box.appendChild(el); els.set(key, el); }
      v.set(w.x + 0.5, w.y + 1.5, w.z + 0.5).project(camera);
      let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      const off = v.z > 1 || x < 20 || x > W - 20 || y < 40 || y > H - 20;
      let side = 0;
      if (off) {
        // fuera de la vista: flecha al costado hacia donde hay que girar, apiladas para no pisarse
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
        const ang = Math.atan2(fwd.x * (w.z - p.pos.z) - fwd.z * (w.x - p.pos.x), fwd.x * (w.x - p.pos.x) + fwd.z * (w.z - p.pos.z));
        side = ang > 0 ? 1 : -1;
        const k = (stack[side] = (stack[side] || 0) + 1);
        x = side > 0 ? W - 12 : 12; y = H * 0.38 + (k - 1) * 30;
      }
      if (!off && y > H - 140) y = H - 140; // que no pise la barra de abajo
      el.classList.toggle('edge', off);
      el.style.transform = off ? (side > 0 ? 'translate(-100%, -50%)' : 'translate(0, -50%)') : '';
      el.style.left = x / Z + 'px'; el.style.top = y / Z + 'px'; // el HUD puede estar agrandado
      el.style.color = w.color; el.querySelector('i').style.background = w.color;
      el.querySelector('span').textContent = `${off && side < 0 ? '◀ ' : ''}${w.name} · ${d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1) + ' km'}${off && side > 0 ? ' ▶' : ''}`;
      el.style.opacity = d > 600 ? 0.65 : 1;
    }
    for (const [k, el] of els) if (!seen.has(k)) { el.remove(); els.delete(k); }
  }

  // ---------- mapa grande ----------
  const big = $('#bigmap');
  let drag = null, pinch = null;
  const zoom = (f) => { mv.bigRadius = Math.max(40, Math.min(1400, mv.bigRadius * f)); };
  big.onwheel = (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.18 : 1 / 1.18); };
  big.onpointerdown = (e) => { big.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }; big.classList.add('drag'); };
  big.onpointermove = (e) => {
    if (!drag || e.pointerId !== drag.id || pinch) return;
    const r = big.getBoundingClientRect(), k = mv.bigRadius * 2 / r.width;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    mv.panX -= dx * k; mv.panZ -= dy * k;
  };
  big.onpointerup = (e) => {
    big.classList.remove('drag');
    if (drag && drag.moved < 6 && !pinch) {
      const wpos = mv.bigToWorld(e.clientX, e.clientY, p);
      const y = g.mobs.surfaceY(Math.floor(wpos.x), Math.floor(wpos.z)) ?? Math.round(p.pos.y);
      addWaypoint(wpos.x, y, wpos.z);
    }
    drag = null;
  };
  big.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), r: mv.bigRadius }; }, { passive: true });
  big.addEventListener('touchmove', (e) => { if (pinch && e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); mv.bigRadius = Math.max(40, Math.min(1400, pinch.r * pinch.d / d)); } }, { passive: true });
  big.addEventListener('touchend', (e) => { if (e.touches.length < 2) setTimeout(() => { pinch = null; }, 50); });
  $('#mapZoomIn').onclick = () => zoom(1 / 1.4); $('#mapZoomOut').onclick = () => zoom(1.4);
  $('#mapCenter').onclick = () => { mv.panX = mv.panZ = 0; };
  $('#mapClose').onclick = () => ctx.toggleBigMap();
  $('#mapWps').onclick = () => { ctx.toggleBigMap(); openWaypoints(); };
  api.mapOpened = () => { if (!meta.mapTip) { meta.mapTip = true; flash('🗺 Arrastrá para moverte, rueda o pellizco para el zoom, y tocá para poner un marcador'); } };

  // ---------- modo foto ----------
  const FILTERS = { normal: ['Normal', ''], calido: ['Cálido', 'sepia(0.25) saturate(1.25) hue-rotate(-8deg)'], frio: ['Frío', 'saturate(0.9) hue-rotate(12deg) brightness(1.03)'],
    sepia: ['Sepia', 'sepia(0.85) contrast(1.05)'], bn: ['Blanco y negro', 'grayscale(1) contrast(1.15)'], drama: ['Dramático', 'contrast(1.35) saturate(1.3) brightness(0.95)'], sueno: ['Ensueño', 'saturate(1.4) brightness(1.08) contrast(0.9) blur(0.4px)'] };
  let pf = 'normal', vign = true, countT = 0, phHour = null, phWeather = null, saved = null;
  const bar = document.createElement('div'); bar.id = 'photoBar'; bar.hidden = true;
  const count = document.createElement('div'); count.id = 'photoCount'; count.hidden = true;
  document.body.append(bar, count);
  function renderBar() {
    bar.innerHTML = `${Object.entries(FILTERS).map(([k, [n]]) => `<button data-f="${k}" class="${k === pf ? 'on' : ''}">${n}</button>`).join('')}
      <button class="vg ${vign ? 'on' : ''}">Viñeta</button><label style="display:flex;align-items:center;gap:4px;margin:0">FOV <input class="pfov" type="range" min="30" max="110" value="${Math.round(p.baseFov || 75)}"></label>
      <label style="display:flex;align-items:center;gap:4px;margin:0">🕒 <input class="phr" type="range" min="0" max="24" step="0.25" value="${phHour ?? Math.round(g.time * 96) / 4}"></label>
      <select class="pwe"><option value="">Clima actual</option>${[['clear', 'Despejado'], ['rain', 'Lluvia'], ['snow', 'Nevada'], ['ash', 'Ceniza'], ['storm', 'Tormenta']].map(([k, n]) => `<option value="${k}" ${phWeather === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <button class="tm">⏱ 3 s</button><button class="gp">🙌 Pose grupal</button><button class="sh primary">📸 Sacar (P)</button><button class="ex">✕ Salir (F2)</button>`;
    bar.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { pf = b.dataset.f; renderBar(); }; });
    bar.querySelector('.vg').onclick = () => { vign = !vign; renderBar(); };
    bar.querySelector('.pfov').oninput = (e) => { p.baseFov = +e.target.value; };
    bar.querySelector('.tm').onclick = () => { countT = 3.2; };
    bar.querySelector('.phr').oninput = (e) => { phHour = +e.target.value; };
    bar.querySelector('.pwe').onchange = (e) => { phWeather = e.target.value || null; };
    bar.querySelector('.gp').onclick = () => { g.together?.groupPose('wave'); countT = 3.2; };
    bar.querySelector('.sh').onclick = () => { g.features.wantPhoto = true; };
    bar.querySelector('.ex').onclick = () => ctx.photoKey?.();
  }
  let wasPhoto = false;
  function photoTick(dt) {
    const on = !!g.features.photo;
    if (on !== wasPhoto) {
      wasPhoto = on; bar.hidden = !on; g.photoFilter = on;
      if (on) { saved = { time: g.time, type: g.weather.type, k: g.weather.k }; phHour = null; phWeather = null; renderBar(); document.exitPointerLock(); } else {
        if (saved) { g.time = saved.time; if (phWeather) { g.weather.type = saved.type; g.weather.k = saved.k; } saved = null; } ctx.renderer.domElement.style.filter = ''; document.querySelector('#vignette').style.opacity = ''; p.baseFov = settings.fov || 75; count.hidden = true; countT = 0; }
    }
    if (!on) return;
    if (phHour != null) g.time = (phHour / 24) % 1;
    if (phWeather) { g.weather.type = phWeather; g.weather.k = phWeather === 'clear' ? 0 : 1; }
    const f = FILTERS[pf][1];
    ctx.renderer.domElement.style.filter = f;
    document.querySelector('#vignette').style.opacity = vign ? 1.6 : 0;
    if (countT > 0) { countT -= dt; count.hidden = false; count.textContent = Math.ceil(countT); if (countT <= 0) { count.hidden = true; g.features.wantPhoto = true; } }
  }
  // la captura con el filtro y la viñeta "horneados" en la imagen
  g.features.capture = () => {
    g.features.wantPhoto = false;
    const src = ctx.renderer.domElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    x.filter = FILTERS[pf][1] || 'none'; x.drawImage(src, 0, 0); x.filter = 'none';
    if (vign) { const gr = x.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.35, c.width / 2, c.height / 2, c.height * 0.85); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,5,0,0.55)'); x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height); }
    x.font = `${Math.round(c.height / 28)}px Silkscreen, monospace`; x.fillStyle = 'rgba(255,240,210,0.55)'; x.textAlign = 'right'; x.fillText('YERMO', c.width - 14, c.height - 12);
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `yermo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`; a.click();
    try { const s = document.createElement('canvas'); s.width = 720; s.height = Math.round(720 * c.height / c.width); s.getContext('2d').drawImage(c, 0, 0, s.width, s.height); if (g.social) g.social.lastPhoto = s.toDataURL('image/jpeg', 0.72); } catch { /* sin copia */ }
    sfx.photo?.(); p.onEvent('photo');
    const fl = $('#photoFlash'); fl.hidden = false; fl.style.opacity = 1; setTimeout(() => { fl.style.opacity = 0; setTimeout(() => (fl.hidden = true), 400); }, 60);
    flash('📸 Foto guardada (y lista para compartir en la galería)');
  };

  // ---------- consejos la primera vez ----------
  meta.tipsSeen = meta.tipsSeen || [];
  const tipEl = $('#tip'); let tipT = 0; const queue = [];
  function tip(key, title, text) {
    if (settings.tips === false || meta.tipsSeen.includes(key)) return;
    meta.tipsSeen.push(key); if (meta.tipsSeen.length > 300) meta.tipsSeen.shift();
    queue.push({ title, text });
  }
  api.tip = tip;
  const ITEM_TIPS = {
    398: ['Caña de pescar', 'Apuntá al agua y clic derecho. Cuando dice «¡Pica!», clic derecho rápido.'], 393: ['Dron', 'Clic derecho para desplegarlo: junta cosas, busca minerales y te avisa del peligro.'],
    370: ['Báculos', 'Clic derecho lanza el hechizo y gasta maná ✦. El maná vuelve solo.'], 26: ['Antorcha', 'En la mano ilumina a tu alrededor; puesta en el piso evita que aparezcan criaturas.'],
    360: ['Montura', 'Domesticá un animal y usala sobre él para montarlo. F sube y baja.'], 345: ['Bote', 'Ponelo en el agua con clic derecho y subite con F.'], 248: ['Plantín', 'Plantalo con lugar arriba: en unos minutos crece un árbol.'],
    394: ['Cohete', 'Clic derecho y ¡fuegos artificiales!'], 227: ['Núcleo del refugio', 'Ponelo en tu base y clic derecho para empezar la defensa por oleadas.'],
  };
  const BLOCK_TIPS = { 25: ['Horno', 'Funde minerales y cocina. Clic derecho para abrirlo.'], 234: ['Mesa de minijuegos', 'Clic derecho para elegir un minijuego.'], 33: ['Catre', 'Dormí para pasar la noche y guardar dónde reaparecés.'],
    219: ['Altar de runas', 'Cerca de él el maná vuelve mucho más rápido y se fabrican báculos y anillos.'], 245: ['Bloque musical', 'Clic derecho lo toca y sube medio tono. Con electricidad suena solo.'], 228: ['Cofre del tesoro', '¡Abrilo! Suele tener fichas y cosas raras.'] };
  let tipAcc = 0, lastBiome = -1, wasNight = false;
  function tipsTick(dt) {
    tipAcc += dt;
    if (tipAcc > 1) {
      tipAcc = 0;
      const b = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
      if (b !== lastBiome) { lastBiome = b; tip('bioma' + b, 'Bioma nuevo', `Llegaste a <b>${esc(BIOME_NAMES[b])}</b>. Mirá la Guía para saber qué hay acá.`); }
      const night = g.time > 0.78 || g.time < 0.22;
      if (night && !wasNight) tip('noche', 'Se hizo de noche', 'Salen más criaturas. Prendé antorchas, quedate cerca de casa o dormí en un catre.');
      wasNight = night;
      const h = g.inv.hand; if (h && ITEM_TIPS[h.id]) tip('item' + h.id, ...ITEM_TIPS[h.id]);
      const t = p.target; if (t && BLOCK_TIPS[t.id]) tip('block' + t.id, ...BLOCK_TIPS[t.id]);
      const m = p.mobTarget?.mob; if (m) tip('mob' + m.type, m.def.name, m.def.hostile ? (m.def.neutral ? 'Es tranquilo hasta que lo molestás.' : 'Es peligroso: atacá con un arma o alejate.') : m.def.npc ? 'Clic derecho para hablar.' : 'Es pacífico. Algunos se pueden domesticar con comida.');
      if (p.health <= 6 && !p.dead) tip('vida', 'Poca vida', 'Comé algo: con la panza llena la vida se recupera sola.');
      if (p.rad > 40) tip('rad', 'Radiación', 'Alejate del brillo verde y tomá anti-radiación si tenés.');
    }
    tipT -= dt;
    if (tipT <= 0) {
      if (queue.length && !ctx.isPhoto?.()) { const q = queue.shift(); tipEl.innerHTML = `<span class="tt">${esc(q.title)}</span>${q.text}`; tipEl.hidden = false; tipT = 7; }
      else tipEl.hidden = true;
    }
  }

  // ---------- HUD: botones táctiles según lo que mirás, daño y mira ----------
  const T = $('#touch'), useB = T?.querySelector('.b-use span'), useBtn = T?.querySelector('.b-use');
  let lastHp = p.health, hudAcc = 0;
  const dmgI = $('#dmgDir i'), dmgBox = $('#dmgDir'), low = $('#lowHp'), xh = $('#crosshair');
  const hitWrap = g.mobs.hit.bind(g.mobs);
  g.mobs.hit = (m, dmg, dir, attacker, ...r) => {
    if (attacker === p) { xh.classList.remove('hit'); void xh.offsetWidth; xh.classList.add('hit'); ctx.input?.buzz?.(6); }
    return hitWrap(m, dmg, dir, attacker, ...r);
  };
  function hudTick(dt) {
    // daño: vibración, flecha de dónde vino el golpe y pulso rojo con poca vida
    if (p.health < lastHp - 0.01) {
      ctx.input?.buzz?.(Math.min(60, 15 + (lastHp - p.health) * 8));
      if (p.lastHit && performance.now() - p.lastHit.t < 300) {
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
        const ang = Math.atan2(fwd.x * p.lastHit.z - fwd.z * p.lastHit.x, fwd.x * p.lastHit.x + fwd.z * p.lastHit.z);
        dmgBox.style.transform = `rotate(${ang}rad)`; dmgI.classList.add('on'); setTimeout(() => dmgI.classList.remove('on'), 350);
      }
    }
    lastHp = p.health;
    low.classList.toggle('on', !p.creative && !p.dead && p.health <= 5);
    xh.classList.toggle('dot', settings.crosshair === 'punto'); xh.classList.toggle('ring', settings.crosshair === 'aro');
    hudAcc += dt; if (hudAcc < 0.2 || !T || T.hidden) return; hudAcc = 0;
    // botón de usar: dice qué va a hacer
    const h = g.hintTxt || '';
    let label = 'Usar', ctxOn = false;
    const mm = h.match(/Clic derecho(?: con una Montura)?: ([^·(/]+)/);
    if (mm) { label = mm[1].trim().split(' ').slice(0, 2).join(' '); ctxOn = true; }
    else { const hand = g.inv.hand; if (hand && isBlock(hand.id)) label = 'Poner'; else if (hand && (ITEMS[hand.id]?.food || ITEMS[hand.id]?.heal)) label = 'Comer'; else if (hand && ITEMS[hand.id]?.spell) label = 'Hechizo'; }
    label = label.charAt(0).toUpperCase() + label.slice(1);
    if (useB.textContent !== label) useB.textContent = label;
    useBtn.classList.toggle('ctx', ctxOn);
    // subir/bajar de vehículos y bajar (vuelo, helicóptero, escaleras, ascensor)
    const R = p.riding;
    const mount = T.querySelector('.b-mount');
    mount.hidden = !(R || p.vehTarget);
    mount.querySelector('span').textContent = R ? 'Bajar' : 'Subir';
    mount.querySelector('i').textContent = R ? '🚶' : '🚗';
    T.querySelector('.b-down').hidden = !(p.flying || p.onLadder || g.features2?.onElevator || (R && (R.type === 'heli' || R.type === 'balloon')) || p.inWater);
    T.querySelector('.b-chat').hidden = !ctx.net?.active;
  }

  // ---------- vista previa del bloque que vas a poner ----------
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false }));
  ghost.visible = false; ghost.renderOrder = 3; ctx.scene.add(ghost);
  const ghostEdge = new THREE.LineSegments(new THREE.EdgesGeometry(ghost.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  ghost.add(ghostEdge);
  let ghostId = -1;
  function ghostTick() {
    const h = g.inv.hand, t = p.target;
    const ok = settings.buildPreview !== false && h && PLACEABLE(h.id) && t && !ctx.ui.open && !p.dead && !ctx.isPhoto?.();
    if (!ok) { ghost.visible = false; return; }
    if (ghostId !== h.id) {
      ghostId = h.id;
      const tex = new THREE.CanvasTexture(ctx.ui.icon(h.id)); tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
      ghost.material.map?.dispose(); ghost.material.map = tex; ghost.material.needsUpdate = true;
    }
    ghost.position.set(t.x + t.face[0] + 0.5, t.y + t.face[1] + 0.5, t.z + t.face[2] + 0.5);
    ghost.material.opacity = 0.28 + Math.sin(performance.now() / 300) * 0.08;
    ghost.visible = true;
  }

  // ---------- deslizar sobre la barra (celular) ----------
  const hb = $('#hotbar'); let swX = null;
  hb.addEventListener('touchstart', (e) => { swX = e.touches[0].clientX; }, { passive: true });
  hb.addEventListener('touchmove', (e) => {
    if (swX == null) return;
    const dx = e.touches[0].clientX - swX;
    if (Math.abs(dx) > 34) { ctx.ui.select((g.inv.selected + (dx > 0 ? 1 : -1) + 9) % 9); swX = e.touches[0].clientX; ctx.input?.buzz?.(5); }
  }, { passive: true });
  hb.addEventListener('touchend', () => { swX = null; });

  // ---------- herramienta automática (opcional) ----------
  function autoTool() {
    if (!settings.autoTool || !p.mouse.left || !p.target || p.creative) return;
    const bt = BLOCKS[p.target.id]; if (!bt?.tool) return;
    let best = -1, bs = -1;
    for (let i = 0; i < 9; i++) { const s = g.inv.slots[i], it = s && ITEMS[s.id]; if (it?.tool === bt.tool) { const sc = (it.tier || 0) * 10 + (it.speed || 0); if (sc > bs) { bs = sc; best = i; } } }
    if (best >= 0 && best !== g.inv.selected) ctx.ui.select(best);
  }

  // ---------- donde moriste ----------
  let wasDead = false;
  function deathMark() {
    if (p.dead && !wasDead) {
      meta.waypoints = meta.waypoints.filter((w) => !w.death);
      meta.waypoints.push({ name: '💀 Donde moriste', color: '#ff6a5a', x: Math.round(p.pos.x), y: Math.round(p.pos.y), z: Math.round(p.pos.z), death: true });
    }
    wasDead = p.dead;
    const d = meta.waypoints.find((w) => w.death);
    if (d && !p.dead && Math.hypot(d.x - p.pos.x, d.z - p.pos.z) < 3) { meta.waypoints.splice(meta.waypoints.indexOf(d), 1); flash('💀 Volviste al lugar donde moriste'); }
  }

  // ---------- huellas en la arena y la nieve ----------
  const prints = [], printGeo = new THREE.PlaneGeometry(0.22, 0.34);
  let stepDist = 0, lastPos = p.pos.clone(), foot = 1;
  function footprints(dt) {
    const d = Math.hypot(p.pos.x - lastPos.x, p.pos.z - lastPos.z); lastPos.copy(p.pos);
    if (p.onGround && !p.riding && d < 1) {
      stepDist += d;
      if (stepDist > 0.75) {
        stepDist = 0;
        const bx = Math.floor(p.pos.x), by = Math.floor(p.pos.y - 0.1), bz = Math.floor(p.pos.z), b = g.world.getBlock(bx, by, bz);
        if (b === 229 || b === 6 || b === 147 || b === 235) {
          const m = new THREE.Mesh(printGeo, new THREE.MeshBasicMaterial({ color: b === 147 || b === 235 ? 0x8890a0 : 0x6a5a40, transparent: true, opacity: 0.45, depthWrite: false }));
          m.rotation.x = -Math.PI / 2; m.rotation.z = p.yaw;
          foot = -foot;
          m.position.set(p.pos.x + Math.cos(p.yaw) * 0.14 * foot, by + 1.012, p.pos.z - Math.sin(p.yaw) * 0.14 * foot);
          m.userData.t = 25; ctx.scene.add(m); prints.push(m);
          if (prints.length > 80) { const o = prints.shift(); ctx.scene.remove(o); o.material.dispose(); }
        }
      }
    }
    for (const m of [...prints]) { m.userData.t -= dt; m.material.opacity = Math.min(0.45, m.userData.t / 25 * 0.45); if (m.userData.t <= 0) { ctx.scene.remove(m); m.material.dispose(); prints.splice(prints.indexOf(m), 1); } }
  }

  // ---------- botones y teclas ----------
  const wb = $('#worldBtns');
  const bw = document.createElement('button'); bw.textContent = '📍 Marcadores'; bw.onclick = () => { $('#pause').hidden = true; ctx.setPause(false); openWaypoints(); }; wb?.appendChild(bw);
  api.key = (e) => { if (e.code === 'KeyN') { api.addHere(); return true; } return false; };
  api.update = (dt) => { drawWaypoints(); photoTick(dt); tipsTick(dt); hudTick(dt); ghostTick(); autoTool(); deathMark(); footprints(dt); };
  api.dispose = () => { ctx.scene.remove(ghost); for (const m of prints) ctx.scene.remove(m); g.mobs.hit = hitWrap; low.classList.remove('on'); bw.remove(); bar.remove(); count.remove(); box.innerHTML = ''; tipEl.hidden = true; ctx.renderer.domElement.style.filter = ''; };
  return api;
}
