// Texturas procedurales en 32×32 + mapas de material (relieve, brillo, máscara de tinte y emisión) + íconos.
// Los dibujos "clásicos" usan coordenadas de 16 (se amplían a 2×2 y se les suma detalle fino);
// los "HD" dibujan directo en 32 con ruido tileable, celdas y alturas propias.
import { TILES, BLOCKS, ITEMS, isBlock, T, ATLAS, tileRect } from './blocks.js';
import { mulberry32 } from './noise.js';

const S = 16; // unidades de los dibujos clásicos
const R = ATLAS.res; // resolución real
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const clamp = (v, a = 0, b = 255) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scl = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function makeTile(draw, seed) {
  const rgba = new Float32Array(R * R * 4);
  const hgt = new Float32Array(R * R);
  const tint = new Uint8Array(R * R);
  const emis = new Float32Array(R * R);
  const spec = new Float32Array(R * R).fill(-1);
  const hd = new Float32Array(R * R);
  let hasH = false;
  const rnd = mulberry32(seed * 9973 + 17);
  const W = (v) => ((v % R) + R) % R;
  const I = (x, y) => W(y) * R + W(x);
  // --- nivel nativo (32) ---
  const P = (x, y, c, a = 255) => { const i = I(x | 0, y | 0) * 4; rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = a; };
  const G = (x, y) => { const i = I(x | 0, y | 0) * 4; return [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]]; };
  const Hs = (x, y, h) => { hgt[I(x | 0, y | 0)] = h; hasH = true; };
  const Hg = (x, y) => hgt[I(x | 0, y | 0)];
  const Ms = (x, y, v = 1) => { tint[I(x | 0, y | 0)] = v; };
  const Es = (x, y, v = 1) => { emis[I(x | 0, y | 0)] = v; };
  const Ss = (x, y, v) => { spec[I(x | 0, y | 0)] = v; };
  const Hd = (x, y, v) => { hd[I(x | 0, y | 0)] += v; };
  const shadeN = (x, y, k) => { const c = G(x, y); P(x, y, scl(c, k), c[3]); };
  // ruido de valor tileable (período en celdas)
  const lat = new Map();
  const lattice = (per, salt) => {
    const k = per * 1000 + salt;
    let g = lat.get(k);
    if (!g) { const r = mulberry32(seed * 131 + per * 7 + salt * 977); g = new Float32Array(per * per); for (let i = 0; i < g.length; i++) g[i] = r(); lat.set(k, g); }
    return g;
  };
  const vnoise = (x, y, per, salt = 0) => {
    const g = lattice(per, salt), cs = R / per;
    const fx = x / cs, fy = y / cs, ix = Math.floor(fx), iy = Math.floor(fy);
    let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const at = (a, b) => g[(((b % per) + per) % per) * per + (((a % per) + per) % per)];
    return lerp(lerp(at(ix, iy), at(ix + 1, iy), tx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), tx), ty);
  };
  // ruido anisótropo tileable: celdas distintas en x e y (vetas, chorreaduras)
  const alat = new Map();
  const anoise = (x, y, px_, py_, salt = 0) => {
    const k = px_ * 100000 + py_ * 100 + salt;
    let g = alat.get(k);
    if (!g) { const r = mulberry32(seed * 197 + px_ * 13 + py_ * 71 + salt * 911); g = new Float32Array(px_ * py_); for (let i = 0; i < g.length; i++) g[i] = r(); alat.set(k, g); }
    const fx = x / (R / px_), fy = y / (R / py_), ix = Math.floor(fx), iy = Math.floor(fy);
    let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const at = (a, b) => g[(((b % py_) + py_) % py_) * px_ + (((a % px_) + px_) % px_)];
    return lerp(lerp(at(ix, iy), at(ix + 1, iy), tx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), tx), ty);
  };
  const fbm = (x, y, per = 4, oct = 4, salt = 0) => { let s = 0, a = 1, n = 0; for (let o = 0; o < oct && per <= R; o++) { s += vnoise(x, y, per, salt + o) * a; n += a; a *= 0.5; per *= 2; } return s / n; };
  // celdas (Worley) tileables: devuelve {f1, f2, id, cx, cy}
  const cells = (x, y, per, salt = 0, jitter = 0.8) => {
    const g = lattice(per, 500 + salt), g2 = lattice(per, 900 + salt), cs = R / per;
    const fx = x / cs, fy = y / cs, ix = Math.floor(fx), iy = Math.floor(fy);
    let f1 = 9, f2 = 9, id = 0, bx = 0, by = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = ix + i, cy = iy + j, wi = ((cy % per) + per) % per * per + ((cx % per) + per) % per;
      const px = cx + 0.5 + (g[wi] - 0.5) * jitter, py = cy + 0.5 + (g2[wi] - 0.5) * jitter;
      const d = Math.hypot(fx - px, fy - py);
      if (d < f1) { f2 = f1; f1 = d; id = wi; bx = px; by = py; } else if (d < f2) f2 = d;
    }
    return { f1, f2, id, rid: g[id], cx: bx * cs, cy: by * cs };
  };
  const fill = (fn) => { for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const r = fn(x, y); if (r) P(x, y, r.c ?? r, r.a ?? 255); } };
  const clear = () => rgba.fill(0);
  // --- nivel clásico (16) ---
  const px = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= S || y >= S) return; x = Math.round(x) * 2; y = Math.round(y) * 2; P(x, y, c, a); P(x + 1, y, c, a); P(x, y + 1, c, a); P(x + 1, y + 1, c, a); };
  const get = (x, y) => G(x * 2, y * 2);
  const noise = (base, v, a = 255) => {
    const c = hex(base), o = rnd() * 100;
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
      const k = 1 + (rnd() - 0.5) * v * 0.7 + (fbm(x + o, y, 4, 3, 3) - 0.5) * v * 0.9;
      P(x, y, [c[0] * k, c[1] * k, c[2] * k], a);
    }
  };
  const speck = (col, n, size = 1) => {
    const c = hex(col);
    for (let i = 0; i < n * 2; i++) {
      const x = (rnd() * R) | 0, y = (rnd() * R) | 0, r = size * 1.1 + rnd() * 0.6;
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
        const d = Math.hypot(a, b);
        if (d > r || rnd() < 0.15) continue;
        const k = 1.08 - d / (r + 1) * 0.2;
        const old = G(x + a, y + b);
        P(x + a, y + b, scl(c, k), old[3] || 255);
      }
    }
  };
  const blob = (col, n) => {
    const c = hex(col);
    for (let i = 0; i < n; i++) {
      let x = 4 + rnd() * 24, y = 4 + rnd() * 24;
      for (let k = 0; k < 11; k++) {
        const s = 0.85 + rnd() * 0.3;
        for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) P(x + a, y + b, scl(c, s));
        x += rnd() * 2.4 - 1.2; y += rnd() * 2.4 - 1.2;
      }
    }
  };
  const shade = (x, y, k) => { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) shadeN(x * 2 + a, y * 2 + b, k); };
  const t = { px, get, noise, speck, blob, shade, rnd, hex, P, G, H: Hs, Hg, Hd, M: Ms, E: Es, S: Ss, fill, clear, vnoise, anoise, fbm, cells, shadeN, R };
  draw(t);
  // sin altura propia: la luminancia hace de relieve
  if (!hasH) for (let i = 0; i < R * R; i++) hgt[i] = (rgba[i * 4] * 0.3 + rgba[i * 4 + 1] * 0.55 + rgba[i * 4 + 2] * 0.15) / 255;
  for (let i = 0; i < R * R; i++) hgt[i] += hd[i];
  return { rgba, hgt, tint, emis, spec, hasH };
}

// grietas finas (nivel nativo)
const crackLine = (t, k) => {
  for (let n = 0; n < k; n++) {
    let x = t.rnd() * 32, y = t.rnd() * 32;
    let ang = t.rnd() * Math.PI * 2;
    const len = 6 + ((t.rnd() * 12) | 0);
    for (let i = 0; i < len; i++) {
      t.P(x, y, scl(t.G(x, y), 0.45), 255); t.Hd(x, y, -0.35);
      ang += (t.rnd() - 0.5) * 0.9; x += Math.cos(ang); y += Math.sin(ang);
    }
  }
};

