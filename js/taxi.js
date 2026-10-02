// Carruaje v14.6 (antes taxi): con el celular pedís un mateo tirado por un caballo que llega en unos 5 segundos;
// te sentás en el pescante al lado del cochero, elegís un lugar real de la ciudad y te lleva por las calles
// (el camino se calcula sobre el asfalto del mapa). Sólo anda dentro de la ciudad en la que estás.
import * as THREE from 'three';
import { getBA, isReal } from './badata.js';
import { GROUND } from './porteno.js';
import { makeRoutes } from './taxiroute.js';

const FOOT = new Set([0, 2, 4]); // vereda, pasto, plaza
const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
// los lugares más buscados de cada ciudad (con el nombre que tienen en el mapa)
const FEATURED = {
  ba: [['🏛 Casa Rosada', /^Museo Casa Rosada$/], ['🗼 Obelisco', /^Obelisco$/], ['🎭 Teatro Colón', /^Teatro Colón$/], ['⛪ Catedral Metropolitana', /^Catedral Metropolitana$/], ['🏛 Cabildo', /^Cabildo de Buenos Aires$/], ['🌳 Plaza de Mayo', /^Plaza de Mayo$/], ['🏛 Congreso', /^Congreso de la Nación Argentina$/], ['🌉 Puerto Madero · Puente de la Mujer', /^Puente de la Mujer$/], ['⛵ Fragata Sarmiento (Puerto Madero)', /Fragata/], ['🏢 Palacio Barolo', /^Palacio Barolo$/], ['🛍 Galerías Pacífico', /^Galerías Pacífico$/], ['🌳 Plaza San Martín', /^Plaza San Martín$/], ['🏢 Edificio Kavanagh', /Kavanagh/], ['🚆 Estación Retiro (Mitre)', /^Retiro \(Mitre\)$/]],
  hurlingham: [['⛪ Iglesia Santa Trinidad', /^Iglesia Santa Trinidad$/], ['🌳 Plaza Ravenscroft', /Ravencroft/], ['🚆 Estación Hurlingham (San Martín)', /^Hurlingham$/, 'tren'], ['🚆 Estación Rubén Darío (Urquiza)', /^Rubén Darío$/], ['🚆 Estación Jorge Newbery (Urquiza)', /^Jorge Newbery$/], ['🐎 Hipódromo de trote', /^Hipódromo de trote$/], ['⛳ Hurlingham Club', /^Hurlingham Club$/]],
};
const GROUPS = [['tren', '🚆 Estaciones de tren'], ['subte', '🚇 Estaciones de subte'], ['plaza', '🌳 Plazas y parques'], ['iglesia', '⛪ Iglesias'], ['barrio', '🏘 Barrios'], ['lugar', '📍 Otros lugares']];

