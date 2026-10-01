// Mares v9.3: pesca con caña (hay que reaccionar cuando pica) y premios del mar.
import * as THREE from 'three';
import { SOLID, isWater } from './blocks.js';
import { BIOME } from './worldgen.js';

export function createSea(ctx) {
  const { game: g, sfx, flash, scene, camera, particles } = ctx;
  const p = g.player, inv = g.inv, w = g.world;
  const api = {};
  let bob = null;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe8e8e8, transparent: true, opacity: 0.7 });

  function removeBob() {
    if (!bob) return;
    scene.remove(bob.mesh); scene.remove(bob.line); bob.line.geometry.dispose();
    bob = null;
  }
  function cast(dir) {
    const o = camera.position.clone(), q = new THREE.Vector3();
    for (let d = 1; d < 18; d += 0.3) {
      q.copy(o).addScaledVector(dir, d);
      const x = Math.floor(q.x), y = Math.floor(q.y), z = Math.floor(q.z), b = w.getBlock(x, y, z);
      if (isWater(b)) {
        let top = y; while (isWater(w.getBlock(x, top + 1, z))) top++;
        const mesh = new THREE.Group();
        const M = (c) => new THREE.MeshBasicMaterial({ color: c });
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), M(0xd83a3a)); a.position.y = 0.02;
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), M(0xf0f0f0)); c.position.y = 0.11;
        mesh.add(a, c); mesh.position.set(q.x, top + 0.92, q.z); scene.add(mesh);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([o, mesh.position]), lineMat); line.frustumCulled = false; scene.add(line);
        const ocean = g.gen.column(x, z).biome === BIOME.OCEAN;
        // los peces se agotan si pescás mucho en el mismo lugar (y vuelven con el tiempo)
        const spot = Math.floor(x / 24) + ',' + Math.floor(z / 24), F = (g.meta.fished = g.meta.fished || {}), now = g.meta.clock || 0;
        const left = F[spot] ? Math.max(0, F[spot].n - (now - F[spot].t) / 240) : 0;
        if (left > 6) flash('🐟 Acá ya casi no pican: probá en otro lado o volvé más tarde');
        bob = { mesh, line, x, z, spot, wait: ((ocean ? 2.5 : 4) + Math.random() * (ocean ? 5 : 8) * (g.weather?.rainK > 0.3 ? 0.6 : 1)) * (1 + left * 0.45), biting: false, biteT: 0, ocean, y0: top + 0.92 };
        particles.burst(q.x - 0.5, top + 0.6, q.z - 0.5, [200, 220, 255], 6, 0.3);
        sfx.click();
        return true;
      }
      if (b === -1 || SOLID[b]) break;
    }
    flash('Tirá la línea al agua (apuntá al agua, hasta 16 bloques)');
    return false;
  }
  function reel() {
    const r = Math.random(), sea = bob.ocean;
    let id = 399, n = 1;
    if (r < (sea ? 0.03 : 0.015)) { id = 397; }
    else if (r < (sea ? 0.08 : 0.04)) { id = 353; n = 3 + Math.floor(Math.random() * 6); }
    else if (r < (sea ? 0.1 : 0.05)) { id = 401; }
    else if (r < (sea ? 0.2 : 0.12)) { id = 404; }
    p.give(id, n);
    { const F = (g.meta.fished = g.meta.fished || {}), now = g.meta.clock || 0, f = F[bob.spot];
      const left = f ? Math.max(0, f.n - (now - f.t) / 240) : 0; F[bob.spot] = { n: left + 1, t: now };
      const keys = Object.keys(F); if (keys.length > 200) delete F[keys[0]]; }
    particles.burst(bob.mesh.position.x - 0.5, bob.mesh.position.y - 0.3, bob.mesh.position.z - 0.5, [200, 220, 255], 14, 0.6);
    sfx.pickup?.(); sfx.craft?.();
    flash(id === 399 ? '🎣 ¡Sacaste un pescado!' : id === 404 ? '🐟 ¡Un pez dorado!' : id === 353 ? `💰 ¡Sacaste ${n} fichas del agua!` : id === 397 ? '🎁 ¡Pescaste un regalo!' : '🤿 ¡Un tanque de buceo!');
    if (!p.creative && inv.damageHand()) sfx.toolBreak();
    p.onEvent('fish', id);
    if (id === 404) p.onEvent('v9', 'pezdorado');
  }
  api.onUseItem = (hand, it, t, dir) => {
    if (!it.rod) return false;
    p.useCd = 0.35; p.mouse.right = false;
    if (bob) { if (bob.biting) reel(); else sfx.click(); removeBob(); return true; }
    cast(dir);
    return true;
  };
  api.update = (dt) => {
    if (!bob) return;
    if (inv.hand?.id !== 398 || p.pos.distanceTo(bob.mesh.position) > 24 || p.dead) { removeBob(); return; }
    // la línea sale de la mano
    const hand = camera.position.clone().add(new THREE.Vector3(0.35, -0.3, -0.5).applyQuaternion(camera.quaternion));
    const pos = bob.line.geometry.attributes.position;
    pos.setXYZ(0, hand.x, hand.y, hand.z); pos.setXYZ(1, bob.mesh.position.x, bob.mesh.position.y + 0.12, bob.mesh.position.z); pos.needsUpdate = true;
    const tt = performance.now() / 1000;
    if (!bob.biting) {
      bob.mesh.position.y = bob.y0 + Math.sin(tt * 2) * 0.03;
      bob.wait -= dt;
      if (bob.wait <= 0) { bob.biting = true; bob.biteT = 1.4; flash('🎣 ¡Pica! Clic derecho ya'); sfx.click(); }
    } else {
      bob.mesh.position.y = bob.y0 - 0.18 + Math.sin(tt * 20) * 0.05;
      if (Math.random() < dt * 12) particles.burst(bob.mesh.position.x - 0.5, bob.y0 - 0.4, bob.mesh.position.z - 0.5, [210, 230, 255], 1, 0.3);
      bob.biteT -= dt;
      if (bob.biteT <= 0) { bob.biting = false; bob.wait = 3 + Math.random() * 6; flash('Se escapó… esperá que vuelva a picar'); }
    }
  };
  api.dispose = () => { removeBob(); lineMat.dispose(); };
  return api;
}
