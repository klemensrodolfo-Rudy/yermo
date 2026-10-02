// Convierte los datos de OpenStreetMap del centro porteño en una grilla de 1 m para el mundo «Buenos Aires».
// Entrada: tools/osm/*.json (Overpass, «out geom»). Salida: data/ba_centro.bin (grilla comprimida) y data/ba_centro.json.
// Uso: node tools/osm/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'data');
mkdirSync(OUT, { recursive: true });

// ---------- leer y unir ----------
const els = new Map();
for (const f of readdirSync(HERE).filter((f) => /^[bhoa]_.*\.json$/.test(f)).sort()) {
  const j = JSON.parse(readFileSync(join(HERE, f), 'utf8'));
  for (const e of j.elements) els.set(e.type + e.id, e);
}
const all = [...els.values()];
console.log('elementos', all.length);

// ---------- proyección: metros desde el Obelisco, girados para que la 9 de Julio quede a lo largo de z ----------
const obeNode = all.find((e) => e.tags && /^Obelisco( de Buenos Aires)?$/i.test(e.tags.name || '') && (e.tags.man_made || e.tags.historic || e.tags.tourism));
const ob = obeNode?.lat != null ? obeNode : obeNode?.bounds ? { lat: (obeNode.bounds.minlat + obeNode.bounds.maxlat) / 2, lon: (obeNode.bounds.minlon + obeNode.bounds.maxlon) / 2 } : { lat: -34.6037222, lon: -58.3815931 };
const LAT0 = ob.lat, LON0 = ob.lon, KX = 111320 * Math.cos((LAT0 * Math.PI) / 180), KZ = 110574;
const proj0 = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
// dirección media de la 9 de Julio
let ax = 0, az = 0;
for (const e of all) {
  if (e.type !== 'way' || !e.geometry || !/9 de Julio/i.test(e.tags?.name || '') || !/^(trunk|primary|secondary)/.test(e.tags?.highway || '')) continue;
  for (let i = 1; i < e.geometry.length; i++) {
    const [x0, z0] = proj0(e.geometry[i - 1].lat, e.geometry[i - 1].lon), [x1, z1] = proj0(e.geometry[i].lat, e.geometry[i].lon);
    let dx = x1 - x0, dz = z1 - z0; if (dz < 0) { dx = -dx; dz = -dz; }
    ax += dx; az += dz;
  }
}
const TH = Math.atan2(ax, az); // ángulo de la avenida respecto de +z
const C = Math.cos(TH), S = Math.sin(TH);
const proj = (lat, lon) => { const [x, z] = proj0(lat, lon); return [x * C - z * S, x * S + z * C]; };
console.log('Obelisco', LAT0, LON0, 'giro', ((TH * 180) / Math.PI).toFixed(2), '°');

