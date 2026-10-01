// Progresión v10.8: libro de colección (animales, minerales, biomas, recetas, peces), desafíos semanales
// y experiencia con mejoras del personaje. Nada obligatorio: son metas para el que las quiera.
import { BLOCKS, ITEMS, RECIPES, itemName } from './blocks.js';
import { MOB_TYPES } from './entities.js';
import { BIOME_NAMES } from './worldgen.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const ORES = []; for (let i = 1; i < BLOCKS.length; i++) if (BLOCKS[i] && !BLOCKS[i].hidden && /mineral|veta|cristal arcano/i.test(BLOCKS[i].name || '')) ORES.push(i);
const ANIMALS = Object.entries(MOB_TYPES).filter(([, d]) => !d.npc && !d.human).map(([k]) => k);
const FISH = [399, 404, 397, 401, 353];
const CRAFTABLE = [...new Set(RECIPES.map((r) => r.out[0]))];

export const WEEKLY = [
  ['Pescá 8 veces', 'fish', 8], ['Fabricá 30 cosas', 'craft', 30], ['Rompé 150 bloques', 'break', 150], ['Eliminá 15 criaturas', 'kill', 15],
  ['Domesticá un animal', 'tame', 1], ['Plantá 10 veces', 'plant', 10], ['Cosechá 15 cultivos', 'harvest', 15], ['Comerciá 5 veces', 'trade', 5],
  ['Completá 2 misiones', 'quest', 2], ['Abrí 6 cofres o cajas', 'loot', 6], ['Sacá 3 fotos', 'photo', 3], ['Encontrá 2 notas de historias', 'story', 2],
  ['Comé 12 veces', 'eat', 12], ['Saltá 200 veces', 'jump', 200], ['Poné 120 bloques', 'place', 120],
];
export const PERKS = {
  corredor: ['🏃 Corredor', 'Te movés un 6% más rápido por nivel'],
  pulmones: ['🫁 Pulmones', 'Aguantás un 40% más bajo el agua por nivel'],
  minero: ['⛏ Minero', 'Rompés un 12% más rápido por nivel'],
  fuerte: ['💪 Fuerte', 'Pegás un 10% más fuerte por nivel'],
  abrigado: ['🧥 Abrigado', 'El frío y el calor te lastiman más despacio'],
  sanador: ['❤ Sanador', 'La vida se recupera más rápido'],
  suertudo: ['🍀 Suertudo', 'Más chances de encontrar cosas extra en cofres'],
};
const XP = { break: 1, craft: 2, kill: 5, fish: 4, loot: 3, quest: 20, story: 10, harvest: 1, plant: 1, trade: 3, tame: 15, photo: 2, place: 0.5 };
const levelFor = (xp) => Math.floor(Math.sqrt(xp / 30));