const DRAW = {
  bedrock: (t) => { t.noise(0x2a2a2e, 0.6); t.speck(0x111114, 30, 2); },
  stone: (t) => { t.noise(0x6e6a66, 0.18); t.speck(0x57534f, 18, 2); t.speck(0x827d78, 10); },
  deepstone: (t) => { t.noise(0x46464e, 0.2); t.speck(0x35353c, 20, 2); },
  dirt: (t) => { t.noise(0x5a4632, 0.25); t.speck(0x46372a, 20); t.speck(0x6e5842, 8); },
  deadgrass_top: (t) => { t.noise(0x6b6440, 0.3); t.speck(0x7d7248, 25); t.speck(0x4f4a30, 18); t.speck(0x5a4632, 10); },
  deadgrass_side: (t) => {
    t.noise(0x5a4632, 0.25); t.speck(0x46372a, 15);
    for (let x = 0; x < 16; x++) { const d = 2 + ((t.rnd() * 3) | 0); for (let y = 0; y < d; y++) t.px(x, y, t.hex(t.rnd() < 0.5 ? 0x6b6440 : 0x5e5838)); }
  },
  ash: (t) => { t.noise(0x8a847c, 0.14); t.speck(0x9c968d, 20); t.speck(0x6e6962, 14); },
  mud: (t) => { t.noise(0x3d3a26, 0.25); t.speck(0x4c4a2c, 16, 2); t.speck(0x2c2a1c, 12); },
  gravel: (t) => { t.noise(0x6a655f, 0.2); for (let i = 0; i < 22; i++) { const c = [0x7f7a73, 0x55514c, 0x8d877f][i % 3]; t.speck(c, 1, 2); } },
  concrete: (t) => { t.noise(0x8e8b86, 0.08); t.speck(0x7c7974, 12); t.speck(0xa19e98, 6); },
  concrete_cracked: (t) => { t.noise(0x86837e, 0.1); t.speck(0x6f6c68, 12); crackLine(t, 3); t.speck(0x5b4a2e, 4); },
  asphalt: (t) => { t.noise(0x2f2e2d, 0.18); t.speck(0x444240, 16); crackLine(t, 1); },
  rust: (t) => { t.noise(0x7a3f1f, 0.3); t.blob(0x9a5428, 6); t.blob(0x4e2a16, 5); t.speck(0x5c5a58, 6); for (let x = 0; x < 16; x++) { t.shade(x, 0, 1.2); t.shade(x, 15, 0.7); } },
  brick: (t) => {
    t.noise(0x7e4a3a, 0.2);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = y >> 2, off = row % 2 ? 4 : 0;
      if (y % 4 === 3 || (x + off) % 8 === 7) t.px(x, y, t.hex(0x6f6a62));
    }
    t.speck(0x4e2e24, 10);
  },
  glass: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [170, 190, 180], 40);
    for (let i = 0; i < 16; i++) { t.px(i, 0, [200, 210, 200], 200); t.px(i, 15, [120, 130, 120], 200); t.px(0, i, [200, 210, 200], 200); t.px(15, i, [120, 130, 120], 200); }
    for (let i = 3; i < 8; i++) t.px(i, i - 1, [230, 240, 235], 140);
    for (let i = 0; i < 6; i++) t.px(9 + (i % 3), 10 + i, [60, 60, 55], 160);
  },
  log_side: (t) => {
    t.noise(0x4a4038, 0.2);
    for (let x = 0; x < 16; x += 3 + ((t.rnd() * 2) | 0)) for (let y = 0; y < 16; y++) t.shade(x, y, 0.7);
    t.speck(0x5c524a, 8);
  },
  log_top: (t) => {
    t.noise(0x6b5d4c, 0.12);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 7) t.px(x, y, t.hex(0x4a4038)); else if (Math.floor(d) % 2) t.shade(x, y, 0.8);
    }
  },
  branches: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    for (let n = 0; n < 7; n++) {
      let x = (t.rnd() * 16) | 0, y = (t.rnd() * 16) | 0;
      const dx = t.rnd() < 0.5 ? -1 : 1;
      for (let i = 0; i < 7; i++) {
        t.px(x, y, t.hex(t.rnd() < 0.7 ? 0x3e3530 : 0x584a3c));
        y--; if (t.rnd() < 0.5) x += dx;
        if (x < 0 || x > 15 || y < 0) break;
      }
    }
    t.speck(0x5c5436, 6);
  },
  toxic_water: (t) => { t.noise(0x6d8c2a, 0.2, 200); t.speck(0x93b83a, 14); t.speck(0x4c6420, 10); },
  coal_ore: (t) => { DRAW.stone(t); t.blob(0x1c1b1b, 5); },
  scrap_ore: (t) => { DRAW.stone(t); t.blob(0x8a4a24, 3); t.blob(0x9a9a9e, 3); },
  copper_ore: (t) => { DRAW.stone(t); t.blob(0xc27a3e, 3); t.blob(0x3e9a7c, 2); },
  uranium_ore: (t) => { DRAW.deepstone(t); t.blob(0x9cff3a, 4); t.speck(0xe0ff9a, 6); },
  trinitite: (t) => { t.noise(0x4f7a4a, 0.3); t.speck(0x7cc26a, 18); t.speck(0x2a3e28, 14, 2); },
  planks: (t) => {
    t.noise(0x7a6448, 0.12);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (y % 4 === 3) t.shade(x, y, 0.6);
      if ((x + ((y >> 2) * 5)) % 16 === 0) t.shade(x, y, 0.7);
    }
    t.speck(0x5a4a36, 10);
  },
  bench_top: (t) => { DRAW.planks(t); for (let i = 2; i < 14; i++) { t.px(i, 7, t.hex(0x9a9a9e)); t.px(7, i, t.hex(0x7a7a7e)); } },
  bench_side: (t) => { DRAW.planks(t); for (let x = 0; x < 16; x++) t.px(x, 1, t.hex(0x4a3a2a)); for (let y = 4; y < 12; y++) { t.px(3, y, t.hex(0x8a8a90)); t.px(12, y, t.hex(0x6e4a2a)); } t.px(2, 4, t.hex(0x8a8a90)); t.px(4, 4, t.hex(0x8a8a90)); },
  furnace_side: (t) => { DRAW.stone(t); for (let x = 0; x < 16; x++) { t.shade(x, 0, 0.7); t.shade(x, 15, 0.7); } },
  furnace_top: (t) => { DRAW.stone(t); for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) t.px(x, y, t.hex(0x222020)); },
  furnace_front: (t) => {
    DRAW.furnace_side(t);
    for (let y = 8; y < 14; y++) for (let x = 4; x < 12; x++) t.px(x, y, t.hex(y > 11 ? (t.rnd() < 0.5 ? 0xff9a2a : 0xd94a1a) : 0x1a1818));
    for (let x = 3; x < 13; x++) t.px(x, 7, t.hex(0x3a3836));
  },
  torch: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    for (let y = 6; y < 16; y++) { t.px(7, y, t.hex(0x6b5234)); t.px(8, y, t.hex(0x55412a)); }
    t.px(7, 6, t.hex(0xffd84a)); t.px(8, 6, t.hex(0xff9a2a)); t.px(7, 7, t.hex(0xff9a2a)); t.px(8, 7, t.hex(0xffd84a));
  },
  metal_plate: (t) => {
    t.noise(0x8c8f94, 0.08);
    for (let i = 0; i < 16; i++) { t.shade(i, 0, 1.2); t.shade(0, i, 1.2); t.shade(i, 15, 0.7); t.shade(15, i, 0.7); }
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) t.px(x, y, t.hex(0x55585c));
    t.blob(0x7a4a2a, 1);
  },
  lamp: (t) => {
    t.noise(0xb8ff6a, 0.15);
    for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0xa06a3a)); t.px(i, 15, t.hex(0xa06a3a)); t.px(0, i, t.hex(0xa06a3a)); t.px(15, i, t.hex(0xa06a3a)); }
    for (let i = 5; i < 11; i++) for (let j = 5; j < 11; j++) t.px(i, j, t.hex(0xeaffc0));
  },
  barrel_side: (t) => {
    t.noise(0xa08a1a, 0.18);
    for (let x = 0; x < 16; x++) { t.px(x, 2, t.hex(0x5a4e14)); t.px(x, 13, t.hex(0x5a4e14)); }
    // símbolo radiactivo simple
    for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 3 && ((Math.atan2(y - 7.5, x - 7.5) + 3.2) * 3 / Math.PI | 0) % 2 === 0) t.px(x, y, t.hex(0x1c1c14)); }
    t.blob(0x6a3a1a, 2);
  },
  barrel_top: (t) => { t.noise(0x8a7614, 0.15); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 3) t.px(x, y, t.hex(0x7cff3a)); },
  rubble: (t) => { t.noise(0x77736d, 0.2); t.speck(0x8e8b86, 12, 2); t.speck(0x55524d, 12, 2); t.speck(0x7e4a3a, 5); },
  crate_side: (t) => {
    t.noise(0x806a4a, 0.12);
    for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x4e3e2a)); t.px(i, 15, t.hex(0x4e3e2a)); t.px(0, i, t.hex(0x4e3e2a)); t.px(15, i, t.hex(0x4e3e2a)); t.px(i, i, t.hex(0x5e4a32)); }
  },
  crate_top: (t) => { DRAW.crate_side(t); },
  cot_top: (t) => {
    t.noise(0x5e6a4a, 0.12);
    for (let x = 0; x < 16; x++) { t.px(x, 0, t.hex(0x6b5234)); t.px(x, 15, t.hex(0x6b5234)); }
    for (let y = 1; y < 5; y++) for (let x = 2; x < 14; x++) t.px(x, y, t.hex(0xb8b0a0));
    for (let y = 6; y < 15; y += 3) for (let x = 0; x < 16; x++) t.shade(x, y, 0.8);
  },
  cot_side: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    for (let y = 4; y < 8; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex(y === 4 ? 0x6e7a56 : 0x5e6a4a));
    for (let y = 8; y < 16; y++) { t.px(1, y, t.hex(0x6b5234)); t.px(14, y, t.hex(0x6b5234)); }
    for (let x = 0; x < 16; x++) t.px(x, 8, t.hex(0x55412a));
  },
  // ---------- v4 ----------
  chest_side: (t) => { DRAW.planks(t); for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x4e3e2a)); t.px(i, 15, t.hex(0x4e3e2a)); t.px(0, i, t.hex(0x4e3e2a)); t.px(15, i, t.hex(0x4e3e2a)); t.px(i, 5, t.hex(0x5a5048)); } },
  chest_front: (t) => { DRAW.chest_side(t); for (let y = 4; y < 9; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(y === 4 || y === 8 ? 0x55585c : 0xa8acb2)); t.px(7, 6, t.hex(0x222222)); t.px(8, 6, t.hex(0x222222)); },
  chest_top: (t) => { DRAW.planks(t); for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x4e3e2a)); t.px(i, 15, t.hex(0x4e3e2a)); t.px(0, i, t.hex(0x4e3e2a)); t.px(15, i, t.hex(0x4e3e2a)); } },
  farmland: (t) => { t.noise(0x4a3626, 0.2); for (let y = 1; y < 16; y += 4) for (let x = 0; x < 16; x++) { t.shade(x, y, 0.6); t.shade(x, y + 1, 1.15); } },
  clean_water: (t) => { t.noise(0x3a7ab8, 0.15, 190); t.speck(0x6ab0e0, 14); t.speck(0x2a5a90, 8); },
  lava: (t) => { t.noise(0xd84a1a, 0.25); t.blob(0xffb03a, 6); t.blob(0x9cff3a, 2); t.speck(0x8a1a0a, 10); },
  ladder: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    for (let y = 0; y < 16; y++) { t.px(2, y, t.hex(0x6b5234)); t.px(3, y, t.hex(0x55412a)); t.px(12, y, t.hex(0x6b5234)); t.px(13, y, t.hex(0x55412a)); }
    for (let y = 2; y < 16; y += 4) for (let x = 2; x < 14; x++) { t.px(x, y, t.hex(0x7a6448)); t.px(x, y + 1, t.hex(0x55412a)); }
  },
  door_metal: (t) => {
    t.noise(0x7a7e84, 0.1);
    for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x4a4e54)); t.px(i, 15, t.hex(0x4a4e54)); t.px(0, i, t.hex(0x4a4e54)); t.px(15, i, t.hex(0x4a4e54)); }
    for (let y = 3; y < 7; y++) for (let x = 3; x < 13; x++) t.px(x, y, [60, 70, 70], 255);
    t.px(12, 9, t.hex(0x2a2a2a)); t.px(12, 10, t.hex(0x2a2a2a)); t.blob(0x7a4a2a, 2);
  },
  bulb_off: (t) => { t.noise(0x5a5e62, 0.1); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) t.px(x, y, t.hex(0x8a8a70)); t.px(6, 6, t.hex(0xb0b09a)); },
  bulb_on: (t) => { t.noise(0x5a5e62, 0.1); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) t.px(x, y, t.hex(Math.hypot(x - 7.5, y - 7.5) < 3 ? 0xffffe0 : 0xffe89a)); },
  cable: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex((x + y) % 4 < 2 ? 0x3a2a1a : 0xc27a3e)); },
  generator_side: (t) => { t.noise(0x5e6a4a, 0.12); for (let y = 2; y < 16; y += 3) for (let x = 2; x < 14; x++) t.shade(x, y, 0.7); for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x3a3a30)); t.px(i, 15, t.hex(0x3a3a30)); } },
  generator_front: (t) => { DRAW.generator_side(t); for (let y = 5; y < 11; y++) for (let x = 4; x < 12; x++) t.px(x, y, t.hex(0x1a1818)); t.px(6, 8, t.hex(0xffc23a)); t.px(9, 8, t.hex(0x9cff3a)); },
  solar_top: (t) => { t.noise(0x1e2a4a, 0.1); for (let i = 0; i < 16; i++) { t.px(i, 5, t.hex(0x8a9ab0)); t.px(i, 10, t.hex(0x8a9ab0)); t.px(5, i, t.hex(0x8a9ab0)); t.px(10, i, t.hex(0x8a9ab0)); } t.speck(0x3a5a9a, 10); },
  fence: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex((x + y) % 3 ? 0x8a8e94 : 0x5a5e62)); t.speck(0xffe03a, 3); },
  mill_side: (t) => { DRAW.stone(t); for (let x = 0; x < 16; x++) { t.px(x, 3, t.hex(0x4a4640)); t.px(x, 12, t.hex(0x4a4640)); } },
  mill_front: (t) => { DRAW.mill_side(t); for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) t.px(x, y, t.hex(0xd8b060)); for (let x = 5; x < 11; x++) t.px(x, 8, t.hex(0x6b5234)); },
  mill_top: (t) => { DRAW.stone(t); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6 && d > 5) t.px(x, y, t.hex(0x4a4640)); if (d < 1.5) t.px(x, y, t.hex(0x6b5234)); } },
  kettle_side: (t) => {
    t.noise(0xc27a3e, 0.12);
    for (let x = 0; x < 16; x++) { t.shade(x, 0, 1.3); t.shade(x, 1, 1.15); t.shade(x, 14, 0.7); t.shade(x, 15, 0.6); }
    for (let y = 0; y < 16; y++) { t.shade(0, y, 0.75); t.shade(15, y, 0.75); t.shade(3, y, 1.25); }
    for (let y = 9; y < 13; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(0x5a3a1a));
    t.blob(0x3e9a7c, 1);
  },
  kettle_top: (t) => { t.noise(0xc27a3e, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 5.5) t.px(x, y, t.hex(0xd8a040)); },
  fermenter_side: (t) => {
    DRAW.planks(t);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (y % 5 === 2) t.px(x, y, t.hex(0x6a6e74));
    for (let y = 5; y < 11; y++) t.px(11, y, t.hex(0xd8a040));
  },
  fermenter_top: (t) => { DRAW.planks(t); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(0x9aa0a6)); t.px(7, 5, t.hex(0xeeeeee)); t.px(8, 4, t.hex(0xeeeeee)); },
  medcrate_side: (t) => { t.noise(0xdad6cc, 0.06); for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x8a8680)); t.px(i, 15, t.hex(0x8a8680)); t.px(0, i, t.hex(0x8a8680)); t.px(15, i, t.hex(0x8a8680)); } for (let i = 4; i < 12; i++) for (let j = 6; j < 10; j++) { t.px(i, j, t.hex(0xc8302a)); t.px(j, i, t.hex(0xc8302a)); } },
  medcrate_top: (t) => { DRAW.medcrate_side(t); },
  tile_white: (t) => { t.noise(0xd8d8d0, 0.05); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (x % 8 === 0 || y % 8 === 0) t.px(x, y, t.hex(0x9a9a92)); t.speck(0x8a8a70, 4); crackLine(t, 1); },
  grass_top: (t) => { t.noise(0x5a7a34, 0.25); t.speck(0x6e9040, 25); t.speck(0x44602a, 18); t.speck(0x8a8a3a, 6); },
  grass_side: (t) => {
    t.noise(0x5a4632, 0.25); t.speck(0x46372a, 15);
    for (let x = 0; x < 16; x++) { const d = 2 + ((t.rnd() * 4) | 0); for (let y = 0; y < d; y++) t.px(x, y, t.hex(t.rnd() < 0.5 ? 0x5a7a34 : 0x4a6a2a)); }
  },
  post: (t) => { t.noise(0x6b5234, 0.15); for (let y = 0; y < 16; y++) { t.shade(5, y, 0.75); t.shade(10, y, 0.75); } },
  oak_barrel_side: (t) => {
    t.noise(0x7a5230, 0.12);
    for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) t.shade(x, y, 0.75);
    for (let x = 0; x < 16; x++) { t.px(x, 2, t.hex(0x3a3a3a)); t.px(x, 13, t.hex(0x3a3a3a)); }
  },
  oak_barrel_top: (t) => { t.noise(0x8a6038, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 7) t.px(x, y, t.hex(0x3a3a3a)); } t.px(4, 8, t.hex(0x2a1a10)); },
  brewcrate_side: (t) => {
    t.noise(0x8a6a44, 0.12);
    for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x4e3e2a)); t.px(i, 15, t.hex(0x4e3e2a)); t.px(0, i, t.hex(0x4e3e2a)); t.px(15, i, t.hex(0x4e3e2a)); }
    // botellas marrones
    for (const bx of [3, 7, 11]) for (let y = 5; y < 13; y++) { t.px(bx, y, t.hex(0x5a3010)); t.px(bx + 1, y, t.hex(0x7a4418)); if (y < 7) { t.px(bx, y, t.hex(0x3a2008)); } }
  },
  brewcrate_top: (t) => { DRAW.brewcrate_side(t); },
  rail: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    for (let y = 1; y < 16; y += 4) for (let x = 1; x < 15; x++) t.px(x, y, t.hex(0x5a4030));
    for (let y = 0; y < 16; y++) { t.px(4, y, t.hex(0x9aa0a6)); t.px(11, y, t.hex(0x9aa0a6)); }
  },
  pump: (t) => {
    t.noise(0xb83a2a, 0.12);
    for (let y = 3; y < 8; y++) for (let x = 4; x < 12; x++) t.px(x, y, t.hex(0x1a1a1a));
    for (let x = 5; x < 11; x++) t.px(x, 5, t.hex(0xffc23a));
    for (let y = 10; y < 14; y++) t.px(12, y, t.hex(0x222222));
    t.blob(0x6a3a1a, 3);
  },
  lattice: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    for (let i = 0; i < 16; i++) { t.px(i, i, t.hex(0x8a5a30)); t.px(15 - i, i, t.hex(0x8a5a30)); t.px(0, i, t.hex(0x9a6a3a)); t.px(15, i, t.hex(0x9a6a3a)); t.px(i, 0, t.hex(0x9a6a3a)); t.px(i, 15, t.hex(0x9a6a3a)); }
  },
  sign_brew: (t) => {
    DRAW.planks(t);
    for (let y = 3; y < 13; y++) for (let x = 5; x < 11; x++) t.px(x, y, t.hex(y < 5 ? 0xf0e8d0 : 0xd8a040));
    for (let y = 5; y < 11; y++) { t.px(11, y, t.hex(0xd8a040)); } t.px(12, 6, t.hex(0xd8a040)); t.px(12, 9, t.hex(0xd8a040)); t.px(13, 7, t.hex(0xd8a040)); t.px(13, 8, t.hex(0xd8a040));
  },
  // ---------- v5 ----------
  cask_side: (t) => { DRAW.oak_barrel_side(t); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(0x3a2a18)); t.px(7, 8, t.hex(0xc8a030)); },
  cask_top: (t) => { DRAW.oak_barrel_top(t); t.px(7, 7, t.hex(0xc8a030)); t.px(8, 7, t.hex(0xc8a030)); },
  tap_side: (t) => { DRAW.bar_side(t); },
  tap_front: (t) => {
    DRAW.bar_side(t);
    for (const x of [4, 8, 12]) { for (let y = 2; y < 9; y++) t.px(x, y, t.hex(0xc8ccd2)); t.px(x - 1, 2, t.hex(0xd8a040)); t.px(x + 1, 2, t.hex(0xd8a040)); t.px(x, 1, t.hex(0x2a2a2a)); }
  },
  bar_top: (t) => { t.noise(0x6a4428, 0.08); for (let x = 0; x < 16; x++) { t.shade(x, 0, 1.3); t.shade(x, 15, 0.7); } for (let y = 3; y < 16; y += 4) for (let x = 0; x < 16; x++) t.shade(x, y, 0.85); },
  bar_side: (t) => { t.noise(0x5a3820, 0.1); for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) t.shade(x, y, 0.75); for (let x = 0; x < 16; x++) { t.px(x, 0, t.hex(0x8a6038)); t.px(x, 14, t.hex(0xc8a030)); } },
  still_side: (t) => { DRAW.kettle_side(t); for (let y = 2; y < 14; y++) t.px(12, y, t.hex(0x8a5a2a)); for (let x = 12; x < 16; x++) t.px(x, 2, t.hex(0x8a5a2a)); },
  still_top: (t) => { DRAW.kettle_top(t); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(0x8a5a2a)); },
  fire: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const w = (15 - y) * 0.45 + 1, c = Math.abs(x - 7.5 + Math.sin(y * 0.9) * 1.5);
      if (c < w * (0.55 + t.rnd() * 0.3)) t.px(x, y, t.hex(y < 5 ? 0xffe070 : y < 10 ? 0xff9a2a : 0xd94a1a), 230);
    }
  },
  fridge_side: (t) => { t.noise(0xd8dad4, 0.05); for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0xa8aaa4)); t.px(0, i, t.hex(0xa8aaa4)); t.px(15, i, t.hex(0x8a8c86)); t.px(i, 15, t.hex(0x8a8c86)); } t.blob(0x9a6a3a, 1); },
  fridge_front: (t) => { DRAW.fridge_side(t); for (let x = 1; x < 15; x++) t.px(x, 6, t.hex(0x8a8c86)); for (let y = 2; y < 5; y++) t.px(12, y, t.hex(0x5a5c56)); for (let y = 8; y < 13; y++) t.px(12, y, t.hex(0x5a5c56)); },
  bookshelf: (t) => {
    DRAW.planks(t);
    for (const y0 of [1, 9]) for (let x = 1; x < 15; x++) {
      const c = [0x8a2a24, 0x2a4a8a, 0x3a6a2a, 0x8a7a2a, 0x5a3a6a][(x * 7 + y0) % 5];
      for (let y = y0; y < y0 + 6; y++) t.px(x, y, t.hex(c)); if (x % 3 === 0) for (let y = y0; y < y0 + 6; y++) t.shade(x, y, 0.7);
    }
  },
  painting: (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const sky = y < 8; t.px(x, y, t.hex(sky ? (y < 4 ? 0x3a5a8a : 0xc88a4a) : 0x6a5a3a));
    }
    for (let x = 3; x < 9; x++) for (let y = 5; y < 9; y++) if (Math.abs(x - 6) < 9 - y) t.px(x, y, t.hex(0x3a3028));
    t.px(12, 3, t.hex(0xffe070)); t.px(11, 3, t.hex(0xffe070));
    for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x8a6a2a)); t.px(i, 15, t.hex(0x8a6a2a)); t.px(0, i, t.hex(0x8a6a2a)); t.px(15, i, t.hex(0x8a6a2a)); }
  },
  curtain: (t) => { t.noise(0x7a2a2a, 0.08); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) t.shade(x, y, 0.75); for (let x = 0; x < 16; x++) t.px(x, 0, t.hex(0xc8a030)); },
  cloth: (t) => { t.noise(0x9a8a6a, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0) t.shade(x, y, 0.85); },
  belt: (t) => {
    t.noise(0x2a2a2a, 0.15);
    for (let x = 0; x < 16; x++) { t.px(x, 0, t.hex(0x8a8e94)); t.px(x, 15, t.hex(0x8a8e94)); }
    for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) { const y = 3 + k * 4 + (i < 2 ? 0 : 0); t.px(8 - i, y + i, t.hex(0xe0c23a)); t.px(8 + i, y + i, t.hex(0xe0c23a)); }
  },
  hopper_side: (t) => { t.noise(0x5a5e62, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.abs(x - 7.5) > 7.5 - y * 0.3) t.shade(x, y, 0.6); },
  hopper_top: (t) => { t.noise(0x5a5e62, 0.1); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) t.px(x, y, t.hex(0x1a1a1a)); },
  lever_off: (t) => { DRAW.stone(t); for (let y = 4; y < 12; y++) t.px(4 + Math.floor((y - 4) / 2), y, t.hex(0x6b5234)); t.px(3, 4, t.hex(0x8a2a24)); },
  lever_on: (t) => { DRAW.stone(t); for (let y = 4; y < 12; y++) t.px(11 - Math.floor((y - 4) / 2), y, t.hex(0x6b5234)); t.px(12, 4, t.hex(0x9cff3a)); },
  detector_off: (t) => { t.noise(0x4a4e54, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 4) t.px(x, y, t.hex(0x3a1010)); },
  detector_on: (t) => { t.noise(0x4a4e54, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 4) t.px(x, y, t.hex(0xff4a2a)); },
  alarm_off: (t) => { t.noise(0x6a1a14, 0.12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 5) t.px(x, y, t.hex(0x8a2a24)); },
  alarm_on: (t) => { t.noise(0xd83a2a, 0.12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 5) t.px(x, y, t.hex(0xff8a6a)); },
  turret_side: (t) => { t.noise(0x4e5a42, 0.12); for (let x = 0; x < 16; x++) { t.px(x, 4, t.hex(0x2a2e26)); t.px(x, 11, t.hex(0x2a2e26)); } for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(0x111111)); },
  turret_top: (t) => { t.noise(0x4e5a42, 0.12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 5) t.shade(x, y, 0.7); for (let y = 1; y < 8; y++) { t.px(7, y, t.hex(0x111111)); t.px(8, y, t.hex(0x111111)); } },
  totem: (t) => { t.noise(0x3a3a4a, 0.1); for (let y = 0; y < 16; y++) { t.px(7, y, t.hex(0x9cff3a)); t.px(8, y, t.hex(0x9cff3a)); } for (let x = 3; x < 13; x++) { t.px(x, 4, t.hex(0x9cff3a)); t.px(x, 11, t.hex(0x9cff3a)); } },
  mycelium_top: (t) => { t.noise(0x6a5a7a, 0.2); t.speck(0x8a7a9a, 18); t.speck(0x9ae0ff, 5); },
  mycelium_side: (t) => { t.noise(0x5a4632, 0.25); for (let x = 0; x < 16; x++) { const d = 2 + ((t.rnd() * 3) | 0); for (let y = 0; y < d; y++) t.px(x, y, t.hex(0x6a5a7a)); } },
  mush_stem: (t) => { t.noise(0xd8d0c0, 0.08); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) t.shade(x, y, 0.9); },
  mush_cap_blue: (t) => { t.noise(0x3a8ad8, 0.15); t.speck(0x9ae0ff, 14, 2); t.speck(0x2a5a9a, 8); },
  mush_cap_purple: (t) => { t.noise(0x8a3ad8, 0.15); t.speck(0xe09aff, 14, 2); t.speck(0x5a2a9a, 8); },
  snow_top: (t) => { t.noise(0xb8b8b4, 0.07); t.speck(0x9a9a96, 10); t.speck(0x6a6a66, 4); },
  snow_side: (t) => { t.noise(0x5a4632, 0.25); for (let x = 0; x < 16; x++) { const d = 3 + ((t.rnd() * 3) | 0); for (let y = 0; y < d; y++) t.px(x, y, t.hex(0xb0b0ac)); } },
  ice: (t) => { t.noise(0x8aa8b8, 0.08); crackLine(t, 2); t.speck(0xd0e0e8, 6); },
  kerb: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex(Math.floor(x / 4) % 2 ? 0xe8e8e8 : 0xc8302a)); crackLine(t, 1); },
  track: (t) => { t.noise(0x3a3a3c, 0.12); t.speck(0x4a4a4c, 12); },
  start_line: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 0xf0f0f0 : 0x151515)); },
  start_light: (t) => {
    t.noise(0x2a2a2a, 0.1);
    for (const [cy, c] of [[3, 0xff3a2a], [8, 0xffc23a], [13, 0x9cff3a]]) for (let y = cy - 2; y <= cy + 1; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(c));
  },
  tires: (t) => { t.noise(0x1e1e1e, 0.15); for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) t.px(x, y, t.hex(0x3a3a3a)); t.speck(0xe8e8e8, 3); },
  pit_floor: (t) => { t.noise(0x9a9a98, 0.06); for (let x = 0; x < 16; x++) t.px(x, 0, t.hex(0xe0c23a)); },
  reactor: (t) => { t.noise(0x2a3a4a, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 5) t.px(x, y, t.hex(d < 2.5 ? 0xeaffc0 : 0x9cff3a)); } },
  spikes: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex(0x3a3a3a)); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) if (y > 12 - (x % 6)) t.px(x, y, t.hex(0xa8acb2)); },
  tavern_sign: (t) => {
    DRAW.planks(t);
    for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) t.px(x, y, t.hex(0x2a1a10));
    for (let y = 5; y < 11; y++) for (let x = 5; x < 9; x++) t.px(x, y, t.hex(0xd8a040));
    for (let x = 5; x < 9; x++) t.px(x, 5, t.hex(0xf0e8d0)); for (let y = 6; y < 10; y++) t.px(9, y, t.hex(0xd8a040)); t.px(10, 7, t.hex(0xd8a040)); t.px(10, 8, t.hex(0xd8a040));
  },
  grandstand: (t) => { t.noise(0x8e8b86, 0.06); for (let x = 0; x < 16; x++) for (let y = 4; y < 12; y++) t.px(x, y, t.hex(Math.floor(x / 4) % 2 ? 0x2a5a9a : 0x9a2a2a)); },
  // ---------- v6 ----------
  press_side: (t) => { DRAW.metal_plate(t); for (let y = 4; y < 12; y++) { t.px(4, y, t.hex(0x3a3a3a)); t.px(11, y, t.hex(0x3a3a3a)); } for (let x = 4; x < 12; x++) t.px(x, 7, t.hex(0x6a6e74)); },
  press_top: (t) => { DRAW.metal_plate(t); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 3) t.px(x, y, t.hex(0xc8a030)); },
  safe_side: (t) => { t.noise(0x4a5a4a, 0.08); for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x2a3a2a)); t.px(i, 15, t.hex(0x2a3a2a)); t.px(0, i, t.hex(0x2a3a2a)); t.px(15, i, t.hex(0x2a3a2a)); } },
  safe_front: (t) => { DRAW.safe_side(t); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 4 && d > 2.8) t.px(x, y, t.hex(0xc8ccd2)); } t.px(7, 7, t.hex(0xe0c23a)); t.px(8, 8, t.hex(0xe0c23a)); },
  flame: (t) => { DRAW.fire(t); },
  mine_top: (t) => { DRAW.dirt(t); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.px(x, y, t.hex(0x3a3a2a)); t.px(7, 7, t.hex(0x8a8e94)); },
  garage_side: (t) => { t.noise(0x5a5e62, 0.08); for (let y = 2; y < 14; y += 2) for (let x = 2; x < 14; x++) t.px(x, y, t.hex(0x3a3e42)); for (let x = 0; x < 16; x++) t.px(x, 0, t.hex(0xe0c23a)); },
  garage_top: (t) => { t.noise(0x6a6e72, 0.08); for (let i = 3; i < 13; i++) { t.px(i, i, t.hex(0x8a8e94)); t.px(15 - i, i, t.hex(0xc8302a)); } },
  flag_check: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 0xe0c23a : 0x1a1a1a)); },
  flag_start: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 0xf0f0f0 : 0x151515)); },
  cone: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.hex(y % 6 < 2 ? 0xf0f0f0 : 0xe8601a)); },
  pipe: (t) => { t.noise(0x8a8e94, 0.08); for (let x = 0; x < 16; x++) { t.shade(x, 0, 1.3); t.shade(x, 15, 0.6); } for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) t.px(x, y, t.hex(0x5a5e62)); },
  pump_side: (t) => { t.noise(0x3a6a9a, 0.1); for (let y = 4; y < 12; y++) for (let x = 5; x < 11; x++) t.px(x, y, t.hex(0x8a8e94)); t.px(7, 7, t.hex(0x6ab0e0)); t.px(8, 8, t.hex(0x6ab0e0)); },
  pump_top: (t) => { t.noise(0x3a6a9a, 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) < 3) t.px(x, y, t.hex(0x8a8e94)); },
  sprinkler: (t) => { t.noise(0x8a8e94, 0.1); t.speck(0x6ab0e0, 6); },
  elevator_top: (t) => { t.noise(0x6a6e72, 0.06); for (let i = 3; i < 13; i++) { t.px(7, i, t.hex(0xe0c23a)); t.px(8, i, t.hex(0xe0c23a)); } for (let i = 0; i < 3; i++) { t.px(6 - i, 5 + i, t.hex(0xe0c23a)); t.px(9 + i, 5 + i, t.hex(0xe0c23a)); t.px(6 - i, 10 - i, t.hex(0xe0c23a)); t.px(9 + i, 10 - i, t.hex(0xe0c23a)); } },
  elevator_side: (t) => { DRAW.metal_plate(t); for (let y = 0; y < 16; y++) t.px(7, y, t.hex(0x3a3e42)); },
  sign: (t) => { t.noise(0x8a6a44, 0.1); for (let i = 0; i < 16; i++) { t.px(i, 0, t.hex(0x5a4028)); t.px(i, 15, t.hex(0x5a4028)); } for (let y = 4; y < 13; y += 3) for (let x = 3; x < 13; x++) if (t.rnd() < 0.7) t.px(x, y, t.hex(0x3a2a1a)); },
  sand_toxic: (t) => { t.noise(0xa8a070, 0.12); t.speck(0x9ab04a, 12); t.speck(0x8a8058, 10); },
  hull: (t) => { t.noise(0x5a4a3a, 0.2); t.blob(0x8a4a24, 5); for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) t.shade(x, y, 0.75); t.speck(0x3a3a3a, 8); },
  mil_fence: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0); for (let i = 0; i < 16; i++) { t.px(i, i, t.hex(0x8a8e94)); t.px(15 - i, i, t.hex(0x8a8e94)); t.px(0, i, t.hex(0x6a6e72)); t.px(15, i, t.hex(0x6a6e72)); } for (let x = 0; x < 16; x += 3) t.px(x, 0, t.hex(0xc8ccd2)); },
  camo: (t) => { t.noise(0x5a6a3a, 0.1); t.blob(0x3a4a2a, 6); t.blob(0x7a6a4a, 5); },
  abyss: (t) => { t.noise(0x1e1a24, 0.25); t.speck(0x3a2a4a, 14, 2); t.speck(0x6a3a8a, 4); },
  portal: (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); t.px(x, y, t.hex(d < 3 ? 0xe0a0ff : d < 6 ? 0x8a3ad8 : 0x2a1a3a)); } },
  asphalt_under: (t) => { DRAW.asphalt(t); },
  sandbag: (t) => {
    t.noise(0x8a7c5a, 0.12);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = y >> 2, off = row % 2 ? 4 : 0;
      if (y % 4 === 3 || (x + off) % 8 === 0) t.shade(x, y, 0.65);
    }
  },
};
const plant = (stage, stalk, head, headH) => (t) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
  const h = 4 + stage * 4;
  for (let s = 0; s < 5; s++) {
    const x = 1 + s * 3 + ((t.rnd() * 2) | 0);
    const hh = h - ((t.rnd() * 3) | 0);
    for (let y = 0; y < hh; y++) t.px(x, 15 - y, t.hex(stalk));
    if (stage >= 2) for (let y = hh - headH; y < hh; y++) { t.px(x, 15 - y, t.hex(head)); if (stage === 3) t.px(x + 1, 15 - y, t.hex(head)); }
  }
};
const tintGlass = (col) => (t) => {
  const c = t.hex(col);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, c, 110);
  for (let i = 0; i < 16; i++) { t.px(i, 0, c, 230); t.px(i, 15, c, 230); t.px(0, i, c, 230); t.px(15, i, c, 230); }
  for (let i = 3; i < 8; i++) t.px(i, i - 1, [240, 240, 240], 150);
};
DRAW.glass_red = tintGlass(0xd83a2a); DRAW.glass_green = tintGlass(0x5ad83a); DRAW.glass_blue = tintGlass(0x3a7ad8);
DRAW.glass_yellow = tintGlass(0xe8d03a);
DRAW.glass_cyan = tintGlass(0x3ac8d0); DRAW.glass_sky = tintGlass(0x8ac0f0); DRAW.glass_pink = tintGlass(0xf08ac0); DRAW.glass_white = tintGlass(0xf0f0ea); DRAW.glass_smoke = tintGlass(0x3a3a40); DRAW.glass_lime = tintGlass(0xa8e83a); DRAW.glass_purple = tintGlass(0x9a3ad8); DRAW.glass_orange = tintGlass(0xe8883a);
for (let s = 0; s < 4; s++) {
  DRAW['barley' + s] = plant(s, s < 3 ? 0x6a8a34 : 0xb89a4a, s < 3 ? 0x8aa04a : 0xe0c060, 4);
  DRAW['potato' + s] = (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    const h = 3 + s * 3;
    for (let n = 0; n < 7; n++) {
      const x = 2 + ((t.rnd() * 12) | 0), y = 15 - ((t.rnd() * h) | 0);
      t.px(x, y, t.hex(0x4a7a2a)); t.px(x + 1, y, t.hex(0x5a8a34)); t.px(x, y - 1, t.hex(0x3a6a22));
    }
    for (let y = 15 - h; y < 16; y++) t.px(7, y, t.hex(0x4a6a2a));
    if (s === 3) for (let i = 0; i < 3; i++) t.px(4 + i * 4, 14, t.hex(0xb89a60));
  };
  DRAW['hops' + s] = (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    const h = 4 + s * 4;
    for (let y = 0; y < h; y++) { const x = 7 + Math.round(Math.sin(y * 0.8) * 2); t.px(x, 15 - y, t.hex(0x4a7a2a)); if (y % 3 === 0) { t.px(x - 2, 15 - y, t.hex(0x5a8a34)); t.px(x + 2, 15 - y, t.hex(0x5a8a34)); } }
    if (s >= 2) for (let n = 0; n < (s === 3 ? 6 : 3); n++) { const x = 3 + ((t.rnd() * 10) | 0), y = 15 - 2 - ((t.rnd() * (h - 3)) | 0); t.px(x, y, t.hex(0x9ad85a)); t.px(x, y + 1, t.hex(0x7ab84a)); t.px(x + 1, y, t.hex(0xb8e87a)); }
  };
}
for (let k = 0; k < 10; k++) {
  DRAW['crack' + k] = (t) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, [0, 0, 0], 0);
    const r = mulberry32(777);
    const lines = 1 + k * 2;
    for (let n = 0; n < lines; n++) {
      let x = 8, y = 8;
      const ang = r() * Math.PI * 2;
      const len = 3 + k * 0.7 + r() * 3;
      for (let i = 0; i < len; i++) {
        t.px(Math.round(x), Math.round(y), [0, 0, 0], 190);
        x += Math.cos(ang + (r() - 0.5)); y += Math.sin(ang + (r() - 0.5));
      }
    }
  };
}