// ---------- grilla ----------
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (const e of all) for (const g of e.geometry || (e.lat != null ? [e] : [])) { const [x, z] = proj(g.lat, g.lon); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
// recorte al cuadrado de la consulta (los elementos que la cruzan traen geometría de afuera)
const LIM = 1750;
const X0 = Math.max(Math.floor(minX), -LIM), Z0 = Math.max(Math.floor(minZ), -LIM), X1 = Math.min(Math.ceil(maxX), LIM), Z1 = Math.min(Math.ceil(maxZ), LIM);
const W = X1 - X0, H = Z1 - Z0, N = W * H;
console.log('grilla', W, 'x', H);
const cls = new Uint8Array(N), hgt = new Uint8Array(N), mat = new Uint8Array(N), bid = new Uint8Array(N);
const at = (x, z) => { const i = Math.floor(x) - X0, j = Math.floor(z) - Z0; return i >= 0 && j >= 0 && i < W && j < H ? i + j * W : -1; };
// clases de suelo
const VEREDA = 0, ASF = 1, PASTO = 2, EDIF = 3, PLAZA = 4, AGUA = 5, BLANCO = 6, AMARILLO = 7, VIAS = 8, TIERRA = 9;

const rings = (e) => {
  if (e.type === 'way' && e.geometry) return [e.geometry.map((g) => proj(g.lat, g.lon))];
  if (e.type === 'relation') return (e.members || []).filter((m) => m.geometry && (m.role === 'outer' || m.role === 'inner' || m.role === '')).map((m) => m.geometry.map((g) => proj(g.lat, g.lon)));
  return [];
};
// relleno por barrido (regla par-impar entre todos los anillos)
function fill(rs, fn) {
  let zmin = Infinity, zmax = -Infinity;
  for (const r of rs) for (const [, z] of r) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
  for (let z = Math.max(Math.floor(zmin), Z0); z <= Math.min(Math.ceil(zmax), Z1 - 1); z++) {
    const zc = z + 0.5, xs = [];
    for (const r of rs) for (let i = 0; i < r.length; i++) {
      const [x1, z1] = r[i], [x2, z2] = r[(i + 1) % r.length];
      if ((z1 <= zc && z2 > zc) || (z2 <= zc && z1 > zc)) xs.push(x1 + ((zc - z1) / (z2 - z1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(Math.ceil(xs[k] - 0.5), X0); x <= Math.min(Math.floor(xs[k + 1] - 0.5), X1 - 1); x++) fn(x, z);
  }
}
// trazo de una línea con ancho
function stroke(pts, hw, fn) {
  for (let i = 1; i < pts.length; i++) {
    const [x1, z1] = pts[i - 1], [x2, z2] = pts[i], dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1e-9;
    for (let z = Math.floor(Math.min(z1, z2) - hw); z <= Math.ceil(Math.max(z1, z2) + hw); z++) for (let x = Math.floor(Math.min(x1, x2) - hw); x <= Math.ceil(Math.max(x1, x2) + hw); x++) {
      const px = x + 0.5 - x1, pz = z + 0.5 - z1, t = Math.max(0, Math.min(1, (px * dx + pz * dz) / L2));
      if (Math.hypot(px - t * dx, pz - t * dz) <= hw) fn(x, z);
    }
  }
}
// recorrer una línea cada medio metro: (x, z, distancia acumulada, normal)
function walk(pts, fn) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x1, z1] = pts[i - 1], [x2, z2] = pts[i], L = Math.hypot(x2 - x1, z2 - z1);
    if (!L) continue;
    const ux = (x2 - x1) / L, uz = (z2 - z1) / L;
    for (let s = 0; s < L; s += 0.5) fn(x1 + ux * s, z1 + uz * s, acc + s, [-uz, ux], [ux, uz]);
    acc += L;
  }
}
const setC = (c) => (x, z) => { const i = at(x, z); if (i >= 0) cls[i] = c; };

// ---------- 1. áreas: parques, plazas peatonales, agua ----------
const areaClass = (t) => {
  if (!t) return null;
  if (t.natural === 'water' || t.waterway || t.landuse === 'basin' || t.landuse === 'reservoir') return AGUA;
  if (/^(park|garden|dog_park)$/.test(t.leisure || '') || /^(grass|village_green|meadow|recreation_ground|flowerbed)$/.test(t.landuse || '') || t.natural === 'scrub' || t.natural === 'grassland') return PASTO;
  if (t.leisure === 'playground' || t.natural === 'sand') return TIERRA;
  if (t.highway === 'pedestrian' || t.place === 'square' || /^(pedestrian|footway|platform)$/.test(t['area:highway'] || '') || t.amenity === 'marketplace') return PLAZA;
  if (t['area:highway'] || t.amenity === 'parking' || t.amenity === 'bus_station') return ASF;
  if (t.landuse === 'railway') return TIERRA;
  return null;
};
const areas = all.filter((e) => (e.type === 'way' && e.geometry && e.geometry.length > 3 && (e.tags?.area === 'yes' || e.geometry[0].lat === e.geometry.at(-1).lat)) || e.type === 'relation').map((e) => [e, areaClass(e.tags)]).filter(([, c]) => c != null);
// primero el pasto y la tierra, después las plazas y el asfalto, el agua al final
for (const order of [[ASF], [PASTO, TIERRA], [PLAZA], [AGUA]]) for (const [e, c] of areas) if (order.includes(c) && !e.tags.building) fill(rings(e), setC(c));

// ---------- 2. calles ----------
const DEF = { motorway: 11, trunk: 10.5, primary: 10, secondary: 9, tertiary: 8.5, residential: 7.5, unclassified: 7, living_street: 6.5, service: 4.5, busway: 7, pedestrian: 7, footway: 2.4, path: 2, cycleway: 2.2, steps: 2.4, track: 3, construction: 6 };
const CAR = /^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|service|busway)(_link)?$/;
const roads = [];
for (const e of all) {
  const t = e.tags;
  if (e.type !== 'way' || !e.geometry || !t?.highway || t.area === 'yes' || t.tunnel === 'yes' || t.tunnel === 'building_passage' || (+t.layer || 0) < 0) continue;
  const base = t.highway.replace(/_link$/, '');
  if (DEF[base] == null) continue;
  if (base === 'footway' && (t.footway === 'sidewalk')) continue;
  const lanes = +t.lanes || 0;
  let w = parseFloat(t.width) || (lanes && CAR.test(t.highway) ? lanes * 3.2 : DEF[base]);
  if (t.highway.endsWith('_link')) w = Math.min(w, 7);
  const pts = e.geometry.map((g) => proj(g.lat, g.lon));
  roads.push({ e, t, pts, hw: w / 2, car: CAR.test(t.highway), lanes, nodes: e.nodes || [] });
}
// peatonales y senderos debajo, autos encima
for (const r of roads) if (!r.car) stroke(r.pts, r.hw, (x, z) => { const i = at(x, z); if (i >= 0 && cls[i] !== AGUA) cls[i] = r.t.highway === 'cycleway' ? ASF : PLAZA; });
for (const r of roads) if (r.car) stroke(r.pts, r.hw, setC(ASF));
// vías del tren (en superficie)
for (const e of all) if (e.type === 'way' && e.geometry && /^(rail|light_rail|tram)$/.test(e.tags?.railway || '') && e.tags.tunnel !== 'yes' && (+e.tags.layer || 0) >= 0) stroke(e.geometry.map((g) => proj(g.lat, g.lon)), 1.4, setC(VIAS));

