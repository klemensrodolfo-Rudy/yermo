// Mundos reales (v14): el Obelisco con su forma real (se afina de 7 a 3,5 m y termina en punta),
// carteles con los nombres de las calles, los hitos modelados a mano y los lugares famosos marcados en el mapa.
import * as THREE from 'three';
import { GROUND } from './porteno.js';
import { getBA, isReal } from './badata.js';
import { buildHitos } from './hitos3d.js';

export function createBaires(ctx) {
  const { game: g } = ctx;
  const api = {};
  if (!isReal(g.meta.worldType)) { api.update = () => {}; api.dispose = () => {}; api.markers = () => []; return api; }
  const p = g.player, w = g.world, sim = g.sim, meta = g.meta;

  // ---------- el Obelisco ----------
  const y0 = GROUND + 2, H = 61, apex = 4.5, b = 3.5, t = 1.75, cx = 0.5, cz = 0.5;
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 1024;
    const x = c.getContext('2d');
    x.fillStyle = '#e9e3d6'; x.fillRect(0, 0, 64, 1024);
    // lajas: juntas horizontales cada ~2 m y verticales alternadas
    for (let i = 0; i < 1024; i += 16) {
      x.fillStyle = 'rgba(120,110,95,0.35)'; x.fillRect(0, i, 64, 1);
      const off = (i / 16) % 2 ? 0 : 16;
      for (let v = off; v < 64; v += 32) x.fillRect(v, i, 1, 16);
      x.fillStyle = `rgba(255,255,255,${0.05 + ((i * 7) % 5) / 60})`; x.fillRect(0, i + 1, 64, 15);
    }
    // manchas sutiles de lluvia
    for (let k = 0; k < 220; k++) { x.fillStyle = `rgba(90,80,70,${Math.random() * 0.05})`; x.fillRect(Math.random() * 64, Math.random() * 1024, 1 + Math.random() * 3, 6 + Math.random() * 40); }
    // ventanita arriba
    x.fillStyle = '#2a2a30'; x.fillRect(26, 22, 12, 18); x.fillStyle = '#6a7a88'; x.fillRect(28, 24, 8, 6);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    return tx;
  })();
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  const corners = (h) => { const r = b + (t - b) * (h / H); return [[-r, -r], [r, -r], [r, r], [-r, r]]; };
  const lo = corners(0), hi = corners(H);
  for (let f = 0; f < 4; f++) {
    const a = f, c2 = (f + 1) % 4, base = pos.length / 3;
    // fuste
    pos.push(cx + lo[a][0], y0, cz + lo[a][1], cx + lo[c2][0], y0, cz + lo[c2][1], cx + hi[c2][0], y0 + H, cz + hi[c2][1], cx + hi[a][0], y0 + H, cz + hi[a][1]);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    // punta
    const pb = pos.length / 3;
    pos.push(cx + hi[a][0], y0 + H, cz + hi[a][1], cx + hi[c2][0], y0 + H, cz + hi[c2][1], cx, y0 + H + apex, cz);
    uv.push(0, 0.96, 1, 0.96, 0.5, 1);
    idx.push(pb, pb + 2, pb + 1);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, emissive: new THREE.Color(0xfff2d8), emissiveIntensity: 0 });
  const obe = new THREE.Mesh(geo, mat);
  // la puerta (sólo una, sobre el lado sur)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.08), new THREE.MeshLambertMaterial({ color: 0x3a3226 }));
  door.position.set(cx, y0 + 1.2, cz + b + 0.02);
  const grp = new THREE.Group(); grp.add(obe, door);
  if (getBA()?.region === 'ba') ctx.scene.add(grp);

  // ---------- carteles con los nombres de las calles ----------
  // En cada esquina, un poste negro con una placa por calle (negra con letras blancas, como los de la ciudad),
  // paralela a la calle que nombra. Se arman sólo los que están cerca.
  const D = getBA();
  const hitos = D ? buildHitos(D, GROUND, ctx.scene) : null;
  const SIGNS = D?.signs2 || [];
  const short = (n) => n.toUpperCase().replace(/^AVENIDA /, 'AV. ').replace(/^PASAJE /, 'PJE. ').replace(/^DIAGONAL /, 'DIAG. ');
  const plateTex = new Map();
  function texFor(name) {
    if (plateTex.has(name)) return plateTex.get(name);
    const txt = short(name), c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = '#16181b'; x.fillRect(0, 0, 512, 96);
    x.strokeStyle = '#e8e8e8'; x.lineWidth = 4; x.strokeRect(7, 7, 498, 82);
    let fs = 54; x.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
    while (x.measureText(txt).width > 470 && fs > 22) { fs -= 2; x.font = `bold ${fs}px Arial, Helvetica, sans-serif`; }
    x.fillStyle = '#f4f4f4'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.MeshLambertMaterial({ map: t });
    plateTex.set(name, m); return m;
  }
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 1, 6), poleMat = new THREE.MeshLambertMaterial({ color: 0x1b1d20 });
  const plateGeo = new THREE.BoxGeometry(1.9, 0.36, 0.04), edgeMat = new THREE.MeshLambertMaterial({ color: 0x16181b });
  const signGrp = new THREE.Group(); ctx.scene.add(signGrp);
  const built = new Map();
  let lastX = 1e9, lastZ = 1e9, acc = 0;
  function makeSign([x, z, plates]) {
    const s = new THREE.Group(); s.position.set(x + 0.5, GROUND + 1, z + 0.5);
    // las placas van apiladas arriba del poste, que termina debajo de la última
    const top = 3.1, step = 0.37, low = top - (plates.length - 1) * step - 0.18;
    const pole = new THREE.Mesh(poleGeo, poleMat); pole.scale.y = low; pole.position.y = low / 2; s.add(pole);
    plates.forEach(([name, ang], k) => {
      const m = tf(name), pl = new THREE.Mesh(plateGeo, [edgeMat, edgeMat, edgeMat, edgeMat, m, m]);
      pl.position.y = top - k * step; pl.rotation.y = -ang; s.add(pl);
    });
    return s;
  }
  const tf = texFor;
  function refreshSigns() {
    if (Math.hypot(p.pos.x - lastX, p.pos.z - lastZ) < 12) return;
    lastX = p.pos.x; lastZ = p.pos.z;
    const R = 140;
    for (let i = 0; i < SIGNS.length; i++) {
      const sg = SIGNS[i], near = Math.abs(sg[0] - p.pos.x) < R && Math.abs(sg[1] - p.pos.z) < R;
      if (near && !built.has(i)) { const o = makeSign(sg); built.set(i, o); signGrp.add(o); }
      else if (!near && built.has(i)) { signGrp.remove(built.get(i)); built.delete(i); }
    }
  }

  // ---------- lugares en el mapa ----------
  const POIS = [['🗼 Obelisco', 0, 0], ...(D?.pois || []).filter((q) => !/obelisco/i.test(q[2])).map(([x, z, n]) => [n, x, z])];
  api.markers = () => POIS.filter(([, x, z]) => Math.hypot(x - p.pos.x, z - p.pos.z) < 900).map(([label, x, z]) => ({ x, z, color: '#74b8ff', kind: 'poi', label, cat: 'lugares' }));

  api.update = (dt) => {
    acc += dt; if (acc > 0.5) { acc = 0; refreshSigns(); }
    // de noche, el Obelisco iluminado por los reflectores
    const night = 1 - Math.min(1, Math.max(0, (ctx.uniforms.daylight.value - 0.2) / 0.4));
    mat.emissiveIntensity = 0.28 + night * 0.45;
    grp.visible = Math.hypot(p.pos.x, p.pos.z) < 900;
    hitos?.update(p, w.renderDist * 16 * 0.85);
  };
  api.dispose = () => { hitos?.dispose(); ctx.scene.remove(signGrp); poleGeo.dispose(); poleMat.dispose(); plateGeo.dispose(); edgeMat.dispose(); for (const m of plateTex.values()) { m.map.dispose(); m.dispose(); } ctx.scene.remove(grp); geo.dispose(); mat.dispose(); tex.dispose(); door.geometry.dispose(); door.material.dispose(); };
  return api;
}
