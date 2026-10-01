// Construcción v10.9: sierra de formas (losa, escalón, panel, alfombra de cualquier material), decoración
// (maceta, farol, mesa, silla…) y herramientas de obra: rellenar, vaciar, reemplazar y deshacer.
import { BLOCKS, ITEMS, OPAQUE, LIQ, RENDER, SHAPE_BOXES, DECOR, setShapeHook } from './blocks.js';

const SHAPED = { 128: 'losa', 129: 'escalon', 254: 'panel', 255: 'decor' };
const k3 = (x, y, z) => x + ',' + y + ',' + z;

export function createBuilding(ctx) {
  const { game: g, flash, sfx, particles } = ctx;
  const p = g.player, w = g.world, sim = g.sim, inv = g.inv, meta = g.meta;
  const api = {};
  const auth = () => ctx.isAuthority();
  const save = (k) => { if (auth()) sim.touch(k); else ctx.net.sendContainer(k, sim.containers.get(k)); };

  // información de cada forma para el dibujo y las colisiones
  const info = (x, y, z) => { const c = sim.containers.get(k3(x, y, z)); if (!c) return null; if (c.type === 'shape') return [c.mat, c.rot || 0]; if (c.type === 'decor') return [c.kind, c.rot || 0]; return null; };
  w.shapeInfo = info;
  setShapeHook((id, x, y, z) => {
    const s = SHAPED[id]; if (!s || s === 'decor') return null;
    const i = info(x, y, z); const list = SHAPE_BOXES[s]; const bx = list[(i ? i[1] : 0) % list.length] || list[0];
    return bx.map((b) => [b[0] / 16, b[1] / 16, b[2] / 16, b[3] / 16, b[4] / 16, b[5] / 16]);
  });
  // lo que suelta al romperse: el material (formas) o el objeto (decoración)
  p.dropFor = (x, y, z, id) => {
    if (!SHAPED[id]) return null;
    const c = sim.containers.get(k3(x, y, z));
    if (SHAPED[id] === 'decor') return c ? 406 + (c.kind || 0) : null;
    return c?.mat ?? 2;
  };
  // si se rompe o se reemplaza, se borra su información (un rato después, así el que la rompió recibe su material)
  const prevChanged = sim.blockChanged.bind(sim);
  sim.blockChanged = (x, y, z, old, id) => {
    prevChanged(x, y, z, old, id);
    if (SHAPED[old] && !SHAPED[id]) { const k = k3(x, y, z); setTimeout(() => { if (!SHAPED[w.getBlock(x, y, z)]) { sim.containers.delete(k); if (auth()) sim.touch(k); } }, 300); }
  };
  // en línea: si cambia la información de una forma, se vuelve a dibujar
  const prevRemote = g.onRemoteContainer;
  g.onRemoteContainer = (k) => { prevRemote?.(k); const c = sim.containers.get(k); if (c?.type === 'shape' || c?.type === 'decor') { const [x, , z] = k.split(',').map(Number); w.touchAt(x, z); } };

  const rotFromYaw = () => { const a = ((Math.round(p.yaw / (Math.PI / 2)) % 4) + 4) % 4; return [0, 3, 2, 1][a]; };
  function setShape(x, y, z, id, data) {
    const k = k3(x, y, z);
    sim.containers.set(k, data); save(k);
    if (w.getBlock(x, y, z) === id) w.touchAt(x, z); else w.setBlock(x, y, z, id);
  }

  // ---------- sierra: cubo → losa → losa de arriba → escalón → panel → alfombra → cubo ----------
  function saw(t) {
    if (!p.canEdit(t.x, t.z)) return;
    const b = t.id, c = sim.containers.get(k3(t.x, t.y, t.z));
    const ok = (id) => BLOCKS[id] && RENDER[id] === 1 && OPAQUE[id] && !BLOCKS[id].container && !BLOCKS[id].station && !BLOCKS[id].marker && !BLOCKS[id].loot && !BLOCKS[id].elec && !LIQ[id];
    let next;
    if (!SHAPED[b]) { if (!ok(b)) { flash('La sierra trabaja sobre bloques comunes (piedra, madera, ladrillo…)'); return; } next = [128, { type: 'shape', mat: b, rot: 0 }]; }
    else if (SHAPED[b] === 'decor') { const r = ((c?.rot || 0) + 1) % 4; setShape(t.x, t.y, t.z, 255, { ...c, rot: r }); flash('↻ Girado'); return; }
    else {
      const mat = c?.mat ?? 2, rot = c?.rot || 0;
      if (b === 128 && rot === 0) next = [128, { type: 'shape', mat, rot: 1 }];
      else if (b === 128) next = [129, { type: 'shape', mat, rot: rotFromYaw() }];
      else if (b === 129) next = [254, { type: 'shape', mat, rot: Math.abs(Math.sin(p.yaw)) > 0.7 ? 1 : 0 }];
      else if (b === 254 && rot < 2) next = [254, { type: 'shape', mat, rot: 2 }];
      else { sim.containers.delete(k3(t.x, t.y, t.z)); save(k3(t.x, t.y, t.z)); w.setBlock(t.x, t.y, t.z, mat); flash('▣ Cubo entero'); sfx.place?.(mat); return; }
    }
    setShape(t.x, t.y, t.z, next[0], next[1]);
    const names = { 128: next[1].rot ? 'Losa de arriba' : 'Losa', 129: 'Escalón', 254: next[1].rot === 2 ? 'Alfombra' : 'Panel' };
    flash(`🪚 ${names[next[0]]} de ${BLOCKS[next[1].mat].name.toLowerCase()} (seguí tocando para cambiar)`);
    sfx.place?.(next[1].mat); particles.burst(t.x, t.y + 0.5, t.z, [200, 180, 140], 6, 0.4);
    if (!p.creative && inv.damageHand()) sfx.toolBreak();
    p.onEvent('v10', 'sierra');
  }

  // ---------- decoración ----------
  function placeDecor(t, it) {
    if (!t || t.face[1] !== 1) { flash('Apoyá la decoración arriba de un bloque'); return; }
    const x = t.x, y = t.y + 1, z = t.z;
    if (w.getBlock(x, y, z) !== 0 || !p.canEdit(x, z)) return;
    setShape(x, y, z, 255, { type: 'decor', kind: it.decor, rot: rotFromYaw() });
    if (!p.creative) inv.consumeHand();
    sfx.place?.(23); p.onEvent('place', 255);
  }

  api.onUseItem = (hand, it, t) => {
    if (it.saw) { p.useCd = 0.3; p.mouse.right = false; if (t) saw(t); return true; }
    if (it.decor != null) { p.useCd = 0.3; p.mouse.right = false; placeDecor(t, it); return true; }
    return false;
  };

  // ---------- herramientas de obra (en el Plano de obra, con una selección hecha con la cinta) ----------
  let undo = null;
  const sel = () => { const s = g.features2?.sel; if (!s?.a || !s?.b) return null; const [a, b] = [s.a, s.b]; return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), z0: Math.min(a[2], b[2]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]), z1: Math.max(a[2], b[2]) }; };
  function areaOp(fn, label) {
    const S = sel(); if (!S) return;
    const vol = (S.x1 - S.x0 + 1) * (S.y1 - S.y0 + 1) * (S.z1 - S.z0 + 1);
    if (vol > 8192) { flash('Selección muy grande (máximo 8192 bloques)'); return; }
    const changes = [];
    for (let y = S.y0; y <= S.y1; y++) for (let z = S.z0; z <= S.z1; z++) for (let x = S.x0; x <= S.x1; x++) {
      if (!sim.canEdit(x, z, p.name, p.team)) continue;
      const cur = w.getBlock(x, y, z), nb = fn(cur);
      if (nb == null || nb === cur) continue;
      if (!p.creative && nb > 0) { if (inv.count(nb) < 1) continue; inv.remove(nb, 1); }
      if (!p.creative && cur > 0 && nb === 0 && BLOCKS[cur]?.drop) p.give(BLOCKS[cur].drop, 1);
      changes.push([x, y, z, cur]); w.setBlock(x, y, z, nb);
    }
    undo = { changes, label };
    sfx.craft?.(); flash(`🏗 ${label}: ${changes.length} bloques (podés deshacerlo en el Plano de obra)`);
  }
  function doUndo() {
    if (!undo) { flash('No hay nada para deshacer'); return; }
    for (const [x, y, z, old] of undo.changes.reverse()) {
      const cur = w.getBlock(x, y, z);
      if (!p.creative && cur > 0 && cur !== old) p.give(cur, 1);
      if (!p.creative && old > 0) { if (inv.count(old) < 1) continue; inv.remove(old, 1); }
      w.setBlock(x, y, z, old);
    }
    flash(`↩ Deshecho: ${undo.label}`); undo = null; sfx.click?.();
  }
  api.recordUndo = (changes, label) => { undo = { changes, label }; };
  ctx.ext.build = (list, t) => {
    const S = sel();
    const hand = inv.hand, hb = hand && hand.id < 256 ? hand.id : 0;
    const box = document.createElement('div'); box.className = 'quest';
    box.innerHTML = '<p><b>🏗 Herramientas de obra</b></p>';
    const btn = (txt, fn, dis) => { const b = document.createElement('button'); b.textContent = txt; b.disabled = !!dis; b.style.margin = '2px'; b.onclick = () => { fn(); ctx.closeInventory(); }; box.appendChild(b); };
    if (S) {
      btn(`🧱 Rellenar con ${hb ? BLOCKS[hb].name.toLowerCase() : '(tené un bloque en la mano)'}`, () => areaOp(() => hb, 'Relleno'), !hb);
      btn('🕳 Vaciar', () => areaOp((c) => (c > 0 && !LIQ[c] ? 0 : null), 'Vaciado'));
      const target = t ? w.getBlock(t.x, t.y, t.z) : 0;
      btn(`🔁 Reemplazar ${target > 0 ? BLOCKS[target].name.toLowerCase() : '(mirá un bloque)'} por ${hb ? BLOCKS[hb].name.toLowerCase() : '(bloque en mano)'}`, () => areaOp((c) => (c === target ? hb : null), 'Reemplazo'), !hb || !(target > 0));
    } else box.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Marcá un área con la cinta métrica para rellenar, vaciar o reemplazar.</p>');
    btn(`↩ Deshacer${undo ? ` (${undo.label})` : ''}`, doUndo, !undo);
    list.appendChild(box);
  };
  api.dispose = () => { setShapeHook(null); w.shapeInfo = null; p.dropFor = null; sim.blockChanged = prevChanged; g.onRemoteContainer = prevRemote; delete ctx.ext.build; };
  return api;
}