// ---------- Texturas HD (32×32 nativas, con altura propia) ----------
// brillo especular por tile (0-1) y fuerza del relieve
const SPEC = {
  metal_plate: 0.55, door_metal: 0.5, rust: 0.12, glass: 0.9, ice: 0.75, clean_water: 0.9, toxic_water: 0.8, kettle_side: 0.6, kettle_top: 0.6,
  still_side: 0.6, still_top: 0.6, fridge_side: 0.45, fridge_front: 0.45, bulb_off: 0.4, solar_top: 0.85, tile_white: 0.4, hull: 0.18, pipe: 0.5,
  safe_side: 0.4, safe_front: 0.45, press_side: 0.5, press_top: 0.5, elevator_side: 0.5, elevator_top: 0.4, bar_top: 0.3, trinitite: 0.55,
  coal_ore: 0.08, mud: 0.2, abyss: 0.15, portal: 0.5, pump_side: 0.3, garage_side: 0.35, fence: 0.4, spikes: 0.5, generator_side: 0.2,
  turret_side: 0.25, mil_fence: 0.4, snow_top: 0.1, reactor: 0.4, lamp: 0.3, barrel_side: 0.25, cone: 0.2, tires: 0.1, asphalt: 0.04,
};
const BUMP = { glass: 0, clean_water: 0.6, toxic_water: 0.6, fire: 0, flame: 0, portal: 0.5, lava: 1.5, torch: 0, ladder: 1.5 };
// emisión en dibujos clásicos: qué píxeles brillan solos
const EMIT_CLASSIC = {
  lamp: 'all', bulb_on: 'bright', reactor: 'bright', alarm_on: 'bright', detector_on: 'bright', start_light: 'bright', barrel_top: 'bright',
  totem: 'green', fire: 'all', flame: 'all', furnace_front: 'warm', generator_front: 'bright', torch: 'warm', tavern_sign: 'none',
};

