// Fachadas dibujadas a mano de los edificios más conocidos del centro porteño, sobre su silueta real del mapa
// (Casa Rosada, Cabildo, Catedral Metropolitana, Teatro Colón, Congreso y la Pirámide de Mayo).
// Cada lado del edificio lleva una textura con su estilo (tomado de fotos de la calle) y encima van las piezas
// en 3D: cúpulas, torres, pórticos con columnas, frontones, banderas.
import * as THREE from 'three';

const PX = 20; // píxeles por metro
// algo de luz propia para que los colores se vean como en las fotos (se apaga de noche)
const GLOW = [];
const lam = (o) => { const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, ...o }); if (o.map) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = o.map; } else if (o.color != null) m.emissive = new THREE.Color(o.color); m.emissiveIntensity = 0.3; GLOW.push(m); return m; };

// ---------- dibujo de fachadas (todas las medidas en metros, y desde abajo) ----------
function canvasFor(wm, hm) {
  const c = document.createElement('canvas'); c.width = Math.max(8, Math.ceil(wm * PX)); c.height = Math.max(8, Math.ceil(hm * PX));
  const x = c.getContext('2d');
  return { c, x, m: (v) => v * PX, Y: (v) => c.height - v * PX, W: wm, H: hm };
}
function stone(k, color, joints = 0.6, dark = 0.08) {
  const { x, c } = k; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < c.width * c.height / 1500; i++) { x.fillStyle = `rgba(60,50,40,${Math.random() * dark})`; x.fillRect(Math.random() * c.width, Math.random() * c.height, 2 + Math.random() * 14, 2 + Math.random() * 40); }
  if (joints) { x.fillStyle = 'rgba(70,60,50,0.12)'; for (let y = 0; y < c.height; y += joints * PX) x.fillRect(0, y, c.width, 1); }
}
const band = (k, y, h, color) => { k.x.fillStyle = color; k.x.fillRect(0, k.Y(y + h), k.c.width, k.m(h)); k.x.fillStyle = 'rgba(0,0,0,0.18)'; k.x.fillRect(0, k.Y(y), k.c.width, 2); };
// posiciones de una fila de aberturas repartidas en el ancho
const slots = (W, spacing, margin = 1.5) => { const n = Math.max(1, Math.floor((W - margin * 2) / spacing)), off = (W - n * spacing) / 2 + spacing / 2; return Array.from({ length: n }, (_, i) => off + i * spacing); };
function opening(k, cx, y0, y1, w, o = {}) {
  const { x, m, Y } = k, r = w / 2, arch = o.arch, top = arch ? y1 - r : y1;
  const path = (g) => { x.beginPath(); x.moveTo(m(cx - r - g), Y(y0)); x.lineTo(m(cx - r - g), Y(top)); if (arch) x.arc(m(cx), Y(top), m(r + g), Math.PI, 0); else x.lineTo(m(cx + r + g), Y(top)); x.lineTo(m(cx + r + g), Y(y0)); x.closePath(); };
  if (o.frame) { path(o.fw ?? 0.15); x.fillStyle = o.frame; x.fill(); }
  path(0); x.fillStyle = o.fill || '#3d3a3a'; x.fill();
  if (o.glass) { x.save(); path(0); x.clip(); x.strokeStyle = o.glass; x.lineWidth = 2; x.beginPath(); x.moveTo(m(cx), Y(y0)); x.lineTo(m(cx), Y(y1)); for (let yy = y0 + 0.7; yy < y1; yy += 0.7) { x.moveTo(m(cx - r), Y(yy)); x.lineTo(m(cx + r), Y(yy)); } x.stroke(); x.restore(); }
  if (o.cap) { x.fillStyle = o.cap; x.beginPath(); x.moveTo(m(cx - r - 0.35), Y(y1 + 0.15)); x.lineTo(m(cx), Y(y1 + 0.75)); x.lineTo(m(cx + r + 0.35), Y(y1 + 0.15)); x.closePath(); x.fill(); }
  if (o.sill) { x.fillStyle = o.sill; x.fillRect(m(cx - r - 0.25), Y(y0 + 0.02), m(w + 0.5), m(0.14)); }
  if (o.balcony) { x.fillStyle = o.balcony; x.fillRect(m(cx - r - 0.4), Y(y0 + 0.9), m(w + 0.8), m(0.1)); for (let bx = cx - r - 0.3; bx <= cx + r + 0.3; bx += 0.18) x.fillRect(m(bx), Y(y0 + 0.9), 2, m(0.9)); x.fillRect(m(cx - r - 0.5), Y(y0), m(w + 1), m(0.15)); }
}
const oculus = (k, cx, cy, r, frame, fill) => { const { x, m, Y } = k; x.fillStyle = frame; x.beginPath(); x.arc(m(cx), Y(cy), m(r + 0.18), 0, Math.PI * 2); x.fill(); x.fillStyle = fill; x.beginPath(); x.arc(m(cx), Y(cy), m(r), 0, Math.PI * 2); x.fill(); };
const pilasters = (k, xs, y0, y1, w, color) => { k.x.fillStyle = color; for (const cx of xs) k.x.fillRect(k.m(cx - w / 2), k.Y(y1), k.m(w), k.m(y1 - y0)); k.x.fillStyle = 'rgba(0,0,0,0.12)'; for (const cx of xs) k.x.fillRect(k.m(cx + w / 2) - 2, k.Y(y1), 2, k.m(y1 - y0)); };
function balustrade(k, y0, y1, color) { const { x, m, Y, c } = k; x.fillStyle = color; x.fillRect(0, Y(y1), c.width, m(0.25)); x.fillRect(0, Y(y0 + 0.2), c.width, m(0.2)); for (let bx = 0.2; bx < k.W; bx += 0.32) x.fillRect(m(bx), Y(y1 - 0.25), m(0.12), m(y1 - y0 - 0.45)); }

