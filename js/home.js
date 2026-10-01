// Hogar v12.4: cada cama donde dormiste queda anotada y al morir elegís en cuál aparecer;
// el Marco copia el dibujo de un lienzo y lo convierte en un cuadro para colgar en la pared.
import { BLOCKS, SOLID } from './blocks.js';

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const k3 = (x, y, z) => x + ',' + y + ',' + z;

export function createHome(ctx) {
  const { game: g, flash, sfx } = ctx;
  const p = g.player, w = g.world, sim = g.sim, meta = g.meta, inv = g.inv;
  const api = {};
  const beds = () => (meta.beds = (meta.beds || []).filter((b) => b && b.owner === p.name));

  // ---------- camas: se anotan al usarlas (hasta 6) ----------
  const prevBed = p.onBed;
  p.onBed = (x, y, z) => {
    const list = beds(), k = k3(x, y, z);
    if (!list.some((b) => b.k === k)) {
      const name = BLOCKS[w.getBlock(x, y, z)]?.name || 'Cama';
      list.unshift({ k, x, y, z, owner: p.name, name: `${name} · ${Math.round(x)}, ${Math.round(z)}` });
      meta.beds = [...list.slice(0, 6), ...(meta.beds || []).filter((b) => b.owner !== p.name)];
    }
    prevBed(x, y, z);
  };
  // al morir: un botón por cama que siga en pie
  api.deathOptions = () => {
    const box = document.querySelector('#bedChoice') || (() => { const d = document.createElement('div'); d.id = 'bedChoice'; d.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px'; document.querySelector('#respawn').after(d); return d; })();
    box.innerHTML = '';
    const ok = beds().filter((b) => { const id = w.getBlock(b.x, b.y, b.z); return id < 0 || BLOCKS[id]?.bed; });
    if (ok.length < 2) return;
    box.insertAdjacentHTML('beforeend', '<p class="muted" style="width:100%;margin:0">O aparecé en otra cama:</p>');
    for (const b of ok) {
      const btn = document.createElement('button'); btn.textContent = '🛏 ' + b.name;
      btn.onclick = () => { meta.spawn = { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5 }; document.querySelector('#respawn').click(); box.innerHTML = ''; };
      box.appendChild(btn);
    }
  };

  // ---------- marcos y cuadros con tu dibujo ----------
  api.onUseItem = (hand, it, t) => {
    if (it.frame) {
      p.useCd = 0.3; p.mouse.right = false;
      if (!t || t.id !== 247) { flash('Usá el marco sobre un lienzo pintado para copiar su dibujo'); return true; }
      const c = sim.containers.get(k3(t.x, t.y, t.z));
      if (!c?.px) { flash('Ese lienzo está en blanco: pintalo primero'); return true; }
      if (!p.creative) inv.consumeHand();
      p.give(438, 1, { art: c.px });
      sfx.craft?.(); flash('🖼 Copiaste el dibujo: colgalo en una pared');
      return true;
    }
    if (it.artwork) {
      p.useCd = 0.3; p.mouse.right = false;
      if (!t || t.face[1] !== 0 || !SOLID[t.id]) { flash('Colgá el cuadro en una pared'); return true; }
      const x = t.x + t.face[0], y = t.y, z = t.z + t.face[2];
      if (w.getBlock(x, y, z) !== 0 || !p.canEdit(x, z)) return true;
      const id = [1135, 1136, 1137, 1138].find((i) => BLOCKS[i].wall2[0] === t.face[0] && BLOCKS[i].wall2[1] === t.face[2]);
      const k = k3(x, y, z), c = { type: 'canvas', px: hand.art || '1'.repeat(256), face: [t.face[0], t.face[2]], framed: true };
      w.setBlock(x, y, z, id);
      sim.containers.set(k, c); if (ctx.isAuthority()) sim.touch(k); else ctx.net.sendContainer(k, c);
      if (!p.creative) inv.consumeHand();
      sfx.place?.(23);
      return true;
    }
    return false;
  };
  // al romper un cuadro enmarcado, vuelve el cuadro con su dibujo
  const lastArt = new Map();
  const prevChanged = sim.blockChanged.bind(sim);
  sim.blockChanged = (x, y, z, old, id) => {
    if (old >= 1135 && old <= 1138) { const c = sim.containers.get(k3(x, y, z)); if (c?.px) lastArt.set(k3(x, y, z), c.px); }
    prevChanged(x, y, z, old, id);
  };
  const prevDrop = p.dropFor;
  p.dropFor = (x, y, z, id) => {
    if (id >= 1135 && id <= 1138) { const px = lastArt.get(k3(x, y, z)); lastArt.delete(k3(x, y, z)); if (px) p.give(438, 1, { art: px }); return null; }
    return prevDrop?.(x, y, z, id) ?? null;
  };
  api.onUseBlock = (t) => {
    if (t.id < 1135 || t.id > 1138) return false;
    flash('🖼 Tu cuadro. Rompelo para llevártelo con el dibujo.');
    return true;
  };
  api.update = () => {};
  api.dispose = () => { p.onBed = prevBed; p.dropFor = prevDrop; sim.blockChanged = prevChanged; document.querySelector('#bedChoice')?.remove(); };
  return api;
}