// Mateo porteño: carruaje negro con capota y pescante, tirado por un caballo; el cochero con galera
function carriageModel() {
  const g = new THREE.Group();
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const B = (w, h, d, m, x, y, z, parent = g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };
  const black = M(0x1b1a1c), leather = M(0x3a2a22), red = M(0x7a2a2a), brass = M(0xc9a548), wood = M(0x5a3a22), spokeM = M(0x2a2826);
  // caja de los pasajeros, con el asiento tapizado y la capota plegada atrás
  B(1.4, 0.75, 1.9, black, 0, 1.05, 0.45);
  B(1.2, 0.18, 1.2, red, 0, 1.45, 0.75);
  B(1.2, 0.55, 0.15, red, 0, 1.75, 1.32);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.42, 12, 1, false, 0, Math.PI), leather); hood.rotation.set(0, 0, Math.PI / 2); hood.position.set(0, 1.75, 1.35); g.add(hood);
  B(1.46, 0.06, 0.06, brass, 0, 1.44, -0.5);
  // el pescante, adelante y alto, con el apoyapiés
  B(1.3, 0.12, 0.7, leather, 0, 1.7, -0.75);
  B(1.3, 0.45, 0.1, black, 0, 1.95, -0.42);
  B(1.3, 0.75, 0.6, black, 0, 1.25, -0.75);
  B(1.2, 0.08, 0.6, wood, 0, 0.95, -1.25);
  // las varas que van al caballo
  for (const sx of [-0.55, 0.55]) { const v = B(0.07, 0.07, 2.8, wood, sx, 1.05, -2.4); v.rotation.x = -0.05; }
  // ruedas con rayos: grandes atrás, chicas adelante (giran con el viaje)
  const wheels = [];
  const wheel = (r, x, z) => {
    const w = new THREE.Group(); w.position.set(x, r, z); g.add(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.04, 0.045, 6, 20), black); rim.rotation.y = Math.PI / 2; w.add(rim);
    for (let k = 0; k < 6; k++) { const s = B(0.04, (r - 0.06) * 2, 0.04, spokeM, 0, 0, 0, w); s.rotation.x = (k * Math.PI) / 6; }
    B(0.12, 0.12, 0.12, brass, 0, 0, 0, w);
    wheels.push({ w, r });
  };
  wheel(0.78, 0.8, 0.85); wheel(0.78, -0.8, 0.85); wheel(0.52, 0.72, -0.85); wheel(0.52, -0.72, -0.85);
  // faroles de bronce a los costados del pescante
  for (const sx of [-0.72, 0.72]) B(0.14, 0.22, 0.14, brass, sx, 1.95, -1.05);
  // el cochero (del lado izquierdo; el pasajero va a su derecha)
  const coat = M(0x22252c), skin = M(0xc89a74);
  B(0.42, 0.55, 0.32, coat, -0.32, 2.05, -0.72); B(0.24, 0.26, 0.24, skin, -0.32, 2.45, -0.72);
  B(0.34, 0.03, 0.34, black, -0.32, 2.59, -0.72); B(0.22, 0.24, 0.22, black, -0.32, 2.72, -0.72);
  B(0.12, 0.08, 0.5, coat, -0.32, 1.95, -0.98);
  return { g, wheels };
}
function horseModel() {
  const h = new THREE.Group();
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const coat = M(0x7a4a28), dark = M(0x2e1d12), strap = M(0x1a1a1a), hoof = M(0x2a2420);
  const B = (w, ht, d, m, x, y, z, parent = h) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, ht, d), m); o.position.set(x, y, z); parent.add(o); return o; };
  B(0.56, 0.72, 1.8, coat, 0, 1.38, 0);
  const neck = B(0.36, 0.95, 0.46, coat, 0, 1.85, -0.92); neck.rotation.x = -0.55;
  const head = B(0.3, 0.32, 0.7, coat, 0, 2.18, -1.35); head.rotation.x = 0.35;
  B(0.08, 0.16, 0.06, coat, 0.1, 2.4, -1.18); B(0.08, 0.16, 0.06, coat, -0.1, 2.4, -1.18);
  const mane = B(0.1, 0.8, 0.14, dark, 0, 2.02, -0.86); mane.rotation.x = -0.55;
  const tail = B(0.14, 0.75, 0.14, dark, 0, 1.2, 0.98); tail.rotation.x = 0.35;
  B(0.6, 0.12, 0.5, strap, 0, 1.6, -0.35); B(0.62, 0.08, 0.08, strap, 0, 1.45, -0.75);
  const legs = [];
  for (const [x, z, ph] of [[0.18, -0.7, 0], [-0.18, -0.7, Math.PI], [0.18, 0.7, Math.PI], [-0.18, 0.7, 0]]) {
    const L = new THREE.Group(); L.position.set(x, 1.05, z); h.add(L);
    B(0.15, 0.95, 0.17, coat, 0, -0.48, 0, L); B(0.17, 0.1, 0.19, hoof, 0, -0.98, 0, L);
    legs.push({ L, ph });
  }
  return { h, legs };
}

