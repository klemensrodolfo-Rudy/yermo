// Busca semillas con arranques interesantes para el combo del menú.
import { WorldGen, BIOME } from '../js/worldgen.js';
const out = [];
for (let seed = 1; seed <= 600; seed++) {
  for (const type of ['normal', 'brew']) {
    const g = new WorldGen(seed, type);
    const sp = g.findSpawn();
    const near = {}; let minD = {};
    for (let dx = -160; dx <= 160; dx += 8) for (let dz = -160; dz <= 160; dz += 8) {
      const d = Math.hypot(dx, dz); if (d > 160) continue;
      const b = g.column(Math.floor(sp.x + dx), Math.floor(sp.z + dz)).biome;
      near[b] = (near[b] || 0) + 1;
      minD[b] = Math.min(minD[b] ?? 1e9, d);
    }
    let brewery = 1e9;
    for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) {
      const b = g.breweryAt(Math.floor(sp.x / 90) + gx, Math.floor(sp.z / 90) + gz);
      if (b) brewery = Math.min(brewery, Math.hypot(b.x - sp.x, b.z - sp.z));
    }
    out.push({ seed, type, near, minD, distinct: Object.keys(near).length, brewery, spawnBiome: g.column(Math.floor(sp.x), Math.floor(sp.z)).biome });
  }
}
const N = (o, b) => o.near[b] || 0, D = (o, b) => o.minD[b] ?? 1e9;
const pick = (list, score) => list.sort((a, b) => score(b) - score(a))[0];
const norm = out.filter((o) => o.type === 'normal'), brew = out.filter((o) => o.type === 'brew');
const res = {
  refugio: pick(norm.filter((o) => D(o, BIOME.CITY) > 60 && D(o, BIOME.CITY) < 130 && D(o, BIOME.CRATER) > 140), (o) => N(o, BIOME.FOREST)),
  zonacero: pick(norm.filter((o) => D(o, BIOME.CRATER) < 70), (o) => N(o, BIOME.CRATER)),
  metropolis: pick(norm.filter((o) => D(o, BIOME.CITY) < 40), (o) => N(o, BIOME.CITY)),
  ceniza: pick(norm.filter((o) => D(o, BIOME.DESERT) < 50), (o) => N(o, BIOME.DESERT)),
  pantano: pick(norm.filter((o) => D(o, BIOME.SWAMP) < 50), (o) => N(o, BIOME.SWAMP)),
  todo: pick(norm.filter((o) => o.distinct >= 6), (o) => -Math.max(...Object.values(o.minD))),
  valle: pick(norm.filter((o) => D(o, BIOME.BREW) < 80 && o.brewery < 200), (o) => -o.brewery),
  cerveceria: pick(brew.filter((o) => o.brewery < 30), (o) => N(o, BIOME.BREW)),
  lupulo: pick(brew.filter((o) => o.brewery < 60 && D(o, BIOME.CITY) < 110), (o) => N(o, BIOME.BREW)),
};
for (const [k, o] of Object.entries(res)) console.log(k, o && JSON.stringify({ seed: o.seed, type: o.type, near: o.near, brewery: Math.round(o.brewery), minD: Object.fromEntries(Object.entries(o.minD).map(([b, d]) => [b, Math.round(d)])) }));
