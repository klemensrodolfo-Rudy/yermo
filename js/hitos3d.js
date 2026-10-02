// Fachadas con detalle de los hitos modelados a mano (ver hitos.js para la parte de bloques).
// Iglesia Evangélica Luterana «Santa Trinidad» (Hurlingham): dibujada a partir de las fotos de la calle.
import * as THREE from 'three';
import { TRINIDAD } from './hitos.js';

const PX = 64; // píxeles por metro en las texturas de las fachadas

function brickWall(wm, hm, deco, opts = {}) {
  const c = document.createElement('canvas'); c.width = Math.ceil(wm * PX); c.height = Math.ceil(hm * PX);
  const x = c.getContext('2d'), W = c.width, H = c.height;
  if (opts.white) {
    // revoque blanco con manchas de humedad
    x.fillStyle = '#e4e0d8'; x.fillRect(0, 0, W, H);
    for (let k = 0; k < W * H / 900; k++) { x.fillStyle = `rgba(110,105,95,${Math.random() * 0.06})`; x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 10 + Math.random() * 80); }
    const g = x.createLinearGradient(0, H, 0, H - 1.2 * PX); g.addColorStop(0, 'rgba(90,80,70,0.25)'); g.addColorStop(1, 'rgba(90,80,70,0)'); x.fillStyle = g; x.fillRect(0, H - 1.2 * PX, W, 1.2 * PX);
  } else {
    // ladrillo a la vista, aparejo de soga (0,25 × 0,065 m), con juntas claras
    x.fillStyle = '#968a7c'; x.fillRect(0, 0, W, H);
    const bw = 0.25 * PX, bh = 0.065 * PX;
    for (let r = 0, y = H; y > -bh; r++, y -= bh) {
      for (let bx = (r % 2) * -bw / 2; bx < W; bx += bw) {
        const t = Math.random();
        const R = 118 + t * 34 - (t > 0.92 ? 30 : 0), Gc = 66 + t * 20, B = 50 + t * 14;
        x.fillStyle = `rgb(${R | 0},${Gc | 0},${B | 0})`; x.fillRect(bx + 0.6, y - bh + 0.6, bw - 1.2, bh - 1.2);
      }
    }
    // la parte de abajo, más oscura
    const g = x.createLinearGradient(0, H, 0, H - 1 * PX); g.addColorStop(0, 'rgba(40,25,20,0.35)'); g.addColorStop(1, 'rgba(40,25,20,0)'); x.fillStyle = g; x.fillRect(0, H - PX, W, PX);
    for (let k = 0; k < W * H / 2500; k++) { x.fillStyle = `rgba(30,20,15,${Math.random() * 0.08})`; x.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 20, 20 + Math.random() * 120); }
  }
  // helpers en metros (y desde abajo)
  const m = (v) => v * PX, Y = (v) => H - v * PX;
  deco?.(x, m, Y, W, H);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// ventana ojival con marco blanco, vidrio oscuro y parteluces