const HD = {};
const TAU = Math.PI * 2;
// piedra: placas con fisuras, grano fino
HD.stone = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 3, 0, 0.9), e = c.f2 - c.f1, n = t.fbm(x, y, 4, 4);
  const crack = e < 0.06 ? 1 - e / 0.06 : 0;
  const k = (0.8 + n * 0.32 + (c.rid - 0.5) * 0.12 + (t.rnd() - 0.5) * 0.07) * (1 - crack * 0.45);
  t.H(x, y, 0.4 + n * 0.3 + (1 - c.f1) * 0.25 - crack * 0.5);
  return scl([116, 111, 104], k);
});
HD.deepstone = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 4, 1, 0.9), e = c.f2 - c.f1, n = t.fbm(x, y, 4, 4, 2);
  const strata = Math.sin(y * 0.55 + n * 5) * 0.06;
  const crack = e < 0.07 ? 1 - e / 0.07 : 0;
  const k = (0.78 + n * 0.3 + strata + (c.rid - 0.5) * 0.1 + (t.rnd() - 0.5) * 0.06) * (1 - crack * 0.5);
  t.H(x, y, 0.45 + n * 0.3 + strata - crack * 0.55);
  return scl([76, 76, 88], k);
});
HD.bedrock = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 5, 3, 1), e = c.f2 - c.f1;
  const k = 0.55 + c.rid * 0.6 - (e < 0.1 ? 0.35 : 0) + (t.rnd() - 0.5) * 0.1;
  t.H(x, y, (1 - c.f1) * 0.8 - (e < 0.1 ? 0.4 : 0));
  return scl([52, 52, 58], k);
});
// tierra: grumos, piedritas y raíces
HD.dirt = (t) => {
  t.fill((x, y) => {
    const n = t.fbm(x, y, 4, 4), c = t.cells(x, y, 8, 5, 1);
    let col = scl([96, 72, 50], 0.78 + n * 0.4 + (t.rnd() - 0.5) * 0.12), h = 0.35 + n * 0.4;
    if (c.f1 < 0.22 && c.rid < 0.35) { const k = 1.15 - c.f1 * 1.2; col = scl([118, 106, 92], k); h = 0.8 - c.f1; }
    t.H(x, y, h);
    return col;
  });
  for (let i = 0; i < 3; i++) { let x = t.rnd() * 32, y = t.rnd() * 32, a = t.rnd() * TAU; for (let s = 0; s < 9; s++) { t.P(x, y, [58, 42, 30]); t.H(x, y, 0.2); a += (t.rnd() - 0.5) * 0.8; x += Math.cos(a); y += Math.sin(a); } }
};
// pasto: briznas y matas (se tiñe según el bioma)
const grassTop = (base, dirtAmt, tintK) => (t) => {
  t.fill((x, y) => {
    const n = t.fbm(x, y, 4, 3), m = t.fbm(x, y, 8, 2, 7);
    const bare = n < dirtAmt;
    if (bare) { t.H(x, y, 0.3 + m * 0.2); return scl([92, 72, 50], 0.8 + m * 0.35); }
    const blade = t.vnoise(x, y, 16, 11) > 0.55 ? 1.12 : 1;
    const k = (0.72 + m * 0.45 + (t.rnd() - 0.5) * 0.18) * blade;
    t.M(x, y, tintK); t.H(x, y, 0.5 + m * 0.3 + (blade - 1) * 2 + t.rnd() * 0.15);
    return scl(base, k);
  });
  // puntas de briznas más claras
  for (let i = 0; i < 70; i++) { const x = t.rnd() * 32 | 0, y = t.rnd() * 32 | 0; const c = t.G(x, y); if (c[1] > c[0]) { t.P(x, y, scl(c, 1.25)); t.P(x, y + 1, scl(c, 0.8)); } }
};
HD.grass_top = grassTop([88, 108, 64], 0.16, 255);
HD.deadgrass_top = grassTop([118, 108, 76], 0.3, 170);
const grassSide = (base, tintK, dirtTone) => (t) => {
  HD.dirt(t);
  for (let x = 0; x < 32; x++) {
    const d = 5 + Math.floor(t.fbm(x, 0, 8, 2, 4) * 5) + (t.rnd() < 0.12 ? 3 + (t.rnd() * 4 | 0) : 0);
    for (let y = 0; y < d; y++) {
      const k = (y === d - 1 ? 0.7 : 1) * (0.78 + t.rnd() * 0.35) * (y === 0 ? 1.15 : 1);
      t.P(x, y, scl(base, k)); t.M(x, y, tintK); t.H(x, y, 0.75 - y * 0.02);
    }
    t.shadeN(x, d, 0.72); // sombra debajo del pasto
  }
  void dirtTone;
};
HD.grass_side = grassSide([88, 108, 64], 255);
HD.deadgrass_side = grassSide([118, 108, 76], 170);
HD.ash = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 2, 4), rip = Math.sin((y + n * 10) * 0.7) * 0.5 + 0.5;
  t.H(x, y, n * 0.6 + rip * 0.2);
  return scl([140, 134, 126], 0.84 + n * 0.22 + rip * 0.06 + (t.rnd() - 0.5) * 0.08);
});
HD.sand_toxic = (t) => {
  t.fill((x, y) => {
    const n = t.fbm(x, y, 4, 3), rip = Math.sin((y * 0.8 + n * 8)) * 0.5 + 0.5;
    t.H(x, y, n * 0.4 + rip * 0.35);
    return scl([170, 160, 112], 0.82 + rip * 0.12 + n * 0.12 + (t.rnd() - 0.5) * 0.08);
  });
  for (let i = 0; i < 14; i++) { const x = t.rnd() * 32, y = t.rnd() * 32; t.P(x, y, [150, 184, 70]); t.E(x, y, 0.35); }
};
HD.mud = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 4), wet = n < 0.42;
  t.H(x, y, wet ? 0.25 : 0.35 + n * 0.5);
  t.S(x, y, wet ? 0.6 : 0.08);
  return scl(wet ? [50, 48, 32] : [66, 62, 40], 0.85 + t.fbm(x, y, 8, 2, 3) * 0.3 + (t.rnd() - 0.5) * 0.06);
});
// grava: piedritas redondeadas
HD.gravel = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 7, 2, 1), e = c.f2 - c.f1;
  const pal = [[128, 122, 114], [96, 92, 86], [140, 132, 120], [110, 98, 86]];
  const base = pal[(c.rid * 4) | 0];
  const k = e < 0.1 ? 0.42 : 1.12 - c.f1 * 0.55 + (t.rnd() - 0.5) * 0.08;
  t.H(x, y, e < 0.1 ? 0 : 1 - c.f1 * 0.9);
  return scl(base, k);
});
// hormigón: manchas, poros y chorreaduras
HD.concrete = (t) => {
  t.fill((x, y) => {
    const n = t.fbm(x, y, 4, 4), streak = t.anoise(x, y, 16, 2, 9);
    let k = 0.9 + n * 0.14 - Math.max(0, streak - 0.6) * 0.3 + (t.rnd() - 0.5) * 0.05;
    const pore = t.rnd() < 0.025;
    if (pore) k *= 0.7;
    t.H(x, y, 0.6 + n * 0.2 - (pore ? 0.4 : 0));
    return scl([146, 142, 136], k);
  });
  for (let x = 0; x < 32; x++) { t.shadeN(x, 0, 0.9); t.shadeN(x, 31, 0.9); }
};
HD.concrete_cracked = (t) => {
  HD.concrete(t);
  crackLine(t, 4);
  // musgo en las fisuras
  for (let i = 0; i < 40; i++) { const x = t.rnd() * 32, y = t.rnd() * 32; if (t.fbm(x, y, 4, 2, 5) > 0.6) t.P(x, y, [86, 104, 58]); }
};
HD.asphalt = (t) => {
  t.fill((x, y) => {
    const n = t.fbm(x, y, 4, 3), g = t.rnd();
    const stone = g < 0.09;
    t.H(x, y, 0.4 + n * 0.2 + (stone ? 0.35 : 0));
    return stone ? scl([96, 94, 90], 0.8 + t.rnd() * 0.4) : scl([50, 49, 48], 0.85 + n * 0.3);
  });
  crackLine(t, 1);
};
HD.asphalt_under = HD.asphalt;
HD.track = (t) => {
  HD.asphalt(t);
  for (let i = 0; i < 3; i++) { const y0 = t.rnd() * 32; for (let x = 0; x < 32; x++) for (let w = 0; w < 3; w++) t.shadeN(x, y0 + Math.sin(x * 0.2 + i) * 2 + w, 0.75); }
};
// óxido en capas con escamas y chorreaduras
HD.rust = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 4), c = t.cells(x, y, 5, 4, 1), e = c.f2 - c.f1;
  const drip = t.anoise(x, y, 16, 2, 6);
  const rust = n + (drip - 0.5) * 0.4;
  let col = rust > 0.5 ? mixc([148, 78, 36], [96, 46, 22], (rust - 0.5) * 2) : mixc([96, 92, 88], [148, 78, 36], rust * 2);
  if (e < 0.05) col = scl(col, 0.6);
  t.S(x, y, rust < 0.4 ? 0.35 : 0.05);
  t.H(x, y, 0.5 + (rust - 0.5) * 0.4 + (e < 0.05 ? -0.3 : 0) + t.rnd() * 0.1);
  return scl(col, 0.9 + (t.rnd() - 0.5) * 0.15);
});
// ladrillos: 4 hiladas, junta rehundida, tono por ladrillo
HD.brick = (t) => t.fill((x, y) => {
  const row = y >> 3, off = row % 2 ? 8 : 0, bx = (x + off) >> 4;
  const lx = (x + off) % 16, ly = y % 8;
  const mortar = ly === 7 || lx === 15;
  const r = mulberry32(row * 31 + bx * 7 + 5)();
  if (mortar) { t.H(x, y, 0.1); return scl([120, 114, 104], 0.85 + t.rnd() * 0.2); }
  const n = t.fbm(x, y, 8, 3);
  let k = 0.82 + r * 0.25 + (n - 0.5) * 0.2 + (t.rnd() - 0.5) * 0.08;
  if (ly === 0 || lx === 0) k *= 1.1; if (ly === 6 || lx === 14) k *= 0.85;
  const chip = t.rnd() < 0.015;
  t.H(x, y, 0.7 + n * 0.2 - (chip ? 0.3 : 0) - (ly === 6 || lx === 14 ? 0.1 : 0));
  return scl(mixc([132, 70, 52], [104, 60, 46], r), chip ? k * 0.8 : k);
});
HD.glass = (t) => {
  t.fill((x, y) => {
    const d = (x + y) % 32;
    const refl = (d > 6 && d < 10) || (d > 13 && d < 15) ? 70 : 0;
    const dirt = y > 24 ? (y - 24) * 8 * t.fbm(x, y, 8, 2) : 0;
    return { c: [170 + refl * 0.5 - dirt * 0.6, 196 + refl * 0.4 - dirt * 0.5, 190 + refl * 0.3 - dirt * 0.7], a: 42 + refl + dirt * 2 };
  });
  for (let i = 0; i < 32; i++) { t.P(i, 0, [210, 216, 210], 230); t.P(0, i, [210, 216, 210], 230); t.P(i, 31, [110, 118, 112], 230); t.P(31, i, [110, 118, 112], 230); t.P(i, 1, [180, 190, 184], 180); t.P(1, i, [180, 190, 184], 180); }
  for (let x = 0; x < 32; x++) for (let y = 0; y < 32; y++) t.H(x, y, x < 2 || y < 2 || x > 29 || y > 29 ? 1 : 0.5);
};
// madera: corteza, anillos, tablas con veta
HD.log_side = (t) => t.fill((x, y) => {
  const ridge = t.anoise(x, y, 8, 2, 1) * 0.6 + t.anoise(x, y, 16, 4, 2) * 0.4;
  const groove = ridge < 0.35;
  const moss = t.fbm(x, y, 4, 2, 3) > 0.72;
  t.H(x, y, groove ? 0.1 : ridge);
  const col = moss ? [74, 84, 50] : [84, 70, 58];
  return scl(col, (groove ? 0.55 : 0.8 + ridge * 0.45) + (t.rnd() - 0.5) * 0.08);
});
HD.log_top = (t) => t.fill((x, y) => {
  const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy) + t.fbm(x, y, 4, 2) * 2.2;
  if (d > 13.5) { t.H(x, y, 0.8 * t.rnd()); return scl([72, 60, 50], 0.7 + t.rnd() * 0.4); }
  const ring = Math.sin(d * 1.7) * 0.5 + 0.5;
  const crack = Math.abs(Math.atan2(dy, dx) - 0.7) < 0.08 && d > 3;
  t.H(x, y, crack ? 0 : 0.55 + ring * 0.2);
  return crack ? [52, 40, 30] : scl([150, 124, 92], 0.72 + ring * 0.25 + (t.rnd() - 0.5) * 0.05);
});
HD.planks = (t) => t.fill((x, y) => {
  const p = y >> 3, ly = y % 8;
  const seamX = (p * 13 + 7) % 32;
  const r = mulberry32(p * 17 + (x < seamX ? 1 : 2))();
  const grain = t.anoise(x, y, 2, 16, p + 3) * 0.5 + t.anoise(x, y, 4, 32, p + 9) * 0.3;
  const knot = Math.hypot(x - (p * 9 + 20) % 32, (y - p * 8 - 4) * 1.4) < 1.8;
  const gap = ly === 7 || x === seamX;
  const nail = (ly === 3 || ly === 4) && (Math.abs(x - seamX) === 3 || Math.abs(x - seamX) === 29) && (ly === 3);
  if (gap) { t.H(x, y, 0.05); return [52, 40, 28]; }
  if (nail) { t.H(x, y, 0.9); t.S(x, y, 0.4); return [70, 72, 76]; }
  let k = 0.78 + grain * 0.4 + (r - 0.5) * 0.18 + (ly === 0 ? 0.08 : 0) - (ly === 6 ? 0.1 : 0);
  if (knot) k *= 0.6;
  t.H(x, y, 0.55 + grain * 0.3 - (ly === 6 ? 0.1 : 0));
  return scl([138, 110, 76], k);
});
HD.crate_side = (t) => {
  HD.planks(t);
  for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [i, 1], [i, 30], [i, 31], [0, i], [1, i], [30, i], [31, i]]) { t.P(x, y, scl([96, 74, 50], 0.8 + t.rnd() * 0.2)); t.H(x, y, 1); }
  for (let i = 2; i < 30; i++) for (let w = 0; w < 2; w++) { t.P(i, i + w, scl([110, 86, 58], 0.9 + t.rnd() * 0.15)); t.H(i, i + w, 0.95); }
};
HD.crate_top = HD.crate_side;
// minerales: vetas facetadas sobre piedra
const ore = (col, dark, n, glow = 0, base = 'stone') => (t) => {
  HD[base](t);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const c = t.cells(x, y, 5, 7, 0.9);
    if (c.rid < n && c.f1 < 0.34) {
      const facet = ((x - c.cx) * 0.7 - (y - c.cy) * 0.7) > 0 ? 1.2 : 0.85;
      const k = (1.15 - c.f1 * 1.2) * facet * (0.9 + t.rnd() * 0.2);
      t.P(x, y, scl(t.rnd() < 0.3 ? dark : col, k)); t.H(x, y, 0.95 - c.f1);
      if (glow) t.E(x, y, glow * (1 - c.f1 * 2));
    } else if (glow && c.rid < n && c.f1 < 0.5) t.P(x, y, mixc(t.G(x, y), col, 0.25));
  }
};
HD.coal_ore = ore([40, 38, 38], [18, 18, 18], 0.45);
HD.scrap_ore = (t) => { ore([150, 84, 40], [120, 120, 126], 0.35)(t); };
HD.copper_ore = ore([198, 124, 64], [62, 154, 124], 0.38);
HD.uranium_ore = ore([156, 255, 58], [224, 255, 154], 0.4, 1, 'deepstone');
HD.trinitite = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 3), c = t.cells(x, y, 6, 8, 1);
  const bubble = c.f1 < 0.18 && c.rid < 0.4;
  t.H(x, y, bubble ? 0.2 : 0.5 + n * 0.4);
  return bubble ? [40, 70, 40] : scl([82, 130, 76], 0.7 + n * 0.5 + (t.rnd() - 0.5) * 0.08);
});
// chapa de metal con bisel y remaches
HD.metal_plate = (t) => {
  t.fill((x, y) => {
    const brush = t.anoise(x, y, 2, 32, 3) * 0.5 + t.anoise(x, y, 4, 16, 4) * 0.2;
    let k = 0.85 + brush * 0.2;
    if (x < 2 || y < 2) k *= 1.2; if (x > 29 || y > 29) k *= 0.7;
    t.H(x, y, x < 2 || y < 2 || x > 29 || y > 29 ? 0.3 : 0.6 + brush * 0.1);
    return scl([140, 144, 150], k);
  });
  for (const [cx, cy] of [[5, 5], [26, 5], [5, 26], [26, 26]]) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const d = Math.hypot(dx, dy); if (d > 2.2) continue;
    t.P(cx + dx, cy + dy, scl([110, 114, 120], 1.25 - (dx + dy) * 0.1)); t.H(cx + dx, cy + dy, 1 - d * 0.15);
  }
  for (let i = 0; i < 30; i++) { const x = t.rnd() < 0.5 ? t.rnd() * 5 : 27 + t.rnd() * 5, y = t.rnd() * 32; t.P(x, y, [122, 74, 42]); t.S(x, y, 0.05); }
};
HD.hull = (t) => {
  t.fill((x, y) => {
    const n = t.fbm(x, y, 4, 3), drip = t.anoise(x, y, 16, 2, 4);
    const rust = n * 0.6 + drip * 0.5 > 0.62;
    const paint = t.fbm(x, y, 2, 2, 8) > 0.55;
    const seam = y % 16 === 15 || (x + (y >> 4) * 8) % 16 === 0;
    t.H(x, y, seam ? 0.2 : 0.6 + n * 0.2);
    t.S(x, y, rust ? 0.05 : 0.3);
    const base = paint ? [92, 40, 34] : [88, 90, 92];
    return scl(rust ? mixc(base, [130, 70, 36], 0.7) : base, (seam ? 0.6 : 0.85 + n * 0.3) + (t.rnd() - 0.5) * 0.08);
  });
  for (let x = 4; x < 32; x += 8) for (const y of [2, 13, 18, 29]) { t.P(x, y, [150, 150, 150]); t.H(x, y, 1); }
};
HD.camo = (t) => t.fill((x, y) => {
  const a = t.fbm(x, y, 2, 3, 1), b = t.fbm(x, y, 2, 3, 2);
  const col = a > 0.58 ? [58, 70, 44] : b > 0.55 ? [120, 106, 76] : [88, 100, 62];
  t.H(x, y, 0.5 + (t.rnd() - 0.5) * 0.2);
  return scl(col, 0.9 + (t.rnd() - 0.5) * 0.12);
});
// agua y lava (animadas en el shader)
const liquid = (c1, c2, a) => (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 4, 2, 1), e = c.f2 - c.f1, n = t.fbm(x, y, 4, 2);
  const caustic = e < 0.1 ? (1 - e / 0.1) : 0;
  t.H(x, y, n * 0.5 + caustic * 0.3);
  return { c: mixc(c1, c2, caustic * 0.7 + n * 0.3), a };
});
HD.clean_water = liquid([46, 104, 168], [120, 180, 220], 190);
HD.toxic_water = liquid([92, 124, 36], [160, 200, 70], 205);
HD.lava = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 4, 3, 1), e = c.f2 - c.f1, n = t.fbm(x, y, 8, 2);
  const hot = e < 0.14 ? 1 - e / 0.14 : 0;
  const col = hot > 0 ? mixc([230, 90, 20], [255, 224, 120], hot) : scl([110, 30, 12], 0.7 + n * 0.6);
  t.E(x, y, 0.55 + hot * 0.45);
  t.H(x, y, hot > 0 ? 0.2 : 0.7 + n * 0.2);
  return col;
});
HD.snow_top = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 3);
  const sparkle = t.rnd() < 0.03;
  t.S(x, y, sparkle ? 1 : 0.08); t.H(x, y, n * 0.6);
  return scl([226, 232, 238], 0.86 + n * 0.14 + (sparkle ? 0.1 : 0));
});
HD.snow_side = (t) => {
  HD.dirt(t);
  for (let x = 0; x < 32; x++) { const d = 7 + Math.floor(t.fbm(x, 0, 8, 2, 3) * 5); for (let y = 0; y < d; y++) { t.P(x, y, scl([226, 232, 238], 0.85 + t.rnd() * 0.12 - (y === d - 1 ? 0.15 : 0))); t.H(x, y, 0.8); } t.shadeN(x, d, 0.75); }
};
HD.ice = (t) => {
  t.fill((x, y) => { const n = t.fbm(x, y, 4, 3); t.H(x, y, 0.6 + n * 0.1); return scl([150, 190, 214], 0.85 + n * 0.25); });
  for (let n = 0; n < 4; n++) { let x = t.rnd() * 32, y = t.rnd() * 32, a = t.rnd() * TAU; for (let i = 0; i < 14; i++) { t.P(x, y, [222, 238, 246]); t.H(x, y, 0.3); a += (t.rnd() - 0.5) * 0.5; x += Math.cos(a); y += Math.sin(a); } }
};
HD.farmland = (t) => t.fill((x, y) => {
  const fr = Math.sin(y / 8 * TAU) * 0.5 + 0.5, n = t.fbm(x, y, 4, 3);
  t.H(x, y, fr * 0.7 + n * 0.2); t.S(x, y, fr < 0.3 ? 0.3 : 0.05);
  return scl([74, 54, 38], 0.62 + fr * 0.45 + n * 0.15 + (t.rnd() - 0.5) * 0.08);
});
// hongos y micelio (con puntos que brillan de noche)
HD.mycelium_top = (t) => {
  t.fill((x, y) => { const n = t.fbm(x, y, 4, 3); t.H(x, y, n * 0.6 + t.rnd() * 0.2); return scl([108, 92, 124], 0.78 + n * 0.35 + (t.rnd() - 0.5) * 0.15); });
  for (let i = 0; i < 9; i++) { const x = t.rnd() * 32, y = t.rnd() * 32; for (const [a, b] of [[0, 0], [1, 0], [0, 1]]) { t.P(x + a, y + b, [150, 228, 255]); t.E(x + a, y + b, 0.8); } }
};
HD.mycelium_side = (t) => {
  HD.dirt(t);
  for (let x = 0; x < 32; x++) { const d = 5 + Math.floor(t.fbm(x, 0, 8, 2, 5) * 5); for (let y = 0; y < d; y++) { t.P(x, y, scl([108, 92, 124], 0.8 + t.rnd() * 0.3)); t.H(x, y, 0.7); } }
};
HD.mush_stem = (t) => t.fill((x, y) => { const f = t.anoise(x, y, 16, 2, 2); t.H(x, y, f); return scl([216, 208, 192], 0.82 + f * 0.2 + (t.rnd() - 0.5) * 0.05); });
const cap = (base, dot, dark) => (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 4, 6, 0.8), n = t.fbm(x, y, 4, 3);
  if (c.f1 < 0.2 && c.rid < 0.6) { t.E(x, y, 0.7); t.H(x, y, 0.95); return scl(dot, 1.05 - c.f1); }
  t.H(x, y, 0.5 + n * 0.3);
  return mixc(base, dark, (1 - n) * 0.5 + (t.rnd() - 0.5) * 0.1);
});
HD.mush_cap_blue = cap([58, 138, 216], [170, 232, 255], [30, 80, 150]);
HD.mush_cap_purple = cap([138, 58, 216], [236, 170, 255], [80, 30, 140]);
// el abismo: roca violácea con vetas que brillan
HD.abyss = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 4, 9, 1), e = c.f2 - c.f1, n = t.fbm(x, y, 4, 3);
  if (e < 0.05) { t.E(x, y, 0.5); t.H(x, y, 0.1); return [140, 80, 200]; }
  t.H(x, y, 0.5 + (1 - c.f1) * 0.3 + n * 0.2);
  return scl([38, 32, 46], 0.7 + n * 0.5 + c.rid * 0.2);
});
HD.portal = (t) => t.fill((x, y) => {
  const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  const sw = Math.sin(a * 3 + d * 0.5) * 0.5 + 0.5;
  t.E(x, y, 1); t.H(x, y, 0.5);
  return mixc(d < 6 ? [240, 190, 255] : [120, 50, 200], [40, 18, 70], clamp(d / 22 - sw * 0.3, 0, 1));
});
HD.tile_white = (t) => {
  t.fill((x, y) => {
    const grout = x % 16 === 15 || y % 16 === 15;
    const stain = t.fbm(x, y, 4, 3);
    t.H(x, y, grout ? 0.2 : 0.8); t.S(x, y, grout ? 0.02 : 0.45);
    return grout ? [130, 128, 118] : scl([220, 220, 212], 0.9 + (t.rnd() - 0.5) * 0.04 - Math.max(0, stain - 0.6) * 0.5);
  });
  crackLine(t, 1);
};
// ---------- v9.6: plantín ----------
HD.sapling = (t) => t.fill((x, y) => {
  const stem = Math.abs(x - 15.5) < 1.2 && y > 14;
  if (stem) { t.H(x, y, 0.6); return [110, 80, 46]; }
  const lobes = [[15.5, 9, 6], [10, 14, 4.5], [21, 13, 4.5]];
  for (const [cx, cy, r] of lobes) { const d = Math.hypot(x - cx, y - cy); if (d < r) { t.M(x, y, 150); t.H(x, y, 1 - d / r); return scl([90, 160, 60], 1.15 - d / r * 0.4 + (t.rnd() - 0.5) * 0.1); } }
  return { c: [80, 120, 50], a: 0 };
});
// ---------- v9.5: circuitos, música y pintura ----------
const btn = (on) => (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), d = Math.hypot(x - 15.5, y - 15.5);
  if (d < 8) { t.H(x, y, on ? 0.4 : 0.95); if (on) t.E(x, y, 0.6); return scl(on ? [255, 90, 70] : [200, 50, 40], 1.1 - d * 0.03); }
  t.H(x, y, e < 2 ? 0.2 : 0.5); t.S(x, y, 0.4);
  return scl([120, 124, 130], e < 2 ? 0.7 : 0.95 + (t.rnd() - 0.5) * 0.05);
});
HD.button_off = btn(false); HD.button_on = btn(true);
HD.battery = (t) => t.fill((x, y) => {
  const band = y > 8 && y < 13, e = Math.min(x, y, 31 - x, 31 - y);
  t.H(x, y, e < 2 ? 0.2 : 0.7); t.S(x, y, 0.5);
  if (band) { if ((x === 8 || x === 9) && y === 10) return [255, 255, 255]; return [230, 190, 40]; }
  return scl(y < 9 ? [60, 60, 66] : [40, 120, 70], e < 2 ? 0.7 : 1 + (t.rnd() - 0.5) * 0.05);
});
HD.note_block = (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), grill = x > 6 && x < 25 && y > 6 && y < 25 && (x + y) % 3 === 0;
  t.H(x, y, grill ? 0.2 : 0.7);
  return grill ? [40, 28, 18] : scl([140, 92, 56], e < 2 ? 0.7 : 1 + (t.rnd() - 0.5) * 0.06 + Math.sin(y * 0.8) * 0.03);
});
HD.music_box = (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), key = y > 18 && y < 28 && x > 3 && x < 28;
  if (key) { const black = x % 4 === 0; t.H(x, y, black ? 0.3 : 0.8); return black ? [20, 20, 20] : [240, 236, 226]; }
  t.H(x, y, e < 2 ? 0.2 : 0.6);
  return scl([150, 100, 60], e < 2 ? 0.7 : 1 + (t.rnd() - 0.5) * 0.05);
});
HD.canvas = (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y);
  if (e < 3) { t.H(x, y, 0.4); return scl([120, 84, 48], 0.9 + (t.rnd() - 0.5) * 0.1); }
  t.H(x, y, 0.5 + (t.rnd() - 0.5) * 0.1);
  return scl([236, 230, 214], 1 + (t.rnd() - 0.5) * 0.04);
});
// ---------- v9.4: minijuegos ----------
const padded = (c) => (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), n = t.fbm(x, y, 8, 2);
  t.H(x, y, e < 2 ? 0.3 : 0.7); t.S(x, y, 0.12);
  return scl(c, e < 2 ? 0.72 : 0.95 + n * 0.08 + (t.rnd() - 0.5) * 0.04);
});
HD.mg_red = padded([214, 64, 56]);
HD.mg_blue = padded([60, 110, 214]);
HD.mg_white = padded([228, 228, 222]);
HD.mg_gold = (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), star = Math.abs(x - 15.5) + Math.abs(y - 15.5) < 8;
  t.H(x, y, e < 2 ? 0.3 : 0.8); t.S(x, y, 0.6); if (star) t.E(x, y, 0.4);
  return scl(star ? [255, 236, 140] : [222, 170, 50], e < 2 ? 0.7 : 1 + (t.rnd() - 0.5) * 0.05);
});
HD.mg_table = (t) => t.fill((x, y) => {
  const cell = (Math.floor(x / 8) + Math.floor(y / 8)) % 2, e = Math.min(x, y, 31 - x, 31 - y);
  t.H(x, y, e < 2 ? 0.2 : 0.6);
  return e < 2 ? [92, 64, 40] : cell ? [230, 222, 200] : [40, 40, 44];
});
// ---------- v9.3: archipiélago ----------
HD.sand = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 6, 3), r = Math.sin((x + n * 9) * 0.45 + y * 0.12) * 0.5 + 0.5;
  t.H(x, y, 0.4 + r * 0.3 + n * 0.2); t.S(x, y, 0.05);
  if (t.rnd() < 0.02) return [250, 246, 230];
  return scl([226, 206, 152], 0.9 + r * 0.06 + n * 0.12 + (t.rnd() - 0.5) * 0.07);
});
HD.palm_bark = (t) => t.fill((x, y) => {
  const ring = (y % 6) / 6, edge = ring > 0.82;
  t.H(x, y, edge ? 0.2 : 0.5 + ring * 0.4); t.S(x, y, 0.05);
  return scl(edge ? [92, 70, 44] : [150, 118, 78], 0.85 + ring * 0.2 + (t.rnd() - 0.5) * 0.08 + Math.sin(x * 0.8) * 0.03);
});
HD.palm_leaves = (t) => t.fill((x, y) => {
  const fr = Math.abs(((x + y * 0.5) % 8) - 4), vein = fr < 0.7;
  if (fr > 3.2 && t.rnd() < 0.7) return { c: [60, 90, 40], a: 0 };
  t.M(x, y, 160); t.H(x, y, vein ? 0.9 : 0.5);
  return scl(vein ? [170, 190, 90] : [84, 150, 60], 1 - fr * 0.06 + (t.rnd() - 0.5) * 0.08);
});
const coral = (c1, c2) => (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 6, 37, 1);
  if (c.f1 < 0.18) { t.H(x, y, 0.1); t.E(x, y, 0.15); return scl(c2, 0.7); }
  t.H(x, y, 1 - c.f1); t.S(x, y, 0.2);
  return scl(mixc(c1, c2, c.rid * 0.5), 0.8 + (1 - c.f1) * 0.35 + (t.rnd() - 0.5) * 0.06);
});
HD.coral_red = coral([232, 92, 104], [150, 40, 72]);
HD.coral_yellow = coral([240, 200, 70], [190, 120, 40]);
// ---------- v9: Reinos de Eldra ----------
HD.basalt = (t) => t.fill((x, y) => {
  const col = Math.floor(x / 8), seam = x % 8 === 0 || (y + col * 11) % 16 === 0;
  const n = t.fbm(x, y, 4, 3);
  t.H(x, y, seam ? 0.1 : 0.6 + n * 0.3); t.S(x, y, 0.15);
  return scl([58, 56, 62], seam ? 0.55 : 0.8 + n * 0.35 + (t.rnd() - 0.5) * 0.06);
});
const leafy = (c1, c2, tintK, glow) => (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 7, 21, 1), n = t.fbm(x, y, 8, 2, 6);
  if (c.f1 > 0.5 || (n < 0.3 && c.f1 > 0.32)) return { c: c1, a: 0 };
  if (tintK) t.M(x, y, tintK);
  if (glow && t.rnd() < 0.03) { t.E(x, y, 0.8); return [230, 250, 255]; }
  t.H(x, y, 1 - c.f1);
  return scl(mixc(c1, c2, c.rid), 1.15 - c.f1 * 0.6 + (t.rnd() - 0.5) * 0.08);
});
HD.oak_leaves = leafy([70, 120, 50], [46, 90, 36], 230, false);
HD.silver_leaves = leafy([170, 200, 190], [120, 160, 150], 0, true);
HD.silver_bark = (t) => t.fill((x, y) => {
  const r = t.anoise(x, y, 8, 2, 31) * 0.6 + t.anoise(x, y, 16, 4, 32) * 0.4, g = r < 0.32;
  t.H(x, y, g ? 0.15 : r); t.S(x, y, 0.2);
  return scl([196, 204, 200], (g ? 0.62 : 0.85 + r * 0.25) + (t.rnd() - 0.5) * 0.05);
});
HD.oak_bark = (t) => t.fill((x, y) => {
  const r = t.anoise(x, y, 6, 2, 33) * 0.6 + t.anoise(x, y, 12, 4, 34) * 0.4, g = r < 0.35;
  t.H(x, y, g ? 0.1 : r);
  return scl([104, 78, 52], (g ? 0.55 : 0.8 + r * 0.4) + (t.rnd() - 0.5) * 0.06);
});
HD.elf_planks = (t) => t.fill((x, y) => {
  const p = y >> 3, ly = y % 8, g = t.anoise(x, y, 2, 16, p + 40) * 0.5 + t.anoise(x, y, 4, 32, p + 41) * 0.3;
  if (ly === 7) { t.H(x, y, 0.1); return [150, 140, 110]; }
  t.H(x, y, 0.6 + g * 0.2); t.S(x, y, 0.2);
  return scl([226, 214, 178], 0.82 + g * 0.3 + (mulberry32(p * 7)() - 0.5) * 0.1);
});
const bricks = (moss) => (t) => t.fill((x, y) => {
  const row = y >> 3, off = row % 2 ? 6 : 0, lx = (x + off) % 12, ly = y % 8;
  const r = mulberry32(row * 13 + Math.floor((x + off) / 12) * 7 + 3)();
  if (ly === 7 || lx === 11) { t.H(x, y, 0.1); return moss && t.fbm(x, y, 4, 2, 5) > 0.5 ? [70, 100, 50] : [90, 88, 84]; }
  const n = t.fbm(x, y, 8, 3);
  t.H(x, y, 0.7 + n * 0.2 - (ly === 6 || lx === 10 ? 0.1 : 0));
  let c = scl([138, 134, 126], 0.82 + r * 0.2 + (n - 0.5) * 0.25);
  if (moss && t.fbm(x, y, 4, 3, 9) > 0.58) c = mixc(c, [74, 110, 54], 0.7);
  return c;
});
HD.stone_bricks = bricks(false);
HD.stone_bricks_moss = bricks(true);
HD.thatch = (t) => t.fill((x, y) => {
  const s = t.anoise(x, y, 16, 2, 50), row = y % 6 === 5;
  t.H(x, y, row ? 0.2 : s);
  return scl([196, 164, 92], (row ? 0.6 : 0.75 + s * 0.4) + (t.rnd() - 0.5) * 0.1);
});
HD.green_frame = (t) => { HD.planks(t); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = t.G(x, y); t.P(x, y, mixc(c, [60, 120, 60], 0.6)); } };
HD.flowers = (t) => {
  t.clear();
  for (let s = 0; s < 7; s++) {
    const x = 2 + s * 4 + Math.floor(t.rnd() * 2), h = 10 + Math.floor(t.rnd() * 12);
    for (let y = 0; y < h; y++) t.P(x, 31 - y, [70, 120, 50]);
    const col = [[230, 220, 255], [255, 210, 80], [240, 120, 160], [160, 200, 255]][s % 4];
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (Math.abs(a) + Math.abs(b) <= 2) t.P(x + a, 31 - h + b, scl(col, 1 - (Math.abs(a) + Math.abs(b)) * 0.08));
    t.P(x, 31 - h, [255, 230, 120]); if (s % 4 === 0) t.E(x, 31 - h, 0.6);
  }
};
HD.web = (t) => {
  t.clear();
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; for (let r = 0; r < 22; r++) t.P(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, [230, 230, 236], 200); }
  for (let ring = 4; ring < 22; ring += 4) for (let a = 0; a < Math.PI * 2; a += 0.05) t.P(16 + Math.cos(a) * ring, 16 + Math.sin(a) * ring, [220, 220, 228], 170);
};
HD.mithril_ore = (t) => { ore([210, 230, 240], [170, 200, 220], 0.38, 0.35, 'deepstone')(t); };
HD.crystal = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 4, 22, 1), facet = ((x - c.cx) - (y - c.cy)) > 0 ? 1.15 : 0.85;
  t.E(x, y, 0.5); t.S(x, y, 0.9); t.H(x, y, 1 - c.f1);
  return { c: scl(mixc([150, 110, 255], [110, 220, 255], c.rid), facet * (1.1 - c.f1 * 0.4)), a: 220 };
});
HD.gold_pile = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 8, 23, 1);
  t.H(x, y, 1 - c.f1); t.S(x, y, 0.85);
  return scl([232, 186, 60], (c.f2 - c.f1 < 0.08 ? 0.6 : 1.15 - c.f1 * 0.5) + (t.rnd() - 0.5) * 0.08);
});
HD.rune_side = (t) => {
  HD.stone_bricks(t);
  for (let y = 8; y < 24; y++) for (let x = 8; x < 24; x++) { const r = ((x * 7 + y * 3) % 11 === 0) || (x === 16 && y % 3) || (y === 16 && x % 4); if (r) { t.P(x, y, [130, 200, 255]); t.E(x, y, 0.9); } }
};
HD.rune_top = (t) => {
  HD.stone_bricks(t);
  for (let a = 0; a < Math.PI * 2; a += 0.02) { for (const r of [9, 12]) { t.P(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, [140, 210, 255]); t.E(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, 1); } }
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; for (let r = 0; r < 9; r++) { t.P(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, [170, 230, 255]); t.E(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, 1); } }
};
HD.alchemy_side = (t) => {
  HD.elf_planks(t);
  for (const [bx, col] of [[5, [200, 60, 60]], [14, [60, 120, 220]], [23, [100, 210, 120]]]) for (let y = 10; y < 22; y++) for (let x = bx; x < bx + 5; x++) { const neck = y < 13 && (x === bx || x === bx + 4); if (!neck) { t.P(x, y, scl(col, y < 15 ? 0.7 : 1)); t.S(x, y, 0.8); if (y > 16) t.E(x, y, 0.4); } }
};
HD.alchemy_top = (t) => { HD.elf_planks(t); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (Math.hypot(x - 16, y - 16) < 7) { t.P(x, y, [60, 50, 40]); if (Math.hypot(x - 16, y - 16) < 5) { t.P(x, y, [120, 230, 160]); t.E(x, y, 0.7); } } };
HD.light_orb = (t) => { t.clear(); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 16, y - 16); if (d < 9) { t.P(x, y, mixc([255, 255, 230], [255, 220, 120], d / 9), 255); t.E(x, y, 1); } } };
// hojas de acacia: matas con huecos (recorte) que se tiñen con el bioma
HD.leaves = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 6, 12, 1), n = t.fbm(x, y, 8, 2, 4);
  if (c.f1 > 0.48 || (n < 0.32 && c.f1 > 0.3)) return { c: [60, 70, 40], a: 0 };
  t.M(x, y, 200); t.H(x, y, 1 - c.f1);
  return scl(mixc([96, 120, 56], [64, 88, 40], c.rid), 1.15 - c.f1 * 0.6 + (t.rnd() - 0.5) * 0.08);
});
HD.rubble = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 5, 3, 1), e = c.f2 - c.f1;
  const pal = [[146, 142, 136], [120, 116, 110], [128, 72, 56], [96, 92, 86]];
  if (e < 0.08) { t.H(x, y, 0); return [52, 50, 48]; }
  t.H(x, y, 1 - c.f1 * 0.8);
  return scl(pal[(c.rid * 4) | 0], 0.8 + (1 - c.f1) * 0.3 + (t.rnd() - 0.5) * 0.08);
});