// ---------- 3. demarcación: carriles y sendas peatonales ----------
const paint = (x, z, c) => { const i = at(x, z); if (i >= 0 && (cls[i] === ASF || cls[i] === BLANCO || cls[i] === AMARILLO)) cls[i] = c; };
for (const r of roads) {
  if (!r.car || r.lanes < 2) continue;
  const oneway = r.t.oneway === 'yes' || r.t.oneway === '-1' || /^(motorway|trunk)$/.test(r.t.highway);
  walk(r.pts, (x, z, s, n) => {
    for (let k = 1; k < r.lanes; k++) {
      const o = -r.hw + (2 * r.hw * k) / r.lanes, center = !oneway && k * 2 === r.lanes;
      if (center || s % 9 < 3.5) paint(x + n[0] * o, z + n[1] * o, center ? AMARILLO : BLANCO);
    }
  });
}
// cruces peatonales dibujados como líneas
for (const r of roads) {
  if (r.t.highway !== 'footway' || r.t.footway !== 'crossing') continue;
  walk(r.pts, (x, z, s, n) => { if (Math.floor(s / 0.8) % 2) return; for (let o = -1.5; o <= 1.5; o += 0.5) paint(x + n[0] * o, z + n[1] * o, BLANCO); });
}
// cruces marcados sólo con un punto: la senda va de lado a lado de la calle
const roadsByNode = new Map();
for (const r of roads) if (r.car) r.nodes.forEach((nd, i) => { if (!roadsByNode.has(nd)) roadsByNode.set(nd, []); roadsByNode.get(nd).push([r, i]); });
for (const e of all) {
  if (e.type !== 'node' || e.tags?.highway !== 'crossing') continue;
  const on = roadsByNode.get(e.id)?.[0]; if (!on) continue;
  const [r, i] = on, a = r.pts[Math.max(0, i - 1)], b = r.pts[Math.min(r.pts.length - 1, i + 1)];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-u[1], u[0]];
  const [cx, cz] = proj(e.lat, e.lon);
  for (let o = -r.hw; o <= r.hw; o += 0.5) if (Math.floor((o + r.hw) / 0.8) % 2 === 0) for (let w = -1.5; w <= 1.5; w += 0.5) paint(cx + n[0] * o + u[0] * w, cz + n[1] * o + u[1] * w, BLANCO);
}

