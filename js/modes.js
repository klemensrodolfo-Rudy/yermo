// Modos v9.2: defensa del refugio por oleadas (cooperativa) y «una sola vida» con ranking.
import * as THREE from 'three';
import { Cloud } from './cloud.js';

const WAVES = 10;
const RUNS_KEY = 'yermo-runs';
export const localRuns = () => { try { return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]'); } catch { return []; } };
const cloudSession = () => { try { return !!localStorage.getItem('yermo-cloud-auth'); } catch { return false; } };

export function createModes(ctx) {
  const { game: g, net, sfx, flash, particles } = ctx;
  const p = g.player, inv = g.inv, w = g.world, meta = g.meta;
  const api = {};
  const auth = () => ctx.isAuthority();
  const magic = meta.worldType === 'magic';

  // ---------- defensa del refugio ----------
  let D = null; // estado (en el anfitrión es el real; en los demás, lo último que llegó)
  const hud = document.createElement('div'); hud.id = 'defHud'; hud.hidden = true;
  hud.style.cssText = 'position:absolute;left:50%;top:44px;transform:translateX(-50%);background:rgba(20,18,15,.7);border:2px solid #6ab0ff;padding:4px 12px;font-size:18px;color:#e8f0ff;pointer-events:none;text-align:center;white-space:nowrap';
  document.querySelector('#hud').appendChild(hud);
  function renderHud() {
    if (!D?.on) { hud.hidden = true; return; }
    const pct = Math.max(0, Math.round(D.hp / D.max * 100));
    const bar = '█'.repeat(Math.ceil(pct / 10)) + '░'.repeat(10 - Math.ceil(pct / 10));
    hud.innerHTML = `🛡 Oleada ${Math.max(1, D.wave)}/${WAVES} · Núcleo <span style="color:${pct > 50 ? '#9cff7a' : pct > 25 ? '#ffd84a' : '#ff6a5a'}">${bar} ${pct}%</span> · ${D.pause > 0 ? `próxima en ${Math.ceil(D.pause)} s` : `quedan ${D.left}`}`;
    hud.hidden = false;
  }
  const share = () => { if (net.active && auth()) net.send({ t: 'fx', op: 'defense', s: D }); };
  const WAVE_MOBS = magic
    ? (n) => (n >= 10 ? ['troll', 'troll', 'orc', 'warg'] : n >= 5 ? ['orc', 'orc', 'warg', 'troll'] : ['orc', 'orc', 'warg'])
    : (n) => (n >= 10 ? ['alpha', 'ghoul', 'wolf', 'rat'] : n >= 6 ? ['ghoul', 'wolf', 'scorpion', 'rat'] : n >= 3 ? ['ghoul', 'rat', 'wolf'] : ['ghoul', 'rat']);
  function startDefense(x, y, z) {
    if (meta.rules?.kids) { flash('La defensa no está disponible en modo chicos'); return; }
    if (!auth()) { flash('La defensa la empieza el anfitrión de la partida'); return; }
    D = { on: true, x, y, z, wave: 0, hp: 100, max: 100, pause: 10, left: 0 };
    flash('🛡 ¡Defensa del refugio! Los mutantes van a atacar el núcleo en 10 oleadas. Protegelo.');
    sfx.boss?.(); share(); renderHud();
  }
  function spawnWave() {
    D.wave++;
    const n = Math.min(24, 3 + D.wave * 2), types = WAVE_MOBS(D.wave), lvl = 1 + Math.floor(D.wave / 3);
    let made = 0;
    for (let i = 0; i < n * 3 && made < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 10;
      const x = Math.floor(D.x + Math.cos(a) * r), z = Math.floor(D.z + Math.sin(a) * r);
      const y = g.mobs.surfaceY(x, z); if (y == null) continue;
      const boss = D.wave >= WAVES ? 1 : 0;
      const type = boss && made === 0 ? types[0] : types[boss + Math.floor(Math.random() * (types.length - boss))];
      const m = g.mobs.add(type, x + 0.5, y, z + 0.5, undefined, lvl);
      m.siege = { x: D.x, y: D.y, z: D.z }; m.keep = true; m.defense = true;
      made++;
    }
    D.left = made;
    flash(`🛡 Oleada ${D.wave}${D.wave === WAVES ? ' (¡la última!)' : ''}: ${made} enemigos`);
    sfx.boss?.();
  }
  function endDefense(win) {
    for (const m of [...g.mobs.list.values()]) if (m.defense) { m.siege = null; m.defense = false; m.keep = false; }
    if (win) {
      flash('🏆 ¡Resististe las 10 oleadas! El refugio está a salvo.');
      reward(40, true);
    } else flash(`💥 Destruyeron el núcleo en la oleada ${D.wave}.`);
    D.on = false; share(); renderHud();
  }
  function reward(n, win) {
    p.give(353, n); sfx.coin?.();
    if (win) { p.give(397, 1); p.onEvent('v9', 'defensa'); }
    if (net.active && auth()) net.send({ t: 'fx', op: 'defReward', n, win });
  }
  g.mobs.onSiege = (m) => {
    if (!D?.on) { m.siege = null; return; }
    D.hp -= Math.max(1, Math.round(m.def.dmg * (m.def.boss ? 1.5 : 1)));
    particles.burst(D.x, D.y + 0.6, D.z, [120, 180, 255], 6, 0.5);
    if (D.hp <= 0) { D.hp = 0; w.setBlock(D.x, D.y, D.z, 0); endDefense(false); }
  };
  let defAcc = 0;
  function defenseTick(dt) {
    if (!D?.on || !auth()) return;
    if (w.getBlock(D.x, D.y, D.z) !== 227) { flash('Sacaste el núcleo: la defensa se terminó'); endDefense(false); return; }
    if (D.pause > 0) { D.pause -= dt; if (D.pause <= 0) spawnWave(); }
    else {
      let left = 0; for (const m of g.mobs.list.values()) if (m.defense && !m.dying) left++;
      D.left = left;
      if (!left) {
        reward(D.wave * 3, false);
        flash(`✔ Oleada ${D.wave} rechazada (+${D.wave * 3} fichas)`);
        if (D.wave >= WAVES) { endDefense(true); return; }
        D.pause = 20;
      }
    }
    defAcc += dt;
    if (defAcc > 1) { defAcc = 0; share(); }
    renderHud();
  }
  api.onUseBlock = (t, tb) => {
    if (t.id !== 227) return false;
    if (D?.on) { flash(`Defensa en curso: oleada ${D.wave}/${WAVES}`); return true; }
    ctx.openPanel('Núcleo del refugio', (list) => {
      list.insertAdjacentHTML('beforeend', `<p>Cuando estés listo, los mutantes${magic ? ' (orcos, huargos y trolls)' : ''} van a venir en <b>${WAVES} oleadas</b> cada vez más fuertes a romper el núcleo. Construí muros, trampas y torres, y defendelo con tus amigos.</p><p class="muted">Cada oleada rechazada da fichas; si resistís las 10, un gran premio. Si rompen el núcleo, se pierde.</p>`);
      const b = document.createElement('button'); b.className = 'primary'; b.textContent = '🛡 Empezar la defensa';
      b.onclick = () => { ctx.closeInventory(); startDefense(t.x, t.y, t.z); ctx.lockPointer(); };
      list.appendChild(b);
    });
    return true;
  };

  // red: estado de la defensa y premios para todos
  const prevFx = net.onFx;
  net.onFx = (m) => {
    if (m.op === 'defense') { if (!auth()) { D = m.s; renderHud(); } return; }
    if (m.op === 'defReward') { if (!auth()) { p.give(353, m.n); if (m.win) { p.give(397, 1); p.onEvent('v9', 'defensa'); } } return; }
    prevFx?.(m);
  };

  // ---------- una sola vida ----------
  const hard = meta.mode === 'hardcore';
  api.hard = hard;
  function score() {
    const days = meta.nights || 0;
    const kills = Object.values(meta.kills || {}).reduce((a, b) => a + b, 0);
    const ach = Object.keys(meta.achievements || {}).length;
    return { days, kills, ach, score: days * 100 + kills * 10 + ach * 25 };
  }
  if (hard) {
    const prevDeath = p.onDeath;
    p.onDeath = (cause) => {
      if (meta.runOver) return prevDeath(cause);
      meta.runOver = true;
      prevDeath(cause); // arma el cartel de siempre (con la causa) y después lo cambiamos
      const s = score();
      const run = { name: p.name, ...s, cause: String(cause).slice(0, 40), world: meta.name, type: meta.worldType || 'normal', seed: meta.seed, at: Date.now() };
      const runs = localRuns(); runs.push(run); runs.sort((a, b) => b.score - a.score);
      try { localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, 30))); } catch { /* sin almacenamiento */ }
      const best = runs.indexOf(run) === 0;
      const ov = document.querySelector('#death');
      ov.querySelector('h2').textContent = '☠ FIN DE LA PARTIDA';
      document.querySelector('#deathCause').innerHTML = `${document.querySelector('#deathCause').textContent || ''}<br><br>Sobreviviste <b>${s.days}</b> día${s.days === 1 ? '' : 's'} · <b>${s.kills}</b> criaturas · <b>${s.ach}</b> logros<br><span style="font-size:28px;color:#ffd84a">${s.score} puntos</span>${best ? '<br>🏆 ¡Tu mejor partida!' : ''}<br><small id="runCloud" class="muted">${cloudSession() ? 'Enviando al ranking…' : 'Entrá a ☁ Mundo del grupo con tu cuenta para salir en el ranking de todos.'}</small>`;
      document.querySelector('#respawn').hidden = true;
      ov.querySelector('p.muted').hidden = true;
      let end = ov.querySelector('#runEnd');
      if (!end) { end = document.createElement('button'); end.id = 'runEnd'; end.className = 'primary'; ov.appendChild(end); }
      end.hidden = false; end.textContent = 'Volver al menú';
      end.onclick = () => { end.hidden = true; ctx.endRun(); };
      ov.hidden = false;
      if (cloudSession()) Cloud.init().then((u) => (u ? Cloud.submitScore({ name: p.name, score: s.score, days: s.days, kills: s.kills, world_type: run.type, seed: meta.seed, cause: run.cause }) : Promise.reject(new Error('sin sesión'))))
        .then(() => { const el = document.querySelector('#runCloud'); if (el) el.textContent = '✔ Enviado al ranking'; })
        .catch(() => { const el = document.querySelector('#runCloud'); if (el) el.textContent = 'No se pudo enviar al ranking (queda guardado en este dispositivo).'; });
      p.onEvent('v9', 'unavida');
    };
  }
  let hardAcc = 0;
  api.update = (dt) => {
    defenseTick(dt);
    if (hard) { hardAcc += dt; if (hardAcc > 2) { hardAcc = 0; g.mobs.hardLvl = 1 + Math.floor((meta.nights || 0) / 3); } }
  };
  api.dispose = () => { hud.remove(); net.onFx = prevFx; g.mobs.onSiege = null; g.mobs.hardLvl = 0; };
  return api;
}

