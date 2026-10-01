// Minijuegos v9.4 (mesa de minijuegos): piso de lava, spleef, parkour, escondidas y captura la bandera.
// El anfitrión arma la arena, mira las posiciones de todos y decide; los demás sólo reciben el estado.
import * as THREE from 'three';
import { SOLID } from './blocks.js';

export const GAMES = {
  lava: { name: '🔥 El piso es lava', min: 1, desc: 'Una plataforma en el aire donde los bloques se ponen rojos y desaparecen, cada vez más rápido. Gana el último que queda arriba (solo: aguantá lo más posible).' },
  spleef: { name: '❄ Spleef', min: 1, desc: 'Plataforma de nieve que se rompe de un golpe. Rompé el piso debajo de los demás para que se caigan. Gana el último en pie (solo: rompé todo sin caerte).' },
  parkour: { name: '🏃 Parkour', min: 1, desc: 'Un recorrido de saltos en el aire con puntos de control azules. Llegá a la meta dorada lo más rápido posible.' },
  hide: { name: '🙈 Escondidas', min: 2, desc: 'Uno busca (30 s con los ojos tapados) y los demás se esconden. Encontrás a alguien acercándote a menos de 2 bloques. Hay 3 minutos.' },
  ctf: { name: '🚩 Captura la bandera', min: 2, desc: 'Dos equipos (rojo y azul). Tocá la bandera del otro equipo y llevala a tu base. Si te toca un rival, la bandera vuelve. Gana el primero en llegar a 3.' },
};
const RED = 236, BLUE = 237, GOLD = 238, WHITE = 239, SNOW = 235;
const k3 = (x, y, z) => x + ',' + y + ',' + z;