// ---------- Texturas HD: segunda tanda (muebles, máquinas y objetos comunes) ----------
const frame = (t, col, w = 2, h = 0.95) => { for (let i = 0; i < 32; i++) for (let k = 0; k < w; k++) for (const [x, y] of [[i, k], [i, 31 - k], [k, i], [31 - k, i]]) { t.P(x, y, scl(col, (k === 0 ? 1.15 : 0.95) * (0.9 + t.rnd() * 0.15))); t.H(x, y, h); } };
const iron = (t, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const edge = x === x0 || y === y0 || x === x1 || y === y1; t.P(x, y, scl([120, 124, 130], edge ? 0.75 : 0.95 + (t.rnd() - 0.5) * 0.1)); t.H(x, y, edge ? 0.85 : 0.95); t.S(x, y, 0.45); } };
HD.chest_side = (t) => { HD.planks(t); frame(t, [84, 64, 42]); for (let x = 2; x < 30; x++) for (const y of [10, 11]) { t.P(x, y, [70, 72, 76]); t.H(x, y, 1); t.S(x, y, 0.4); } };
HD.chest_top = (t) => { HD.planks(t); frame(t, [84, 64, 42]); };
HD.chest_front = (t) => {
  HD.chest_side(t);
  iron(t, 12, 8, 19, 16);
  for (const [x, y] of [[15, 11], [16, 11], [15, 12], [16, 12], [15, 13], [16, 13]]) { t.P(x, y, [20, 20, 20]); t.H(x, y, 0.4); }
};
HD.furnace_side = (t) => { HD.stone(t); frame(t, [96, 92, 86], 2, 0.9); };
HD.furnace_top = (t) => { HD.furnace_side(t); for (let y = 10; y < 22; y++) for (let x = 10; x < 22; x++) { t.P(x, y, [34, 30, 28]); t.H(x, y, 0.1); } };
HD.furnace_front = (t) => {
  HD.furnace_side(t);
  for (let y = 16; y < 28; y++) for (let x = 8; x < 24; x++) {
    const fire = y > 21, f = t.fbm(x, y, 8, 2);
    t.P(x, y, fire ? mixc([220, 80, 20], [255, 210, 90], f) : [28, 24, 22]); t.H(x, y, 0.1);
    if (fire) t.E(x, y, 0.7 + f * 0.3);
  }
  for (let x = 6; x < 26; x++) for (const y of [14, 15]) { t.P(x, y, [70, 68, 66]); t.H(x, y, 1); }
};
HD.bench_top = (t) => { HD.planks(t); for (let i = 6; i < 26; i++) { t.P(i, 14, [150, 154, 160]); t.P(i, 15, [110, 114, 120]); t.S(i, 14, 0.5); } for (let i = 8; i < 24; i++) { t.P(15, i, [120, 124, 130]); t.P(16, i, [90, 94, 100]); } };
HD.bench_side = (t) => {
  HD.planks(t);
  for (let x = 0; x < 32; x++) for (const y of [0, 1, 2]) { t.P(x, y, [74, 56, 38]); t.H(x, y, 1); }
  for (let y = 8; y < 24; y++) { t.P(6, y, [150, 154, 160]); t.P(7, y, [120, 124, 130]); t.P(24, y, [120, 84, 50]); t.P(25, y, [96, 66, 40]); }
  for (let x = 3; x < 11; x++) { t.P(x, 8, [150, 154, 160]); t.P(x, 9, [110, 114, 120]); }
};
const staves = (t, base, hoops) => t.fill((x, y) => {
  const st = x % 8, grain = t.anoise(x, y, 4, 2, 3);
  const hoop = hoops.some((h) => y >= h && y < h + 3);
  if (hoop) { t.H(x, y, 1); t.S(x, y, 0.35); return scl([64, 64, 66], (y === hoops.find((h) => y >= h) ? 1.2 : 0.9) + (t.rnd() - 0.5) * 0.1); }
  t.H(x, y, st === 7 ? 0.1 : 0.6 + grain * 0.2);
  return scl(base, (st === 7 ? 0.55 : st === 0 ? 1.1 : 0.85 + grain * 0.3) + (t.rnd() - 0.5) * 0.06);
});
HD.oak_barrel_side = (t) => staves(t, [124, 84, 48], [4, 25]);
HD.oak_barrel_top = (t) => t.fill((x, y) => {
  const d = Math.hypot(x - 15.5, y - 15.5);
  if (d > 14) { t.H(x, y, 1); t.S(x, y, 0.35); return [62, 62, 64]; }
  const plank = Math.floor(x / 8), g = t.anoise(x, y, 2, 8, plank);
  t.H(x, y, x % 8 === 7 ? 0.2 : 0.6);
  return scl([140, 98, 58], x % 8 === 7 ? 0.6 : 0.8 + g * 0.3);
});
HD.barrel_side = (t) => {
  t.fill((x, y) => {
    const ridge = y === 9 || y === 22, n = t.fbm(x, y, 4, 3), rust = n > 0.62;
    t.H(x, y, ridge ? 1 : 0.5 + Math.cos((x / 32) * TAU) * 0.1); t.S(x, y, rust ? 0.05 : 0.3);
    return scl(rust ? [120, 70, 30] : [170, 146, 36], (ridge ? 1.2 : 0.85 + Math.cos((x / 32) * TAU) * 0.12) + (t.rnd() - 0.5) * 0.06);
  });
  // trébol radiactivo
  for (let y = 10; y < 22; y++) for (let x = 10; x < 22; x++) {
    const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + TAU;
    if ((d < 5.5 && d > 1.8 && Math.floor(a * 3 / Math.PI) % 2 === 0) || d < 1.2) t.P(x, y, [26, 26, 20]);
  }
};
HD.barrel_top = (t) => t.fill((x, y) => {
  const d = Math.hypot(x - 15.5, y - 15.5);
  if (d < 6) { t.E(x, y, 0.8); t.H(x, y, 0.2); return mixc([200, 255, 120], [110, 220, 50], d / 6); }
  t.H(x, y, d > 13 ? 1 : 0.5); t.S(x, y, 0.3);
  return scl([150, 128, 30], 0.8 + t.fbm(x, y, 4, 2) * 0.3);
});
HD.door_metal = (t) => {
  t.fill((x, y) => { const n = t.anoise(x, y, 2, 16, 5); t.H(x, y, 0.6); t.S(x, y, 0.4); return scl([122, 126, 132], 0.85 + n * 0.2); });
  frame(t, [80, 84, 90], 2, 0.9);
  for (let y = 6; y < 13; y++) for (let x = 6; x < 26; x++) { t.P(x, y, [60, 76, 78]); t.H(x, y, 0.3); t.S(x, y, 0.8); }
  for (let y = 18; y < 22; y++) for (let x = 22; x < 26; x++) { t.P(x, y, [40, 40, 42]); t.H(x, y, 1); }
  for (let i = 0; i < 25; i++) { const x = t.rnd() * 32, y = 24 + t.rnd() * 8; t.P(x, y, [124, 72, 40]); t.S(x, y, 0.05); }
};
HD.sandbag = (t) => t.fill((x, y) => {
  const row = y >> 3, off = row % 2 ? 8 : 0, lx = (x + off) % 16, ly = y % 8;
  const bulge = Math.sin((lx / 16) * Math.PI) * Math.sin((ly / 8) * Math.PI);
  const seam = ly === 7 || lx === 0;
  const weave = (x + y) % 2 ? 0.96 : 1.04;
  t.H(x, y, seam ? 0 : bulge);
  return scl([140, 124, 90], (seam ? 0.55 : 0.7 + bulge * 0.35) * weave);
});
HD.bookshelf = (t) => {
  HD.planks(t);
  for (const y0 of [2, 18]) for (let x = 2; x < 30; x++) {
    const bk = Math.floor((x + y0) / 3), r = mulberry32(bk * 31 + y0)();
    const col = [[140, 42, 36], [42, 74, 140], [58, 106, 42], [140, 122, 42], [90, 58, 106], [120, 90, 60]][(r * 6) | 0];
    const hgt = 12 - ((r * 4) | 0);
    for (let y = y0 + (12 - hgt); y < y0 + 12; y++) { t.P(x, y, scl(col, (x + y0) % 3 === 0 ? 0.65 : 0.9 + (y === y0 + (12 - hgt) ? 0.2 : 0))); t.H(x, y, 0.8); }
    for (let y = y0; y < y0 + (12 - hgt); y++) { t.P(x, y, [34, 26, 20]); t.H(x, y, 0.1); }
  }
};
HD.medcrate_side = (t) => {
  t.fill((x, y) => { t.H(x, y, 0.6); t.S(x, y, 0.2); return scl([222, 218, 208], 0.9 + t.fbm(x, y, 4, 2) * 0.1 - (y > 26 ? 0.1 : 0)); });
  frame(t, [150, 146, 138]);
  for (let i = 8; i < 24; i++) for (let j = 13; j < 19; j++) { t.P(i, j, [196, 44, 36]); t.P(j, i, [196, 44, 36]); t.H(i, j, 0.8); t.H(j, i, 0.8); }
};
HD.medcrate_top = HD.medcrate_side;
HD.kerb = (t) => {
  t.fill((x, y) => { const red = Math.floor(x / 8) % 2; t.H(x, y, 0.6 + t.fbm(x, y, 4, 2) * 0.2); return scl(red ? [200, 50, 40] : [232, 232, 228], 0.88 + t.fbm(x, y, 4, 3) * 0.14); });
  crackLine(t, 2);
  for (let i = 0; i < 40; i++) { const x = t.rnd() * 32, y = t.rnd() * 32; t.P(x, y, [120, 116, 110]); }
};
HD.tires = (t) => t.fill((x, y) => {
  const band = y % 10, tread = (x + (Math.floor(y / 10) % 2) * 3) % 6 < 2;
  if (band >= 8) { t.H(x, y, 0.1); return [14, 14, 14]; }
  t.H(x, y, tread ? 0.5 : 0.9);
  return scl([40, 40, 42], tread ? 0.7 : 1 + (t.rnd() - 0.5) * 0.1);
});
HD.cloth = (t) => t.fill((x, y) => { const w = (x + y) % 4 < 2 ? 1.05 : 0.93, n = t.fbm(x, y, 4, 3); t.H(x, y, 0.5 + (w - 1) * 3); return scl([154, 138, 106], w * (0.85 + n * 0.25)); });
HD.bar_top = (t) => { HD.planks(t); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = t.G(x, y); t.P(x, y, scl(mixc(c, [110, 60, 30], 0.35), 0.9)); t.S(x, y, 0.35); } };

