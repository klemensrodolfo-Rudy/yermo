// Interfaz: hotbar, inventario, crafteo, cofres y máquinas, equipo, ítem sostenido y tooltips.
import { BLOCKS, ITEMS, RECIPES, BLUEPRINT_NAMES, itemName, maxStack, isBlock } from './blocks.js';
import { drawIcon } from './textures.js';
import { MACHINE_INFO } from './sim.js';

const $ = (s) => document.querySelector(s);
const STATION_NAMES = { mesa: 'Mesa de trabajo', horno: 'Horno', fogata: 'Fogata', prensa: 'Prensa de fichas', taller: 'Taller mecánico', runas: 'Altar de runas', alquimia: 'Mesa de alquimia' };
const BUFF_TXT = { coraje: 'Coraje: +30% de daño', coraza: 'Coraza: +20% de defensa', plomo: 'Hígado de plomo: -50% radiación', humo: 'Sigilo: las criaturas te ven de más cerca', acido: 'Regeneración rápida', frescura: 'Frescura: +15% de velocidad y correr sin hambre', furia: 'Furia: +60% de daño y +20% de defensa' };
export { BUFF_TXT };

export class UI {
  constructor(atlas, sfx) {
    this.atlas = atlas; this.sfx = sfx;
    this.iconCache = new Map();
    this.held = null;
    this.inv = null;
    this.open = false;
    this.stations = new Set();
    this.known = new Set();
    this.filter = 'all';
    this.creative = false;
    this.cont = null; // {key, c}
    this.tooltip = $('#tooltip');
    this.heldEl = $('#held');
    this.heldCanvas = this.heldEl.querySelector('canvas');
    this.heldCount = this.heldEl.querySelector('span');
    const follow = (e) => {
      this.heldEl.style.transform = `translate(${e.clientX - 24}px, ${e.clientY - 24}px)`;
      this.tooltip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 12}px)`;
    };
    document.addEventListener('mousemove', follow);
    document.addEventListener('mousedown', follow, true);
    this.nameTimer = 0;
    const search = $('#craftSearch');
    search.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { search.value = ''; search.blur(); this.renderCraft(); } });
    search.addEventListener('input', () => this.renderCraft());
    $('#invSort').addEventListener('click', () => { this.sortInv(); this.sfx.click(); });
    document.querySelectorAll('#craftTabs button').forEach((b) => b.addEventListener('click', () => {
      this.filter = b.dataset.f;
      document.querySelectorAll('#craftTabs button').forEach((x) => x.classList.toggle('on', x === b));
      this.renderCraft();
    }));
    // tirar lo que se sostiene haciendo clic fuera del panel
    $('#inv').addEventListener('mousedown', (e) => {
      if (e.target.id !== 'inv' || !this.held) return;
      const n = e.button === 2 ? 1 : this.held.count;
      this.onDropHeld?.({ ...this.held, count: n });
      this.held.count -= n; if (this.held.count <= 0) this.held = null;
      this.renderHeld();
    });
    // hotbar tocable (pantallas táctiles)
    $('#hotbar').addEventListener('click', (e) => { const s = e.target.closest('.slot'); if (s && this.inv) this.select(+s.dataset.idx); });
  }

  icon(id) {
    let c = this.iconCache.get(id);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 48;
      drawIcon(c, id, this.atlas);
      this.iconCache.set(id, c);
    }
    return c;
  }

  slotEl(stack, idx, label) {
    const el = document.createElement('div');
    el.className = 'slot';
    const cv = document.createElement('canvas'); cv.width = cv.height = 48;
    el.appendChild(cv);
    const n = document.createElement('span'); n.className = 'count'; el.appendChild(n);
    const bar = document.createElement('i'); bar.className = 'dur'; el.appendChild(bar);
    const qn = document.createElement('b'); qn.className = 'qual'; el.appendChild(qn);
    if (label) { const l = document.createElement('em'); l.className = 'slabel'; l.textContent = label; el.appendChild(l); }
    el.dataset.idx = idx;
    this.fillSlot(el, stack);
    return el;
  }
  fillSlot(el, s) {
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    const n = el.querySelector('.count'), bar = el.querySelector('.dur'), qn = el.querySelector('.qual');
    el.classList.toggle('filled', !!s);
    if (qn) qn.textContent = s?.q ? '★' + s.q : '';
    if (s) {
      ctx.drawImage(this.icon(s.id), 0, 0);
      n.textContent = s.count > 1 ? s.count : '';
      const max = ITEMS[s.id]?.durability;
      if (max && s.dur < max) { bar.style.display = 'block'; const f = s.dur / max; bar.style.width = (f * 80) + '%'; bar.style.background = `hsl(${f * 110},80%,50%)`; }
      else bar.style.display = 'none';
    } else { n.textContent = ''; bar.style.display = 'none'; }
  }

  bind(inv, creative, known) {
    this.inv = inv; this.creative = creative; this.known = known;
    const hb = $('#hotbar'); hb.innerHTML = '';
    for (let i = 0; i < 9; i++) hb.appendChild(this.slotEl(inv.slots[i], i));
    inv.onChange = () => this.refresh();
    this.refresh();
    $('#craftTitle').textContent = creative ? 'Todos los bloques' : 'Fabricación';
  }

  refresh() {
    const inv = this.inv;
    const hb = $('#hotbar').children;
    for (let i = 0; i < 9; i++) {
      this.fillSlot(hb[i], inv.slots[i]);
      hb[i].classList.toggle('sel', i === inv.selected);
    }
    if (this.open) { this.renderGrid(); this.renderSide(); }
  }

  select(i) {
    this.inv.selected = (i + 9) % 9;
    this.refresh();
    const s = this.inv.hand;
    const el = $('#itemName');
    el.textContent = s ? itemName(s.id) : '';
    el.style.opacity = 1;
    clearTimeout(this.nameTimer);
    this.nameTimer = setTimeout(() => (el.style.opacity = 0), 1600);
  }

  // ---------- Inventario ----------
  // panel libre en el lado derecho (comercio, misiones, diálogos)
  openPanel(stations, title, render) {
    this.panel = { title, render };
    this.openInv(stations, null, true);
  }
  openInv(stations, cont, keepPanel) {
    if (!keepPanel) this.panel = null;
    this.open = true;
    this.stations = stations;
    this.cont = cont || null;
    $('#inv').hidden = false;
    const st = [...stations].map((s) => STATION_NAMES[s]);
    $('#stationInfo').textContent = this.creative ? 'Modo creativo' : st.length ? 'Cerca: ' + st.join(' · ') : 'Sin estaciones cerca: fabricá una Mesa de trabajo';
    $('#craftTabs').style.display = this.cont || this.panel ? 'none' : '';
    $('#craftTabs').classList.toggle('creative', !!this.creative);
    $('#craftTitle').textContent = this.panel ? this.panel.title : this.cont ? (this.cont.title ?? MACHINE_INFO[this.cont.c.type].title) : this.creative ? 'Todos los bloques' : 'Fabricación';
    this.renderGrid();
    this.renderSide();
  }
  renderSide() {
    if (this.panel) { const list = $('#craftList'); list.className = 'panel'; list.innerHTML = ''; this.panel.render(list); }
    else if (this.cont) this.renderContainer(); else this.renderCraft();
  }
  closeInv() {
    this.open = false;
    this.cont = null; this.panel = null;
    $('#inv').hidden = true;
    this.tooltip.hidden = true;
    if (this.held) { const left = this.inv.add(this.held.id, this.held.count); if (left) this.onDropHeld?.({ ...this.held, count: left }); this.held = null; }
    this.renderHeld();
  }

  renderGrid() {
    const inv = this.inv;
    const main = $('#invMain'), bar = $('#invBar'), eq = $('#invEquip');
    main.innerHTML = ''; bar.innerHTML = ''; eq.innerHTML = '';
    const invAcc = (i) => ({ get: () => inv.slots[i], set: (v) => { inv.slots[i] = v; }, accept: () => true });
    for (let i = 9; i < 36; i++) main.appendChild(this.bindSlot(this.slotEl(inv.slots[i], i), invAcc(i), i));
    for (let i = 0; i < 9; i++) bar.appendChild(this.bindSlot(this.slotEl(inv.slots[i], i), invAcc(i), i));
    for (const [slot, label] of [['head', 'Cabeza'], ['body', 'Torso']]) {
      const acc = { get: () => inv.equip[slot], set: (v) => { inv.equip[slot] = v; }, accept: (id) => ITEMS[id]?.armor === slot, max: 1 };
      eq.appendChild(this.bindSlot(this.slotEl(inv.equip[slot], -1, label), acc));
    }
    // efectos activos
    const p = this.player;
    const buffs = p ? Object.entries(p.buffs).filter(([, t]) => t > 0).map(([k, t]) => `${BUFF_TXT[k]} (${Math.ceil(t)} s)`) : [];
    if (p?.drunk >= 1) buffs.push(p.drunk >= 3 ? 'Borracho: todo da vueltas' : 'Alegre');
    const def = p ? Math.round(p.armorDef * 100) : 0, rr = p ? Math.round(p.radRes * 100) : 0;
    $('#equipInfo').textContent = `Defensa ${def}% · Protección radiactiva ${rr}%` + (buffs.length ? ' · ' + buffs.join(' · ') : '');
  }

  // acc: {get, set, accept(id), max}
  bindSlot(el, acc, invIndex) {
    // táctil: mantener apretado mueve rápido (como Shift + clic) o muestra qué es
    let lp = null, lpDone = false;
    el.addEventListener('touchstart', () => {
      lpDone = false; clearTimeout(lp);
      lp = setTimeout(() => {
        lpDone = true;
        const s = acc.get();
        if (s && !this.held) { this.clickSlot(acc, false, true, invIndex); navigator.vibrate?.(15); this.sfx.click(); }
        else if (s) { this.showTip(s.id, '', s); setTimeout(() => (this.tooltip.hidden = true), 1800); }
      }, 420);
    }, { passive: true });
    el.addEventListener('touchend', (e) => { clearTimeout(lp); if (lpDone) e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', () => clearTimeout(lp), { passive: true });
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (lpDone) { lpDone = false; return; }
      this.clickSlot(acc, e.button === 2, e.shiftKey, invIndex);
      this.sfx.click();
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('mouseenter', () => this.showTip(acc.get()?.id, '', acc.get()));
    el.addEventListener('mouseleave', () => (this.tooltip.hidden = true));
    return el;
  }

  clickSlot(acc, right, shift, invIndex) {
    let s = acc.get(), h = this.held;
    const ms = (id) => Math.min(acc.max ?? 64, maxStack(id));
    if (shift && s && !h) {
      this.quickMove(acc, invIndex);
    } else if (!right) {
      if (h && !acc.accept(h.id)) return;
      if (h && s && h.id === s.id && ms(s.id) > 1) {
        const k = Math.min(h.count, ms(s.id) - s.count); s.count += k; h.count -= k; if (!h.count) h = null;
      } else if (h && h.count > ms(h.id)) {
        if (s) return;
        acc.set({ ...h, count: ms(h.id) }); h.count -= ms(h.id);
      } else { acc.set(h); h = s; }
    } else {
      if (!h && s) { const k = Math.ceil(s.count / 2); h = { ...s, count: k }; s.count -= k; if (!s.count) acc.set(null); }
      else if (h && !s) { if (!acc.accept(h.id)) return; acc.set({ ...h, count: 1 }); h.count--; if (!h.count) h = null; }
      else if (h && s && h.id === s.id && s.count < ms(s.id)) { s.count++; h.count--; if (!h.count) h = null; }
    }
    this.held = h;
    this.renderHeld();
    this.changed(acc);
  }

  // shift+clic: mover entre mochila y contenedor (o entre hotbar y mochila)
  quickMove(acc, invIndex) {
    const s = acc.get();
    const inv = this.inv;
    if (invIndex == null) {
      // desde contenedor/equipo hacia la mochila
      const left = inv.add(s.id, s.count);
      if (left) s.count = left; else acc.set(null);
    } else if (this.cont) {
      const c = this.cont.c, info = MACHINE_INFO[c.type];
      for (let i = 0; i < c.slots.length && s.count; i++) {
        const ok = !info.accept || (info.accept[i]?.length && info.accept[i].includes(s.id));
        if (!ok) continue;
        const t = c.slots[i];
        if (t && t.id === s.id && t.count < maxStack(s.id)) { const k = Math.min(s.count, maxStack(s.id) - t.count); t.count += k; s.count -= k; }
        else if (!t) { c.slots[i] = { ...s }; s.count = 0; }
      }
      if (!s.count) inv.slots[invIndex] = null;
    } else {
      const slots = inv.slots;
      const range = invIndex < 9 ? [9, 36] : [0, 9];
      for (let j = range[0]; j < range[1] && s.count; j++) {
        const t = slots[j];
        if (t && t.id === s.id && t.count < maxStack(s.id)) { const k = Math.min(s.count, maxStack(s.id) - t.count); t.count += k; s.count -= k; }
      }
      for (let j = range[0]; j < range[1] && s.count; j++) if (!slots[j]) { slots[j] = { ...s }; s.count = 0; }
      if (!s.count) slots[invIndex] = null;
    }
  }

  changed() {
    if (this.cont) this.onContainerChange?.(this.cont.key, this.cont.c);
    this.inv.onChange();
  }

  renderHeld() {
    const h = this.held;
    this.heldEl.hidden = !h;
    if (!h) return;
    const ctx = this.heldCanvas.getContext('2d'); ctx.clearRect(0, 0, 48, 48); ctx.drawImage(this.icon(h.id), 0, 0);
    this.heldCount.textContent = h.count > 1 ? h.count : '';
  }

  showTip(id, extra = '', stack) {
    if (!id) { this.tooltip.hidden = true; return; }
    const it = ITEMS[id];
    if (stack?.q) extra = `<small class="hint">Calidad ${'★'.repeat(stack.q)}${'☆'.repeat(5 - stack.q)}</small>` + extra;
    let sub = '';
    if (it?.tool) sub = `Herramienta · nivel ${it.tier} · daño ${it.weapon}`;
    else if (it?.weapon) sub = `Arma · daño ${it.weapon}`;
    else if (it?.ranged) sub = `Arma a distancia · daño ${it.ranged} · usa virotes (clic derecho)`;
    else if (it?.bow) sub = `Arco · daño ${it.bow} · usa flechas (clic derecho)`;
    else if (it?.grenade) sub = 'Clic derecho: tirar (explota a los 2 segundos)';
    else if (it?.flamer) sub = 'Mantené clic derecho: lanza fuego (prende criaturas y madera)';
    else if (it?.lighter) sub = 'Clic derecho: prender fuego (fogatas, incendios…)';
    else if (it?.tape) sub = 'Clic derecho en dos esquinas: marca una construcción para copiar';
    else if (it?.build) sub = 'Clic derecho: guardar la selección o construir un diseño guardado';
    else if (id === 360) sub = 'Clic derecho sobre un jabalí o lobo domesticado para montarlo';
    else if (id === 353) sub = 'Moneda del yermo: comercio, banco, empleados, campeonato';
    else if (id === 354) sub = 'Llevalo al asentamiento de destino del reparto';
    else if (id === 363) sub = 'Premio del concurso cervecero';
    else if (id === 369) sub = 'Clic derecho en el piso: arma una mina terrestre';
    else if (it?.armor) sub = `Armadura (${it.armor === 'head' ? 'cabeza' : 'torso'}) · defensa ${Math.round(it.def * 100)}%${it.radRes ? ` · radiación -${Math.round(it.radRes * 100)}%` : ''} · clic derecho para equipar`;
    else if (it?.beer) sub = `Cerveza · ${BUFF_TXT[it.buff]} · clic derecho para tomar`;
    else if (it?.gun) sub = `Arma de fuego · ${it.gun.pellets > 1 ? it.gun.pellets + ' perdigones de ' : ''}daño ${it.gun.dmg} · usa munición (clic derecho)`;
    else if (it?.drink) sub = `Agua limpia · ${stack?.dur ?? it.durability} tragos · clic derecho para tomar`;
    else if (id === 328) sub = 'Clic derecho sobre agua de manantial para cargarla';
    else if (it?.note) sub = 'Clic derecho para leer';
    else if (it?.fuel) sub = `Combustible · clic derecho sobre un vehículo para cargar${it.heal ? ' · también desinfecta (clic derecho)' : ''}`;
    else if (it?.food || it?.heal || it?.antirad) sub = [it.food && `Alimenta ${it.food}`, it.heal && `Cura ${it.heal / 2} ♥`, it.antirad && `Radiación -${it.antirad}%`].filter(Boolean).join(' · ') + ' · clic derecho';
    else if (it?.learn) sub = `Plano: enseña a fabricar ${BLUEPRINT_NAMES[it.learn]} · clic derecho`;
    else if (it?.plant) sub = 'Se siembra en tierra de cultivo (clic derecho). Arás la tierra con una pala.';
    else if (it?.bucket || id === 277) sub = id === 277 ? 'Clic derecho sobre agua o lava para llenarlo' : 'Clic derecho para volcarlo';
    else if (it?.vehicle) sub = 'Clic derecho en el piso para dejarla · F para subir/bajar';
    else if (isBlock(id)) {
      const b = BLOCKS[id];
      sub = b.light ? `Bloque · emite luz ${b.light}` : 'Bloque';
      if (b.station) sub = 'Estación de fabricación';
      if (b.container) sub = b.container === 'chest' ? 'Guarda 27 pilas de objetos' : 'Máquina: clic derecho para usarla';
      if (b.elec) sub = { wire: 'Conduce electricidad', device: 'Se enciende con electricidad', source: 'Da electricidad quemando carbón', solar: 'Da electricidad de día', fence: 'Con electricidad, lastima a las criaturas' }[b.elec];
    } else sub = 'Material';
    this.tooltip.innerHTML = `<b>${stack?.label ? `«${String(stack.label).replace(/[<>&]/g, '')}» · ` : ''}${itemName(id)}</b><small>${sub}</small>${extra}`;
    this.tooltip.hidden = false;
  }

  // ---------- Cofres y máquinas ----------
  renderContainer() {
    const list = $('#craftList');
    const { c } = this.cont;
    const info = MACHINE_INFO[c.type];
    list.className = 'machine';
    list.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = c.type === 'chest' || c.type === 'cask' || c.type === 'hopper' ? 'grid' : 'mslots';
    c.slots.forEach((s, i) => {
      const acc = {
        get: () => c.slots[i], set: (v) => { c.slots[i] = v; },
        accept: (id) => !info.accept || (info.accept[i]?.length ? info.accept[i].includes(id) : false),
      };
      grid.appendChild(this.bindSlot(this.slotEl(s, -1, info.labels[i]), acc));
    });
    list.appendChild(grid);
    if (c.type !== 'chest' && c.type !== 'hopper') {
      const pr = document.createElement('div'); pr.className = 'mprog';
      pr.innerHTML = '<div class="pbar"><i></i></div><p class="mstatus"></p>';
      list.appendChild(pr);
      const help = document.createElement('p'); help.className = 'muted mhelp';
      help.innerHTML = {
        generator: 'Quema 1 carbón cada 90 s. Conectá cables hasta focos o cercos eléctricos.',
        mill: 'Muele malta (o malta tostada) para la olla. Se hace malta en el horno con cebada.',
        kettle: 'Agua limpia + 4 malta molida + 2 lúpulo + carbón → 2 mostos. Malta tostada da mosto oscuro; con uranio de extra, radiactivo.',
        fermenter: 'Mosto + levadura + 4 botellas → 4 cervezas. Calidad: bajo techo +1★, equipo limpio +1★, con heladera encendida al lado +1★ (y el mosto pálido sale Lager). Cada 3 tandas limpialo con un balde de agua limpia.',
        cask: 'Guardá cervezas: cada 5 minutos ganan una estrella, hasta ★★★★★. Las de más calidad curan más, duran más y se venden mejor.',
        tap: 'Con una barra de taberna y sillas cerca (y mejor con cartel), los clientes compran una cerveza cada tanto y dejan chatarra en la caja. Más estrellas = más paga.',
        still: 'Destila cerveza, mosto, papas, cebada o hongos en alcohol: combustible para vehículos y desinfectante.',
      }[c.type];
      list.appendChild(help);
      this.updateContainer();
    }
  }
  updateContainer() {
    if (!this.open || !this.cont) return;
    const c = this.cont.c;
    const bar = document.querySelector('#craftList .pbar i');
    if (bar) {
      const f = c.type === 'generator' ? Math.min(1, (c.burn || 0) / 90) : c.max ? Math.min(1, (c.progress || 0) / c.max) : 0;
      bar.style.width = (f * 100) + '%';
      document.querySelector('#craftList .mstatus').textContent = c.status || '';
    }
  }
  refreshContainerSlots() {
    if (!this.open || !this.cont) return;
    const slots = document.querySelectorAll('#craftList .slot');
    this.cont.c.slots.forEach((s, i) => slots[i] && this.fillSlot(slots[i], s));
    this.updateContainer();
  }

  // ordenar la mochila (no toca la barra de abajo): junta pilas y agrupa bloques, herramientas y el resto
  sortInv() {
    const s = this.inv.slots, items = [];
    for (let i = 9; i < 36; i++) if (s[i]) { items.push(s[i]); s[i] = null; }
    const merged = [];
    for (const it of items) {
      const same = merged.find((m) => m.id === it.id && m.dur == null && it.dur == null && (m.q ?? 0) === (it.q ?? 0) && m.count < maxStack(it.id));
      if (same) { const k = Math.min(it.count, maxStack(it.id) - same.count); same.count += k; it.count -= k; }
      if (it.count > 0) merged.push(it);
    }
    const group = (id) => (isBlock(id) ? 0 : ITEMS[id]?.tool || ITEMS[id]?.weapon || ITEMS[id]?.ranged ? 1 : ITEMS[id]?.armor ? 2 : ITEMS[id]?.food || ITEMS[id]?.heal ? 3 : 4);
    merged.sort((a, b) => group(a.id) - group(b.id) || a.id - b.id || b.count - a.count);
    merged.forEach((it, i) => { s[9 + i] = it; });
    this.inv.onChange(); this.renderGrid();
  }

  renderCraft() {
    const list = $('#craftList');
    list.innerHTML = '';
    const q = ($('#craftSearch')?.value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const match = (id) => !q || itemName(id).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
    if (this.creative) {
      list.className = 'palette';
      const ids = [];
      for (const b of BLOCKS) if (b && b.id > 1 && !b.hidden && !b.liquid) ids.push(b.id);
      for (const k of Object.keys(ITEMS)) ids.push(+k);
      for (const id of ids.filter(match)) {
        const el = this.slotEl({ id, count: 1 }, -1);
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.held = { id, count: e.button === 2 ? 1 : maxStack(id) };
          if (ITEMS[id]?.durability) this.held.dur = ITEMS[id].durability;
          this.renderHeld(); this.sfx.click();
        });
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        el.addEventListener('mouseenter', () => this.showTip(id));
        el.addEventListener('mouseleave', () => (this.tooltip.hidden = true));
        list.appendChild(el);
      }
      return;
    }
    list.className = '';
    const inv = this.inv;
    const rows = RECIPES.map((r) => ({ r, ok: inv.canCraft(r, this.stations, this.known), locked: r.bp && !this.known.has(r.bp) }))
      .filter(({ ok, r }) => (this.filter === 'all' || ok) && (match(r.out[0]) || r.in.some(([id]) => match(id))));
    rows.sort((a, b) => (b.ok - a.ok) || (a.locked - b.locked));
    for (const { r, ok, locked } of rows) {
      const row = document.createElement('div');
      row.className = 'recipe' + (ok ? ' ok' : '') + (locked ? ' locked' : '');
      row.appendChild(this.slotEl({ id: r.out[0], count: r.out[1] }, -1));
      const info = document.createElement('div'); info.className = 'rinfo';
      const needSt = r.station && !this.stations.has(r.station);
      info.innerHTML = `<b>${itemName(r.out[0])}</b>` + (r.station ? `<em class="${needSt ? 'miss' : ''}">${STATION_NAMES[r.station]}</em>` : '') +
        (locked ? `<em class="miss">🔒 Plano: ${BLUEPRINT_NAMES[r.bp]}</em>` : '');
      const ing = document.createElement('div'); ing.className = 'ings';
      for (const [id, n] of r.in) {
        const have = inv.count(id);
        const d = document.createElement('span');
        d.className = have >= n ? '' : 'miss';
        const c = document.createElement('canvas'); c.width = c.height = 48; c.getContext('2d').drawImage(this.icon(id), 0, 0);
        d.appendChild(c);
        d.append(`${n}`);
        d.title = `${itemName(id)} (${have}/${n})`;
        ing.appendChild(d);
      }
      info.appendChild(ing);
      row.appendChild(info);
      if (ok) {
        // fabricar varios sin teclado (en el celu no hay Shift)
        const more = document.createElement('div'); more.className = 'rmore';
        for (const [txt, n] of [['×5', 5], ['Máx', 64]]) {
          const b = document.createElement('button'); b.textContent = txt;
          b.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); let t = n, made = 0; while (t-- > 0 && inv.canCraft(r, this.stations, this.known)) { const res = inv.craft(r, this.stations, this.known); if (res !== true && res > 0) this.onDropHeld?.({ id: r.out[0], count: res }); made++; } if (made) { this.sfx.craft(); this.onCraft?.(r.out[0]); } });
          more.appendChild(b);
        }
        row.appendChild(more);
      }
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        let times = e.shiftKey ? 16 : 1, made = 0;
        while (times-- > 0 && inv.canCraft(r, this.stations, this.known)) {
          const res = inv.craft(r, this.stations, this.known);
          if (res !== true && res > 0) this.onDropHeld?.({ id: r.out[0], count: res });
          made++;
        }
        if (made) { this.sfx.craft(); this.onCraft?.(r.out[0]); }
      });
      row.addEventListener('mouseenter', () => this.showTip(r.out[0], ok ? '<small class="hint">Clic: fabricar · Shift+clic: varios</small>' : locked ? '<small class="hint">Encontrá el plano en cajas de ruinas y búnkeres</small>' : ''));
      row.addEventListener('mouseleave', () => (this.tooltip.hidden = true));
      list.appendChild(row);
    }
    if (!rows.length) list.innerHTML = '<p class="empty">Nada disponible todavía. Juntá materiales.</p>';
  }
}
