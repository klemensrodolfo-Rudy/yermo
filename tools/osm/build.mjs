// Convierte los datos de OpenStreetMap de una zona (ver regions.mjs) en una grilla de 1 m para un mundo real.
// Entrada: tools/osm/*.json o tools/osm/<zona>/a_api.json (y overture.json). Salida: data/<zona>.bin (grilla comprimida) y data/<zona>.json.
// Uso: node tools/osm/build.mjs [ba|hurlingham]
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { REGIONS } from './regions.mjs';
import { deflateRawSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'data');
mkdirSync(OUT, { recursive: true });
const REGION = process.argv[2] || 'ba', R = REGIONS[REGION];
const DIR = R.dir ? join(HERE, R.dir) : HERE;

// ---------- leer y unir ----------
const els = new Map();
for (const f of readdirSync(DIR).filter((f) => (R.inputs || /^a_api\.json$/).test(f)).sort()) {
  const j = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  for (const e of j.elements) els.set(e.type + e.id, e);
}
const all = [...els.values()];
console.log('elementos', all.length);

// ---------- proyección: metros desde el origen, girados para que la calle guía quede a lo largo de z ----------
let ob = { lat: R.origin[0], lon: R.origin[1] };
if (R.origin === 'obelisco') {
  const obeNode = all.find((e) => e.tags && /^Obelisco( de Buenos Aires)?$/i.test(e.tags.name || '') && (e.tags.man_made || e.tags.historic || e.tags.tourism));
  ob = obeNode?.lat != null ? obeNode : obeNode?.bounds ? { lat: (obeNode.bounds.minlat + obeNode.bounds.maxlat) / 2, lon: (obeNode.bounds.minlon + obeNode.bounds.maxlon) / 2 } : { lat: -34.6037222, lon: -58.3815931 };
}
const LAT0 = ob.lat, LON0 = ob.lon, KX = 111320 * Math.cos((LAT0 * Math.PI) / 180), KZ = 110574;
const proj0 = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
// dirección media de la calle guía (la 9 de Julio en el centro, Pedro de Mendoza en Hurlingham)
let ax = 0, az = 0;
const near0 = R.axis.near ? proj0(...R.axis.near) : null;
for (const e of all) {
  if (e.type !== 'way' || !e.geometry || !R.axis.name.test(e.tags?.name || '') || !(R.axis.highway || /./).test(e.tags?.highway || '')) continue;
  for (let i = 1; i < e.geometry.length; i++) {
    const [x0, z0] = proj0(e.geometry[i - 1].lat, e.geometry[i - 1].lon), [x1, z1] = proj0(e.geometry[i].lat, e.geometry[i].lon);
    if (near0 && Math.hypot(x0 - near0[0], z0 - near0[1]) > R.axis.radius) continue;
    let dx = x1 - x0, dz = z1 - z0; if (dz < 0) { dx = -dx; dz = -dz; }
    ax += dx; az += dz;
  }
}
const TH = Math.atan2(ax, az); // ángulo de la avenida respecto de +z
const C = Math.cos(TH), S = Math.sin(TH);
const proj = (lat, lon) => { const [x, z] = proj0(lat, lon); return [x * C - z * S, x * S + z * C]; };
console.log('origen', LAT0, LON0, 'giro', ((TH * 180) / Math.PI).toFixed(2), '°');