function lancet(x, m, Y, cx, y0, y1, w) {
  const r = w / 2, spring = y1 - w * 0.85;
  const path = (k) => { x.beginPath(); x.moveTo(m(cx - r + k), Y(y0 + k)); x.lineTo(m(cx - r + k), Y(spring)); x.quadraticCurveTo(m(cx - r + k), Y(y1 - k * 1.2), m(cx), Y(y1 - k * 1.5)); x.quadraticCurveTo(m(cx + r - k), Y(y1 - k * 1.2), m(cx + r - k), Y(spring)); x.lineTo(m(cx + r - k), Y(y0 + k)); x.closePath(); };
  path(-0.1); x.fillStyle = '#ece9e2'; x.fill(); // marco
  path(0.04); const g = x.createLinearGradient(m(cx - r), 0, m(cx + r), 0); g.addColorStop(0, '#5d6a74'); g.addColorStop(0.5, '#8c9aa4'); g.addColorStop(1, '#55626c'); x.fillStyle = g; x.fill();
  x.save(); path(0.04); x.clip();
  x.strokeStyle = '#f2f0ea'; x.lineWidth = Math.max(2, 0.05 * PX);
  for (const f of [-1 / 3, 1 / 3]) { x.beginPath(); x.moveTo(m(cx + f * r * 1.5 / 1.5 * 1), Y(y0)); x.lineTo(m(cx + f * r), Y(spring + 0.1)); x.stroke(); }
  for (let yy = y0 + 0.45; yy < spring; yy += 0.45) { x.beginPath(); x.moveTo(m(cx - r), Y(yy)); x.lineTo(m(cx + r), Y(yy)); x.stroke(); }
  // tracería en «Y» en la punta
  x.beginPath(); x.moveTo(m(cx - r / 3), Y(spring + 0.1)); x.quadraticCurveTo(m(cx - r / 3), Y(y1 - 0.25), m(cx), Y(y1 - 0.12)); x.moveTo(m(cx + r / 3), Y(spring + 0.1)); x.quadraticCurveTo(m(cx + r / 3), Y(y1 - 0.25), m(cx), Y(y1 - 0.12)); x.stroke();
  x.restore();
  // alféizar
  x.fillStyle = '#d8d4cc'; x.fillRect(m(cx - r - 0.15), Y(y0 - 0.02), m(w + 0.3), m(0.1));
}
function rectWin(x, m, Y, cx, y0, y1, w) {
  x.fillStyle = '#ece9e2'; x.fillRect(m(cx - w / 2 - 0.08), Y(y1 + 0.08), m(w + 0.16), m(y1 - y0 + 0.16));
  x.fillStyle = '#4e5a63'; x.fillRect(m(cx - w / 2), Y(y1), m(w), m(y1 - y0));
  x.strokeStyle = '#efede7'; x.lineWidth = Math.max(2, 0.05 * PX);
  for (const f of [1 / 3, 2 / 3]) { x.beginPath(); x.moveTo(m(cx - w / 2 + w * f), Y(y0)); x.lineTo(m(cx - w / 2 + w * f), Y(y1)); x.stroke(); }
  x.beginPath(); x.moveTo(m(cx - w / 2), Y((y0 + y1) / 2 + 0.1)); x.lineTo(m(cx + w / 2), Y((y0 + y1) / 2 + 0.1)); x.stroke();
  x.fillStyle = '#d8d4cc'; x.fillRect(m(cx - w / 2 - 0.12), Y(y0), m(w + 0.24), m(0.08));
}
// par de ventanitas angostas arriba de la torre
function slots(x, m, Y, cx, y0) {
  for (const d of [-0.32, 0.32]) {
    x.fillStyle = '#e6e2da'; x.fillRect(m(cx + d - 0.2), Y(y0 + 1.75), m(0.4), m(1.8));
    x.fillStyle = '#2b2a2c'; x.fillRect(m(cx + d - 0.13), Y(y0 + 1.68), m(0.26), m(1.6));
    x.fillStyle = '#6e6b66'; for (let k = 0; k < 6; k++) x.fillRect(m(cx + d - 0.13), Y(y0 + 0.25 + k * 0.25), m(0.26), 2);
  }
}
// la rosa de Lutero: disco blanco, corazón rojo con la cruz negra, anillo azul y borde dorado
function lutherRose(x, m, Y, cx, cy, d) {
  const R = m(d / 2), X = m(cx), Yc = Y(cy);
  x.fillStyle = '#c9a548'; x.beginPath(); x.arc(X, Yc, R, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#2f5d9a'; x.beginPath(); x.arc(X, Yc, R * 0.9, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#f6f4ee';
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * Math.PI * 2) / 5; x.beginPath(); x.arc(X + Math.cos(a) * R * 0.42, Yc + Math.sin(a) * R * 0.42, R * 0.36, 0, Math.PI * 2); x.fill(); }
  x.beginPath(); x.arc(X, Yc, R * 0.5, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#b8282c'; const h = R * 0.42;
  x.beginPath(); x.moveTo(X, Yc + h * 0.95); x.bezierCurveTo(X - h * 1.5, Yc - h * 0.1, X - h * 0.7, Yc - h * 1.2, X, Yc - h * 0.45); x.bezierCurveTo(X + h * 0.7, Yc - h * 1.2, X + h * 1.5, Yc - h * 0.1, X, Yc + h * 0.95); x.fill();
  x.fillStyle = '#1a1a1a'; x.fillRect(X - h * 0.09, Yc - h * 0.6, h * 0.18, h * 1.1); x.fillRect(X - h * 0.35, Yc - h * 0.32, h * 0.7, h * 0.16);
}

