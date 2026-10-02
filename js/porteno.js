// Mundo «Buenos Aires»: el centro porteño reconstruido con datos reales de OpenStreetMap
// (calles con su ancho y carriles, cada edificio con su forma y su altura, plazas, árboles y faroles).
// 1 bloque = 1 metro. El mapa está girado para que la 9 de Julio quede a lo largo del eje z (norte = -z).
import { hash2, hash3 } from './noise.js';
import { getBA } from './badata.js';

export const GROUND = 48;
export const BLEND = 70;
// clases de suelo (ver tools/osm/build.mjs)
const AGUA = 5, VIAS = 8, EDIF = 3;
const SURFACE = [1150, 11, 84, 0, 1038, 47, 1035, 1026, 8, 4];
// materiales de fachada (índices que guarda el conversor)
const MAT = [9, 1116, 1043, 9, 13, 1044, 1033, 1036, 1034, 1031, 14, 1038, 1049];
const GLASS = 14, LAMP = 1117, POST = 85, LOG = 222, CONC = 9, OBE = 1116, WHITE = 1035;

export const inArea = (x, z) => { const D = getBA(); return !!D && x >= D.x0 && x < D.x0 + D.w && z >= D.z0 && z < D.z0 + D.h; };
export function areaBlend(x, z) {
  const D = getBA(); if (!D) return 0;
  const dx = Math.max(D.x0 - x, 0, x - (D.x0 + D.w - 1)), dz = Math.max(D.z0 - z, 0, z - (D.z0 + D.h - 1));
  const d = Math.hypot(dx, dz);
  return d <= 0 ? 1 : d >= BLEND ? 0 : 1 - d / BLEND;
}

export function makePorteno(gen) {
  const s = gen.seed;
  const idx = (D, x, z) => { const i = x - D.x0, j = z - D.z0; return i >= 0 && j >= 0 && i < D.w && j < D.h ? i + j * D.w : -1; };
  // ¿la celda de edificio tiene un lado al aire (calle, patio u otro edificio más bajo)?
  function exposed(D, x, z, i) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = idx(D, x + dx, z + dz);
      if (j < 0 || D.cls[j] !== EDIF || D.bid[j] !== D.bid[i] || D.hgt[j] < D.hgt[i]) return dx ? 'x' : 'z';
    }
    return null;
  }

  function column(x, z, put) {
    const D = getBA(), G = GROUND;
    put(G - 3, 2); put(G - 2, 2); put(G - 1, 4);
    const i = idx(D, x, z); if (i < 0) return;
    // el Obelisco: pedestal y núcleo (la forma lisa la dibuja el juego encima)
    if (Math.abs(x) <= 5 && Math.abs(z) <= 5) {
      put(G, OBE); put(G + 1, OBE);
      if (Math.abs(x) <= 1 && Math.abs(z) <= 1) for (let y = G + 2; y <= G + 62; y++) put(y, WHITE);
      return;
    }
    const c = D.cls[i];
    if (c === AGUA) { put(G - 2, 229); put(G - 1, 47); put(G, 47); return; }
    if (c !== EDIF) {
      put(G, SURFACE[c] ?? 1150);
      if (c === VIAS) put(G + 1, 101);
      // faroles reales (los que están cargados en el mapa)
      const lamps = D.lampGrid.get(Math.floor(x / 8) + ',' + Math.floor(z / 8));
      if (lamps) for (const [lx, lz] of lamps) if (lx === x && lz === z) { for (let y = G + 1; y <= G + 5; y++) put(y, POST); put(G + 6, LAMP); }
      return;
    }
    // ---------- edificio con su altura real ----------
    const h = D.hgt[i], top = G + h, m = MAT[D.mat[i]] ?? CONC;
    put(G, CONC);
    const side = exposed(D, x, z, i);
    const along = side === 'x' ? z : x;
    let nearFacade = false;
    if (!side) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = idx(D, x + dx, z + dz); if (j >= 0 && D.cls[j] === EDIF && exposed(D, x + dx, z + dz, j)) { nearFacade = true; break; } }
    const glassy = m === GLASS;
    for (let y = G + 1; y <= top; y++) {
      const ry = y - G - 1, fy = ry % 3, floor = Math.floor(ry / 3);
      let id = 0;
      if (y === top) id = side ? (glassy ? CONC : m) : CONC; // azotea
      else if (side) {
        id = glassy ? (fy === 0 ? CONC : GLASS) : m;
        if (!glassy) {
          if (floor === 0) id = fy === 2 ? m : (((along % 7) + 7) % 7 === 3 ? 0 : GLASS); // planta baja: vidrieras y entradas
          else if ((fy === 1 || fy === 2) && ((along % 3) + 3) % 3 !== 0) id = GLASS;
        }
      } else if (fy === 0) id = CONC; // losas
      else if (nearFacade && fy === 2 && floor > 0 && hash3(s + 1601, x, y, z) < 0.1) id = LAMP; // luces detrás de algunas ventanas
      if (id) put(y, id);
    }
    if (side && h > 6) put(top + 1, glassy ? CONC : m); // parapeto
  }

  // árboles reales del mapa (especie según OSM: plátano, jacarandá, tipa, palo borracho, palmera)
  function canopy(x, z, put, isFree) {
    const D = getBA(), G = GROUND;
    for (let gx = Math.floor(x / 8) - 1; gx <= Math.floor(x / 8) + 1; gx++) for (let gz = Math.floor(z / 8) - 1; gz <= Math.floor(z / 8) + 1; gz++) {
      const list = D.treeGrid.get(gx + ',' + gz); if (!list) continue;
      for (const [tx, tz, kind, th] of list) {
        const dx = x - tx, dz = z - tz;
        const hgt = th ? Math.max(4, Math.min(16, th)) : [7, 6, 8, 6, 9][kind];
        const r = kind === 4 ? 2.5 : [3.2, 3, 3.8, 3, 2.5][kind] * (0.85 + hash2(s + 1701, tx, tz) * 0.3);
        const d = Math.hypot(dx, dz);
        if (d > r + 0.5) continue;
        if (dx === 0 && dz === 0) for (let y = G + 1; y < G + hgt; y++) put(y, kind === 4 ? 232 : kind === 3 && y < G + 3 ? 232 : LOG);
        const leaf = [206, 1148, 206, 1149, 233][kind];
        const cy = G + hgt;
        for (let y = cy - 2; y <= cy + 2; y++) {
          const ry = (y - cy) / (kind === 4 ? 0.8 : 1.6), rr = Math.hypot(dx, dz, ry * 1.5);
          const on = kind === 4 ? (y === cy && d <= r && (dx === 0 || dz === 0 || Math.abs(dx) === Math.abs(dz))) || (y === cy + 1 && d < 1.5) : rr <= r && hash3(s + 1702, x, y, z) > 0.1;
          if (on && isFree(y)) put(y, leaf);
        }
      }
    }
  }
  return { column, canopy };
}
