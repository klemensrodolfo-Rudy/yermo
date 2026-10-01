// Mapas del tesoro v12.8: al abrir un mapa queda marcado un lugar a 120-320 bloques; ahí hay una X
// en el piso y, dos bloques más abajo, un cofre del tesoro enterrado.
import { SEA } from './blocks.js';
import { BIOME } from './worldgen.js';

const BAD = new Set([BIOME.OCEAN, BIOME.CITY, BIOME.ABYSS, BIOME.ZOO, BIOME.CIRCUIT]);

export function createTreasure(ctx) {
  const { game: g, flash, sfx } = ctx;
  const p = g.player, w = g.world, meta = g.meta, inv = g.inv;
  const api = {};
  const list = () => (meta.treasures = meta.treasures || []);

  function pickSpot() {
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 200;
      const x = Math.round(p.pos.x + Math.cos(a) * d), z = Math.round(p.pos.z + Math.sin(a) * d);
      const c = g.gen.column(x, z);
      if (c.h > SEA + 1 && !BAD.has(c.biome)) return { x, z, biome: c.biome };
    }
    return null;
  }

  api.onUseItem = (hand, it) => {
    if (!it.tmap) return false;
    p.useCd = 0.5; p.mouse.right = false;
    if (hand.tx == null) {
      const s = pickSpot();
      if (!s) { flash('El mapa está borroso… probá en otro lugar'); return true; }
      hand.tx = s.x; hand.tz = s.z; inv.onChange();
      list().push({ x: s.x, z: s.z, placed: false });
      meta.waypoints = meta.waypoints || [];
      meta.waypoints.push({ name: '🗺 Tesoro', color: '#e8c040', x: s.x, y: g.gen.column(s.x, s.z).h + 1, z: s.z, on: true, treasure: true });
      sfx.craft?.();
    }
    const d = Math.round(Math.hypot(hand.tx - p.pos.x, hand.tz - p.pos.z));
    const dirs = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'];
    const ang = Math.atan2(hand.tz - p.pos.z, hand.tx - p.pos.x);
    const dir = dirs[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    flash(d < 6 ? '🗺 ¡Es acá! Buscá la X en el piso y cavá debajo' : `🗺 El tesoro está a ${d} bloques hacia el ${dir} (quedó marcado en el mapa)`);
    return true;
  };

  // cuando te acercás, aparece la X y el cofre enterrado
  let acc = 0;
  api.update = (dt) => {
    acc += dt; if (acc < 1) return; acc = 0;
    if (!ctx.isAuthority()) return;
    for (const t of list()) {
      if (t.placed || Math.hypot(t.x - p.pos.x, t.z - p.pos.z) > 40) continue;
      const y = g.mobs.surfaceY(t.x, t.z);
      if (y == null) continue;
      w.setBlock(t.x, y - 1, t.z, 1143);
      w.setBlock(t.x, y - 3, t.z, 228);
      w.setBlock(t.x, y - 2, t.z, 4);
      t.placed = true; t.y = y - 3;
      flash('🗺 ¡Estás cerca del tesoro! Buscá una X roja en el piso');
    }
  };
  // abrir el cofre: se borra la marca del mapa
  api.event = (n) => {
    if (n !== 'loot') return;
    const t = list().find((q) => q.placed && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 6);
    if (!t) return;
    meta.treasures = list().filter((q) => q !== t);
    meta.waypoints = (meta.waypoints || []).filter((wp) => !(wp.treasure && wp.x === t.x && wp.z === t.z));
    for (let i = 0; i < inv.slots.length; i++) { const s = inv.slots[i]; if (s?.id === 442 && s.tx === t.x && s.tz === t.z) inv.slots[i] = null; }
    inv.onChange();
    sfx.achievement?.(); flash('💰 ¡Encontraste el tesoro!'); p.onEvent('v12', 'tesoro');
  };
  api.dispose = () => {};
  return api;
}
