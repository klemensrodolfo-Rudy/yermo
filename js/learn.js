// Aprender v9.8: robot profe con desafíos de cuentas y palabras, cofres con acertijo, y construcción guiada
// paso a paso con una silueta fantasma de cada capa.
import * as THREE from 'three';
import { BLOCKS, itemName } from './blocks.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const norm = (s) => String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const WORDS = ['casa', 'perro', 'gato', 'arbol', 'mesa', 'sol', 'luna', 'agua', 'fuego', 'piedra', 'flor', 'pato', 'leche', 'pelota', 'escuela', 'amigo', 'camino', 'puerta', 'ventana', 'barco', 'isla', 'tren', 'nube', 'lapiz', 'libro', 'robot', 'mapa', 'tesoro', 'castillo', 'dragon', 'caballo', 'cohete'];
export const LEVEL_NAMES = ['', 'Sumas hasta 10', 'Sumas y restas hasta 20', 'Tablas del 2 al 5', 'Tablas del 2 al 10', 'Divisiones y cuentas de dos pasos'];
// pregunta según el nivel: { q, a: [respuestas aceptadas] }
export function makeQuestion(level, words = true) {
  if (words && Math.random() < 0.3) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)], i = rnd(0, w.length - 1);
    return { q: `Completá la palabra: <b style="letter-spacing:4px">${(w.slice(0, i) + '_' + w.slice(i + 1)).toUpperCase()}</b>`, a: [w, w[i]], kind: 'palabra' };
  }
  let a, b;
  switch (level) {
    case 1: a = rnd(1, 6); b = rnd(1, 10 - a); return { q: `¿Cuánto es ${a} + ${b}?`, a: [String(a + b)] };
    case 2: if (Math.random() < 0.5) { a = rnd(2, 12); b = rnd(1, 20 - a); return { q: `¿Cuánto es ${a} + ${b}?`, a: [String(a + b)] }; } a = rnd(5, 20); b = rnd(1, a); return { q: `¿Cuánto es ${a} − ${b}?`, a: [String(a - b)] };
    case 3: a = rnd(2, 5); b = rnd(1, 10); return { q: `¿Cuánto es ${a} × ${b}?`, a: [String(a * b)] };
    case 4: a = rnd(2, 10); b = rnd(2, 10); return { q: `¿Cuánto es ${a} × ${b}?`, a: [String(a * b)] };
    default: {
      if (Math.random() < 0.5) { b = rnd(2, 10); const r = rnd(2, 10); return { q: `¿Cuánto es ${b * r} ÷ ${b}?`, a: [String(r)] }; }
      a = rnd(2, 9); b = rnd(2, 9); const c = rnd(1, 20); return { q: `¿Cuánto es ${a} × ${b} + ${c}?`, a: [String(a * b + c)] };
    }
  }
}

