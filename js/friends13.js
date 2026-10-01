// Con amigos v13.3: el mundo avanza mientras no estás (cultivos y baterías), carreras en globo con
// aros y ranking, y un concurso semanal de construcción con votos en la galería del grupo.
import * as THREE from 'three';
import { BLOCKS, CROPS } from './blocks.js';
import { BATTERY_MAX } from './sim.js';
import { Cloud } from './cloud.js';
import { hash2 } from './noise.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const p3 = (k) => k.split(',').map(Number);
export const THEMES = ['La casa más linda', 'El puente más largo', 'Una torre que se vea de lejos', 'Un jardín con flores', 'Una base en una cueva', 'Un barco', 'Una plaza para el pueblo', 'Un castillo', 'Algo con vitrales', 'Una granja con animales', 'Un faro', 'Una casa en el árbol'];
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-${Math.ceil(((t - y0) / 864e5 + 1) / 7)}`;
}
const themeOf = (wk) => { let h = 0; for (const c of wk) h = (h * 31 + c.charCodeAt(0)) >>> 0; return THEMES[h % THEMES.length]; };

export function createFriends13(ctx) {
  const { game: g, flash, sfx } = ctx;
  const p = g.player, w = g.world, sim = g.sim, meta = g.meta;
  const api = {};
  const auth = () => ctx.isAuthority();

  // ---------- el mundo avanza mientras no estás ----------
  const now = Date.now(), last = meta.lastSeenT || meta.lastPlayed || now;
  const away = Math.min(24 * 3600, Math.max(0, (now - last) / 1000));
  if (away > 600 && auth()) setTimeout(() => {
    let crops = 0, bats = 0;
    for (const k of [...sim.crops]) {
      const [x, y, z] = p3(k), b = w.getBlock(x, y, z), cr = BLOCKS[b]?.crop;
      if (!cr) continue;
      const adv = Math.min(3 - cr.stage, Math.floor(away / 900 * (0.6 + Math.random() * 0.8)));
      if (adv > 0) { w.setBlock(x, y, z, CROPS[cr.kind].base + cr.stage + adv); crops++; }
    }
    for (const [k, c] of sim.containers) if (c.type === 'battery' && (c.charge || 0) < BATTERY_MAX) { c.charge = Math.min(BATTERY_MAX, (c.charge || 0) + away * 0.25); sim.touch(k); bats++; }
    const h = Math.floor(away / 3600), m = Math.floor((away % 3600) / 60);
    const parts = [crops && (crops === 1 ? '🌾 creció 1 cultivo' : `🌾 crecieron ${crops} cultivos`), bats && (bats === 1 ? '🔋 se cargó tu batería' : `🔋 se cargaron ${bats} baterías`)].filter(Boolean);
    flash(`🕰 Mientras no estabas (${h ? h + ' h ' : ''}${m} min)${parts.length ? ': ' + parts.join(' · ') : ' el yermo siguió su curso'}`);
  }, 4000);
  let seenAcc = 0;

  // ---------- carrera en globo ----------
  const ringGeo = new THREE.TorusGeometry(3.2, 0.28, 8, 28);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe8c040 }), nextMat = new THREE.MeshBasicMaterial({ color: 0x9cff3a }), doneMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a, transparent: true, opacity: 0.35 });
  let race = null;
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#ffe9a8;font:26px VT323,monospace;padding:4px 14px;border:2px solid #000;z-index:6;pointer-events:none';
  hud.hidden = true; document.body.appendChild(hud);
  function course() {
    // mismo recorrido para todos en este mundo: arranca cerca del origen
    const o = meta.origin || { x: 0, z: 0 }, s = meta.seed | 0;
    const pts = []; let x = o.x + 20, z = o.z + 20, a = hash2(s, 7, 7) * Math.PI * 2;
    for (let i = 0; i < 10; i++) {
      a += (hash2(s + i, 3, 9) - 0.5) * 1.6; x += Math.cos(a) * 34; z += Math.sin(a) * 34;
      const h = g.gen.column(Math.round(x), Math.round(z)).h;
      pts.push([x, Math.max(h, 40) + 12 + hash2(s + i, 5, 1) * 12, z, a]);
    }
    return pts;
  }
  function startRace() {
    if (p.riding?.type !== 'balloon') { flash('🎈 Subite a un globo aerostático para correr'); return; }
    const pts = course();
    const rings = pts.map(([x, y, z, a], i) => { const m = new THREE.Mesh(ringGeo, i === 0 ? nextMat : ringMat); m.position.set(x, y, z); m.rotation.y = -a + Math.PI / 2; ctx.scene.add(m); return m; });
    race = { pts, rings, i: 0, t: 0, started: false };
    meta.waypoints = meta.waypoints || [];
    flash('🎈 Carrera en globo: pasá por los 10 aros en orden. El reloj arranca en el primero (verde).');
    hud.hidden = false;
  }
  function endRace(ok) {
    for (const r of race.rings) ctx.scene.remove(r);
    hud.hidden = true;
    if (ok) {
      const ms = Math.round(race.t * 1000), best = meta.balloonBest;
      if (!best || ms < best) meta.balloonBest = ms;
      flash(`🏁 ¡Llegaste! ${(ms / 1000).toFixed(1)} s${!best || ms < best ? ' · ¡récord del mundo!' : ` · récord: ${(best / 1000).toFixed(1)} s`}`);
      sfx.achievement?.(); p.onEvent('v13', 'carrera'); g.album?.snap(`🎈 Carrera en globo: ${(ms / 1000).toFixed(1)} s`);
      if (meta.cloud || Cloud.user) Cloud.submitScore({ score: Math.max(0, 900000 - ms), days: 0, kills: 0, world_type: 'globo', seed: meta.seed, cause: null }).catch(() => {});
    }
    race = null;
  }
  function tickRace(dt) {
    if (!race) return;
    if (p.riding?.type !== 'balloon') { flash('🎈 Te bajaste del globo: carrera cancelada'); endRace(false); return; }
    if (race.started) race.t += dt;
    const [x, y, z] = race.pts[race.i];
    for (const [j, r] of race.rings.entries()) r.material = j < race.i ? doneMat : j === race.i ? nextMat : ringMat;
    race.rings[race.i].rotation.z += dt;
    const d = Math.hypot(p.pos.x - x, p.pos.y + 1 - y, p.pos.z - z);
    if (d < 4.2) {
      sfx.coin?.(); if (!race.started) race.started = true;
      race.i++;
      if (race.i >= race.pts.length) { endRace(true); return; }
    }
    hud.textContent = `🎈 Aro ${race.i + 1}/${race.pts.length} · ${race.t.toFixed(1)} s · faltan ${Math.round(d)} m`;
  }
  async function openRanking() {
    ctx.openPanel('🎈 Carreras en globo', async (list) => {
      list.insertAdjacentHTML('beforeend', `<p>Subite a un globo y tocá <b>Correr</b>: 10 aros en el aire, siempre el mismo recorrido en este mundo (arranca cerca del inicio). Récord tuyo acá: <b>${meta.balloonBest ? (meta.balloonBest / 1000).toFixed(1) + ' s' : '—'}</b></p>`);
      const b = document.createElement('button'); b.className = 'primary'; b.textContent = '🎈 Correr ahora'; b.onclick = () => { ctx.closeInventory(); startRace(); }; list.appendChild(b);
      try {
        await Cloud.init?.();
        const { data } = await Cloud.sb.from('yermo_scores').select('name, score, seed').eq('world_type', 'globo').eq('seed', meta.seed).order('score', { ascending: false }).limit(10);
        if (data?.length) list.insertAdjacentHTML('beforeend', '<h3 style="margin:10px 0 4px">Mejores tiempos del grupo</h3>' + data.map((r, i) => `<p>${i + 1}. <b>${esc(r.name)}</b> · ${((900000 - r.score) / 1000).toFixed(1)} s</p>`).join(''));
      } catch { /* sin nube */ }
    });
  }
  api.startRace = startRace;

  // ---------- concurso semanal de construcción ----------
  async function openContest() {
    const wk = weekKey(), theme = themeOf(wk), tag = `🏆${wk}`;
    ctx.openPanel('🏆 Concurso de construcción', async (list) => {
      list.insertAdjacentHTML('beforeend', `<p>Tema de esta semana: <b>${theme}</b></p><p class="muted" style="font-size:15px">Construilo, sacale una foto (modo foto, P) y presentala acá. Todos los del grupo pueden votar (un voto por foto; no a las propias). Cambia cada lunes.</p>`);
      const last = g.social?.lastPhoto;
      if (last) {
        const box = document.createElement('div'); box.className = 'quest';
        box.innerHTML = `<img src="${last}" style="width:100%;border:2px solid #000"><button class="primary">📤 Presentar esta foto</button>`;
        box.querySelector('button').onclick = async (e) => { e.target.disabled = true; try { await Cloud.addPhoto(last, `${tag} ${theme}`, meta.name); flash('🏆 ¡Presentada! Ahora a juntar votos'); p.onEvent('v13', 'concurso'); openContest(); } catch (er) { e.target.disabled = false; alert('No se pudo subir: ' + er.message); } };
        list.appendChild(box);
      } else list.insertAdjacentHTML('beforeend', '<p class="muted">Primero sacá una foto con el modo foto (F2 y P).</p>');
      const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px'; list.appendChild(grid);
      try {
        await Cloud.init?.();
        const ph = (await Cloud.photos(60)).filter((f) => (f.caption || '').startsWith(tag));
        if (!ph.length) { grid.innerHTML = '<p class="empty">Todavía nadie presentó nada esta semana.</p>'; return; }
        let votes = [];
        try { const r = await Cloud.sb.from('yermo_votes').select('photo_id, user_id').in('photo_id', ph.map((f) => f.id)); if (r.error) throw r.error; votes = r.data || []; } catch (er) { list.insertAdjacentHTML('beforeend', '<p class="empty">Para votar falta correr el SQL nuevo en Supabase.</p>'); }
        const count = (id) => votes.filter((v) => v.photo_id === id).length, mine = (id) => votes.some((v) => v.photo_id === id && v.user_id === Cloud.user?.id);
        ph.sort((a, b) => count(b.id) - count(a.id));
        ph.forEach((f, i) => {
          const c = document.createElement('div');
          c.innerHTML = `<img src="${f.image}" style="width:100%;border:2px solid ${i === 0 && count(f.id) ? '#e8c040' : '#000'}"><small>${i === 0 && count(f.id) ? '🥇 ' : ''}<b>${esc(f.name)}</b> · ⭐ ${count(f.id)}</small>`;
          if (f.user_id !== Cloud.user?.id) {
            const b = document.createElement('button'); b.textContent = mine(f.id) ? '✔ Votada (sacar)' : '⭐ Votar';
            b.onclick = async () => { b.disabled = true; try { if (mine(f.id)) await Cloud.sb.from('yermo_votes').delete().eq('photo_id', f.id).eq('user_id', Cloud.user.id); else await Cloud.sb.from('yermo_votes').insert({ photo_id: f.id }); } catch { /* sin permiso */ } openContest(); };
            c.appendChild(b);
          }
          grid.appendChild(c);
        });
      } catch (er) { grid.innerHTML = `<p class="empty">No se pudo cargar (${esc(er.message)}). Iniciá sesión en un mundo del grupo.</p>`; }
    });
  }
  api.openContest = openContest;

  // botones en la pausa
  const grid = document.querySelector('.ptab[data-t="juego"] .pgrid'), cb = document.querySelector('#socialBtns');
  const b1 = document.createElement('button'); b1.textContent = '🎈 Carrera en globo'; b1.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); openRanking(); };
  const b2 = document.createElement('button'); b2.textContent = '🏆 Concurso semanal'; b2.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); openContest(); };
  grid?.appendChild(b1); cb?.appendChild(b2);

  api.update = (dt) => {
    tickRace(dt);
    seenAcc += dt; if (seenAcc > 10) { seenAcc = 0; meta.lastSeenT = Date.now(); }
  };
  api.dispose = () => { if (race) endRace(false); hud.remove(); b1.remove(); b2.remove(); ringGeo.dispose(); };
  return api;
}