export function createTaxi(ctx) {
  const { game: g, flash, sfx } = ctx;
  const p = g.player, meta = g.meta, inv = g.inv;
  const api = { onUseItem: () => false, update: () => {}, dispose: () => {} };
  const real = isReal(meta.worldType);
  // en los mundos reales se arranca con el celular (y se lo damos a los que ya tenían el mundo)
  if (real && !meta.phoneGift) { meta.phoneGift = true; if (!inv.count(445)) inv.add(445, 1); }
  api.onUseItem = (hand, it) => { if (!it.phone) return false; p.useCd = 0.5; p.mouse.right = false; openPhone(); return true; };
  if (!real) return api;
  const D = () => getBA();
  const G = GROUND + 1;
  const inside = (x, z) => { const d = D(); return !!d && x >= d.x0 + 4 && z >= d.z0 + 4 && x < d.x0 + d.w - 4 && z < d.z0 + d.h - 4; };

  // ---------- calles y caminos (ver taxiroute.js) ----------
  let RG = null;
  const roads = () => (RG ||= makeRoutes(D()));
  const toCell = (x, z) => roads().toCell(x, z), toWorld = (i, j) => roads().toWorld(i, j);
  const nearestRoad = (x, z, maxR, same) => roads().nearestRoad(x, z, maxR, same);
  const route = (from, to) => roads().route(from, to);
  function at(path, s) {
    const { pts, len } = path; let i = 1; while (i < pts.length - 1 && len[i] < s) i++;
    const a = pts[i - 1], b = pts[i], seg = len[i] - len[i - 1] || 1, t = Math.max(0, Math.min(1, (s - len[i - 1]) / seg));
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) };
  }
  function sidewalkNear(x, z) {
    const d = D();
    for (let r = 1; r < 40; r++) for (let a = 0; a < 24; a++) {
      const sx = Math.round(x + Math.cos(a / 24 * Math.PI * 2) * r), sz = Math.round(z + Math.sin(a / 24 * Math.PI * 2) * r), i = sx - d.x0 + (sz - d.z0) * d.w;
      if (i >= 0 && i < d.cls.length && FOOT.has(d.cls[i]) && g.world.getBlock(sx, G, sz) === 0 && g.world.getBlock(sx, G + 1, sz) === 0) return [sx + 0.5, sz + 0.5];
    }
    return [x, z];
  }
  // ---------- indicaciones del viaje, como un GPS pero sin mapa ----------
  const streetAt = (x, z) => {
    const d = D(); if (!d.nameGrid) return '';
    const NW = Math.ceil(d.w / d.ns), i0 = Math.floor((x - d.x0) / d.ns), j0 = Math.floor((z - d.z0) / d.ns);
    for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const v = d.nameGrid[i0 + a + (j0 + b) * NW]; if (v) return d.streets[v]; }
    return '';
  };
  const short = (n) => n.replace(/^Avenida /, 'Av. ');
  const dist = (m) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
  // tramos del recorrido con el mismo nombre de calle y las maniobras entre ellos
  function steps(path) {
    const runs = [];
    for (let s = 0; s <= path.total; s += 3) {
      const q = at(path, s), n = streetAt(q.x, q.z);
      if (!n) { if (runs.length) runs.at(-1).s1 = s; continue; }
      if (runs.length && runs.at(-1).name === n) runs.at(-1).s1 = s; else runs.push({ name: n, s0: s, s1: s });
    }
    // los tramos muy cortos son cruces: se juntan con el anterior
    const out = [];
    for (const r of runs) { if (out.length && (r.s1 - r.s0 < 12 || out.at(-1).name === r.name)) { out.at(-1).s1 = r.s1; continue; } out.push({ ...r }); }
    const dir = (s) => { const a = at(path, Math.max(0, s - 2)), b = at(path, Math.min(path.total, s + 2)); const L = Math.hypot(b.x - a.x, b.z - a.z) || 1; return [(b.x - a.x) / L, (b.z - a.z) / L]; };
    for (let i = 1; i < out.length; i++) {
      const s = out[i].s0, [ax, az] = dir(s - 10), [bx, bz] = dir(s + 10), cross = az * bx - ax * bz, dot = ax * bx + az * bz;
      out[i].turn = dot > 0.87 ? 'sigue' : cross > 0 ? 'izquierda' : 'derecha';
    }
    return out;
  }
  let gpsEl = null, gpsT = 0;
  function gps(dt) {
    if (state?.mode !== 'riding') { if (gpsEl) { gpsEl.remove(); gpsEl = null; } return; }
    gpsT -= dt; if (gpsT > 0) return; gpsT = 0.25;
    if (!gpsEl) {
      gpsEl = document.createElement('div');
      gpsEl.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(18,20,24,.62);color:#fff;font:14px/1.35 system-ui,sans-serif;padding:6px 14px;border-radius:10px;pointer-events:none;z-index:30;text-align:center;max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      document.body.appendChild(gpsEl);
    }
    const S = state.steps || (state.steps = steps(state.path)), s = state.s;
    let k = S.findIndex((r) => s < r.s1); if (k < 0) k = S.length - 1;
    const cur = S[k], next = S[k + 1], left = state.path.total - s;
    const arrow = { izquierda: '↰', derecha: '↱', sigue: '↑' };
    let line2;
    if (next) line2 = next.turn === 'sigue' ? `${arrow.sigue} En ${dist(next.s0 - s)} seguí por <b>${esc(short(next.name))}</b>` : `${arrow[next.turn]} En ${dist(next.s0 - s)} doblá a la ${next.turn} en <b>${esc(short(next.name))}</b>`;
    else line2 = `🏁 En ${dist(left)} llegás a <b>${esc(state.dest.name)}</b>`;
    gpsEl.innerHTML = `${cur ? `Por <b>${esc(short(cur.name))}</b> · ` : ''}${line2}<br><small style="opacity:.8">🐎 ${esc(state.dest.name)} · faltan ${dist(left)} · unos ${Math.max(1, Math.round(left / 6 / 60))} min</small>`;
  }

  const nearCorner = () => { let best = null; for (const s of D().signs2 || []) { const dd = Math.hypot(s[0] - p.pos.x, s[1] - p.pos.z); if (dd < 90 && (!best || dd < best[0])) best = [dd, s]; } return best ? best[1][2].map((q) => q[0]).join(' y ') : null; };

  // ---------- el carruaje ----------
  let car = null, CM = null, HM = null, state = null, trip = 0; // state: { mode: 'coming'|'waiting'|'riding'|'leaving', path, s, speed, dest, t }
  function spawn() {
    if (!car) { CM = carriageModel(); HM = horseModel(); car = CM.g; ctx.scene.add(car, HM.h); }
    car.visible = HM.h.visible = true;
  }
  function despawn() { if (car) { ctx.scene.remove(car, HM.h); for (const o of [car, HM.h]) o.traverse((q) => { q.geometry?.dispose(); }); car = CM = HM = null; } state = null; }
  // el carruaje en (x, z); el caballo 3,4 m adelante, siguiendo el camino si lo hay
  function place(x, z, yaw, path, s, moved = 0) {
    car.position.set(x, G, z); car.rotation.y = yaw;
    let hx = x - Math.sin(yaw) * 3.4, hz = z - Math.cos(yaw) * 3.4, hy = yaw;
    if (path && s + 3.4 <= path.total) { const q = at(path, s + 3.4); hx = q.x; hz = q.z; hy = Math.atan2(-(q.x - x), -(q.z - z)); }
    HM.h.position.set(hx, G, hz); HM.h.rotation.y = hy;
    // al trote: patas y ruedas según lo recorrido
    trip += moved;
    const sw = Math.min(1, moved * 40);
    for (const { L, ph } of HM.legs) L.rotation.x = Math.sin(trip * 2.4 + ph) * 0.55 * sw;
    for (const { w, r } of CM.wheels) w.rotation.x = -trip / r;
  }

  function callTaxi() {
    if (!inside(p.pos.x, p.pos.z)) { flash('📵 Sin señal: el carruaje sólo anda dentro de la ciudad'); return; }
    if (state) { flash(state.mode === 'coming' ? '🐎 Tu carruaje ya está en camino' : '🐎 Tu carruaje te está esperando'); return; }
    const pick = nearestRoad(p.pos.x, p.pos.z, 40);
    if (!pick) { flash('🐎 No hay ninguna calle cerca: acercate a una'); return; }
    // viene al trote desde unos 25 m, por la calle, y llega a los 5 segundos
    let path = null;
    for (let k = 0; k < 16 && !path; k++) {
      const a = Math.random() * Math.PI * 2, from = nearestRoad(p.pos.x + Math.cos(a) * 25, p.pos.z + Math.sin(a) * 25, 10);
      if (from && roads().comp[from[0] + from[1] * roads().W] === roads().comp[pick[0] + pick[1] * roads().W]) { const r = route(from, pick); if (r && r.total > 12 && r.total < 32) path = r; }
    }
    if (!path) { const w0 = toWorld(...pick); path = { pts: [[w0[0], w0[1] - 1], w0], len: [0, 1], total: 1 }; }
    state = { mode: 'coming', path, s: 0, speed: 6, wait: Math.max(0, 5 - path.total / 6), t: 0 };
    flash('📱 Pediste un carruaje: llega en unos 5 segundos');
    ctx.closeInventory();
  }

  function openDestinations() {
    const d = D(), list0 = d.pois || [], fav = FEATURED[d.region] || [];
    ctx.openPanel('🐎 ¿A dónde vamos?', (list) => {
      const dist = (x, z) => Math.hypot(x - p.pos.x, z - p.pos.z);
      const km = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
      list.insertAdjacentHTML('beforeend', '<p class="muted">Elegí un lugar y el cochero te lleva al trote por las calles. Vas en el pescante, mirando todo. Con el celular podés llegar al instante o bajarte antes.</p><input class="q" placeholder="Buscar un lugar…" style="width:100%;font-size:18px;margin-bottom:8px"><div class="res"></div>');
      const res = list.querySelector('.res'), q = list.querySelector('.q');
      const btn = (label, x, z, name) => { const b = document.createElement('button'); b.style.cssText = 'display:block;width:100%;text-align:left;margin:3px 0'; b.innerHTML = `${esc(label)} <small class="muted">· ${km(dist(x, z))}</small>`; b.onclick = () => go(x, z, name); return b; };
      const draw = () => {
        res.innerHTML = '';
        const f = q.value.trim().toLowerCase();
        const match = (n) => !f || n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(f.normalize('NFD').replace(/[̀-ͯ]/g, ''));
        const featured = fav.map(([label, re, kind]) => [label, list0.find((o) => re.test(o[2]) && (!kind || o[3] === kind))]).filter(([label, o]) => o && match(label));
        if (featured.length) { res.insertAdjacentHTML('beforeend', '<h3>⭐ Los más buscados</h3>'); for (const [label, o] of featured) res.appendChild(btn(label, o[0], o[1], label.replace(/^\S+\s/, ''))); }
        for (const [kind, title] of GROUPS) {
          const items = list0.filter((o) => (o[3] || 'lugar') === kind && match(o[2])).sort((a, b) => a[2].localeCompare(b[2], 'es'));
          if (!items.length) continue;
          res.insertAdjacentHTML('beforeend', `<h3>${title}</h3>`);
          for (const o of items) res.appendChild(btn(o[2], o[0], o[1], o[2]));
        }
        if (!res.children.length) res.innerHTML = '<p class="empty">No encontré ese lugar en esta ciudad.</p>';
      };
      q.addEventListener('keydown', (e) => e.stopPropagation());
      q.addEventListener('input', draw);
      draw();
    });
  }

  function go(x, z, name) {
    if (!state || state.mode !== 'waiting') return;
    const from = nearestRoad(car.position.x, car.position.z, 10) || toCell(car.position.x, car.position.z), to = nearestRoad(x, z, 150, from);
    const path = to && route(from, to);
    if (!path) { flash('🐎 «Uy, para ahí no sé cómo llegar»'); return; }
    state = { mode: 'riding', path, s: 0, speed: 0, dest: { x, z, name } };
    const min = Math.max(1, Math.round(path.total / 6 / 60));
    flash(`🐎 Vamos a ${name} · ${(path.total / 1000).toFixed(1).replace('.', ',')} km, unos ${min} min (con el celular podés llegar ya)`);
    ctx.closeInventory();
    seat();
  }
  function seat() {
    // en el pescante, a la derecha del cochero (bien alto, para ver el paisaje)
    const yaw = car.rotation.y, rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    p.sitting = { x: car.position.x + rx * 0.32 + fx * 0.72, y: G + 1.76, z: car.position.z + rz * 0.32 + fz * 0.72 };
    p.flying = false;
  }
  function arrive(early) {
    const d = state.dest;
    p.sitting = null;
    const [sx, sz] = sidewalkNear(car.position.x, car.position.z);
    p.pos.set(sx, G, sz); p.vel?.set?.(0, 0, 0);
    flash(early ? '🐎 Te bajaste del carruaje' : `🐎 Llegamos a ${d.name}. ¡Que lo disfrutes!`);
    state = { mode: 'leaving', t: 0, path: state.path, s: state.s, speed: 5 };
  }

  function openPhone() {
    ctx.openPanel('📱 Celular', (list) => {
      if (!inside(p.pos.x, p.pos.z)) { list.insertAdjacentHTML('beforeend', '<p>📵 Sin señal. El carruaje sólo anda dentro de la ciudad.</p>'); return; }
      const corner = nearCorner();
      if (corner) list.insertAdjacentHTML('beforeend', `<p>📍 Estás cerca de <b>${esc(corner)}</b></p>`);
      const add = (label, fn) => { const b = document.createElement('button'); b.className = 'primary'; b.style.cssText = 'display:block;width:100%;margin:6px 0;font-size:18px'; b.textContent = label; b.onclick = fn; list.appendChild(b); };
      if (state?.mode === 'riding') {
        list.insertAdjacentHTML('beforeend', `<p>🐎 En viaje a <b>${esc(state.dest.name)}</b> · faltan ${Math.max(0, Math.round((state.path.total - state.s) / 100) / 10).toString().replace('.', ',')} km</p>`);
        add('⏩ Llegar ya', () => { ctx.closeInventory(); state.s = state.path.total - 1; });
        add('🚪 Bajarme acá', () => { ctx.closeInventory(); arrive(true); });
      } else if (state?.mode === 'waiting') {
        add('🐎 Elegir a dónde ir', () => { ctx.closeInventory(); if (Math.hypot(car.position.x - p.pos.x, car.position.z - p.pos.z) < 8) { seat(); setTimeout(openDestinations, 50); } else flash('🐎 Acercate al carruaje para subirte'); });
        add('❌ Cancelar el carruaje', () => { ctx.closeInventory(); state = { mode: 'leaving', t: 0, path: null, s: 0, speed: 6 }; });
      } else if (state?.mode === 'coming') list.insertAdjacentHTML('beforeend', '<p>🐎 Tu carruaje está llegando…</p>');
      else add('🐎 Pedir un carruaje', callTaxi);
    });
  }

  api.update = (dt) => {
    gps(dt);
    if (!state) return;
    if (state.mode === 'coming') {
      state.t += dt;
      if (state.t < state.wait) return;
      spawn();
      const s0 = state.s; state.s = Math.min(state.path.total, state.s + state.speed * dt);
      const q = at(state.path, state.s); place(q.x, q.z, q.yaw, state.path, state.s, state.s - s0);
      if (state.s >= state.path.total) { state = { mode: 'waiting', t: 0 }; flash('🐎 Llegó tu carruaje: acercate para subirte al pescante'); sfx.click?.(); }
      return;
    }
    if (state.mode === 'waiting') {
      state.t += dt;
      // al acercarse se sube solo (si se baja sin elegir, espera unos segundos antes de volver a ofrecer)
      if (!p.sitting) state.cd = Math.max(0, (state.cd || 0) - dt);
      if (!state.cd && Math.hypot(car.position.x - p.pos.x, car.position.z - p.pos.z) < 3.5 && !p.sitting && !p.riding) { seat(); openDestinations(); state.t = 0; state.cd = 5; }
      if (state.t > 120 && !p.sitting) { flash('🐎 El cochero se cansó de esperar y se fue'); state = { mode: 'leaving', t: 0, path: null, s: 0, speed: 6 }; }
      return;
    }
    if (state.mode === 'riding') {
      if (!p.sitting) { arrive(true); return; } // se bajó (saltó o caminó)
      const left = state.path.total - state.s;
      // al trote: unos 6 m/s (más despacio al llegar)
      const target = Math.min(6, 1.5 + left * 0.4);
      state.speed += Math.max(-4 * dt, Math.min(2 * dt, target - state.speed));
      const s0 = state.s; state.s = Math.min(state.path.total, state.s + state.speed * dt);
      const q = at(state.path, state.s);
      let dy = q.yaw - car.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      place(q.x, q.z, car.rotation.y + dy * Math.min(1, dt * 4), state.path, state.s, state.s - s0);
      seat();
      if (left < 0.6) arrive(false);
      return;
    }
    if (state.mode === 'leaving') {
      state.t += dt;
      if (!car) { state = null; return; }
      const yaw = car.rotation.y; place(car.position.x - Math.sin(yaw) * state.speed * dt, car.position.z - Math.cos(yaw) * state.speed * dt, yaw, null, 0, state.speed * dt);
      if (state.t > 6) despawn();
    }
  };
  api.openPhone = openPhone; api.call = callTaxi; api.go = go; api.state = () => state; api.car = () => car;
  api.dispose = () => { if (p.sitting && state?.mode === 'riding') p.sitting = null; despawn(); gpsEl?.remove(); };
  return api;
}