// ---------- construcciones guiadas ----------
// cada capa es una lista de filas; la leyenda dice qué bloque va en cada letra ('.' = nada)
export const BUILDS = {
  casita: {
    name: '🏠 Casita', legend: { P: 23, V: 14, D: 65, T: 13, R: 26 },
    layers: [
      ['PPPPP', 'P...P', 'P...P', 'P...P', 'PPDPP'],
      ['PPPPP', 'V...V', 'P...P', 'V...V', 'PP.PP'],
      ['PPPPP', 'P...P', 'P...P', 'P..RP', 'PPPPP'],
      ['TTTTT', 'TTTTT', 'TTTTT', 'TTTTT', 'TTTTT'],
      ['.....', '.TTT.', '.TTT.', '.TTT.', '.....'],
    ],
  },
  torre: {
    name: '🗼 Torre de vigilancia', legend: { L: 15, S: 61, P: 23, F: 85, A: 26 },
    layers: [
      ['L.L', '...', 'L.L'], ['L.L', '...', 'L.L'], ['L.L', '...', 'L.L'], ['L.L', '...', 'L.L'], ['L.L', '...', 'L.L'],
      ['PPPPP', 'PPPPP', 'PPPPP', 'PPPPP', 'PPPPP'],
      ['F...F', '.....', '.....', '.....', 'F...F'],
      ['FA.AF', '.....', '.....', '.....', 'F...F'],
    ],
    offset: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [0, 0], [0, 0], [0, 0]],
  },
  puente: {
    name: '🌉 Puente', legend: { P: 23, F: 85, L: 15 },
    layers: [
      ['L.......L', 'L.......L'],
      ['PPPPPPPPP', 'PPPPPPPPP'],
      ['F.F.F.F.F', 'F.F.F.F.F'],
    ],
  },
  fuente: {
    name: '⛲ Fuente', legend: { S: 2, B: 13, A: 47, C: 9 },
    layers: [
      ['.SSSSS.', 'SSSSSSS', 'SSSSSSS', 'SSSSSSS', 'SSSSSSS', 'SSSSSSS', '.SSSSS.'],
      ['.BBBBB.', 'BAAAAAB', 'BAAAAAB', 'BAACAAB', 'BAAAAAB', 'BAAAAAB', '.BBBBB.'],
      ['.......', '.......', '.......', '...C...', '.......', '.......', '.......'],
      ['.......', '.......', '.......', '...C...', '.......', '.......', '.......'],
    ],
  },
  cohete: {
    name: '🚀 Cohete', legend: { B: 239, R: 236, V: 14, G: 238 },
    layers: [
      ['R...R', '.....', '..B..', '.....', 'R...R'],
      ['.R.R.', '.BBB.', '.BBB.', '.BBB.', '.R.R.'],
      ['.....', '.BBB.', '.B.B.', '.BBB.', '.....'],
      ['.....', '.BVB.', '.B.B.', '.BBB.', '.....'],
      ['.....', '.BBB.', '.B.B.', '.BBB.', '.....'],
      ['.....', '.RRR.', '.RRR.', '.RRR.', '.....'],
      ['.....', '.....', '..R..', '.....', '.....'],
      ['.....', '.....', '..G..', '.....', '.....'],
    ],
  },
};

