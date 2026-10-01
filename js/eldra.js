// Reinos de Eldra: magia (maná, báculos, anillos, pociones), telarañas, aldeas, magos y el dragón.
// Sin historia principal: es un mundo para explorar a tu ritmo.
import * as THREE from 'three';
import { ITEMS, SOLID, itemName } from './blocks.js';
import { BIOME } from './worldgen.js';

const MAX_MANA = 20;
const k3 = (x, y, z) => x + ',' + y + ',' + z;

// intercambios de cada pueblo (precio en fichas de oro = 353)
const OFFERS = {
  halfling: [
    { give: [[353, 3]], get: [385, 4] }, { give: [[353, 4]], get: [378, 1] }, { give: [[282, 6]], get: [353, 3] },
    { give: [[271, 4]], get: [353, 2] }, { give: [[353, 6]], get: [212, 16] }, { give: [[380, 4]], get: [353, 3] },
  ],
  dwarf: [
    { give: [[353, 10]], get: [381, 1] }, { give: [[384, 2]], get: [353, 14] }, { give: [[353, 40]], get: [390, 1] },
    { give: [[353, 30]], get: [389, 1] }, { give: [[257, 8]], get: [353, 2] }, { give: [[353, 4]], get: [210, 32] },
  ],
  elf: [
    { give: [[353, 30]], get: [382, 1] }, { give: [[353, 8]], get: [379, 2] }, { give: [[387, 3]], get: [353, 6] },
    { give: [[353, 12]], get: [209, 32] }, { give: [[353, 6]], get: [380, 4] }, { give: [[353, 20]], get: [376, 1] },
  ],
  mage: [
    { give: [[353, 15]], get: [386, 1], note: 'enseña la magia (báculos y anillos)' }, { give: [[387, 4]], get: [379, 3] },
    { give: [[353, 25]], get: [370, 1] }, { give: [[388, 2]], get: [353, 30] }, { give: [[353, 18]], get: [220, 1] }, { give: [[353, 22]], get: [219, 1] },
  ],
};
const TALK = {
  halfling: ['¿Ya desayunaste? ¿Y el segundo desayuno?', 'De noche los orcos bajan de los montes: prendé antorchas.', 'Las manzanas de los robles son las mejores del valle.'],
  dwarf: ['En la mina de Hierroalto todavía queda mithril para quien sepa picar.', 'Un buen pico de mithril rompe cualquier cosa.', 'Los trolls se vuelven piedra con el sol, ¡no te olvides!'],
  elf: ['Los árboles de plata dan luz de noche.', 'En la Ciénaga Sombría las arañas tejen sus redes. Andá con fuego.', 'El cristal arcano es la sangre de la magia.'],
  mage: ['El maná vuelve solo, pero cerca de un altar de runas vuelve más rápido.', 'En las Tierras de Brasa duerme un dragón sobre su oro.', 'Cada báculo tiene su propio hechizo: probalos todos.'],
};
const TITLES = { halfling: 'Mediano de Valverde', dwarf: 'Enano de Hierroalto', elf: 'Elfa de Lunaria', mage: 'Mago de la torre' };

