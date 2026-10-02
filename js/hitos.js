// Hitos modelados a mano sobre los mundos reales: la parte de bloques (suelo, cercos, casas y el volumen
// macizo de los edificios). Las fachadas con detalle las dibuja hitos3d.js encima, con la misma ubicación.
// Coordenadas locales de cada hito: a = metros por la calle «a» desde la esquina, b = metros por la calle «b».
import { hash2 } from './noise.js';

const GRASS = 2, CONC = 9, BRICK = 13, GLASS = 14, WHITE = 1035, VEREDA = 1150, TEJA = 1151, REJA = 1152, LEAVES = 206, PATH = 1038;

// --- Iglesia Evangélica Luterana «Santa Trinidad», Pedro de Mendoza 1249 esquina Isabel la Católica (Hurlingham) ---
// a: por Pedro de Mendoza hacia el sudeste; b: por Isabel la Católica hacia el noreste.
// Medidas tomadas de las fotos de la calle: jardín en la esquina con reja negra sobre murito blanco,
// casa de ladrillo con techo de tejas sobre Isabel, torre de ladrillo de 4 m de lado con la entrada mirando al jardín,
// y la nave (10 × 21 m) con el hastial de ladrillo y tres ventanas ojivales sobre Pedro de Mendoza.
export const TRINIDAD = {
  tower: [13, 16, 7, 10], towerH: 14.5,
  nave: [17, 26, 7, 27], eave: 8.5, ridge: 12.5,
  house: [8, 12, 14, 25],
};
const naveRoofTop = (a) => { const [a0, a1] = TRINIDAD.nave, mid = (a0 + a1) / 2, half = (a1 - a0 + 1) / 2; return TRINIDAD.eave + (half - (Math.abs(a - mid) + 0.5)) * ((TRINIDAD.ridge - TRINIDAD.eave) / half); };

function trinidad(a, b, put, G) {
  const T = TRINIDAD;
  // vereda (afuera de la línea municipal) y la ochava de la esquina
  if (a <= 6 || b <= 6 || (a <= 8 && b <= 8 && a + b < 16)) { put(G, VEREDA); return; }
  put(G, GRASS);
  // reja negra sobre murito blanco, con la entrada en la ochava
  const fence = (a === 7 && b >= 9) || (b === 7 && a >= 9 && a <= 12);
  if (fence) { put(G, CONC); put(G + 1, WHITE); put(G + 2, REJA); return; }
  const [t0, t1, t2, t3] = T.tower, [n0, n1, n2, n3] = T.nave, [h0, h1, h2, h3] = T.house;
  // torre: volumen macizo (la fachada la dibuja el modelo)
  if (a >= t0 && a <= t1 && b >= t2 && b <= t3) { put(G, CONC); for (let y = 1; y <= Math.floor(T.towerH); y++) put(G + y, BRICK); return; }
  // nave: muros hasta el alero y el techo escalonado por debajo del faldón
  if (a >= n0 && a <= n1 && b >= n2 && b <= n3) { put(G, CONC); const k = Math.floor(naveRoofTop(a)); for (let y = 1; y <= k; y++) put(G + y, BRICK); return; }
  // casa de la esquina: ladrillo, ventanas, galería con techo de tejas y techo a cuatro aguas
  if (a >= h0 && a <= h1 && b >= h2 && b <= h3) {
    put(G, CONC);
    const edge = a === h0 || a === h1 || b === h2 || b === h3, along = a === h0 || a === h1 ? b : a;
    for (let y = 1; y <= 3; y++) put(G + y, edge && y === 2 && along % 3 === 1 ? GLASS : BRICK);
    const d = Math.min(a - h0, h1 - a, b - h2, h3 - b);
    for (let y = 4; y <= 4 + Math.min(2, Math.floor(d * 0.7)); y++) put(G + y, TEJA);
    return;
  }
  if (b === h2 - 1 && a >= h0 && a <= h1) { // galería al frente de la casa
    put(G, CONC); if (a === h0 || a === h1) { put(G + 1, BRICK); put(G + 2, BRICK); } put(G + 3, TEJA); return;
  }
  // jardín: caminito de lajas de la ochava a la puerta de la torre, y plantas junto a la reja
  if ((b === 9 && a >= 8 && a < t0) || (a === 8 && b === 8)) { put(G, PATH); return; }
  if ((a === 8 || b === 8) && a < t0 && b < h2 && hash2(77, a, b) < 0.55) put(G + 1, LEAVES);
}

export function hitoColumn(kind, a, b, put, G) {
  if (kind === 'santaTrinidad') trinidad(a, b, put, G);
}