// ---------- estilos ----------
// draw(k, front): dibuja un lado; front = es el frente principal (con el centro en k.center, en metros desde la izquierda)
const STYLES = {
  // Casa Rosada: rosado, tres pisos, arcos en planta baja, ventanas en arco, pilastras claras y balaustrada
  rosada: {
    color: '#c58779', trim: '#e7c6b6',
    draw(k) {
      stone(k, this.color, 0, 0.06);
      const xs = slots(k.W, 5.2);
      band(k, 6.4, 0.4, this.trim); band(k, 12.6, 0.35, this.trim); band(k, 17.8, 0.7, this.trim);
      pilasters(k, xs.map((v) => v + 2.6).slice(0, -1), 6.8, 17.8, 0.5, this.trim);
      for (const cx of xs) {
        opening(k, cx, 0.4, 5.2, 2.3, { arch: true, frame: this.trim, fill: '#4a3c3a' });
        opening(k, cx, 7.6, 11.8, 1.5, { arch: true, frame: this.trim, fill: '#3f3a3c', glass: '#8b7c78', balcony: '#3a3030' });
        opening(k, cx, 13.4, 16.8, 1.3, { frame: this.trim, fill: '#3f3a3c', glass: '#8b7c78', sill: this.trim });
      }
      balustrade(k, 18.5, 20, this.trim);
    },
  },
  // Cabildo: blanco, arcadas en los dos pisos, puertas y postigos verdes
  cabildo: {
    color: '#f1eee6', trim: '#ffffff',
    draw(k) {
      stone(k, this.color, 0, 0.04);
      const xs = slots(k.W, 4.4, 0.6);
      for (const cx of xs) {
        opening(k, cx, 0, 4.4, 3.2, { arch: true, fill: '#d9d4c8' });
        opening(k, cx, 0.6, 3.3, 1.5, { fill: '#2f5e44' });
        opening(k, cx, 5.6, 9.4, 3.0, { arch: true, fill: '#dcd7cb' });
        opening(k, cx, 5.8, 8.6, 1.4, { fill: '#2f5e44' });
      }
      band(k, 5.0, 0.4, '#e8e4da');
      k.x.fillStyle = '#2b2b2b'; for (let bx = 0; bx < k.W; bx += 0.25) k.x.fillRect(k.m(bx), k.Y(6.4), 2, k.m(0.9)); k.x.fillRect(0, k.Y(6.4), k.c.width, 2);
      band(k, 9.9, 0.5, '#e8e4da');
      balustrade(k, 10.3, 11, '#f6f4ee');
    },
  },
  // Catedral Metropolitana: muros de piedra beige; en el frente, tres portones y medallones detrás de las columnas
  catedral: {
    color: '#b8ab95', trim: '#cbbfa9',
    draw(k, front) {
      stone(k, this.color, 0.55, 0.07);
      band(k, 15.2, 0.6, this.trim); band(k, 18.8, 1.2, this.trim);
      if (front) {
        const c = k.center;
        for (const d of [-9.5, 0, 9.5]) opening(k, c + d, 0.5, 6.8, 3.2, { frame: '#9b8f7c', fill: '#4a3a2c' });
        for (const d of [-14.5, -4.8, 4.8, 14.5]) oculus(k, c + d, 7.5, 1.1, '#8f836f', '#6b5a3a');
      } else for (const cx of slots(k.W, 7)) opening(k, cx, 6, 11, 1.6, { arch: true, frame: this.trim, fill: '#5a5048' });
    },
  },
  // Teatro Colón: piedra clara, puertas altas en arco, ventanas con frontón, ojos de buey y friso
  colon: {
    color: '#ddcfb1', trim: '#efe5d0',
    draw(k) {
      stone(k, this.color, 0.5, 0.06);
      const xs = slots(k.W, 4.4, 1);
      band(k, 7.0, 0.45, this.trim); band(k, 12.9, 0.35, this.trim); band(k, 16.4, 1.1, this.trim); band(k, 17.6, 0.9, '#e6dcc4');
      pilasters(k, xs.map((v) => v + 2.2).slice(0, -1), 7.5, 16.4, 0.55, this.trim);
      xs.forEach((cx, i) => {
        opening(k, cx, 0.2, 6.0, 2.0, { arch: true, frame: '#f6f2e8', fill: '#3d4246', glass: '#e8e4dc' });
        opening(k, cx, 8.4, 11.6, 1.4, { frame: '#f6f2e8', fill: '#3d4246', glass: '#e8e4dc', cap: i % 2 ? this.trim : null, balcony: i % 3 === 1 ? '#c9bc9f' : null, sill: this.trim });
        oculus(k, cx, 14.7, 0.55, '#f2ecdc', '#4a4e52');
      });
    },
  },
  // Congreso: granito gris, basamento almohadillado, columnas adosadas, ventanas altas, ático y balaustrada
  congreso: {
    color: '#a9a59c', trim: '#bebab1',
    draw(k) {
      stone(k, this.color, 0.7, 0.08);
      const xs = slots(k.W, 4.2, 1);
      k.x.fillStyle = 'rgba(40,40,40,0.18)'; for (let y = 0.5; y < 4; y += 0.5) k.x.fillRect(0, k.Y(y), k.c.width, 2);
      band(k, 4.0, 0.5, this.trim); band(k, 17.2, 0.8, this.trim); band(k, 22.2, 0.8, this.trim);
      const cols = xs.map((v) => v + 2.1).slice(0, -1);
      k.x.fillStyle = '#c3bfb6'; for (const cx of cols) { const g = k.x.createLinearGradient(k.m(cx - 0.45), 0, k.m(cx + 0.45), 0); g.addColorStop(0, '#8f8b83'); g.addColorStop(0.45, '#d2cec5'); g.addColorStop(1, '#8a867e'); k.x.fillStyle = g; k.x.fillRect(k.m(cx - 0.45), k.Y(17.2), k.m(0.9), k.m(12.7)); }
      for (const cx of xs) {
        opening(k, cx, 1.2, 3.2, 1.0, { fill: '#3a3a3c', frame: this.trim, fw: 0.1 });
        opening(k, cx, 5.4, 12.6, 1.6, { arch: true, frame: this.trim, fill: '#3a3a3c', glass: '#9a968e', balcony: '#55524c' });
        opening(k, cx, 13.6, 16.2, 1.3, { frame: this.trim, fill: '#3a3a3c', glass: '#9a968e' });
        opening(k, cx, 18.6, 21.2, 1.2, { frame: this.trim, fill: '#3a3a3c' });
      }
      balustrade(k, 23, 24.6, this.trim);
    },
  },
};