// ---------- 4. edificios ----------
const PAL = { blanco: 1, white: 1, beige: 2, cream: 2, gray: 3, grey: 3, red: 4, brown: 5, pink: 6, yellow: 7, black: 8, blue: 9, glass: 10, brick: 4, stone: 2, concrete: 3, plaster: 1 };
const NEUTRAL = [1, 2, 3, 3, 2, 4, 1, 11, 12];
let nb = 0;
const heightOf = (t) => {
  let h = parseFloat(t.height) || (t['building:levels'] ? (+t['building:levels'] + (+t['roof:levels'] || 0)) * 3.1 + 1 : 0);
  if (!h) h = /^(church|cathedral|chapel)$/.test(t.building) ? 22 : /^(kiosk|hut|shed|garage|toilets)$/.test(t.building) ? 3 : 19; // sin dato: altura de referencia (6 pisos)
  return Math.max(3, Math.min(78, Math.round(h)));
};
const matOf = (t, id) => {
  const c = (t['building:colour'] || t['building:material'] || t['building:facade:material'] || '').toLowerCase();
  for (const [k, v] of Object.entries(PAL)) if (c.includes(k)) return v;
  if (/rosada/i.test(t.name || '')) return 6;
  return NEUTRAL[id % NEUTRAL.length];
};
const blds = all.filter((e) => e.tags?.building && e.tags.building !== 'roof' && (e.type === 'way' || e.type === 'relation') && e.tags.location !== 'underground');
for (const e of blds) {
  const h = heightOf(e.tags), m = matOf(e.tags, e.id), id = (++nb % 250) + 1;
  fill(rings(e), (x, z) => { const i = at(x, z); if (i >= 0) { cls[i] = EDIF; hgt[i] = Math.max(hgt[i] && bid[i] === id ? hgt[i] : 0, h); mat[i] = m; bid[i] = id; } });
}
// partes más altas de algunos edificios (torres, cúpulas)
for (const e of all) {
  if (!e.tags?.['building:part'] || e.type !== 'way') continue;
  const h = heightOf(e.tags), m = matOf(e.tags, e.id);
  fill(rings(e), (x, z) => { const i = at(x, z); if (i >= 0 && h > hgt[i]) { cls[i] = EDIF; hgt[i] = h; if (e.tags['building:colour'] || e.tags['building:material']) mat[i] = m; } });
}

