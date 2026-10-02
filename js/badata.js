// Datos reales del centro porteño (OpenStreetMap, convertidos con tools/osm/build.mjs).
// Se cargan una sola vez, en el juego, en los workers y en el servidor dedicado.
let P = null, DATA = null;
export const getBA = () => DATA;

function unpack(meta, bin) {
  const N = meta.w * meta.h;
  const d = { ...meta, cls: bin.subarray(0, N), hgt: bin.subarray(N, 2 * N), mat: bin.subarray(2 * N, 3 * N), bid: bin.subarray(3 * N, 4 * N) };
  // grillas para buscar rápido árboles y faroles cerca de una columna
  const grid = (list) => { const g = new Map(); for (const it of list) { const k = Math.floor(it[0] / 8) + ',' + Math.floor(it[1] / 8); if (!g.has(k)) g.set(k, []); g.get(k).push(it); } return g; };
  d.treeGrid = grid(meta.trees || []); d.lampGrid = grid(meta.lamps || []);
  DATA = d;
}

export function loadBA() {
  if (P) return P;
  P = (async () => {
    const base = new URL('../data/', import.meta.url);
    let meta, bin;
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      const fs = await import('node:fs/promises'), zlib = await import('node:zlib');
      meta = JSON.parse(await fs.readFile(new URL('ba_centro.json', base), 'utf8'));
      bin = new Uint8Array(zlib.inflateRawSync(await fs.readFile(new URL('ba_centro.bin', base))));
    } else {
      meta = await (await fetch(new URL('ba_centro.json', base))).json();
      const r = await fetch(new URL('ba_centro.bin', base));
      bin = new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    }
    unpack(meta, bin);
    return DATA;
  })();
  P.catch(() => { P = null; });
  return P;
}