// v12.1: familias de piedra, maderas, puertas y ruinas
const polished = (c) => (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 3, 4), v = t.anoise(x, y, 4, 2, 7);
  let k = 0.93 + n * 0.1 - Math.max(0, v - 0.72) * 0.25 + (t.rnd() - 0.5) * 0.025;
  if (x === 0 || y === 0) k *= 1.14; else if (x === 31 || y === 31) k *= 0.74;
  t.H(x, y, x === 0 || y === 0 || x === 31 || y === 31 ? 0.35 : 0.75); t.S(x, y, 0.22);
  return scl(c, k);
});
const bricksBig = (c) => (t) => t.fill((x, y) => {
  const row = y >> 4, off = row % 2 ? 8 : 0, bx = (x + off) >> 4, lx = (x + off) % 16, ly = y % 16;
  if (ly === 15 || lx === 15) { t.H(x, y, 0.08); return scl(c, 0.55 + t.rnd() * 0.08); }
  const r = mulberry32(row * 37 + bx * 11 + 3)(), n = t.fbm(x, y, 8, 3, 2);
  let k = 0.84 + r * 0.16 + (n - 0.5) * 0.18 + (t.rnd() - 0.5) * 0.05;
  if (ly === 0 || lx === 0) k *= 1.1; if (ly === 14 || lx === 14) k *= 0.84;
  t.H(x, y, 0.7 + n * 0.2 - (ly === 14 || lx === 14 ? 0.1 : 0));
  return scl(c, k);
});
const carved = (c) => (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), d = Math.abs(x - 15.5) + Math.abs(y - 15.5), r = Math.hypot(x - 15.5, y - 15.5);
  const n = t.fbm(x, y, 4, 3, 5);
  let k = 0.9 + n * 0.12 + (t.rnd() - 0.5) * 0.04, h = 0.6 + n * 0.2;
  if (e < 3) { k *= e === 0 ? 1.12 : 1.04; h = 0.85; }
  else if (e === 3) { k *= 0.6; h = 0.1; }
  else if (d > 8 && d < 10) { k *= 0.62; h = 0.1; }
  else if (r < 3.5) { k *= 1.1; h = 0.9; }
  t.H(x, y, h);
  return scl(c, k);
});
HD.sandstone = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 3, 1), band = Math.sin(y * 0.75 + n * 4) * 0.05;
  t.H(x, y, 0.55 + band * 3 + n * 0.2);
  return scl([200, 170, 116], 0.9 + band + n * 0.1 + (t.rnd() - 0.5) * 0.05);
});
HD.tuff = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 8, 4, 1), n = t.fbm(x, y, 4, 3, 3), pore = c.f1 < 0.16 && c.rid > 0.55;
  t.H(x, y, pore ? 0.05 : 0.6 + n * 0.25);
  return scl(mixc([150, 140, 124], [128, 120, 110], c.rid), pore ? 0.5 : 0.88 + n * 0.16 + (t.rnd() - 0.5) * 0.06);
});
HD.stone_pol = polished([116, 111, 104]); HD.stone_carv = carved([116, 111, 104]);
HD.deepstone_pol = polished([76, 76, 88]); HD.deepstone_carv = carved([76, 76, 88]); HD.deepstone_brk = bricksBig([76, 76, 88]);
HD.sandstone_pol = polished([200, 170, 116]); HD.sandstone_carv = carved([200, 170, 116]); HD.sandstone_brk = bricksBig([200, 170, 116]);
HD.basalt_pol = polished([62, 60, 66]); HD.basalt_carv = carved([62, 60, 66]); HD.basalt_brk = bricksBig([62, 60, 66]);
HD.tuff_pol = polished([150, 140, 124]); HD.tuff_carv = carved([150, 140, 124]); HD.tuff_brk = bricksBig([150, 140, 124]);
// madera recoloreada a partir de las tablas comunes
const recolor = (base, c) => (t) => { base(t); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const g = t.G(x, y), k = (g[0] + g[1] + g[2]) / 324; t.P(x, y, scl(c, k), g[3]); } };
HD.planks_oak = recolor((t) => HD.planks(t), [120, 84, 52]);
HD.planks_palm = recolor((t) => HD.planks(t), [176, 146, 98]);
const woodDoor = (c, win) => (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), seam = x % 8 === 0, bar = (y >= 5 && y <= 7) || (y >= 24 && y <= 26);
  const grain = t.anoise(x, y, 2, 16, (x >> 3) + 1) * 0.3, knob = Math.hypot(x - 25, y - 16) < 1.6;
  if (knob) { t.H(x, y, 1); t.S(x, y, 0.6); return [190, 170, 90]; }
  if (win && x > 9 && x < 22 && y > 9 && y < 20) { t.H(x, y, 0.3); t.S(x, y, 0.8); return { c: [170, 200, 210], a: 120 }; }
  if (e < 2) { t.H(x, y, 0.9); return scl(c, 0.72); }
  if (bar) { t.H(x, y, 0.8); return scl(c, 0.95 + grain); }
  t.H(x, y, seam ? 0.1 : 0.55 + grain);
  return scl(c, seam ? 0.6 : 0.8 + grain + (t.rnd() - 0.5) * 0.05);
});
HD.door_wood = woodDoor([138, 110, 76], false); HD.door_oak = woodDoor([120, 84, 52], true);
HD.door_palm = woodDoor([176, 146, 98], false); HD.door_elf = woodDoor([150, 168, 140], true);
HD.old_tiles = (t) => t.fill((x, y) => {
  const tx_ = x >> 3, ty = y >> 3, r = mulberry32(tx_ * 13 + ty * 7 + 1)(), grout = x % 8 === 7 || y % 8 === 7;
  if (r < 0.14) { t.H(x, y, 0.1); return scl([110, 106, 98], 0.8 + t.rnd() * 0.2); }
  if (grout) { t.H(x, y, 0.2); return [120, 114, 100]; }
  const stain = t.fbm(x, y, 4, 3, 8);
  t.H(x, y, 0.8); t.S(x, y, 0.35);
  return scl(mixc([226, 228, 220], [196, 178, 120], Math.max(0, stain - 0.45) * 1.6), 0.92 + r * 0.1 + (t.rnd() - 0.5) * 0.04);
});
HD.rusty_sign = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 4, 2), rust = n > 0.52;
  const band = y > 9 && y < 22, letter = band && x > 3 && x < 28 && (x % 5 < 3) && ((y > 11 && y < 14) || (y > 16 && y < 20) || x % 5 === 0);
  t.H(x, y, rust ? 0.4 : 0.7); t.S(x, y, rust ? 0.05 : 0.3);
  if (rust) return scl([122, 64, 30], 0.75 + n * 0.4);
  if (letter) return [230, 220, 190];
  return band ? scl([40, 86, 120], 0.9 + n * 0.2) : scl([150, 140, 120], 0.85 + n * 0.2);
});
HD.hanging_cables = (t) => {
  t.clear();
  for (let i = 0; i < 4; i++) {
    let x = 4 + i * 8 + t.rnd() * 3; const len = 14 + t.rnd() * 18;
    for (let y = 0; y < len; y++) { x += Math.sin(y * 0.3 + i) * 0.25; const c = i % 2 ? [30, 30, 32] : [60, 40, 30]; t.P(x, y, c, 255); t.P(x + 1, y, scl(c, 0.7), 255); }
  }
};
HD.broken_glass = (t) => {
  HD.glass(t);
  const cx = 12 + t.rnd() * 8, cy = 12 + t.rnd() * 8;
  for (let y = 2; y < 30; y++) for (let x = 2; x < 30; x++) {
    const a = Math.atan2(y - cy, x - cx), r = Math.hypot(x - cx, y - cy), jag = 6 + Math.sin(a * 7) * 3 + Math.sin(a * 13) * 1.5;
    if (r < jag) t.P(x, y, [0, 0, 0], 0);
    else if (Math.abs(Math.sin(a * 5)) < 0.06) t.P(x, y, [230, 236, 236], 200);
  }
};
// v12.2: cañones, salar, géiseres, cuevas
HD.red_sand = (t) => t.fill((x, y) => { const n = t.fbm(x, y, 8, 3, 2); t.H(x, y, 0.4 + n * 0.3 + t.rnd() * 0.1); return scl([196, 104, 58], 0.86 + n * 0.18 + (t.rnd() - 0.5) * 0.12); });
HD.red_sandstone = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 3, 3), band = Math.floor((y + n * 6) / 5) % 3;
  t.H(x, y, 0.5 + n * 0.3 - (band === 1 ? 0.15 : 0));
  return scl(band === 0 ? [184, 92, 54] : band === 1 ? [160, 76, 46] : [204, 120, 72], 0.9 + n * 0.12 + (t.rnd() - 0.5) * 0.05);
});
HD.clay_ochre = (t) => t.fill((x, y) => { const n = t.fbm(x, y, 4, 3, 5); t.H(x, y, 0.55 + n * 0.2); return scl([204, 150, 72], 0.9 + n * 0.12 + Math.sin(y * 0.9 + n * 3) * 0.03); });
HD.clay_white = (t) => t.fill((x, y) => { const n = t.fbm(x, y, 4, 3, 6); t.H(x, y, 0.55 + n * 0.2); return scl([222, 208, 186], 0.92 + n * 0.1 + Math.sin(y * 0.9 + n * 3) * 0.03); });
HD.salt_top = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 4, 8, 0.7), e = c.f2 - c.f1, ridge = e < 0.08;
  t.H(x, y, ridge ? 0.95 : 0.5 + c.f1 * 0.2); t.S(x, y, 0.3);
  return scl([238, 236, 228], ridge ? 1.04 : 0.9 + c.rid * 0.08 + (t.rnd() - 0.5) * 0.04);
});
HD.salt_side = (t) => t.fill((x, y) => {
  if (y < 6) { t.H(x, y, 0.7); return scl([236, 234, 226], 0.92 + t.rnd() * 0.08); }
  const n = t.fbm(x, y, 8, 3, 2); t.H(x, y, 0.4 + n * 0.3); return scl([214, 196, 150], 0.86 + n * 0.16 + (t.rnd() - 0.5) * 0.1);
});
const spikes = (cols, n, up, glow) => (t) => {
  t.clear();
  for (let i = 0; i < n; i++) {
    const cx = 5 + i * (22 / Math.max(1, n - 1)) + (t.rnd() - 0.5) * 3, hgt = 14 + t.rnd() * 16, w = 2 + t.rnd() * 2.5;
    for (let k = 0; k < hgt; k++) {
      const ww = w * (1 - k / hgt), y = up ? 31 - k : k;
      for (let x = Math.floor(cx - ww); x <= Math.ceil(cx + ww); x++) {
        const s = (x - cx) / Math.max(0.5, ww);
        if (Math.abs(s) > 1) continue;
        t.P(x, y, scl(cols[i % cols.length], 0.8 + (1 - Math.abs(s)) * 0.35 - (s > 0.3 ? 0.15 : 0)), 255);
        if (glow) t.E(x, y, 0.5 + (1 - Math.abs(s)) * 0.5);
      }
    }
  }
};
HD.salt_crystal = spikes([[244, 240, 236], [230, 236, 244]], 3, true, false);
HD.stalactite = spikes([[120, 114, 108], [104, 100, 96]], 3, false, false);
HD.stalagmite = spikes([[120, 114, 108], [132, 126, 118]], 2, true, false);
HD.cave_crystal = spikes([[186, 120, 255], [150, 90, 240], [210, 160, 255]], 3, true, true);
HD.geyser_top = (t) => t.fill((x, y) => {
  const r = Math.hypot(x - 15.5, y - 15.5), n = t.fbm(x, y, 4, 3, 7);
  if (r < 4.5) { t.H(x, y, 0); return scl([30, 26, 24], 0.8 + n * 0.3); }
  if (r < 9) { t.H(x, y, 0.8 - (r - 4.5) * 0.05); return scl([220, 196, 110], 0.85 + n * 0.25); }
  t.H(x, y, 0.5 + n * 0.3); return scl([150, 140, 124], 0.85 + n * 0.2);
});
HD.thermal_top = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 4, 9), c = t.cells(x, y, 5, 3, 1), crack = c.f2 - c.f1 < 0.06;
  t.H(x, y, crack ? 0.1 : 0.5 + n * 0.3);
  if (crack) return [120, 60, 30];
  return scl(mixc([196, 166, 104], [176, 128, 84], n), 0.82 + c.rid * 0.16);
});
HD.quartz_ore = (t) => { HD.stone(t); for (let i = 0; i < 6; i++) { const cx = 4 + t.rnd() * 24, cy = 4 + t.rnd() * 24; for (let k = 0; k < 7; k++) { const x = cx + (t.rnd() - 0.5) * 6, y = cy + (t.rnd() - 0.5) * 6; t.P(x, y, [246, 242, 252]); t.P(x + 1, y, [220, 214, 236]); t.H(x, y, 1); t.S(x, y, 0.8); } } };
HD.obsidian = (t) => t.fill((x, y) => {
  const c = t.cells(x, y, 3, 2, 0.9), n = t.fbm(x, y, 4, 3, 4), e = c.f2 - c.f1, shine = (x + y * 0.6 + n * 8) % 11 < 1.2;
  t.H(x, y, e < 0.05 ? 0.2 : 0.7); t.S(x, y, 0.9);
  if (shine) return [104, 84, 140];
  return scl(mixc([26, 20, 34], [54, 36, 70], c.rid), 0.85 + n * 0.3);
});
HD.glow_mushroom = (t) => {
  t.clear();
  for (const [cx, base, h, r] of [[9, 31, 12, 5], [21, 31, 18, 6], [15, 31, 7, 3.5]]) {
    for (let y = base; y > base - h; y--) for (let x = cx - 1; x <= cx; x++) t.P(x, y, [200, 220, 214]);
    for (let y = -r; y <= 1; y++) for (let x = -r; x <= r; x++) {
      if (Math.hypot(x, y * 1.4) > r) continue;
      const X = cx + x, Y = base - h + y;
      t.P(X, Y, (x * 7 + y * 3) % 5 === 0 ? [220, 255, 250] : [60, 210, 230]); t.E(X, Y, 0.9);
    }
  }
};
HD.quartz_block = (t) => t.fill((x, y) => {
  const n = t.fbm(x, y, 4, 2, 3), v = t.anoise(x, y, 2, 8, 4);
  t.H(x, y, x === 0 || y === 0 ? 0.9 : 0.7); t.S(x, y, 0.45);
  return scl([238, 234, 244], (x === 31 || y === 31 ? 0.82 : 0.94) + n * 0.06 - Math.max(0, v - 0.7) * 0.2);
});
HD.quartz_lamp = (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), grid = x % 8 === 0 || y % 8 === 0;
  if (e < 2 || grid) { t.H(x, y, 0.8); t.S(x, y, 0.5); return [200, 196, 210]; }
  t.H(x, y, 0.5); t.E(x, y, 1);
  return scl([255, 250, 236], 0.95 + t.rnd() * 0.05);
});
// v12.3: mecanismos y cocina
HD.floodgate = (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), bar = x % 8 === 3 || x % 8 === 4, stripe = (y < 4 || y > 27) && ((x + y) % 8 < 4);
  if (e < 2) { t.H(x, y, 0.9); t.S(x, y, 0.5); return [110, 114, 120]; }
  if (stripe) { t.H(x, y, 0.7); return (x + y) % 8 < 4 ? [220, 180, 40] : [30, 30, 30]; }
  t.H(x, y, bar ? 0.9 : 0.4); t.S(x, y, 0.45);
  return scl([128, 134, 140], bar ? 1.1 : 0.75 + t.fbm(x, y, 4, 2) * 0.2);
});
HD.bigbattery_side = (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y), gauge = x > 11 && x < 20 && y > 5 && y < 27, cell = (y - 6) % 5 === 4;
  if (e < 2) { t.H(x, y, 0.9); return [70, 74, 80]; }
  if (gauge) { t.H(x, y, cell ? 0.3 : 0.6); if (!cell) t.E(x, y, 0.6); return cell ? [30, 40, 30] : y > 14 ? [90, 230, 110] : [50, 80, 60]; }
  t.H(x, y, 0.6); t.S(x, y, 0.4); return scl([60, 90, 140], 0.85 + t.fbm(x, y, 4, 2) * 0.2);
});
HD.bigbattery_top = (t) => t.fill((x, y) => {
  const pos = Math.hypot(x - 9, y - 16) < 3.5, neg = Math.hypot(x - 23, y - 16) < 3.5;
  if (pos) { t.H(x, y, 1); t.S(x, y, 0.6); return [210, 70, 60]; }
  if (neg) { t.H(x, y, 1); t.S(x, y, 0.6); return [60, 60, 66]; }
  t.H(x, y, 0.5); return scl([70, 74, 80], 0.9 + t.rnd() * 0.08);
});
HD.turbine = (t) => t.fill((x, y) => { const n = t.fbm(x, y, 4, 2); t.H(x, y, 0.6 + (x % 16 === 0 ? -0.3 : 0)); t.S(x, y, 0.4); return scl([226, 228, 230], 0.85 + n * 0.15 - (y % 16 === 0 ? 0.15 : 0)); });
const lampHead = (on) => (t) => t.fill((x, y) => {
  const e = Math.min(x, y, 31 - x, 31 - y);
  if (e < 3) { t.H(x, y, 0.8); t.S(x, y, 0.5); return [60, 64, 70]; }
  if (on) { t.E(x, y, 1); t.H(x, y, 0.5); return scl([255, 236, 190], 0.95 + t.rnd() * 0.05); }
  t.H(x, y, 0.5); t.S(x, y, 0.7); return scl([170, 176, 168], 0.8 + t.fbm(x, y, 4, 2) * 0.2);
});
HD.streetlamp_off = lampHead(false); HD.streetlamp_on = lampHead(true);
const hang = (on) => (t) => t.fill((x, y) => {
  const shade = y < 12, rim = y === 12 || y === 13;
  if (rim) { t.H(x, y, 0.9); return [200, 170, 90]; }
  if (shade) { t.H(x, y, 0.6); t.S(x, y, 0.3); return scl([60, 110, 90], 0.85 + t.fbm(x, y, 4, 2) * 0.2); }
  if (on) { t.E(x, y, 1); return [255, 240, 210]; }
  t.H(x, y, 0.4); return [190, 186, 170];
});
HD.hanglamp_off = hang(false); HD.hanglamp_on = hang(true);
HD.waterer = (t) => t.fill((x, y) => { const n = t.fbm(x, y, 4, 2); t.H(x, y, 0.6); t.S(x, y, 0.5); return scl(y % 8 < 2 ? [60, 130, 70] : [74, 150, 84], 0.85 + n * 0.2); });
HD.clay_oven_side = (t) => t.fill((x, y) => {
  const row = y >> 2, off = row % 2 ? 4 : 0, brick = (x + off) % 8 === 7 || y % 4 === 3, n = t.fbm(x, y, 8, 3);
  t.H(x, y, brick ? 0.15 : 0.6 + n * 0.2);
  return brick ? [140, 112, 84] : scl([196, 126, 78], 0.85 + n * 0.2 + mulberry32(row * 7 + ((x + off) >> 3))() * 0.1);
});
HD.clay_oven_front = (t) => { HD.clay_oven_side(t); for (let y = 12; y < 30; y++) for (let x = 7; x < 25; x++) { const dy = (y - 30), r = Math.hypot((x - 15.5) / 9, dy / 18); if (r < 1) { const fire = y > 22; t.P(x, y, fire ? scl([255, 150, 50], 0.8 + t.rnd() * 0.4) : [30, 20, 16]); if (fire) t.E(x, y, 1); t.H(x, y, 0); } } };
HD.clay_oven_top = (t) => t.fill((x, y) => { const n = t.fbm(x, y, 4, 3), hole = Math.hypot(x - 15.5, y - 15.5) < 4; t.H(x, y, hole ? 0 : 0.6 + n * 0.2); return hole ? [36, 28, 24] : scl([186, 120, 76], 0.85 + n * 0.2); });
// v12.4: hogar
const blanket = (c) => (t) => t.fill((x, y) => { const q = (x % 8 === 0 || y % 8 === 0), n = t.fbm(x, y, 4, 2, 3); t.H(x, y, q ? 0.3 : 0.6 + n * 0.2); return scl(c, (q ? 0.8 : 0.95) + n * 0.12 + ((x + y) % 4 < 2 ? 0.03 : -0.03)); });
HD.bed_red = blanket([184, 52, 46]); HD.bed_blue = blanket([52, 84, 170]); HD.bed_green = blanket([62, 132, 70]);
HD.pillow = (t) => t.fill((x, y) => { const e = Math.min(x, y, 31 - x, 31 - y); t.H(x, y, 0.4 + Math.min(e, 6) * 0.08); return scl([236, 232, 222], 0.88 + Math.min(e, 6) * 0.02); });
HD.counter_side = (t) => t.fill((x, y) => { const e = y < 3, door = x % 16 === 0 || y === 3, knob = (x % 16 === 12) && y > 6 && y < 10; if (e) { t.S(x, y, 0.5); t.H(x, y, 0.9); return [200, 196, 188]; } if (knob) { t.S(x, y, 0.7); return [200, 200, 205]; } t.H(x, y, door ? 0.2 : 0.6); return scl([236, 232, 222], door ? 0.75 : 0.95 + t.rnd() * 0.04); });
HD.stove_top = (t) => t.fill((x, y) => { for (const [cx, cy] of [[9, 9], [23, 9], [9, 23], [23, 23]]) { const r = Math.hypot(x - cx, y - cy); if (r < 5.5) { t.H(x, y, r > 4 ? 0.9 : 0.3); t.S(x, y, 0.6); return r > 4 ? [60, 60, 64] : r < 1.5 ? [200, 70, 40] : [30, 30, 32]; } } t.S(x, y, 0.5); t.H(x, y, 0.6); return scl([220, 220, 224], 0.92 + t.rnd() * 0.05); });
HD.stove_front = (t) => t.fill((x, y) => { const win = x > 6 && x < 25 && y > 11 && y < 25, frame = x > 4 && x < 27 && y > 9 && y < 27, knob = y > 2 && y < 6 && x % 6 === 3; if (knob) { t.H(x, y, 1); return [40, 40, 44]; } if (win) { t.S(x, y, 0.8); t.H(x, y, 0.3); return [40, 32, 30]; } if (frame) { t.H(x, y, 0.8); t.S(x, y, 0.6); return [170, 172, 178]; } t.H(x, y, 0.6); return scl([226, 226, 230], 0.92 + t.rnd() * 0.05); });
HD.sink_top = (t) => t.fill((x, y) => { const basin = x > 6 && x < 25 && y > 8 && y < 26, rim = x > 4 && x < 27 && y > 6 && y < 28, tap = x > 14 && x < 17 && y > 2 && y < 9; if (tap) { t.S(x, y, 0.9); t.H(x, y, 1); return [200, 204, 210]; } if (basin) { t.S(x, y, 0.8); t.H(x, y, 0.1); return scl([170, 176, 184], 0.85 + (y - 9) * 0.008); } if (rim) { t.S(x, y, 0.7); t.H(x, y, 0.7); return [196, 200, 206]; } t.H(x, y, 0.6); return scl([120, 84, 52], 0.85 + t.fbm(x, y, 4, 2) * 0.2); });
HD.bookshelf_oak = recolor((t) => HD.bookshelf(t), [150, 110, 80]);
HD.frame_wood = (t) => t.fill((x, y) => { const e = Math.min(x, y, 31 - x, 31 - y); t.H(x, y, e < 3 ? 0.9 - e * 0.1 : 0.4); return e < 3 ? scl([170, 120, 60], 0.8 + e * 0.1) : [236, 228, 210]; });
HD.cactus_side = (t) => t.fill((x, y) => { const rib = x % 6 === 0, spine = rib && y % 5 === 2; t.H(x, y, rib ? 0.9 : 0.5); if (spine) return [236, 230, 200]; return scl([70, 140, 70], rib ? 1.1 : 0.85 + t.fbm(x, y, 4, 2) * 0.15); });
HD.fern = (t) => { t.clear(); for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3, len = 12 + (i % 3) * 3; for (let s = 0; s < len; s++) { const x = 16 + Math.sin(a) * s, y = 31 - Math.cos(a) * s * 0.9; t.P(x, y, scl([70, 140, 60], 0.8 + s / len * 0.3)); if (s % 2 === 0) { t.P(x - 1.5, y - 0.5, [90, 160, 70]); t.P(x + 1.5, y - 0.5, [80, 150, 64]); } } } };
HD.sofa = (t) => t.fill((x, y) => { const seam = x % 16 === 0 || y % 16 === 0, btn = x % 16 === 8 && y % 16 === 8; t.H(x, y, seam || btn ? 0.2 : 0.65); return scl([150, 54, 50], seam || btn ? 0.7 : 0.92 + t.fbm(x, y, 4, 2) * 0.1); });
HD.drawer_front = (t) => t.fill((x, y) => { const gap = y % 8 === 0 || x === 0 || x === 31, knob = (y % 8 === 4) && (x === 15 || x === 16); if (knob) { t.H(x, y, 1); t.S(x, y, 0.7); return [200, 180, 110]; } t.H(x, y, gap ? 0.1 : 0.6); return scl([150, 110, 70], gap ? 0.55 : 0.9 + t.anoise(x, y, 2, 16, y >> 3) * 0.15); });
HD.vase = (t) => t.fill((x, y) => { const band = y > 12 && y < 18; t.S(x, y, 0.7); t.H(x, y, 0.6); return band ? [230, 200, 90] : scl([60, 120, 190], 0.9 + Math.sin(x * 0.4) * 0.05); });
// v12: hormigón de colores
const concColor = (c) => (t) => {
  t.fill((x, y) => {
    const n = t.fbm(x, y, 4, 4);
    const k = 0.9 + n * 0.12 + (t.rnd() - 0.5) * 0.05;
    t.H(x, y, 0.6 + n * 0.2); t.S(x, y, 0.12);
    return scl(c, k);
  });
  for (let x = 0; x < 32; x++) { t.shadeN(x, 0, 0.9); t.shadeN(x, 31, 0.9); }
};
HD.conc_rojo = concColor([176, 48, 42]);
HD.conc_naranja = concColor([214, 110, 34]);
HD.conc_amarillo = concColor([226, 190, 48]);
HD.conc_lima = concColor([120, 186, 48]);
HD.conc_verde = concColor([52, 120, 58]);
HD.conc_cian = concColor([40, 146, 150]);
HD.conc_celeste = concColor([96, 160, 214]);
HD.conc_azul = concColor([44, 70, 160]);
HD.conc_violeta = concColor([112, 56, 160]);
HD.conc_rosa = concColor([222, 120, 160]);
HD.conc_negro = concColor([34, 34, 38]);
HD.conc_blanco = concColor([224, 222, 214]);
// los dibujos HD reemplazan a los clásicos (así los que derivan de ellos, como hornos o palancas, también mejoran)
for (const k of Object.keys(HD)) DRAW[k] = HD[k];
const HD_SET = new Set(Object.keys(HD));

