// Construye la geometría de un chunk a partir de un volumen con borde (padding)
// e incluye luz de cielo + luz de bloques con BFS e iluminación suave + AO.
import { CHUNK, HEIGHT, OPAQUE, EMIT, RENDER, TEX_TOP, TEX_SIDE, TEX_BOTTOM, TEX_FRONT, TORCH_DIR, LIQ, LIQ_LEVEL, BOXES, ATLAS, TILE_FLAGS } from './blocks.js';

export const PAD = 14;
export const W = CHUNK + PAD * 2; // 44
const WW = W * W;
// coordenadas de un tile en el atlas (u izquierda, v arriba) y su tamaño en UV
const TS = ATLAS.res / ATLAS.size;
const tileU = (t) => ((t % ATLAS.cols) * ATLAS.cell + ATLAS.pad) / ATLAS.size;
const tileV = (t) => (Math.floor(t / ATLAS.cols) * ATLAS.cell + ATLAS.pad) / ATLAS.size;
const WHITE = new Uint8Array([128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255]);

// Cara: normal, 4 vértices (orden CCW visto desde fuera), ejes tangentes u/v para muestreo AO
const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8 },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.5 },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.9 },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.7 },
];
const FACE_UV = [[0, 1], [1, 1], [1, 0], [0, 0]];

function computeLight(vol, sky, blk) {
  const N = WW * HEIGHT;
  const q = new Int32Array(N > 600000 ? N : 600000);
  // --- cielo: columnas ---
  const top = new Int16Array(WW);
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    let level = 15, y = HEIGHT - 1;
    for (; y >= 0; y--) {
      const i = x + z * W + y * WW, b = vol[i];
      if (OPAQUE[b]) break;
      if (LIQ[b] || b === 16) level = Math.max(0, level - 2);
      sky[i] = level;
    }
    top[x + z * W] = y + 1;
  }
  // semillas: celdas iluminadas junto a columnas más altas
  let qh = 0, qt = 0;
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const c = x + z * W;
    let m = 0;
    if (x > 0) m = Math.max(m, top[c - 1]);
    if (x < W - 1) m = Math.max(m, top[c + 1]);
    if (z > 0) m = Math.max(m, top[c - W]);
    if (z < W - 1) m = Math.max(m, top[c + W]);
    for (let y = top[c]; y < m; y++) q[qt++] = c + y * WW;
  }
  bfs(vol, sky, q, qh, qt);
  // --- bloques emisores ---
  qt = 0;
  for (let i = 0; i < N; i++) { const e = EMIT[vol[i]]; if (e) { blk[i] = e; q[qt++] = i; } }
  bfs(vol, blk, q, 0, qt);
}

function bfs(vol, L, q, qh, qt) {
  const cap = q.length;
  while (qh !== qt) {
    const i = q[qh]; qh = (qh + 1) % cap;
    const l = L[i];
    if (l <= 1) continue;
    const x = i % W, z = ((i / W) | 0) % W, y = (i / WW) | 0;
    const nl = l - 1;
    // 6 vecinos
    if (x > 0) { const j = i - 1; if (!OPAQUE[vol[j]] && L[j] < nl) { L[j] = nl; q[qt] = j; qt = (qt + 1) % cap; } }
    if (x < W - 1) { const j = i + 1; if (!OPAQUE[vol[j]] && L[j] < nl) { L[j] = nl; q[qt] = j; qt = (qt + 1) % cap; } }
    if (z > 0) { const j = i - W; if (!OPAQUE[vol[j]] && L[j] < nl) { L[j] = nl; q[qt] = j; qt = (qt + 1) % cap; } }
    if (z < W - 1) { const j = i + W; if (!OPAQUE[vol[j]] && L[j] < nl) { L[j] = nl; q[qt] = j; qt = (qt + 1) % cap; } }
    if (y > 0) { const j = i - WW; if (!OPAQUE[vol[j]] && L[j] < nl) { L[j] = nl; q[qt] = j; qt = (qt + 1) % cap; } }
    if (y < HEIGHT - 1) { const j = i + WW; if (!OPAQUE[vol[j]] && L[j] < nl) { L[j] = nl; q[qt] = j; qt = (qt + 1) % cap; } }
  }
}

