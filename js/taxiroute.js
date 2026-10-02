// Caminos del taxi sobre la grilla de los mundos reales (celdas de 2 m sobre el asfalto del mapa).
// Sin dependencias de Three, para poder probarlo aparte.
const ROAD = new Set([1, 6, 7]); // asfalto y pintura

export function makeRoutes(d) {
  const S = 2, W = Math.floor(d.w / S), H = Math.floor(d.h / S), ok = new Uint8Array(W * H), cost = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let n = 0, rail = 0;
    for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) { const c = d.cls[i * S + a + (j * S + b) * d.w]; if (ROAD.has(c)) n++; else if (c === 8) rail++; }
    ok[i + j * W] = n >= 3 ? 1 : n + rail >= 3 ? 2 : 0; // 2: vías (se cruzan en los pasos a nivel)
  }
  // más caro cerca del cordón: el taxi va por el medio de la calle
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = i + j * W; if (!ok[k]) continue;
    if (ok[k] === 2) { cost[k] = 250; continue; }
    let edge = 0;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H || !ok[x + y * W]) edge++; }
    cost[k] = 10 + Math.min(10, edge); // en décimos: hasta el doble pegado al cordón
  }
  const toCell = (x, z) => [Math.floor((x - d.x0) / S), Math.floor((z - d.z0) / S)];
  const toWorld = (i, j) => [d.x0 + i * S + S / 2, d.z0 + j * S + S / 2];

  // componentes conexas: así el destino siempre se busca en calles a las que se puede llegar
  const comp = new Int32Array(W * H).fill(-1);
  let nc = 0;
  for (let k0 = 0; k0 < W * H; k0++) {
    if (!ok[k0] || comp[k0] >= 0) continue;
    const st = [k0]; comp[k0] = nc;
    while (st.length) { const k = st.pop(), i = k % W, j = (k - i) / W; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue; const q = x + y * W; if (ok[q] && comp[q] < 0) { comp[q] = nc; st.push(q); } } }
    nc++;
  }

  // la calle más cercana y, en ella, el medio de la calzada (opcional: dentro de la misma red que `same`)
  function nearestRoad(x, z, maxR = 60, same = null) {
    const [ci, cj] = toCell(x, z), want = same ? comp[same[0] + same[1] * W] : -1;
    for (let r = 0; r <= maxR; r++) for (let a = -r; a <= r; a++) for (const [i, j] of [[ci + a, cj - r], [ci + a, cj + r], [ci - r, cj + a], [ci + r, cj + a]]) {
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const k0 = i + j * W; if (ok[k0] !== 1 || (want >= 0 && comp[k0] !== want)) continue;
      let best = [i, j], bc = cost[k0];
      for (let b = -3; b <= 3; b++) for (let a2 = -3; a2 <= 3; a2++) { const x2 = i + a2, y2 = j + b; if (x2 < 0 || y2 < 0 || x2 >= W || y2 >= H) continue; const q = x2 + y2 * W; if (ok[q] === 1 && comp[q] === comp[k0] && cost[q] < bc) { bc = cost[q]; best = [x2, y2]; } }
      return best;
    }
    return null;
  }

  function route(from, to) {
    const N = W * H;
    const gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const hk = [], hf = [];
    const push = (k, f) => { hk.push(k); hf.push(f); let i = hk.length - 1; while (i) { const q = (i - 1) >> 1; if (hf[q] <= hf[i]) break; [hf[q], hf[i]] = [hf[i], hf[q]]; [hk[q], hk[i]] = [hk[i], hk[q]]; i = q; } };
    const pop = () => { const top = hk[0], lk = hk.pop(), lf = hf.pop(); if (hk.length) { hk[0] = lk; hf[0] = lf; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < hk.length && hf[l] < hf[m]) m = l; if (r < hk.length && hf[r] < hf[m]) m = r; if (m === i) break; [hf[m], hf[i]] = [hf[i], hf[m]]; [hk[m], hk[i]] = [hk[i], hk[m]]; i = m; } } return top; };
    const s = from[0] + from[1] * W, t = to[0] + to[1] * W, [ti, tj] = to;
    if (comp[s] !== comp[t]) return null;
    gs[s] = 0; push(s, 0);
    while (hk.length) {
      const k = pop(); if (k === t) break; if (done[k]) continue; done[k] = 1;
      const i = k % W, j = (k - i) / W;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        if (!a && !b) continue;
        const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const q = x + y * W; if (!ok[q] || done[q]) continue;
        const ng = gs[k] + (a && b ? 1.414 : 1) * cost[q] / 10;
        if (ng < gs[q]) { gs[q] = ng; came[q] = k; push(q, ng + Math.hypot(x - ti, y - tj)); }
      }
    }
    if (came[t] < 0 && s !== t) return null;
    const cells = []; for (let k = t; k >= 0; k = came[k]) { cells.push(k); if (k === s) break; }
    cells.reverse();
    // de celdas a puntos, salteando y suavizando las esquinas
    let pts = cells.filter((_, i) => i % 3 === 0 || i === cells.length - 1).map((k) => toWorld(k % W, Math.floor(k / W)));
    if (pts.length < 2) pts = [pts[0], [pts[0][0] + 0.5, pts[0][1]]];
    for (let it = 0; it < 2; it++) { const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [p0, p1] = [pts[i], pts[i + 1]]; o.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25], [p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]); } o.push(pts.at(-1)); pts = o; }
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len.at(-1) };
  }
  return { S, W, H, ok, cost, comp, toCell, toWorld, nearestRoad, route };
}