export function createEldra(ctx) {
  const { game: g, ui, sfx, flash, scene, camera, uniforms, particles } = ctx;
  const p = g.player, inv = g.inv, w = g.world, meta = g.meta, sim = g.sim;
  const magic = meta.worldType === 'magic';
  const api = {};
  p.mana = meta.mana ?? MAX_MANA;
  let shieldT = 0, regenAcc = 0, ringAcc = 0, hudAcc = 0, spawned = new Set(meta.eldraSpawned || []);

  // ---------- HUD de maná ----------
  const bar = document.createElement('div'); bar.id = 'mana';
  bar.innerHTML = '<span></span><div class="bar"><i></i></div>';
  (document.querySelector('#stats') || document.querySelector('#hud')).appendChild(bar);
  const fill = bar.querySelector('i'), label = bar.firstChild;
  const hasMagic = () => magic || [370, 371, 372, 373, 374, 379].some((id) => inv.count(id) > 0);
  function renderMana() {
    bar.hidden = !hasMagic() || p.creative;
    fill.style.width = (p.mana / MAX_MANA * 100) + '%';
    label.textContent = `✦${shieldT > 0 ? '🛡' : ''}`;
  }

  // escudo mágico: reduce el daño
  const baseDamage = p.damage.bind(p);
  p.damage = (n, cause, ...r) => baseDamage(shieldT > 0 && cause !== 'hambre' && cause !== 'ahogo' ? Math.ceil(n * 0.3) : n, cause, ...r);

  // ---------- hechizos ----------
  function spend(it) {
    if (p.creative) return true;
    if (p.mana < it.mana) { flash('No te alcanza el maná ✦ (tomá una poción de maná o esperá)'); sfx.click(); return false; }
    p.mana -= it.mana;
    if (inv.damageHand()) sfx.toolBreak();
    return true;
  }
  function beam(from, to, rgb) {
    const d = to.clone().sub(from), n = Math.ceil(d.length() / 1.2);
    for (let i = 1; i <= n; i++) { const q = from.clone().addScaledVector(d, i / n); particles.burst(q.x - 0.5, q.y - 0.5, q.z - 0.5, rgb, 1, 0.25); }
  }
  function cast(it, t, dir) {
    const o = camera.position.clone();
    switch (it.spell) {
      case 'light': {
        let x, y, z;
        if (t) { x = t.x + t.face[0]; y = t.y + t.face[1]; z = t.z + t.face[2]; }
        else { const q = o.clone().addScaledVector(dir, 4); x = Math.floor(q.x); y = Math.floor(q.y); z = Math.floor(q.z); }
        if (w.getBlock(x, y, z) !== 0 || !p.canEdit(x, z)) { flash('Ahí no entra el orbe'); return; }
        if (!spend(it)) return;
        w.setBlock(x, y, z, 221);
        particles.burst(x, y, z, [255, 250, 200], 10, 0.4); sfx.ding();
        break;
      }
      case 'fire': {
        if (!spend(it)) return;
        const hm = g.mobs.raycast(o, dir, 26);
        const hb = w.raycast(o, dir, 26);
        let end = o.clone().addScaledVector(dir, 26);
        if (hm && (!hb || hm.dist < o.distanceTo(new THREE.Vector3(hb.x + 0.5, hb.y + 0.5, hb.z + 0.5)))) {
          end = hm.mob.pos.clone().add(new THREE.Vector3(0, hm.mob.def.h * 0.5, 0));
          hm.mob.burnT = 5; hm.mob.burnBy = p;
          g.mobs.hit(hm.mob, 7, dir.clone(), p);
        } else if (hb) {
          end = new THREE.Vector3(hb.x + 0.5, hb.y + 0.5, hb.z + 0.5);
          const x = hb.x + hb.face[0], y = hb.y + hb.face[1], z = hb.z + hb.face[2];
          if (p.canEdit(x, z)) sim.ignite(x, y, z);
        }
        beam(o.clone().addScaledVector(dir, 1), end, [255, 120, 30]);
        particles.burst(end.x - 0.5, end.y - 0.5, end.z - 0.5, [255, 160, 40], 14, 0.6);
        sfx.flame();
        break;
      }
      case 'heal': {
        if (p.health >= 20 && !p.disease.intoxicacion) { flash('Ya estás sano'); return; }
        if (!spend(it)) return;
        p.health = Math.min(20, p.health + 8); p.disease.intoxicacion = 0; api.poisonT = 0;
        particles.burst(p.pos.x - 0.5, p.pos.y + 0.5, p.pos.z - 0.5, [120, 255, 140], 16, 0.6);
        sfx.drink(); inv.onChange();
        break;
      }
      case 'shield': {
        if (!spend(it)) return;
        shieldT = 20;
        particles.burst(p.pos.x - 0.5, p.pos.y + 0.5, p.pos.z - 0.5, [140, 200, 255], 18, 0.7);
        flash('🛡 Escudo mágico: 20 s recibiendo mucho menos daño'); sfx.ding();
        break;
      }
      case 'wind': {
        if (!spend(it)) return;
        let n = 0;
        for (const m of g.mobs.list.values()) {
          const v = m.pos.clone().sub(p.pos); const d = v.length();
          if (d > 9 || m.dying || m.owner) continue;
          if (d > 1.5 && v.clone().normalize().dot(dir) < 0.5) continue;
          v.y = 0; v.normalize();
          m.vel.x += v.x * 18; m.vel.z += v.z * 18; m.vel.y = 7; m.fleeT = 0; n++;
          if (m.def.hostile) g.mobs.hit(m, 1, null, p);
        }
        // y te impulsa hacia arriba
        p.vel.y = Math.max(p.vel.y, 9);
        for (let i = 0; i < 10; i++) { const q = o.clone().addScaledVector(dir, 1 + i * 0.8); particles.burst(q.x - 0.5, q.y - 0.5, q.z - 0.5, [220, 240, 255], 2, 0.4); }
        sfx.click();
        break;
      }
    }
    p.swing = 1; p.onEvent('spell', it.spell);
  }

  api.onUseItem = (hand, it, t, dir) => {
    if (it.spell) { p.useCd = 0.45; p.mouse.right = false; cast(it, t, dir); return true; }
    if (it.manaPot) {
      p.useCd = 0.5; p.mouse.right = false;
      if (p.mana >= MAX_MANA) { flash('Tu maná está lleno'); return true; }
      p.mana = Math.min(MAX_MANA, p.mana + it.manaPot); sfx.drink();
      if (!p.creative) inv.consumeHand();
      return true;
    }
    return false;
  };

  // ---------- pueblos de Eldra ----------
  function trade(list, offers) {
    const icon = (id) => `<img class="gi" src="${ui.icon(id).toDataURL()}">`;
    for (const o of offers) {
      const row = document.createElement('div'); row.className = 'trade';
      const ok = p.creative || o.give.every(([id, n]) => inv.count(id) >= n);
      row.innerHTML = `<div class="tgive">${o.give.map(([id, n]) => `${icon(id)} ${n} × ${itemName(id)}`).join('<br>')}</div><div class="tarrow">→</div><div class="tget">${icon(o.get[0])} ${o.get[1]} × ${itemName(o.get[0])}${o.note ? `<small>${o.note}</small>` : ''}</div>`;
      const b = document.createElement('button'); b.textContent = 'Cambiar'; b.disabled = !ok;
      b.onclick = () => {
        if (!p.creative) { if (!o.give.every(([id, n]) => inv.count(id) >= n)) return; for (const [id, n] of o.give) inv.remove(id, n); }
        p.give(o.get[0], o.get[1]); sfx.craft(); p.onEvent('trade', o.get[0]); ui.refresh();
      };
      row.appendChild(b); list.appendChild(row);
    }
  }
  api.onInteractMob = (m, hand) => {
    const t = m.type;
    if (!OFFERS[t]) return false;
    const lines = TALK[t];
    ctx.openPanel(TITLES[t], (list) => {
      list.insertAdjacentHTML('beforeend', `<p class="muted">«${lines[(m.id + Math.floor(meta.clock / 30 || 0)) % lines.length]}»</p><p class="hint">Se paga con fichas de oro (las sacás de los montones de oro, los cofres antiguos y los orcos).</p>`);
      trade(list, OFFERS[t]);
    });
    return true;
  };

  api.onMarker = (type, x, y, z) => {
    if (type !== 'dragon' && type !== 'mage' && type !== 'village') return false;
    const key = type + ':' + k3(x, y, z);
    if (spawned.has(key)) return true;
    spawned.add(key); meta.eldraSpawned = [...spawned].slice(-300);
    const add = (t, dx, dz, dy = 1) => { const m = g.mobs.add(t, x + dx + 0.5, y + dy, z + dz + 0.5); m.keep = true; m.home = m.pos.clone(); return m; };
    if (type === 'dragon') { add('dragon', 0, 0, 3); }
    else if (type === 'mage') add('mage', 1, 1);
    else {
      const b = g.gen.column(x, z).biome;
      if (b === BIOME.PEAKS) { add('dwarf', 2, 2); add('dwarf', -3, 1); }
      else { add('halfling', 1, 2); add('halfling', -2, -1); add('halfling', 3, -2); }
    }
    return true;
  };

  // ---------- monstruos ----------
  g.mobs.onPetrify = (m) => { if (m.pos.distanceTo(p.pos) < 40) flash('☀ ¡El troll se convirtió en piedra con la luz del sol!'); p.onEvent('v9', 'troll'); };
  const prevBoss = g.mobs.onBoss;
  g.mobs.onShot = ((orig) => (from, to, m) => {
    if (m?.def?.ranged?.fire) {
      beam(from, to, [255, 110, 30]); particles.burst(to.x - 0.5, to.y - 0.5, to.z - 0.5, [255, 150, 40], 10, 0.5);
      if (to.distanceTo(p.pos) < 3) g.features2.burning = 3;
      if (p.pos.distanceTo(from) < 50) sfx.flame();
      return;
    }
    orig?.(from, to, m);
  })(g.mobs.onShot);
  void prevBoss;

  // ---------- bucle ----------
  api.update = (dt) => {
    // maná: vuelve solo; más rápido cerca de un altar de runas
    regenAcc += dt;
    if (regenAcc > 0.5) {
      regenAcc = 0;
      let rate = 0.5;
      const bx = Math.floor(p.pos.x), by = Math.floor(p.pos.y), bz = Math.floor(p.pos.z);
      outer: for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) if (w.getBlock(bx + dx, by + dy, bz + dz) === 219) { rate = 2; break outer; }
      p.mana = Math.min(MAX_MANA, p.mana + rate);
      meta.mana = p.mana;
    }
    if (shieldT > 0) { shieldT -= dt; if (Math.random() < dt * 6) particles.burst(p.pos.x - 0.5 + (Math.random() - 0.5), p.pos.y + Math.random() * 1.6, p.pos.z - 0.5 + (Math.random() - 0.5), [140, 200, 255], 1, 0.3); }
    // anillos: funcionan mientras los llevás en la mochila
    ringAcc += dt;
    if (ringAcc > 0.5) {
      ringAcc = 0;
      api.rings = { speed: inv.count(375) > 0, night: inv.count(376) > 0, stealth: inv.count(377) > 0 };
      p.stealth = api.rings.stealth;
    }
    const R = api.rings || {};
    // telarañas: te frenan
    const fx = Math.floor(p.pos.x), fz = Math.floor(p.pos.z);
    const web = !p.riding && (w.getBlock(fx, Math.floor(p.pos.y + 0.2), fz) === 215 || w.getBlock(fx, Math.floor(p.pos.y + 1.2), fz) === 215);
    p.speedMul = (R.speed ? 1.25 : 1) * (web && !p.creative ? 0.22 : 1);
    if (web && !p.creative) p.vel.y = Math.max(p.vel.y, -1.2);
    // visión nocturna (sólo la imagen; la lógica del día no cambia)
    if (R.night) uniforms.daylight.value = Math.max(uniforms.daylight.value, 0.62);
    hudAcc += dt;
    if (hudAcc > 0.25) { hudAcc = 0; renderMana(); }
  };
  api.dispose = () => { bar.remove(); p.damage = baseDamage; };
  renderMana();
  return api;
}