export function createLearn(ctx) {
  const { game: g, ui, sfx, flash, scene, particles } = ctx;
  const p = g.player, w = g.world, meta = g.meta, sim = g.sim, inv = g.inv;
  const api = {};
  const auth = () => ctx.isAuthority();
  const k3 = (x, y, z) => x + ',' + y + ',' + z;
  const L = (meta.learn = meta.learn || { level: 1, streak: 0, right: 0, wrong: 0 });

  // ---------- panel de pregunta ----------
  function askPanel(title, intro, Q, onRight, onWrong) {
    ctx.openPanel(title, (list) => {
      list.insertAdjacentHTML('beforeend', `${intro ? `<p>${intro}</p>` : ''}<div class="quest"><p style="font-size:26px;text-align:center">${Q.q}</p>
        <div class="row2"><input class="ans" autocomplete="off" inputmode="${Q.kind === 'palabra' ? 'text' : 'numeric'}" style="font-size:24px;text-align:center"><button class="ok primary">Responder</button></div><p class="res" style="text-align:center;min-height:24px"></p></div>`);
      const inp = list.querySelector('.ans'), res = list.querySelector('.res');
      const go = () => {
        const v = norm(inp.value); if (!v) return;
        if (Q.a.map(norm).includes(v)) { res.innerHTML = '<b style="color:#9cff7a">✔ ¡Muy bien!</b>'; sfx.ding?.(); list.querySelector('.ok').disabled = true; setTimeout(() => onRight(), 650); }
        else { res.innerHTML = '<b style="color:#ff8a7a">✘ Casi… probá otra vez</b>'; sfx.click(); inp.select(); onWrong?.(); }
      };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
      list.querySelector('.ok').onclick = go;
      setTimeout(() => inp.focus(), 50);
    });
  }

  // ---------- robot profe ----------
  let session = null;
  function profe(m) {
    if (!session) session = { n: 0, ok: 0, total: 5 };
    const Q = makeQuestion(L.level);
    const intro = `🤖 <b>Profe Robi</b> · nivel ${L.level}: ${LEVEL_NAMES[L.level]} · pregunta ${session.n + 1} de ${session.total}${L.streak > 1 ? ` · 🔥 racha de ${L.streak}` : ''}`;
    let first = true;
    askPanel('Profe Robi', intro, Q, () => {
      session.n++; if (first) { session.ok++; L.right++; L.streak++; p.give(353, 1); } else L.streak = 0;
      if (L.streak >= 4 && L.level < 5) { L.level++; L.streak = 0; flash(`🎓 ¡Subiste al nivel ${L.level}: ${LEVEL_NAMES[L.level]}!`); sfx.achievement?.(); p.onEvent('v9', 'alumno'); }
      if (session.n >= session.total) {
        const ok = session.ok; session = null;
        if (ok >= 4) { p.give(397, 1); p.give(353, 3); }
        ctx.openPanel('Profe Robi', (list) => list.insertAdjacentHTML('beforeend', `<p>🤖 «${ok === 5 ? '¡Perfecto! Sos un genio.' : ok >= 4 ? '¡Muy bien! Te ganaste un regalo.' : ok >= 2 ? 'Bien, seguí practicando.' : 'No pasa nada, la próxima sale mejor.'}»</p><p>Acertaste ${ok} de 5 a la primera${ok >= 4 ? ' · 🎁 regalo + 3 fichas' : ''}.</p><p class="muted">Cada respuesta correcta a la primera da 1 ficha. Hablale otra vez para otro desafío.</p>`));
        if (ok === 5) p.onEvent('v9', 'perfecto');
      } else profe(m);
    }, () => { if (first) { first = false; L.wrong++; } });
  }
  function ensureRobot() {
    if (!meta.rules?.learn || !auth()) return;
    for (const m of g.mobs.list.values()) if (m.type === 'robot') return;
    const o = meta.spawn || meta.origin; if (!o) return;
    const r = g.mobs.add('robot', o.x + 2, o.y + 0.5, o.z + 2); r.keep = true; r.home = r.pos.clone();
  }

  // ---------- cofres con acertijo ----------
  function openPuzzle(t) {
    const k = k3(t.x, t.y, t.z);
    const c = sim.container(t.x, t.y, t.z, true); if (!c) return;
    c.puzzle = c.puzzle || { owner: p.name, solved: [] };
    const P = c.puzzle;
    const save = () => { if (auth()) sim.touch(k); else ctx.net.sendContainer(k, c); };
    const open = () => { ctx.closeInventory(); ctx.openInventory(null, { key: k, c, title: '🔓 Cofre con acertijo' }); };
    if (P.owner === p.name && p.keys.ShiftLeft) {
      ctx.openPanel('Cofre con acertijo (editar)', (list) => {
        list.insertAdjacentHTML('beforeend', `<p class="muted" style="font-size:15px">Escribí tu propia pregunta (o dejala vacía para que el cofre invente una cuenta). Metele premios adentro: el que responde bien lo abre.</p>
          <label>Pregunta</label><input class="q" maxlength="120" value="${esc(P.q || '')}"><label>Respuesta correcta (si hay varias, separalas con /)</label><input class="a" maxlength="60" value="${esc((P.a || []).join(' / '))}">
          <div class="row2"><button class="sv primary">Guardar</button><button class="op">Abrir el cofre</button></div>`);
        list.querySelectorAll('input').forEach((el) => el.addEventListener('keydown', (e) => e.stopPropagation()));
        list.querySelector('.sv').onclick = () => { P.q = list.querySelector('.q').value.trim() || null; P.a = list.querySelector('.a').value.split('/').map((s) => s.trim()).filter(Boolean); if (!P.a.length) { P.q = null; P.a = null; } P.solved = []; save(); flash('📚 Acertijo guardado'); ctx.closeInventory(); };
        list.querySelector('.op').onclick = open;
      });
      return;
    }
    if (P.solved.includes(p.name) || p.creative) return open();
    const Q = P.q && P.a?.length ? { q: esc(P.q), a: P.a } : makeQuestion(L.level);
    askPanel('Cofre con acertijo', P.owner === p.name ? '🔒 Para abrirlo hay que responder. (Shift + clic derecho para poner tu propia pregunta)' : '🔒 Para abrirlo hay que responder:', Q, () => { P.solved.push(p.name); if (P.solved.length > 30) P.solved.shift(); save(); p.onEvent('v9', 'acertijo'); open(); });
  }

  // ---------- construcción guiada ----------
  let B = null; // { key, x, y, z, layer, ghosts }
  const ghostGroup = new THREE.Group(); scene.add(ghostGroup);
  const colorCache = new Map();
  function colorOf(id) {
    if (colorCache.has(id)) return colorCache.get(id);
    let col = new THREE.Color(0x88aaff);
    try {
      const cv = ui.icon(id), c2 = cv.getContext('2d'), d = c2.getImageData(0, 0, cv.width, cv.height).data;
      let r = 0, gg = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
      if (n) col = new THREE.Color(r / n / 255, gg / n / 255, b / n / 255);
    } catch { /* color por defecto */ }
    colorCache.set(id, col); return col;
  }
  const isDoor = (id) => !!BLOCKS[id]?.door;
  function cellsOf(layerIdx) {
    const D = BUILDS[B.key], rows = D.layers[layerIdx], [ox, oz] = D.offset?.[layerIdx] || [0, 0], out = [];
    rows.forEach((row, z) => [...row].forEach((ch, x) => { if (ch !== '.') out.push({ x: B.x + x + ox, y: B.y + layerIdx, z: B.z + z + oz, id: D.legend[ch] }); }));
    return out;
  }
  function done(c) { const b = w.getBlock(c.x, c.y, c.z); return b === c.id || (isDoor(c.id) && isDoor(b)) || (c.id === 47 && (b === 47 || b === 17)); }
  function drawGhosts() {
    for (const m of [...ghostGroup.children]) { ghostGroup.remove(m); m.geometry.dispose(); m.material.dispose(); }
    if (!B) return;
    const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    for (const c of cellsOf(B.layer)) {
      if (done(c)) continue;
      const m = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: colorOf(c.id), transparent: true, opacity: 0.38, depthWrite: false }));
      m.position.set(c.x + 0.5, c.y + 0.5, c.z + 0.5); ghostGroup.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
      e.position.copy(m.position); ghostGroup.add(e);
    }
    geo.dispose();
  }
  function need() {
    const tot = {};
    for (const c of cellsOf(B.layer)) if (!done(c)) tot[c.id] = (tot[c.id] || 0) + 1;
    return tot;
  }
  function openBuilder() {
    ctx.openPanel('🏗 Construcción guiada', (list) => {
      if (B) {
        list.insertAdjacentHTML('beforeend', `<p>Estás construyendo: <b>${BUILDS[B.key].name}</b> · capa ${B.layer + 1} de ${BUILDS[B.key].layers.length}.</p>`);
        const b = document.createElement('button'); b.textContent = 'Dejar esta construcción'; b.onclick = () => { B = null; meta.guided = null; drawGhosts(); ctx.closeInventory(); }; list.appendChild(b);
        return;
      }
      list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Elegí qué construir: aparece una silueta transparente delante tuyo, capa por capa. Poné los bloques donde marca la silueta; cuando completás una capa, aparece la siguiente.</p>');
      for (const [key, D] of Object.entries(BUILDS)) {
        const tot = {}; for (const rows of D.layers) for (const row of rows) for (const ch of row) if (ch !== '.') tot[D.legend[ch]] = (tot[D.legend[ch]] || 0) + 1;
        const row = document.createElement('div'); row.className = 'trade';
        row.innerHTML = `<div class="tgive" style="flex:1"><b>${D.name}</b> · ${D.layers.length} capas<br><small>${Object.entries(tot).map(([id, n]) => `${n} ${esc(itemName(+id))}`).join(' · ')}</small></div>`;
        const b = document.createElement('button'); b.textContent = 'Construir';
        b.onclick = () => {
          const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
          const x = Math.round(p.pos.x + fx * 4 - 2), z = Math.round(p.pos.z + fz * 4 - 2);
          let y = g.mobs.surfaceY(x + 1, z + 1) ?? Math.floor(p.pos.y); y += 1;
          B = { key, x, y, z, layer: 0 }; meta.guided = B; drawGhosts(); ctx.closeInventory();
          flash(`🏗 ${D.name}: poné los bloques donde está la silueta`);
        };
        row.appendChild(b); list.appendChild(row);
      }
    });
  }
  let bAcc = 0, lastNeed = '';
  function builderTick(dt) {
    if (!B) { hud.hidden = true; return; }
    bAcc += dt; if (bAcc < 0.4) return; bAcc = 0;
    const n = need(), left = Object.values(n).reduce((a, b) => a + b, 0);
    const key = JSON.stringify(n);
    if (key !== lastNeed) { lastNeed = key; drawGhosts(); }
    const D = BUILDS[B.key];
    if (!left) {
      particles.burst(B.x + 2, B.y + B.layer, B.z + 2, [255, 230, 120], 18, 1);
      if (B.layer + 1 >= D.layers.length) { flash(`🎉 ¡Terminaste ${D.name}!`); sfx.achievement?.(); p.give(353, 5); p.onEvent('v9', 'constructor'); B = null; meta.guided = null; drawGhosts(); hud.hidden = true; return; }
      B.layer++; flash(`✔ Capa ${B.layer} lista. Ahora la capa ${B.layer + 1}`); sfx.ding?.(); lastNeed = ''; return;
    }
    hud.innerHTML = `🏗 ${D.name} · capa ${B.layer + 1}/${D.layers.length} · faltan: ${Object.entries(n).map(([id, k]) => `${k} ${esc(itemName(+id))}${!p.creative && inv.count(+id) < k ? ' <span style="color:#ff8a7a">(te faltan)</span>' : ''}`).join(' · ')}`;
    hud.hidden = false;
  }
  const hud = document.createElement('div'); hud.hidden = true;
  hud.style.cssText = 'position:absolute;left:12px;bottom:120px;max-width:min(420px,60vw);background:rgba(20,18,15,.72);border-left:3px solid #9cff7a;padding:4px 10px;font-size:16px;color:#e8ffe0;pointer-events:none';
  document.querySelector('#hud').appendChild(hud);
  if (meta.guided && BUILDS[meta.guided.key]) { B = meta.guided; drawGhosts(); }

  // ---------- botones y eventos ----------
  const btns = document.querySelector('#socialBtns');
  const bb = document.createElement('button'); bb.textContent = '🏗 Construcción guiada';
  bb.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause?.(false); openBuilder(); };
  btns?.appendChild(bb);
  api.onUseBlock = (t) => { if (t.id === 253) { openPuzzle(t); return true; } return false; };
  api.onInteractMob = (m) => { if (m.type !== 'robot') return false; profe(m); return true; };
  let robAcc = 5;
  api.update = (dt) => {
    builderTick(dt);
    robAcc += dt; if (robAcc > 6) { robAcc = 0; ensureRobot(); }
  };
  api.dispose = () => { bb.remove(); hud.remove(); for (const m of [...ghostGroup.children]) { m.geometry.dispose(); m.material.dispose(); } scene.remove(ghostGroup); };
  return api;
}
