// Control por voz v10.3: «adelante», «corré», «pará», «golpeá», «dejá de golpear», «mirá a la derecha»,
// «saltá», «abrí la mochila», «elegí el tres»… Usa el reconocimiento de voz del navegador (Chrome/Edge/Android).

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:"]/g, ' ').replace(/\s+/g, ' ').trim();
const NUM = { uno: 1, una: 1, primero: 1, primera: 1, dos: 2, segundo: 2, tres: 3, tercero: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9 };
const has = (t, ...w) => w.some((x) => new RegExp(`(^| )${x}( |$)`).test(t));

// convierte una frase en una lista de acciones (se exporta para poder probarla sin micrófono)
export function parseCommand(raw) {
  const out = [];
  for (const part of norm(raw).split(/ y | despues | luego | entonces /)) {
    const t = part.trim(); if (!t) continue;
    const little = has(t, 'poco', 'paso', 'pasito', 'un toque');
    const much = has(t, 'mucho', 'bastante', 'todo');
    // parar
    if (has(t, 'deja de golpear', 'deja de pegar', 'deja de romper', 'no golpees', 'basta de golpear') || /deja de (golpear|pegar|romper|picar|atacar)/.test(t)) { out.push(['attack', false]); continue; }
    // «pará» sólo como orden (no «mirá para la derecha»)
    if (/^(para|frena|frena ahi|stop|quieto|quedate quieto|basta|alto|detente|detenete|pare|freno)( |$)/.test(t)) { out.push(['stop']); continue; }
    // mirar / girar
    if (/(mira|gira|dobla|voltea|gira la camara)/.test(t) || has(t, 'date vuelta', 'media vuelta')) {
      if (has(t, 'vuelta', 'atras', 'detras')) out.push(['turn', 180, 0]);
      else if (has(t, 'derecha')) out.push(['turn', much ? 90 : little ? 20 : 45, 0]);
      else if (has(t, 'izquierda')) out.push(['turn', -(much ? 90 : little ? 20 : 45), 0]);
      else if (has(t, 'arriba', 'cielo')) out.push(['turn', 0, much ? 60 : 30]);
      else if (has(t, 'abajo', 'piso', 'suelo')) out.push(['turn', 0, -(much ? 60 : 30)]);
      else if (has(t, 'adelante', 'frente', 'derecho', 'horizonte')) out.push(['level']);
      continue;
    }
    // elegir casilla
    const nm = t.match(/(elegi|agarra|casilla|ranura|numero|toma el|toma la|saca el|saca la|usa el|usa la)\s+(?:el |la )?(\w+)/);
    if (nm && (NUM[nm[2]] || /^[1-9]$/.test(nm[2]))) { out.push(['slot', NUM[nm[2]] || +nm[2]]); continue; }
    if (has(t, 'siguiente', 'otra herramienta', 'proxima')) { out.push(['slotStep', 1]); continue; }
    if (has(t, 'anterior')) { out.push(['slotStep', -1]); continue; }
    // pantallas
    if (has(t, 'mochila', 'inventario')) { out.push(['press', 'inventory']); continue; }
    if (has(t, 'mapa')) { out.push(['press', 'map']); continue; }
    if (has(t, 'pausa', 'menu')) { out.push(['press', 'pause']); continue; }
    if (has(t, 'cerra', 'cerrar', 'salir', 'volve')) { out.push(['close']); continue; }
    if (has(t, 'foto', 'captura')) { out.push(['press', 'photo']); continue; }
    if (has(t, 'marcador', 'marca aca', 'marca este lugar')) { out.push(['press', 'waypoint']); continue; }
    if (has(t, 'camara')) { out.push(['press', 'camera']); continue; }
    if (has(t, 'ayuda', 'comandos', 'que puedo decir')) { out.push(['help']); continue; }
    // vehículos
    if (has(t, 'monta', 'montate', 'subi', 'subite', 'bajate', 'baja del', 'baja de la')) { out.push(['press', 'mount']); continue; }
    // acciones
    if (/(^| )(golpea|pega|rompe|pica|ataca|mina|cava|tala|corta)/.test(t)) { out.push(['attack', true]); continue; }
    if (/(^| )(usa|abri|abre|pone|coloca|construi|come|toma|bebe|habla|acciona|apreta|duerm)/.test(t)) { out.push(['use']); continue; }
    if (/(^| )(tira|solta|larga)/.test(t)) { out.push(['press', 'drop']); continue; }
    if (/(^| )(salta|brinca)/.test(t)) { out.push(['jump', much ? 3 : 1]); continue; }
    if (/(^| )(agachate|agacha|baja|bajar|descend|sumergi)/.test(t)) { out.push(['hold', 'KeyC', little ? 0.5 : 1.5]); continue; }
    if (/(^| )(sube|subir|nada|nadar|vola hacia arriba)/.test(t)) { out.push(['hold', 'Space', little ? 0.5 : 1.5]); continue; }
    // moverse
    const run = /(^| )(corre|correr|rapido|corriendo)/.test(t);
    const slow = has(t, 'despacio', 'camina', 'caminando');
    if (has(t, 'atras', 'retrocede', 'retroceder')) { out.push(['move', 'KeyS', little ? 0.6 : null]); continue; }
    if (has(t, 'izquierda')) { out.push(['move', 'KeyA', little ? 0.5 : 1.2]); continue; }
    if (has(t, 'derecha')) { out.push(['move', 'KeyD', little ? 0.5 : 1.2]); continue; }
    if (run || slow || /(adelante|avanza|avanzar|segui|anda|camina|camina|vamos|dale)/.test(t)) {
      if (run) out.push(['run', true]); else if (slow) out.push(['run', false]);
      out.push(['move', 'KeyW', little ? 0.6 : null]);
      continue;
    }
  }
  return out;
}