function emitClassic(mode, r, g, b) {
  if (mode === 'all') return 1;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
  if (mode === 'bright') return mx > 190 && (sat > 0.25 || mx > 235) ? 1 : 0;
  if (mode === 'green') return g > 190 && r < 200 ? 1 : 0;
  if (mode === 'warm') return r > 200 && b < 110 && g > 60 ? 1 : 0;
  return 0;
}

// Arma dos atlas de 1536×1536: color (RGBA) y material (normal XY, brillo/emisión, máscara de tinte).
// Devuelve un canvas (para íconos y minimapa) con .colorData y .matData invertidos en vertical para la GPU.
export function buildAtlas() {
  const SZ = ATLAS.size, C = ATLAS.cell, PD = ATLAS.pad;
  const color = new Uint8Array(SZ * SZ * 4), mat = new Uint8Array(SZ * SZ * 4);
  const img = new ImageData(SZ, SZ);
  const W = (v) => ((v % R) + R) % R;
  TILES.forEach((name, ti) => {
    const tl = makeTile(DRAW[name] || ((t) => t.noise(0xff00ff, 0)), ti + 1);
    const { rgba, hgt, tint, emis, spec } = tl;
    // estirar el color hacia los píxeles transparentes (evita bordes oscuros al filtrar)
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < R * R; i++) {
      if (rgba[i * 4 + 3] > 0) continue;
      const x = i % R, y = (i / R) | 0; let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = W(y + dy) * R + W(x + dx); if (rgba[j * 4 + 3] > 0 || rgba[j * 4] + rgba[j * 4 + 1] + rgba[j * 4 + 2] > 0) { r += rgba[j * 4]; g += rgba[j * 4 + 1]; b += rgba[j * 4 + 2]; n++; } }
      if (n) { rgba[i * 4] = r / n; rgba[i * 4 + 1] = g / n; rgba[i * 4 + 2] = b / n; }
    }
    const bump = BUMP[name] ?? (HD_SET.has(name) ? 3.2 : 1.6);
    const sp0 = SPEC[name] ?? 0.03;
    const em = EMIT_CLASSIC[name];
    const col0 = (ti % ATLAS.cols) * C, row0 = Math.floor(ti / ATLAS.cols) * C;
    for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) {
      const x = W(cx - PD), y = W(cy - PD), i = y * R + x;
      const ix = col0 + cx, iy = row0 + cy;
      const o = (iy * SZ + ix) * 4, og = ((SZ - 1 - iy) * SZ + ix) * 4;
      const r = clamp(rgba[i * 4]), g = clamp(rgba[i * 4 + 1]), b = clamp(rgba[i * 4 + 2]), a = clamp(rgba[i * 4 + 3]);
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = a;
      color[og] = r; color[og + 1] = g; color[og + 2] = b; color[og + 3] = a;
      // normal desde la altura (Sobel con repetición)
      const h = (xx, yy) => hgt[W(yy) * R + W(xx)];
      const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
      let nx = -dx * bump * 0.25, ny = -dy * bump * 0.25; const nl = Math.hypot(nx, ny, 1); nx /= nl; ny /= nl;
      let e = emis[i];
      if (em && !e) e = emitClassic(em, r, g, b);
      const s = spec[i] >= 0 ? spec[i] : sp0;
      mat[og] = clamp(Math.round((nx * 0.5 + 0.5) * 255)); mat[og + 1] = clamp(Math.round((ny * 0.5 + 0.5) * 255));
      mat[og + 2] = e > 0.02 ? 201 + Math.round(clamp(e, 0, 1) * 54) : Math.round(clamp(s, 0, 1) * 200);
      mat[og + 3] = tint[i];
    }
  });
  const c = document.createElement('canvas');
  c.width = c.height = SZ;
  c.getContext('2d').putImageData(img, 0, 0);
  c.colorData = color; c.matData = mat;
  return c;
}

// ---------- Paquetes de texturas ----------
// Plantilla: PNG de 16 columnas con un tile por celda, en el orden de TILES (tamaño de tile libre: 16, 32, 64…).
export function exportTemplate(atlasCanvas, size = 32) {
  const rows = Math.ceil(TILES.length / 16);
  const c = document.createElement('canvas'); c.width = 16 * size; c.height = rows * size;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  TILES.forEach((_, i) => { const [sx, sy] = tileRect(i); ctx.drawImage(atlasCanvas, sx, sy, R, R, (i % 16) * size, Math.floor(i / 16) * size, size, size); });
  return c;
}
export const TILE_NAMES = TILES;
// Aplica un paquete: reemplaza color (y recalcula relieve y tinte) en los tiles que no estén vacíos.
export function applyPack(atlasCanvas, img) {
  const size = Math.floor(img.width / 16);
  if (size < 4) return 0;
  const SZ = ATLAS.size, C = ATLAS.cell, PD = ATLAS.pad;
  const src = document.createElement('canvas'); src.width = src.height = R;
  const sctx = src.getContext('2d', { willReadFrequently: true }); sctx.imageSmoothingEnabled = size > R;
  const actx = atlasCanvas.getContext('2d');
  const out = actx.getImageData(0, 0, SZ, SZ);
  const color = atlasCanvas.colorData, mat = atlasCanvas.matData;
  const W = (v) => ((v % R) + R) % R;
  let n = 0;
  TILES.forEach((name, ti) => {
    const sx = (ti % 16) * size, sy = Math.floor(ti / 16) * size;
    if (sy + size > img.height) return;
    sctx.clearRect(0, 0, R, R);
    sctx.drawImage(img, sx, sy, size, size, 0, 0, R, R);
    const d = sctx.getImageData(0, 0, R, R).data;
    let any = false; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) { any = true; break; }
    if (!any) return;
    n++;
    const lum = (x, y) => { const i = (W(y) * R + W(x)) * 4; return (d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15) / 255; };
    const wasTint = HD_SET.has(name) && /grass/.test(name);
    const col0 = (ti % ATLAS.cols) * C, row0 = Math.floor(ti / ATLAS.cols) * C;
    for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) {
      const x = W(cx - PD), y = W(cy - PD), i = (y * R + x) * 4;
      const ix = col0 + cx, iy = row0 + cy, o = (iy * SZ + ix) * 4, og = ((SZ - 1 - iy) * SZ + ix) * 4;
      for (let k = 0; k < 4; k++) { out.data[o + k] = d[i + k]; color[og + k] = d[i + k]; }
      const dx = lum(x + 1, y) - lum(x - 1, y), dy = lum(x, y + 1) - lum(x, y - 1);
      let nx = -dx * 1.6, ny = -dy * 1.6; const nl = Math.hypot(nx, ny, 1); nx /= nl; ny /= nl;
      mat[og] = Math.round((nx * 0.5 + 0.5) * 255); mat[og + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      if (mat[og + 2] <= 200) mat[og + 2] = Math.round((SPEC[name] ?? 0.03) * 200);
      mat[og + 3] = wasTint && d[i + 1] > d[i] && d[i + 1] > d[i + 2] ? 255 : 0;
    }
  });
  actx.putImageData(out, 0, 0);
  return n;
}

// ---------- Íconos ----------
const TOOL_COL = { wood: 0x8a6e48, scrap: 0x9a5a30, steel: 0xc8ccd2, iron: 0x9aa0a8, elf: 0xb8f0d0, mithril: 0xe0f0ff, obsidian: 0x4a3a66, light: 0xfff0a0, fire: 0xff6a2a, heal: 0x6aff8a, shield: 0x6ab0ff, wind: 0xe0f8ff };
const PIX = {
  stick: ['........', '......#.', '.....#..', '....#...', '...#....', '..#.....', '.#......', '........'],
  pick: ['.hhhhh..', 'h....hh.', '....#.h.', '...#....', '..#.....', '.#......', '#.......', '........'],
  axe: ['....hh..', '...hhhh.', '...#hhh.', '..#.hh..', '..#.....', '.#......', '#.......', '........'],
  shovel: ['.....hh.', '....hhhh', '....hhh.', '...#h...', '..#.....', '.#......', '#.......', '........'],
  bat: ['......hh', '.....#h#', '....##h.', '...##h..', '..##....', '.##.....', '#.......', '........'],
  machete: ['.......h', '......hh', '.....hh.', '....hh..', '...hh...', '..#.....', '.#......', '#.......'],
  crossbow: ['hhhhhhhh', '...##...', '...##...', '..#..#..', '.#....#.', '#......#', '........', '........'],
  pistol: ['........', '.hhhhhhh', '.hhhhhhh', '.hh#....', '.h##....', '.##.....', '.#......', '........'],
  shotgun: ['........', 'hhhhhhhh', 'hhhhhh..', '.##.....', '##......', '#.......', '........', '........'],
  bow: ['..###...', '.#...h..', '#....h..', '#....h..', '#....h..', '#....h..', '.#...h..', '..###...'],
  arrow: ['......hh', '.....#hh', '....#...', '...#....', '..#.....', '.#......', 'h.......', '........'],
  flamer: ['........', '.hhhhh##', 'hhhhhh##', '.#h.....', '.##.....', '.#......', '........', '........'],
  sword: ['.......h', '......hh', '.....hh.', '....hh..', '.#.hh...', '..##....', '.#.#....', '#.......'],
  staff: ['.....hh.', '....hhhh', '....hhh.', '...#h...', '..#.....', '.#......', '#.......', '........'],
};

