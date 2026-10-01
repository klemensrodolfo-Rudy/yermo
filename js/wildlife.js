// Fauna v12.7: ordeñar las cabras domesticadas con una botella vacía (una vez cada un rato).
export function createWildlife(ctx) {
  const { game: g, flash, sfx, particles } = ctx;
  const p = g.player, inv = g.inv;
  const api = {};
  api.onInteractMob = (m, hand) => {
    if (m.type !== 'goat' || hand?.id !== 295) return false;
    if (!m.tamed) { flash('Primero domesticala: dale cebada o semillas'); return true; }
    if (m.baby) { flash('Es una cría: todavía no da leche'); return true; }
    const now = performance.now();
    if (m.milkT > now) { flash(`Todavía no tiene leche (en ${Math.ceil((m.milkT - now) / 1000)} s)`); return true; }
    m.milkT = now + 90000;
    inv.consumeHand(); p.give(439, 1);
    particles.burst(m.pos.x - 0.5, m.pos.y + 0.6, m.pos.z - 0.5, [244, 240, 230], 8, 0.3);
    sfx.drink?.(); flash('🥛 ¡Leche de cabra! Con leche se hace queso y dulce de leche en la cocina');
    p.onEvent('milk');
    return true;
  };
  api.update = () => {};
  api.dispose = () => {};
  return api;
}
