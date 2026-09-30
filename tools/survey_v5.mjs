import { WorldGen, BIOME_NAMES, BIOME } from '../js/worldgen.js';
const g = new WorldGen(12345, 'normal');
const bc = {};
for (let i = 0; i < 6000; i++) { const c = g.column((Math.random() - 0.5) * 12000, (Math.random() - 0.5) * 12000); bc[BIOME_NAMES[c.biome]] = (bc[BIOME_NAMES[c.biome]] || 0) + 1; }
console.log(JSON.stringify(bc));
// semillas con autódromo cerca del inicio
const found = [];
for (let seed = 1; seed < 400 && found.length < 4; seed++) {
  const w = new WorldGen(seed, 'normal'); const sp = w.findSpawn();
  let best = null;
  for (let gx = -2; gx <= 2; gx++) for (let gz = -2; gz <= 2; gz++) { const c = w.circuitAt(Math.floor(sp.x / 640) + gx, Math.floor(sp.z / 640) + gz); if (c) { const d = Math.hypot(c.x - sp.x, c.z - sp.z); if (!best || d < best.d) best = { d, c }; } }
  if (best && best.d < 2000) found.push({ seed, d: Math.round(best.d), a: best.c.a, R: best.c.R });
}
console.log('autódromos cerca del inicio:', JSON.stringify(found));
// estructuras en un chunk de autódromo
const s = found[0] || { seed: 7 };
const w = new WorldGen(s.seed, 'normal'); const sp = w.findSpawn();
let circ = null; for (let gx = -2; gx <= 2 && !circ; gx++) for (let gz = -2; gz <= 2 && !circ; gz++) { const c = w.circuitAt(Math.floor(sp.x / 640) + gx, Math.floor(sp.z / 640) + gz); if (c) circ = c; }
const counts = {}; let t = performance.now();
for (let cx = Math.floor((circ.x - circ.bx) / 16); cx <= Math.floor((circ.x + circ.bx) / 16); cx++) for (let cz = Math.floor((circ.z - circ.bz) / 16); cz <= Math.floor((circ.z + circ.bz) / 16); cz++) { const d = w.generate(cx, cz); for (const v of d) counts[v] = (counts[v] || 0) + 1; }
console.log('circuito: ms', (performance.now() - t).toFixed(0), 'pista', counts[150], 'largada', counts[151], 'semáforo', counts[152], 'autos', counts[154], 'motos', counts[155], 'camiones', counts[156], 'instructor', counts[157], 'tribunas', counts[177]);
// asentamiento y laboratorio
let st = null, lab = null;
for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) { st = st || w.settlementAt(gx, gz); lab = lab || w.labAt(gx, gz); }
const cnt = (x, z, r, ids) => { const c = {}; for (let cx = Math.floor((x - r) / 16); cx <= Math.floor((x + r) / 16); cx++) for (let cz = Math.floor((z - r) / 16); cz <= Math.floor((z + r) / 16); cz++) for (const v of w.generate(cx, cz)) if (ids.includes(v)) c[v] = (c[v] || 0) + 1; return c; };
console.log('asentamiento', JSON.stringify(st), JSON.stringify(cnt(st.x, st.z, 16, [158, 108, 32])));
console.log('laboratorio', JSON.stringify(lab), JSON.stringify(cnt(lab.x, lab.z, 16, [159, 178, 82, 160, 63])));