export function drawIcon(canvas, id, atlas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  ctx.clearRect(0, 0, w, w);
  ctx.imageSmoothingEnabled = false;
  if (isBlock(id)) {
    const b = BLOCKS[id];
    if (b.render === 'torch' || b.render === 'cross' || id === 16 || b.ladder || b.door || id === 75 || id === 78 || id === 101 || id === 103 || id === 108 || id === 116 || id === 126 || id === 160 || id === 181 || id === 184 || id === 185 || id === 186 || id === 187 || id === 189 || id === 191) {
      const ti = b.crop ? T[b.crop.kind === 'barley' ? 'barley3' : b.crop.kind === 'hops' ? 'hops3' : 'potato3'] : id === 108 ? T.fire : b.tex.side;
      { const [sx, sy] = tileRect(ti); ctx.imageSmoothingEnabled = true; ctx.drawImage(atlas, sx, sy, R, R, w * 0.1, w * 0.1, w * 0.8, w * 0.8); }
      return;
    }
    // cubo isométrico
    const drawFace = (ti, m, dark) => {
      ctx.save();
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      { const [sx, sy] = tileRect(ti); ctx.drawImage(atlas, sx, sy, R, R, 0, 0, 16, 16); }
      if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(0, 0, 16, 16); }
      ctx.restore();
    };
    const s = w / 32;
    const cx = w / 2, top = w * 0.02;
    const a = 12.5 * s / 16, bh = 7.2 * s / 16;
    // cara superior
    drawFace(b.tex.top, [a, bh, -a, bh, cx, top], 0);
    // izquierda
    drawFace(b.tex.front ?? b.tex.side, [a, bh, 0, 15 * s / 16, cx - a * 16, top + bh * 16], 0.25);
    // derecha
    drawFace(b.tex.side, [a, -bh, 0, 15 * s / 16, cx, top + bh * 32], 0.45);
    return;
  }
  const it = ITEMS[id];
  if (!it) return;
  const p = w / 16;
  const put = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * p), Math.round(y * p), Math.ceil(p), Math.ceil(p)); };
  const rgb = (h, k = 1) => `rgb(${((h >> 16) & 255) * k | 0},${((h >> 8) & 255) * k | 0},${(h & 255) * k | 0})`;
  if (PIX[it.icon]) {
    const pat = PIX[it.icon];
    const head = TOOL_COL[typeof it.color === 'string' ? it.color : (['bat', 'machete', 'crossbow', 'pistol', 'shotgun', 'flamer', 'arrow', 'sword'].includes(it.icon) ? 'steel' : it.icon === 'bow' ? 'scrap' : 'wood')];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const ch = pat[y][x];
      if (ch === '#') { put(x * 2, y * 2, rgb(0x6b5234)); put(x * 2 + 1, y * 2, rgb(0x6b5234)); put(x * 2, y * 2 + 1, rgb(0x4a3822)); put(x * 2 + 1, y * 2 + 1, rgb(0x4a3822)); }
      else if (ch === 'h') { put(x * 2, y * 2, rgb(head, 1.1)); put(x * 2 + 1, y * 2, rgb(head)); put(x * 2, y * 2 + 1, rgb(head, 0.85)); put(x * 2 + 1, y * 2 + 1, rgb(head, 0.7)); }
    }
    return;
  }
  const rnd = mulberry32(id);
  const lump = (col, cx, cy, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot((x - cx) / r[0], (y - cy) / r[1]);
      if (d < 1 - rnd() * 0.15) put(x, y, rgb(col, 1.15 - d * 0.5 + (rnd() - 0.5) * 0.2));
    }
  };
  const ingot = (col) => {
    for (let y = 6; y < 12; y++) for (let x = 2 + (11 - y) * 0.5; x < 14 - (11 - y) * 0.5; x++) put(Math.floor(x), y, rgb(col, y === 6 ? 1.25 : y > 9 ? 0.75 : 1));
  };
  switch (it.icon) {
    case 'ring': { const c = it.color; for (let a = 0; a < Math.PI * 2; a += 0.05) { const r = 4.5; put(Math.round(8 + Math.cos(a) * r), Math.round(9 + Math.sin(a) * r * 0.8), rgb(0xd8b040, 0.9 + Math.sin(a) * 0.2)); } lump(c, 8, 4, [2.2, 2]); put(7, 3, '#ffffff'); break; }
    case 'potion': { const c = it.color; for (let y = 6; y < 15; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, y - 10.5) < 4.8) put(x, y, rgb(y < 9 ? 0xc8e0e8 : c, x < 6 ? 1.3 : 1)); for (let y = 2; y < 7; y++) for (let x = 6; x < 10; x++) put(x, y, rgb(y < 3 ? 0x8a6a40 : 0xc8e0e8)); break; }
    case 'flower': for (let y = 8; y < 15; y++) put(8, y, '#4a7a2a'); put(7, 11, '#5a8a34'); put(6, 10, '#5a8a34'); lump(0xe8e0ff, 8, 6, [3, 3]); put(8, 6, '#ffe070'); break;
    case 'shield': for (let y = 2; y < 15; y++) for (let x = 3; x < 13; x++) { const w = y < 10 ? 5 : 5 - (y - 9); if (Math.abs(x - 7.5) < w) put(x, y, rgb(Math.abs(x - 7.5) > w - 1.2 || y === 2 ? 0x9aa0a8 : it.color, 1 + (7.5 - x) * 0.03)); } put(7, 7, '#d8b040'); put(8, 7, '#d8b040'); break;
    case 'mithril_ingot': ingot(0xd8e8f0); break;
    case 'cheese': { for (let y = 6; y < 13; y++) for (let x = 2; x < 14; x++) { if (y - 6 > (x - 2) * 0.6 + 1) continue; put(x, y, rgb(0xf0d060, y === 6 ? 1.15 : 1 - (y - 6) * 0.03)); } put(6, 10, '#c8a030'); put(9, 11, '#c8a030'); put(11, 9, '#c8a030'); break; }
    case 'jar': { for (let y = 5; y < 15; y++) for (let x = 4; x < 12; x++) put(x, y, rgb(y < 7 ? 0xd8d0c0 : 0xa86a2a, x < 6 ? 1.2 : 1)); for (let x = 3; x < 13; x++) { put(x, 3, '#c83a3a'); put(x, 4, '#e8e0d0'); } break; }
    case 'gem': { const c = it.color; for (let y = 4; y < 13; y++) for (let x = 4; x < 12; x++) { const d = Math.abs(x - 7.5) + Math.abs(y - 8.5) * 0.9; if (d < 4.5) put(x, y, rgb(c, 1.15 - d * 0.06 - (x > 8 ? 0.12 : 0))); } put(6, 6, '#ffffff'); put(7, 5, '#ffffff'); break; }
    case 'saw': for (let x = 3; x < 13; x++) for (let y = 7; y < 11; y++) put(x, y, rgb(0xb8bcc4, y === 7 ? 1.25 : 1)); for (let x = 3; x < 13; x += 2) put(x, 11, '#9a9ea6'); for (let y = 5; y < 12; y++) put(13, y, '#8a6a40'); put(14, 5, '#8a6a40'); put(14, 11, '#8a6a40'); break;
    case 'decor': { const c = it.color; for (let y = 4; y < 14; y++) for (let x = 3; x < 13; x++) if (y > 9 || (x > 4 && x < 11)) put(x, y, rgb(c, y === 4 || y === 10 ? 1.2 : 1 - (y - 4) * 0.02)); put(7, 6, '#ffffff'); break; }
    case 'rod': for (let i = 2; i < 14; i++) put(i, 15 - i, rgb(0x8a6a40, 1 + (i % 2) * 0.1)); for (let y = 2; y < 12; y++) put(13, y, '#e8e8e8'); put(13, 12, '#d83a3a'); put(13, 13, '#f0f0f0'); break;
    case 'fish': { const c = it.color; for (let y = 5; y < 12; y++) for (let x = 3; x < 12; x++) if (Math.hypot((x - 7) / 4.5, (y - 8.5) / 3) < 1) put(x, y, rgb(c, 1.2 - (y - 5) * 0.06)); for (let y = 6; y < 11; y++) put(12 + Math.abs(y - 8.5) * 0.6 | 0, y, rgb(c, 0.8)); put(5, 7, '#111111'); break; }
    case 'tank': for (let y = 3; y < 14; y++) for (let x = 5; x < 11; x++) if (y > 4 || Math.abs(x - 7.5) < 2) put(x, y, rgb(0xe8c040, x < 7 ? 1.25 : 1)); for (let y = 1; y < 4; y++) put(8, y, '#5a5e64'); put(7, 1, '#5a5e64'); break;
    case 'sailboat': for (let y = 10; y < 14; y++) for (let x = 1 + (y - 10); x < 15 - (y - 10); x++) put(x, y, rgb(0x7a5a38, y === 10 ? 1.3 : 1)); for (let y = 1; y < 10; y++) put(8, y, '#5a4028'); for (let y = 2; y < 9; y++) for (let x = 9; x < 9 + (9 - y) * 0.7; x++) put(Math.floor(x), y, '#f0ece0'); for (let y = 3; y < 9; y++) for (let x = 7 - (y - 3) * 0.6; x < 8; x++) put(Math.floor(x), y, '#e0dcd0'); break;
    case 'coconut': lump(0x6a4a2a, 8, 9, [4.5, 4.5]); put(7, 7, '#3a2a1a'); put(9, 7, '#3a2a1a'); put(8, 9, '#3a2a1a'); break;
    case 'drone': for (let x = 4; x < 12; x++) for (let y = 7; y < 10; y++) put(x, y, rgb(0xd8dce0, y === 7 ? 1.2 : 0.9)); put(7, 9, '#6ab0ff'); put(8, 9, '#6ab0ff');
      for (const [cx, cy] of [[3, 5], [12, 5]]) { for (let x = cx - 2; x <= cx + 2; x++) put(x, cy, '#3a3e44'); put(cx, cy + 1, '#5a5e64'); put(cx, cy + 2, '#5a5e64'); } break;
    case 'rocket': for (let y = 4; y < 13; y++) for (let x = 6; x < 10; x++) put(x, y, rgb(y % 3 === 0 ? 0xf0f0f0 : 0xd83a3a, x === 6 ? 1.2 : 1)); put(7, 3, '#e8c040'); put(8, 3, '#e8c040'); put(7, 2, '#e8c040'); for (let y = 13; y < 16; y++) put(8, y, '#8a6a40'); break;
    case 'egg': lump(0x8a5a2a, 8, 8.5, [4, 5.2]); for (let x = 5; x < 12; x++) put(x, 8, '#e8c040'); put(6, 6, '#c08a5a'); break;
    case 'candy': for (let y = 6; y < 11; y++) for (let x = 5; x < 11; x++) if (Math.hypot(x - 7.5, y - 8) < 3) put(x, y, rgb((x + y) % 2 ? 0xf06a2a : 0xf8e8d8)); put(3, 7, '#f06a2a'); put(4, 8, '#f06a2a'); put(3, 9, '#f06a2a'); put(12, 7, '#f06a2a'); put(11, 8, '#f06a2a'); put(12, 9, '#f06a2a'); break;
    case 'gift': for (let y = 6; y < 14; y++) for (let x = 3; x < 13; x++) put(x, y, rgb(x === 7 || x === 8 || y === 9 ? 0xe8c040 : 0xc83a3a, y === 6 ? 1.2 : 1)); put(6, 5, '#e8c040'); put(5, 4, '#e8c040'); put(9, 5, '#e8c040'); put(10, 4, '#e8c040'); break;
    case 'apple': lump(0xc83a2a, 8, 9, [4.5, 4.2]); put(6, 7, '#ff9a8a'); put(8, 4, '#5a3a1a'); put(9, 3, '#4a8a2a'); put(10, 3, '#4a8a2a'); break;
    case 'tome': for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) put(x, y, rgb(x === 3 || x === 12 ? 0x3a1a4a : y === 3 || y === 13 ? 0xd8b040 : 0x5a2a7a)); for (let y = 6; y < 11; y++) put(8, y, '#9ad8ff'); put(7, 8, '#9ad8ff'); put(9, 8, '#9ad8ff'); break;
    case 'crystal': for (let y = 2; y < 15; y++) { const w = y < 6 ? (y - 1) : (15 - y) * 0.45; for (let x = 8 - w; x <= 8 + w; x++) put(Math.round(x), y, rgb(x < 8 ? 0xb0a0ff : 0x7a6ad8, 1)); } put(7, 5, '#ffffff'); break;
    case 'scale': for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if (Math.hypot((x - 8) / 5, (y - 6) / 7) < 1) put(x, y, rgb(0x8a2a1a, 1.2 - Math.hypot(x - 8, y - 5) * 0.08)); break;
    case 'coal': lump(0x4a4644, 8, 9, [5, 4]); put(6, 7, '#8a8580'); put(9, 8, '#77726c'); break;
    case 'scrap': lump(0x8a4a24, 6, 9, [4, 3]); lump(0x9a9aa0, 10, 8, [3, 4]); break;
    case 'copper_ingot': ingot(0xc27a3e); break;
    case 'steel_ingot': ingot(0xb8bcc4); break;
    case 'uranium': lump(0x7cff3a, 8, 8, [3, 5]); put(8, 6, '#eaffc0'); break;
    case 'meat': lump(0xb84a4a, 7, 8, [5, 4]); for (let i = 10; i < 14; i++) put(i, i - 2, '#e8e0d0'); put(14, 11, '#e8e0d0'); put(13, 12, '#e8e0d0'); break;
    case 'cooked': lump(0x8a4a22, 7, 8, [5, 4]); for (let i = 10; i < 14; i++) put(i, i - 2, '#e8e0d0'); put(14, 11, '#e8e0d0'); break;
    case 'can':
      for (let y = 4; y < 14; y++) for (let x = 4; x < 12; x++) put(x, y, rgb(y > 6 && y < 11 ? 0xb8503a : 0x9aa0a6, x < 6 ? 1.2 : x > 9 ? 0.7 : 1));
      for (let x = 5; x < 11; x++) put(x, 3, rgb(0xc8ccd2));
      break;
    case 'pills':
      for (let y = 5; y < 14; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0xd9823b, x < 7 ? 1.2 : 0.9));
      for (let y = 2; y < 5; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0xeeeeee, x < 7 ? 1 : 0.85));
      for (let x = 6; x < 10; x++) put(x, 9, '#f5f0e0');
      break;
    case 'bucket': case 'bucket_toxic': case 'bucket_clean': case 'bucket_lava': {
      const fill = { bucket_toxic: 0x7aa02a, bucket_clean: 0x4a90d0, bucket_lava: 0xe8601a }[it.icon];
      for (let y = 5; y < 14; y++) { const w0 = 3 + Math.floor((y - 5) / 3); for (let x = w0; x < 16 - w0; x++) put(x, y, rgb(0x9aa0a6, x < w0 + 2 ? 1.2 : x > 13 - w0 ? 0.7 : 1)); }
      if (fill) for (let x = 4; x < 12; x++) put(x, 5, rgb(fill, 1.1));
      for (let x = 3; x < 13; x++) put(x, 2 + Math.round(Math.abs(x - 7.5) * 0.4), '#55585c');
      break;
    }
    case 'seeds': for (let i = 0; i < 9; i++) put(4 + (i % 3) * 3 + (i > 5 ? 1 : 0), 5 + Math.floor(i / 3) * 3, rgb(0xc8a860, 0.8 + rnd() * 0.4)); break;
    case 'barley': for (let s = 0; s < 3; s++) { for (let y = 3; y < 15; y++) put(5 + s * 3 + (y < 8 ? 0 : 0), y, rgb(y < 8 ? 0xe0c060 : 0xb89a4a, y < 8 && y % 2 ? 1.15 : 1)); put(6 + s * 3, 4, '#f0d880'); } break;
    case 'hop_cutting': for (let y = 4; y < 14; y++) put(8 + Math.round(Math.sin(y) * 1), y, '#4a6a2a'); lump(0x6aa03a, 6, 6, [2.5, 2]); break;
    case 'hops': lump(0x9ad85a, 8, 8, [4, 5]); for (let y = 4; y < 13; y += 2) for (let x = 5; x < 12; x += 2) put(x, y, '#6ab03a'); put(8, 2, '#4a6a2a'); break;
    case 'potato': lump(0xb89a60, 8, 9, [5, 4]); put(6, 8, '#6a5030'); put(10, 10, '#6a5030'); break;
    case 'potato_baked': lump(0x8a6030, 8, 9, [5, 4]); put(7, 7, '#f0d880'); put(8, 7, '#f0d880'); break;
    case 'malt': for (let i = 0; i < 14; i++) lump(0xd8b060, 4 + (i * 5) % 9, 5 + (i * 3) % 7, [1.2, 1.6]); break;
    case 'malt_dark': for (let i = 0; i < 14; i++) lump(0x5a3218, 4 + (i * 5) % 9, 5 + (i * 3) % 7, [1.2, 1.6]); break;
    case 'grist': case 'grist_dark': {
      const c = it.icon === 'grist' ? 0xd8b060 : 0x5a3218;
      for (let y = 6; y < 14; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) < (y - 5) * 0.9) put(x, y, rgb(c, 0.8 + rnd() * 0.4));
      break;
    }
    case 'yeast':
      for (let y = 4; y < 14; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0xc8ccb8, x < 7 ? 1.15 : 0.9));
      for (let y = 8; y < 14; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0xe8d8a0, x < 7 ? 1.1 : 0.9));
      for (let x = 5; x < 11; x++) put(x, 3, '#6b5234');
      break;
    case 'wort':
      for (let y = 5; y < 14; y++) { const w0 = 3 + Math.floor((y - 5) / 3); for (let x = w0; x < 16 - w0; x++) put(x, y, rgb(0x9aa0a6, x < w0 + 2 ? 1.2 : 0.9)); }
      for (let x = 4; x < 12; x++) { put(x, 5, rgb(it.color, 1.1)); put(x, 6, rgb(it.color)); }
      for (let x = 3; x < 13; x++) put(x, 2 + Math.round(Math.abs(x - 7.5) * 0.4), '#55585c');
      break;
    case 'bottle': case 'beer': {
      const glass = it.icon === 'beer' ? 0x5a3010 : 0x7a9a8a;
      for (let y = 6; y < 15; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(glass, x < 7 ? 1.3 : 0.9));
      for (let y = 2; y < 6; y++) for (let x = 7; x < 9; x++) put(x, y, rgb(glass, 1.1));
      if (it.icon === 'beer') { for (let y = 8; y < 12; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(it.color === 0x2a1a10 ? 0xe8e0d0 : it.color, 1)); put(7, 1, '#d8b060'); put(8, 1, '#d8b060'); }
      break;
    }
    case 'bolt': for (let i = 2; i < 14; i++) put(i, 15 - i, '#6b5234'); put(13, 2, '#c8ccd2'); put(14, 1, '#c8ccd2'); put(12, 2, '#c8ccd2'); put(3, 13, '#e8e0d0'); put(2, 12, '#e8e0d0'); break;
    case 'vest': case 'hazmat':
      for (let y = 3; y < 15; y++) for (let x = 3; x < 13; x++) { if (y < 6 && x > 5 && x < 10) continue; put(x, y, rgb(it.color, x < 5 ? 1.2 : x > 10 ? 0.75 : 1)); }
      if (it.icon === 'hazmat') for (let x = 5; x < 11; x++) put(x, 9, '#1a1a14');
      break;
    case 'helmet': for (let y = 4; y < 11; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, (y - 10) * 1.3) < 6) put(x, y, rgb(it.color, x < 6 ? 1.2 : 0.9)); for (let x = 2; x < 14; x++) put(x, 11, rgb(it.color, 0.7)); break;
    case 'mask':
      for (let y = 4; y < 13; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, y - 8) < 5) put(x, y, '#2e2e2e');
      put(5, 7, '#9cff3a'); put(6, 7, '#9cff3a'); put(9, 7, '#9cff3a'); put(10, 7, '#9cff3a');
      for (let y = 10; y < 14; y++) for (let x = 6; x < 10; x++) put(x, y, '#55585c');
      break;
    case 'medkit':
      for (let y = 4; y < 14; y++) for (let x = 2; x < 14; x++) put(x, y, rgb(0xe8e4dc, x < 4 ? 1.05 : 0.95));
      for (let i = 5; i < 13; i++) { put(i, 8, '#c8302a'); put(i, 9, '#c8302a'); } for (let j = 5; j < 13; j++) { put(7, j, '#c8302a'); put(8, j, '#c8302a'); }
      for (let x = 6; x < 10; x++) put(x, 3, '#6a6660');
      break;
    case 'blueprint':
      for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) put(x, y, rgb(0x2a5a9a, 0.9 + ((x + y) % 2) * 0.1));
      for (let x = 4; x < 12; x++) { put(x, 5, '#cfe0f5'); put(x, 10, '#cfe0f5'); } for (let y = 4; y < 12; y++) put(8, y, '#cfe0f5');
      for (let y = 2; y < 14; y++) put(12, y, '#1a3a6a');
      break;
    case 'moto':
      for (const cx of [4, 12]) for (let y = 9; y < 15; y++) for (let x = cx - 3; x < cx + 3; x++) { const d = Math.hypot(x - cx + 0.5, y - 11.5); if (d < 3 && d > 1.4) put(x, y, '#222'); }
      const mc = typeof it.color === 'number' ? rgb(it.color) : '#9a5a30';
      for (let x = 4; x < 13; x++) put(x, 9, mc); for (let x = 6; x < 11; x++) put(x, 8, mc);
      put(12, 6, '#55585c'); put(12, 7, '#55585c'); put(13, 5, '#55585c'); put(5, 7, '#3a3a3a'); put(6, 7, '#3a3a3a');
      break;
    case 'core': lump(0x3a1a4a, 8, 8, [5, 5]); lump(0x9cff3a, 8, 8, [2, 2]); break;
    case 'coin': for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 5) put(x, y, rgb(0xc8a030, d > 4 ? 0.7 : x < 7 ? 1.25 : 1)); } for (let y = 5; y < 11; y++) put(7, y, '#8a6a1a'); put(8, 6, '#8a6a1a'); put(8, 9, '#8a6a1a'); break;
    case 'cargo': for (let y = 4; y < 14; y++) for (let x = 2; x < 14; x++) put(x, y, rgb(0x8a6a44, x < 4 ? 1.2 : 0.95)); for (let x = 2; x < 14; x++) { put(x, 4, '#5a4028'); put(x, 8, '#5a4028'); put(x, 13, '#5a4028'); } put(7, 6, '#e0c23a'); break;
    case 'lighter': for (let y = 5; y < 14; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0xb8bcc4, x < 7 ? 1.2 : 0.85)); put(7, 3, '#ffd84a'); put(8, 3, '#ff9a2a'); put(7, 2, '#ff9a2a'); put(7, 4, '#5a5e62'); break;
    case 'grenade': for (let y = 5; y < 14; y++) for (let x = 4; x < 12; x++) if (Math.hypot((x - 7.5) / 4, (y - 9.5) / 4.5) < 1) put(x, y, rgb(0x4a5a3a, x < 6 ? 1.2 : 0.9)); for (let x = 6; x < 10; x++) put(x, 4, '#8a8e94'); put(10, 3, '#8a8e94'); put(11, 3, '#8a8e94'); break;
    case 'saddle': for (let y = 6; y < 12; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) < 6 - (y - 6) * 0.3) put(x, y, rgb(0x6a4028, y === 6 ? 1.3 : 1)); for (let y = 11; y < 15; y++) { put(3, y, '#3a2a1a'); put(12, y, '#3a2a1a'); } break;
    case 'tape': for (let y = 4; y < 13; y++) for (let x = 3; x < 12; x++) if (Math.hypot(x - 7, y - 8.5) < 4.5) put(x, y, rgb(0xe0c23a, x < 5 ? 1.2 : 0.9)); for (let x = 11; x < 15; x++) put(x, 11, '#e0c23a'); put(7, 8, '#1a1a1a'); break;
    case 'blueprint_build': for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) put(x, y, rgb(0x3a6a3a, 0.9 + ((x + y) % 2) * 0.1)); for (let x = 5; x < 11; x++) { put(x, 5, '#cfe0c0'); put(x, 10, '#cfe0c0'); } for (let y = 5; y < 11; y++) { put(5, y, '#cfe0c0'); put(10, y, '#cfe0c0'); } break;
    case 'cup': for (let y = 2; y < 9; y++) for (let x = 3 + (y - 2) * 0.3; x < 13 - (y - 2) * 0.3; x++) put(Math.floor(x), y, rgb(0xc8ccd2, x < 6 ? 1.3 : 1)); for (let y = 9; y < 12; y++) { put(7, y, '#9aa0a6'); put(8, y, '#9aa0a6'); } for (let x = 4; x < 12; x++) { put(x, 12, '#6a4a2a'); put(x, 13, '#4a3a1a'); } for (let x = 5; x < 11; x++) put(x, 3, '#d8a040'); break;
    case 'heli': for (let y = 7; y < 12; y++) for (let x = 2; x < 11; x++) if (Math.hypot((x - 6.5) / 4.5, (y - 9.5) / 2.5) < 1) put(x, y, rgb(0x5a6a4a, x < 5 ? 1.2 : 1)); for (let x = 10; x < 15; x++) put(x, 9, '#5a6a4a'); put(14, 8, '#5a6a4a'); for (let x = 1; x < 14; x++) put(x, 5, '#2a2a2a'); put(6, 6, '#2a2a2a'); for (let x = 3; x < 6; x++) put(x, 9, '#8ab0c8'); break;
    case 'cart': for (let y = 6; y < 11; y++) for (let x = 3; x < 13; x++) put(x, y, rgb(0x6a6e72, x < 5 ? 1.2 : 0.9)); for (const cx of [5, 11]) { put(cx, 12, '#1a1a1a'); put(cx - 1, 12, '#1a1a1a'); } for (let x = 1; x < 15; x++) put(x, 13, '#9aa0a6'); break;
    case 'mine': for (let y = 7; y < 12; y++) for (let x = 3; x < 13; x++) if (Math.abs(x - 7.5) < 5 - (11 - y) * 0.6) put(x, y, rgb(0x3a3a2a, x < 6 ? 1.2 : 0.9)); put(7, 6, '#8a8e94'); put(8, 6, '#8a8e94'); put(7, 5, '#c8302a'); break;
    case 'bottle_alc':
      for (let y = 6; y < 15; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0xc8e0e8, x < 7 ? 1.1 : 0.85));
      for (let y = 2; y < 6; y++) for (let x = 7; x < 9; x++) put(x, y, rgb(0xc8e0e8));
      for (let x = 5; x < 11; x++) { put(x, 9, '#c8302a'); put(x, 10, '#c8302a'); }
      break;
    case 'stew': case 'soup': {
      for (let y = 8; y < 14; y++) for (let x = 2 + (y - 8) * 0.5; x < 14 - (y - 8) * 0.5; x++) put(Math.floor(x), y, rgb(0x6a5a4a, y === 8 ? 1.3 : 1));
      const c = it.icon === 'stew' ? 0x9a4a22 : 0x8a6ad8;
      for (let x = 3; x < 13; x++) put(x, 8, rgb(c, 1.1));
      put(5, 7, rgb(c)); put(9, 7, rgb(0xe0c060)); put(7, 6, '#bbbbbb'); put(8, 5, '#999999');
      break;
    }
    case 'bread': lump(0xc88a40, 8, 9, [6, 4]); for (let x = 4; x < 12; x += 3) put(x, 7, '#e8c080'); break;
    case 'mushroom': for (let y = 8; y < 14; y++) { put(7, y, '#d8d0c0'); put(8, y, '#c8c0b0'); } lump(0x3a8ad8, 8, 6, [5, 3]); put(6, 5, '#9ae0ff'); put(10, 6, '#9ae0ff'); break;
    case 'canteen': case 'canteen_full':
      for (let y = 4; y < 15; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, y - 9.5) < 5.2) put(x, y, rgb(0x5a6a4a, x < 6 ? 1.2 : 0.9));
      for (let y = 1; y < 4; y++) { put(7, y, '#8a8e94'); put(8, y, '#8a8e94'); }
      if (it.icon === 'canteen_full') { put(6, 8, '#6ab0e0'); put(7, 8, '#6ab0e0'); }
      break;
    case 'pills_blue':
      for (let y = 5; y < 14; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0x3a7ad8, x < 7 ? 1.2 : 0.9));
      for (let y = 2; y < 5; y++) for (let x = 5; x < 11; x++) put(x, y, rgb(0xeeeeee, x < 7 ? 1 : 0.85));
      break;
    case 'powder': for (let y = 8; y < 14; y++) for (let x = 3; x < 13; x++) if (Math.abs(x - 7.5) < (y - 7) * 1.1) put(x, y, rgb(0x2a2a2a, 0.8 + rnd() * 0.5)); break;
    case 'ammo': for (const x0 of [3, 7, 11]) { for (let y = 7; y < 14; y++) { put(x0, y, '#c8a030'); put(x0 + 1, y, '#a88020'); } put(x0, 5, '#8a6a4a'); put(x0 + 1, 5, '#8a6a4a'); put(x0, 6, '#8a6a4a'); put(x0 + 1, 6, '#6a4a2a'); } break;
    case 'coat': for (let y = 3; y < 15; y++) for (let x = 3; x < 13; x++) { if (y < 6 && x > 5 && x < 10) continue; put(x, y, rgb(0x8a6040, x < 5 ? 1.2 : x > 10 ? 0.75 : 1)); } for (let y = 3; y < 7; y++) { put(5, y, '#e8e0d0'); put(10, y, '#e8e0d0'); } break;
    case 'leather': for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if (Math.hypot((x - 7.5) / 5, (y - 8.5) / 5.5) < 1 - rnd() * 0.1) put(x, y, rgb(0x9a6a40, 0.85 + rnd() * 0.3)); break;
    case 'note': for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) put(x, y, rgb(0xe8dcc0, 0.9 + ((x + y) % 3) * 0.04)); for (let y = 4; y < 13; y += 2) for (let x = 4; x < 12; x++) if (rnd() < 0.8) put(x, y, '#5a4a3a'); break;
    case 'jerrycan': case 'jerrycan_full':
      for (let y = 4; y < 15; y++) for (let x = 3; x < 13; x++) put(x, y, rgb(it.icon === 'jerrycan_full' ? 0xc8302a : 0x6a5a4a, x < 5 ? 1.2 : 0.9));
      for (let x = 5; x < 9; x++) put(x, 3, '#3a3a3a'); put(11, 3, '#8a8e94'); put(11, 2, '#8a8e94'); put(7, 9, '#1a1a1a'); put(8, 10, '#1a1a1a'); put(9, 9, '#1a1a1a');
      break;
    case 'car': case 'racecar': case 'truck': {
      const body = it.icon === 'racecar' ? 0xc8302a : it.icon === 'truck' ? 0x5a6a4a : 0x9a5a30;
      const x1 = it.icon === 'truck' ? 15 : 14;
      for (let y = 7; y < 12; y++) for (let x = 1; x < x1; x++) put(x, y, rgb(body, y === 7 ? 1.2 : 1));
      if (it.icon === 'truck') { for (let y = 3; y < 7; y++) for (let x = 1; x < 9; x++) put(x, y, rgb(0x6a5a4a)); for (let y = 4; y < 7; y++) for (let x = 10; x < 14; x++) put(x, y, rgb(body)); }
      else if (it.icon === 'car') for (let y = 4; y < 7; y++) for (let x = 4; x < 11; x++) put(x, y, rgb(x > 5 && x < 10 ? 0x8ab0c8 : body));
      else { for (let x = 5; x < 9; x++) put(x, 6, '#1a1a1a'); for (let x = 1; x < 4; x++) put(x, 5, rgb(body)); }
      for (const cx of [4, 11]) for (let y = 10; y < 15; y++) for (let x = cx - 2; x < cx + 2; x++) if (Math.hypot(x - cx + 0.5, y - 12.5) < 2.2) put(x, y, '#1a1a1a');
      break;
    }
    case 'boat': for (let y = 8; y < 13; y++) for (let x = 1 + (y - 8); x < 15 - (y - 8) * 0.5; x++) put(Math.floor(x), y, rgb(0x7a5a38, y === 8 ? 1.3 : 1)); for (let y = 3; y < 8; y++) put(8, y, '#6b5234'); for (let y = 3; y < 7; y++) for (let x = 9; x < 9 + (7 - y); x++) put(x, y, '#e8e0d0'); break;
    case 'trophy':
      for (let y = 2; y < 9; y++) for (let x = 3 + (y - 2) * 0.3; x < 13 - (y - 2) * 0.3; x++) put(Math.floor(x), y, rgb(0xe0c23a, x < 6 ? 1.3 : 1));
      for (let y = 9; y < 12; y++) { put(7, y, '#c8a030'); put(8, y, '#c8a030'); } for (let x = 4; x < 12; x++) { put(x, 12, '#8a6a2a'); put(x, 13, '#6a4a1a'); }
      put(2, 3, '#e0c23a'); put(13, 3, '#e0c23a'); put(2, 4, '#e0c23a'); put(13, 4, '#e0c23a');
      break;
    case 'feather': for (let i = 2; i < 14; i++) { put(i, 15 - i, '#555'); put(i + 1, 15 - i, '#1a1a1e'); put(i - 1, 15 - i, '#2a2a30'); } break;
  }
}
