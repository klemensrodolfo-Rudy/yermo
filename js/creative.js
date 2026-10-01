// Creativo v9.5: pulsadores, bloques musicales, caja musical con melodías propias y lienzos para pintar.
import * as THREE from 'three';

// ---------- música ----------
const NOTE = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11, c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const noteName = (m) => `${NAMES[m % 12]} ${Math.floor(m / 12) - 1}`;
export const INSTRUMENTS = { piano: 'Piano', guitar: 'Guitarra', bell: 'Campana', flute: 'Flauta', drum: 'Tambor', bass: 'Bajo' };
// "do re mi - sol5 la#" → [[midi|null, beats], ...]. Octava por defecto 4 (do = 60). "_" alarga la nota anterior.
export function parseMelody(txt) {
  const out = [];
  for (const raw of String(txt).toLowerCase().replace(/[|,]/g, ' ').split(/\s+/)) {
    if (!raw) continue;
    if (raw === '-' || raw === '.') { out.push([null, 1]); continue; }
    if (raw === '_') { if (out.length) out[out.length - 1][1]++; continue; }
    const m = raw.match(/^(do|re|mi|fa|sol|la|si|[cdefgab])(#|b)?(\d)?$/);
    if (!m) continue;
    let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    out.push([(+(m[3] ?? 4) + 1) * 12 + n, 1]);
  }
  return out.slice(0, 200);
}
export const SONGS = {
  'Martinillo': 'do re mi do do re mi do mi fa sol - mi fa sol - sol la sol fa mi do sol la sol fa mi do do sol3 do - do sol3 do -',
  'Arroz con leche': 'sol do do re mi sol mi - re do re - sol3 - sol do do re mi sol mi - re fa mi re do',
  'Feliz cumpleaños': 'sol3 sol3 la3 sol3 do si3 _ sol3 sol3 la3 sol3 re do _ sol3 sol3 sol mi do si3 la3 fa fa mi do re do _',
  'Escala': 'do re mi fa sol la si do5',
};

export function createCreative(ctx) {
  const { game: g, net, sfx, flash, scene, camera, particles } = ctx;
  const p = g.player, w = g.world, sim = g.sim;
  const api = {};
  const k3 = (x, y, z) => x + ',' + y + ',' + z;
  const auth = () => ctx.isAuthority();

  function hearFrom(x, y, z) { const d = Math.hypot(x + 0.5 - p.pos.x, y + 0.5 - p.pos.y, z + 0.5 - p.pos.z); return d > 40 ? 0 : 1 - d / 44; }
  function playAt(x, y, z, midi, inst) {
    const v = hearFrom(x, y, z); if (v <= 0) return;
    sfx.instrument?.(midi, inst, v);
    const hue = (midi % 12) / 12, c = new THREE.Color().setHSL(hue, 0.8, 0.6);
    particles.burst(x, y + 1, z, [c.r * 255, c.g * 255, c.b * 255], 3, 0.25);
  }
  // instrumento según el bloque de abajo
  function instUnder(x, y, z) {
    const b = w.getBlock(x, y - 1, z);
    if (b === 14) return 'bell';
    if (b === 229 || b === 6 || b === 4) return 'drum';
    if (b === 23 || b === 209 || b === 15) return 'guitar';
    if (b === 2 || b === 3 || b === 9) return 'bass';
    if (b === 147 || b === 148) return 'flute';
    return 'piano';
  }
  const noteOf = (x, y, z) => sim.containers.get(k3(x, y, z))?.n ?? 60;
  function setNote(x, y, z, n) { const k = k3(x, y, z); sim.containers.set(k, { type: 'note', n }); if (auth()) sim.touch(k); else net.sendContainer(k, sim.containers.get(k)); }
  const timers = new Set();
  function playMelody(x, y, z, c, local = true) {
    const notes = parseMelody(c.melody || ''), beat = 60 / Math.max(40, Math.min(240, c.tempo || 120)) * 1000;
    let t = 0;
    for (const [m, len] of notes) {
      if (m != null) { const id = setTimeout(() => { timers.delete(id); playAt(x, y, z, m, c.inst || 'piano'); }, t); timers.add(id); }
      t += beat * len;
    }
    if (local && net.active) net.send({ t: 'fx', op: 'melody', x, y, z, melody: c.melody, inst: c.inst, tempo: c.tempo });
  }
  // la electricidad los hace sonar (lo decide el anfitrión y lo manda a todos)
  sim.onNote = (x, y, z, b) => {
    if (b === 245) { const n = noteOf(x, y, z), inst = instUnder(x, y, z); playAt(x, y, z, n, inst); if (net.active) net.send({ t: 'fx', op: 'note', x, y, z, n, inst }); }
    if (b === 246) { const c = sim.containers.get(k3(x, y, z)); if (c?.melody) playMelody(x, y, z, c); }
  };

  // ---------- lienzos ----------
  const PAL = ['#1a1a1a', '#ffffff', '#9a9a9a', '#5a3a1a', '#d83a3a', '#f08a2a', '#f0d040', '#5ab040', '#2a6a2a', '#5ac8f0', '#2a5ac8', '#8a4ad8', '#f08ac8', '#e8c8a0', '#c08a50', 'transparent'];
  const blank = () => '1'.repeat(256);
  const paints = new Map();
  function canvasTex(px) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 16;
    const c2 = cv.getContext('2d');
    for (let i = 0; i < 256; i++) { const col = PAL[parseInt(px[i], 16)]; if (col === 'transparent') continue; c2.fillStyle = col; c2.fillRect(i % 16, Math.floor(i / 16), 1, 1); }
    const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  let paintAcc = 9;
  function updatePaints(dt) {
    paintAcc += dt; if (paintAcc < 1) return; paintAcc = 0;
    const seen = new Set();
    for (const [k, c] of sim.containers) {
      if (c.type !== 'canvas' || !c.px) continue;
      const [x, y, z] = k.split(',').map(Number);
      if (Math.hypot(x - p.pos.x, z - p.pos.z) > 48) continue;
      const blk = w.getBlock(x, y, z), framed = blk >= 1135 && blk <= 1138;
      if (blk !== 247 && !framed) continue;
      seen.add(k);
      const key = c.px + c.face + framed;
      let s = paints.get(k);
      if (s && s.key === key) continue;
      if (s) { scene.remove(s.mesh); s.mesh.material.map.dispose(); s.mesh.material.dispose(); }
      const [fx, fz] = c.face || [0, 1];
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(framed ? 0.66 : 0.94, framed ? 0.66 : 0.94), new THREE.MeshBasicMaterial({ map: canvasTex(c.px), transparent: true }));
      const off = framed ? -0.432 : 0.505;
      mesh.position.set(x + 0.5 + fx * off, y + 0.5, z + 0.5 + fz * off);
      mesh.rotation.y = Math.atan2(fx, fz);
      scene.add(mesh); paints.set(k, { mesh, key });
    }
    for (const [k, s] of paints) if (!seen.has(k)) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.map.dispose(); s.mesh.material.dispose(); paints.delete(k); }
  }
  function openPainter(t) {
    const k = k3(t.x, t.y, t.z);
    const c = sim.containers.get(k) || {};
    let face = c.face;
    if (!face) { const f = t.face; face = f && !f[1] ? [f[0], f[2]] : Math.abs(Math.sin(p.yaw)) > Math.abs(Math.cos(p.yaw)) ? [Math.sign(Math.sin(p.yaw)), 0] : [0, Math.sign(Math.cos(p.yaw))]; }
    let px = (c.px || blank()).split(''), color = 0, down = false;
    ctx.openPanel('Lienzo (16 × 16)', (list) => {
      const box = document.createElement('div');
      box.innerHTML = `<div style="display:grid;grid-template-columns:repeat(16,1fr);width:min(320px,80vw);aspect-ratio:1;border:2px solid #000;touch-action:none;background:repeating-conic-gradient(#ccc 0 25%,#eee 0 50%) 0 0/16px 16px" class="pgrid"></div>
        <div class="ppal" style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0"></div>
        <div class="row2"><button class="pfill">Rellenar todo</button><button class="psave primary">Guardar</button></div>`;
      list.appendChild(box);
      const grid = box.querySelector('.pgrid'), pal = box.querySelector('.ppal');
      const cells = [];
      for (let i = 0; i < 256; i++) { const d = document.createElement('div'); d.style.background = PAL[parseInt(px[i], 16)]; grid.appendChild(d); cells.push(d); }
      const paint = (e) => {
        const r = grid.getBoundingClientRect(), pt = e.touches ? e.touches[0] : e;
        const cx = Math.floor((pt.clientX - r.left) / r.width * 16), cy = Math.floor((pt.clientY - r.top) / r.height * 16);
        if (cx < 0 || cy < 0 || cx > 15 || cy > 15) return;
        const i = cx + cy * 16; px[i] = color.toString(16); cells[i].style.background = PAL[color];
      };
      grid.onpointerdown = (e) => { down = true; grid.setPointerCapture(e.pointerId); paint(e); };
      grid.onpointermove = (e) => { if (down) paint(e); };
      grid.onpointerup = () => { down = false; };
      PAL.forEach((col, i) => {
        const b = document.createElement('button'); b.style.cssText = `width:28px;height:28px;padding:0;margin:0;background:${col === 'transparent' ? 'repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/8px 8px' : col};border:3px solid ${i === color ? '#e8c040' : '#000'}`;
        b.title = col === 'transparent' ? 'Transparente' : col;
        b.onclick = () => { color = i; [...pal.children].forEach((x, j) => { x.style.borderColor = j === color ? '#e8c040' : '#000'; }); };
        pal.appendChild(b);
      });
      box.querySelector('.pfill').onclick = () => { px = Array(256).fill(color.toString(16)); cells.forEach((d) => { d.style.background = PAL[color]; }); };
      box.querySelector('.psave').onclick = () => {
        const nc = { type: 'canvas', px: px.join(''), face };
        sim.containers.set(k, nc); if (auth()) sim.touch(k); else net.sendContainer(k, nc);
        paintAcc = 9; flash('🖼 Cuadro guardado'); p.onEvent('v9', 'pintor'); ctx.closeInventory();
      };
    });
  }

  // ---------- caja musical ----------
  function openMusicBox(t) {
    const k = k3(t.x, t.y, t.z);
    const c = { melody: SONGS['Martinillo'], inst: 'piano', tempo: 140, ...(sim.containers.get(k) || {}) };
    ctx.openPanel('Caja musical', (list) => {
      list.insertAdjacentHTML('beforeend', `<p class="muted" style="font-size:15px">Escribí la melodía con notas separadas por espacios: <b>do re mi fa sol la si</b> (o C D E F G A B), <b>#</b> sostenido, un número para la octava (<b>do5</b> más agudo, <b>sol3</b> más grave), <b>-</b> silencio y <b>_</b> alarga la nota anterior. Suena al hacer clic en «Probar» o cuando le llega electricidad (palanca, pulsador, placa o sensor).</p>
        <textarea class="mel" rows="4" style="width:100%;font:inherit;font-size:16px" maxlength="800"></textarea>
        <div class="row2"><select class="inst">${Object.entries(INSTRUMENTS).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select><label>Tempo <input class="tempo" type="range" min="60" max="240" step="10"></label></div>
        <div class="row2"><select class="song"><option value="">Canciones de ejemplo…</option>${Object.keys(SONGS).map((s) => `<option>${s}</option>`).join('')}</select><button class="try">▶ Probar</button></div>
        <button class="save primary" style="width:100%">Guardar</button>`);
      const $ = (s) => list.querySelector(s);
      $('.mel').value = c.melody; $('.inst').value = c.inst; $('.tempo').value = c.tempo;
      $('.mel').addEventListener('keydown', (e) => e.stopPropagation());
      $('.song').onchange = (e) => { if (e.target.value) $('.mel').value = SONGS[e.target.value]; };
      const read = () => ({ type: 'musicbox', melody: $('.mel').value.slice(0, 800), inst: $('.inst').value, tempo: +$('.tempo').value });
      $('.try').onclick = () => { for (const id of timers) clearTimeout(id); timers.clear(); playMelody(t.x, t.y, t.z, read(), false); };
      $('.save').onclick = () => { const nc = read(); sim.containers.set(k, nc); if (auth()) sim.touch(k); else net.sendContainer(k, nc); flash('🎵 Melodía guardada'); p.onEvent('v9', 'musico'); ctx.closeInventory(); };
    });
  }

  // ---------- clic derecho ----------
  api.onUseBlock = (t) => {
    if (t.id === 240) { if (auth()) sim.pressButton(t.x, t.y, t.z); else net.send({ t: 'fx', op: 'button', x: t.x, y: t.y, z: t.z }); sfx.click(); return true; }
    if (t.id === 245) {
      const n0 = noteOf(t.x, t.y, t.z), n = p.keys.ShiftLeft ? (n0 <= 36 ? 84 : n0 - 1) : (n0 >= 84 ? 36 : n0 + 1);
      setNote(t.x, t.y, t.z, n);
      const inst = instUnder(t.x, t.y, t.z);
      playAt(t.x, t.y, t.z, n, inst);
      if (net.active) net.send({ t: 'fx', op: 'note', x: t.x, y: t.y, z: t.z, n, inst });
      flash(`🎵 ${noteName(n)} · ${INSTRUMENTS[inst]} (Shift: bajar)`);
      return true;
    }
    if (t.id === 246) { openMusicBox(t); return true; }
    if (t.id === 247) { openPainter(t); return true; }
    return false;
  };

  const prevFx = net.onFx;
  net.onFx = (m) => {
    if (m.op === 'button') { if (auth()) sim.pressButton(m.x, m.y, m.z); return; }
    if (m.op === 'note') { playAt(m.x, m.y, m.z, m.n, m.inst); return; }
    if (m.op === 'melody') { playMelody(m.x, m.y, m.z, m, false); return; }
    prevFx?.(m);
  };
  api.update = (dt) => updatePaints(dt);
  api.dispose = () => {
    for (const id of timers) clearTimeout(id);
    for (const s of paints.values()) scene.remove(s.mesh);
    net.onFx = prevFx; sim.onNote = null;
  };
  return api;
}
