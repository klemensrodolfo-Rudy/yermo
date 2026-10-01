// Mundo «Buenos Aires»: réplica del centro porteño alrededor del origen (1 bloque = 1 metro).
// La 9 de Julio corre de norte (-z) a sur (+z); Corrientes la cruza de este a oeste en z = 0,
// con el Obelisco en la Plaza de la República y la Diagonal Norte saliendo hacia el sureste.
import { hash2, hash3 } from './noise.js';

export const GROUND = 48;
export const AREA = { x0: -300, x1: 300, z0: -460, z1: 575 };
export const BLEND = 70;
const CROSS = 112; // distancia entre calles transversales
// calles transversales (z del centro → [nombre, media anchura])
export const STREETS = { '-448': ['Av. Córdoba', 9], '-336': ['Viamonte', 6], '-224': ['Tucumán', 6], '-112': ['Lavalle', 6], 0: ['Av. Corrientes', 13], 112: ['Sarmiento', 6], 224: ['Tte. Gral. J. D. Perón', 6], 336: ['Bartolomé Mitre', 6], 448: ['Rivadavia', 6], 560: ['Av. de Mayo', 15] };
const NS = [176, 288]; // calles paralelas a la avenida (|x| del centro), media anchura 6
// bloques
const ASPH = 11, WHITE = 1035, YELLOW = 1026, GRASS = 84, DIRT = 4, STONE = 2, VEREDA = 1150, CONC = 9, GLASS = 14, LAMP = 1117;
const POST = 85, LOG = 222, LEAF = 206, JAC = 1148, PALO = 1149, PLAZA = 1043, OBE = 1116, BASALT = 1046;

// ---------- letras de 5x7 para carteles grandes ----------
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'], X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
};
// columna de texto: ¿qué filas (0 = abajo) se pintan en la columna u del texto, a escala s?
function textColumn(str, u, s) {
  let x = 0;
  for (const ch of str) {
    const g = FONT[ch] || FONT[' '], w = g[0].length * s;
    if (u >= x && u < x + w) { const c = Math.floor((u - x) / s), rows = []; for (let r = 0; r < 7 * s; r++) if (g[6 - Math.floor(r / s)][c] === '1') rows.push(r); return rows; }
    x += w + s;
  }
  return null;
}
const textWidth = (str, s) => { let w = 0; for (const ch of str) w += ((FONT[ch] || FONT[' '])[0].length + 1) * s; return w - s; };

export const inArea = (x, z) => x >= AREA.x0 && x <= AREA.x1 && z >= AREA.z0 && z <= AREA.z1;
export function areaBlend(x, z) {
  const dx = Math.max(AREA.x0 - x, 0, x - AREA.x1), dz = Math.max(AREA.z0 - z, 0, z - AREA.z1);
  const d = Math.hypot(dx, dz);
  return d <= 0 ? 1 : d >= BLEND ? 0 : 1 - d / BLEND;
}

// ---------- zonas ----------
function crossStreet(z) {
  const k = Math.round(z / CROSS), info = STREETS[k * CROSS];
  if (!info) return null;
  const dz = Math.abs(z - k * CROSS);
  return dz <= info[1] ? { k, dz, hw: info[1], z0: k * CROSS } : null;
}
const diagDist = (x, z) => (x - z) / Math.SQRT2; // distancia (con signo) a la Diagonal Norte (x = z)
const onDiag = (x, z) => x > 60 && z > 20 && Math.abs(diagDist(x, z)) <= 14;
const ellipse = (x, z, rx, rz) => (x * x) / (rx * rx) + (z * z) / (rz * rz);

// árboles: grilla con desfase; tipo según azar
function treeAt(gx, gz, s, zone) {
  const h = hash2(s + 1201, gx, gz);
  if (h > zone) return null;
  const t = hash2(s + 1202, gx, gz);
  return { type: t < 0.45 ? 'tipa' : t < 0.8 ? 'jac' : 'palo', h: 5 + Math.floor(hash2(s + 1203, gx, gz) * 3), r: 2.6 + hash2(s + 1204, gx, gz) * 1.2 };
}