function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-${Math.ceil(((t - y0) / 864e5 + 1) / 7)}`;
}

export function createProgress(ctx) {
  const { game: g, flash, sfx } = ctx;
  const p = g.player, meta = g.meta;
  const api = {};
  const C = (meta.col = meta.col || { ores: [], biomes: [], recipes: [], fish: [], pages: {} });
  const X = (meta.xp = meta.xp || { xp: 0, perks: {}, spent: 0 });

  // ---------- mejoras aplicadas al jugador ----------
  function applyPerks() {
    const k = (n) => X.perks[n] || 0;
    p.perkSpeed = 1 + k('corredor') * 0.06; p.perkAir = 1 + k('pulmones') * 0.4; p.perkMine = 1 + k('minero') * 0.12;
    p.perkDmg = 1 + k('fuerte') * 0.1; p.perkCold = 1 + k('abrigado') * 0.5; p.perkRegen = 1 + k('sanador') * 0.35; p.perkLuck = k('suertudo') * 0.15;
  }
  applyPerks();

  // ---------- desafíos de la semana ----------
  function weekly() {
    const key = weekKey();
    if (meta.weekly?.key !== key) {
      let h = 0; for (const ch of key + (meta.seed || 0)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const pick = []; while (pick.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const i = h % WEEKLY.length; if (!pick.includes(i)) pick.push(i); }
      meta.weekly = { key, list: pick.map((i) => ({ i, prog: 0, done: false })) };
    }
    return meta.weekly;
  }

  // ---------- colección ----------
  const pages = () => {
    const seen = meta.seen || [];
    return [
      { id: 'animales', name: '🐾 Animales', have: ANIMALS.filter((a) => seen.includes(a)), all: ANIMALS, label: (a) => MOB_TYPES[a].name },
      { id: 'minerales', name: '💎 Minerales', have: ORES.filter((o) => C.ores.includes(o)), all: ORES, label: (o) => BLOCKS[o].name },
      { id: 'biomas', name: '🗺 Biomas', have: C.biomes.slice(), all: BIOME_NAMES.map((_, i) => i).filter((i) => i !== 11), label: (b) => BIOME_NAMES[b] },
      { id: 'recetas', name: '🛠 Recetas', have: CRAFTABLE.filter((r) => C.recipes.includes(r)), all: CRAFTABLE, label: (r) => itemName(r) },
      { id: 'pesca', name: '🎣 Pesca', have: FISH.filter((f) => C.fish.includes(f)), all: FISH, label: (f) => itemName(f) },
    ];
  };
  function checkPages() {
    for (const pg of pages()) {
      const f = pg.have.length / pg.all.length, st = C.pages[pg.id] || 0;
      for (const [mark, coins] of [[0.25, 5], [0.5, 10], [0.75, 15], [1, 30]]) {
        if (f >= mark && st < mark) {
          C.pages[pg.id] = mark; p.give(353, coins); sfx.coin?.();
          flash(`📖 ${pg.name}: ${Math.round(mark * 100)}% de la colección (+${coins} fichas)`);
          if (mark === 1) p.onEvent('v10', 'coleccion');
        }
      }
    }
  }
  function addXp(n) {
    if (!n) return;
    const before = levelFor(X.xp); X.xp += n;
    const now = levelFor(X.xp);
    if (now > before) { flash(`⭐ ¡Subiste al nivel ${now}! Tenés un punto de mejora (pausa → Juego → Libro)`); sfx.achievement?.(); p.onEvent('v10', 'nivel'); }
  }
  api.event = (n, id) => {
    addXp(XP[n] || 0);
    if (n === 'break' && ORES.includes(id) && !C.ores.includes(id)) { C.ores.push(id); addXp(10); }
    if (n === 'craft' && !C.recipes.includes(id)) { C.recipes.push(id); addXp(3); }
    if (n === 'fish' && !C.fish.includes(id)) C.fish.push(id);
    const W = weekly();
    for (const c of W.list) {
      if (c.done || WEEKLY[c.i][1] !== n) continue;
      c.prog++;
      if (c.prog >= WEEKLY[c.i][2]) { c.done = true; p.give(353, 20); p.give(397, 1); sfx.achievement?.(); flash(`🗓 Desafío de la semana: ${WEEKLY[c.i][0]} ✔ (+20 fichas y un regalo)`); if (W.list.every((x) => x.done)) { p.give(397, 1); flash('🗓 ¡Completaste los 3 desafíos de la semana! Regalo extra'); p.onEvent('v10', 'semana'); } }
    }
    if (n !== 'break' || ORES.includes(id)) checkPages();
  };
  let biomeAcc = 0;
  function biomeTick(dt) {
    biomeAcc += dt; if (biomeAcc < 2) return; biomeAcc = 0;
    const b = g.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z)).biome;
    if (!C.biomes.includes(b) && b !== 11) { C.biomes.push(b); addXp(15); checkPages(); }
    if ((meta.seen || []).length !== api.seenN) { api.seenN = (meta.seen || []).length; checkPages(); }
  }

  // ---------- el libro ----------
  function openBook(tab = 'col') {
    ctx.openPanel('📖 Libro del superviviente', (list) => {
      const lvl = levelFor(X.xp), next = 30 * (lvl + 1) ** 2, prev = 30 * lvl ** 2;
      const pts = lvl - Object.values(X.perks).reduce((a, b) => a + b, 0);
      list.insertAdjacentHTML('beforeend', `<div class="jtabs"><button data-t="col" class="${tab === 'col' ? 'on' : ''}">📖 Colección</button><button data-t="sem" class="${tab === 'sem' ? 'on' : ''}">🗓 Semana</button><button data-t="per" class="${tab === 'per' ? 'on' : ''}">⭐ Mejoras${pts > 0 ? ` (${pts})` : ''}</button></div>
        <p class="muted" style="font-size:15px">⭐ Nivel ${lvl} · ${Math.floor(X.xp - prev)}/${next - prev} de experiencia para el próximo</p>`);
      list.querySelectorAll('.jtabs button').forEach((b) => { b.onclick = () => openBook(b.dataset.t); });
      if (tab === 'col') {
        for (const pg of pages()) {
          const box = document.createElement('div'); box.className = 'quest';
          box.innerHTML = `<p><b>${pg.name}</b> <small class="muted">${pg.have.length}/${pg.all.length}</small></p><div class="repbar"><i style="width:${pg.have.length / pg.all.length * 100}%;background:#9cff7a"></i></div><p style="font-size:14px;line-height:1.3">${pg.all.map((x) => pg.have.includes(x) ? `<span>✔ ${esc(pg.label(x))}</span>` : '<span class="muted">· ???</span>').join(' &nbsp; ')}</p>`;
          list.appendChild(box);
        }
      } else if (tab === 'sem') {
        const W = weekly();
        list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Cambian cada semana (lunes). Cada uno da 20 fichas y un regalo; los tres, un regalo extra.</p>');
        for (const c of W.list) { const [txt, , n] = WEEKLY[c.i]; list.insertAdjacentHTML('beforeend', `<div class="trade"><div class="tgive" style="flex:1">${c.done ? '✔' : '◻'} ${txt}<br><small>${Math.min(c.prog, n)}/${n}</small></div></div>`); }
      } else {
        list.insertAdjacentHTML('beforeend', `<p>Puntos para gastar: <b>${pts}</b>. Ganás experiencia rompiendo, fabricando, pescando, explorando, comerciando y completando misiones. Cada mejora llega hasta nivel 3.</p>`);
        for (const [k, [name, desc]] of Object.entries(PERKS)) {
          const lv = X.perks[k] || 0;
          const row = document.createElement('div'); row.className = 'trade';
          row.innerHTML = `<div class="tgive" style="flex:1"><b>${name}</b> ${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}<br><small>${desc}</small></div>`;
          const b = document.createElement('button'); b.textContent = '+'; b.disabled = pts <= 0 || lv >= 3;
          b.onclick = () => { X.perks[k] = lv + 1; applyPerks(); sfx.craft?.(); openBook('per'); };
          row.appendChild(b); list.appendChild(row);
        }
      }
    });
  }
  api.openBook = openBook;

  // botón en la pausa (pestaña Juego)
  const grid = document.querySelector('.ptab[data-t="juego"] .pgrid');
  const bb = document.createElement('button'); bb.textContent = '📖 Libro';
  bb.onclick = () => { document.querySelector('#pause').hidden = true; ctx.setPause(false); openBook(); };
  grid?.appendChild(bb);
  api.key = (e) => { if (e.code === 'KeyO') { openBook(); return true; } return false; };
  api.update = (dt) => biomeTick(dt);
  api.dispose = () => { bb.remove(); };
  return api;
}