// ---------- geometría ----------
function wallQuad(a, b, y0, y1, mat, u = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, u, 0, u, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const texOf = (k, rep = false) => { const t = new THREE.CanvasTexture(k.c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) t.wrapS = THREE.RepeatWrapping; return t; };

function buildOne(F, G) {
  const S = STYLES[F.style], grp = new THREE.Group(), disp = [];
  const keep = (o) => { disp.push(o); return o; };
  const pts = F.pts, n = pts.length, e = 0.06;
  // normal hacia afuera de cada lado
  const normal = (i) => { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % n], L = Math.hypot(x2 - x1, z2 - z1) || 1; const s = F.ccw ? 1 : -1; return [((z2 - z1) / L) * s, (-(x2 - x1) / L) * s]; };
  // el frente: todos los lados que miran como el principal y están cerca de su línea
  const M = F.main, mn = M >= 0 ? normal(M) : [0, 1], ma = M >= 0 ? pts[M] : pts[0], tan = [-mn[1], mn[0]];
  const isFront = (i) => { if (M < 0) return false; const nn = normal(i), [x1, z1] = pts[i]; return nn[0] * mn[0] + nn[1] * mn[1] > 0.9 && Math.abs((x1 - ma[0]) * mn[0] + (z1 - ma[1]) * mn[1]) < 9; };
  let t0 = Infinity, t1 = -Infinity;
  for (let i = 0; i < n; i++) if (isFront(i)) for (const p of [pts[i], pts[(i + 1) % n]]) { const t = (p[0] - ma[0]) * tan[0] + (p[1] - ma[1]) * tan[1]; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
  const tc = (t0 + t1) / 2, center = [ma[0] + tan[0] * tc, ma[1] + tan[1] * tc]; // centro del frente
  const along = (d, inward = 0, y = 0) => new THREE.Vector3(center[0] + tan[0] * d - mn[0] * inward, G + y, center[1] + tan[1] * d - mn[1] * inward);
  const yaw = Math.atan2(mn[0], mn[1]); // gira objetos para que miren hacia afuera del frente

  if (S) {
    // textura repetida para los lados comunes (10 m de ancho) y única para el frente
    const kt = canvasFor(10, F.h); S.draw(kt, false); const tileMat = keep(lam({ map: keep(texOf(kt, true)) }));
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue;
      const nn = normal(i), A = [a[0] + nn[0] * e, a[1] + nn[1] * e], B = [b[0] + nn[0] * e, b[1] + nn[1] * e];
      let mat = tileMat, u = L / 10;
      if (isFront(i) && L > 3) {
        const k = canvasFor(L, F.h);
        // centro del frente medido desde el comienzo de este lado
        k.center = (center[0] - a[0]) * (b[0] - a[0]) / L + (center[1] - a[1]) * (b[1] - a[1]) / L;
        S.draw(k, true); mat = keep(lam({ map: keep(texOf(k)) })); u = 1;
      }
      const inset = F.porch && isFront(i) ? F.porch : 0; // detrás del pórtico
      grp.add(wallQuad([A[0] - nn[0] * inset, A[1] - nn[1] * inset], [B[0] - nn[0] * inset, B[1] - nn[1] * inset], G, G + F.h, mat, u));
    }
  }
  const box = (w, h, d, mat, pos, ry = yaw) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.copy(pos); o.rotation.y = ry; grp.add(o); return o; };
  const cyl = (r0, r1, h, mat, pos, seg = 16) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); o.position.copy(pos); grp.add(o); return o; };
  const dome = (r, sy, mat, pos) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat); o.scale.y = sy; o.position.copy(pos); grp.add(o); return o; };
  // techo de mansarda (pizarra) alrededor de todo el borde
  const mansard = (y, h, inset, mat) => {
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], nn = normal(i); if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], G + y, a[1], b[0], G + y, b[1], b[0] - nn[0] * inset, G + y + h, b[1] - nn[1] * inset, a[0] - nn[0] * inset, G + y + h, a[1] - nn[1] * inset], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
      grp.add(new THREE.Mesh(g, mat));
    }
  };
  // frontón macizo: prisma triangular de ancho w y alto h, desde `inward` hacia afuera con profundidad d
  const pediment = (w, h, d, inward, y, mat) => {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
    const o = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }), mat);
    o.position.copy(along(0, inward, y)); o.rotation.y = yaw; grp.add(o); return o;
  };
  // tapa del techo (por si se ve desde arriba)
  const roofCap = (y, mat) => { const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))); const g = new THREE.ShapeGeometry(shape); g.rotateX(Math.PI / 2); const o = new THREE.Mesh(g, mat); o.position.y = G + y; grp.add(o); };
  const flagAt = (pos, h, ry) => {
    cyl(0.07, 0.09, h, keep(lam({ color: 0xdedede })), pos.clone().add(new THREE.Vector3(0, h / 2, 0)), 8);
    const c = document.createElement('canvas'); c.width = 96; c.height = 60; const x = c.getContext('2d');
    x.fillStyle = '#74acdf'; x.fillRect(0, 0, 96, 60); x.fillStyle = '#ffffff'; x.fillRect(0, 20, 96, 20); x.fillStyle = '#f6b40e'; x.beginPath(); x.arc(48, 30, 6, 0, Math.PI * 2); x.fill();
    const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), keep(lam({ map: t }))); f.position.copy(pos).add(new THREE.Vector3(Math.sin(ry) * 1.2, h - 0.8, Math.cos(ry) * 1.2)); f.rotation.y = ry + Math.PI / 2; grp.add(f);
  };
  const flag = (pos, h) => {
    cyl(0.08, 0.1, h, keep(lam({ color: 0xdedede })), pos.clone().add(new THREE.Vector3(0, h / 2, 0)), 8);
    const c = document.createElement('canvas'); c.width = 96; c.height = 60; const x = c.getContext('2d');
    x.fillStyle = '#74acdf'; x.fillRect(0, 0, 96, 60); x.fillStyle = '#ffffff'; x.fillRect(0, 20, 96, 20); x.fillStyle = '#f6b40e'; x.beginPath(); x.arc(48, 30, 6, 0, Math.PI * 2); x.fill();
    const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.9), keep(lam({ map: t }))); f.position.copy(pos).add(new THREE.Vector3(Math.cos(yaw) * 1.5, h - 1, -Math.sin(yaw) * 1.5)); f.rotation.y = yaw + Math.PI / 2; grp.add(f);
  };

  if (F.style === 'rosada') {
    const slate = keep(lam({ color: 0x5d6863 })), pink = keep(lam({ color: 0xc58779 })), trim = keep(lam({ color: 0xe7c6b6 })), green = keep(lam({ color: 0x6d8579 }));
    mansard(F.h, 3.2, 2.6, slate); roofCap(F.h + 0.05, slate);
    // cuerpo central con el gran arco, el frontón con el reloj y la bandera
    const k = canvasFor(18, 26); stone(k, '#c58779', 0, 0.05);
    opening(k, 9, 0, 10, 6, { arch: true, frame: '#e7c6b6', fill: '#3a2e2e', fw: 0.5 });
    for (const d of [3, 15]) { opening(k, d, 7.6, 11.8, 1.5, { arch: true, frame: '#e7c6b6', fill: '#3f3a3c' }); opening(k, d, 13.4, 16.8, 1.3, { frame: '#e7c6b6', fill: '#3f3a3c' }); }
    for (const d of [6.5, 9, 11.5]) opening(k, d, 13.2, 17.2, 1.4, { arch: true, frame: '#e7c6b6', fill: '#3f3a3c', balcony: '#3a3030' });
    band(k, 12.6, 0.35, '#e7c6b6'); band(k, 17.8, 0.8, '#e7c6b6'); balustrade(k, 18.6, 20, '#e7c6b6');
    k.x.fillStyle = '#c58779'; k.x.beginPath(); k.x.moveTo(k.m(3), k.Y(20)); k.x.quadraticCurveTo(k.m(9), k.Y(27.5), k.m(15), k.Y(20)); k.x.fill();
    k.x.strokeStyle = '#e7c6b6'; k.x.lineWidth = k.m(0.35); k.x.stroke();
    oculus(k, 9, 22.2, 1.2, '#e7c6b6', '#f4f0e6'); k.x.strokeStyle = '#333'; k.x.lineWidth = 3; k.x.beginPath(); k.x.moveTo(k.m(9), k.Y(22.2)); k.x.lineTo(k.m(9), k.Y(23)); k.x.moveTo(k.m(9), k.Y(22.2)); k.x.lineTo(k.m(9.5), k.Y(22.2)); k.x.stroke();
    const cm = keep(lam({ map: keep(texOf(k)), transparent: true, alphaTest: 0.5 }));
    const front = new THREE.Mesh(new THREE.PlaneGeometry(18, 26), cm); front.position.copy(along(0, -1.2, 13)); front.rotation.y = yaw; grp.add(front);
    box(18, 20, 1.1, pink, along(0, -0.6, 10)).material = pink;
    box(18.4, 0.6, 1.5, trim, along(0, -0.6, 20));
    flag(along(0, 3, 24.5), 9);
    // las dos cúpulas de las esquinas sobre la plaza
    for (const t of [t0 + (t1 - t0) * 0.2 - tc, t0 + (t1 - t0) * 0.82 - tc]) {
      cyl(4.2, 4.2, 3, pink, along(t, 6, F.h + 1.5), 20);
      dome(4.4, 1.15, green, along(t, 6, F.h + 3));
      cyl(0.6, 0.9, 1.6, green, along(t, 6, F.h + 3 + 5.1 + 0.8), 8);
    }
  } else if (F.style === 'cabildo') {
    const white = keep(lam({ color: 0xf3f0e8 })), tile = keep(lam({ color: 0xa65a3c }));
    mansard(F.h, 1.6, 4, tile); roofCap(F.h + 0.05, tile);
    // la torre del reloj en el centro
    const kt = canvasFor(5.4, 15); stone(kt, '#f1eee6', 0, 0.03);
    oculus(kt, 2.7, 4.2, 1.0, '#e2ddd0', '#fbfaf6'); kt.x.strokeStyle = '#222'; kt.x.lineWidth = 3; kt.x.beginPath(); kt.x.moveTo(kt.m(2.7), kt.Y(4.2)); kt.x.lineTo(kt.m(2.7), kt.Y(4.9)); kt.x.moveTo(kt.m(2.7), kt.Y(4.2)); kt.x.lineTo(kt.m(3.2), kt.Y(4.2)); kt.x.stroke();
    opening(kt, 2.7, 7.6, 11.6, 1.8, { arch: true, frame: '#e6e1d4', fill: '#5a5a58' });
    band(kt, 6.6, 0.4, '#e8e4da'); band(kt, 12.4, 0.5, '#e8e4da');
    const tm = keep(lam({ map: keep(texOf(kt)) }));
    const tw = new THREE.Mesh(new THREE.BoxGeometry(5.4, 15, 5.4), [tm, tm, white, white, tm, tm]); tw.position.copy(along(0, 3.2, F.h + 7.5 - 2)); tw.rotation.y = yaw; grp.add(tw);
    dome(2.2, 1.2, white, along(0, 3.2, F.h + 15 - 2)); cyl(0.5, 0.6, 1.4, white, along(0, 3.2, F.h + 15 - 2 + 3.2), 8);
    box(0.12, 1.4, 0.12, keep(lam({ color: 0x333333 })), along(0, 3.2, F.h + 15 - 2 + 4.6)); box(0.7, 0.12, 0.12, keep(lam({ color: 0x333333 })), along(0, 3.2, F.h + 15 - 2 + 4.9));
    // el frontis curvo sobre el centro de la fachada
    const kp = canvasFor(9, 3); kp.x.fillStyle = '#f1eee6'; kp.x.beginPath(); kp.x.moveTo(0, kp.Y(0)); kp.x.quadraticCurveTo(kp.m(4.5), kp.Y(4.2), kp.m(9), kp.Y(0)); kp.x.fill();
    const pf = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), keep(lam({ map: keep(texOf(kp)), transparent: true, alphaTest: 0.5 }))); pf.position.copy(along(0, -0.1, F.h + 1.5)); pf.rotation.y = yaw; grp.add(pf);
  } else if (F.style === 'catedral') {
    const col = keep(lam({ color: 0xd2c9b6 })), stoneM = keep(lam({ color: 0xc2b7a2 })), green = keep(lam({ color: 0x7d8d84 }));
    roofCap(F.h, stoneM);
    // pórtico: doce columnas corintias, entablamento y el frontón con el relieve
    const span = t1 - t0, nc = 12, H = 15;
    for (let i = 0; i < nc; i++) { const t = t0 - tc + 1.2 + (i * (span - 2.4)) / (nc - 1); cyl(0.78, 0.85, H - 1.2, col, along(t, 1.4, 0.6 + (H - 1.2) / 2), 16); box(1.9, 0.6, 1.9, col, along(t, 1.4, H - 0.3)); box(1.9, 0.6, 1.9, col, along(t, 1.4, 0.3)); }
    box(span, 2.6, F.porch + 0.6, stoneM, along(0, F.porch / 2, H + 1.3));
    const kp = canvasFor(span, 6); kp.x.fillStyle = '#c9bea9'; kp.x.beginPath(); kp.x.moveTo(0, kp.Y(0)); kp.x.lineTo(kp.m(span / 2), kp.Y(6)); kp.x.lineTo(kp.m(span), kp.Y(0)); kp.x.closePath(); kp.x.fill();
    kp.x.strokeStyle = '#b3a891'; kp.x.lineWidth = kp.m(0.4); kp.x.stroke();
    // el relieve (José y sus hermanos): figuras en el tímpano
    kp.x.fillStyle = '#a99c84'; for (let i = 0; i < 26; i++) { const fx = span * (0.12 + i * 0.03), top = 6 * (1 - Math.abs(fx - span / 2) / (span / 2)) - 0.9; if (top < 1) continue; kp.x.fillRect(kp.m(fx), kp.Y(Math.min(top, 0.6 + Math.random() * 3)), kp.m(0.45), kp.m(Math.min(top, 0.6 + Math.random() * 3) - 0.5)); kp.x.beginPath(); kp.x.arc(kp.m(fx + 0.22), kp.Y(Math.min(top, 3.6) + 0.2), kp.m(0.25), 0, Math.PI * 2); kp.x.fill(); }
    const pm = keep(lam({ map: keep(texOf(kp)), transparent: true, alphaTest: 0.5 }));
    const pd = new THREE.Mesh(new THREE.PlaneGeometry(span, 6), pm); pd.position.copy(along(0, -0.25, H + 2.6 + 3)); pd.rotation.y = yaw; grp.add(pd);
    pediment(span, 5.6, F.porch + 0.6, F.porch + 0.4, H + 2.6, stoneM);
    // la cúpula, más atrás
    const cdist = 34;
    cyl(7, 7, 7, stoneM, along(0, cdist, F.h + 3.5), 24); dome(7.4, 1.1, green, along(0, cdist, F.h + 7)); cyl(1, 1.4, 3, stoneM, along(0, cdist, F.h + 7 + 8.1 + 1.5), 10);
  } else if (F.style === 'colon') {
    const slate = keep(lam({ color: 0x55585a })), stoneM = keep(lam({ color: 0xddcfb1 }));
    // mansarda de pizarra con lucarnas
    const kd = canvasFor(10, 4.5); kd.x.fillStyle = '#55585a'; kd.x.fillRect(0, 0, kd.c.width, kd.c.height);
    for (const cx of slots(10, 4.4, 1)) opening(kd, cx, 0.8, 3.0, 1.1, { frame: '#e8dfc8', fill: '#3a3d40', cap: '#e8dfc8' });
    balustrade(kd, 3.6, 4.5, '#d8cbb0');
    const tdm = keep(texOf(kd, true)); const mm = keep(lam({ map: tdm }));
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], nn = normal(i), L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue; const q = wallQuad([a[0] - nn[0] * 1.2, a[1] - nn[1] * 1.2], [b[0] - nn[0] * 1.2, b[1] - nn[1] * 1.2], G + F.h, G + F.h + 4.5, mm, L / 10); grp.add(q); }
    roofCap(F.h + 0.05, slate);
    // el cuerpo central del frente sobre Libertad: frontón y la cubierta curva de la sala, más alta atrás
    const kp = canvasFor(16, 4); kp.x.fillStyle = '#e4d8bd'; kp.x.beginPath(); kp.x.moveTo(0, kp.Y(0)); kp.x.lineTo(kp.m(8), kp.Y(4)); kp.x.lineTo(kp.m(16), kp.Y(0)); kp.x.closePath(); kp.x.fill(); kp.x.strokeStyle = '#f2ead6'; kp.x.lineWidth = 6; kp.x.stroke();
    const pd = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), keep(lam({ map: keep(texOf(kp)), transparent: true, alphaTest: 0.5 }))); pd.position.copy(along(0, -0.2, F.h + 2)); pd.rotation.y = yaw; grp.add(pd);
    const sala = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 30, 24, 1, false, 0, Math.PI), slate); sala.rotation.set(0, yaw + Math.PI / 2, Math.PI / 2); sala.scale.set(0.45, 1, 1); sala.position.copy(along(0, 55, F.h + 4.5)); grp.add(sala);
  } else if (F.style === 'congreso') {
    const gran = keep(lam({ color: 0xaaa69d })), light = keep(lam({ color: 0xc4c0b7 })), copper = keep(lam({ color: 0x4f8a74 })), dark = keep(lam({ color: 0x7d7a73 }));
    roofCap(F.h, dark);
    // pórtico central: seis columnas, entablamento, frontón y la escalinata
    const P = 7, cols = 6, w = 26;
    for (let i = 0; i < cols; i++) { const t = -w / 2 + 2 + (i * (w - 4)) / (cols - 1); cyl(0.95, 1.05, 13, light, along(t, -P + 1.2, 4 + 6.5), 16); }
    box(w, 2.2, P + 1, gran, along(0, -P / 2 + 0.5, 18.1));
    const kp = canvasFor(w, 6); kp.x.fillStyle = '#b4b0a7'; kp.x.beginPath(); kp.x.moveTo(0, kp.Y(0)); kp.x.lineTo(kp.m(w / 2), kp.Y(5.5)); kp.x.lineTo(kp.m(w), kp.Y(0)); kp.x.closePath(); kp.x.fill(); kp.x.strokeStyle = '#cfcbc2'; kp.x.lineWidth = 8; kp.x.stroke();
    const pd = new THREE.Mesh(new THREE.PlaneGeometry(w, 6), keep(lam({ map: keep(texOf(kp)), transparent: true, alphaTest: 0.5 }))); pd.position.copy(along(0, -P - 0.05, 19.2 + 3)); pd.rotation.y = yaw; grp.add(pd);
    pediment(w, 5.2, P + 1, 1, 19.2, gran);
    for (let s = 0; s < 8; s++) box(w + 4 - s * 0.5, 0.5, 1.2, light, along(0, -P - 1.6 + s * 0.6 + 0.6, 0.25 + s * 0.5));
    box(w + 2, 4, P, gran, along(0, -P / 2, 2));
    // la cúpula: tambor con columnas, casquete de cobre verde, linterna y aguja (unos 80 m)
    const dz = 24;
    const kd = canvasFor(70, 18); stone(kd, '#a9a59c', 0.7, 0.06);
    for (let cx = 1.5; cx < 70; cx += 3.5) { const g = kd.x.createLinearGradient(kd.m(cx - 0.4), 0, kd.m(cx + 0.4), 0); g.addColorStop(0, '#8f8b83'); g.addColorStop(0.5, '#d4d0c7'); g.addColorStop(1, '#8a867e'); kd.x.fillStyle = g; kd.x.fillRect(kd.m(cx - 0.4), kd.Y(16), kd.m(0.8), kd.m(14)); opening(kd, cx + 1.75, 5, 12, 1.3, { arch: true, fill: '#3a3a3c', frame: '#c4c0b7' }); }
    band(kd, 16, 2, '#c4c0b7');
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 18, 32, 1, true), keep(lam({ map: keep(texOf(kd, true)) }))); drum.position.copy(along(0, dz, F.h + 9)); grp.add(drum);
    cyl(11.6, 11.6, 1.2, light, along(0, dz, F.h + 18.6), 32);
    dome(11.3, 1.3, copper, along(0, dz, F.h + 19.2));
    cyl(2.2, 2.5, 6, light, along(0, dz, F.h + 19.2 + 14.7 + 3), 12);
    dome(2.4, 1.2, copper, along(0, dz, F.h + 19.2 + 14.7 + 6));
    cyl(0.12, 0.45, 6, dark, along(0, dz, F.h + 19.2 + 14.7 + 6 + 2.9 + 3), 8);
  } else if (F.style === 'ecuestre') {
    // Monumento al General Belgrano: pedestal de granito con escalones y el jinete de bronce con la bandera
    const gr = keep(lam({ color: 0x8e8a84 })), bronze = keep(lam({ color: 0x4d5a4c })), sp = new THREE.Vector3(pts.reduce((s, p) => s + p[0] / n, 0), 0, pts.reduce((s, p) => s + p[1] / n, 0));
    const at = (y, f = 0, s = 0) => new THREE.Vector3(sp.x + mn[0] * f + tan[0] * s, G + y, sp.z + mn[1] * f + tan[1] * s);
    box(9, 0.5, 6, gr, at(0.25)); box(8, 0.5, 5, gr, at(0.75)); box(6, 3.2, 3, gr, at(2.6));
    box(1.0, 1.3, 3.0, bronze, at(5.4)); // cuerpo del caballo
    box(0.7, 1.0, 0.8, bronze, at(6.2, 1.7)); box(0.5, 0.5, 1.0, bronze, at(6.6, 2.3)); // cuello y cabeza
    for (const [f, s] of [[1.1, 0.3], [1.1, -0.3], [-1.1, 0.3], [-1.1, -0.3]]) box(0.25, 1.6, 0.25, bronze, at(4.0, f, s));
    box(0.6, 1.0, 0.5, bronze, at(6.6, -0.2)); box(0.32, 0.32, 0.32, bronze, at(7.35, -0.2)); // el jinete
    box(0.08, 3, 0.08, bronze, at(8.0, 0.2, 0.4)); box(0.05, 1.0, 1.4, keep(lam({ color: 0x8fb8d8 })), at(8.9, 0.2, 1.1)); // la bandera
  } else if (F.style === 'fragata') {
    // Fragata ARA «Presidente Sarmiento» (1897), buque museo en el Dique 3: casco blanco con la franja negra
    // de flotación y la línea de ojos de buey, tres mástiles ocre con vergas, dos chimeneas, bauprés y toldos blancos.
    // Ejes del barco: de popa a proa (la proa mira al destino «target»)
    let bi = 0, bj = 0, bd = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d > bd) { bd = d; bi = i; bj = j; } }
    let A = pts[bi], Bp = pts[bj];
    // la proa es la punta que queda más cerca del frente principal calculado con el destino
    if (M >= 0) { const c0 = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2], sa = (A[0] - c0[0]) * mn[0] + (A[1] - c0[1]) * mn[1], sb = (Bp[0] - c0[0]) * mn[0] + (Bp[1] - c0[1]) * mn[1]; if (sa > sb) [A, Bp] = [Bp, A]; }
    const Lh = bd, ax = [(Bp[0] - A[0]) / Lh, (Bp[1] - A[1]) / Lh], side = [-ax[1], ax[0]];
    const P = (f, s = 0, y = 0) => new THREE.Vector3(A[0] + ax[0] * f * Lh + side[0] * s, G + y, A[1] + ax[1] * f * Lh + side[1] * s);
    const shipYaw = Math.atan2(-ax[0], -ax[1]) + Math.PI; // el eje local -z mira a la proa
    const DECK = 2, TOP = 2.9;
    // casco: blanco, franja negra bajo el agua, línea dorada y ojos de buey
    const kh = canvasFor(10, TOP + 1.6), Y0 = 1.6;
    kh.x.fillStyle = '#f2f1ec'; kh.x.fillRect(0, 0, kh.c.width, kh.c.height);
    kh.x.fillStyle = '#1d1d1f'; kh.x.fillRect(0, kh.Y(Y0 + 0.25), kh.c.width, kh.m(Y0 + 0.25));
    kh.x.fillStyle = '#c9a148'; kh.x.fillRect(0, kh.Y(Y0 + 2.15), kh.c.width, kh.m(0.12));
    for (let px = 0.8; px < 10; px += 1.6) { kh.x.fillStyle = '#c9a148'; kh.x.beginPath(); kh.x.arc(kh.m(px), kh.Y(Y0 + 1.35), kh.m(0.2), 0, Math.PI * 2); kh.x.fill(); kh.x.fillStyle = '#2b3036'; kh.x.beginPath(); kh.x.arc(kh.m(px), kh.Y(Y0 + 1.35), kh.m(0.14), 0, Math.PI * 2); kh.x.fill(); }
    kh.x.fillStyle = '#6b4a2e'; kh.x.fillRect(0, 0, kh.c.width, kh.m(0.18));
    const hullM = keep(lam({ map: keep(texOf(kh, true)) }));
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.2) continue; grp.add(wallQuad(a, b, G - Y0, G + TOP, hullM, L / 10)); }
    const ochre = keep(lam({ color: 0xc69d4c })), darkW = keep(lam({ color: 0x4a3626 })), white = keep(lam({ color: 0xf4f3ee })), blackM = keep(lam({ color: 0x1d1d1f }));
    const spar = (r0, r1, len, mat, pos, rot) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 8), mat); o.position.copy(pos); o.rotation.copy(rot); grp.add(o); return o; };
    const lines = [];
    // mástiles: trinquete, mayor y mesana, con cuatro vergas cada uno
    const MASTS = [[0.24, 36, 19], [0.48, 39, 21], [0.71, 33, 16]];
    for (const [f, h, yard] of MASTS) {
      spar(0.42, 0.16, h, ochre, P(f, 0, DECK + h / 2), new THREE.Euler(0, 0, 0));
      [0.36, 0.55, 0.71, 0.85].forEach((t, k) => {
        const len = yard * Math.pow(0.78, k), y = DECK + h * t;
        const o = spar(0.17, 0.17, len, k ? ochre : darkW, P(f, 0, y), new THREE.Euler(0, 0, Math.PI / 2)); o.rotation.set(0, shipYaw + Math.PI / 2, Math.PI / 2);
        o.rotation.order = 'YXZ'; o.rotation.set(0, shipYaw, Math.PI / 2);
        // obenques de cada lado y brazas
        for (const sd of [-1, 1]) { lines.push(P(f, sd * len / 2, y), P(f + 0.012 * (k + 1), sd * 6.6, DECK + 0.8)); }
      });
      for (const sd of [-1, 1]) for (const df of [-0.02, 0, 0.02]) lines.push(P(f, 0, DECK + h * 0.9), P(f + df, sd * 6.8, TOP));
    }
    // estays entre los mástiles y hacia el bauprés
    lines.push(P(0.24, 0, DECK + 36), P(0.48, 0, DECK + 30), P(0.48, 0, DECK + 39), P(0.71, 0, DECK + 26), P(0.71, 0, DECK + 33), P(0.98, 0, TOP + 1));
    // bauprés: sale de la proa hacia adelante y arriba
    const bow = P(0, 0, TOP), tip = P(-0.17, 0, TOP + 4.5);
    const bs = spar(0.32, 0.14, bow.distanceTo(tip), ochre, bow.clone().lerp(tip, 0.5), new THREE.Euler()); bs.lookAt(tip); bs.rotateX(Math.PI / 2);
    lines.push(tip, P(0.24, 0, DECK + 30), tip, P(0.24, 0, DECK + 20), tip, P(0.02, 2.5, TOP), tip, P(0.02, -2.5, TOP));
    const lg = new THREE.BufferGeometry().setFromPoints(lines); grp.add(new THREE.LineSegments(lg, keep(new THREE.LineBasicMaterial({ color: 0x3a3430 }))));
    // dos chimeneas ocre entre el trinquete y el palo mayor
    for (const f of [0.33, 0.39]) { spar(0.85, 0.9, 6.5, ochre, P(f, 0, DECK + 3.25), new THREE.Euler()); spar(0.88, 0.88, 0.7, blackM, P(f, 0, DECK + 6.85), new THREE.Euler()); }
    // toldos blancos sobre la cubierta y la caseta de popa
    for (const [f, len] of [[0.15, 9], [0.56, 10], [0.84, 8]]) { const t = box(9.6, 0.25, len, white, P(f, 0, DECK + 2.6), shipYaw); t.rotation.order = 'YXZ'; }
    box(6, 2.3, 7, white, P(0.8, 0, DECK + 1.15), shipYaw);
    for (const [f, sd] of [[0.15, 4.6], [0.15, -4.6], [0.56, 4.6], [0.56, -4.6], [0.84, 4.6], [0.84, -4.6]]) spar(0.06, 0.06, 2.5, white, P(f, sd, DECK + 1.3), new THREE.Euler());
    // la bandera argentina en la popa
    flagAt(P(1.0, 0, TOP), 6, shipYaw);
  } else if (F.style === 'piramide') {
    // Pirámide de Mayo: obelisco blanco de 18,76 m con la estatua de la Libertad
    const white = keep(lam({ color: 0xf3f1ea })), sp = new THREE.Vector3(...[pts.reduce((s, p) => s + p[0] / n, 0), 0, pts.reduce((s, p) => s + p[1] / n, 0)]);
    const at = (y) => new THREE.Vector3(sp.x, G + y, sp.z);
    box(6, 0.6, 6, white, at(0.3), 0); box(5, 0.6, 5, white, at(0.9), 0); box(3.6, 3.6, 3.6, white, at(3), 0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.65, 9.6, 4, 1), white); shaft.rotation.y = Math.PI / 4; shaft.position.copy(at(4.8 + 4.8)); grp.add(shaft);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1, 4), white); top.rotation.y = Math.PI / 4; top.position.copy(at(14.9)); grp.add(top);
    box(0.7, 2.2, 0.5, white, at(16.5), 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), white); head.position.copy(at(17.9)); grp.add(head);
    box(0.12, 1.2, 0.12, white, new THREE.Vector3(sp.x + 0.5, G + 18.2, sp.z), 0); box(1.2, 0.9, 0.3, white, at(15.9), 0);
    // los pañuelos blancos pintados alrededor (Madres de Plaza de Mayo)
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(32, 6); x.quadraticCurveTo(58, 20, 52, 50); x.quadraticCurveTo(32, 58, 12, 50); x.quadraticCurveTo(6, 20, 32, 6); x.fill();
    const tt = keep(new THREE.CanvasTexture(c)); const pm = keep(new THREE.MeshLambertMaterial({ map: tt, transparent: true, alphaTest: 0.4 }));
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, q = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), pm); q.rotation.set(-Math.PI / 2, 0, a); q.position.set(sp.x + Math.cos(a) * 7, G + 0.04, sp.z + Math.sin(a) * 7); grp.add(q); }
  }
  const xs = pts.map((q) => q[0]), zs = pts.map((q) => q[1]);
  return { grp, disp, bb: [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)] };
}

export function buildFacades(D, G, scene) {
  const items = [];
  for (const F of D.facades || []) {
    try { const it = buildOne(F, G + 1); scene.add(it.grp); items.push(it); } catch (err) { console.warn('fachada', F.style, err); }
  }
  return {
    update(p, far = 700, day = 1) {
      // distancia al borde más cercano del edificio
      for (const it of items) { const [x0, x1, z0, z1] = it.bb; it.grp.visible = Math.hypot(Math.max(x0 - p.pos.x, 0, p.pos.x - x1), Math.max(z0 - p.pos.z, 0, p.pos.z - z1)) < far; }
      for (const m of GLOW) m.emissiveIntensity = 0.3 * day;
    },
    dispose() { for (const it of items) { scene.remove(it.grp); it.grp.traverse((o) => o.geometry?.dispose()); for (const d of it.disp) d.dispose?.(); } },
  };
}
