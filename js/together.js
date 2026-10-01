// Juntos v11.0: obras del grupo (un diseño que todos ayudan a construir, con avance y créditos),
// puestos de venta entre jugadores y foto grupal con pose.
import * as THREE from 'three';
import { BLOCKS, ITEMS, itemName, DECOR } from './blocks.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const k3 = (x, y, z) => x + ',' + y + ',' + z;
const PUESTO = DECOR.findIndex((d) => d.id === 'puesto');

export function createTogether(ctx) {
  const { game: g, flash, sfx, scene, net, particles } = ctx;
  const p = g.player, w = g.world, sim = g.sim, inv = g.inv;
  const api = {};
  const auth = () => ctx.isAuthority();
  const save = (k) => { if (auth()) sim.touch(k); else net.sendContainer(k, sim.containers.get(k)); };

  // ---------- obras del grupo ----------
  const projects = () => [...sim.containers].filter(([, c]) => c.type === 'project');
  function cellsOf(P) {
    const [W, H, D] = P.size, q = P.q, out = [];
    for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const b = P.data[x + z * W + y * W * D]; if (!b) continue;
      let rx = x, rz = z;
      if (q === 1) { rx = z; rz = W - 1 - x; } else if (q === 2) { rx = W - 1 - x; rz = D - 1 - z; } else if (q === 3) { rx = D - 1 - z; rz = x; }
      out.push([P.x + rx - Math.floor((q % 2 ? D : W) / 2), P.y + y, P.z + rz - Math.floor((q % 2 ? W : D) / 2), b]);
    }
    return out;
  }
  const done = (c) => { const b = w.getBlock(c[0], c[1], c[2]); return b === c[3] || (BLOCKS[c[3]]?.door && BLOCKS[b]?.door); };
  function progress(P) { const cs = cellsOf(P); const n = cs.filter(done).length; return { n, total: cs.length, cells: cs }; }
  function startProject(name, d, t) {
    const q = ((Math.round((p.yaw - (d.yaw || 0)) / (Math.PI / 2)) % 4) + 4) % 4;
    const k = 'proj:' + Date.now().toString(36);
    sim.containers.set(k, { type: 'project', name, size: d.size, data: d.data, q, x: t.x + t.face[0], y: t.y + t.face[1], z: t.z + t.face[2], owner: p.name, contrib: {} });
    save(k); flash(`🤝 Obra «${name}» iniciada: todos pueden ayudar poniendo los bloques donde marca la silueta`); p.onEvent('v11', 'obra');
  }
  // cuando alguien pone un bloque que va en una obra, se anota a su nombre
  const prevPlace = p.onPlace;
  p.onPlace = (x, y, z, id) => {
    prevPlace?.(x, y, z, id);
    for (const [k, P] of projects()) {
      if (Math.abs(x - P.x) > 40 || Math.abs(z - P.z) > 40) continue;
      if (cellsOf(P).some((c) => c[0] === x && c[1] === y && c[2] === z && c[3] === id)) { P.contrib[p.name] = (P.contrib[p.name] || 0) + 1; save(k); const pr = progress(P); if (pr.n === pr.total) { flash(`🎉 ¡Terminaron la obra «${P.name}»!`); sfx.achievement?.(); } }
    }
  };
  // silueta de lo que falta (la capa más baja sin terminar)
  const ghosts = new THREE.Group(); scene.add(ghosts);
  const gGeo = new THREE.BoxGeometry(1.004, 1.004, 1.004), gMat = new THREE.MeshBasicMaterial({ color: 0x9cff7a, transparent: true, opacity: 0.22, depthWrite: false });
  let ghostAcc = 1;
  function ghostTick(dt) {
    ghostAcc += dt; if (ghostAcc < 0.6) return; ghostAcc = 0;
    while (ghosts.children.length) ghosts.remove(ghosts.children[0]);
    for (const [, P] of projects()) {
      if (Math.hypot(P.x - p.pos.x, P.z - p.pos.z) > 48) continue;
      const left = cellsOf(P).filter((c) => !done(c));
      if (!left.length) continue;
      const minY = Math.min(...left.map((c) => c[1]));
      for (const c of left) if (c[1] === minY && ghosts.children.length < 300) { const m = new THREE.Mesh(gGeo, gMat); m.position.set(c[0] + 0.5, c[1] + 0.5, c[2] + 0.5); ghosts.add(m); }
    }
  }
  function openProjects() {
    ctx.openPanel('🤝 Obras del grupo', (list) => {
      list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Una obra es un diseño (del plano de obra) que todos van construyendo de a poco. Se ve una silueta verde de la capa que falta; cada bloque que ponés en su lugar suma a tu nombre. Para empezar una: plano de obra → «🤝 Obra del grupo».</p>');
      const ps = projects();
      if (!ps.length) list.insertAdjacentHTML('beforeend', '<p class="empty">No hay obras en este mundo.</p>');
      for (const [k, P] of ps) {
        const pr = progress(P), pct = Math.round(pr.n / pr.total * 100), d = Math.round(Math.hypot(P.x - p.pos.x, P.z - p.pos.z));
        const need = {}; for (const c of pr.cells) if (!done(c)) need[c[3]] = (need[c[3]] || 0) + 1;
        const top = Object.entries(P.contrib).sort((a, b) => b[1] - a[1]);
        const box = document.createElement('div'); box.className = 'quest';
        box.innerHTML = `<p><b>${esc(P.name)}</b> <small class="muted">de ${esc(P.owner)} · ${d} m · ${pr.n}/${pr.total}</small></p><div class="repbar"><i style="width:${pct}%;background:#9cff7a"></i></div>
          ${pct < 100 ? `<p style="font-size:15px">Faltan: ${Object.entries(need).slice(0, 6).map(([id, n]) => `${n} ${esc(itemName(+id))}`).join(' · ')}</p>` : '<p>✔ ¡Terminada!</p>'}
          <p style="font-size:15px">🏅 ${top.length ? top.map(([n, c]) => `${esc(n)}: ${c}`).join(' · ') : 'Todavía nadie aportó'}</p>`;
        if (P.owner === p.name) { const b = document.createElement('button'); b.textContent = 'Borrar la obra'; b.onclick = () => { if (confirm('¿Borrar esta obra? (lo construido queda)')) { sim.containers.delete(k); save(k); openProjects(); } }; box.appendChild(b); }
        const mk = document.createElement('button'); mk.textContent = '📍 Marcar en el mapa'; mk.onclick = () => { g.meta.waypoints.push({ name: '🤝 ' + P.name, color: '#9cff7a', x: P.x, y: P.y, z: P.z }); flash('Marcada'); };
        box.appendChild(mk);
        list.appendChild(box);
      }
    });
  }
  // en el plano de obra: botón para empezar una obra con cada diseño
  const prevBuild = ctx.ext.build;
  ctx.ext.build = (list, t) => {
    prevBuild?.(list, t);
    let designs = {}; try { designs = JSON.parse(localStorage.getItem('yermo-designs') || '{}'); } catch { /* sin diseños */ }
    const names = Object.keys(designs); if (!names.length) return;
    const box = document.createElement('div'); box.className = 'quest';
    box.innerHTML = `<p><b>🤝 Obra del grupo</b></p><p class="muted" style="font-size:15px">${t ? 'Se ubica donde estás mirando.' : 'Mirá un bloque primero.'}</p>`;
    for (const n of names) { const b = document.createElement('button'); b.textContent = n; b.disabled = !t; b.style.margin = '2px'; b.onclick = () => { startProject(n, designs[n], t); ctx.closeInventory(); }; box.appendChild(b); }
    list.appendChild(box);
  };
  api.markers = () => projects().map(([, P]) => ({ x: P.x + 0.5, z: P.z + 0.5, color: '#9cff7a', kind: 'poi', label: '🤝 ' + P.name }));

  // ---------- puestos de venta ----------
  function openStall(k, c) {
    const mine = c.owner === p.name || !c.owner;
    ctx.openPanel(mine ? '🛒 Tu puesto' : `🛒 Puesto de ${c.owner}`, (list) => {
      c.items = c.items || []; c.earn = c.earn || 0;
      if (mine) {
        if (!c.owner) { c.owner = p.name; save(k); }
        list.insertAdjacentHTML('beforeend', `<p class="muted" style="font-size:15px">Poné en venta lo que tenés en la mano a un precio en fichas. Los demás jugadores lo compran aunque no estés.</p><p>💰 Ganancias: <b>${c.earn}</b> fichas</p>`);
        const r = document.createElement('div'); r.className = 'row2';
        r.innerHTML = '<input class="pr" type="number" min="1" max="999" value="5"><button class="add primary">Vender lo de la mano</button>';
        r.querySelector('.pr').addEventListener('keydown', (e) => e.stopPropagation());
        r.querySelector('.add').onclick = () => { const h = inv.hand; if (!h) { flash('Tené algo en la mano'); return; } if (c.items.length >= 9) { flash('El puesto está lleno (9)'); return; } c.items.push({ id: h.id, count: h.count, dur: h.dur, q: h.q, price: Math.max(1, Math.min(999, +r.querySelector('.pr').value || 1)) }); inv.slots[inv.selected] = null; inv.onChange(); save(k); openStall(k, c); };
        list.appendChild(r);
        if (c.earn) { const b = document.createElement('button'); b.textContent = `Cobrar ${c.earn} fichas`; b.onclick = () => { p.give(353, c.earn); c.earn = 0; save(k); sfx.coin?.(); openStall(k, c); }; list.appendChild(b); }
      } else list.insertAdjacentHTML('beforeend', `<p class="muted" style="font-size:15px">Tenés ${inv.count(353)} fichas.</p>`);
      c.items.forEach((it, i) => {
        const row = document.createElement('div'); row.className = 'trade';
        row.innerHTML = `<div class="tgive" style="flex:1">${it.count} × ${esc(itemName(it.id))}<br><small>${it.price} fichas</small></div>`;
        const b = document.createElement('button');
        if (mine) { b.textContent = 'Retirar'; b.onclick = () => { p.give(it.id, it.count, { dur: it.dur, q: it.q }); c.items.splice(i, 1); save(k); openStall(k, c); }; }
        else { b.textContent = 'Comprar'; b.disabled = inv.count(353) < it.price; b.onclick = () => { if (inv.count(353) < it.price) return; inv.remove(353, it.price); p.give(it.id, it.count, { dur: it.dur, q: it.q }); c.earn = (c.earn || 0) + it.price; c.items.splice(i, 1); save(k); sfx.coin?.(); p.onEvent('trade', it.id); openStall(k, c); }; }
        row.appendChild(b); list.appendChild(row);
      });
      if (!c.items.length) list.insertAdjacentHTML('beforeend', '<p class="empty">No hay nada a la venta.</p>');
    });
  }
  api.onUseBlock = (t) => {
    if (t.id !== 255) return false;
    const k = k3(t.x, t.y, t.z), c = sim.containers.get(k);
    if (c?.type === 'decor' && c.kind === PUESTO) { openStall(k, c); return true; }
    return false;
  };

  // ---------- foto grupal con pose ----------
  api.groupPose = (emote = 'cheer') => {
    if (net.active) net.send({ t: 'fx', op: 'pose', e: emote, from: net.myId });
    g.features2?.emote?.(emote);
    flash('📸 ¡Pose grupal! Foto en 3…');
  };
  const prevFx = net.onFx;
  net.onFx = (m) => { if (m.op === 'pose') { g.features2?.emote?.(m.e); flash('📸 ¡Foto grupal! Hacé la pose'); return; } prevFx?.(m); };

  const cb = document.querySelector('#socialBtns');
  const bo = document.createElement('button'); bo.textContent = '🤝 Obras del grupo';
  bo.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); openProjects(); };
  cb?.appendChild(bo);
  api.update = (dt) => ghostTick(dt);
  api.dispose = () => { bo.remove(); scene.remove(ghosts); net.onFx = prevFx; ctx.ext.build = prevBuild; };
  return api;
}