function tiles(wm, hm) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#8a4430'; x.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 16; r++) for (let k = 0; k < 16; k++) {
    const bx = k * 16 + (r % 2) * 8, by = r * 16, t = Math.random();
    const g = x.createLinearGradient(bx, 0, bx + 16, 0);
    const base = [168 + t * 30, 78 + t * 18, 50 + t * 10];
    g.addColorStop(0, `rgb(${base[0] * 0.7},${base[1] * 0.7},${base[2] * 0.7})`); g.addColorStop(0.5, `rgb(${base[0]},${base[1]},${base[2]})`); g.addColorStop(1, `rgb(${base[0] * 0.65},${base[1] * 0.65},${base[2] * 0.65})`);
    x.fillStyle = g; x.fillRect(bx, by, 16, 15);
    x.fillStyle = 'rgba(40,20,10,0.35)'; x.fillRect(bx, by + 14, 16, 2);
    if (Math.random() < 0.15) { x.fillStyle = 'rgba(50,60,40,0.25)'; x.fillRect(bx, by, 16, 15); } // algo de musgo
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(wm / 4, hm / 4);
  return t;
}

// cuadrilátero con uv de 0 a 1 (esquinas: abajo-izq, abajo-der, arriba-der, arriba-izq)
function quad(ps, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(ps.flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
// polígono plano vertical (en un plano b = const o a = const) con uv proporcionales
function wallPoly(pts2, plane, fixed, wm, hm, mat, u0 = 0) {
  const shape = new THREE.Shape(pts2.map(([h, y]) => new THREE.Vector2(h, y)));
  const g = new THREE.ShapeGeometry(shape);
  const p = g.attributes.position, uv = [];
  for (let i = 0; i < p.count; i++) uv.push((p.getX(i) - u0) / wm, p.getY(i) / hm);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // pasar de (h, y, 0) al plano del muro
  const arr = p.array;
  for (let i = 0; i < p.count; i++) { const h = arr[i * 3], y = arr[i * 3 + 1]; if (plane === 'b') { arr[i * 3] = h; arr[i * 3 + 1] = y; arr[i * 3 + 2] = fixed; } else { arr[i * 3] = fixed; arr[i * 3 + 1] = y; arr[i * 3 + 2] = h; } }
  p.needsUpdate = true; g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const lam = (o) => new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, ...o });

function buildTrinidad() {
  const T = TRINIDAD, grp = new THREE.Group(), disp = [];
  const keep = (m) => { disp.push(m); return m; };
  const e = 0.03; // un poco afuera de los bloques
  // ---------- torre ----------
  const [ta0, ta1, tb0, tb1] = [T.tower[0] - 0.5 - e, T.tower[1] + 0.5 + e, T.tower[2] - 0.5 - e, T.tower[3] + 0.5 + e], TH = T.towerH;
  const tw = ta1 - ta0, td = tb1 - tb0;
  // cara al jardín (-a): el arco alto con la puerta y la rosa de Lutero
  const fGarden = keep(lam({ map: brickWall(td, TH, (x, m, Y) => {
    const cx = td / 2;
    // nicho en arco ojival, en sombra
    x.save(); x.beginPath(); x.moveTo(m(cx - 1.25), Y(0)); x.lineTo(m(cx - 1.25), Y(5.6)); x.quadraticCurveTo(m(cx - 1.25), Y(7.3), m(cx), Y(7.7)); x.quadraticCurveTo(m(cx + 1.25), Y(7.3), m(cx + 1.25), Y(5.6)); x.lineTo(m(cx + 1.25), Y(0)); x.closePath();
    x.strokeStyle = '#6e3f30'; x.lineWidth = 0.14 * PX; x.stroke(); x.fillStyle = 'rgba(30,15,10,0.32)'; x.fill(); x.restore();
    // puerta con marco blanco
    x.fillStyle = '#efece6'; x.fillRect(m(cx - 0.85), Y(2.75), m(1.7), m(2.75));
    x.fillStyle = '#5b3d2a'; x.fillRect(m(cx - 0.7), Y(2.6), m(1.4), m(2.6));
    x.fillStyle = '#4a3020'; x.fillRect(m(cx - 0.02), Y(2.6), m(0.04), m(2.6));
    x.fillStyle = '#c8c4bc'; x.fillRect(m(cx - 0.95), Y(0.12), m(1.9), m(0.12));
    lutherRose(x, m, Y, cx, 4.6, 1.3);
    slots(x, m, Y, cx, 11.3);
  }) }));
  // cara a Pedro de Mendoza (-b): dos ventanas ojivales angostas
  const fStreet = keep(lam({ map: brickWall(tw, TH, (x, m, Y) => { lancet(x, m, Y, tw / 2, 6.1, 8.3, 0.7); lancet(x, m, Y, tw / 2, 2.9, 4.5, 0.6); slots(x, m, Y, tw / 2, 11.3); }) }));
  const fPlain = keep(lam({ map: brickWall(tw, TH, (x, m, Y) => slots(x, m, Y, tw / 2, 11.3)) }));
  grp.add(quad([[ta0, 0, tb1], [ta0, 0, tb0], [ta0, TH, tb0], [ta0, TH, tb1]], fGarden));
  grp.add(quad([[ta0, 0, tb0], [ta1, 0, tb0], [ta1, TH, tb0], [ta0, TH, tb0]], fStreet));
  grp.add(quad([[ta1, 0, tb0], [ta1, 0, tb1], [ta1, TH, tb1], [ta1, TH, tb0]], fPlain));
  grp.add(quad([[ta1, 0, tb1], [ta0, 0, tb1], [ta0, TH, tb1], [ta1, TH, tb1]], fPlain));
  // cornisa blanca y techito de tejas a cuatro aguas con la cruz
  const white = keep(lam({ color: 0xe8e4dc }));
  const corn = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.3, 0.35, td + 0.3), white); corn.position.set((ta0 + ta1) / 2, TH + 0.17, (tb0 + tb1) / 2); grp.add(corn);
  const roofMat = keep(lam({ map: tiles(4, 2) }));
  const pyr = new THREE.Mesh(new THREE.ConeGeometry((tw + 0.4) / Math.SQRT2, 1.5, 4, 1), roofMat); pyr.rotation.y = Math.PI / 4; pyr.position.set((ta0 + ta1) / 2, TH + 0.35 + 0.75, (tb0 + tb1) / 2); grp.add(pyr);
  const crossMat = keep(lam({ color: 0xcfcac2 }));
  const cross = (x0, y0, z0, s) => { const v = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 1.3 * s, 0.1 * s), crossMat); v.position.set(x0, y0 + 0.65 * s, z0); const h = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.1 * s, 0.6 * s), crossMat); h.position.set(x0, y0 + 0.9 * s, z0); grp.add(v, h); };
  cross((ta0 + ta1) / 2, TH + 1.75, (tb0 + tb1) / 2, 1);

  // ---------- nave ----------
  const [na0, na1, nb0, nb1] = [T.nave[0] - 0.5 - e, T.nave[1] + 0.5 + e, T.nave[2] - 0.5 - e, T.nave[3] + 0.5 + e];
  const NW = na1 - na0, ND = nb1 - nb0, EV = T.eave, RG = T.ridge, mid = (na0 + na1) / 2;
  // hastial sobre Pedro de Mendoza: tres ojivales (la del medio más alta) y tres ventanas rectangulares abajo
  const gable = [[na0, 0], [na1, 0], [na1, EV], [mid, RG], [na0, EV]];
  const front = keep(lam({ map: brickWall(NW, RG + 0.1, (x, m, Y) => {
    const c = NW / 2;
    lancet(x, m, Y, c - 1.75, 4.6, 8.0, 1.1); lancet(x, m, Y, c, 4.6, 8.8, 1.15); lancet(x, m, Y, c + 1.75, 4.6, 8.0, 1.1);
    rectWin(x, m, Y, c - 1.75, 1.5, 2.65, 1.0); rectWin(x, m, Y, c, 1.5, 2.65, 1.0); rectWin(x, m, Y, c + 1.75, 1.5, 2.65, 1.0);
  }) }));
  grp.add(wallPoly(gable, 'b', nb0, NW, RG + 0.1, front, na0));
  const back = keep(lam({ map: brickWall(NW, RG + 0.1) }));
  grp.add(wallPoly(gable, 'b', nb1, NW, RG + 0.1, back, na0));
  // costado del lado de la torre: ladrillo; el otro costado, revocado y pintado de blanco
  const sideB = keep(lam({ map: brickWall(ND, EV) })), sideW = keep(lam({ map: brickWall(ND, EV, null, { white: true }) }));
  grp.add(quad([[na0, 0, nb1], [na0, 0, nb0], [na0, EV, nb0], [na0, EV, nb1]], sideB));
  grp.add(quad([[na1, 0, nb0], [na1, 0, nb1], [na1, EV, nb1], [na1, EV, nb0]], sideW));
  // techo a dos aguas de tejas, con alero a los costados y atrás
  const slope = Math.hypot(NW / 2 + 0.35, RG - EV + 0.25);
  const roof2 = keep(lam({ map: tiles(slope, ND + 0.35) }));
  grp.add(quad([[na0 - 0.35, EV - 0.25, nb0 + 0.3], [mid, RG + 0.04, nb0 + 0.3], [mid, RG + 0.04, nb1 + 0.35], [na0 - 0.35, EV - 0.25, nb1 + 0.35]], roof2));
  grp.add(quad([[na1 + 0.35, EV - 0.25, nb0 + 0.3], [mid, RG + 0.04, nb0 + 0.3], [mid, RG + 0.04, nb1 + 0.35], [na1 + 0.35, EV - 0.25, nb1 + 0.35]], roof2));
  // remate blanco del hastial (un poco más alto que el techo) y la cruz en la punta
  for (const [x0, x1] of [[na0 - 0.15, mid], [na1 + 0.15, mid]]) {
    const L = Math.hypot(x1 - x0, RG - EV + 0.2), cop = new THREE.Mesh(new THREE.BoxGeometry(L, 0.28, 0.55), white);
    cop.position.set((x0 + x1) / 2, (EV + RG) / 2 + 0.1, nb0 + 0.2); cop.rotation.z = Math.sign(x1 - x0) * Math.atan2(RG - EV + 0.2, Math.abs(x1 - x0));
    grp.add(cop);
  }
  cross(mid, RG + 0.15, nb0 + 0.2, 1.1);
  return { grp, disp };
}

// Arma los hitos del mundo actual. Devuelve { update(p), dispose() }.
export function buildHitos(D, G, scene) {
  const items = [];
  for (const L of D.landmarks || []) {
    if (L.kind !== 'santaTrinidad') continue;
    const { grp, disp } = buildTrinidad();
    // ejes locales (a, y, b) → mundo: a por la calle «a», b por la calle «b»; el centro de la celda de la esquina en el origen
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(L.u[0], 0, L.u[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(L.v[0], 0, L.v[1]));
    m.setPosition(L.x + 0.5, G + 1, L.z + 0.5);
    grp.matrixAutoUpdate = false; grp.matrix.copy(m); grp.updateMatrixWorld(true);
    scene.add(grp);
    items.push({ L, grp, disp });
  }
  return {
    // sólo dentro de la distancia de dibujo (si no, flota sobre el terreno que todavía no se cargó)
    update(p, far = 700) { for (const it of items) it.grp.visible = Math.hypot(p.pos.x - it.L.x, p.pos.z - it.L.z) < far; },
    dispose() {
      for (const it of items) {
        scene.remove(it.grp);
        it.grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        for (const mt of it.disp) { mt.map?.dispose(); mt.dispose(); }
      }
    },
  };
}