export function createVoiceCmd(ctx) {
  const { game: g, flash, settings } = ctx;
  const p = g.player;
  const api = { on: false, supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition) };
  const $ = (s) => document.querySelector(s);
  let rec = null, wantOn = false, turning = null;
  const timers = new Set();
  const later = (s, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, s * 1000); timers.add(id); };

  // indicador: qué escuchó y qué hizo
  const pill = document.createElement('div'); pill.id = 'voicePill'; pill.hidden = true;
  pill.style.cssText = 'position:absolute;left:50%;bottom:150px;transform:translateX(-50%);background:rgba(10,8,6,0.75);border:2px solid #ff5a8a;border-radius:16px;padding:3px 14px;font-size:18px;color:#ffe;pointer-events:none;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;z-index:4';
  $('#hud').appendChild(pill);
  let pillT = null;
  const show = (txt, keep) => { pill.textContent = txt; pill.hidden = false; clearTimeout(pillT); if (!keep) pillT = setTimeout(() => { pill.textContent = '🎙 escuchando…'; }, 2500); };

  const key = (code, on) => { if (on) p.keyDown(code); else p.keyUp(code); };
  function stopMove() { for (const c of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'KeyC']) key(c, false); }
  function run(acts) {
    const done = [];
    for (const a of acts) {
      switch (a[0]) {
        case 'stop': stopMove(); key('ShiftLeft', false); p.mouse.left = false; done.push('⏹ paro'); break;
        case 'attack': p.mouse.left = a[1]; done.push(a[1] ? '⛏ golpeo' : '✋ dejo de golpear'); break;
        case 'use': p.mouse.right = true; p.placeCooldown = 0; later(0.15, () => { p.mouse.right = false; }); done.push('✋ uso'); break;
        case 'jump': for (let i = 0; i < a[1]; i++) { later(i * 0.55, () => key('Space', true)); later(i * 0.55 + 0.25, () => key('Space', false)); } done.push('⤒ salto'); break;
        case 'hold': key(a[1], true); later(a[2], () => key(a[1], false)); done.push(a[1] === 'KeyC' ? '⤓ bajo' : '⤒ subo'); break;
        case 'run': key('ShiftLeft', a[1]); done.push(a[1] ? '🏃 corro' : '🚶 camino'); break;
        case 'move': {
          for (const c of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) if (c !== a[1]) key(c, false);
          key(a[1], true);
          if (a[2]) later(a[2], () => key(a[1], false));
          done.push({ KeyW: '⬆ adelante', KeyS: '⬇ atrás', KeyA: '⬅ izquierda', KeyD: '➡ derecha' }[a[1]]);
          break;
        }
        case 'turn': turning = { yaw: -a[1] * Math.PI / 180, pitch: a[2] * Math.PI / 180, t: 0.35, left: 0.35 }; done.push(a[1] ? (a[1] > 0 ? '↻ miro a la derecha' : '↺ miro a la izquierda') : a[2] > 0 ? '⤴ miro arriba' : '⤵ miro abajo'); break;
        case 'level': turning = { yaw: 0, pitch: -p.pitch, t: 0.3, left: 0.3 }; done.push('◎ miro al frente'); break;
        case 'slot': ctx.ui.select(a[1] - 1); done.push(`🎒 casilla ${a[1]}`); break;
        case 'slotStep': ctx.ui.select((g.inv.selected + a[1] + 9) % 9); done.push('🎒 cambio'); break;
        case 'press': ctx.input?.a?.press(a[1]); done.push(a[1]); break;
        case 'close': if (ctx.ui.open) ctx.closeInventory(); else if (!$('#bigmapWrap').hidden) ctx.toggleBigMap(); else if (!$('#pause').hidden) ctx.setPause(false); done.push('✕ cierro'); break;
        case 'help': flash('🎙 Probá: «adelante», «corré», «pará», «golpeá», «dejá de golpear», «saltá», «mirá a la derecha», «date vuelta», «usá», «abrí la mochila», «elegí el tres», «subite», «mapa», «foto»'); done.push('ayuda'); break;
      }
    }
    return done;
  }
  api.run = run;

  function start() {
    if (!api.supported) { flash('🎙 Este navegador no tiene reconocimiento de voz. Probá con Chrome (en la compu o el celu).'); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    rec = new SR();
    rec.lang = 'es-AR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    let lastInterim = '';
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i], txt = r[0].transcript;
        if (!r.isFinal) {
          // las órdenes cortas de frenar se cumplen apenas se escuchan
          const n = norm(txt);
          if (n !== lastInterim && /^(para|frena|stop|quieto|basta)$/.test(n)) { lastInterim = n; run([['stop']]); show(`🎙 «${txt.trim()}» → ⏹ paro`); }
          else show(`🎙 ${txt.trim()}…`, true);
          continue;
        }
        lastInterim = '';
        const acts = parseCommand(txt);
        if (!acts.length) { show(`🎙 «${txt.trim()}» → no entendí (decí «ayuda»)`); continue; }
        const done = run(acts);
        show(`🎙 «${txt.trim()}» → ${done.join(' · ')}`);
        p.onEvent('v10', 'voz');
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { wantOn = false; setOn(false); flash('🎙 No hay permiso para usar el micrófono'); }
      else if (e.error === 'network') flash('🎙 El reconocimiento de voz necesita internet');
    };
    rec.onend = () => { if (wantOn) { try { rec.start(); } catch { /* ya arrancó */ } } };
    try { rec.start(); } catch { /* ya arrancó */ }
  }
  function setOn(on) {
    api.on = on; wantOn = on;
    document.querySelector('#touch .b-voice')?.classList.toggle('on', on);
    if (on) { start(); show('🎙 escuchando… (decí «ayuda» para ver qué entiendo)', true); flash('🎙 Control por voz activado'); }
    else { try { rec?.stop(); } catch { /* nada */ } rec = null; pill.hidden = true; stopMove(); p.mouse.left = false; }
  }
  api.toggle = () => setOn(!api.on);
  api.key = (e) => { if (e.code === 'KeyK') { api.toggle(); return true; } return false; };
  api.update = (dt) => {
    if (!turning) return;
    const f = Math.min(1, dt / turning.t), k = Math.min(turning.left, dt) / turning.t;
    p.yaw += turning.yaw * k; p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch + turning.pitch * k));
    turning.left -= dt; if (turning.left <= 0 || f >= 1 && turning.left <= 0) turning = null;
  };
  api.dispose = () => { setOn(false); for (const id of timers) clearTimeout(id); pill.remove(); };
  if (settings.voiceCtl && api.supported) setTimeout(() => setOn(true), 1500);
  return api;
}