// ---------- ranking (menú) ----------
export async function openRanking() {
  let ov = document.querySelector('#ranking');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'ranking'; ov.className = 'overlay';
    ov.innerHTML = `<div class="card" style="width:min(520px,100%)"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">🏆 Una sola vida</h2><button id="rkClose">Cerrar</button></div>
      <p class="muted" style="font-size:15px">Modo de mundo <b>☠ Una sola vida</b>: si morís, la partida termina. Puntos = días × 100 + criaturas × 10 + logros × 25. Las criaturas se hacen más fuertes cada 3 días.</p>
      <div class="row2"><button id="rkCloud" class="primary">De todos (nube)</button><button id="rkLocal">En este dispositivo</button></div><div id="rkList" style="margin-top:8px"></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('#rkClose').onclick = () => { ov.hidden = true; };
    ov.querySelector('#rkLocal').onclick = () => show(localRuns(), 'Todavía no jugaste ninguna partida de una sola vida en este dispositivo.');
    ov.querySelector('#rkCloud').onclick = loadCloud;
  }
  const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  function show(rows, empty) {
    const L = ov.querySelector('#rkList');
    if (!rows.length) { L.innerHTML = `<p class="empty">${empty}</p>`; return; }
    L.innerHTML = rows.slice(0, 25).map((r, i) => `<div class="world"><div><b>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1 + '.'} ${esc(r.name)} — ${r.score} pts</b><small>${r.days} días · ${r.kills} criaturas${r.world_type === 'magic' || r.type === 'magic' ? ' · 🧙 Eldra' : ''}${r.cause ? ' · ' + esc(r.cause) : ''}</small></div></div>`).join('');
  }
  async function loadCloud() {
    const L = ov.querySelector('#rkList');
    if (!cloudSession()) { L.innerHTML = '<p class="empty">Para ver y aparecer en el ranking de todos, entrá con tu cuenta en ☁ Mundo del grupo.</p>'; return; }
    L.innerHTML = '<p class="muted">Cargando…</p>';
    try { await Cloud.init(); show(await Cloud.topScores(25), 'Nadie terminó una partida todavía. ¡Sé el primero!'); }
    catch (e) { L.innerHTML = `<p class="empty">No se pudo cargar el ranking (${esc(e.message)}).</p>`; }
  }
  ov.hidden = false;
  loadCloud();
}
