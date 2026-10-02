// Descarga una zona desde la API principal de OpenStreetMap en pedazos de ~500 m
// y la guarda con el mismo formato que Overpass («out geom»), para tools/osm/build.mjs.
// Uso: node tools/osm/dl_api.mjs [ba|hurlingham]
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGIONS } from './regions.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || 'ba', R = REGIONS[name];
const DIR = R.dir ? join(HERE, R.dir) : HERE;
const RAW = join(DIR, 'api'); mkdirSync(RAW, { recursive: true });
let S = -34.6183, N = -34.5891, W = -58.4010, E = -58.3622;
if (R.rect) {
  // las cuatro esquinas del rectángulo girado, de vuelta a latitud y longitud (con 80 m de margen)
  const [la0, lo0] = R.origin, KX = 111320 * Math.cos((la0 * Math.PI) / 180), KZ = 110574, th = (R.approxRot * Math.PI) / 180;
  const [x0, z0, x1, z1] = R.rect, m = 80, lat = [], lon = [];
  for (const [x, z] of [[x0 - m, z0 - m], [x1 + m, z0 - m], [x0 - m, z1 + m], [x1 + m, z1 + m]]) {
    const gx = x * Math.cos(th) + z * Math.sin(th), gz = -x * Math.sin(th) + z * Math.cos(th);
    lon.push(lo0 + gx / KX); lat.push(la0 - gz / KZ);
  }
  S = Math.min(...lat); N = Math.max(...lat); W = Math.min(...lon); E = Math.max(...lon);
}
const STEP = 0.005;
console.log(name, 'zona', S.toFixed(4), W.toFixed(4), N.toFixed(4), E.toFixed(4));
writeFileSync(join(DIR, 'bbox.json'), JSON.stringify({ S, W, N, E }));
const attrs = (s) => { const o = {}; for (const m of s.matchAll(/(\w+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function parse(xml) {
  const nodes = new Map(), ways = [], rels = [];
  for (const m of xml.matchAll(/<(node|way|relation)\s([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g)) {
    const [, kind, head, , body = ''] = m, a = attrs(head);
    const tags = {}; for (const t of body.matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g)) tags[unesc(t[1])] = unesc(t[2]);
    if (kind === 'node') nodes.set(a.id, { type: 'node', id: +a.id, lat: +a.lat, lon: +a.lon, tags: Object.keys(tags).length ? tags : undefined });
    else if (kind === 'way') ways.push({ id: +a.id, nds: [...body.matchAll(/<nd ref="(\d+)"\/>/g)].map((x) => x[1]), tags });
    else rels.push({ id: +a.id, members: [...body.matchAll(/<member type="(\w+)" ref="(\d+)" role="([^"]*)"\/>/g)].map((x) => ({ type: x[1], ref: x[2], role: x[3] })), tags });
  }
  return { nodes, ways, rels };
}

const els = [];
let k = 0;
for (let lat = S; lat < N - 1e-9; lat += STEP) for (let lon = W; lon < E - 1e-9; lon += STEP) {
  const f = join(RAW, `t_${lat.toFixed(4)}_${lon.toFixed(4)}.xml`);
  let xml;
  if (existsSync(f)) xml = readFileSync(f, 'utf8');
  else {
    const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${lon.toFixed(4)},${lat.toFixed(4)},${Math.min(E, lon + STEP).toFixed(4)},${Math.min(N, lat + STEP).toFixed(4)}`;
    for (let tries = 0; tries < 4; tries++) {
      const r = await fetch(url, { headers: { 'User-Agent': 'YermoGame/1.0 (personal project)' } });
      if (r.ok) { xml = await r.text(); break; }
      console.log('reintento', r.status); await new Promise((res) => setTimeout(res, 4000));
    }
    if (!xml) { console.log('FALLO', url); continue; }
    writeFileSync(f, xml);
    await new Promise((res) => setTimeout(res, 800));
  }
  const { nodes, ways, rels } = parse(xml);
  const wayGeom = new Map();
  for (const w of ways) {
    const geometry = w.nds.map((r) => nodes.get(r)).filter(Boolean).map((n) => ({ lat: n.lat, lon: n.lon }));
    wayGeom.set(String(w.id), geometry);
    els.push({ type: 'way', id: w.id, nodes: w.nds.map(Number), geometry, tags: w.tags });
  }
  for (const n of nodes.values()) if (n.tags) els.push(n);
  for (const r of rels) els.push({ type: 'relation', id: r.id, tags: r.tags, members: r.members.map((m) => ({ type: m.type, ref: +m.ref, role: m.role, geometry: m.type === 'way' ? wayGeom.get(m.ref) : undefined })) });
  console.log(++k, f.split(/[\\/]/).pop(), ways.length, 'caminos');
}
// una sola salida; build.mjs une por tipo e id (la última copia gana: los pedazos con más geometría van después)
writeFileSync(join(DIR, 'a_api.json'), JSON.stringify({ elements: els }));
console.log('elementos', els.length);
