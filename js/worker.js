import { WorldGen } from './worldgen.js';
import { buildMesh } from './mesher.js';
import { BIOME_TINT } from './blocks.js';

let gen = null;

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') { gen = new WorldGen(m.seed, m.worldType); return; }
  if (m.type === 'gen') {
    const data = gen.generate(m.cx, m.cz);
    self.postMessage({ type: 'gen', job: m.job, cx: m.cx, cz: m.cz, data }, [data.buffer]);
  } else if (m.type === 'mesh') {
    // tinte del pasto según el bioma: grilla cada 4 bloques, interpolada
    let tintAt = null;
    if (gen) {
      const x0 = m.cx * 16 - 4, z0 = m.cz * 16 - 4, G = 7;
      const grid = new Float32Array(G * G * 3);
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const c = BIOME_TINT[gen.column(x0 + i * 4, z0 + j * 4).biome] || BIOME_TINT[0];
        grid.set(c, (i + j * G) * 3);
      }
      tintAt = (lx, lz) => {
        const fx = Math.min(G - 1.001, Math.max(0, (lx + 4) / 4)), fz = Math.min(G - 1.001, Math.max(0, (lz + 4) / 4));
        const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j;
        const at = (ii, jj, k) => grid[(ii + jj * G) * 3 + k];
        return [0, 1, 2].map((k) => Math.round((at(i, j, k) * (1 - a) + at(i + 1, j, k) * a) * (1 - b) + (at(i, j + 1, k) * (1 - a) + at(i + 1, j + 1, k) * a) * b));
      };
    }
    const r = buildMesh(m.vol, tintAt);
    const t = [];
    for (const part of [r.solid, r.water]) for (const k of ['pos', 'uv', 'lit', 'inf', 'tint', 'idx']) t.push(part[k].buffer);
    self.postMessage({ type: 'mesh', job: m.job, cx: m.cx, cz: m.cz, version: m.version, mesh: r }, t);
  }
};