export function makePorteno(gen) {
  const s = gen.seed;
  // ¿en qué parte de la avenida cae |x|? (perfil simétrico)
  const avePart = (a) => (a <= 6 ? 'median' : a <= 14 ? 'bus' : a <= 18 ? 'strip' : a <= 36 ? 'lanes' : a <= 56 ? 'plaza' : a <= 64 ? 'coll' : 'walk');
  // manzana que contiene (x, z) fuera de la avenida
  function blockOf(x, z) {
    const side = x > 0 ? 1 : -1, a = Math.abs(x);
    if (a <= 70) return null;
    let bx0, bx1;
    if (a < NS[0] - 6) { bx0 = 70; bx1 = NS[0] - 6; } else if (a > NS[0] + 6 && a < NS[1] - 6) { bx0 = NS[0] + 6; bx1 = NS[1] - 6; } else if (a > NS[1] + 6) { bx0 = NS[1] + 6; bx1 = 400; } else return null;
    const k = Math.floor(z / CROSS);
    const za = k * CROSS, zb = (k + 1) * CROSS;
    const hwa = STREETS[za]?.[1] ?? 6, hwb = STREETS[zb]?.[1] ?? 6;
    const bz0 = za + hwa, bz1 = zb - hwb;
    if (z <= bz0 || z >= bz1) return null;
    return { side, bx0, bx1, bz0, bz1, id: `${side}:${bx0}:${k}` };
  }
  // parámetros de un lote (edificio) por manzana, borde y posición a lo largo del borde
  function lot(b, edge, pos) {
    const len = 9 + Math.floor(hash2(s + 1301, b.bx0 * 7 + b.side, Math.floor(pos / 13) + edge * 1000 + b.bz0) * 9);
    const li = Math.floor(pos / len);
    const r = hash3(s + 1302, b.bx0 * b.side + edge, li, b.bz0);
    const nearPlaza = Math.abs(b.bz0) < 140 && b.bx0 === 70;
    const floors = edge === 'diag' ? 11 : nearPlaza ? 10 + Math.floor(r * 6) : 5 + Math.floor(r * 10);
    const mats = [CONC, CONC, 13, 13, 1043, 1043, 1116, 1116, 1036, 1049, 1038, 1035, 1040, 10];
    const mat = edge === 'diag' ? (r < 0.5 ? 1116 : 1043) : mats[Math.floor(hash3(s + 1303, b.bx0 * b.side, li + edge * 31, b.bz0) * mats.length)];
    return { li, len, floors, mat, r, start: li * len };
  }

  // devuelve la columna de bloques (y desde GROUND-3) para (x, z) dentro del área
  function column(x, z, put) {
    const G = GROUND, a = Math.abs(x);
    // suelo base
    put(G - 3, STONE); put(G - 2, STONE); put(G - 1, DIRT);
    const cs = crossStreet(z);
    // ---------- Plaza de la República y el Obelisco ----------
    const e = ellipse(x, z, 44, 30), ring = ellipse(x, z, 58, 42);
    if (e <= 1) {
      const r = Math.hypot(x, z);
      if (Math.max(Math.abs(x), Math.abs(z)) <= 5) { put(G, OBE); put(G + 1, OBE); if (Math.max(Math.abs(x), Math.abs(z)) <= 1) for (let y = G + 2; y <= G + 62; y++) put(y, WHITE); return; }
      const path = Math.abs(x) <= 2 || Math.abs(z) <= 2 || r <= 13 || e > 0.86;
      put(G, path ? VEREDA : GRASS);
      // letras «BA» sobre el pasto, al sudoeste del Obelisco (mirando al sur)
      if (z === 18 || z === 19) { const u = x + 26, rows = u >= 0 ? textColumn('BA', u, 1) : null; if (rows) for (const ry of rows) put(G + 1 + ry, WHITE); }
      // canteros con flores y faroles en el borde
      if (!path && hash2(s + 1401, x, z) < 0.05) put(G + 1, 214);
      if (e > 0.8 && e < 0.86 && (x + z) % 11 === 0) { for (let y = G + 1; y <= G + 4; y++) put(y, POST); put(G + 5, LAMP); }
      return;
    }
    if (ring <= 1 && a <= 70) { put(G, ASPH); if (ring > 0.97 && a < 64) put(G, WHITE); return; }
    // ---------- 9 de Julio ----------
    if (a <= 70) {
      const part = avePart(a);
      if (cs && part !== 'walk') {
        // cruce: asfalto y senda peatonal en los bordes
        put(G, ASPH);
        const edgeD = cs.hw - cs.dz;
        if (edgeD >= 1 && edgeD <= 3 && (part === 'lanes' || part === 'bus' || part === 'coll') && Math.floor(a) % 2 === 0) put(G, WHITE);
        return;
      }
      if (part === 'walk') { put(G, cs ? ASPH : VEREDA); if (!cs && a === 65 && ((z % 23) + 23) % 23 === 7) { for (let y = G + 1; y <= G + 5; y++) put(y, POST); put(G + 6, LAMP); } return; }
      if (part === 'coll' || part === 'lanes') {
        put(G, ASPH);
        if (part === 'lanes' && [22, 25, 29, 32].includes(a) && ((z % 10) + 10) % 10 < 4) put(G, WHITE);
        if (part === 'coll' && a === 60 && ((z % 10) + 10) % 10 < 4) put(G, WHITE);
        return;
      }
      if (part === 'bus') { put(G, ASPH); if (a === 10 && ((z % 8) + 8) % 8 < 3) put(G, YELLOW); return; }
      // estaciones del Metrobús en el cantero central
      const st = [-300, -76, 76, 300].find((sz) => Math.abs(z - sz) <= 16);
      if (part === 'median' && st != null) {
        put(G, CONC);
        const dz = Math.abs(z - st);
        if (a <= 5) { put(G + 5, a <= 4 ? GLASS : 27); if (a === 5 && dz % 8 === 0) for (let y = G + 1; y <= G + 4; y++) put(y, POST); if (a === 2 && dz % 5 === 1) put(G + 1, 59); }
        if (a === 6 && dz <= 15 && dz % 4 !== 0) put(G + 1, GLASS);
        return;
      }
      // canteros con pasto, árboles y faroles
      put(G, GRASS);
      if (part === 'strip' || part === 'median') return;
      // plazoletas anchas: senderos y árboles
      if (a === 46) put(G, VEREDA);
      if ((a === 38 || a === 54) && ((z % 20) + 20) % 20 === 0) { for (let y = G + 1; y <= G + 5; y++) put(y, POST); put(G + 6, LAMP); }
      return;
    }
    // ---------- manzanas ----------
    if (cs) { put(G, ASPH); if (cs.dz === 0 && ((a % 8) + 8) % 8 < 3) put(G, cs.k === 0 ? YELLOW : WHITE); const edgeD = cs.hw - cs.dz; if (edgeD >= 1 && edgeD <= 3 && Math.floor(a) % 2 === 0 && (a < 74 || Math.abs(a - NS[0]) < 9 || Math.abs(a - NS[1]) < 9)) put(G, WHITE); return; }
    if (Math.abs(a - NS[0]) <= 6 || Math.abs(a - NS[1]) <= 6) { put(G, ASPH); return; }
    if (onDiag(x, z)) { put(G, ASPH); if (Math.abs(diagDist(x, z)) < 0.8) put(G, YELLOW); return; }
    const b = blockOf(x, z);
    if (!b) { put(G, VEREDA); return; }
    // distancia a los bordes de la manzana (y a la diagonal si la corta)
    const ax = a;
    const dW = ax - b.bx0, dE = b.bx1 - ax, dN = z - b.bz0, dS = b.bz1 - z;
    let d = Math.min(dW, dE, dN, dS), edge = d === dW ? 0 : d === dN ? 1 : d === dS ? 2 : 3, pos = edge === 0 || edge === 3 ? z - b.bz0 : ax - b.bx0;
    if (x > 60 && z > 20) { const dd = Math.abs(diagDist(x, z)) - 14; if (dd < d) { d = Math.floor(dd); edge = 'diag'; pos = (x + z) / Math.SQRT2; } }
    if (d < 4) { put(G, VEREDA); return; }
    const depth = 16;
    if (d >= 4 + depth) { put(G, CONC); return; } // patio interior
    // ---------- edificio ----------
    // el Teatro Colón ocupa su manzana entera (oeste, entre Tucumán y Viamonte)
    if (b.side === -1 && b.bx0 === 70 && b.bz0 === -330) { colon(x, z, b, d, put); return; }
    const L = lot(b, edge, Math.floor(pos));
    const top = G + L.floors * 3 + 1;
    put(G, CONC);
    const facade = d === 4, back = d === 4 + depth - 1, wallSide = Math.floor(pos) - L.start === 0;
    const along = Math.floor(pos);
    for (let y = G + 1; y <= top; y++) {
      const fy = (y - G - 1) % 3, floor = Math.floor((y - G - 1) / 3);
      let id = 0;
      if (facade || back || wallSide) {
        id = L.mat;
        if (facade && floor === 0) id = fy === 2 ? L.mat : (along % 6 === 3 ? 0 : GLASS); // planta baja: vidrieras y puertas
        else if ((facade || back) && (fy === 1 || fy === 2) && along % 3 !== 0) id = GLASS;
        if (facade && floor === 1 && fy === 0 && L.r < 0.45) id = [1024, 1028, 1034, 1031][Math.floor(L.r * 8.9)]; // toldos de algunos locales
      } else if (fy === 0) id = CONC; // losas de cada piso
      // luces encendidas detrás de algunas ventanas
      if (!id && d === 5 && fy === 2 && floor > 0 && hash3(s + 1601, x, y, z) < 0.12) id = LAMP;
      if (id) put(y, id);
    }
    // cornisa y cartel en algunas azoteas frente a la plaza
    if (facade) put(top + 1, L.mat);
    // carteles luminosos de Corrientes: Gran Rex (norte, al este) y Ópera (sur, al este)
    const sign = (txt, zFace, x0, yBase, bg, sc) => {
      if (z !== zFace) return;
      const w = textWidth(txt, sc), fwd = (x > 0) === (zFace < 0), u = fwd ? Math.floor(a) - x0 : x0 + w - 1 - Math.floor(a);
      if (u < -2 || u > w + 1) return;
      for (let yy = yBase - 2; yy <= yBase + 7 * sc + 1; yy++) put(yy, bg);
      const rows = textColumn(txt, u, sc);
      if (rows) for (const ry of rows) put(yBase + ry, LAMP);
    };
    if (x > 0) { sign('GRAN REX', -17, 75, G + 9, 1034, 2); sign('OPERA', 17, 90, G + 10, 1024, 2); }
    if (x < 0) { sign('BUENOS AIRES', -17, 82, G + 20, 1031, 1); sign('TEATROS', 17, 90, G + 10, 1032, 1); }
    // Corrientes, la calle que nunca duerme: marquesinas con luces en los locales
    if (facade && (b.bz1 === -13 || b.bz0 === 13) && (edge === 1 || edge === 2)) { put(G + 4, along % 2 ? LAMP : [1024, 1026, 1031, 1032][Math.floor(L.r * 4)]); }
  }

  // Teatro Colón: palacio de piedra clara con columnas sobre Cerrito y techo de pizarra
  function colon(x, z, b, d, put) {
    const G = GROUND, a = Math.abs(x);
    put(G, PLAZA);
    const inX = a - b.bx0, inZ = z - b.bz0, W = b.bx1 - b.bx0, Dz = b.bz1 - b.bz0;
    const core = inX > 20 && inX < W - 8 && inZ > 14 && inZ < Dz - 14;
    const top = G + (core ? 34 : 24);
    for (let y = G + 1; y <= top; y++) {
      const edgeWall = d === 4 || (core && (inX === 21 || inX === W - 9 || inZ === 15 || inZ === Dz - 15));
      let id = edgeWall ? PLAZA : (y - G) % 6 === 0 ? CONC : 0;
      const along = d === 4 && (inX === 4 || inX === W - 4) ? z - b.bz0 : Math.floor(a);
      const m5 = ((along % 5) + 5) % 5, ry = y - G;
      if (edgeWall && d === 4) {
        // fachada clásica: basamento con puertas, columnas con ventanas angostas, cornisa tallada y ático
        if (ry <= 3) id = m5 === 2 && ry <= 3 && (along % 10 === 2 || along % 10 === 7) ? (ry === 3 ? 1045 : GLASS) : 1044;
        else if (ry === 4) id = 1045;
        else if (ry <= 16) id = m5 === 0 ? 1116 : m5 === 2 && ((ry >= 6 && ry <= 9) || (ry >= 12 && ry <= 14)) ? GLASS : PLAZA;
        else if (ry <= 18) id = 1045;
        else id = m5 === 2 && ry === 20 && y < top ? GLASS : PLAZA;
      } else if (edgeWall && ry % 5 >= 2 && ry % 5 <= 3 && (Math.floor(Math.abs(z) + a) % 4) !== 0 && y < top - 2) id = GLASS;
      put(y, id);
    }
    // techo de pizarra escalonado (mansarda) y la cúpula central
    put(top + 1, BASALT); if (d > 5 || core) put(top + 2, d > 6 || core ? BASALT : 0);
    if (core && Math.hypot(inX - W / 2, inZ - Dz / 2) < 9) for (let y = top + 3; y <= top + 3 + Math.max(0, 8 - Math.round(Math.hypot(inX - W / 2, inZ - Dz / 2))); y++) put(y, 1028);
  }

  // las copas se calculan aparte (ocupan columnas vecinas): árboles en una grilla regular
  function canopy(x, z, put, isFree) {
    const G = GROUND, a = Math.abs(x);
    const cand = [];
    // plazoletas de la avenida: grilla de 9
    if (a > 36 && a < 58) { const gx = Math.round(x / 9), gz = Math.round(z / 9); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const tx = (gx + i) * 9, tz = (gz + j) * 9 + ((gx + i) % 2 ? 4 : 0); const ta = Math.abs(tx); if (ta > 38 && ta < 54 && !crossStreet(tz) && ellipse(tx, tz, 58, 42) > 1) { const t = treeAt(gx + i, gz + j, s, 0.75); if (t) cand.push([tx, tz, t]); } } }
    // cantero central: jacarandás cada 12
    if (a <= 7) { const k = Math.round(z / 12); for (let j = -1; j <= 1; j++) { const tz = (k + j) * 12; if (!crossStreet(tz) && ellipse(0, tz, 58, 42) > 1 && ![-300, -76, 76, 300].some((sz) => Math.abs(tz - sz) <= 16)) cand.push([0, tz, { type: 'jac', h: 5, r: 2.8 }]); } }
    // veredas de las colectoras: tipas cada 14
    if (a > 62 && a < 71) { const k = Math.round(z / 14); for (let j = -1; j <= 1; j++) { const tz = (k + j) * 14; if (!crossStreet(tz) && ellipse(67, tz, 58, 42) > 1) cand.push([x > 0 ? 67 : -67, tz, { type: 'tipa', h: 4, r: 2.4 }]); } }
    for (const [tx, tz, t] of cand) {
      const dx = x - tx, dz = z - tz, d = Math.hypot(dx, dz);
      if (d > t.r + 0.5) continue;
      const leaf = t.type === 'jac' ? JAC : t.type === 'palo' ? PALO : LEAF;
      const cy = G + t.h + 1;
      for (let y = cy - 1; y <= cy + 3; y++) {
        const ry = (y - cy - 1) / (t.type === 'tipa' ? 1.6 : 2), rr = Math.hypot(dx, dz, ry * 1.4);
        if (rr <= t.r && isFree(y) && hash3(s + 1701, x, y, z) > 0.08) put(y, leaf);
      }
      if (dx === 0 && dz === 0) for (let y = G + 1; y <= G + t.h; y++) put(y, t.type === 'palo' && y < G + 3 ? 232 : LOG);
    }
  }
  return { column, canopy };
}