export function createMinigames(ctx) {
  const { game: g, net, sfx, flash, particles, scene } = ctx;
  const p = g.player, w = g.world, meta = g.meta;
  const api = {};
  const auth = () => ctx.isAuthority();
  const myId = () => (net.active ? net.myId : 'me');
  meta.mg = meta.mg || { best: {} };

  let S = null;        // estado compartido
  let saved = null;    // bloques originales de la arena (anfitrión)
  const hud = document.createElement('div'); hud.id = 'mgHud'; hud.hidden = true;
  hud.style.cssText = 'position:absolute;left:50%;top:44px;transform:translateX(-50%);background:rgba(20,18,15,.75);border:2px solid #e8c040;padding:4px 14px;font-size:18px;color:#fff3d0;pointer-events:none;text-align:center;white-space:nowrap;z-index:3';
  document.querySelector('#hud').appendChild(hud);
  const blind = document.createElement('div');
  blind.style.cssText = 'position:fixed;inset:0;background:#000;display:flex;align-items:center;justify-content:center;color:#e8c040;font-size:28px;z-index:5;pointer-events:none;text-align:center';
  blind.hidden = true; document.body.appendChild(blind);

  // ---------- jugadores ----------
  function everyone() {
    const out = [{ id: myId(), name: p.name, pos: p.pos }];
    if (net.active && auth()) for (const r of net.remotePlayers()) out.push({ id: r.id, name: r.name, pos: r.pos });
    return out;
  }
  function teleport(id, x, y, z) {
    if (id === myId()) { p.pos.set(x, y, z); p.vel.set(0, 0, 0); p.fallStart = null; p.invuln = Math.max(p.invuln, 1); if (p.riding) ctx.toggleMount(); return; }
    net.send({ t: 'fx', op: 'mgTp', id, x, y, z });
  }
  const share = () => { if (net.active && auth()) net.send({ t: 'fx', op: 'mg', s: S }); };

  // ---------- arena ----------
  function put(x, y, z, id) {
    const k = k3(x, y, z);
    if (!saved.has(k)) saved.set(k, w.getBlock(x, y, z));
    w.setBlock(x, y, z, id);
  }
  function restore() {
    if (!saved) return;
    for (const [k, id] of saved) { const [x, y, z] = k.split(',').map(Number); if (id >= 0) w.setBlock(x, y, z, id); }
    saved = null;
  }
  const R = 7; // plataforma de 15 × 15
  function buildFloor(cx, y, cz, id) {
    for (let dx = -R - 1; dx <= R + 1; dx++) for (let dz = -R - 1; dz <= R + 1; dz++) {
      const edge = Math.abs(dx) > R || Math.abs(dz) > R;
      put(cx + dx, y, cz + dz, edge ? 0 : id);
      for (let k = 1; k <= 4; k++) put(cx + dx, y + k, cz + dz, edge && k <= 1 ? 14 : 0); // borde de vidrio bajito
    }
  }
  function buildParkour(cx, y, cz) {
    const rnd = Math.random;
    const pts = [];
    let x = cx, z = cz, yy = y, dir = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(x + dx, yy, z + dz, WHITE);
    pts.push({ x, y: yy, z, cp: true });
    for (let i = 1; i <= 26; i++) {
      if (rnd() < 0.3) dir += rnd() < 0.5 ? 1 : -1;
      const ang = dir * Math.PI / 4, gap = 2 + (rnd() < 0.25 + i * 0.015 ? 1 : 0);
      x = Math.round(x + Math.cos(ang) * (gap + 1)); z = Math.round(z + Math.sin(ang) * (gap + 1));
      yy = Math.max(4, Math.min(120, yy + (rnd() < 0.35 ? 1 : rnd() < 0.3 ? -1 : 0)));
      const last = i === 26, cp = i % 9 === 0, size = last || cp ? 1 : i < 10 ? (rnd() < 0.6 ? 1 : 0) : 0;
      for (let dx = -size; dx <= size; dx++) for (let dz = -size; dz <= size; dz++) put(x + dx, yy, z + dz, last ? GOLD : cp ? BLUE : WHITE);
      for (let k = 1; k <= 3; k++) put(x, yy + k, z, 0);
      pts.push({ x, y: yy, z, cp: cp || last, last });
    }
    return pts;
  }

  // ---------- empezar ----------
  api.start = (game, tx, ty, tz) => {
    if (!auth()) { flash('Los minijuegos los empieza el anfitrión'); return; }
    if (S?.on) { flash('Ya hay un minijuego en curso'); return; }
    const pl = everyone();
    if (pl.length < GAMES[game].min) { flash(`${GAMES[game].name} necesita al menos ${GAMES[game].min} jugadores (abrí la partida a amigos)`); return; }
    saved = new Map();
    const ay = Math.min(110, ty + 22);
    S = { on: true, game, t: 0, home: [tx + 0.5, ty + 1.2, tz + 2.5], players: {}, msg: '' };
    for (const q of pl) S.players[q.id] = { name: q.name, alive: true };
    if (game === 'lava' || game === 'spleef') {
      S.y = ay; S.cx = tx; S.cz = tz; S.count = 3;
      buildFloor(tx, ay, tz, game === 'lava' ? WHITE : SNOW);
      S.cells = [];
      for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) S.cells.push([tx + dx, tz + dz]);
      pl.forEach((q, i) => { const a = i / pl.length * Math.PI * 2; teleport(q.id, tx + 0.5 + Math.cos(a) * 4, ay + 1.1, tz + 0.5 + Math.sin(a) * 4); });
      S.lavaT = 1.4; S.warn = [];
    } else if (game === 'parkour') {
      S.course = buildParkour(tx, ay, tz).map((c) => [c.x, c.y, c.z, c.cp ? 1 : 0, c.last ? 1 : 0]);
      S.count = 3;
      for (const q of pl) { S.players[q.id].cp = 0; teleport(q.id, tx + 0.5, ay + 1.1, tz + 0.5); }
    } else if (game === 'hide') {
      const ids = Object.keys(S.players), seeker = ids[Math.floor(Math.random() * ids.length)];
      for (const id of ids) S.players[id].seeker = id === seeker;
      S.phase = 'hide'; S.left = 30; S.seekerName = S.players[seeker].name;
    } else if (game === 'ctf') {
      const ids = Object.keys(S.players).sort(() => Math.random() - 0.5);
      ids.forEach((id, i) => { S.players[id].team = i % 2 ? 'blue' : 'red'; });
      S.score = { red: 0, blue: 0 }; S.carrier = { red: null, blue: null }; S.left = 360;
      const base = (dx) => { const x = tx + dx, z = tz; const y = g.mobs.surfaceY(x, z) ?? ty; return [x, y, z]; };
      S.base = { red: base(-20), blue: base(20) };
      for (const tm of ['red', 'blue']) {
        const [x, y, z] = S.base[tm];
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) put(x + dx, y - 1, z + dz, tm === 'red' ? RED : BLUE);
        for (let k = 0; k < 3; k++) put(x, y + k, z, 85);
        put(x, y + 3, z, tm === 'red' ? RED : BLUE); put(x + 1, y + 3, z, tm === 'red' ? RED : BLUE);
        for (const [id, q] of Object.entries(S.players)) if (q.team === tm) teleport(id, x + 0.5 + (Math.random() - 0.5) * 3, y + 0.1, z + 2.5);
      }
    }
    flash(`${GAMES[game].name}: ¡empieza!`); sfx.ding?.();
    share(); render();
  };

  function finish(text, winners = []) {
    S.on = false; S.msg = text;
    for (const id of winners) if (id === myId()) { p.give(353, 10); p.onEvent('v9', 'minijuego'); }
    if (net.active && auth()) net.send({ t: 'fx', op: 'mgEnd', text, winners });
    flash(`🏁 ${text}`); sfx.achievement?.();
    const home = S.home;
    if (S.game === 'lava' || S.game === 'spleef' || S.game === 'parkour') for (const id of Object.keys(S.players)) teleport(id, home[0], home[1], home[2]);
    setTimeout(restore, 600);
    share(); render();
  }
  api.stop = () => { if (S?.on && auth()) finish('Minijuego cancelado'); };

  // ---------- lógica (anfitrión) ----------
  function tick(dt) {
    if (!S?.on || !auth()) return;
    if (S.count > 0) { S.count -= dt; return; }
    S.t += dt;
    const pl = everyone(), byId = Object.fromEntries(pl.map((q) => [q.id, q]));
    for (const id of Object.keys(S.players)) if (!byId[id]) S.players[id].alive = false; // se desconectó
    const alive = () => Object.entries(S.players).filter(([, q]) => q.alive);
    if (S.game === 'lava' || S.game === 'spleef') {
      if (S.count > 0) { S.count -= dt; return; }
      for (const [id, q] of alive()) { const pos = byId[id]?.pos; if (pos && pos.y < S.y - 1.5) { q.alive = false; teleport(id, ...S.home); flash(`💥 ${q.name} se cayó`); } }
      if (S.game === 'lava') {
        S.lavaT -= dt;
        for (const wv of [...S.warn]) { wv.t -= dt; if (wv.t <= 0) { w.setBlock(wv.x, S.y, wv.z, 0); S.warn.splice(S.warn.indexOf(wv), 1); } }
        if (S.lavaT <= 0 && S.cells.length) {
          S.lavaT = Math.max(0.12, 1.2 - S.t * 0.025);
          const n = 1 + Math.floor(S.t / 25);
          for (let i = 0; i < n && S.cells.length; i++) { const [x, z] = S.cells.splice(Math.floor(Math.random() * S.cells.length), 1)[0]; w.setBlock(x, S.y, z, RED); S.warn.push({ x, z, t: 1 }); }
        }
      }
      const al = alive(), total = Object.keys(S.players).length;
      if (total > 1 && al.length <= 1) return finish(al.length ? `¡Ganó ${al[0][1].name}!` : 'Se cayeron todos', al.map(([id]) => id));
      if (total === 1 && !al.length) {
        const secs = S.t - 0; const best = meta.mg.best[S.game] || 0;
        if (secs > best) meta.mg.best[S.game] = secs;
        return finish(`Aguantaste ${secs.toFixed(1)} s${secs > best ? ' (¡récord!)' : ` (récord: ${best.toFixed(1)} s)`}`, secs > 30 ? [myId()] : []);
      }
      if (S.game === 'spleef' && total === 1) {
        let left = 0; for (const [x, z] of S.cells) if (w.getBlock(x, S.y, z) === SNOW) left++;
        if (left === 0) return finish(`¡Rompiste toda la nieve en ${S.t.toFixed(1)} s!`, [myId()]);
      }
    } else if (S.game === 'parkour') {
      if (S.count > 0) { S.count -= dt; return; }
      for (const [id, q] of alive()) {
        const pos = byId[id]?.pos; if (!pos) continue;
        const c = S.course;
        // ¿pisó un punto de control o la meta?
        for (let i = q.cp + 1; i < c.length; i++) {
          if (!c[i][3]) continue;
          if (i !== c.findIndex((cc, j) => j > q.cp && cc[3])) break; // sólo vale el próximo control
          if (Math.abs(pos.x - c[i][0] - 0.5) < 1.6 && Math.abs(pos.z - c[i][2] - 0.5) < 1.6 && Math.abs(pos.y - c[i][1] - 1) < 1) {
            q.cp = i;
            if (c[i][4]) {
              const tm = S.t, best = meta.mg.best.parkour;
              if (!best || tm < best) meta.mg.best.parkour = tm;
              return finish(`¡${q.name} llegó a la meta en ${tm.toFixed(1)} s!${Object.keys(S.players).length === 1 && (!best || tm < best) ? ' ¡Récord!' : ''}`, [id]);
            }
            if (id === myId()) flash('✔ Punto de control'); else net.send({ t: 'fx', op: 'mgMsg', id, text: '✔ Punto de control' });
          }
        }
        const cp = c[q.cp];
        if (pos.y < cp[1] - 6) teleport(id, cp[0] + 0.5, cp[1] + 1.1, cp[2] + 0.5);
      }
      if (S.t > 600) return finish('Se terminó el tiempo');
    } else if (S.game === 'hide') {
      S.left -= dt;
      if (S.phase === 'hide' && S.left <= 0) { S.phase = 'seek'; S.left = 180; }
      else if (S.phase === 'seek') {
        const seekers = alive().filter(([, q]) => q.seeker), hiders = alive().filter(([, q]) => !q.seeker && !q.found);
        for (const [sid] of seekers) for (const [hid, h] of hiders) {
          const a = byId[sid]?.pos, b = byId[hid]?.pos;
          if (a && b && a.distanceTo(b) < 2.2) { h.found = true; h.seeker = true; flash(`👀 Encontraron a ${h.name}`); }
        }
        const left = alive().filter(([, q]) => !q.seeker && !q.found);
        if (!left.length) return finish(`¡${S.seekerName} encontró a todos!`, Object.entries(S.players).filter(([, q]) => q.seeker && !q.found).map(([id]) => id));
        if (S.left <= 0) return finish(`¡Ganaron los escondidos! (${left.map(([, q]) => q.name).join(', ')})`, left.map(([id]) => id));
      }
    } else if (S.game === 'ctf') {
      S.left -= dt;
      const other = (t) => (t === 'red' ? 'blue' : 'red');
      const near = (pos, b, r) => pos && Math.hypot(pos.x - b[0] - 0.5, pos.z - b[2] - 0.5) < r && Math.abs(pos.y - b[1]) < 4;
      for (const [id, q] of alive()) {
        const pos = byId[id]?.pos, en = other(q.team);
        // agarrar la bandera rival
        if (!S.carrier[en] && near(pos, S.base[en], 2)) { S.carrier[en] = id; flash(`🚩 ${q.name} agarró la bandera ${en === 'red' ? 'roja' : 'azul'}`); }
        // llevarla a casa (con la propia en su lugar)
        if (S.carrier[en] === id && !S.carrier[q.team] && near(pos, S.base[q.team], 2.5)) {
          S.carrier[en] = null; S.score[q.team]++;
          flash(`⭐ ¡Punto para ${q.team === 'red' ? 'rojos' : 'azules'}! ${S.score.red} - ${S.score.blue}`);
          if (S.score[q.team] >= 3) return finish(`¡Ganaron los ${q.team === 'red' ? 'rojos' : 'azules'}!`, Object.entries(S.players).filter(([, x]) => x.team === q.team).map(([i]) => i));
        }
      }
      // atrapar al que lleva la bandera
      for (const tm of ['red', 'blue']) {
        const cid = S.carrier[tm]; if (!cid) continue;
        const cpos = byId[cid]?.pos;
        if (!cpos || !S.players[cid]?.alive) { S.carrier[tm] = null; continue; }
        for (const [id, q] of alive()) if (q.team === tm && byId[id]?.pos.distanceTo(cpos) < 1.8) {
          S.carrier[tm] = null; flash(`✋ ${q.name} recuperó la bandera`);
          const b = S.base[S.players[cid].team]; teleport(cid, b[0] + 0.5, b[1] + 0.1, b[2] + 2.5);
          break;
        }
      }
      if (S.left <= 0) { const r = S.score.red, b = S.score.blue; return finish(r === b ? `Empate ${r} - ${b}` : `¡Ganaron los ${r > b ? 'rojos' : 'azules'}! ${r} - ${b}`, r === b ? [] : Object.entries(S.players).filter(([, x]) => x.team === (r > b ? 'red' : 'blue')).map(([i]) => i)); }
    }
  }

  // ---------- pantalla (todos) ----------
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function render() {
    if (!S?.on) { hud.hidden = true; blind.hidden = true; return; }
    const me = S.players[myId()];
    let txt = GAMES[S.game].name;
    const alive = Object.values(S.players).filter((q) => q.alive).length, total = Object.keys(S.players).length;
    if (S.count > 0) txt += ` · empieza en ${Math.ceil(S.count)}`;
    else if (S.game === 'lava' || S.game === 'spleef') txt += total > 1 ? ` · quedan ${alive}/${total}` : ` · ${S.t.toFixed(1)} s`;
    else if (S.game === 'parkour') txt += ` · ${S.t.toFixed(1)} s · control ${me ? Math.floor((me.cp || 0) / 9) : 0}/2`;
    else if (S.game === 'hide') txt += S.phase === 'hide' ? ` · a esconderse: ${Math.ceil(S.left)} s · busca ${S.seekerName}` : ` · ${fmt(S.left)} · ${me?.seeker ? '👀 buscás' : '🙈 escondete'} · faltan ${Object.values(S.players).filter((q) => !q.seeker && !q.found).length}`;
    else if (S.game === 'ctf') txt += ` · <span style="color:#ff6a5a">rojos ${S.score.red}</span> - <span style="color:#6ab0ff">${S.score.blue} azules</span> · ${fmt(S.left)}${me ? ` · sos ${me.team === 'red' ? '🔴' : '🔵'}` : ''}${S.carrier.red === myId() || S.carrier.blue === myId() ? ' · 🚩 ¡llevala a tu base!' : ''}`;
    hud.innerHTML = txt; hud.hidden = false;
    const blindMe = S.game === 'hide' && S.phase === 'hide' && me?.seeker;
    blind.hidden = !blindMe;
    if (blindMe) blind.innerHTML = `🙈 Contá hasta ${Math.ceil(S.left)}…<br><small style="font-size:18px;color:#aaa">Los demás se están escondiendo</small>`;
  }
  // banderas sobre la cabeza del que la lleva
  let fxAcc = 0;
  function carrierFx(dt) {
    if (!S?.on || S.game !== 'ctf') return;
    fxAcc += dt; if (fxAcc < 0.15) return; fxAcc = 0;
    for (const tm of ['red', 'blue']) {
      const id = S.carrier[tm]; if (!id) continue;
      const pos = id === myId() ? p.pos : net.avatars.get(id)?.pos; if (!pos) continue;
      particles.burst(pos.x - 0.5, pos.y + 2.1, pos.z - 0.5, tm === 'red' ? [255, 60, 50] : [60, 120, 255], 2, 0.2);
    }
  }

  // ---------- red ----------
  const prevFx = net.onFx;
  net.onFx = (m) => {
    if (m.op === 'mg') { if (!auth()) { S = m.s; render(); } return; }
    if (m.op === 'mgTp') { if (m.id === myId()) teleport(m.id, m.x, m.y, m.z); return; }
    if (m.op === 'mgMsg') { if (m.id === myId()) flash(m.text); return; }
    if (m.op === 'mgEnd') { if (!auth()) { flash(`🏁 ${m.text}`); if (m.winners.includes(myId())) { p.give(353, 10); p.onEvent('v9', 'minijuego'); } } return; }
    prevFx?.(m);
  };

  // ---------- mesa ----------
  api.onUseBlock = (t) => {
    if (t.id !== 234) return false;
    ctx.openPanel('Mesa de minijuegos', (list) => {
      if (S?.on) {
        list.insertAdjacentHTML('beforeend', `<p>Hay un minijuego en curso: <b>${GAMES[S.game].name}</b>.</p>`);
        if (auth()) { const b = document.createElement('button'); b.textContent = 'Cancelar el minijuego'; b.onclick = () => { api.stop(); ctx.closeInventory(); }; list.appendChild(b); }
        return;
      }
      const n = everyone().length;
      list.insertAdjacentHTML('beforeend', `<p class="muted">${auth() ? `Jugadores: ${n}. Juegan todos los que están en la partida.` : 'Sólo el anfitrión puede empezar un minijuego.'} Las arenas se arman al lado de la mesa y desaparecen al terminar. Ganar da 10 fichas.</p>`);
      const best = meta.mg.best;
      for (const [k, G] of Object.entries(GAMES)) {
        const row = document.createElement('div'); row.className = 'trade';
        const rec = k === 'parkour' && best.parkour ? ` · récord ${best.parkour.toFixed(1)} s` : (k === 'lava' || k === 'spleef') && best[k] ? ` · récord ${best[k].toFixed(1)} s` : '';
        row.innerHTML = `<div class="tgive" style="flex:1"><b>${G.name}</b>${G.min > 1 ? ' <small>(2+ jugadores)</small>' : ''}<br><small>${G.desc}${rec}</small></div>`;
        const b = document.createElement('button'); b.textContent = 'Jugar'; b.disabled = !auth() || n < G.min;
        b.onclick = () => { ctx.closeInventory(); api.start(k, t.x, t.y, t.z); ctx.lockPointer(); };
        row.appendChild(b); list.appendChild(row);
      }
    });
    return true;
  };

  let shareAcc = 0, renderAcc = 0;
  api.update = (dt) => {
    tick(dt);
    if (S?.on && auth()) { shareAcc += dt; if (shareAcc > 0.4) { shareAcc = 0; share(); } }
    // el que busca no se puede mover mientras cuenta
    if (S?.on && S.game === 'hide' && S.phase === 'hide' && S.players[myId()]?.seeker) { p.vel.x = 0; p.vel.z = 0; }
    carrierFx(dt);
    renderAcc += dt; if (renderAcc > 0.2) { renderAcc = 0; render(); }
  };
  api.active = () => !!S?.on;
  api.state = () => S;
  api.dispose = () => { if (auth()) restore(); hud.remove(); blind.remove(); net.onFx = prevFx; };
  return api;
}