class Buf {
  constructor() { this.pos = []; this.uv = []; this.lit = []; this.inf = []; this.tint = []; this.idx = []; this.n = 0; }
  // inf: [tile, banderas, cara (0-5; 6 planta; 7 antorcha), 0] · tint: color del bioma por vértice (128 = neutro)
  quad(p, uv, lit, flip, tile = 0, face = 6, tint = WHITE, noVar = false) {
    const b = this.n;
    const flags = noVar ? TILE_FLAGS[tile] & ~3 : TILE_FLAGS[tile];
    for (let k = 0; k < 4; k++) {
      this.pos.push(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]);
      this.uv.push(uv[k * 2], uv[k * 2 + 1]);
      this.lit.push(lit[k * 4], lit[k * 4 + 1], lit[k * 4 + 2], lit[k * 4 + 3]);
      this.inf.push(tile, flags, face, 0);
      this.tint.push(tint[k * 4], tint[k * 4 + 1], tint[k * 4 + 2], 255);
    }
    if (flip) this.idx.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    else this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    this.n += 4;
  }
  out() {
    return {
      pos: new Float32Array(this.pos), uv: new Float32Array(this.uv),
      lit: new Uint8Array(this.lit), inf: new Uint8Array(this.inf), tint: new Uint8Array(this.tint), idx: this.n > 65000 ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
    };
  }
}

// tintAt(x, z) → [r, g, b] (0-255, 128 = sin cambio) en coordenadas locales del chunk
export function buildMesh(vol, tintAt) {
  const N = WW * HEIGHT;
  const sky = new Uint8Array(N), blk = new Uint8Array(N);
  computeLight(vol, sky, blk);

  const solid = new Buf(), water = new Buf();
  const P = new Float32Array(12), UV = new Float32Array(8), LIT = new Uint8Array(16), TINT = new Uint8Array(16);

  const get = (x, y, z) => (y < 0 ? 1 : y >= HEIGHT ? 0 : vol[x + z * W + y * WW]);
  const li = (x, y, z) => x + z * W + y * WW;

  for (let y = 0; y < HEIGHT; y++) for (let z = PAD; z < PAD + CHUNK; z++) for (let x = PAD; x < PAD + CHUNK; x++) {
    const i = x + z * W + y * WW;
    const b = vol[i];
    const r = RENDER[b];
    if (!r) continue;
    const lx = x - PAD, lz = z - PAD;

    if (r === 2) { torch(solid, lx, y, lz, sky[i], blk[i], b); continue; }
    if (r === 4) { boxes(solid, lx, y, lz, b, sky[i], blk[i], (dx, dy, dz) => OPAQUE[get(x + dx, y + dy, z + dz)], tintAt); continue; }
    if (r === 5) { cross(solid, lx, y, lz, b, sky[i], blk[i], tintAt); continue; }
    const liq = LIQ[b];
    // altura de la superficie del líquido
    let lh = 1;
    if (liq && LIQ[get(x, y + 1, z)] !== liq) lh = 0.875 * (8 - LIQ_LEVEL[b]) / 8 + (LIQ_LEVEL[b] ? 0.02 : 0);

    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
      const nb = get(nx, ny, nz);
      if (r === 3) { // líquido
        if (LIQ[nb] === liq || OPAQUE[nb]) continue;
      } else {
        if (OPAQUE[nb]) continue;
        if (nb === b && !OPAQUE[b] && b !== 16) continue; // vidrio contra vidrio
      }
      let tile = f === 2 ? TEX_TOP[b] : f === 3 ? TEX_BOTTOM[b] : f === 4 ? TEX_FRONT[b] : TEX_SIDE[b];
      const tu = tileU(tile), tv = tileV(tile);
      const e = 0.00002;
      let aoSum = [0, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const v = F.v[k];
        let vy = v[1];
        if (liq && vy === 1) vy = lh;
        P[k * 3] = lx + v[0]; P[k * 3 + 1] = y + vy; P[k * 3 + 2] = lz + v[2];
        UV[k * 2] = tu + (FACE_UV[k][0] ? TS - e : e);
        UV[k * 2 + 1] = 1 - (tv + (FACE_UV[k][1] ? TS - e : e));
        // luz suave: 4 celdas alrededor del vértice en el plano de la cara
        const ax = [0, 0, 0], ay = [0, 0, 0];
        // elegir dos ejes tangentes y sus signos para este vértice
        let t1, t2;
        if (F.n[0] !== 0) { t1 = [0, v[1] ? 1 : -1, 0]; t2 = [0, 0, v[2] ? 1 : -1]; }
        else if (F.n[1] !== 0) { t1 = [v[0] ? 1 : -1, 0, 0]; t2 = [0, 0, v[2] ? 1 : -1]; }
        else { t1 = [v[0] ? 1 : -1, 0, 0]; t2 = [0, v[1] ? 1 : -1, 0]; }
        const s1x = nx + t1[0], s1y = ny + t1[1], s1z = nz + t1[2];
        const s2x = nx + t2[0], s2y = ny + t2[1], s2z = nz + t2[2];
        const cx_ = nx + t1[0] + t2[0], cy_ = ny + t1[1] + t2[1], cz_ = nz + t1[2] + t2[2];
        const o1 = OPAQUE[get(s1x, s1y, s1z)], o2 = OPAQUE[get(s2x, s2y, s2z)];
        const oc = o1 && o2 ? 1 : OPAQUE[get(cx_, cy_, cz_)];
        const ao = r === 3 ? 3 : 3 - (o1 + o2 + oc);
        let ss = 0, sb = 0, cnt = 0;
        const add = (X, Y, Z) => {
          if (Y < 0 || Y >= HEIGHT) { if (Y >= HEIGHT) { ss += 15; cnt++; } return; }
          const j = li(X, Y, Z);
          if (OPAQUE[vol[j]]) return;
          ss += sky[j]; sb += blk[j]; cnt++;
        };
        if (ny >= HEIGHT) { ss = 15; sb = 0; cnt = 1; }
        else {
          const j = ny >= 0 ? li(nx, ny, nz) : -1;
          if (j >= 0) { ss += sky[j]; sb += Math.max(blk[j], OPAQUE[vol[j]] ? 0 : 0); cnt++; }
          if (!o1) add(s1x, s1y, s1z);
          if (!o2) add(s2x, s2y, s2z);
          if (!oc) add(cx_, cy_, cz_);
        }
        if (cnt === 0) cnt = 1;
        LIT[k * 4] = Math.round(ss / cnt * 17);
        LIT[k * 4 + 1] = liq === 3 ? 255 : Math.round(sb / cnt * 17);
        LIT[k * 4 + 2] = Math.round((0.45 + ao * 0.55 / 3) * 255);
        LIT[k * 4 + 3] = Math.round(F.shade * 255);
        if (tintAt) { const c = tintAt(lx + v[0], lz + v[2]); TINT[k * 4] = c[0]; TINT[k * 4 + 1] = c[1]; TINT[k * 4 + 2] = c[2]; } else TINT.set(WHITE.subarray(k * 4, k * 4 + 4), k * 4);
        aoSum[k] = ao + (ss + sb) / cnt * 0.01;
      }
      const flip = aoSum[0] + aoSum[2] < aoSum[1] + aoSum[3];
      (r === 3 && liq !== 3 ? water : solid).quad(P, UV, LIT, flip, tile, f, TINT);
    }
  }
  return { solid: solid.out(), water: water.out() };
}

