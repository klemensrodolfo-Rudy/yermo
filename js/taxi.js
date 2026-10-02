// Taxi v14.4: con el celular pedís un taxi que llega en unos 5 segundos; te subís, elegís un lugar real
// de la ciudad y el taxista te lleva por las calles (el camino se calcula sobre el asfalto del mapa).
// Sólo anda dentro de la ciudad en la que estás (no va de Capital a Hurlingham).
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

function taxiModel() {
  const g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const B = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const black = M(0x17181a), yellow = M(0xf2c418), glass = M(0x6f8ea4, { transparent: true, opacity: 0.55 }), tire = M(0x111111), chrome = M(0xb8bcc2), red = new THREE.MeshBasicMaterial({ color: 0xff3020 }), lightW = new THREE.MeshBasicMaterial({ color: 0xfff4c8 });
  // carrocería negra y techo amarillo, como los taxis porteños
  B(1.78, 0.62, 4.3, black, 0, 0.62, 0);
  B(1.62, 0.5, 2.2, glass, 0, 1.18, 0.15);
  B(1.64, 0.08, 2.15, yellow, 0, 1.46, 0.15);
  // parantes finos (así se ve por las ventanillas) y el techo de adentro
  for (const sx of [-0.8, 0.8]) for (const pz of [-0.92, 0.12, 1.2]) B(0.08, 0.5, 0.1, black, sx, 1.18, pz);
  B(1.56, 0.02, 2.1, new THREE.MeshBasicMaterial({ color: 0x8e8a84 }), 0, 1.41, 0.15);
  // cartel TAXI en el techo
  const c = document.createElement('canvas'); c.width = 128; c.height = 40; const x = c.getContext('2d');
  x.fillStyle = '#f7f3e6'; x.fillRect(0, 0, 128, 40); x.fillStyle = '#111'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('TAXI', 64, 21);
  const tt = new THREE.CanvasTexture(c); tt.colorSpace = THREE.SRGBColorSpace;
  const signM = new THREE.MeshBasicMaterial({ map: tt });
  B(0.7, 0.2, 0.22, signM, 0, 1.6, 0.25);
  // «LIBRE» rojo en el parabrisas
  B(0.3, 0.1, 0.02, red, 0.45, 1.05, -0.96);
  // ruedas, paragolpes y faros
  for (const sx of [-0.86, 0.86]) for (const sz of [-1.35, 1.35]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12), tire); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.33, sz); g.add(w); }
  B(1.8, 0.16, 0.12, chrome, 0, 0.4, -2.18); B(1.8, 0.16, 0.12, chrome, 0, 0.4, 2.18);
  B(0.3, 0.14, 0.04, lightW, -0.6, 0.72, -2.16); B(0.3, 0.14, 0.04, lightW, 0.6, 0.72, -2.16);
  B(0.3, 0.12, 0.04, red, -0.62, 0.72, 2.16); B(0.3, 0.12, 0.04, red, 0.62, 0.72, 2.16);
  // el taxista
  const skin = M(0xc89a74), shirt = M(0x3a4a6a);
  B(0.42, 0.45, 0.32, shirt, -0.4, 1.12, -0.25); B(0.26, 0.28, 0.26, skin, -0.4, 1.5, -0.25);
  return g;
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
  const nearCorner = () => { let best = null; for (const s of D().signs2 || []) { const dd = Math.hypot(s[0] - p.pos.x, s[1] - p.pos.z); if (dd < 90 && (!best || dd < best[0])) best = [dd, s]; } return best ? best[1][2].map((q) => q[0]).join(' y ') : null; };

  // ---------- el taxi ----------
  let car = null, state = null; // state: { mode: 'coming'|'waiting'|'riding'|'leaving', path, s, speed, dest, t }
  function spawn() {
    if (!car) { car = taxiModel(); ctx.scene.add(car); }
    car.visible = true;
  }
  function despawn() { if (car) { ctx.scene.remove(car); car.traverse((o) => { o.geometry?.dispose(); }); car = null; } state = null; }
  function place(x, z, yaw) { car.position.set(x, G, z); car.rotation.y = yaw; }

  function callTaxi() {
    if (!inside(p.pos.x, p.pos.z)) { flash('📵 Sin señal: el taxi sólo anda dentro de la ciudad'); return; }
    if (state) { flash(state.mode === 'coming' ? '🚕 Tu taxi ya está en camino' : '🚕 Tu taxi te está esperando'); return; }
    const pick = nearestRoad(p.pos.x, p.pos.z, 40);
    if (!pick) { flash('🚕 No hay ninguna calle cerca: acercate a una'); return; }
    // viene desde unos 40 m, por la calle, y llega a los 5 segundos
    let path = null;
    for (let k = 0; k < 16 && !path; k++) {
      const a = Math.random() * Math.PI * 2, from = nearestRoad(p.pos.x + Math.cos(a) * 40, p.pos.z + Math.sin(a) * 40, 12);
      if (from && roads().comp[from[0] + from[1] * roads().W] === roads().comp[pick[0] + pick[1] * roads().W]) { const r = route(from, pick); if (r && r.total > 20 && r.total < 60) path = r; }
    }
    if (!path) { const w0 = toWorld(...pick); path = { pts: [[w0[0], w0[1] - 1], w0], len: [0, 1], total: 1 }; }
    state = { mode: 'coming', path, s: 0, speed: 10, wait: Math.max(0, 5 - path.total / 10), t: 0 };
    flash('📱 Pediste un taxi: llega en unos 5 segundos');
    ctx.closeInventory();
  }

  function openDestinations() {
    const d = D(), list0 = d.pois || [], fav = FEATURED[d.region] || [];
    ctx.openPanel('🚕 ¿A dónde vamos?', (list) => {
      const dist = (x, z) => Math.hypot(x - p.pos.x, z - p.pos.z);
      const km = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
      list.insertAdjacentHTML('beforeend', '<p class="muted">Elegí un lugar y el taxista te lleva por las calles. Con el celular podés llegar al instante o bajarte antes.</p><input class="q" placeholder="Buscar un lugar…" style="width:100%;font-size:18px;margin-bottom:8px"><div class="res"></div>');
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
    if (!path) { flash('🚕 «Uy, para ahí no sé cómo llegar»'); return; }
    state = { mode: 'riding', path, s: 0, speed: 0, dest: { x, z, name } };
    const min = Math.max(1, Math.round(path.total / 13 / 60));
    flash(`🚕 Vamos a ${name} · ${(path.total / 1000).toFixed(1).replace('.', ',')} km, unos ${min} min (con el celular podés llegar ya)`);
    ctx.closeInventory();
    seat();
  }
  function seat() {
    // asiento de atrás, del lado de la vereda
    const yaw = car.rotation.y, rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    p.sitting = { x: car.position.x + rx * 0.4 - fx * 0.55, y: G + 0.15, z: car.position.z + rz * 0.4 - fz * 0.55 };
    p.flying = false;
  }
  function arrive(early) {
    const d = state.dest;
    p.sitting = null;
    const [sx, sz] = sidewalkNear(car.position.x, car.position.z);
    p.pos.set(sx, G, sz); p.vel?.set?.(0, 0, 0);
    flash(early ? '🚕 Te bajaste del taxi' : `🚕 Llegamos a ${d.name}. ¡Que lo disfrutes!`);
    state = { mode: 'leaving', t: 0, path: state.path, s: state.s, speed: 8 };
  }

  function openPhone() {
    ctx.openPanel('📱 Celular', (list) => {
      if (!inside(p.pos.x, p.pos.z)) { list.insertAdjacentHTML('beforeend', '<p>📵 Sin señal. El taxi sólo anda dentro de la ciudad.</p>'); return; }
      const corner = nearCorner();
      if (corner) list.insertAdjacentHTML('beforeend', `<p>📍 Estás cerca de <b>${esc(corner)}</b></p>`);
      const add = (label, fn) => { const b = document.createElement('button'); b.className = 'primary'; b.style.cssText = 'display:block;width:100%;margin:6px 0;font-size:18px'; b.textContent = label; b.onclick = fn; list.appendChild(b); };
      if (state?.mode === 'riding') {
        list.insertAdjacentHTML('beforeend', `<p>🚕 En viaje a <b>${esc(state.dest.name)}</b> · faltan ${Math.max(0, Math.round((state.path.total - state.s) / 100) / 10).toString().replace('.', ',')} km</p>`);
        add('⏩ Llegar ya', () => { ctx.closeInventory(); state.s = state.path.total - 1; });
        add('🚪 Bajarme acá', () => { ctx.closeInventory(); arrive(true); });
      } else if (state?.mode === 'waiting') {
        add('🚕 Elegir a dónde ir', () => { ctx.closeInventory(); if (Math.hypot(car.position.x - p.pos.x, car.position.z - p.pos.z) < 8) { seat(); setTimeout(openDestinations, 50); } else flash('🚕 Acercate al taxi para subirte'); });
        add('❌ Cancelar el taxi', () => { ctx.closeInventory(); state = { mode: 'leaving', t: 0, path: null, s: 0, speed: 6 }; });
      } else if (state?.mode === 'coming') list.insertAdjacentHTML('beforeend', '<p>🚕 Tu taxi está llegando…</p>');
      else add('🚕 Pedir un taxi', callTaxi);
    });
  }

  api.update = (dt) => {
    if (!state) return;
    if (state.mode === 'coming') {
      state.t += dt;
      if (state.t < state.wait) return;
      spawn();
      state.s = Math.min(state.path.total, state.s + state.speed * dt);
      const q = at(state.path, state.s); place(q.x, q.z, q.yaw);
      if (state.s >= state.path.total) { state = { mode: 'waiting', t: 0 }; flash('🚕 Llegó tu taxi: acercate para subirte'); sfx.click?.(); }
      return;
    }
    if (state.mode === 'waiting') {
      state.t += dt;
      // al acercarse se sube solo (si se baja sin elegir, espera unos segundos antes de volver a ofrecer)
      if (!p.sitting) state.cd = Math.max(0, (state.cd || 0) - dt);
      if (!state.cd && Math.hypot(car.position.x - p.pos.x, car.position.z - p.pos.z) < 3.5 && !p.sitting && !p.riding) { seat(); openDestinations(); state.t = 0; state.cd = 5; }
      if (state.t > 120 && !p.sitting) { flash('🚕 El taxi se cansó de esperar y se fue'); state = { mode: 'leaving', t: 0, path: null, s: 0, speed: 6 }; }
      return;
    }
    if (state.mode === 'riding') {
      if (!p.sitting) { arrive(true); return; } // se bajó (saltó o caminó)
      const left = state.path.total - state.s;
      const target = Math.min(14, 3 + left * 0.5);
      state.speed += Math.max(-8 * dt, Math.min(4 * dt, target - state.speed));
      state.s = Math.min(state.path.total, state.s + state.speed * dt);
      const q = at(state.path, state.s);
      let dy = q.yaw - car.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      place(q.x, q.z, car.rotation.y + dy * Math.min(1, dt * 6));
      seat();
      if (left < 0.6) arrive(false);
      return;
    }
    if (state.mode === 'leaving') {
      state.t += dt;
      if (!car) { state = null; return; }
      const yaw = car.rotation.y; car.position.x -= Math.sin(yaw) * state.speed * dt; car.position.z -= Math.cos(yaw) * state.speed * dt;
      if (state.t > 6) despawn();
    }
  };
  api.openPhone = openPhone; api.call = callTaxi; api.go = go; api.state = () => state; api.car = () => car;
  api.dispose = () => { if (p.sitting && state?.mode === 'riding') p.sitting = null; despawn(); };
  return api;
}
