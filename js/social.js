// Social v9.7: buzón y marcas del mapa (mundos del grupo), galería de fotos y aventuras hechas por los jugadores.
import * as THREE from 'three';
import { Cloud, pack, unpack } from './cloud.js';
import { CHUNK, HEIGHT, itemName, ITEMS } from './blocks.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const hasSession = () => { try { return !!localStorage.getItem('yermo-cloud-auth'); } catch { return false; } };
async function login() {
  if (!hasSession()) throw new Error('Entrá con tu cuenta en ☁ Mundo del grupo (menú principal) para usar esto.');
  const u = await Cloud.init();
  if (!u) throw new Error('Tu sesión venció: entrá de nuevo en ☁ Mundo del grupo.');
  return u;
}
const ADV = { start: 249, cp: 250, trophy: 251, finish: 252 };

function overlay(id, title) {
  let ov = document.getElementById(id);
  if (!ov) {
    ov = document.createElement('div'); ov.id = id; ov.className = 'overlay';
    ov.innerHTML = `<div class="card" style="width:min(560px,100%)"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">${title}</h2><button class="ovClose">Cerrar</button></div><div class="ovBody" style="margin-top:8px"></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('.ovClose').onclick = () => { ov.hidden = true; ov.onclose?.(); };
  }
  ov.hidden = false;
  return ov;
}

// ---------- galería ----------
export async function openGallery(last, worldName, onclose) {
  const ov = overlay('gallery', '🖼 Galería del grupo'); ov.onclose = onclose;
  const B = ov.querySelector('.ovBody');
  B.innerHTML = '<p class="muted">Cargando…</p>';
  try { await login(); } catch (e) { B.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const render = async () => {
    B.innerHTML = '';
    if (last) {
      const box = document.createElement('div'); box.className = 'quest';
      box.innerHTML = `<p><b>Tu última foto</b></p><img src="${last}" style="width:100%;border:2px solid #000"><div class="row2"><input class="cap" maxlength="80" placeholder="Epígrafe (opcional)"><button class="share primary">Compartir</button></div>`;
      box.querySelector('.cap').addEventListener('keydown', (e) => e.stopPropagation());
      box.querySelector('.share').onclick = async (e) => {
        e.target.disabled = true;
        try { await Cloud.addPhoto(last, box.querySelector('.cap').value.trim(), worldName); last = null; render(); }
        catch (er) { e.target.disabled = false; alert('No se pudo subir: ' + er.message); }
      };
      B.appendChild(box);
    } else B.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Sacá una foto con el modo foto (F2 y después P) y compartila desde acá.</p>');
    const list = document.createElement('div'); list.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px'; B.appendChild(list);
    try {
      const ph = await Cloud.photos(40);
      if (!ph.length) list.innerHTML = '<p class="empty">Todavía no hay fotos.</p>';
      for (const f of ph) {
        const c = document.createElement('div');
        c.innerHTML = `<img src="${f.image}" style="width:100%;cursor:pointer;border:2px solid #000"><small><b>${esc(f.name)}</b>${f.caption ? ': ' + esc(f.caption) : ''}<br>${new Date(f.created_at).toLocaleDateString()}${f.user_id === Cloud.user.id ? ' · <a href="#" class="del">borrar</a>' : ''}</small>`;
        c.querySelector('img').onclick = () => { const w = window.open(); if (w) w.document.write(`<img src="${f.image}" style="max-width:100%">`); };
        c.querySelector('.del')?.addEventListener('click', async (e) => { e.preventDefault(); if (confirm('¿Borrar esta foto?')) { await Cloud.deletePhoto(f.id); render(); } });
        list.appendChild(c);
      }
    } catch (e) { list.innerHTML = `<p class="empty">No se pudo cargar (${esc(e.message)}). ¿Ya corriste el SQL nuevo en Supabase?</p>`; }
  };
  render();
}

// ---------- aventuras: listado y jugar ----------
export async function openAdventures({ startGame, Storage }) {
  const ov = overlay('adventures', '🗺 Aventuras de la comunidad');
  const B = ov.querySelector('.ovBody');
  B.innerHTML = '<p class="muted">Cargando…</p>';
  try { await login(); } catch (e) { B.innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const render = async () => {
    B.innerHTML = '<p class="muted" style="font-size:15px">Mapas armados por otros jugadores, con trofeos para juntar y una meta. Para crear la tuya: en un mundo propio poné los bloques de aventura (inicio, controles, trofeos y meta) y en la pausa tocá «🗺 Publicar como aventura».</p>';
    try {
      const list = await Cloud.adventures();
      if (!list.length) B.insertAdjacentHTML('beforeend', '<p class="empty">Todavía no hay aventuras publicadas.</p>');
      for (const a of list) {
        const row = document.createElement('div'); row.className = 'world';
        row.innerHTML = `<div><b>${esc(a.title)}</b><small>de ${esc(a.author)} · 🏆 ${a.trophies} trofeos · ▶ ${a.plays} · 🏁 ${a.finishes}${a.description ? '<br>' + esc(a.description) : ''}</small></div><button class="play">Jugar</button>${a.user_id === Cloud.user.id ? '<button class="del" title="Borrar">✕</button>' : ''}`;
        row.querySelector('.play').onclick = async (e) => {
          e.target.disabled = true; e.target.textContent = 'Bajando…';
          try { await playAdventure(a.id, { startGame, Storage }); ov.hidden = true; }
          catch (er) { alert('No se pudo abrir: ' + er.message); e.target.disabled = false; e.target.textContent = 'Jugar'; }
        };
        row.querySelector('.del')?.addEventListener('click', async () => { if (confirm(`¿Borrar «${a.title}»?`)) { await Cloud.deleteAdventure(a.id); render(); } });
        B.appendChild(row);
      }
    } catch (e) { B.insertAdjacentHTML('beforeend', `<p class="empty">No se pudo cargar (${esc(e.message)}). ¿Ya corriste el SQL nuevo en Supabase?</p>`); }
  };
  render();
}
async function playAdventure(id, { startGame, Storage }) {
  const a = await Cloud.adventure(id);
  const d = a.data;
  const wid = 'adv' + id + '-' + Date.now().toString(36);
  const list = [];
  for (const [key, b64] of Object.entries(d.chunks || {})) { const [cx, cz] = key.split(',').map(Number); list.push({ cx, cz, data: await unpack(b64) }); }
  await Storage.saveChunks(wid, list);
  const [sx, sy, sz] = d.start;
  const meta = {
    id: wid, name: '🗺 ' + a.title, seed: Number(a.seed), worldType: a.world_type, mode: 'adventure', containers: d.containers || {},
    origin: { x: sx + 0.5, y: sy + 1.1, z: sz + 0.5 }, adventure: { id: a.id, title: a.title, author: a.author, trophies: a.trophies, intro: a.description, owner: a.user_id },
    rules: { rad: false, dayMobs: true, armed: false }, seenHelp: true, lastPlayed: Date.now(),
  };
  await Storage.saveWorld(meta);
  Cloud.countAdventure(a.id, false).catch(() => {});
  await startGame(meta);
}

// ---------- dentro de una partida ----------
export function createSocial(ctx) {
  const { game: g, sfx, flash, particles } = ctx;
  const p = g.player, w = g.world, meta = g.meta, sim = g.sim, inv = g.inv;
  const api = {};
  const $ = (s) => document.querySelector(s);
  const cloudWorld = meta.cloud && hasSession();
  const btns = $('#socialBtns');
  const extra = [];
  const addBtn = (txt, fn, where = btns) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; where.appendChild(b); if (where !== btns) extra.push(b); return b; };
  btns.innerHTML = '';
  const backToPause = () => { $('#pause').hidden = false; };

  // fotos: guardamos una versión liviana de la última captura
  const cap = g.features.capture;
  g.features.capture = () => {
    cap();
    try {
      const src = ctx.renderer.domElement, W = 720, H = Math.round(W * src.height / src.width);
      const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(src, 0, 0, W, H);
      api.lastPhoto = c.toDataURL('image/jpeg', 0.72);
      flash('📸 Foto guardada. Compartila en la galería desde la pausa.');
    } catch { /* sin foto */ }
  };
  addBtn('🖼 Galería del grupo', () => { $('#pause').hidden = true; openGallery(api.lastPhoto, meta.name, backToPause); });

  // ---------- buzón y marcas (mundo del grupo) ----------
  let marks = [], unread = 0;
  async function refresh() {
    if (!cloudWorld) return;
    try {
      await login();
      marks = await Cloud.marks(meta.cloud);
      const box = await Cloud.inbox(meta.cloud);
      const n = box.filter((m) => !m.taken).length;
      if (n > unread) flash(`📬 Tenés ${n} mensaje${n === 1 ? '' : 's'} en el buzón (pausa → Buzón)`);
      unread = n; if (mailBtn) mailBtn.textContent = `📬 Buzón${n ? ` (${n})` : ''}`;
    } catch { /* sin nube o sin las tablas nuevas */ }
  }
  let mailBtn = null;
  if (cloudWorld) {
    mailBtn = addBtn('📬 Buzón', () => openMail());
    addBtn('📍 Marcar este lugar en el mapa', () => {
      const label = prompt('¿Qué hay acá? (se ve en el mapa de todos)', '');
      if (!label?.trim()) return;
      Cloud.addMark(meta.cloud, { label: label.trim().slice(0, 40), icon: '📍', x: Math.round(p.pos.x), z: Math.round(p.pos.z) })
        .then(() => { flash('📍 Lugar marcado en el mapa del grupo'); refresh(); }).catch((e) => alert('No se pudo marcar: ' + e.message));
    });
    setTimeout(refresh, 4000);
  }
  api.markers = () => marks.map((m) => ({ x: m.x + 0.5, z: m.z + 0.5, color: '#ff8ad8', kind: 'poi', label: `${m.icon || '📍'} ${m.label} (${m.name})` }));
  async function openMail() {
    $('#pause').hidden = true;
    const ov = overlay('mailbox', '📬 Buzón'); ov.onclose = backToPause;
    const B = ov.querySelector('.ovBody');
    B.innerHTML = '<p class="muted">Cargando…</p>';
    try {
      await login();
      const [box, mem] = await Promise.all([Cloud.inbox(meta.cloud), Cloud.members(meta.cloud)]);
      B.innerHTML = '<h3 style="margin:0 0 4px">Mandar</h3>';
      const others = mem.filter((m) => m.user_id !== Cloud.user.id);
      if (!others.length) B.insertAdjacentHTML('beforeend', '<p class="muted">No hay otros miembros en este mundo todavía.</p>');
      else {
        const f = document.createElement('div');
        const hand = inv.hand;
        f.innerHTML = `<select class="to">${others.map((m) => `<option value="${m.user_id}">${esc(m.name)}</option>`).join('')}</select>
          <textarea class="txt" rows="2" maxlength="300" placeholder="Mensaje" style="width:100%;font:inherit"></textarea>
          ${hand ? `<label class="check"><input type="checkbox" class="att"> Adjuntar lo que tengo en la mano: ${hand.count} × ${esc(itemName(hand.id))}</label>` : '<p class="muted" style="font-size:14px">Para mandar objetos, tenelos en la mano.</p>'}
          <button class="send primary">Mandar</button>`;
        f.querySelector('.txt').addEventListener('keydown', (e) => e.stopPropagation());
        f.querySelector('.send').onclick = async (e) => {
          const txt = f.querySelector('.txt').value.trim(), att = f.querySelector('.att')?.checked;
          if (!txt && !att) return;
          e.target.disabled = true;
          let items = null;
          if (att && inv.hand) { const h = inv.hand; items = [{ id: h.id, count: h.count, dur: h.dur ?? null, q: h.q ?? null }]; inv.slots[inv.selected] = null; inv.onChange(); }
          try { await Cloud.sendMail(meta.cloud, f.querySelector('.to').value, txt, items); flash('📬 Mensaje mandado'); openMail(); }
          catch (er) { if (items) p.give(items[0].id, items[0].count, { dur: items[0].dur, q: items[0].q }); alert('No se pudo mandar: ' + er.message); e.target.disabled = false; }
        };
        B.appendChild(f);
      }
      B.insertAdjacentHTML('beforeend', '<h3 style="margin:12px 0 4px">Recibidos</h3>');
      if (!box.length) B.insertAdjacentHTML('beforeend', '<p class="empty">No hay mensajes.</p>');
      for (const m of box) {
        const row = document.createElement('div'); row.className = 'quest';
        const it = m.items?.length ? m.items.map((x) => `${x.count} × ${esc(itemName(x.id))}`).join(', ') : '';
        row.innerHTML = `<p><b>${esc(m.from_name)}</b> <small class="muted">${new Date(m.created_at).toLocaleString()}</small><br>${esc(m.text || '')}${it ? `<br>🎁 ${it}` : ''}</p>`;
        if (it && !m.taken) {
          const b = document.createElement('button'); b.className = 'primary'; b.textContent = 'Agarrar';
          b.onclick = async () => { b.disabled = true; const items = await Cloud.takeMail(m.id); if (items) { for (const x of items) if (ITEMS[x.id] || x.id < 256) p.give(x.id, x.count, { dur: x.dur ?? undefined, q: x.q ?? undefined }); sfx.craft(); flash('🎁 ¡Lo agarraste!'); } openMail(); };
          row.appendChild(b);
        } else if (!it && !m.taken) Cloud.takeMail(m.id).catch(() => {});
        const del = document.createElement('button'); del.textContent = 'Borrar'; del.onclick = async () => { await Cloud.deleteMail(m.id); openMail(); };
        row.appendChild(del);
        B.appendChild(row);
      }
      refresh();
    } catch (e) { B.innerHTML = `<p class="empty">${esc(e.message)}. ¿Ya corriste el SQL nuevo en Supabase?</p>`; }
  }

  // ---------- publicar una aventura ----------
  if (!meta.remote && !meta.cloud && meta.mode !== 'adventure') addBtn('🗺 Publicar como aventura', () => publish(), $('#worldBtns'));
  async function publish() {
    $('#pause').hidden = true;
    const ov = overlay('advPublish', '🗺 Publicar como aventura'); ov.onclose = backToPause;
    const B = ov.querySelector('.ovBody');
    B.innerHTML = '<p class="muted">Revisando el mapa…</p>';
    try {
      await login();
      await ctx.saveGame(true);
      const keys = (await ctx.Storage.chunkKeys(meta.id)).map((k) => k.slice(meta.id.length + 1));
      const chunks = {}, found = { start: null, cps: 0, trophies: 0, finish: 0 };
      const I = (x, y, z) => x + (z << 4) + (y << 8);
      const near = [];
      for (const key of keys) {
        const [cx, cz] = key.split(',').map(Number);
        const data = await ctx.Storage.loadChunk(meta.id, cx, cz); if (!data) continue;
        let has = false;
        for (let y = 0; y < HEIGHT; y++) for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
          const b = data[I(x, y, z)];
          if (b < ADV.start || b > ADV.finish) continue;
          has = true;
          if (b === ADV.start) found.start = [cx * 16 + x, y, cz * 16 + z];
          else if (b === ADV.cp) found.cps++; else if (b === ADV.trophy) found.trophies++; else found.finish++;
        }
        near.push({ key, cx, cz, data, has });
      }
      if (!found.start) { B.innerHTML = `<p class="empty">Falta el bloque de <b>Inicio de aventura</b>. Ponelo donde arranca el jugador (en Creativo lo tenés en la mochila; si no, se fabrica).</p>`; return; }
      // sólo los sectores modificados a menos de 120 bloques del inicio
      const [sx, , sz] = found.start;
      const used = near.filter((c) => Math.hypot(c.cx * 16 + 8 - sx, c.cz * 16 + 8 - sz) < 120).slice(0, 160);
      for (const c of used) chunks[c.key] = await pack(c.data);
      const containers = {};
      for (const [k, c] of sim.containers) { const [x, , z] = k.split(',').map(Number); if (used.some((u) => Math.floor(x / 16) === u.cx && Math.floor(z / 16) === u.cz)) containers[k] = c; }
      const size = JSON.stringify(chunks).length;
      B.innerHTML = `<p>Encontré: 🚩 inicio · 🔷 ${found.cps} controles · 🏆 ${found.trophies} trofeos · 🏁 ${found.finish ? 'meta' : '<b>sin meta</b> (se puede, pero no se termina)'} · ${used.length} sectores (${Math.round(size / 1024)} KB)</p>
        <label>Título</label><input class="tt" maxlength="40" value="${esc(meta.advTitle || meta.name)}">
        <label>Descripción (lo que ve el jugador al empezar)</label><textarea class="dd" rows="3" maxlength="300" style="width:100%;font:inherit">${esc(meta.advDesc || '')}</textarea>
        <button class="pub primary" style="width:100%">${meta.advId ? 'Actualizar aventura' : 'Publicar'}</button>`;
      B.querySelectorAll('input,textarea').forEach((el) => el.addEventListener('keydown', (e) => e.stopPropagation()));
      B.querySelector('.pub').onclick = async (e) => {
        e.target.disabled = true; e.target.textContent = 'Subiendo…';
        const title = B.querySelector('.tt').value.trim().slice(0, 40) || 'Aventura sin nombre', description = B.querySelector('.dd').value.trim().slice(0, 300);
        try {
          meta.advId = await Cloud.publishAdventure({ id: meta.advId, title, description, seed: meta.seed, world_type: meta.worldType || 'normal', trophies: found.trophies, data: { chunks, containers, start: found.start, cps: found.cps, finish: found.finish > 0 } });
          meta.advTitle = title; meta.advDesc = description;
          B.innerHTML = '<p>✔ ¡Publicada! Ya aparece en el menú → 🗺 Aventuras.</p>'; p.onEvent('v9', 'autor');
        } catch (er) { e.target.disabled = false; e.target.textContent = 'Publicar'; alert('No se pudo publicar: ' + er.message); }
      };
    } catch (e) { B.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
  }

  // ---------- jugando una aventura ----------
  const A = meta.adventure;
  let hud = null, t0 = 0, scanAcc = 0;
  if (A) {
    meta.adv = meta.adv || { got: 0, t: 0, done: false };
    const canEdit = p.canEdit.bind(p);
    let warned = 0;
    p.canEdit = (x, z) => { if (p.creative) return canEdit(x, z); if (performance.now() - warned > 3000) { warned = performance.now(); flash('En las aventuras no se rompe ni se construye'); } return false; };
    hud = document.createElement('div');
    hud.style.cssText = 'position:absolute;left:50%;top:44px;transform:translateX(-50%);background:rgba(20,18,15,.72);border:2px solid #6ab0ff;padding:4px 12px;font-size:18px;color:#e8f0ff;pointer-events:none;white-space:nowrap';
    $('#hud').appendChild(hud);
    if (!meta.adv.t) setTimeout(() => ctx.openPanel(`🗺 ${A.title}`, (list) => list.insertAdjacentHTML('beforeend', `<p>Aventura de <b>${esc(A.author)}</b>.</p>${A.intro ? `<p>${esc(A.intro)}</p>` : ''}<p class="muted">Juntá los 🏆 trofeos y llegá a la 🏁 meta dorada. Los 🔷 controles guardan tu punto de reaparición.</p>`)), 1200);
  }
  function advTick(dt) {
    if (!A || meta.adv.done) return;
    meta.adv.t += dt;
    scanAcc += dt; if (scanAcc < 0.2) return; scanAcc = 0;
    const x0 = Math.floor(p.pos.x), y0 = Math.floor(p.pos.y), z0 = Math.floor(p.pos.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 2; dy++) {
      const x = x0 + dx, y = y0 + dy, z = z0 + dz, b = w.getBlock(x, y, z);
      if (b === ADV.trophy && Math.abs(dx) + Math.abs(dz) <= 1 && dy >= 0) {
        w.setBlock(x, y, z, 0); meta.adv.got++;
        particles.burst(x, y, z, [255, 220, 80], 16, 0.6); sfx.coin?.() || sfx.craft();
        flash(`🏆 ¡Trofeo! ${meta.adv.got}/${A.trophies}`);
      }
      if (dy === -1 && dx === 0 && dz === 0) {
        if (b === ADV.cp && (!meta.spawn || meta.spawn.x !== x + 0.5 || meta.spawn.z !== z + 0.5)) { meta.spawn = { x: x + 0.5, y: y + 1.1, z: z + 0.5 }; flash('🔷 Punto de control'); sfx.ding?.(); }
        if (b === ADV.finish) {
          meta.adv.done = true;
          const tm = meta.adv.t, mm = Math.floor(tm / 60), ss = Math.floor(tm % 60);
          sfx.achievement?.(); p.onEvent('v9', 'aventura');
          Cloud.countAdventure(A.id, true).catch(() => {});
          ctx.openPanel('🏁 ¡Aventura terminada!', (list) => list.insertAdjacentHTML('beforeend', `<p><b>${esc(A.title)}</b> de ${esc(A.author)}</p><p>⏱ ${mm}:${String(ss).padStart(2, '0')} · 🏆 ${meta.adv.got}/${A.trophies} trofeos</p><p class="muted">Podés seguir recorriendo o salir al menú desde la pausa.</p>`));
        }
      }
    }
  }
  api.update = (dt) => {
    advTick(dt);
    if (hud) {
      const tm = meta.adv.t;
      hud.textContent = `🗺 ${A.title} · 🏆 ${meta.adv.got}/${A.trophies} · ⏱ ${Math.floor(tm / 60)}:${String(Math.floor(tm % 60)).padStart(2, '0')}${meta.adv.done ? ' · 🏁 ¡terminada!' : ''}`;
    }
  };
  let refAcc = 0;
  const upd = api.update;
  api.update = (dt) => { upd(dt); if (cloudWorld) { refAcc += dt; if (refAcc > 90) { refAcc = 0; refresh(); } } };
  api.dispose = () => { btns.innerHTML = ''; for (const b of extra) b.remove(); hud?.remove(); g.features.capture = cap; };
  return api;
}
