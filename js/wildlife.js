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
  let told = false, helpAcc = 0, dogCd = 0, goatCd = 0;
  const dirs = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'];
  const dirTo = (x, z) => dirs[((Math.round(Math.atan2(z - p.pos.z, x - p.pos.x) / (Math.PI / 4)) % 8) + 8) % 8];
  // el perro olfatea tesoros; la cabra avisa si se acerca algo peligroso
  function helpers() {
    let dog = null, goat = null;
    for (const m of g.mobs.list.values()) {
      if (m.dying || m.pos.distanceTo(p.pos) > 20) continue;
      if (m.type === 'dog' && m.owner === p.name) dog = m;
      else if (m.type === 'goat' && m.tamed && !m.caravan) goat = m;
    }
    if (dog && dogCd <= 0) {
      const t = (g.meta.treasures || []).map((q) => ({ q, d: Math.hypot(q.x - p.pos.x, q.z - p.pos.z) })).sort((a, b) => a.d - b.d)[0];
      if (t && t.d < 70) { dogCd = 25; flash(`🐕 ${dog.petName || 'Tu perro'} olfatea algo: hay un tesoro a ${Math.round(t.d)} bloques hacia el ${dirTo(t.q.x, t.q.z)}`); sfx.bark?.(); particles.burst(dog.pos.x - 0.5, dog.pos.y + 0.9, dog.pos.z - 0.5, [255, 220, 120], 6, 0.3); }
      else {
        // cofres enterrados cerca
        const w = g.world, x0 = Math.floor(dog.pos.x), y0 = Math.floor(dog.pos.y), z0 = Math.floor(dog.pos.z);
        outer: for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) for (let dy = -6; dy <= 1; dy++) {
          const b = w.getBlock(x0 + dx, y0 + dy, z0 + dz);
          if ((b === 228 || b === 1144 || b === 226) && w.getBlock(x0 + dx, y0 + dy + 1, z0 + dz) !== 0) { dogCd = 40; flash(`🐕 ${dog.petName || 'Tu perro'} escarba el piso: hay algo enterrado acá cerca (hacia el ${dirTo(x0 + dx, z0 + dz)})`); break outer; }
        }
        if (dogCd <= 0) dogCd = 12;
      }
    }
    if (goat && goatCd <= 0) {
      for (const m of g.mobs.list.values()) if (m.def.hostile && !m.dying && !m.owner && m.pos.distanceTo(p.pos) < 16 && m.pos.distanceTo(p.pos) > 5) { goatCd = 35; flash('🐐 Tu cabra se pone nerviosa: algo peligroso se acerca'); sfx.click?.(); break; }
    }
  }
  api.update = (dt) => {
    if (!told && p.riding?.type === 'balloon' && !p.onGround) { told = true; p.onEvent('v12', 'globo'); g.album?.snap('🎈 Primer vuelo en globo'); }
    dogCd -= dt; goatCd -= dt; helpAcc += dt;
    if (helpAcc > 3) { helpAcc = 0; helpers(); }
  };
  api.dispose = () => {};
  return api;
}
