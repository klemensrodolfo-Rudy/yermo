// Datos reales de los mundos hechos con mapas (OpenStreetMap y Overture, convertidos con tools/osm/build.mjs):
// el centro porteño y Hurlingham. Se cargan una sola vez, en el juego, en los workers y en el servidor dedicado.
export const REAL = { baires: 'ba_centro', hurlingham: 'hurlingham' };
export const isReal = (type) => !!REAL[type];
const P = {};
let DATA = null;
export const getBA = () => DATA;

function unpack(meta, bin) {
  const N = meta.w * meta.h;
  const d = { ...meta, cls: bin.subarray(0, N), hgt: bin.subarray(N, 2 * N), mat: bin.subarray(2 * N, 3 * N), bid: bin.subarray(3 * N, 4 * N), rf: meta.layers === 5 ? bin.subarray(4 * N, 5 * N) : null };
  // grillas para buscar rápido árboles y faroles cerca de una columna
  const grid = (list) => { const g = new Map(); for (const it of list) { const k = Math.floor(it[0] / 8) + ',' + Math.floor(it[1] / 8); if (!g.has(k)) g.set(k, []); g.get(k).push(it); } return g; };
  d.treeGrid = grid(meta.trees || []); d.lampGrid = grid(meta.lamps || []);
  d.region = meta.region || 'ba';
  return d;
}

export function loadBA(type = 'baires') {
  const file = REAL[type] || 'ba_centro';
  if (P[file]) return P[file].then((d) => (DATA = d));
  P[file] = (async () => {
    const base = new URL('../data/', import.meta.url);
    let meta, bin;
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      const fs = await import('node:fs/promises'), zlib = await import('node:zlib');
      meta = JSON.parse(await fs.readFile(new URL(file + '.json', base), 'utf8'));
      bin = new Uint8Array(zlib.inflateRawSync(await fs.readFile(new URL(file + '.bin', base))));
      try { meta.nameGrid = new Uint16Array(new Uint8Array(zlib.inflateRawSync(await fs.readFile(new URL(file + '.calles.bin', base)))).buffer); } catch { /* sin nombres */ }
    } else {
      meta = await (await fetch(new URL(file + '.json', base))).json();
      const r = await fetch(new URL(file + '.bin', base));
      bin = new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      // los nombres de las calles sólo hacen falta en el juego (no en los workers)
      if (typeof window !== 'undefined') try { const rn = await fetch(new URL(file + '.calles.bin', base)); if (rn.ok) meta.nameGrid = new Uint16Array(await new Response(rn.body.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); } catch { /* sin nombres */ }
    }
    return unpack(meta, bin);
  })();
  P[file].catch(() => { delete P[file]; });
  return P[file].then((d) => (DATA = d));
}
