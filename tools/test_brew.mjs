import { WorldGen, BIOME_NAMES } from '../js/worldgen.js';
for (const type of ['normal', 'brew']) {
  const g = new WorldGen(777, type);
  const bc = {};
  for (let i = 0; i < 3000; i++) { const c = g.column((Math.random() - 0.5) * 8000, (Math.random() - 0.5) * 8000); bc[BIOME_NAMES[c.biome]] = (bc[BIOME_NAMES[c.biome]] || 0) + 1; }
  const sp = g.findSpawn();
  console.log(type, JSON.stringify(bc), 'spawn', JSON.stringify(sp), BIOME_NAMES[g.column(Math.floor(sp.x), Math.floor(sp.z)).biome]);
  let t = performance.now(); const counts = {};
  for (let cx = -4; cx < 4; cx++) for (let cz = -4; cz < 4; cz++) { const d = g.generate(Math.floor(sp.x / 16) + cx, Math.floor(sp.z / 16) + cz); for (const v of d) counts[v] = (counts[v] || 0) + 1; }
  console.log(' 64 chunks ms', (performance.now() - t).toFixed(0), 'kettle', counts[80] || 0, 'ferm', counts[81] || 0, 'barley', (counts[91] || 0) + (counts[92] || 0), 'hops', (counts[95] || 0) + (counts[96] || 0), 'spring', counts[47] || 0, 'lava', counts[55] || 0, 'rail', counts[101] || 0, 'pump', counts[102] || 0, 'lattice', counts[103] || 0, 'med', counts[82] || 0);
}