// Cajas arbitrarias (losas, puertas, escaleras, cables...). Coordenadas en 16avos.
const BOX_FACES = [
  // [normal, vértices como índices de (x0|x1, y0|y1, z0|z1), shade]
  [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], 0.8],
  [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], 0.8],
  [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], 1.0],
  [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], 0.5],
  [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], 0.9],
  [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], 0.7],
];
function boxes(buf, x, y, z, b, s, bl, opaqueAt, tintAt) {
  const P = new Float32Array(12), UV = new Float32Array(8), LIT = new Uint8Array(16), TINT = new Uint8Array(16);
  for (const bx of BOXES[b]) {
    const c = [[bx[0] / 16, bx[3] / 16], [bx[1] / 16, bx[4] / 16], [bx[2] / 16, bx[5] / 16]];
    BOX_FACES.forEach(([n, vs, shade], f) => {
      // cara pegada al borde del bloque y vecino opaco: no se ve
      const onEdge = (n[0] === 1 && c[0][1] === 1) || (n[0] === -1 && c[0][0] === 0) || (n[1] === 1 && c[1][1] === 1) || (n[1] === -1 && c[1][0] === 0) || (n[2] === 1 && c[2][1] === 1) || (n[2] === -1 && c[2][0] === 0);
      if (onEdge && opaqueAt(n[0], n[1], n[2])) return;
      const tile = bx[6] ?? (f === 2 ? TEX_TOP[b] : f === 3 ? TEX_BOTTOM[b] : f === 4 ? TEX_FRONT[b] : TEX_SIDE[b]);
      const tu = tileU(tile), tv = tileV(tile);
      for (let k = 0; k < 4; k++) {
        const v = vs[k];
        const px = c[0][v[0]], py = c[1][v[1]], pz = c[2][v[2]];
        P[k * 3] = x + px; P[k * 3 + 1] = y + py; P[k * 3 + 2] = z + pz;
        // UV: proyección de la cara sobre el tile
        let u, w;
        if (n[0] !== 0) { u = n[0] > 0 ? 1 - pz : pz; w = 1 - py; }
        else if (n[1] !== 0) { u = px; w = pz; }
        else { u = n[2] > 0 ? px : 1 - px; w = 1 - py; }
        UV[k * 2] = tu + Math.min(0.999, Math.max(0.001, u)) * TS;
        UV[k * 2 + 1] = 1 - (tv + Math.min(0.999, Math.max(0.001, w)) * TS);
        LIT[k * 4] = s * 17; LIT[k * 4 + 1] = bl * 17; LIT[k * 4 + 2] = 255; LIT[k * 4 + 3] = Math.round(shade * 255);
        if (tintAt) TINT.set(tintAt(x + px, z + pz), k * 4); else TINT.set([128, 128, 128], k * 4);
        TINT[k * 4 + 3] = 255;
      }
      buf.quad(P, UV, LIT, false, tile, f, TINT, true);
    });
  }
}

