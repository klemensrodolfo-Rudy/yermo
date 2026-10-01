// Recuerdos v13.4: álbum de viaje automático (fotos de los momentos importantes) y
// «Grabar recorrido»: un video de 30 segundos de tu mundo con la cámara volando sola.
import { BIOME_NAMES } from './worldgen.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

export function createMemories(ctx) {
  const { game: g, flash, sfx } = ctx;
  const p = g.player, meta = g.meta;
  const api = {};
  const KEY = 'yermo-album-' + meta.id;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-36))); } catch { /* sin lugar */ } };

  // ---------- álbum ----------
  let want = null;
  api.snap = (caption) => { if (!want && !tour) want = { caption, t: 0.35 }; };
  api.grab = () => {
    if (rec) recFrame();
    if (!want || want.t > 0) return;
    const src = ctx.renderer.domElement;
    if (!src.width || !src.height) return;
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const x = c.getContext('2d'); x.filter = src.style.filter || 'none'; x.drawImage(src, 0, 0, 320, 180);
    const a = load(); a.push({ img: c.toDataURL('image/jpeg', 0.7), caption: want.caption, at: Date.now(), day: meta.nights || 0 }); save(a);
    want = null;
  };
  const prevUnlock = g.ach.onUnlock;
  g.ach.onUnlock = (a) => { prevUnlock?.(a); api.snap('🏅 ' + a.name); };
  meta.albumBiomes = meta.albumBiomes || [];
  let bAcc = 0;
  function openAlbum() {
    ctx.openPanel('📔 Álbum de viaje', (list) => {
      const a = load();
      list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Se llena solo: cada logro, cada bioma nuevo y los momentos especiales (tesoros, eclipses, caravanas) quedan guardados con su foto.</p>');
      if (!a.length) { list.insertAdjacentHTML('beforeend', '<p class="empty">Todavía no hay recuerdos. ¡Salí a explorar!</p>'); return; }
      const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px';
      for (const e of [...a].reverse()) {
        const d = document.createElement('div');
        d.innerHTML = `<img src="${e.img}" style="width:100%;border:2px solid #000;cursor:pointer"><small><b>${esc(e.caption)}</b><br>Día ${e.day} · ${new Date(e.at).toLocaleDateString()}</small>`;
        d.querySelector('img').onclick = () => { const w = window.open(); if (w) w.document.write(`<title>${esc(e.caption)}</title><img src="${e.img}" style="width:100%;image-rendering:auto">`); };
        grid.appendChild(d);
      }
      list.appendChild(grid);
    });
  }
  api.openAlbum = openAlbum;

  // ---------- grabar recorrido ----------
  let tour = null, rec = null;
  function startTour() {
    if (typeof MediaRecorder === 'undefined') { flash('Este navegador no puede grabar video'); return; }
    const home = meta.spawn || meta.beds?.find((b) => b.owner === p.name) || meta.origin || { x: p.pos.x, y: p.pos.y, z: p.pos.z };
    const hx = home.x, hz = home.z, hy = g.gen.column(Math.round(hx), Math.round(hz)).h + 1;
    const save0 = { pos: p.pos.clone(), yaw: p.yaw, pitch: p.pitch, flying: p.flying, photo: g.features.photo };
    // cámara: vuelta alrededor de tu lugar, subida en espiral y alejarse mostrando todo
    const shots = [
      { dur: 9, title: meta.name || 'Mi mundo', sub: 'Día ' + (meta.nights || 0), cam: (t) => { const a = t * 2.2; return { pos: [hx + Math.cos(a) * 16, hy + 7, hz + Math.sin(a) * 16], look: [hx, hy + 1, hz] }; } },
      { dur: 11, title: 'Desde arriba', sub: BIOME_NAMES[g.gen.column(Math.round(hx), Math.round(hz)).biome] || '', cam: (t) => { const a = 2.2 + t * 2.4, r = 16 + t * 34; return { pos: [hx + Math.cos(a) * r, hy + 7 + t * 40, hz + Math.sin(a) * r], look: [hx, hy, hz] }; } },
      { dur: 10, title: 'YERMO', sub: 'klemensrodolfo-rudy.github.io/yermo', cam: (t) => { const a = 4.6 + t * 0.6, r = 50 + t * 40; return { pos: [hx + Math.cos(a) * r, hy + 47 + t * 25, hz + Math.sin(a) * r], look: [hx + (1 - t) * 0, hy, hz] }; } },
    ];
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const x = c.getContext('2d');
    const stream = c.captureStream(30);
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const mr = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 5e6 } : undefined);
    const chunks = []; mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: mr.mimeType || 'video/webm' }), url = URL.createObjectURL(blob);
      const ext = (mr.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
      ctx.openPanel('🎬 Tu recorrido', (list) => {
        list.insertAdjacentHTML('beforeend', `<video src="${url}" controls style="width:100%;border:2px solid #000"></video>`);
        const a = document.createElement('a'); a.href = url; a.download = `yermo-${(meta.name || 'mundo').replace(/[^\w-]+/g, '_')}.${ext}`; a.textContent = '💾 Guardar el video'; a.className = 'btn'; a.style.cssText = 'display:inline-block;margin:6px 4px;padding:4px 10px;border:2px solid #000;background:#e8c040;color:#000';
        list.appendChild(a);
        if (navigator.canShare?.({ files: [new File([blob], 'yermo.' + ext, { type: blob.type })] })) {
          const s = document.createElement('button'); s.textContent = '📤 Compartir'; s.onclick = () => navigator.share({ files: [new File([blob], 'yermo.' + ext, { type: blob.type })], title: 'Mi mundo en YERMO' }).catch(() => {}); list.appendChild(s);
        }
      });
    };
    tour = { shots, i: 0, t: 0, save0 };
    rec = { x, c, mr };
    g.features.photo = true; p.flying = true;
    mr.start(500);
    flash('🎬 Grabando… (Esc para cortar)');
    p.onEvent('v13', 'cineasta');
  }
  function recFrame() {
    const { x } = rec, src = ctx.renderer.domElement, sh = tour?.shots[tour.i];
    if (!src.width || !src.height) return;
    x.filter = src.style.filter || 'none'; x.drawImage(src, 0, 0, 1280, 720); x.filter = 'none';
    if (!sh) return;
    const a = Math.min(1, tour.t / 0.8, (sh.dur - tour.t) / 0.8);
    if (a <= 0) return;
    x.save(); x.globalAlpha = a; x.shadowColor = '#000'; x.shadowBlur = 8;
    x.fillStyle = '#e8c040'; x.font = '64px VT323, monospace'; x.fillText(sh.title, 50, 620);
    x.fillStyle = '#f0e6d0'; x.font = '34px VT323, monospace'; x.fillText(sh.sub, 54, 662);
    x.restore();
  }
  function endTour() {
    const s = tour.save0;
    p.pos.copy(s.pos); p.yaw = s.yaw; p.pitch = s.pitch; p.flying = s.flying; g.features.photo = s.photo;
    tour = null;
    if (rec?.mr.state !== 'inactive') rec.mr.stop();
    rec = null;
  }
  function tickTour(dt) {
    if (!tour) return;
    if (document.querySelector('#pause') && !document.querySelector('#pause').hidden) { flash('🎬 Grabación cortada'); endTour(); return; }
    const sh = tour.shots[tour.i];
    tour.t += dt;
    const t = Math.min(1, tour.t / sh.dur), e = t * t * (3 - 2 * t), cm = sh.cam(e);
    p.pos.set(cm.pos[0], cm.pos[1], cm.pos[2]); p.vel.set(0, 0, 0);
    const dx = cm.look[0] - cm.pos[0], dy = cm.look[1] - cm.pos[1] - 1.6, dz = cm.look[2] - cm.pos[2];
    p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    if (tour.t >= sh.dur) { tour.i++; tour.t = 0; if (tour.i >= tour.shots.length) endTour(); }
  }
  api.startTour = startTour;

  // botones en la pausa
  const grid = document.querySelector('.ptab[data-t="juego"] .pgrid');
  const b1 = document.createElement('button'); b1.textContent = '📔 Álbum'; b1.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); openAlbum(); };
  const b2 = document.createElement('button'); b2.textContent = '🎬 Grabar recorrido'; b2.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); setTimeout(startTour, 300); };
  grid?.append(b1, b2);

  api.update = (dt) => {
    if (want) want.t -= dt;
    tickTour(dt);
    bAcc += dt;
    if (bAcc > 2 && !tour) {
      bAcc = 0;
      const b = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
      if (!meta.albumBiomes.includes(b) && b !== 11) { meta.albumBiomes.push(b); if (meta.albumBiomes.length > 1) api.snap('🗺 Llegaste a ' + BIOME_NAMES[b]); }
    }
  };
  api.dispose = () => { if (tour) endTour(); g.ach.onUnlock = prevUnlock; b1.remove(); b2.remove(); };
  return api;
}
