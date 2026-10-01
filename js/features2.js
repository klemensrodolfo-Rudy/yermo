// v6: campaña, facciones, diario, eventos, desafíos diarios, fichas y banco, concurso cervecero, recetas con
// nombre, empleados, rutas comerciales, ciudad subterránea, clima extremo (rayos y tornados), fuego,
// estaciones, piratas y soldados, taller de autos, pistas propias, helicóptero y trenes, asaltos de bandidos,
// arco, granadas, lanzallamas y minas, monturas, el Abismo, planos de obra, ascensores, gestos, carteles
// y música dinámica.
import * as THREE from 'three';
import { BLOCKS, ITEMS, itemName, SOLID, LIQ, FLAMMABLE, PLACEABLE, CROPS, maxStack } from './blocks.js';
import { BIOME, BIOME_NAMES, ABYSS_X, ABYSS_W, abyssLevel, abyssStart } from './worldgen.js';
import { VEHICLE_TYPES, MOB_TYPES } from './entities.js';

// animales que se domestican con comida y después se montan con una Montura
export const TAME = {
  boar: { food: [285], veh: 'mboar', name: 'jabalí', hint: 'dale papas' },
  wolf: { food: [271, 272], veh: 'mwolf', name: 'lobo', pet: true, hint: 'dale carne' },
  zebra: { food: [282, 285], veh: 'mzebra', name: 'cebra', hint: 'dale cebada o papas' },
  ostrich: { food: [281, 282], veh: 'mostrich', name: 'avestruz', hint: 'dale semillas o cebada' },
  elephant: { food: [282, 285], veh: 'melephant', name: 'elefante', hint: 'dale cebada o papas', hard: true },
  horse: { food: [385, 282], veh: 'mhorse', name: 'caballo', hint: 'dale manzanas o cebada' },
};
import { EMOTES } from './net.js';
import { realSeason } from './extras.js';
import { BEERS } from './npc.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const k3 = (x, y, z) => x + ',' + y + ',' + z;
const p3 = (k) => k.split(',').map(Number);

export const SEASONS = [
  { name: 'Primavera', icon: '🌱', temp: 0, grow: 1.5 },
  { name: 'Verano', icon: '☀', temp: 7, grow: 1.2 },
  { name: 'Otoño', icon: '🍂', temp: -2, grow: 0.8 },
  { name: 'Invierno', icon: '❄', temp: -9, grow: 0.35 },
];
export const SEASON_DAYS = 3;

export const FACTIONS = {
  cerv: { name: 'Cerveceros del Valle', color: '#e0c23a', desc: 'Guardianes de la cebada y el lúpulo. Aman la buena cerveza.' },
  chat: { name: 'Chatarreros', color: '#ff8a4a', desc: 'Comerciantes y asentamientos. La chatarra es su moneda.' },
  acero: { name: 'Hermandad del Acero', color: '#8ab0d8', desc: 'Ex militares que limpian el yermo: les gusta que derrotes jefes, resistas hordas y (si están activados) frenes a los bandidos.' },
};
const FSHOP = {
  cerv: [{ need: 10, cost: 4, get: [291, 4] }, { need: 10, cost: 6, get: [283, 6] }, { need: 25, cost: 10, get: [86, 2] }, { need: 40, cost: 18, get: [318, 3, 5] }, { need: 60, cost: 25, get: [363, 1] }],
  chat: [{ need: 10, cost: 5, get: [260, 3] }, { need: 20, cost: 8, get: [339, 2] }, { need: 35, cost: 20, get: [346, 1] }, { need: 50, cost: 30, get: [366, 1] }, { need: 70, cost: 40, get: [364, 1] }],
  acero: [{ need: 10, cost: 5, get: [332, 16] }, { need: 20, cost: 8, get: [358, 3] }, { need: 35, cost: 20, get: [367, 1] }, { need: 50, cost: 25, get: [333, 1] }, { need: 70, cost: 35, get: [302, 1] }],
};
const TIER = (r) => (r >= 60 ? 'Venerado' : r >= 30 ? 'Aliado' : r >= 10 ? 'Amistoso' : r > -10 ? 'Neutral' : r > -40 ? 'Desconfiado' : 'Hostil');

// campaña principal
const CAMPAIGN = [
  { t: 'Despertar en el yermo', d: 'Una radio rota repite una señal entrecortada: «…refugio… el portal… la fuente…». Antes de buscarla, sobreviví.', goal: 'Fabricá una mesa de trabajo', ev: (n, id) => n === 'craft' && id === 24, rew: [[256, 8], [271, 3]] },
  { t: 'Un techo', d: 'Las noches traen necrófagos. Necesitás un lugar donde volver.', goal: 'Fabricá un catre y dormí o guardá tu reaparición', ev: (n) => n === 'bed', rew: [[26, 8], [274, 2]] },
  { t: 'Voces humanas', d: 'La señal viene de lejos, pero alguien tiene que saber algo. Hay asentamientos de sobrevivientes (◆ naranja en el mapa, tecla M).', goal: 'Hablá con el líder de un asentamiento', ev: (n, id) => n === 'talk' && id === 'leader', rew: [[353, 5]] },
  { t: 'La moneda del yermo', d: 'El líder te cuenta que la gente comercia con fichas prensadas de metal. Con fichas se paga todo: empleados, carreras, el banco.', goal: 'Juntá 10 fichas (Prensa de fichas: 6 acero + 4 roca en la mesa)', check: (f) => f.inv.count(353) >= 10 || f.P.bank >= 10, rew: [[260, 2]] },
  { t: 'Aliados', d: 'Tres facciones se disputan el yermo. Ninguna te va a ayudar gratis.', goal: 'Llegá a reputación 20 con alguna facción (diario → Facciones)', check: (f) => Math.max(...Object.values(f.P.rep)) >= 20, rew: [[353, 10]] },
  { t: 'El laboratorio', d: 'Los papeles del asentamiento hablan de laboratorios subterráneos (◆ verde) donde se abrió «un portal». Algo lo custodia.', goal: 'Derrotá al Mutante alfa de un laboratorio', ev: (n, id) => n === 'kill' && id === 'alpha', rew: [[306, 2], [358, 3]] },
  { t: 'El Abismo', d: 'Detrás del núcleo del laboratorio hay un portal violeta. La señal viene de abajo, muy abajo.', goal: 'Cruzá el portal y llegá al nivel 3 del Abismo', check: (f) => (f.P.abyssMax || 0) >= 3, rew: [[353, 15], [313, 1]] },
  { t: 'La fuente', d: 'En el nivel 5 del Abismo late la fuente de la señal. Y su guardián.', goal: 'Derrotá al Guardián del abismo (nivel 5)', ev: (n, id) => n === 'kill' && id === 'guardian', rew: [[352, 1], [353, 50]] },
];
const ENDING = 'La señal se apaga. Donde estaba el Guardián queda una vieja radio militar: repetía un mensaje de hace 40 años, «si alguien escucha esto, el yermo todavía se puede salvar». Quizás sí. El yermo es tuyo: seguí construyendo, bajando al Abismo (no tiene fondo) y haciendo la mejor cerveza del fin del mundo.';

// desafíos diarios: evento, qué cuenta, cuántos, fichas
const DAILY = [
  { txt: 'Eliminá 5 necrófagos', ev: 'kill', m: 'ghoul', n: 5, r: 4 },
  { txt: 'Cazá 3 jabalíes', ev: 'kill', m: 'boar', n: 3, r: 3 },
  { txt: 'Eliminá 2 bandidos o piratas', ev: 'kill', m: ['bandit', 'pirate', 'soldier'], n: 2, r: 6 },
  { txt: 'Fabricá 10 cosas', ev: 'craft', n: 10, r: 3 },
  { txt: 'Cosechá 6 cultivos', ev: 'harvest', n: 6, r: 4 },
  { txt: 'Tomá 2 cervezas', ev: 'drink', n: 2, r: 2 },
  { txt: 'Rompé 80 bloques', ev: 'break', n: 80, r: 3 },
  { txt: 'Colocá 50 bloques', ev: 'place', n: 50, r: 3 },
  { txt: 'Comerciá 3 veces', ev: 'trade', n: 3, r: 4 },
  { txt: 'Terminá una carrera', ev: 'raceDone', n: 1, r: 5 },
  { txt: 'Abrí 3 cajas de botín', ev: 'loot', n: 3, r: 4 },
  { txt: 'Comé 4 veces', ev: 'eat', n: 4, r: 2 },
  { txt: 'Sembrá 8 semillas', ev: 'plant', n: 8, r: 3 },
];

const WORKER_ROLES = {
  granjero: { name: 'Granjero', desc: 'Cosecha y vuelve a sembrar los cultivos maduros cerca de tu base; guarda la cosecha en el cofre más cercano.' },
  guardia: { name: 'Guardia', desc: 'Dispara a las criaturas hostiles y bandidos que se acerquen a tu base.' },
  cervecero: { name: 'Cervecero', desc: 'Atiende tus choperas: cada mañana vende la cerveza y deposita las fichas en tu banco.' },
};
const WORKER_PRICE = 15, WORKER_WAGE = 2;