// Plantas: dos planos en diagonal, visibles de ambos lados
function cross(buf, x, y, z, b, s, bl, tintAt) {
  const tile = TEX_SIDE[b];
  const tu = tileU(tile), tv = tileV(tile);
  const P = new Float32Array(12), UV = new Float32Array(8), LIT = new Uint8Array(16), TINT = new Uint8Array(16);
  const c0 = tintAt ? tintAt(x + 0.5, z + 0.5) : [128, 128, 128];
  for (let k = 0; k < 4; k++) TINT.set([c0[0], c0[1], c0[2], 255], k * 4);
  const e = 0.00002;
  UV.set([tu + e, 1 - (tv + TS - e), tu + TS - e, 1 - (tv + TS - e), tu + TS - e, 1 - (tv + e), tu + e, 1 - (tv + e)]);
  for (let k = 0; k < 4; k++) { LIT[k * 4] = s * 17; LIT[k * 4 + 1] = bl * 17; LIT[k * 4 + 2] = 255; LIT[k * 4 + 3] = 230; }
  const planes = [[[0.1, 0.1], [0.9, 0.9]], [[0.1, 0.9], [0.9, 0.1]]];
  for (const [[ax, az], [bx, bz]] of planes) {
    const pts = [[ax, 0, az], [bx, 0, bz], [bx, 1, bz], [ax, 1, az]];
    for (let k = 0; k < 4; k++) { P[k * 3] = x + pts[k][0]; P[k * 3 + 1] = y + pts[k][1]; P[k * 3 + 2] = z + pts[k][2]; }
    buf.quad(P, UV, LIT, false, tile, 6, TINT);
    // cara trasera
    const P2 = new Float32Array(12), UV2 = new Float32Array(8);
    const order = [1, 0, 3, 2];
    for (let k = 0; k < 4; k++) { const o = order[k]; P2.set([P[o * 3], P[o * 3 + 1], P[o * 3 + 2]], k * 3); UV2.set([UV[k * 2], UV[k * 2 + 1]], k * 2); }
    buf.quad(P2, UV2, LIT, false, tile, 6, TINT);
  }
}

function torch(buf, x, y, z, s, bl, b) {
  const tile = TEX_SIDE[b];
  const tu = tileU(tile), tv = tileV(tile);
  const a = 7 / 16, c = 9 / 16, h = 10 / 16;
  const P = new Float32Array(12), UV = new Float32Array(8), LIT = new Uint8Array(16);
  const u0 = tu + 7 / 16 * TS, u1 = tu + 9 / 16 * TS;
  const v0 = 1 - (tv + 6 / 16 * TS), v1 = 1 - (tv + TS);
  const quads = [
    [[c, 0, c], [c, 0, a], [c, h, a], [c, h, c]],
    [[a, 0, a], [a, 0, c], [a, h, c], [a, h, a]],
    [[a, 0, c], [c, 0, c], [c, h, c], [a, h, c]],
    [[c, 0, a], [a, 0, a], [a, h, a], [c, h, a]],
    [[a, h, c], [c, h, c], [c, h, a], [a, h, a]],
  ];
  // pared: base pegada al muro, subida y el palo inclinado hacia afuera
  const dx = TORCH_DIR[b * 2], dz = TORCH_DIR[b * 2 + 1];
  const wall = dx !== 0 || dz !== 0;
  quads.forEach((qv, qi) => {
    for (let k = 0; k < 4; k++) {
      let vx = qv[k][0], vy = qv[k][1], vz = qv[k][2];
      if (wall) {
        const lean = -0.36 + vy * 0.5;
        vx += dx * lean; vz += dz * lean; vy += 0.22;
      }
      P[k * 3] = x + vx; P[k * 3 + 1] = y + vy; P[k * 3 + 2] = z + vz;
      LIT[k * 4] = s * 17; LIT[k * 4 + 1] = 255; LIT[k * 4 + 2] = 255; LIT[k * 4 + 3] = 255;
    }
    if (qi === 4) { UV.set([u0, 1 - (tv + 6 / 16 * TS), u1, 1 - (tv + 6 / 16 * TS), u1, 1 - (tv + 8 / 16 * TS), u0, 1 - (tv + 8 / 16 * TS)]); }
    else UV.set([u0, v1, u1, v1, u1, v0, u0, v0]);
    buf.quad(P, UV, LIT, false, tile, 7);
  });
}
