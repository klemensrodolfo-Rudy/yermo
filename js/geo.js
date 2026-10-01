// Géiseres v12.2: cada tanto largan un chorro de vapor y agua caliente que te lanza por el aire
// (sin daño al caer). Entre erupción y erupción echan un poco de vapor.
import * as THREE from 'three';
import { hash2 } from './noise.js';

const GEYSER = 1108;
const k3 = (x, y, z) => x + ',' + y + ',' + z;

export function createGeo(ctx) {
  const { game: g, particles, sfx } = ctx;
  const w = g.world, p = g.player;
  const api = {};
  const list = new Map(); // "x,y,z" -> {x, y, z, period, phase}

  function scan(c) {
    const d = c.data; if (!d) return;
    for (let i = 0; i < d.length; i++) {
      if (d[i] !== GEYSER) continue;
      const x = c.cx * 16 + (i & 15), z = c.cz * 16 + ((i >> 4) & 15), y = i >> 8;
      list.set(k3(x, y, z), { x, y, z, period: 22 + hash2(7, x, z) * 16, phase: hash2(9, x, z) * 40 });
    }
  }
  const prevReady = w.onChunkReady;
  w.onChunkReady = (c) => { prevReady?.(c); scan(c); };
  for (const c of w.chunks.values()) if (c.state === 'ready') scan(c);

  // nubes de vapor: manchas suaves que suben, crecen y se desvanecen
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(240,244,248,0.45)'); gr.addColorStop(1, 'rgba(240,244,248,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const N = 90, puffs = [];
  for (let i = 0; i < N; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: false })); s.visible = false; ctx.scene.add(s); puffs.push({ s, life: 0, max: 1, vy: 0, vx: 0, vz: 0, grow: 1 }); }
  let pi = 0;
  const steam = (x, y, z, vy, size, life) => {
    const P = puffs[pi = (pi + 1) % N];
    P.s.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4); P.s.scale.setScalar(size); P.s.visible = true;
    P.life = P.max = life; P.vy = vy; P.vx = (Math.random() - 0.5) * 0.8; P.vz = (Math.random() - 0.5) * 0.8; P.grow = size * 1.3;
  };
  const tickPuffs = (dt) => {
    const wind = ctx.uniforms?.wind?.value;
    for (const P of puffs) {
      if (P.life <= 0) continue;
      P.life -= dt; const k = P.life / P.max;
      if (P.life <= 0) { P.s.visible = false; continue; }
      P.vy *= 1 - dt * 0.8;
      P.s.position.x += (P.vx + (wind ? wind.x * 2 : 0)) * dt; P.s.position.y += P.vy * dt; P.s.position.z += (P.vz + (wind ? wind.y * 2 : 0)) * dt;
      P.s.scale.setScalar(P.s.scale.x + P.grow * dt);
      P.s.material.opacity = Math.min(1, (1 - k) * 8) * Math.min(1, k * 1.6) * 0.85;
    }
  };
  let t = 0, puff = 0, emit = 0;
  api.update = (dt) => {
    t += dt; puff += dt;
    const doPuff = puff > 0.9; if (doPuff) puff = 0;
    emit += dt; const doEmit = emit > 0.06; if (doEmit) emit = 0;
    tickPuffs(dt);
    for (const [k, G] of list) {
      const dx = G.x + 0.5 - p.pos.x, dz = G.z + 0.5 - p.pos.z;
      if (dx * dx + dz * dz > 80 * 80) continue;
      if (w.getBlock(G.x, G.y, G.z) !== GEYSER) { if (w.getBlock(G.x, G.y, G.z) >= 0) list.delete(k); continue; }
      const cyc = (t + G.phase) % G.period, near = dx * dx + dz * dz < 40 * 40;
      if (cyc < 4.5) {
        // erupción: columna de agua y vapor
        if (near) {
          const hgt = cyc < 0.6 ? cyc / 0.6 : 1;
          if (doEmit) { steam(G.x + 0.5, G.y + 1, G.z + 0.5, 9 + Math.random() * 5 * hgt, 1.4, 1.8 + Math.random() * 0.6); particles.burst(G.x, G.y + 1, G.z, [190, 220, 236], 4, 0.5); }
          if (cyc < dt + 0.001 && dx * dx + dz * dz < 30 * 30) sfx.steam?.(1 - Math.sqrt(dx * dx + dz * dz) / 30);
        }
        // te lanza si estás parado encima o en el chorro
        const ry = p.pos.y - (G.y + 1);
        if (Math.abs(dx) < 0.8 && Math.abs(dz) < 0.8 && ry > -0.2 && ry < 10 && !p.flying) {
          p.vel.y = Math.max(p.vel.y, 17); p.softLand = performance.now() + 6000;
          if (!G.told) { G.told = true; p.onEvent?.('v12', 'geiser'); }
        }
      } else if (near && doPuff && Math.random() < 0.6) steam(G.x + 0.5, G.y + 1, G.z + 0.5, 1.2, 0.6, 2.2);
    }
  };
  api.list = list;
  api.dispose = () => { w.onChunkReady = prevReady; list.clear(); for (const P of puffs) { ctx.scene.remove(P.s); P.s.material.dispose(); } tex.dispose(); };
  return api;
}