// ---------- grilla ----------
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (const e of all) for (const g of e.geometry || (e.lat != null ? [e] : [])) { const [x, z] = proj(g.lat, g.lon); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
// recorte al cuadrado de la consulta (los elementos que la cruzan traen geometría de afuera)
const LIM = R.lim || 1e9;
let X0 = Math.max(Math.floor(minX), -LIM), Z0 = Math.max(Math.floor(minZ), -LIM), X1 = Math.min(Math.ceil(maxX), LIM), Z1 = Math.min(Math.ceil(maxZ), LIM);
if (R.rect) [X0, Z0, X1, Z1] = R.rect;
const W = X1 - X0, H = Z1 - Z0, N = W * H;
console.log('grilla', W, 'x', H);
const cls = new Uint8Array(N), hgt = new Uint8Array(N), mat = new Uint8Array(N), bid = new Uint8Array(N), rf = new Uint8Array(N);
const at = (x, z) => { const i = Math.floor(x) - X0, j = Math.floor(z) - Z0; return i >= 0 && j >= 0 && i < W && j < H ? i + j * W : -1; };
// clases de suelo
const VEREDA = 0, ASF = 1, PASTO = 2, EDIF = 3, PLAZA = 4, AGUA = 5, BLANCO = 6, AMARILLO = 7, VIAS = 8, TIERRA = 9, ANDEN = 10, HITO = 11;
// en los barrios de casas, lo que no es calle ni edificio son terrenos con jardín
if (R.suburb) cls.fill(PASTO);
const park = new Uint8Array(N); // plazas y parques (para el arbolado aproximado)

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
  if (/^(park|garden|dog_park|pitch|golf_course)$/.test(t.leisure || '') || /^(grass|village_green|meadow|recreation_ground|flowerbed)$/.test(t.landuse || '') || t.natural === 'scrub' || t.natural === 'grassland') return PASTO;
  if (t.leisure === 'playground' || t.natural === 'sand') return TIERRA;
  if (t.highway === 'pedestrian' || t.place === 'square' || /^(pedestrian|footway|platform)$/.test(t['area:highway'] || '') || t.amenity === 'marketplace') return PLAZA;
  if (t['area:highway'] || t.amenity === 'parking' || t.amenity === 'bus_station') return ASF;
  if (t.landuse === 'railway') return TIERRA;
  if (t.railway === 'platform' || (t.public_transport === 'platform' && t.train === 'yes')) return ANDEN;
  return null;
};
const areas = all.filter((e) => (e.type === 'way' && e.geometry && e.geometry.length > 3 && (e.tags?.area === 'yes' || e.geometry[0].lat === e.geometry.at(-1).lat)) || e.type === 'relation').map((e) => [e, areaClass(e.tags)]).filter(([, c]) => c != null);
// primero el pasto y la tierra, después las plazas y el asfalto, el agua al final
for (const order of [[ASF], [PASTO, TIERRA], [PLAZA], [AGUA]]) for (const [e, c] of areas) if (order.includes(c) && !e.tags.building) fill(rings(e), setC(c));
for (const [e] of areas) if (/^(park|garden)$/.test(e.tags.leisure || '') || e.tags.place === 'square') fill(rings(e), (x, z) => { const i = at(x, z); if (i >= 0) park[i] = 1; });
// óvalo del hipódromo (calcado de la foto satelital): pista de tierra y pasto adentro
if (R.track) {
  const T = R.track;
  const dist = (x, z) => { const zc = Math.max(T.z0, Math.min(T.z1, z)); return Math.hypot(x - T.x, z - zc); };
  for (let z = Math.floor(T.z0 - T.r); z <= T.z1 + T.r; z++) for (let x = Math.floor(T.x - T.r); x <= T.x + T.r; x++) {
    const d = dist(x + 0.5, z + 0.5), i = at(x, z); if (i < 0) continue;
    if (d <= T.r && d > T.r - T.w) cls[i] = TIERRA; else if (d <= T.r - T.w) cls[i] = PASTO;
    else if (d <= T.r + 1.5) cls[i] = BLANCO; // la baranda blanca de afuera
  }
}

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
// veredas angostas a los dos lados de las calles del barrio
if (R.suburb) for (const r of roads) if (r.car && !/^service/.test(r.t.highway)) stroke(r.pts, r.hw + 2.6, (x, z) => { const i = at(x, z); if (i >= 0 && cls[i] === PASTO && !park[i]) cls[i] = VEREDA; });
// peatonales y senderos debajo, autos encima
for (const r of roads) if (!r.car) stroke(r.pts, r.hw, (x, z) => { const i = at(x, z); if (i >= 0 && cls[i] !== AGUA) cls[i] = r.t.highway === 'cycleway' ? ASF : PLAZA; });
for (const r of roads) if (r.car) stroke(r.pts, r.hw, setC(ASF));
// vías del tren (en superficie)
for (const e of all) if (e.type === 'way' && e.geometry && /^(rail|light_rail|tram)$/.test(e.tags?.railway || '') && e.tags.tunnel !== 'yes' && (+e.tags.layer || 0) >= 0) stroke(e.geometry.map((g) => proj(g.lat, g.lon)), 1.4, setC(VIAS));
// andenes cargados como línea (sin superficie): 5 m de ancho
for (const e of all) if (e.type === 'way' && e.geometry && e.tags?.railway === 'platform' && e.geometry[0].lat !== e.geometry.at(-1).lat) stroke(e.geometry.map((g) => proj(g.lat, g.lon)), 2.5, setC(ANDEN));

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
  if (!h) h = /^(church|cathedral|chapel)$/.test(t.building) ? (R.suburb ? 10 : 22) : /^(kiosk|hut|shed|garage|toilets)$/.test(t.building) ? 3 : R.defaultHeight; // sin dato: altura de referencia
  return Math.max(3, Math.min(78, Math.round(h)));
};
const matOf = (t, id) => {
  const c = (t['building:colour'] || t['building:material'] || t['building:facade:material'] || '').toLowerCase();
  for (const [k, v] of Object.entries(PAL)) if (c.includes(k)) return v;
  if (/rosada/i.test(t.name || '')) return 6;
  return NEUTRAL[id % NEUTRAL.length];
};
const blds = all.filter((e) => e.tags?.building && e.tags.building !== 'roof' && (e.type === 'way' || e.type === 'relation') && e.tags.location !== 'underground');
const area = (rs) => { let a = 0; for (const r of rs) for (let i = 0; i < r.length; i++) { const [x1, z1] = r[i], [x2, z2] = r[(i + 1) % r.length]; a += x1 * z2 - x2 * z1; } return Math.abs(a / 2); };
const bigH = (rs, h, t) => (R.bigHeight && !t.height && !t['building:levels'] && area(rs) > R.bigHeight[0] ? Math.max(h, R.bigHeight[1]) : h);
const flatRoof = new Set(); // ids de edificio con techo plano
for (const e of blds) {
  const rs = rings(e), h = bigH(rs, heightOf(e.tags), e.tags), m = matOf(e.tags, e.id), id = (++nb % 250) + 1;
  if (e.tags['roof:shape'] === 'flat' || area(rs) > 250) flatRoof.add(nb);
  fill(rs, (x, z) => { const i = at(x, z); if (i >= 0) { cls[i] = EDIF; hgt[i] = Math.max(hgt[i] && bid[i] === id ? hgt[i] : 0, h); mat[i] = m; bid[i] = id; } });
}
// siluetas de Overture (Google Open Buildings y Microsoft) donde OpenStreetMap no tiene el edificio
let nOv = 0;
if (R.overture && existsSync(join(DIR, 'overture.json'))) {
  for (const b of JSON.parse(readFileSync(join(DIR, 'overture.json'), 'utf8'))) {
    if (/openstreetmap/i.test(b.src || '')) continue;
    const rs = [b.r.map(([lon, lat]) => proj(lat, lon))];
    let cx = 0, cz = 0; for (const [x, z] of rs[0]) { cx += x / rs[0].length; cz += z / rs[0].length; }
    const c = at(cx, cz); if (c < 0 || cls[c] === EDIF || cls[c] === ASF || cls[c] === VIAS || cls[c] === AGUA) continue;
    const a = area(rs); if (a < 6) continue;
    const h0 = b.h ? Math.round(b.h) : b.f ? b.f * 3.1 + 1 : R.defaultHeight;
    const h = Math.max(3, Math.min(78, Math.round(a > R.bigHeight[0] && !b.h && !b.f ? Math.max(h0, R.bigHeight[1]) : h0)));
    const id = (++nb % 250) + 1, m = NEUTRAL[nb % NEUTRAL.length]; nOv++;
    // techo: de tejas en parte de las casas chicas (el tipo de techo real no está en los datos)
    const hs = ((nb * 2654435761) >>> 0) / 4294967296;
    if (a > 250 || hs > 0.6) flatRoof.add(nb);
    fill(rs, (x, z) => { const i = at(x, z); if (i >= 0 && cls[i] !== EDIF && cls[i] !== ASF && cls[i] !== VIAS && cls[i] !== ANDEN && cls[i] !== VEREDA) { cls[i] = EDIF; hgt[i] = h; mat[i] = m; bid[i] = id; } });
  }
  console.log('edificios de Overture', nOv);
}
// techos de tejas a cuatro aguas (sólo en los barrios): la altura extra crece hacia el centro del edificio
if (R.suburb) {
  const d = new Uint8Array(N).fill(255);
  for (let i = 0; i < N; i++) if (cls[i] !== EDIF) d[i] = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = i + j * W; if (!d[k]) continue; let v = 255; if (i) v = Math.min(v, bid[k - 1] === bid[k] ? d[k - 1] + 1 : 1); else v = 1; if (j) v = Math.min(v, bid[k - W] === bid[k] ? d[k - W] + 1 : 1); else v = 1; d[k] = Math.min(d[k], v); }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = i + j * W; if (!d[k]) continue; let v = d[k]; v = Math.min(v, i < W - 1 ? (bid[k + 1] === bid[k] && cls[k + 1] === EDIF ? d[k + 1] + 1 : 1) : 1); v = Math.min(v, j < H - 1 ? (bid[k + W] === bid[k] && cls[k + W] === EDIF ? d[k + W] + 1 : 1) : 1); d[k] = v; }
  const roofIds = new Set(); for (let n = 1; n <= nb; n++) if (!flatRoof.has(n)) roofIds.add((n % 250) + 1);
  // como los ids se repiten cada 250, decide el techo de cada celda por el id y la altura (casas bajas)
  for (let i = 0; i < N; i++) if (cls[i] === EDIF && hgt[i] <= 7 && roofIds.has(bid[i])) rf[i] = Math.min(4, Math.ceil(d[i] / 2));
}
// hitos modelados a mano (como la iglesia Santa Trinidad): se reserva su manzana
const landmarks = [];
for (const L of R.landmarks || []) {
  const [cx, cz] = proj(...L.at);
  const dirOf = (name, want) => {
    let best = null;
    for (const e of all) if (e.type === 'way' && e.geometry && e.tags?.name === name && e.tags.highway) for (const g of e.geometry) {
      const [x, z] = proj(g.lat, g.lon), dd = Math.hypot(x - cx, z - cz);
      if (dd > 15 && dd < 120) { const [ux, uz] = [(x - cx) / dd, (z - cz) / dd], [la, lo] = [g.lat - L.at[0], g.lon - L.at[1]]; if (want(la, lo) && (!best || dd < best[2])) best = [ux, uz, dd]; }
    }
    return [Math.round(best[0]), Math.round(best[1])];
  };
  // u: por la calle a hacia el sudeste; v: por la calle b hacia el noreste
  const u = dirOf(L.a, (la, lo) => la < 0 && lo > 0), v = dirOf(L.b, (la, lo) => la > 0 && lo > 0);
  landmarks.push({ kind: L.kind, x: Math.round(cx), z: Math.round(cz), u, v });
  for (let a = 6; a <= 28; a++) for (let b = 6; b <= 30; b++) { const i = at(cx + u[0] * a + v[0] * b, cz + u[1] * a + v[1] * b); if (i >= 0) { cls[i] = HITO; hgt[i] = 0; rf[i] = 0; } }
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
for (const e of all) if (e.type === 'node' && e.tags?.natural === 'tree') { const [x, z] = proj(e.lat, e.lon); if (at(x, z) >= 0 && cls[at(x, z)] !== EDIF && cls[at(x, z)] !== HITO) trees.push([Math.round(x), Math.round(z), treeKind(e.tags), Math.round(parseFloat(e.tags.height) || 0)]); }
// plazas y canteros sin árboles cargados: arbolado con las especies típicas porteñas (ubicación aproximada)
{
  const near = new Set(trees.map(([x, z]) => Math.floor(x / 5) + ',' + Math.floor(z / 5)));
  const hsh = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let added = 0;
  for (let z = Z0 + 4; z < Z1 - 4; z += 9) for (let x = X0 + 4; x < X1 - 4; x += 9) {
    const tx = x + Math.floor(hsh(x, z) * 5) - 2, tz = z + Math.floor(hsh(z, x) * 5) - 2;
    let ok = true;
    for (let dz = -2; dz <= 2 && ok; dz++) for (let dx = -2; dx <= 2 && ok; dx++) { const i = at(tx + dx, tz + dz); if (i < 0 || cls[i] !== PASTO || (R.suburb && !park[i])) ok = false; }
    if (!ok || near.has(Math.floor(tx / 5) + ',' + Math.floor(tz / 5))) continue;
    const r = hsh(tx * 3, tz * 7);
    trees.push([tx, tz, r < 0.3 ? 0 : r < 0.6 ? 1 : r < 0.9 ? 2 : 3, 0]); added++;
  }
  console.log('árboles agregados en plazas y canteros', added);
}
// arbolado de las veredas del barrio (ubicación aproximada: uno cada ~8 m en el borde de la vereda)
if (R.suburb) {
  let added = 0;
  const hsh = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const taken = new Set(trees.map(([x, z]) => Math.floor(x / 6) + ',' + Math.floor(z / 6)));
  for (const r of roads) {
    if (!r.car || /^service/.test(r.t.highway)) continue;
    let last = -99;
    walk(r.pts, (x, z, s, n, u) => {
      if (s - last < 8) return;
      for (const sd of [-1, 1]) {
        const tx = Math.round(x + n[0] * (r.hw + 0.8) * sd), tz = Math.round(z + n[1] * (r.hw + 0.8) * sd), i = at(tx, tz);
        if (i < 0 || cls[i] !== VEREDA || hsh(tx, tz) > 0.65) continue;
        // frente a los hitos modelados a mano, sólo lo que se ve en las fotos (sin árboles inventados)
        if (landmarks.some((L) => { const a = (tx - L.x) * L.u[0] + (tz - L.z) * L.u[1], b = (tx - L.x) * L.v[0] + (tz - L.z) * L.v[1]; return a > -4 && a < 34 && b > -4 && b < 34; })) continue;
        const k = Math.floor(tx / 6) + ',' + Math.floor(tz / 6); if (taken.has(k)) continue;
        // lejos de las esquinas: a 6 m para cada lado, siguiendo la vereda, no tiene que haber otra calle
        let ok = true; for (const k of [-6, -3, 3, 6]) { const j = at(tx + u[0] * k, tz + u[1] * k); if (j < 0 || cls[j] === ASF) ok = false; }
        if (!ok) continue;
        taken.add(k); trees.push([tx, tz, hsh(tz, tx) < 0.15 ? 1 : 0, 0]); added++;
      }
      last = s;
    });
  }
  console.log('árboles de vereda (aproximados)', added);
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
  if (R.suburb && (t.railway === 'station' || (t.leisure === 'park' && e.type !== 'node') || t.amenity === 'place_of_worship' || t.leisure === 'sports_centre')) { /* en el barrio, también estaciones, plazas, iglesias y clubes */ }
  else if (!(t.wikidata || t.wikipedia) || !(t.tourism || t.historic || t.amenity === 'theatre' || t.building || t.leisure === 'park' || t.place === 'square' || t.amenity === 'place_of_worship')) continue;
  const gm = e.geometry?.length ? e.geometry.reduce((a, p) => ({ lat: a.lat + p.lat / e.geometry.length, lon: a.lon + p.lon / e.geometry.length }), { lat: 0, lon: 0 }) : null;
  const g = e.lat != null ? e : e.bounds ? { lat: (e.bounds.minlat + e.bounds.maxlat) / 2, lon: (e.bounds.minlon + e.bounds.maxlon) / 2 } : R.suburb ? gm : null;
  if (!g) continue;
  const [x, z] = proj(g.lat, g.lon); if (at(x, z) < 0) continue;
  pois.push([Math.round(x), Math.round(z), t.name]);
}
if (R.track) pois.push([R.track.x, Math.round((R.track.z0 + R.track.z1) / 2), 'Hipódromo de trote']);
for (const L of landmarks) if (L.kind === 'santaTrinidad') pois.push([L.x + L.u[0] * 18 + L.v[0] * 12, L.z + L.u[1] * 18 + L.v[1] * 12, 'Iglesia Santa Trinidad']);
const uniq = new Map(); for (const p of pois) if (!uniq.has(p[2])) uniq.set(p[2], p);

// ---------- salida ----------
const L5 = R.suburb ? 5 : 4;
const raw = new Uint8Array(N * L5); raw.set(cls, 0); raw.set(hgt, N); raw.set(mat, 2 * N); raw.set(bid, 3 * N); if (L5 === 5) raw.set(rf, 4 * N);
const comp = deflateRawSync(raw, { level: 9 });
writeFileSync(join(OUT, R.out + '.bin'), comp);
const source = 'OpenStreetMap (ODbL) · © colaboradores de OpenStreetMap' + (nOv ? ' · siluetas de edificios: Overture Maps (Google Open Buildings, Microsoft)' : '');
const meta = { version: 1, region: REGION, layers: L5, source, lat0: LAT0, lon0: LON0, rot: TH, x0: X0, z0: Z0, w: W, h: H, trees, lamps, signs2: signs, pois: [...uniq.values()], landmarks };
writeFileSync(join(OUT, R.out + '.json'), JSON.stringify(meta));
const cnt = new Array(12).fill(0); for (const c of cls) cnt[c]++;
console.log('clases', cnt.join(' '), '· edificios', blds.length, '· árboles', trees.length, '· faroles', lamps.length, '· esquinas', signs.length, '· lugares', uniq.size);
console.log('comprimido', (comp.length / 1e6).toFixed(2), 'MB');