// ---------- 5. árboles, faroles, carteles y lugares ----------
const treeKind = (t) => { const s = `${t.genus || ''} ${t.species || ''} ${t.taxon || ''} ${t['species:es'] || ''}`.toLowerCase(); return /jacaran/.test(s) ? 1 : /tipu|tipa/.test(s) ? 2 : /ceiba|chorisia|borracho/.test(s) ? 3 : /palm|phoenix|washington|syagrus|butia/.test(s) ? 4 : 0; };
const trees = [];
for (const e of all) if (e.type === 'node' && e.tags?.natural === 'tree') { const [x, z] = proj(e.lat, e.lon); if (at(x, z) >= 0 && cls[at(x, z)] !== EDIF) trees.push([Math.round(x), Math.round(z), treeKind(e.tags), Math.round(parseFloat(e.tags.height) || 0)]); }
// plazas y canteros sin árboles cargados: arbolado con las especies típicas porteñas (ubicación aproximada)
{
  const near = new Set(trees.map(([x, z]) => Math.floor(x / 5) + ',' + Math.floor(z / 5)));
  const hsh = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let added = 0;
  for (let z = Z0 + 4; z < Z1 - 4; z += 9) for (let x = X0 + 4; x < X1 - 4; x += 9) {
    const tx = x + Math.floor(hsh(x, z) * 5) - 2, tz = z + Math.floor(hsh(z, x) * 5) - 2;
    let ok = true;
    for (let dz = -2; dz <= 2 && ok; dz++) for (let dx = -2; dx <= 2 && ok; dx++) { const i = at(tx + dx, tz + dz); if (i < 0 || cls[i] !== PASTO) ok = false; }
    if (!ok || near.has(Math.floor(tx / 5) + ',' + Math.floor(tz / 5))) continue;
    const r = hsh(tx * 3, tz * 7);
    trees.push([tx, tz, r < 0.3 ? 0 : r < 0.6 ? 1 : r < 0.9 ? 2 : 3, 0]); added++;
  }
  console.log('árboles agregados en plazas y canteros', added);
}
const lamps = [];
for (const e of all) if (e.type === 'node' && e.tags?.highway === 'street_lamp') { const [x, z] = proj(e.lat, e.lon); if (at(x, z) >= 0) lamps.push([Math.round(x), Math.round(z)]); }
// esquinas con nombre: nodo compartido por dos calles con nombres distintos.
// Un poste por esquina con una placa por calle, paralela a la calle que nombra.
const signs = [], seen = new Set(), corners = [], SK = { one: 0, cand: 0, nofree: 0 };
const dirAt = (r, i) => { const a = r.pts[Math.max(0, i - 1)], b = r.pts[Math.min(r.pts.length - 1, i + 1)]; return Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) * 100) / 100; };
const isFree = (x, z) => { const i = at(x, z); return i >= 0 && (cls[i] === VEREDA || cls[i] === PLAZA); };
for (const [nd, list] of roadsByNode) {
  const names = [...new Set(list.map(([r]) => r.t.name).filter(Boolean))];
  if (names.length < 2) { if (list.length > 1) SK.one++; continue; }
  SK.cand++;
  const [r, i] = list[0], [cx, cz] = r.pts[i];
  const key = names.slice().sort().join('|') + '|' + Math.floor(cx / 45) + ',' + Math.floor(cz / 45); if (seen.has(key)) continue;
  // las avenidas con dos manos cruzan varias veces la misma calle: una sola esquina cada ~45 m
  if (corners.some(([x, z, k]) => k === names.slice().sort().join('|') && Math.hypot(x - cx, z - cz) < 45)) continue;
  let best = null;
  for (let rad = 2; rad < 26 && !best; rad++) for (let a = 0; a < 16 && !best; a++) { const x = Math.round(cx + Math.cos(a / 16 * Math.PI * 2 + 0.4) * rad), z = Math.round(cz + Math.sin(a / 16 * Math.PI * 2 + 0.4) * rad); if (isFree(x, z)) best = [x, z]; }
  if (!best) { SK.nofree++; continue; }
  seen.add(key); corners.push([cx, cz, names.slice().sort().join('|')]);
  const plates = names.slice(0, 3).map((n) => [n, dirAt(...list.find(([rr]) => rr.t.name === n))]);
  signs.push([best[0], best[1], plates]);
}
console.log('esquinas: candidatas', SK.cand, '· sin vereda libre', SK.nofree, '· cruces sin dos nombres', SK.one);
// lugares conocidos (con artículo en Wikipedia o atracción turística)
const pois = [];
for (const e of all) {
  const t = e.tags; if (!t?.name) continue;
  if (!(t.wikidata || t.wikipedia) || !(t.tourism || t.historic || t.amenity === 'theatre' || t.building || t.leisure === 'park' || t.place === 'square' || t.amenity === 'place_of_worship')) continue;
  const g = e.lat != null ? e : e.bounds ? { lat: (e.bounds.minlat + e.bounds.maxlat) / 2, lon: (e.bounds.minlon + e.bounds.maxlon) / 2 } : null;
  if (!g) continue;
  const [x, z] = proj(g.lat, g.lon); if (at(x, z) < 0) continue;
  pois.push([Math.round(x), Math.round(z), t.name]);
}
const uniq = new Map(); for (const p of pois) if (!uniq.has(p[2])) uniq.set(p[2], p);

// ---------- salida ----------
const raw = new Uint8Array(N * 4); raw.set(cls, 0); raw.set(hgt, N); raw.set(mat, 2 * N); raw.set(bid, 3 * N);
const comp = deflateRawSync(raw, { level: 9 });
writeFileSync(join(OUT, 'ba_centro.bin'), comp);
const meta = { version: 1, source: 'OpenStreetMap (ODbL) · © colaboradores de OpenStreetMap', lat0: LAT0, lon0: LON0, rot: TH, x0: X0, z0: Z0, w: W, h: H, trees, lamps, signs2: signs, pois: [...uniq.values()] };
writeFileSync(join(OUT, 'ba_centro.json'), JSON.stringify(meta));
const cnt = new Array(10).fill(0); for (const c of cls) cnt[c]++;
console.log('clases', cnt.join(' '), '· edificios', blds.length, '· árboles', trees.length, '· faroles', lamps.length, '· esquinas', signs.length, '· lugares', uniq.size);
console.log('comprimido', (comp.length / 1e6).toFixed(2), 'MB');