export function createFeatures2(ctx) {
  const { game: g, ui, net, sfx, flash, scene, camera, uniforms, particles } = ctx;
  const p = g.player, inv = g.inv, w = g.world, meta = g.meta, sim = g.sim;
  const P = (meta.p6 = meta.p6 || {});
  P.camp = P.camp ?? 0; P.rep = Object.assign({ cerv: 0, chat: 0, acero: 0 }, P.rep); P.bank = P.bank ?? 0;
  P.stats = P.stats || {}; P.routes = P.routes || []; P.recipes = P.recipes || []; P.guardians = P.guardians || {};
  meta.flags = meta.flags || []; meta.events = meta.events || [];
  const api = { P };
  const auth = () => ctx.isAuthority();
  const story = meta.worldType !== 'magic'; // Reinos de Eldra: sin historia principal
  const day = () => meta.nights || 0;
  const season = () => SEASONS[meta.rules?.realTime ? realSeason() : Math.floor(day() / SEASON_DAYS) % 4];
  g.season = season;
  const inAbyss = () => p.pos.x >= ABYSS_X - 64;
  const give = (id, n, extra) => p.give(id, n, extra);
  const addStat = (k, n = 1) => { P.stats[k] = (P.stats[k] || 0) + n; };
  const openPanel = (title, render) => ctx.openPanel(title, render);
  const surfaceTop = (x, z) => { for (let y = 120; y > 1; y--) { const b = w.getBlock(x, y, z); if (b === -1) return null; if (SOLID[b] || LIQ[b]) return y; } return null; };

  // ---------- utilidades de UI ----------
  function askText(title, initial, cb, max = 40) {
    document.exitPointerLock();
    const o = document.createElement('div');
    o.className = 'overlay v6modal';
    o.innerHTML = `<div class="card" style="width:min(420px,100%)"><h2>${esc(title)}</h2><input maxlength="${max}" style="width:100%;font-size:20px"><div class="row2" style="margin-top:10px"><button class="primary">Aceptar</button><button>Cancelar</button></div></div>`;
    document.body.appendChild(o);
    const inp = o.querySelector('input'); inp.value = initial || '';
    setTimeout(() => inp.focus(), 30);
    const close = (ok) => { o.remove(); if (ok) cb(inp.value.trim()); ctx.lockPointer(); };
    const [bOk, bNo] = o.querySelectorAll('button');
    bOk.onclick = () => close(true); bNo.onclick = () => close(false);
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') close(true); if (e.key === 'Escape') close(false); };
  }
  const btn = (txt, fn, cls = '') => { const b = document.createElement('button'); b.textContent = txt; if (cls) b.className = cls; b.onclick = fn; return b; };
  const iconImg = (id) => `<img class="gi" src="${ui.icon(id).toDataURL()}">`;
  const payList = (list) => { if (p.creative) return true; for (const [id, n] of list) if (inv.count(id) < n) return false; for (const [id, n] of list) inv.remove(id, n); return true; };
  const listTxt = (list) => list.map(([id, n]) => `${n} ${itemName(id)}`).join(' + ');

  // ---------- reputación ----------
  function rep(f, n, why) {
    const old = P.rep[f];
    P.rep[f] = Math.max(-100, Math.min(100, old + n));
    if (TIER(old) !== TIER(P.rep[f])) flash(`${FACTIONS[f].name}: ahora sos ${TIER(P.rep[f])}${why ? ' (' + why + ')' : ''}`);
  }

  // ---------- eventos del juego ----------
  api.event = (n, id) => {
    // campaña
    const st = (story ? CAMPAIGN[P.camp] : null);
    if (st?.ev && st.ev(n, id)) advanceCampaign();
    // desafíos diarios
    ensureDaily();
    for (const c of P.daily.list) {
      if (c.done) continue;
      const d = DAILY[c.i];
      if (d.ev !== n) continue;
      if (d.m && !(Array.isArray(d.m) ? d.m.includes(id) : d.m === id)) continue;
      c.prog++;
      if (c.prog >= d.n) { c.done = true; give(353, d.r); sfx.coin(); flash(`✔ Desafío del día: ${d.txt} (+${d.r} fichas)`); addStat('daily'); if (P.daily.list.every((x) => x.done)) { give(353, 5); flash('¡Completaste los 3 desafíos del día! +5 fichas extra'); p.onEvent('v6', 'diario'); } }
    }
    // reputación
    if (n === 'quest') rep('chat', 8, 'misión');
    if (n === 'sellBeer') rep('cerv', 2);
    if (n === 'trade') rep('chat', 1);
    if (n === 'kill') {
      addStat('kills');
      if (id === 'bandit' || id === 'soldier') rep('acero', 3, 'bandidos');
      if (id === 'pirate') rep('chat', 3, 'piratas');
      if (['trader', 'settler', 'leader', 'worker'].includes(id)) { rep('chat', -20, 'mataste a un inocente'); rep('cerv', -10); }
      if (MOB_TYPES[id]?.boss) rep('acero', 8, 'derrotaste a un jefe');
      if (id === 'guardian') { p.onEvent('v6', 'guardian'); if (inAbyss()) P.guardians[abyssLevel(p.pos.x)] = true; }
    }
    if (n === 'raceWin') addStat('raceWins');
    if (n === 'hordeSurvived') rep('acero', 5, 'resististe la horda');
  };
  function advanceCampaign() {
    const st = (story ? CAMPAIGN[P.camp] : null);
    if (!st) return;
    for (const [id, n] of st.rew) give(id, n);
    P.camp++;
    sfx.achievement();
    const nx = CAMPAIGN[P.camp];
    flash(nx ? `📜 Misión cumplida: ${st.t}. Nueva misión: ${nx.t} (diario: J)` : '📜 ¡Terminaste la historia principal!');
    if (!nx) { p.onEvent('v6', 'campana'); setTimeout(() => openJournal('historia'), 800); }
  }

  function ensureDaily() {
    if (P.daily?.day === day()) return;
    const seed = (meta.seed ^ (day() * 2654435761)) >>> 0;
    const idx = [];
    let s = seed;
    while (idx.length < 3) { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 3266489909) >>> 0; const i = s % DAILY.length; if (!idx.includes(i) && (meta.rules?.armed || !Array.isArray(DAILY[i].m))) idx.push(i); }
    P.daily = { day: day(), list: idx.map((i) => ({ i, prog: 0, done: false })) };
  }

  // ---------- diario (tecla J) ----------
  let jTab = 'historia';
  function openJournal(tab) {
    if (tab) jTab = tab;
    ensureDaily();
    openPanel('📓 Diario', (list) => {
      const tabs = document.createElement('div'); tabs.className = 'jtabs';
      for (const [k, n] of [['historia', 'Historia'], ['diario', 'Desafíos'], ['facciones', 'Facciones'], ['cervezas', 'Cervezas'], ['mundo', 'Mundo'], ['stats', 'Datos']]) {
        const b = btn(n, () => { jTab = k; openJournal(); }); if (k === jTab) b.className = 'primary'; tabs.appendChild(b);
      }
      list.appendChild(tabs);
      const box = document.createElement('div'); list.appendChild(box);
      const H = (h) => box.insertAdjacentHTML('beforeend', h);
      if (jTab === 'historia') {
        CAMPAIGN.forEach((st, i) => {
          if (i > P.camp) return;
          H(`<div class="quest"><p><b>${i + 1}. ${st.t}</b> ${i < P.camp ? '✔' : ''}</p><p class="muted">${st.d}</p>${i === P.camp ? `<p><b>Objetivo:</b> ${st.goal}</p><p class="hint">Recompensa: ${listTxt(st.rew)}</p>` : ''}</div>`);
        });
        if (P.camp >= CAMPAIGN.length) H(`<div class="quest"><p><b>Epílogo</b></p><p>${ENDING}</p></div>`);
      } else if (jTab === 'diario') {
        H(`<p>Día ${day() + 1} · ${season().icon} ${season().name}. Los desafíos cambian cada amanecer.</p>`);
        for (const c of P.daily.list) { const d = DAILY[c.i]; H(`<div class="quest"><p>${c.done ? '✔' : '◻'} ${d.txt} <b>${Math.min(c.prog, d.n)}/${d.n}</b></p><p class="hint">Recompensa: ${d.r} fichas</p></div>`); }
        const cd = (7 - ((day() - 3) % 7 + 7) % 7) % 7;
        H(`<p class="muted">${cd === 0 ? '🍺 ¡Hoy es el concurso cervecero! Presentá tu mejor cerveza a un líder de asentamiento.' : `🍺 Próximo concurso cervecero en ${cd} día(s).`} · Horda cada 7 noches.</p>`);
      } else if (jTab === 'facciones') {
        const nearNpc = [...g.mobs.list.values()].some((m) => (m.type === 'trader' || m.type === 'leader') && m.pos.distanceTo(p.pos) < 8);
        for (const [k, f] of Object.entries(FACTIONS)) {
          const r = P.rep[k];
          H(`<div class="quest"><p><b style="color:${f.color}">${f.name}</b> · ${TIER(r)} (${r})</p><div class="repbar"><i style="width:${(r + 100) / 2}%;background:${f.color}"></i></div><p class="muted">${f.desc}</p></div>`);
          for (const o of FSHOP[k]) {
            const row = document.createElement('div'); row.className = 'trade';
            row.innerHTML = `<div class="tgive">${iconImg(353)} ${o.cost} fichas<br><small>Requiere ${o.need} de reputación</small></div><div class="tarrow">→</div><div class="tget">${iconImg(o.get[0])} ${o.get[1]} × ${itemName(o.get[0])}</div>`;
            const b = btn('Comprar', () => { if (!payList([[353, o.cost]])) return flash('No te alcanzan las fichas'); give(o.get[0], o.get[1], o.get[2] ? { q: o.get[2] } : undefined); sfx.coin(); openJournal(); });
            b.disabled = r < o.need || !nearNpc || (!p.creative && inv.count(353) < o.cost);
            row.appendChild(b); box.appendChild(row);
          }
        }
        if (!nearNpc) H('<p class="hint">Para comprar en las tiendas de las facciones acercate a un comerciante o a un líder.</p>');
        H('<p class="muted">Subí reputación: misiones y comercio (Chatarreros), vender cerveza y el concurso (Cerveceros), eliminar bandidos y soldados renegados (Hermandad).</p>');
      } else if (jTab === 'cervezas') {
        H('<p>Ponele nombre a tus cervezas: las etiquetadas suman puntos en el concurso y se venden mejor en tu taberna.</p>');
        inv.slots.forEach((s, i) => {
          if (!s || !BEERS.includes(s.id)) return;
          const row = document.createElement('div'); row.className = 'trade';
          row.innerHTML = `<div class="tget">${iconImg(s.id)} ${s.count} × ${s.label ? `«${esc(s.label)}» ` : ''}${itemName(s.id)} ${s.q ? '★'.repeat(s.q) : ''}</div>`;
          row.appendChild(btn('Etiquetar', () => askText('Nombre de tu cerveza', s.label || '', (name) => {
            if (!name) return;
            s.label = name; inv.onChange();
            if (!P.recipes.find((r) => r.name === name)) P.recipes.push({ name, id: s.id, q: s.q ?? 1, day: day() });
            p.onEvent('v6', 'etiqueta'); flash(`Nueva receta: «${name}»`);
          }, 28)));
          box.appendChild(row);
        });
        if (P.recipes.length) H('<h3>Tu recetario</h3>' + P.recipes.map((r) => `<div>«${esc(r.name)}» · ${itemName(r.id)} · mejor calidad ${'★'.repeat(r.q)} · día ${r.day + 1}</div>`).join(''));
        if (P.contestWins) H(`<p>🏆 Concursos ganados: ${P.contestWins}</p>`);
      } else if (jTab === 'mundo') {
        H(`<p>${season().icon} <b>${season().name}</b> (día ${day() % SEASON_DAYS + 1} de ${SEASON_DAYS}). ${season().name === 'Invierno' ? 'Hace frío y los cultivos casi no crecen: usá aspersores e invernaderos.' : season().name === 'Primavera' ? 'Los cultivos crecen rápido.' : season().name === 'Verano' ? 'Calor: tomá agua seguido.' : 'Se viene el frío.'}</p>`);
        H(`<p>Clima: ${g.weather.type === 'storm' ? '⚡ tormenta eléctrica: buscá techo, los rayos prenden fuego.' : g.weather.type === 'tornado' ? '🌪 ¡tornado! alejate del embudo.' : 'tranquilo por ahora.'}</p>`);
        if (P.delivery) H(`<div class="quest"><p><b>Reparto en curso</b>: llevá ${P.delivery.n} cajones de mercancía al líder del asentamiento en (${Math.round(P.delivery.to[0])}, ${Math.round(P.delivery.to[1])}) · ${Math.round(Math.hypot(P.delivery.to[0] - p.pos.x, P.delivery.to[1] - p.pos.z))} m</p></div>`);
        if (P.routes.length) H('<h3>Rutas comerciales</h3>' + P.routes.map((r) => `<div>🚚 ${Math.round(r.dist)} m · ${routePay(r)} fichas por día</div>`).join(''));
        const workers = [...g.mobs.list.values()].filter((m) => m.type === 'worker');
        if (workers.length) H('<h3>Empleados</h3>' + workers.map((m) => `<div>👷 ${WORKER_ROLES[m.role]?.name ?? 'Empleado'} · sueldo ${WORKER_WAGE} fichas por día</div>`).join(''));
        H(`<p>🏦 Banco: <b>${P.bank}</b> fichas (3% de interés por día)</p>`);
        if (P.abyssMax) H(`<p>🕳 Abismo: llegaste al nivel ${P.abyssMax}.</p>`);
        const evs = meta.events.filter((e) => e.until > g.meta.clock);
        if (evs.length) H('<h3>Eventos</h3>' + evs.map((e) => `<div>${e.label} · ${Math.round(Math.hypot(e.x - p.pos.x, e.z - p.pos.z))} m</div>`).join(''));
      } else {
        const S = P.stats;
        H(`<div class="quest"><p>Días sobrevividos: <b>${day()}</b></p><p>Criaturas eliminadas: <b>${S.kills || 0}</b></p><p>Desafíos cumplidos: <b>${S.daily || 0}</b></p><p>Carreras ganadas: <b>${S.raceWins || 0}</b></p><p>Asaltos rechazados: <b>${S.raids || 0}</b></p><p>Eventos vistos: <b>${S.events || 0}</b></p><p>Abismo máximo: <b>${P.abyssMax || 0}</b></p><p>Logros: <b>${g.ach.count()}</b></p></div>`);
      }
    });
  }
  api.openJournal = openJournal;

  // ---------- banco ----------
  function openBank() {
    openPanel('🏦 Banco del yermo', (list) => {
      list.insertAdjacentHTML('beforeend', `<p>Saldo: <b>${P.bank}</b> fichas · En la mochila: ${inv.count(353)}</p><p class="muted">Paga 3% de interés cada amanecer (hasta 30 por día). De acá salen los sueldos de tus empleados y entran las ganancias de tus rutas y de tu cervecero.</p>`);
      const row = document.createElement('div'); row.className = 'row2';
      row.appendChild(btn('Depositar todo', () => { const n = inv.count(353); if (!n) return; inv.remove(353, n); P.bank += n; sfx.coin(); p.onEvent('v6', 'banco'); openBank(); }, 'primary'));
      row.appendChild(btn('Retirar 10', () => { const n = Math.min(10, P.bank); if (!n) return; P.bank -= n; give(353, n); sfx.coin(); openBank(); }));
      list.appendChild(row);
      list.appendChild(btn('Retirar todo', () => { const n = P.bank; if (!n) return; P.bank = 0; give(353, n); sfx.coin(); openBank(); }));
    });
  }

  // ---------- extensión del panel del líder (concurso, empleados, repartos) ----------
  ctx.ext.leader = (list, m) => {
    p.onEvent('talk', 'leader');
    const H = (h) => list.insertAdjacentHTML('beforeend', h);
    // concurso cervecero
    const contestDay = ((day() - 3) % 7 + 7) % 7 === 0;
    H('<h3>🍺 Concurso cervecero</h3>');
    if (!contestDay) H(`<p class="muted">Se hace cada 7 días. Faltan ${(7 - ((day() - 3) % 7 + 7) % 7) % 7} día(s).</p>`);
    else if (P.contestDay === day()) H('<p class="muted">Ya presentaste tu cerveza hoy. ¡Volvé el próximo concurso!</p>');
    else {
      const beers = inv.slots.map((s, i) => ({ s, i })).filter(({ s }) => s && BEERS.includes(s.id));
      if (!beers.length) H('<p class="muted">Hoy es el concurso, pero no tenés cerveza.</p>');
      else {
        const best = beers.sort((a, b) => ((b.s.q ?? 1) + (b.s.label ? 0.5 : 0)) - ((a.s.q ?? 1) + (a.s.label ? 0.5 : 0)))[0];
        H(`<p>Tu mejor cerveza: ${iconImg(best.s.id)} ${best.s.label ? `«${esc(best.s.label)}» ` : ''}${itemName(best.s.id)} ${'★'.repeat(best.s.q ?? 1)}</p>`);
        list.appendChild(btn('Presentar al concurso', () => contest(best), 'primary'));
      }
    }
    // empleados
    H(`<h3>👷 Contratar empleados</h3><p class="muted">${WORKER_PRICE} fichas y ${WORKER_WAGE} fichas por día (se descuentan del banco al amanecer). Trabajan en tu base (tu catre o donde estés).</p>`);
    for (const [k, r] of Object.entries(WORKER_ROLES)) {
      const row = document.createElement('div'); row.className = 'trade';
      row.innerHTML = `<div class="tget"><b>${r.name}</b><br><small>${r.desc}</small></div>`;
      row.appendChild(btn('Contratar', () => hire(k)));
      list.appendChild(row);
    }
    // repartos
    H('<h3>🚚 Repartos</h3>');
    const here = m.home || m.pos;
    if (P.delivery && Math.hypot(P.delivery.to[0] - here.x, P.delivery.to[1] - here.z) < 60) {
      const n = P.delivery.n;
      list.appendChild(btn(`Entregar ${n} cajones de mercancía`, () => deliver(), 'primary'));
    } else if (P.delivery) H(`<p class="muted">Tenés un reparto pendiente a ${Math.round(Math.hypot(P.delivery.to[0] - p.pos.x, P.delivery.to[1] - p.pos.z))} m.</p>`);
    else {
      const dest = otherSettlement(here);
      if (!dest) H('<p class="muted">No conozco otro asentamiento cerca.</p>');
      else {
        const dist = Math.hypot(dest.x - here.x, dest.z - here.z);
        H(`<p>Llevá 4 cajones de mercancía al asentamiento a ${Math.round(dist)} m (mirá el mapa). Paga ${Math.round(dist / 35) + 4} fichas; si repetís la ruta queda como ruta comercial y te paga todos los días.</p>`);
        list.appendChild(btn('Aceptar el reparto', () => { P.delivery = { from: [here.x, here.z], to: [dest.x, dest.z], n: 4, t0: Date.now() }; give(354, 4); flash('Cargá los 4 cajones y llevalos al otro asentamiento (marcado en el mapa)'); ctx.closeInventory(); }));
      }
    }
  };
  ctx.ext.trader = (list) => {
    // los comerciantes también cambian fichas
    list.insertAdjacentHTML('beforeend', '<h3>Fichas</h3>');
    for (const [give_, get] of [[[[258, 6]], [353, 1]], [[[353, 3]], [274, 1]], [[[353, 4]], [332, 8]], [[[353, 6]], [339, 1]], [[[353, 12]], [360, 1]]]) {
      const row = document.createElement('div'); row.className = 'trade';
      row.innerHTML = `<div class="tgive">${give_.map(([id, n]) => `${iconImg(id)} ${n} × ${itemName(id)}`).join('<br>')}</div><div class="tarrow">→</div><div class="tget">${iconImg(get[0])} ${get[1]} × ${itemName(get[0])}</div>`;
      const b = btn('Cambiar', () => { if (!payList(give_)) return; give(get[0], get[1]); sfx.coin(); p.onEvent('trade', get[0]); ui.refresh(); });
      b.disabled = !p.creative && give_.some(([id, n]) => inv.count(id) < n);
      row.appendChild(b); list.appendChild(row);
    }
  };
  ctx.ext.tempOffset = () => season().temp;
  ctx.ext.onVehicleSpawn = () => {};

  function contest(best) {
    const s = best.s;
    const q = s.q ?? 1;
    const bonus = (s.label ? 6 : 0) + ([298, 318, 319].includes(s.id) ? 5 : 0) + Math.min(10, P.rep.cerv / 6);
    const score = Math.round(q * 16 + bonus + Math.random() * 12);
    const rivals = [['Doña Malta', 40 + Math.random() * 45], ['El Lupulero', 45 + Math.random() * 45], ['Cervecería Ceniza', 50 + Math.random() * 42]].map(([n, v]) => [n, Math.round(v)]);
    const table = [['Vos', score], ...rivals].sort((a, b) => b[1] - a[1]);
    const pos = table.findIndex((r) => r[0] === 'Vos') + 1;
    s.count--; if (!s.count) inv.slots[best.i] = null; inv.onChange();
    P.contestDay = day();
    let msg = '';
    if (pos === 1) { give(363, 1); give(353, 25); rep('cerv', 15, 'concurso'); P.contestWins = (P.contestWins || 0) + 1; p.onEvent('v6', 'concurso'); sfx.cheer(); msg = '🏆 ¡GANASTE EL CONCURSO! Copa cervecera + 25 fichas.'; }
    else if (pos === 2) { give(353, 12); rep('cerv', 6); msg = '🥈 Segundo puesto: 12 fichas.'; }
    else if (pos === 3) { give(353, 5); rep('cerv', 3); msg = '🥉 Tercer puesto: 5 fichas.'; }
    else { rep('cerv', 1); msg = 'Esta vez no hubo premio. ¡Mejorá la calidad (barriles) y ponele nombre!'; }
    openPanel('🍺 Concurso cervecero', (list) => {
      list.insertAdjacentHTML('beforeend', `<p>Los jueces probaron ${s.label ? `«${esc(s.label)}»` : itemName(s.id)}…</p>` + table.map(([n, v], i) => `<div class="${n === 'Vos' ? 'hint' : ''}">${i + 1}. ${n} · ${v} puntos</div>`).join('') + `<p><b>${msg}</b></p>`);
    });
  }

  // ---------- empleados ----------
  function basePos() { const s = meta.spawn; return s ? new THREE.Vector3(s.x, s.y, s.z) : p.pos.clone(); }
  function hire(role) {
    if (!payList([[353, WORKER_PRICE]])) return flash(`Necesitás ${WORKER_PRICE} fichas`);
    if (!auth()) { flash('En línea, sólo el anfitrión puede contratar empleados'); return; }
    const b = basePos();
    const m = g.mobs.add('worker', b.x + 1.5, b.y + 0.5, b.z + 0.5);
    m.role = role; m.home = b.clone(); m.keep = true;
    sfx.coin(); flash(`Contrataste un ${WORKER_ROLES[role].name}. Te espera en tu base.`);
    p.onEvent('v6', 'empleado');
    ctx.closeInventory();
  }
  function openWorker(m) {
    openPanel(`👷 ${WORKER_ROLES[m.role]?.name ?? 'Empleado'}`, (list) => {
      list.insertAdjacentHTML('beforeend', `<p>«${m.role === 'granjero' ? 'La tierra da lo que le das.' : m.role === 'guardia' ? 'Nadie pasa mientras yo esté.' : '¡La chopera no se atiende sola!'}»</p><p class="muted">${WORKER_ROLES[m.role]?.desc}</p><p>Sueldo: ${WORKER_WAGE} fichas por día desde el banco (saldo ${P.bank}).</p>`);
      for (const [k, r] of Object.entries(WORKER_ROLES)) if (k !== m.role) list.appendChild(btn(`Cambiar a ${r.name}`, () => { m.role = k; openWorker(m); }));
      list.appendChild(btn('Trabajá acá (mover la base a donde estoy)', () => { m.home = p.pos.clone(); m.goal = null; flash('El empleado ahora trabaja acá'); }));
      list.appendChild(btn('Despedir', () => { g.mobs.remove(m); ctx.closeInventory(); flash('Despediste al empleado'); }));
    });
  }
  let workAcc = 0;
  function workers(dt) {
    workAcc += dt;
    if (workAcc < 1) return;
    workAcc = 0;
    for (const m of g.mobs.list.values()) {
      if (m.type !== 'worker' || m.dying || !m.home) continue;
      const h = m.home;
      if (m.pos.distanceTo(h) > 40) { m.pos.set(h.x + 1, h.y + 0.5, h.z); m.goal = null; }
      if (m.role === 'granjero') {
        if (!m.goal) {
          // buscar un cultivo maduro
          outer: for (let r = 1; r <= 10; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            for (let dy = -2; dy <= 2; dy++) {
              const x = Math.floor(h.x) + dx, y = Math.floor(h.y) + dy, z = Math.floor(h.z) + dz;
              const c = BLOCKS[w.getBlock(x, y, z)]?.crop;
              if (c && c.stage === 3) { m.goal = new THREE.Vector3(x + 0.5, y, z + 0.5); m.goalBlock = [x, y, z]; break outer; }
            }
          }
          if (!m.goal && m.pos.distanceTo(h) > 4) m.goal = h.clone();
        } else if (Math.hypot(m.goal.x - m.pos.x, m.goal.z - m.pos.z) < 1.8) {
          if (m.goalBlock) {
            const [x, y, z] = m.goalBlock, b = w.getBlock(x, y, z), c = BLOCKS[b]?.crop;
            if (c && c.stage === 3) {
              const def = CROPS[c.kind];
              w.setBlock(x, y, z, def.base);
              const n = c.kind === 'potato' ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 3);
              storeNear(h, def.product, n);
              m.attackAnim = 0.3;
            }
          }
          m.goal = null; m.goalBlock = null;
        }
      } else if (m.role === 'guardia') {
        m.goal = m.pos.distanceTo(h) > 6 ? h.clone() : null;
        m.shootT = (m.shootT || 0) - 1;
        if (m.shootT > 0) continue;
        let tgt = null, td = 18;
        for (const o of g.mobs.list.values()) { if (!o.def.hostile || o.dying) continue; const d = o.pos.distanceTo(m.pos); if (d < td) { td = d; tgt = o; } }
        if (tgt) {
          m.shootT = 1.2;
          const from = new THREE.Vector3(m.pos.x, m.pos.y + 1.45, m.pos.z), to = new THREE.Vector3(tgt.pos.x, tgt.pos.y + tgt.def.h * 0.6, tgt.pos.z);
          m.targetYaw = m.yaw = Math.atan2(-(to.x - from.x), -(to.z - from.z));
          tracer(from, to, 0x9ad8ff); sfx.gun(1); m.attackAnim = 0.3;
          g.mobs.hit(tgt, 5, to.clone().sub(from).normalize(), null);
        }
      } else m.goal = m.pos.distanceTo(h) > 5 ? h.clone() : null;
    }
  }
  function storeNear(h, id, n) {
    let best = null, bd = 13;
    for (const [k, c] of sim.containers) {
      if (c.type !== 'chest' || !c.slots) continue;
      const [x, y, z] = p3(k); const d = Math.hypot(x - h.x, y - h.y, z - h.z);
      if (d < bd) { bd = d; best = [k, c]; }
    }
    if (best && sim.insertInto(best[1], id, n)) { sim.touch(best[0]); return; }
    g.drops.spawn(id, n, new THREE.Vector3(h.x, h.y + 1, h.z), new THREE.Vector3());
  }

  // ---------- repartos y rutas ----------
  function otherSettlement(here) {
    let best = null, bd = Infinity;
    const R = 1600;
    for (let gx = Math.floor((here.x - R) / 260); gx <= Math.floor((here.x + R) / 260); gx++) for (let gz = Math.floor((here.z - R) / 260); gz <= Math.floor((here.z + R) / 260); gz++) {
      const s = g.gen.settlementAt(gx, gz);
      if (!s) continue;
      const d = Math.hypot(s.x - here.x, s.z - here.z);
      if (d > 80 && d < bd) { bd = d; best = s; }
    }
    return best;
  }
  const routePay = (r) => 2 + Math.round(r.dist / 200);
  function deliver() {
    const D = P.delivery;
    if (!p.creative && inv.count(354) < D.n) return flash(`Te faltan cajones: tenés ${inv.count(354)} de ${D.n}`);
    if (!p.creative) inv.remove(354, D.n);
    const dist = Math.hypot(D.to[0] - D.from[0], D.to[1] - D.from[1]);
    const mins = (Date.now() - D.t0) / 60000;
    const pay = Math.round(dist / 35) + 4 + (mins < dist / 400 ? 5 : 0);
    give(353, pay); sfx.coin(); rep('chat', 5, 'reparto');
    const key = [D.from, D.to].map((a) => a.map(Math.round).join(',')).sort().join('|');
    let msg = `Entregaste la mercancía: +${pay} fichas${mins < dist / 400 ? ' (¡entrega rápida!)' : ''}.`;
    if (!P.routes.find((r) => r.key === key)) {
      P.routeCount = P.routeCount || {};
      P.routeCount[key] = (P.routeCount[key] || 0) + 1;
      if (P.routeCount[key] >= 2 && P.routes.length < 5) { P.routes.push({ key, dist }); msg += ` ¡Ruta comercial establecida! Paga ${routePay({ dist })} fichas por día.`; p.onEvent('v6', 'ruta'); }
      else if (P.routeCount[key] < 2) msg += ' Hacé esta ruta una vez más para establecerla.';
    }
    P.delivery = null;
    flash(msg);
    ctx.closeInventory();
  }

  // ---------- amanecer: intereses, sueldos, rutas, cervecero, concurso ----------
  let lastDay = day();
  function dawn() {
    const lines = [];
    // rutas comerciales
    const rp = P.routes.reduce((a, r) => a + routePay(r), 0);
    if (rp) { P.bank += rp; lines.push(`rutas +${rp}`); }
    // cervecero: vende la cerveza de las choperas cercanas a su puesto
    if (auth()) for (const m of g.mobs.list.values()) {
      if (m.type !== 'worker' || !m.home) continue;
      if (m.role === 'cervecero') {
        let sold = 0;
        for (const [k, c] of sim.containers) {
          if (c.type !== 'tap' || !c.slots) continue;
          const [x, y, z] = p3(k);
          if (Math.hypot(x - m.home.x, z - m.home.z) > 20) continue;
          for (let i = 0; i < c.slots.length && sold < 8; i++) {
            const s = c.slots[i];
            if (!s || !BEERS.includes(s.id)) continue;
            const n = Math.min(s.count, 8 - sold);
            sold += n; P.bank += n * (1 + Math.floor((s.q ?? 1) / 2)) + (s.label ? n : 0);
            s.count -= n; if (!s.count) c.slots[i] = null;
            sim.touch(k);
          }
        }
        if (sold) lines.push(`tu cervecero vendió ${sold} cervezas`);
      }
      // sueldo
      if (P.bank >= WORKER_WAGE) P.bank -= WORKER_WAGE;
      else { g.mobs.remove(m); flash('Un empleado renunció: no había fichas en el banco para pagarle'); }
    }
    // interés
    if (P.bank >= 10) { const i = Math.min(30, Math.floor(P.bank * 0.03)); P.bank += i; if (i) lines.push(`interés +${i}`); }
    if (lines.length) flash(`🏦 Buen día: ${lines.join(' · ')} · saldo ${P.bank} fichas`);
    if (((day() - 3) % 7 + 7) % 7 === 0) setTimeout(() => flash('🍺 ¡Hoy es el concurso cervecero! Llevá tu mejor cerveza a un líder de asentamiento.'), 4000);
    const s = season();
    if (day() % SEASON_DAYS === 0) setTimeout(() => flash(`${s.icon} Empieza el ${s.name.toLowerCase()}`), 7000);
    ensureDaily();
  }

  // ---------- trazadoras, explosiones, rayos ----------
  const tracers = [];
  function tracer(a, b, color = 0xffe08a) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    scene.add(line); tracers.push({ line, t: 0.12, T: 0.12 });
  }
  g.mobs.onShot = (from, to) => { tracer(from, to, 0xff9a5a); if (p.pos.distanceTo(from) < 50) sfx.gun(1); };
  const skyFlash = document.createElement('div');
  skyFlash.style.cssText = 'position:fixed;inset:0;background:#dfe8ff;opacity:0;pointer-events:none;z-index:4;transition:opacity .25s';
  document.body.appendChild(skyFlash);
  function boltFx(x, y, z) {
    const pts = []; let cx = x, cz = z;
    for (let yy = y + 70; yy > y; yy -= 5) { pts.push(new THREE.Vector3(cx, yy, cz)); cx += (Math.random() - 0.5) * 3; cz += (Math.random() - 0.5) * 3; }
    pts.push(new THREE.Vector3(x + 0.5, y, z + 0.5));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xeef4ff, transparent: true, opacity: 1 }));
    scene.add(line); tracers.push({ line, t: 0.35, T: 0.35 });
    const d = Math.hypot(x - p.pos.x, z - p.pos.z);
    skyFlash.style.transition = 'none'; skyFlash.style.opacity = String(Math.max(0.15, 0.6 - d / 150));
    requestAnimationFrame(() => { skyFlash.style.transition = 'opacity .4s'; skyFlash.style.opacity = '0'; });
    sfx.thunder(d);
    particles.burst(x, y, z, [255, 240, 180], 20, 1.2);
    if (d < 3.5 && sim.skyOpen(Math.floor(p.pos.x), Math.floor(p.pos.y + 1.6), Math.floor(p.pos.z))) { p.invuln = 0; p.damage(7, 'rayo'); }
  }
  function lightning() {
    // cae donde haya cielo abierto; prefiere lo alto y lo metálico
    let best = null;
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(p.pos.x + (Math.random() - 0.5) * 90), z = Math.floor(p.pos.z + (Math.random() - 0.5) * 90);
      const y = surfaceTop(x, z); if (y == null) continue;
      const b = w.getBlock(x, y, z);
      const score = y + ([12, 27, 29, 19].includes(b) ? 10 : 0);
      if (!best || score > best.s) best = { x, y, z, s: score, b };
    }
    if (!best) return;
    const m = { t: 'fx', op: 'bolt', x: best.x, y: best.y + 1, z: best.z };
    boltFx(m.x, m.y, m.z);
    if (net.active) net.send(m);
    if (FLAMMABLE[best.b] || Math.random() < 0.25) sim.ignite(best.x, best.y + 1, best.z);
    for (const mob of g.mobs.list.values()) if (Math.hypot(mob.pos.x - best.x, mob.pos.z - best.z) < 3) g.mobs.hit(mob, 12, null, null);
  }
  function explodeFx(x, y, z, r) {
    for (let i = 0; i < 4; i++) particles.burst(x - 0.5, y - 0.5, z - 0.5, i % 2 ? [255, 160, 60] : [90, 85, 80], 24, 1.6 + r * 0.2);
    const d = Math.hypot(x - p.pos.x, y - p.pos.y, z - p.pos.z);
    sfx.explode(d);
    g.shake = Math.max(g.shake || 0, Math.max(0, 0.9 - d / 25));
    if (d < r + 2.5) {
      const k = 1 - d / (r + 2.5);
      p.invuln = 0;
      p.damage(Math.round((7 + r * 2) * k), 'explosión', 0, new THREE.Vector3(p.pos.x - x, 0, p.pos.z - z).normalize().multiplyScalar(1.5 * k));
    }
  }
  // explosión: la simula quien la causa (bloques) y la autoridad (criaturas); todos ven y sufren la suya
  function explode(x, y, z, r = 3, send = true) {
    explodeFx(x, y, z, r);
    if (send && net.active) net.send({ t: 'fx', op: 'boom', x, y, z, r });
    if (auth()) for (const m of g.mobs.list.values()) {
      const d = m.pos.distanceTo(new THREE.Vector3(x, y, z));
      if (d < r + 2.5) g.mobs.hit(m, Math.round(18 * (1 - d / (r + 2.5))), new THREE.Vector3(m.pos.x - x, 0, m.pos.z - z).normalize(), p);
    }
    if (!send) return;
    for (const v of g.vehicles.list.values()) { const d = v.pos.distanceTo(new THREE.Vector3(x, y, z)); if (d < r + 2) v.hp = Math.max(0, (v.hp ?? 100) - 40 * (1 - d / (r + 2))); }
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dy * dy + dz * dz > r * r + 1 || Math.random() < 0.25) continue;
      const bx = X + dx, by = Y + dy, bz = Z + dz;
      const b = w.getBlock(bx, by, bz);
      if (b <= 0 || LIQ[b]) continue;
      const B = BLOCKS[b];
      if (B.hardness < 0 || B.hardness > 4 || B.container || b === 1 || b === 197) continue;
      if (!sim.canEdit(bx, bz, p.name, p.team)) continue;
      w.setBlock(bx, by, bz, FLAMMABLE[b] && Math.random() < 0.3 ? 181 : 0);
    }
  }
  api.explode = explode;

  // ---------- granadas ----------
  const grenades = [];
  const GRENADE_GEO = new THREE.BoxGeometry(0.22, 0.28, 0.22), GRENADE_MAT = new THREE.MeshLambertMaterial({ color: 0x4a5a3a });
  function throwGrenade() {
    const d = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const mesh = new THREE.Mesh(GRENADE_GEO, GRENADE_MAT);
    const pos = camera.position.clone().addScaledVector(d, 0.6);
    mesh.position.copy(pos); scene.add(mesh);
    grenades.push({ pos, vel: d.multiplyScalar(15).add(new THREE.Vector3(0, 3, 0)).add(p.vel.clone().multiplyScalar(0.5)), t: 2.2, mesh });
  }
  function updateGrenades(dt) {
    for (const gr of [...grenades]) {
      gr.t -= dt;
      gr.vel.y -= 20 * dt;
      for (const ax of ['x', 'y', 'z']) {
        const old = gr.pos[ax];
        gr.pos[ax] += gr.vel[ax] * dt;
        if (SOLID[w.getBlock(Math.floor(gr.pos.x), Math.floor(gr.pos.y), Math.floor(gr.pos.z))]) { gr.pos[ax] = old; gr.vel[ax] *= -0.35; gr.vel.x *= 0.7; gr.vel.z *= 0.7; }
      }
      gr.mesh.position.copy(gr.pos); gr.mesh.rotation.x += dt * 8;
      if (gr.t <= 0) { scene.remove(gr.mesh); grenades.splice(grenades.indexOf(gr), 1); explode(gr.pos.x, gr.pos.y, gr.pos.z, 3); }
    }
  }

  // ---------- ítems nuevos (clic derecho) ----------
  p.onUseItem = (hand, it, t, dir) => {
    // arco
    if (it.bow) {
      if (p.shootCd > 0) return true;
      if (!p.creative && inv.count(357) < 1) { p.useCd = 0.5; sfx.click(); flash('Sin flechas'); return true; }
      p.shootCd = 0.65; p.useCd = 0.2; p.swing = 1;
      if (!p.creative) { inv.remove(357, 1); inv.damageHand(); }
      g.projectiles.fire(camera.position.clone(), dir.clone(), it.bow * p.dmgMul, p, 357, 48);
      sfx.bow();
      return true;
    }
    if (it.grenade) { p.useCd = 0.8; p.swing = 1; throwGrenade(); if (!p.creative) inv.consumeHand(); return true; }
    if (it.flamer) { flamer(dir); p.useCd = 0.12; return true; }
    if (it.lighter) {
      p.useCd = 0.4; p.mouse.right = false;
      if (!t) return true;
      const x = t.x + t.face[0], y = t.y + t.face[1], z = t.z + t.face[2];
      if (!p.canEdit(x, z)) return true;
      if (sim.ignite(x, y, z)) { sfx.fire(); if (!p.creative) inv.damageHand(); }
      return true;
    }
    if (hand.id === 369) {
      // mina: se coloca en el piso
      if (!t || t.face[1] !== 1) return false;
      p.useCd = 0.4;
      const x = t.x, y = t.y, z = t.z;
      if (!p.canEdit(x, z) || !SOLID[t.id] || BLOCKS[t.id].container) return true;
      w.setBlock(x, y, z, 182); if (!p.creative) inv.consumeHand(); sfx.place(4); flash('Mina armada. ¡No la pises!');
      return true;
    }
    if (it.tape) {
      p.useCd = 0.3; p.mouse.right = false;
      if (!t) return true;
      if (p.keys.ShiftLeft || !api.sel || api.sel.b) { api.sel = { a: [t.x, t.y, t.z] }; flash(`Cinta métrica: esquina A en ${t.x}, ${t.y}, ${t.z}. Clic derecho en la esquina opuesta.`); }
      else {
        api.sel.b = [t.x, t.y, t.z];
        const s = selSize();
        flash(s.vol > 4096 ? `Selección muy grande (${s.w}×${s.h}×${s.d}). Máximo 4096 bloques.` : `Selección: ${s.w}×${s.h}×${s.d}. Usá el Plano de obra para guardarla o construir.`);
      }
      showSel();
      return true;
    }
    if (it.build) { p.useCd = 0.4; p.mouse.right = false; openBuild(t); return true; }
    return false;
  };

  // lanzallamas: cono de fuego de 5 bloques
  function flamer(dir) {
    const o = camera.position.clone();
    sfx.flame();
    if (!p.creative && inv.damageHand()) sfx.toolBreak();
    for (let i = 0; i < 6; i++) {
      const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)).normalize();
      const q = o.clone().addScaledVector(d, 1 + Math.random() * 4);
      particles.burst(q.x - 0.5, q.y - 0.5, q.z - 0.5, [255, 120 + Math.random() * 100, 30], 2, 0.4);
    }
    const hm = g.mobs.raycast(o, dir, 6);
    for (const m of g.mobs.list.values()) {
      const v = m.pos.clone().add(new THREE.Vector3(0, m.def.h * 0.5, 0)).sub(o);
      const d = v.length();
      if (d > 6 || v.normalize().dot(dir) < 0.9) continue;
      m.burnT = 4; m.burnBy = p;
      if (Math.random() < 0.3 || m === hm?.mob) g.mobs.hit(m, 1, null, p);
    }
    if (Math.random() < 0.35) {
      const hb = w.raycast(o, dir, 6);
      if (hb) { const x = hb.x + hb.face[0], y = hb.y + hb.face[1], z = hb.z + hb.face[2]; if (p.canEdit(x, z)) sim.ignite(x, y, z); }
    }
  }

  // ---------- bloques nuevos (clic derecho) ----------
  p.onUseBlock = (t, tb) => {
    if (tb.bank) { openBank(); return true; }
    if (tb.portal) { usePortal(t); return true; }
    if (tb.container === 'sign') { editSign(t); return true; }
    if (tb.station === 'taller') { openGarage(); return true; }
    if (tb.elevator) { flash('Ascensor: parate arriba y apretá Espacio para subir o C para bajar (hasta el siguiente ascensor de la columna)'); return true; }
    return false;
  };
  p.onPlace = (x, y, z, id) => {
    if (id === 184 || id === 185) { const k = k3(x, y, z); if (!meta.flags.includes(k)) meta.flags.push(k); if (meta.flags.length > 200) meta.flags.shift(); if (id === 185) flash('Bandera de largada: poné banderas de control formando el circuito y hacé clic derecho acá para correr'); }
  };

  // ---------- carteles ----------
  function editSign(t) {
    const k = k3(t.x, t.y, t.z);
    let c = sim.containers.get(k);
    askText('Texto del cartel', c?.text || '', (text) => {
      c = sim.container(t.x, t.y, t.z) || { type: 'sign' };
      c.text = text.slice(0, 60);
      sim.containers.set(k, c);
      if (auth()) sim.touch(k); else net.sendContainer(k, c);
      signAcc = 9;
    }, 60);
  }
  const signs = new Map();
  let signAcc = 9;
  function updateSigns(dt) {
    signAcc += dt;
    if (signAcc < 1) return;
    signAcc = 0;
    const seen = new Set();
    for (const [k, c] of sim.containers) {
      if (c.type !== 'sign' || !c.text) continue;
      const [x, y, z] = p3(k);
      if (Math.hypot(x - p.pos.x, z - p.pos.z) > 40) continue;
      if (w.getBlock(x, y, z) !== 191 && w.getBlock(x, y, z) !== -1) continue;
      seen.add(k);
      let s = signs.get(k);
      if (s && s.text === c.text) continue;
      if (s) { scene.remove(s.spr); s.spr.material.map.dispose(); s.spr.material.dispose(); }
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const x2 = cv.getContext('2d');
      x2.fillStyle = 'rgba(70,48,28,0.92)'; x2.fillRect(0, 0, 512, 128);
      x2.strokeStyle = '#2a1a0a'; x2.lineWidth = 8; x2.strokeRect(4, 4, 504, 120);
      x2.fillStyle = '#f0e0c0'; x2.font = '44px VT323, monospace'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
      const words = c.text.split(' '); const lines = ['']; for (const wd of words) { if ((lines[lines.length - 1] + ' ' + wd).length > 22) lines.push(wd); else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + wd).trim(); }
      lines.slice(0, 2).forEach((l, i, a) => x2.fillText(l, 256, 64 + (i - (a.length - 1) / 2) * 44));
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
      spr.scale.set(2, 0.5, 1); spr.position.set(x + 0.5, y + 1.45, z + 0.5);
      scene.add(spr);
      signs.set(k, { spr, text: c.text });
    }
    for (const [k, s] of signs) if (!seen.has(k)) { scene.remove(s.spr); s.spr.material.map.dispose(); s.spr.material.dispose(); signs.delete(k); }
  }

  // ---------- taller mecánico ----------
  const PAINTS = [['Rojo', 0xc8302a], ['Azul', 0x2a5ac8], ['Verde', 0x3a8a3a], ['Amarillo', 0xe0c23a], ['Negro', 0x2a2a2a], ['Blanco', 0xe8e8e8], ['Naranja', 0xd9823b], ['Violeta', 0x7a3ac8]];
  function openGarage() {
    let v = null, bd = 10;
    for (const x of g.vehicles.list.values()) { if (x.rider === 'ai') continue; const d = x.pos.distanceTo(p.pos); if (d < bd) { bd = d; v = x; } }
    if (!v) { flash('Taller: estacioná un vehículo a menos de 10 bloques'); return; }
    const VT = VEHICLE_TYPES[v.type];
    openPanel(`🔧 Taller · ${VT.name}`, (list) => {
      const t = (v.tune = v.tune || {});
      const H = (h) => list.insertAdjacentHTML('beforeend', h);
      H(`<p>Motor ${t.engine || 0}/3 · Blindaje ${t.armor || 0}/3 · Cubiertas ${t.tires || 0}/2 · Nitro ${t.nitro ? 'sí' : 'no'} · Daño ${Math.round((v.hp ?? VT.hp) / VT.hp * 100)}%</p>`);
      const up = (label, key, max, cost) => {
        const lvl = t[key] || 0;
        if (lvl >= max) { H(`<p class="muted">${label}: al máximo</p>`); return; }
        const c = cost(lvl + 1);
        const row = document.createElement('div'); row.className = 'trade';
        row.innerHTML = `<div class="tget"><b>${label} → nivel ${lvl + 1}</b><br><small>${listTxt(c)}</small></div>`;
        row.appendChild(btn('Instalar', () => { if (!payList(c)) return flash('Te faltan materiales'); t[key] = lvl + 1; sfx.craft(); p.onEvent('v6', 'tuning'); openGarage(); }));
        list.appendChild(row);
      };
      if (VT.tank || VT.mount) {
        up('Motor (velocidad y aceleración)', 'engine', 3, (l) => [[260, 2 * l], [259, l]]);
        up('Cubiertas (agarre en curvas)', 'tires', 2, (l) => [[176, 2 * l], [258, 3 * l]]);
      }
      up('Blindaje (menos daño en choques)', 'armor', 3, (l) => [[258, 6 * l], [260, l]]);
      if (!t.nitro && VT.tank) {
        const row = document.createElement('div'); row.className = 'trade';
        row.innerHTML = '<div class="tget"><b>Nitro</b> (Shift mientras manejás; se recarga solo)<br><small>1 Bidón de nafta + 3 acero + 2 cobre</small></div>';
        row.appendChild(btn('Instalar', () => { if (!payList([[339, 1], [260, 3], [259, 2]])) return flash('Te faltan materiales'); t.nitro = 1; v.nitro = 5; sfx.craft(); openGarage(); }));
        list.appendChild(row);
      }
      if ((v.hp ?? VT.hp) < VT.hp) list.appendChild(btn('Reparación completa (5 chatarra)', () => { if (!payList([[258, 5]])) return flash('Te faltan 5 chatarra'); v.hp = VT.hp; sfx.craft(); openGarage(); }));
      H('<h3>Pintura (1 tela)</h3>');
      const pal = document.createElement('div'); pal.className = 'paints';
      for (const [n, hex] of PAINTS) {
        const b = btn('', () => { if (!payList([[176, 1]])) return flash('Necesitás 1 tela'); t.paint = hex; g.vehicles.paint(v, hex); sfx.craft(); openGarage(); });
        b.title = n; b.style.background = '#' + hex.toString(16).padStart(6, '0'); b.className = 'swatch';
        pal.appendChild(b);
      }
      list.appendChild(pal);
    });
  }

  // ---------- portales y el Abismo ----------
  function teleport(pos) {
    if (p.riding) ctx.toggleMount();
    p.pos.set(pos.x, pos.y, pos.z); p.vel.set(0, 0, 0);
    sfx.portal();
  }
  function usePortal(t) {
    if (inAbyss()) {
      const lvl = abyssLevel(t.x);
      const lx = t.x - (ABYSS_X + (lvl - 1) * ABYSS_W);
      if (lx < 30) {
        const r = P.abyssReturn || meta.spawn || meta.origin;
        teleport({ x: r.x, y: r.y + 0.5, z: r.z });
        flash('Volviste a la superficie');
      } else {
        if (lvl % 5 === 0 && !P.guardians[lvl] && [...g.mobs.list.values()].some((m) => m.type === 'guardian')) { flash('El portal no responde mientras el Guardián siga vivo'); return; }
        const s = abyssStart(lvl + 1);
        teleport(s);
        P.abyssMax = Math.max(P.abyssMax || 0, lvl + 1);
        flash(`🕳 Abismo · nivel ${lvl + 1}${(lvl + 1) % 5 === 0 ? ' · algo enorme respira en la oscuridad' : ''}`);
        if (P.abyssMax >= 5) p.onEvent('v6', 'abismo5');
      }
    } else {
      P.abyssReturn = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      teleport(abyssStart(1));
      P.abyssMax = Math.max(P.abyssMax || 0, 1);
      flash('🕳 Entraste al Abismo · nivel 1. El portal junto a la llegada te devuelve; el del fondo del pasillo baja al siguiente nivel.');
      p.onEvent('v6', 'abismo');
    }
  }
  let abyssAcc = 0;
  function abyssTick(dt) {
    if (!inAbyss() || !auth()) return;
    abyssAcc += dt;
    if (abyssAcc < 2) return;
    abyssAcc = 0;
    const lvl = abyssLevel(p.pos.x);
    let hostile = 0;
    for (const m of g.mobs.list.values()) if (m.def.hostile) hostile++;
    if (hostile < 5 + lvl && Math.random() < 0.6) {
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(p.pos.x + (Math.random() - 0.5) * 50), z = Math.floor(p.pos.z + (Math.random() - 0.5) * 50);
        if (Math.hypot(x - p.pos.x, z - p.pos.z) < 12) continue;
        if (w.getBlock(x, 20, z) !== 0 || w.getBlock(x, 21, z) !== 0 || !SOLID[w.getBlock(x, 19, z)]) continue;
        const pool = ['ghoul', 'ghoul', 'rat', lvl >= 2 && (meta.rules?.armed ? 'soldier' : 'wolf'), lvl >= 3 && 'wolf', lvl >= 4 && 'shroom', lvl >= 6 && 'scorpion'].filter(Boolean);
        g.mobs.add(pool[Math.floor(Math.random() * pool.length)], x + 0.5, 20, z + 0.5, undefined, lvl);
        break;
      }
    }
    // guardián cada 5 niveles, cerca del portal de bajada
    if (lvl % 5 === 0 && !P.guardians[lvl]) {
      const ex = ABYSS_X + (lvl - 1) * ABYSS_W + 4 + 9 * 24 + 12;
      if (Math.hypot(p.pos.x - ex, p.pos.z) < 40 && ![...g.mobs.list.values()].some((m) => m.type === 'guardian')) {
        const m = g.mobs.add('guardian', ex - 14, 20, 0.5, undefined, Math.floor(lvl / 5));
        m.abyssLvl = lvl; sfx.boss(); flash('¡El Guardián del abismo despertó!');
      }
    }
    for (const m of g.mobs.list.values()) if (m.type === 'guardian' && m.dying && m.abyssLvl) P.guardians[m.abyssLvl] = true;
  }

  // ---------- planos de obra (copiar y pegar construcciones) ----------
  const loadDesigns = () => { try { return JSON.parse(localStorage.getItem('yermo-designs') || '{}'); } catch { return {}; } };
  const saveDesigns = (d) => { try { localStorage.setItem('yermo-designs', JSON.stringify(d)); } catch { flash('No se pudo guardar el diseño'); } };
  function selSize() {
    const { a, b } = api.sel;
    const w_ = Math.abs(a[0] - b[0]) + 1, h = Math.abs(a[1] - b[1]) + 1, d = Math.abs(a[2] - b[2]) + 1;
    return { w: w_, h, d, vol: w_ * h * d, x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), z0: Math.min(a[2], b[2]) };
  }
  let selBox = null;
  function showSel() {
    if (selBox) { scene.remove(selBox); selBox.geometry.dispose(); selBox = null; }
    if (!api.sel) return;
    const b = api.sel.b || api.sel.a, a = api.sel.a;
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), z0 = Math.min(a[2], b[2]);
    const W = Math.abs(a[0] - b[0]) + 1, Hh = Math.abs(a[1] - b[1]) + 1, D = Math.abs(a[2] - b[2]) + 1;
    selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.02, Hh + 0.02, D + 0.02)), new THREE.LineBasicMaterial({ color: 0x6ab0ff }));
    selBox.position.set(x0 + W / 2, y0 + Hh / 2, z0 + D / 2);
    scene.add(selBox);
  }
  const needItem = (id) => (PLACEABLE(id) && !BLOCKS[id].hidden ? id : BLOCKS[id].drop || id);
  function openBuild(t) {
    const designs = loadDesigns();
    openPanel('📐 Plano de obra', (list) => {
      const H = (h) => list.insertAdjacentHTML('beforeend', h);
      if (api.sel?.b) {
        const s = selSize();
        H(`<p>Selección con la cinta métrica: ${s.w}×${s.h}×${s.d}</p>`);
        list.appendChild(btn('Guardar la selección como diseño', () => {
          if (s.vol > 4096) return flash('La selección es muy grande (máximo 4096 bloques)');
          askText('Nombre del diseño', `Diseño ${Object.keys(designs).length + 1}`, (name) => {
            if (!name) return;
            const data = [];
            for (let y = 0; y < s.h; y++) for (let z = 0; z < s.d; z++) for (let x = 0; x < s.w; x++) { const b = w.getBlock(s.x0 + x, s.y0 + y, s.z0 + z); data.push(b > 0 && !LIQ[b] ? b : 0); }
            designs[name] = { size: [s.w, s.h, s.d], data, yaw: p.yaw };
            saveDesigns(designs); flash(`Diseño «${name}» guardado (sirve en todos tus mundos)`); p.onEvent('v6', 'plano');
          });
        }, 'primary'));
      } else H('<p class="muted">Con la Cinta métrica marcá dos esquinas opuestas para copiar una construcción.</p>');
      const names = Object.keys(designs);
      if (!names.length) H('<p class="muted">Todavía no guardaste diseños.</p>');
      else H(`<h3>Tus diseños</h3><p class="muted">Se construye apoyado donde estás mirando${t ? '' : ' (mirá un bloque primero)'}, orientado hacia donde mirás.</p>`);
      for (const n of names) {
        const d = designs[n];
        const need = {};
        for (const b of d.data) if (b) { const it = needItem(b); need[it] = (need[it] || 0) + 1; }
        const miss = Object.entries(need).filter(([id, c]) => inv.count(+id) < c);
        const row = document.createElement('div'); row.className = 'trade';
        row.innerHTML = `<div class="tget"><b>${esc(n)}</b> · ${d.size.join('×')}<br><small>${Object.entries(need).slice(0, 6).map(([id, c]) => `${c} ${itemName(+id)}`).join(', ')}${Object.keys(need).length > 6 ? '…' : ''}${!p.creative && miss.length ? `<br><span class="miss">Faltan: ${miss.map(([id, c]) => `${c - inv.count(+id)} ${itemName(+id)}`).join(', ')}</span>` : ''}</small></div>`;
        const b = btn('Construir', () => { build(d, t); ctx.closeInventory(); });
        b.disabled = !t || (!p.creative && miss.length > 0);
        row.appendChild(b);
        row.appendChild(btn('✕', () => { if (confirm(`¿Borrar el diseño «${n}»?`)) { delete designs[n]; saveDesigns(designs); openBuild(t); } }));
        list.appendChild(row);
      }
      ctx.ext?.build?.(list, t);
    });
  }
  function build(d, t) {
    const [W, Hh, D] = d.size;
    // rotación: cuartos de vuelta entre como se guardó y hacia donde mira ahora
    const q = ((Math.round((p.yaw - (d.yaw || 0)) / (Math.PI / 2)) % 4) + 4) % 4;
    const ox = t.x + t.face[0], oy = t.y + t.face[1], oz = t.z + t.face[2];
    let placed = 0; const changes = [];
    for (let y = 0; y < Hh; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const b = d.data[x + z * W + y * W * D];
      if (!b) continue;
      let rx = x, rz = z;
      if (q === 1) { rx = z; rz = W - 1 - x; } else if (q === 2) { rx = W - 1 - x; rz = D - 1 - z; } else if (q === 3) { rx = D - 1 - z; rz = x; }
      const wx = ox + rx - Math.floor((q % 2 ? D : W) / 2), wy = oy + y, wz = oz + rz - Math.floor((q % 2 ? W : D) / 2);
      const cur = w.getBlock(wx, wy, wz);
      if (cur !== 0 && !LIQ[cur] && cur !== 16) continue;
      if (!sim.canEdit(wx, wz, p.name, p.team)) continue;
      const it = needItem(b);
      if (!p.creative) { if (inv.count(it) < 1) continue; inv.remove(it, 1); }
      changes.push([wx, wy, wz, cur]); w.setBlock(wx, wy, wz, b); placed++;
    }
    g.building?.recordUndo(changes, 'Construcción del diseño');
    sfx.craft(); flash(`Construcción terminada: ${placed} bloques`);
  }

  // ---------- gestos (tecla B) ----------
  function openEmotes() {
    openPanel('🙋 Gestos', (list) => {
      const grid = document.createElement('div'); grid.className = 'emotes';
      for (const [k, e] of Object.entries(EMOTES)) grid.appendChild(btn(`${e.icon} ${e.name}`, () => { doEmote(k); ctx.closeInventory(); }));
      list.appendChild(grid);
      list.insertAdjacentHTML('beforeend', '<p class="muted">Los demás jugadores ven el gesto sobre tu cabeza. Con la cámara en tercera persona (V) lo ves vos también.</p>');
    });
  }
  function doEmote(k) {
    ctx.ext.pendingEmote = k;
    sfx.emote();
    const e = EMOTES[k];
    ctx.addChat(null, `* ${net.myName || p.name} ${e.txt}`);
    if (net.active) net.send({ t: 'fx', op: 'emote', e: k, id: net.myId, name: net.myName || p.name });
    if (k === 'cheers' && BEERS.includes(inv.hand?.id)) p.onEvent('v6', 'brindis');
  }

  // ---------- mensajes de red ----------
  net.onFx = (m) => {
    if (m.op === 'bolt') boltFx(m.x, m.y, m.z);
    else if (m.op === 'boom') explode(m.x, m.y, m.z, m.r, false);
    else if (m.op === 'emote') { const a = net.avatars.get(m.from ?? m.id); a?.emote(m.e); ctx.addChat(null, `* ${m.name} ${EMOTES[m.e]?.txt ?? ''}`); }
    else if (m.op === 'tornado') { tornado = m.on ? tornado || { x: m.x, z: m.z, vx: 0, vz: 0 } : null; if (tornado) { tornado.tx = m.x; tornado.tz = m.z; } }
    else if (m.op === 'meteor') meteorFx(m.x, m.y, m.z);
  };

  // ---------- tornado ----------
  let tornado = null, torMesh = null, torAcc = 0;
  api.setTornado = (x, z) => { tornado = { x, z, vx: 0, vz: 0 }; };
  function makeTornado() {
    const grp = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const r0 = 0.8 + i * 1.3, r1 = 1.6 + i * 1.3;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 7, 14, 1, true), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3a352e : 0x4a443a, transparent: true, opacity: 0.72 - i * 0.05, side: THREE.DoubleSide, depthWrite: false, fog: false }));
      m.position.y = i * 6.5 + 3.5; grp.add(m);
    }
    scene.add(grp);
    return grp;
  }
  function tornadoTick(dt) {
    const want = g.weather.type === 'tornado' && g.weather.k > 0.5 && !inAbyss();
    if (auth()) {
      if (want && !tornado) { const a = Math.random() * Math.PI * 2; tornado = { x: p.pos.x + Math.cos(a) * 70, z: p.pos.z + Math.sin(a) * 70 }; const b = Math.atan2(p.pos.z - tornado.z, p.pos.x - tornado.x) + (Math.random() - 0.5) * 0.8; tornado.vx = Math.cos(b) * 4; tornado.vz = Math.sin(b) * 4; flash('🌪 ¡Se acerca un tornado! Buscá refugio lejos del embudo.'); }
      if (!want && tornado) tornado = null;
      if (tornado) {
        tornado.x += tornado.vx * dt; tornado.z += tornado.vz * dt;
        if (Math.random() < dt * 0.3) { const b = Math.atan2(tornado.vz, tornado.vx) + (Math.random() - 0.5) * 1.2; tornado.vx = Math.cos(b) * 4; tornado.vz = Math.sin(b) * 4; }
        if (Math.hypot(tornado.x - p.pos.x, tornado.z - p.pos.z) > 110) { const b = Math.atan2(p.pos.z - tornado.z, p.pos.x - tornado.x); tornado.vx = Math.cos(b) * 4; tornado.vz = Math.sin(b) * 4; }
      }
      torAcc += dt;
      if (net.active && torAcc > 0.5) { torAcc = 0; net.send({ t: 'fx', op: 'tornado', on: !!tornado, x: tornado?.x, z: tornado?.z }); }
    } else if (tornado && tornado.tx != null) { tornado.x += (tornado.tx - tornado.x) * Math.min(1, dt * 3); tornado.z += (tornado.tz - tornado.z) * Math.min(1, dt * 3); }
    if (tornado && !torMesh) torMesh = makeTornado();
    if (!tornado && torMesh) { scene.remove(torMesh); torMesh.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); torMesh = null; }
    if (!tornado) return;
    const gy = surfaceTop(Math.floor(tornado.x), Math.floor(tornado.z)) ?? p.pos.y;
    torMesh.position.set(tornado.x, gy, tornado.z);
    torMesh.children.forEach((c, i) => (c.rotation.y += dt * (3 + i * 0.4)));
    if (Math.random() < 0.5) particles.burst(tornado.x - 1, gy + Math.random() * 3, tornado.z - 1, [110, 100, 88], 3, 2);
    // efectos sobre el jugador local
    const dx = tornado.x - p.pos.x, dz = tornado.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d < 22 && !p.creative) {
      const k = 1 - d / 22;
      const sheltered = !sim.skyOpen(Math.floor(p.pos.x), Math.floor(p.pos.y + 1.6), Math.floor(p.pos.z));
      if (!sheltered) {
        p.vel.x += (dx / d * 10 * k + -dz / d * 8 * k) * dt; p.vel.z += (dz / d * 10 * k + dx / d * 8 * k) * dt;
        if (d < 5) { p.vel.y = Math.max(p.vel.y, 7 * k + 3); api.torHurt = (api.torHurt || 0) + dt; if (api.torHurt > 0.8) { api.torHurt = 0; p.invuln = 0; p.damage(2, 'tornado'); } }
      }
    }
    // arrastra ítems, criaturas y rompe cosas livianas
    if (auth()) {
      for (const m of g.mobs.list.values()) { const md = Math.hypot(tornado.x - m.pos.x, tornado.z - m.pos.z); if (md < 8) { m.vel.x += (tornado.x - m.pos.x) * dt * 3; m.vel.z += (tornado.z - m.pos.z) * dt * 3; if (md < 4) m.vel.y = 6; } }
      if (Math.random() < dt * 6) {
        const x = Math.floor(tornado.x + (Math.random() - 0.5) * 7), z = Math.floor(tornado.z + (Math.random() - 0.5) * 7);
        const y = surfaceTop(x, z);
        if (y != null) { const b = w.getBlock(x, y, z); if ((FLAMMABLE[b] || b === 14 || b === 16 || BLOCKS[b]?.render === 'cross') && sim.canEdit(x, z, p.name, p.team) && !BLOCKS[b].container) { w.setBlock(x, y, z, 0); particles.burst(x, y, z, [120, 100, 80], 8, 1.5); } }
      }
    }
  }

  // ---------- eventos aleatorios ----------
  function meteorFx(x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xff8a3a }));
    const from = new THREE.Vector3(x + 60, y + 110, z + 30);
    mesh.position.copy(from); scene.add(mesh);
    meteors.push({ mesh, from, to: new THREE.Vector3(x + 0.5, y, z + 0.5), t: 0 });
  }
  const meteors = [];
  function updateMeteors(dt) {
    for (const m of [...meteors]) {
      m.t += dt / 3;
      m.mesh.position.lerpVectors(m.from, m.to, Math.min(1, m.t));
      m.mesh.rotation.x += dt * 4; m.mesh.rotation.y += dt * 3;
      particles.burst(m.mesh.position.x - 0.5, m.mesh.position.y - 0.5, m.mesh.position.z - 0.5, [255, 160 + Math.random() * 60, 40], 3, 0.5);
      if (m.t >= 1) {
        scene.remove(m.mesh); meteors.splice(meteors.indexOf(m), 1);
        if (m.local) {
          explode(m.to.x, m.to.y, m.to.z, 4);
          const X = Math.floor(m.to.x), Y = Math.floor(m.to.y), Z = Math.floor(m.to.z);
          for (let i = 0; i < 7; i++) { const x = X + Math.floor(Math.random() * 5 - 2), z = Z + Math.floor(Math.random() * 5 - 2); const y = surfaceTop(x, z); if (y != null) w.setBlock(x, y, z, 21); }
          const cy = surfaceTop(X, Z); if (cy != null) w.setBlock(X, cy + 1, Z, 200);
        } else explodeFx(m.to.x, m.to.y, m.to.z, 4);
      }
    }
  }
  function randomEvent() {
    const r = Math.random();
    const a = Math.random() * Math.PI * 2, dist = 35 + Math.random() * 30;
    const x = Math.floor(p.pos.x + Math.cos(a) * dist), z = Math.floor(p.pos.z + Math.sin(a) * dist);
    const y = surfaceTop(x, z);
    if (y == null || inAbyss()) return false;
    addStat('events');
    if (r < 0.34) {
      const ty = g.mobs.surfaceY(x, z); if (ty == null) return false;
      const t1 = g.mobs.add('trader', x + 0.5, ty, z + 0.5); t1.caravan = true;
      const t2 = g.mobs.add('trader', x + 2.5, ty, z + 1.5); t2.caravan = true;
      g.mobs.add('dog', x + 1.5, ty, z - 1);
      meta.events.push({ x, z, label: '🐪 Caravana', until: meta.clock + 400 });
      flash('🐪 Pasa una caravana de comerciantes cerca (mirá el mapa)'); sfx.craft();
    } else if (r < 0.67) {
      const m = { t: 'fx', op: 'meteor', x, y: y + 1, z };
      meteorFx(x, y + 1, z); meteors[meteors.length - 1].local = true;
      if (net.active) net.send(m);
      meta.events.push({ x, z, label: '☄ Meteorito', until: meta.clock + 900 });
      flash('☄ ¡Un meteorito cae del cielo! Donde caiga habrá uranio y una caja extraña.');
    } else {
      // avión estrellado: fuselaje, fuego y una caja militar
      for (let i = -5; i <= 5; i++) for (let j = -1; j <= 1; j++) { const yy = (surfaceTop(x + i, z + j) ?? y) + 1; if (Math.abs(j) === 1 && Math.abs(i) > 3) continue; w.setBlock(x + i, yy, z + j, Math.random() < 0.2 ? 0 : 27); }
      for (let j = -4; j <= 4; j++) if (Math.abs(j) > 1) w.setBlock(x, (surfaceTop(x, z + j) ?? y) + 1, z + j, 27);
      w.setBlock(x + 2, (surfaceTop(x + 2, z + 2) ?? y) + 1, z + 2, 198);
      sim.ignite(x - 3, (surfaceTop(x - 3, z + 2) ?? y) + 1, z + 2);
      meta.events.push({ x, z, label: '✈ Avión caído', until: meta.clock + 900, smoke: [x, y + 2, z] });
      explodeFx(x, y + 1, z, 2);
      flash('✈ ¡Un avión se estrelló cerca! Buscá la caja militar entre los restos.');
    }
    return true;
  }

  // ---------- asaltos de bandidos ----------
  g.mobs.onRaid = (m) => {
    const x0 = Math.floor(m.pos.x), y0 = Math.floor(m.pos.y), z0 = Math.floor(m.pos.z);
    for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 1; dy++) for (let dz = -2; dz <= 2; dz++) {
      const x = x0 + dx, y = y0 + dy, z = z0 + dz, b = w.getBlock(x, y, z), B = BLOCKS[b];
      if (B?.door && !B.door.open) {
        // romper la puerta
        const by = B.door.top ? y - 1 : y;
        w.setBlock(x, by, z, 0); w.setBlock(x, by + 1, z, 0);
        particles.burst(x, by, z, [110, 80, 50], 16, 1); sfx.broke(23);
        if (p.pos.distanceTo(m.pos) < 40) flash('💥 ¡Los bandidos rompieron una puerta!');
        return;
      }
      if (B?.container === 'chest' && (m.stolen?.length || 0) < 2) {
        const c = sim.containers.get(k3(x, y, z));
        const idx = c?.slots?.map((s, i) => (s ? i : -1)).filter((i) => i >= 0) ?? [];
        if (idx.length) {
          const i = idx[Math.floor(Math.random() * idx.length)];
          m.stolen = m.stolen || []; m.stolen.push(c.slots[i]); c.slots[i] = null; sim.touch(k3(x, y, z));
          if (p.pos.distanceTo(m.pos) < 50) flash(`💰 ¡Un bandido robó ${m.stolen[m.stolen.length - 1].count} ${itemName(m.stolen[m.stolen.length - 1].id)} de tu cofre! Matalo para recuperarlo.`);
          if (m.stolen.length >= 2) { const a = Math.random() * Math.PI * 2; m.raid = { x: m.pos.x + Math.cos(a) * 150, z: m.pos.z + Math.sin(a) * 150 }; }
          return;
        }
      }
    }
  };
  function raidCheck() {
    const t = g.time, night = t > 0.8 || t < 0.2;
    if (!meta.rules?.armed) return;
    if (!night || day() < 2 || meta.raidDay === day() || g.mobs.horde) return;
    const base = meta.spawn;
    if (!base || Math.hypot(base.x - p.pos.x, base.z - p.pos.z) > 70) return;
    meta.raidDay = day();
    if (Math.random() > 0.4) return;
    const a = Math.random() * Math.PI * 2, n = 3 + Math.floor(Math.random() * 3) + Math.min(3, Math.floor(day() / 10));
    let spawned = 0;
    for (let i = 0; i < n * 3 && spawned < n; i++) {
      const x = Math.floor(base.x + Math.cos(a) * 32 + (Math.random() - 0.5) * 8), z = Math.floor(base.z + Math.sin(a) * 32 + (Math.random() - 0.5) * 8);
      const y = g.mobs.surfaceY(x, z); if (y == null) continue;
      const m = g.mobs.add('bandit', x + 0.5, y, z + 0.5); m.raid = { x: base.x, z: base.z }; spawned++;
    }
    if (spawned) { api.raidOn = true; flash('🔫 ¡ASALTO! Una banda de bandidos viene a saquear tu base.'); sfx.horde(); if (net.active) net.sendChat('🔫 ¡Asalto de bandidos a la base!'); }
  }

  // ---------- criaturas nuevas en biomas ----------
  let spawnAcc = 0;
  function spawns() {
    const col = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z));
    const count = (t) => { let n = 0; for (const m of g.mobs.list.values()) if (m.type === t && !m.raid) n++; return n; };
    const place = (type, n) => {
      const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 14;
      const x = Math.floor(p.pos.x + Math.cos(a) * d), z = Math.floor(p.pos.z + Math.sin(a) * d);
      const y = g.mobs.surfaceY(x, z); if (y == null) return;
      for (let i = 0; i < n; i++) g.mobs.add(type, x + 0.5 + i, y, z + 0.5);
    };
    const r = Math.random();
    if (!meta.rules?.armed) return; // humanos armados desactivados (regla del mundo)
    if (col.biome === BIOME.SCRAPSEA && count('pirate') < 4 && r < 0.3) place('pirate', 1 + (r < 0.1 ? 1 : 0));
    else if (col.biome === BIOME.MILITARY && count('soldier') < 4 && r < 0.3) place('soldier', 1 + (r < 0.08 ? 1 : 0));
    else if (g.time > 0.78 || g.time < 0.22 ? r < 0.015 : r < 0.006) { if (count('bandit') < 3 && col.biome !== BIOME.BREW) place('bandit', 2); }
  }

  // ---------- fuego, minas, ascensores ----------
  let fireAcc = 0, mineAcc = 0, prevSpace = false, prevDown = false;
  function hazards(dt) {
    // fuego sobre el jugador
    const fb = w.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y + 0.2), Math.floor(p.pos.z));
    if (fb === 181) api.burning = 3;
    if (p.inWater) api.burning = 0;
    if (api.burning > 0 && !p.creative) {
      api.burning -= dt; fireAcc += dt;
      if (fireAcc > 0.8) { fireAcc = 0; p.invuln = 0; p.damage(1, 'fuego'); }
      if (Math.random() < 0.3) particles.burst(p.pos.x - 0.5, p.pos.y, p.pos.z - 0.5, [255, 140, 40], 1, 0.3);
    }
    // minas: el jugador y las criaturas
    const under = [Math.floor(p.pos.x), Math.floor(p.pos.y - 0.05), Math.floor(p.pos.z)];
    if (w.getBlock(...under) === 182 && !p.creative && !(p.riding && VEHICLE_TYPES[p.riding.type].fly)) { w.setBlock(...under, 0); explode(under[0] + 0.5, under[1] + 1, under[2] + 0.5, 2); flash('💥 ¡Pisaste una mina!'); }
    mineAcc += dt;
    if (mineAcc > 0.4 && auth()) {
      mineAcc = 0;
      for (const m of g.mobs.list.values()) {
        if (m.def.fly || m.dying) continue;
        const b = [Math.floor(m.pos.x), Math.floor(m.pos.y - 0.05), Math.floor(m.pos.z)];
        if (w.getBlock(...b) === 182) { w.setBlock(...b, 0); explode(b[0] + 0.5, b[1] + 1, b[2] + 0.5, 2); }
        const f = w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.2), Math.floor(m.pos.z));
        if (f === 181) m.burnT = 3;
      }
      // vehículos sobre minas
      for (const v of g.vehicles.list.values()) { const b = [Math.floor(v.pos.x), Math.floor(v.pos.y - 0.05), Math.floor(v.pos.z)]; if (w.getBlock(...b) === 182 && !VEHICLE_TYPES[v.type].fly) { w.setBlock(...b, 0); explode(b[0] + 0.5, b[1] + 1, b[2] + 0.5, 2); } }
    }
    // ascensor: parado encima, Espacio sube, C/Ctrl baja
    const sp = !!p.keys.Space, dn = !!(p.keys.KeyC || p.keys.ControlLeft);
    const bx = Math.floor(p.pos.x), by = Math.floor(p.pos.y - 0.05), bz = Math.floor(p.pos.z);
    if (!p.riding && w.getBlock(bx, by, bz) === 190) {
      const free = (y) => !SOLID[w.getBlock(bx, y + 1, bz)] && !SOLID[w.getBlock(bx, y + 2, bz)];
      if (sp && !prevSpace) { for (let y = by + 1; y < by + 80 && y < 126; y++) if (w.getBlock(bx, y, bz) === 190 && free(y)) { p.pos.y = y + 1.01; p.vel.y = 0; sfx.ding(); break; } }
      if (dn && !prevDown) { for (let y = by - 1; y > by - 80 && y > 1; y--) if (w.getBlock(bx, y, bz) === 190 && free(y)) { p.pos.y = y + 1.01; p.vel.y = 0; sfx.ding(); break; } }
      api.onElevator = true;
    } else api.onElevator = false;
    prevSpace = sp; prevDown = dn;
  }

  // ---------- monturas y domesticación ----------
  api.onInteractMob = (m, hand) => {
    const t = m.type;
    if (t === 'worker') { openWorker(m); return true; }
    if (t === 'leader' || t === 'trader' || t === 'settler' || t === 'instructor') { p.onEvent('talk', t); return false; }
    const TM = TAME[t];
    if (TM) {
      const tamed = TM.pet ? m.owner === p.name : m.tamed;
      if (hand?.id === 360) {
        if (!tamed) { flash(`Primero domesticalo (${TM.hint})`); return true; }
        if (!auth()) { flash('En línea, sólo el anfitrión puede ensillar por ahora'); return true; }
        g.mobs.remove(m);
        g.vehicles.spawn(m.pos.clone(), m.yaw, TM.veh);
        if (!p.creative) inv.consumeHand();
        flash(`¡Ensillaste al ${TM.name}! F para montar${VEHICLE_TYPES[TM.veh].jump ? ', Espacio para saltar' : ''}.`); sfx.craft();
        p.onEvent('v6', 'montura'); if (t === 'elephant') p.onEvent('v6', 'elefante');
        return true;
      }
      if (!tamed && hand && TM.food.includes(hand.id)) {
        inv.consumeHand();
        if (Math.random() < (hand.id === 272 ? 0.55 : TM.hard ? 0.2 : 0.34)) {
          if (TM.pet) { m.owner = p.name; m.keep = true; } else { m.tamed = true; m.keep = true; m.fleeT = 0; m.provoked = false; }
          particles.burst(m.pos.x - 0.5, m.pos.y + 1, m.pos.z - 0.5, [255, 90, 120], 10, 0.5);
          flash(`¡Domesticaste al ${TM.name}! Con una Montura (clic derecho) lo podés montar.`); p.onEvent('tame');
        } else flash('Come, pero todavía desconfía… seguí intentando');
        return true;
      }
      if (tamed) { flash('Está domesticado. Usá una Montura para montarlo.'); return true; }
    }
    return false;
  };

  // ---------- marcadores de generación ----------
  api.onMarker = (type, x, y, z) => {
    if (type === 'undercity') {
      // el mercado de la ciudad subterránea: comerciante fijo, vecinos y un banco (uno por mercado cercano)
      if (w.getBlock(x, y + 1, z - 3) === 0) w.setBlock(x, y + 1, z - 3, 180);
      for (const m of g.mobs.list.values()) if (m.type === 'trader' && m.keep && Math.hypot(m.pos.x - x, m.pos.z - z) < 40) return true;
      const tr = g.mobs.add('trader', x + 0.5, y + 1, z - 1.5); tr.keep = true; tr.home = tr.pos.clone();
      for (let i = 0; i < 2; i++) { const s = g.mobs.add('settler', x + 0.5 + (i ? 3 : -3), y + 1, z + 3.5); s.home = s.pos.clone(); }
      return true;
    }
    if (type === 'base') {
      const V = (dx, dz, t, yaw = 0, dy = 1.02) => g.vehicles.spawn(new THREE.Vector3(x + dx + 0.5, y + dy, z + dz + 0.5), yaw, t);
      [['moto', -22], ['cross', -19], ['racebike', -16], ['car', -12], ['racecar', -7], ['truck', 1]].forEach(([t, ox]) => V(ox, 18, t, Math.PI));
      V(-13, -16, 'heli', 0, 1.2);
      V(15, -17, 'boat', 0, 0.6);
      V(29, 0, 'cart', 0, 1.02); V(-29, -8, 'train', 0, 1.02);
      [['mzebra', -20, 2], ['mostrich', -15, 2], ['melephant', -11, 6], ['mboar', -21, 8], ['mwolf', -16, 8]].forEach(([t, ox, oz]) => V(ox, oz, t, Math.PI / 2));
      const fill = [
        [[9, 64], [13, 64], [23, 64], [14, 64], [27, 64], [28, 32], [26, 64], [65, 16], [38, 8], [2, 64], [15, 64], [60, 64], [59, 64], [191, 16]],
        [[268, 1], [269, 1], [270, 1], [276, 1], [356, 1], [357, 64], [302, 1], [304, 1], [303, 1], [306, 16], [329, 1], [355, 1], [361, 1], [362, 1], [274, 8]],
        [[339, 16], [360, 4], [365, 2], [101, 64], [101, 64], [312, 1], [345, 1], [340, 1], [342, 1], [364, 1], [183, 1]],
        [[272, 64], [285, 64], [281, 32], [283, 32], [329, 2], [271, 32]],
        [[76, 2], [77, 8], [75, 64], [73, 16], [135, 4], [137, 4], [188, 2], [187, 64], [189, 8], [190, 4], [179, 1], [353, 64]],
      ];
      g.gen.baseChests().forEach(([cx_, cy_, cz_], i) => {
        const k = k3(cx_, cy_, cz_);
        if (sim.containers.get(k)) return;
        const slots = new Array(27).fill(null);
        let j = 0;
        for (const [id, n] of fill[i] || []) for (let left = n; left > 0 && j < 27; j++) { const c = Math.min(left, maxStack(id)); slots[j] = { id, count: c }; left -= c; }
        sim.containers.set(k, { type: 'chest', slots, progress: 0, burn: 0 }); sim.touch(k);
      });
      const sk = k3(x + 4, y + 1, z - 22);
      sim.containers.set(sk, { type: 'sign', text: 'BASE EQUIPADA · TODO LISTO · CONTROLES EN LA GUÍA' }); sim.touch(sk);
      return true;
    }
    if (type === 'zoo') {
      const zoo = g.gen.zooNear(x, z);
      if (!zoo) return true;
      for (const sg of g.gen.zooSigns(zoo)) {
        const sy = g.gen.column(sg.x, sg.z).h + 1, k = k3(sg.x, sy, sg.z);
        if (!sim.containers.get(k)?.text) { sim.containers.set(k, { type: 'sign', text: sg.text }); sim.touch(k); }
      }
      const SECT = [['lion', 2], ['giraffe', 2, 'zebra', 3], ['elephant', 2, 'rhino', 1], ['gorilla', 1, 'monkey', 3], ['hippo', 1, 'crocodile', 2], ['penguin', 4, 'bear', 1], ['snake', 3], ['ostrich', 2, 'flamingo', 3, 'kangaroo', 2]];
      for (const s of g.gen.zooSectors(zoo)) {
        const list = SECT[s.i];
        for (let k = 0; k < list.length; k += 2) for (let n = 0; n < list[k + 1]; n++) {
          const ax = s.cx + (Math.random() - 0.5) * 10, az = s.cz + (Math.random() - 0.5) * 10;
          const m = g.mobs.add(list[k], ax, g.gen.column(Math.floor(ax), Math.floor(az)).h + 1.5, az);
          m.keep = true; m.home = m.pos.clone();
        }
      }
      return true;
    }
    if (type === 'train') {
      for (const v of g.vehicles.list.values()) if (v.type === 'train' && Math.hypot(v.pos.x - x, v.pos.z - z) < 90) return true;
      g.vehicles.spawn(new THREE.Vector3(x + 0.5, y + 1.02, z + 0.5), 0, 'train'); return true;
    }
    return false;
  };
  let poiCache = { t: -1e9, list: [] };
  api.pois = () => {
    const now = performance.now();
    if (now - poiCache.t < 5000) return poiCache.list;
    const list = [], R = 1400;
    for (let gx = Math.floor((p.pos.x - R) / 900); gx <= Math.floor((p.pos.x + R) / 900); gx++) for (let gz = Math.floor((p.pos.z - R) / 900); gz <= Math.floor((p.pos.z + R) / 900); gz++) {
      const u = g.gen.undercityAt(gx, gz); if (u) list.push({ x: u.x + 2, z: u.z + 2, label: 'Ciudad subterránea', color: '#b07aff', kind: 'poi' });
    }
    for (let gx = Math.floor((p.pos.x - R) / 1000); gx <= Math.floor((p.pos.x + R) / 1000); gx++) for (let gz = Math.floor((p.pos.z - R) / 1000); gz <= Math.floor((p.pos.z + R) / 1000); gz++) {
      const zz = g.gen.zooAt(gx, gz); if (zz) list.push({ x: zz.x, z: zz.z, label: 'Bioparque', color: '#e8c060', kind: 'poi' });
    }
    poiCache = { t: now, list };
    return list;
  };
  api.markers = () => {
    const out = [];
    for (const e of meta.events) if (e.until > meta.clock) out.push({ x: e.x, z: e.z, color: '#ffd84a', kind: 'poi', label: e.label });
    if (P.delivery) out.push({ x: P.delivery.to[0], z: P.delivery.to[1], color: '#6ab0ff', kind: 'poi', label: '🚚 Entrega' });
    if (tornado) out.push({ x: tornado.x, z: tornado.z, color: '#aaa', kind: 'boss', label: 'Tornado' });
    for (const m of g.mobs.list.values()) if (m.type === 'worker') out.push({ x: m.pos.x, z: m.pos.z, color: '#6ab0ff', kind: 'npc', label: 'Empleado' });
    return out;
  };

  // ---------- teclas ----------
  api.key = (e) => {
    if (e.code === 'KeyJ') { openJournal(); return true; }
    if (e.code === 'KeyB') { openEmotes(); return true; }
    return false;
  };

  // ---------- HUD: objetivo ----------
  const obj = document.createElement('div'); obj.id = 'objective'; $('#hud').appendChild(obj);
  let hudAcc = 0, moodAcc = 0, secAcc = 0, lastObj = '';
  function renderObjective() {
    const st = (story ? CAMPAIGN[P.camp] : null);
    let txt = st ? `📜 ${st.goal}` : '';
    if (P.delivery) txt += `${txt ? '<br>' : ''}🚚 Entrega a ${Math.round(Math.hypot(P.delivery.to[0] - p.pos.x, P.delivery.to[1] - p.pos.z))} m`;
    if (inAbyss()) txt = `🕳 Abismo · nivel ${abyssLevel(p.pos.x)}<br>` + txt;
    if (api.onElevator) txt += '<br>⬆ Espacio · ⬇ C';
    if (txt !== lastObj) { lastObj = txt; obj.innerHTML = txt ? `${txt}<small>J: diario</small>` : ''; }
    obj.hidden = !txt || !!g.race?.active;
  }

  // ---------- música dinámica ----------
  function moodTick() {
    let mood = 'explore';
    let danger = g.mobs.horde || api.raidOn;
    if (!danger) for (const m of g.mobs.list.values()) { if (m.def.hostile && !m.dying && m.pos.distanceTo(p.pos) < (m.def.boss ? 40 : 12)) { danger = true; break; } }
    if (g.race?.active && p.riding) mood = 'race';
    else if (danger) mood = 'danger';
    else if (inAbyss()) mood = 'abyss';
    else {
      for (const [k, c] of sim.containers) { if (c.type !== 'tap' || !c.bar) continue; const [x, y, z] = p3(k); if (Math.hypot(x - p.pos.x, y - p.pos.y, z - p.pos.z) < 12) { mood = 'tavern'; break; } }
    }
    const biome = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
    sfx.setMood?.(mood, biome);
    api.mood = mood;
  }

  // ---------- bucle ----------
  let evAcc = 0;
  api.update = (dt) => {
    for (const tr of [...tracers]) { tr.t -= dt; tr.line.material.opacity = Math.max(0, tr.t / tr.T); if (tr.t <= 0) { scene.remove(tr.line); tr.line.geometry.dispose(); tr.line.material.dispose(); tracers.splice(tracers.indexOf(tr), 1); } }
    meta.clock = (meta.clock || 0) + dt;
    updateGrenades(dt); updateMeteors(dt); updateSigns(dt);
    hazards(dt); tornadoTick(dt);
    if (auth()) workers(dt);
    abyssTick(dt);
    // estación
    const s = season();
    sim.growMul = s.grow; g.weather.winter = s.name === 'Invierno';
    sim.raining = g.weather.rainK > 0.3 || (g.weather.type === 'snow' && g.weather.k > 0.3);
    if (g.weather.type === 'snow' && g.weather.k > 0.5 && ctx.isAuthority()) p.targetTemp -= 0; // el frío ya lo da la estación
    // tormenta eléctrica
    if (auth() && g.weather.type === 'storm' && g.weather.k > 0.6 && !inAbyss() && Math.random() < dt / 5) lightning();
    // humo de los aviones caídos
    for (const e of meta.events) if (e.smoke && e.until > meta.clock && Math.random() < dt * 4 && Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 120) particles.burst(e.smoke[0], e.smoke[1] + Math.random() * 2, e.smoke[2], [60, 58, 56], 2, 0.3);
    // chisporroteo de incendios cercanos
    if (sim.fires.size && Math.random() < dt * 3) { for (const k of sim.fires.keys()) { const [x, y, z] = p3(k); if (Math.hypot(x - p.pos.x, y - p.pos.y, z - p.pos.z) < 10) { sfx.fire(); particles.burst(x, y + 0.5, z, [255, 120, 30], 2, 0.3); break; } } }
    secAcc += dt;
    if (secAcc > 1) {
      secAcc = 0;
      if (day() !== lastDay) { lastDay = day(); dawn(); }
      // campaña por condición
      const st = (story ? CAMPAIGN[P.camp] : null);
      if (st?.check && st.check({ P, inv })) advanceCampaign();
      if (auth()) {
        spawnAcc++;
        if (spawnAcc >= 3) { spawnAcc = 0; if (!inAbyss()) spawns(); raidCheck(); }
        if (api.raidOn && !(g.time > 0.8 || g.time < 0.2)) {
          api.raidOn = false; let left = 0;
          for (const m of g.mobs.list.values()) if (m.raid) { left++; m.raid = { x: m.pos.x + 200, z: m.pos.z }; }
          if (!left) { addStat('raids'); flash('☀ Rechazaste el asalto de los bandidos'); p.onEvent('v6', 'asalto'); }
        }
        if (api.raidOn && ![...g.mobs.list.values()].some((m) => m.raid && !m.dying)) { api.raidOn = false; addStat('raids'); flash('✔ ¡Rechazaste el asalto!'); p.onEvent('v6', 'asalto'); }
        evAcc++;
        meta.evT = (meta.evT ?? 240) - 1;
        if (meta.evT <= 0 && !p.dead) { meta.evT = 360 + Math.random() * 300; if (story) randomEvent(); }
      }
      meta.events = meta.events.filter((e) => e.until > meta.clock);
      if (p.riding?.type === 'heli' && !p.onGround) p.onEvent('v6', 'heli');
    }
    moodAcc += dt;
    if (moodAcc > 1.5) { moodAcc = 0; moodTick(); }
    hudAcc += dt;
    if (hudAcc > 0.3) { hudAcc = 0; renderObjective(); }
  };

  api.save = () => {};
  api.dispose = () => {
    for (const tr of tracers) scene.remove(tr.line);
    for (const gr of grenades) scene.remove(gr.mesh);
    for (const m of meteors) scene.remove(m.mesh);
    for (const s of signs.values()) scene.remove(s.spr);
    if (torMesh) scene.remove(torMesh);
    if (selBox) scene.remove(selBox);
    skyFlash.remove(); obj.remove();
    sfx.setMood?.('explore', 0);
  };
  ensureDaily();
  return api;
}
