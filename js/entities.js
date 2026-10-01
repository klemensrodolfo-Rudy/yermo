// Criaturas: modelos de cajas, IA simple, aparición y combate.
import * as THREE from 'three';
import { SOLID, OPAQUE, SEA, TORCHES, LIQ, isWater, collBox, BLOCKS as BLOCKS_REF } from './blocks.js';
import { BIOME } from './worldgen.js';
import { mulberry32 } from './noise.js';

export const ELDRA_MOBS = ['orc', 'troll', 'spider', 'warg', 'ent', 'dragon', 'horse', 'robot'];
export const ZOO_ANIMALS = ['lion', 'giraffe', 'elephant', 'zebra', 'gorilla', 'bear', 'crocodile', 'ostrich', 'kangaroo', 'flamingo', 'penguin', 'hippo', 'snake', 'monkey', 'rhino'];
export const MOB_TYPES = {
  boar: {
    name: 'Jabalí mutante', hp: 10, hw: 0.45, h: 0.95, speed: 2.2, flee: 4.8, hostile: false,
    drops: [[271, 1, 3, 1]],
  },
  ghoul: {
    name: 'Necrófago', hp: 18, hw: 0.3, h: 1.9, speed: 3.3, hostile: true, range: 18, dmg: 3, rad: 0,
    drops: [[258, 1, 2, 0.5], [273, 1, 1, 0.12]],
  },
  scorpion: {
    name: 'Escorpión radiactivo', animal: true, hp: 12, hw: 0.5, h: 0.65, speed: 4.1, hostile: true, range: 12, dmg: 2, rad: 12,
    drops: [[261, 1, 1, 0.35], [271, 1, 1, 0.5]],
  },
  rat: {
    name: 'Rata gigante', animal: true, hp: 5, hw: 0.3, h: 0.5, speed: 4.6, hostile: true, range: 12, dmg: 1, rad: 2,
    drops: [[271, 1, 1, 0.4]],
  },
  crow: {
    name: 'Cuervo mutante', animal: true, hp: 6, hw: 0.35, h: 0.5, speed: 6.5, hostile: true, range: 16, dmg: 2, rad: 0, fly: true,
    drops: [[314, 1, 2, 0.85]],
  },
  trader: { name: 'Comerciante errante', hp: 40, hw: 0.3, h: 1.9, speed: 1.4, hostile: false, npc: 'trader', drops: [] },
  settler: { name: 'Superviviente', hp: 20, hw: 0.3, h: 1.9, speed: 1.6, hostile: false, npc: 'settler', drops: [], stay: true },
  leader: { name: 'Líder del asentamiento', hp: 60, hw: 0.3, h: 1.9, speed: 1.2, hostile: false, npc: 'leader', drops: [], stay: true },
  instructor: { name: 'Instructor de manejo', hp: 60, hw: 0.3, h: 1.9, speed: 1.2, hostile: false, npc: 'instructor', drops: [], stay: true },
  dog: { name: 'Perro del yermo', hp: 14, hw: 0.3, h: 0.8, speed: 5, flee: 5, hostile: false, pet: true, dmg: 3, drops: [[271, 1, 1, 0.5]] },
  shroom: { name: 'Hongo andante', animal: true, hp: 14, hw: 0.4, h: 1.4, speed: 1.8, hostile: true, range: 10, dmg: 2, rad: 0, poison: true, drops: [[327, 1, 3, 1]] },
  wolf: { name: 'Lobo irradiado', animal: true, hp: 12, hw: 0.35, h: 0.9, speed: 5.2, hostile: true, range: 16, dmg: 3, rad: 3, drops: [[336, 1, 2, 0.8], [271, 1, 1, 0.5]] },
  ratqueen: { name: 'Reina de las ratas', hp: 90, hw: 0.7, h: 1.2, speed: 3.5, hostile: true, range: 20, dmg: 4, rad: 4, boss: true, summon: 'rat',
    drops: [[260, 2, 4, 1], [347, 1, 1, 0.5], [346, 1, 1, 0.4], [306, 1, 2, 1]] },
  leviathan: { name: 'Leviatán tóxico', hp: 120, hw: 1, h: 1.6, speed: 3, hostile: true, range: 22, dmg: 6, rad: 15, boss: true, knock: 2,
    drops: [[261, 3, 6, 1], [313, 1, 1, 1], [349, 1, 1, 0.5], [351, 1, 1, 0.5]] },
  alpha: { name: 'Mutante alfa', hp: 130, hw: 0.6, h: 2.4, speed: 3.2, hostile: true, range: 24, dmg: 6, rad: 6, boss: true, knock: 1.8,
    drops: [[313, 1, 1, 1], [351, 1, 1, 0.8], [346, 1, 1, 0.8], [330, 2, 3, 1], [309, 1, 1, 0.5]] },
  // v8: animales del bioparque (y algunos sueltos por el mundo)
  lion: { name: 'León mutante', animal: true, hp: 32, hw: 0.5, h: 1.5, speed: 5.2, hostile: true, range: 20, dmg: 4, rad: 0, knock: 1.4, drops: [[271, 2, 3, 1], [336, 1, 2, 0.8]] },
  giraffe: { name: 'Jirafa', hp: 30, hw: 0.5, h: 4.2, speed: 3, flee: 6, hostile: false, drops: [[271, 2, 4, 1]] },
  elephant: { name: 'Elefante', animal: true, hp: 90, hw: 1.1, h: 3, speed: 2.6, hostile: true, neutral: true, range: 16, dmg: 7, rad: 0, knock: 2.6, drops: [[271, 4, 7, 1], [336, 2, 3, 1]] },
  zebra: { name: 'Cebra', hp: 18, hw: 0.4, h: 1.8, speed: 3.2, flee: 6.5, hostile: false, drops: [[271, 1, 2, 1], [336, 1, 1, 0.6]] },
  gorilla: { name: 'Gorila', animal: true, hp: 45, hw: 0.55, h: 2, speed: 3.6, hostile: true, neutral: true, range: 14, dmg: 5, rad: 0, knock: 1.8, drops: [[271, 1, 2, 1]] },
  bear: { name: 'Oso irradiado', animal: true, hp: 40, hw: 0.55, h: 1.6, speed: 4.2, hostile: true, range: 12, dmg: 5, rad: 2, knock: 1.5, drops: [[271, 2, 3, 1], [336, 1, 2, 0.9]] },
  crocodile: { name: 'Cocodrilo', animal: true, hp: 30, hw: 0.5, h: 0.7, speed: 2.8, hostile: true, range: 10, dmg: 5, rad: 0, drops: [[271, 1, 3, 1], [336, 1, 2, 0.7]] },
  ostrich: { name: 'Avestruz', hp: 14, hw: 0.4, h: 2.6, speed: 3.5, flee: 8, hostile: false, drops: [[271, 1, 2, 1], [314, 2, 4, 1]] },
  kangaroo: { name: 'Canguro', animal: true, hp: 20, hw: 0.4, h: 1.7, speed: 4.2, hostile: true, neutral: true, range: 10, dmg: 3, rad: 0, knock: 2.2, drops: [[271, 1, 2, 1], [336, 1, 1, 0.6]] },
  flamingo: { name: 'Flamenco', hp: 8, hw: 0.3, h: 1.8, speed: 2, flee: 4.5, hostile: false, drops: [[314, 1, 3, 1]] },
  penguin: { name: 'Pingüino', hp: 8, hw: 0.3, h: 1.1, speed: 1.6, flee: 2.5, hostile: false, drops: [[271, 1, 1, 0.6], [314, 1, 2, 0.8]] },
  hippo: { name: 'Hipopótamo', animal: true, hp: 70, hw: 0.8, h: 1.6, speed: 3, hostile: true, neutral: true, range: 12, dmg: 7, rad: 0, knock: 2.4, drops: [[271, 3, 5, 1], [336, 1, 2, 1]] },
  pigeon: { name: 'Paloma', hp: 2, hw: 0.2, h: 0.35, speed: 1.6, flee: 3, hostile: false, drops: [[314, 1, 1, 0.5]] },
  lizard: { name: 'Lagartija', hp: 4, hw: 0.2, h: 0.2, speed: 4.6, flee: 6, hostile: false, drops: [[271, 1, 1, 0.3]] },
  goat: { name: 'Cabra montés', hp: 12, hw: 0.35, h: 1.15, speed: 2.6, flee: 5, hostile: false, drops: [[271, 1, 2, 1], [336, 1, 1, 0.5]] },
  bat: { name: 'Murciélago', hp: 3, hw: 0.2, h: 0.3, speed: 5, flee: 6, hostile: false, fly: true, caveFly: true, drops: [] },
  snake: { name: 'Serpiente', animal: true, hp: 6, hw: 0.25, h: 0.3, speed: 2.8, hostile: true, range: 8, dmg: 2, rad: 0, poison: true, drops: [[271, 1, 1, 0.3]] },
  monkey: { name: 'Mono', hp: 10, hw: 0.25, h: 1, speed: 5, flee: 6, hostile: false, drops: [[271, 1, 1, 0.5]] },
  rhino: { name: 'Rinoceronte', animal: true, hp: 80, hw: 0.7, h: 1.8, speed: 3, charge: 7.5, hostile: true, neutral: true, range: 18, dmg: 8, rad: 0, knock: 3, drops: [[271, 3, 5, 1], [336, 2, 3, 1]] },
  // v9: Reinos de Eldra
  orc: { name: 'Orco', hp: 22, hw: 0.32, h: 1.9, speed: 3.4, hostile: true, range: 18, dmg: 3, rad: 0, drops: [[271, 1, 1, 0.4], [353, 1, 3, 0.6], [381, 1, 1, 0.03]] },
  troll: { name: 'Troll de las cavernas', hp: 70, hw: 0.7, h: 3, speed: 2.4, hostile: true, range: 16, dmg: 7, rad: 0, knock: 2.5, stoneInSun: true, drops: [[353, 3, 8, 1], [387, 1, 2, 0.5]] },
  spider: { name: 'Araña gigante', animal: true, hp: 18, hw: 0.7, h: 0.9, speed: 4.2, hostile: true, range: 14, dmg: 3, rad: 0, poison: true, drops: [[336, 1, 1, 0.3], [271, 1, 1, 0.3]] },
  warg: { name: 'Huargo', animal: true, hp: 24, hw: 0.5, h: 1.2, speed: 5.6, hostile: true, range: 20, dmg: 4, rad: 0, drops: [[271, 1, 2, 1], [336, 1, 2, 0.7]] },
  ent: { name: 'Ent', hp: 120, hw: 0.8, h: 4, speed: 1.8, hostile: true, neutral: true, range: 14, dmg: 8, rad: 0, knock: 3, drops: [[222, 4, 8, 1], [380, 2, 4, 1], [385, 2, 5, 1]] },
  dragon: { name: 'Dragón de Brasa', hp: 320, hw: 1.5, h: 3, speed: 4, hostile: true, range: 42, dmg: 8, rad: 0, boss: true, fly: true, knock: 2.5, ranged: { cd: 3.2, range: 30, acc: 0.65, dmg: 6, fire: true },
    drops: [[388, 4, 8, 1], [353, 40, 80, 1], [218, 4, 8, 1], [386, 1, 1, 1]] },
  horse: { name: 'Caballo', hp: 20, hw: 0.45, h: 1.9, speed: 3.4, flee: 7, hostile: false, drops: [[271, 1, 2, 1], [336, 1, 1, 0.6]] },
  elf: { name: 'Elfa de Lunaria', hp: 40, hw: 0.3, h: 2, speed: 1.6, hostile: false, npc: 'elf', drops: [] },
  dwarf: { name: 'Enano de Hierroalto', hp: 50, hw: 0.32, h: 1.45, speed: 1.4, hostile: false, npc: 'dwarf', drops: [], stay: true },
  halfling: { name: 'Mediano', hp: 20, hw: 0.28, h: 1.3, speed: 1.6, hostile: false, npc: 'halfling', drops: [], stay: true },
  robot: { name: 'Profe Robi', hp: 100, hw: 0.32, h: 1.6, speed: 1.2, hostile: false, npc: 'robot', drops: [], stay: true },
  mage: { name: 'Mago de la torre', hp: 80, hw: 0.3, h: 2, speed: 1.1, hostile: false, npc: 'mage', drops: [], stay: true },
  // v6: humanos armados, empleados y el guardián del abismo
  bandit: { name: 'Bandido', hp: 22, hw: 0.3, h: 1.9, speed: 3.4, hostile: true, range: 24, dmg: 2, rad: 0, human: 'bandit', ranged: { cd: 1.8, range: 16, acc: 0.5, dmg: 3 },
    drops: [[353, 1, 4, 0.8], [332, 2, 6, 0.5], [258, 1, 3, 0.5], [271, 1, 1, 0.3]] },
  pirate: { name: 'Pirata de chatarra', hp: 20, hw: 0.3, h: 1.9, speed: 3.2, hostile: true, range: 22, dmg: 2, rad: 0, human: 'pirate', ranged: { cd: 2.2, range: 14, acc: 0.45, dmg: 3 },
    drops: [[353, 2, 6, 0.8], [258, 2, 5, 0.7], [259, 1, 2, 0.3], [296, 1, 1, 0.15]] },
  soldier: { name: 'Soldado renegado', hp: 34, hw: 0.3, h: 1.9, speed: 3.0, hostile: true, range: 26, dmg: 3, rad: 0, human: 'soldier', ranged: { cd: 1.2, range: 20, acc: 0.55, dmg: 3 },
    drops: [[332, 4, 10, 0.8], [358, 1, 1, 0.25], [353, 2, 5, 0.6], [301, 1, 1, 0.05]] },
  worker: { name: 'Empleado', hp: 30, hw: 0.3, h: 1.9, speed: 1.8, hostile: false, npc: 'worker', drops: [], stay: true },
  guardian: { name: 'Guardián del abismo', hp: 240, hw: 0.8, h: 3.0, speed: 3.1, hostile: true, range: 30, dmg: 7, rad: 5, boss: true, knock: 2, summon: 'ghoul',
    drops: [[313, 1, 2, 1], [353, 20, 40, 1], [366, 1, 1, 0.5], [351, 1, 1, 1], [306, 2, 3, 1]] },
  behemoth: {
    name: 'Behemot', hp: 160, hw: 0.8, h: 3.3, speed: 2.5, hostile: true, range: 26, dmg: 7, rad: 8, boss: true, knock: 2.2,
    drops: [[313, 1, 1, 1], [260, 3, 6, 1], [261, 2, 4, 1], [308, 1, 1, 0.5], [311, 1, 1, 0.45], [310, 1, 1, 0.3]],
  },
};

// patrones en escala de grises que multiplican el color de cada pieza (se repiten según el tamaño de la caja)
const PATTERNS = {};
export function patternTex(name) {
  if (PATTERNS[name]) return PATTERNS[name];
  const S = 32, c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
  let h = 7; for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  const rnd = mulberry32(h);
  const lat = Array.from({ length: 64 }, () => rnd());
  const vn = (x, y, p) => { // ruido de valor tileable con período p
    const cs = S / p, fx = x / cs, fy = y / cs, ix = Math.floor(fx), iy = Math.floor(fy); let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const g = (a, b) => lat[((((b % p) + p) % p) * p + (((a % p) + p) % p)) % 64];
    return (g(ix, iy) * (1 - tx) + g(ix + 1, iy) * tx) * (1 - ty) + (g(ix, iy + 1) * (1 - tx) + g(ix + 1, iy + 1) * tx) * ty;
  };
  const cell = (x, y, p) => { // distancia a puntos tileables
    let f1 = 9, f2 = 9; const cs = S / p;
    for (let j = -1; j <= p; j++) for (let i = -1; i <= p; i++) { const k = (((j % p) + p) % p) * p + (((i % p) + p) % p); const px = (i + 0.2 + lat[k % 64] * 0.6) * cs, py = (j + 0.2 + lat[(k * 7 + 3) % 64] * 0.6) * cs; const d = Math.hypot(x - px, y - py); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
    return [f1 / cs, f2 / cs];
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 1;
    const r = rnd();
    switch (name) {
      case 'fur': v = 0.8 + 0.12 * vn(x, Math.floor(y / 3) * 3 + x * 0.3, 8) + 0.1 * (lat[(x * 5 + Math.floor((y + x * 3) / 4)) % 64]) - (r < 0.05 ? 0.12 : 0); break;
      case 'shortfur': v = 0.84 + 0.1 * vn(x, y, 8) + 0.06 * r; break;
      case 'skin': v = 0.84 + 0.12 * vn(x, y, 4) + 0.04 * r - (r < 0.03 ? 0.08 : 0); break;
      case 'wrinkle': v = 0.86 + 0.08 * vn(x, y, 4) - (Math.sin(y * 1.1 + Math.sin(x * 0.4) * 2.2) > 0.88 ? 0.2 : 0) + 0.04 * r; break;
      case 'scales': { const sx = (x + (Math.floor(y / 5) % 2) * 3) % 6, sy = y % 5; const e = Math.min(sx, 6 - sx, sy * 1.2); v = 0.62 + Math.min(1, e / 2.2) * 0.3 + 0.06 * r; break; }
      case 'feather': { const fx = x % 8 - 4; const row = (y + Math.abs(fx) * 0.8) % 7; v = 0.94 - (row < 1 ? 0.22 : row < 2 ? 0.08 : 0) + 0.05 * r; break; }
      case 'shell': v = 0.86 + 0.08 * vn(x, y, 4) - (y % 8 === 0 ? 0.25 : 0) + 0.05 * r; break;
      case 'cloth': v = 0.88 + ((x + y) % 2 ? 0.05 : 0) - (x % 16 === 15 ? 0.18 : 0) + 0.04 * vn(x, y, 8); break;
      case 'denim': v = 0.82 + (((x + 2 * y) % 4) < 2 ? 0.1 : 0) + 0.06 * r; break;
      case 'zebra': v = Math.sin(x * 0.62 + Math.sin(y * 0.25) * 1.6) > 0.05 ? 1 : 0.13; break;
      case 'giraffe': { const [f1, f2] = cell(x, y, 2); v = f2 - f1 < 0.16 + 0.05 * vn(x, y, 8) ? 1 : 0.52 + 0.1 * vn(x, y, 4) + 0.05 * r; break; }
      default: v = 0.9 + 0.1 * r;
    }
    const g = Math.max(0, Math.min(255, Math.round(v * 255))), i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (PATTERNS[name] = t);
}
// repetir la textura según el tamaño de cada cara (misma densidad en piezas grandes y chicas)
export function scaleBoxUV(g, w, h, d, k = 2.2) {
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0] * k, uv.getY(j) * dims[f][1] * k); }
}
const box = (w, h, d, mat, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); if (mat.map) scaleBoxUV(g, w, h, d); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return m; };
// patrón de cada criatura
const MODEL_PAT = {
  boar: 'fur', ghoul: 'skin', rat: 'fur', crow: 'feather', behemoth: 'wrinkle', dog: 'fur', shroom: 'skin', wolf: 'fur', ratqueen: 'fur', leviathan: 'scales',
  alpha: 'skin', guardian: 'skin', scorpion: 'shell', orc: 'skin', troll: 'wrinkle', spider: 'fur', warg: 'fur', ent: 'shell', dragon: 'scales', horse: 'shortfur', lion: 'fur', giraffe: 'giraffe', elephant: 'wrinkle', zebra: 'zebra', gorilla: 'fur', bear: 'fur',
  lizard: 'scales', goat: 'shortfur', bat: 'fur', pigeon: 'feather',
  crocodile: 'scales', ostrich: 'feather', kangaroo: 'shortfur', flamingo: 'feather', penguin: 'feather', hippo: 'wrinkle', snake: 'scales', monkey: 'fur', rhino: 'wrinkle',
};

function buildModel(type) {
  const g = new THREE.Group();
  const mats = [];
  const defPat = MODEL_PAT[type] ?? (MOB_TYPES[type]?.npc || MOB_TYPES[type]?.human ? 'cloth' : 'skin');
  // pat: patrón de textura (null = liso). Las piezas que brillan no llevan textura
  const M = (c, glow = false, pat = defPat) => {
    const m = new THREE.MeshBasicMaterial({ color: c, map: glow || !pat ? null : patternTex(pat) });
    m.userData = { base: new THREE.Color(c).multiplyScalar(m.map ? 1.14 : 1), glow }; mats.push(m); return m;
  };
  const parts = {};
  if (type === 'boar') {
    const skin = M(0x6b4a3a), dark = M(0x4a3228), tusk = M(0xe8e0c8), pus = M(0x9cff3a, true);
    g.add(box(0.8, 0.55, 1.15, skin, 0, 0.62, 0));
    g.add(box(0.5, 0.2, 0.9, dark, 0, 0.95, -0.05)); // cresta
    const head = new THREE.Group(); head.position.set(0, 0.62, -0.7);
    head.add(box(0.5, 0.45, 0.45, skin, 0, 0, 0));
    head.add(box(0.3, 0.22, 0.12, dark, 0, -0.08, -0.26));
    head.add(box(0.06, 0.18, 0.06, tusk, 0.18, -0.02, -0.28));
    head.add(box(0.06, 0.18, 0.06, tusk, -0.18, -0.02, -0.28));
    g.add(head); parts.head = head;
    g.add(box(0.14, 0.14, 0.14, pus, 0.36, 0.72, 0.2));
    g.add(box(0.12, 0.12, 0.12, pus, -0.3, 0.8, -0.25));
    parts.legs = [];
    for (const [x, z] of [[0.25, -0.4], [-0.25, -0.4], [0.25, 0.4], [-0.25, 0.4]]) {
      const l = new THREE.Group(); l.position.set(x, 0.38, z); l.add(box(0.18, 0.38, 0.18, dark, 0, -0.19, 0)); g.add(l); parts.legs.push(l);
    }
  } else if (type === 'ghoul') {
    const skin = M(0x8f9680), rag = M(0x4c5244), rag2 = M(0x3a3430), eye = M(0xffd84a, true);
    parts.legs = [];
    for (const x of [0.14, -0.14]) { const l = new THREE.Group(); l.position.set(x, 0.8, 0); l.add(box(0.24, 0.8, 0.24, rag2, 0, -0.4, 0)); g.add(l); parts.legs.push(l); }
    g.add(box(0.55, 0.7, 0.3, rag, 0, 1.15, 0));
    g.add(box(0.2, 0.3, 0.32, skin, 0.1, 1.0, 0.01));
    parts.arms = [];
    for (const x of [0.37, -0.37]) {
      const a = new THREE.Group(); a.position.set(x, 1.42, 0); a.add(box(0.18, 0.72, 0.18, skin, 0, -0.33, 0)); a.rotation.x = -1.35; g.add(a); parts.arms.push(a);
    }
    const head = new THREE.Group(); head.position.set(0, 1.72, 0);
    head.add(box(0.44, 0.44, 0.44, skin, 0, 0, 0));
    head.add(box(0.1, 0.06, 0.02, eye, 0.1, 0.03, -0.23));
    head.add(box(0.1, 0.06, 0.02, eye, -0.1, 0.03, -0.23));
    head.add(box(0.22, 0.06, 0.02, rag2, 0, -0.12, -0.23));
    g.add(head); parts.head = head;
  } else if (type === 'rat') {
    const fur = M(0x5a5048), dark = M(0x3a3430), pink = M(0xc08a8a), eye = M(0xff3a2a, true);
    g.add(box(0.36, 0.28, 0.62, fur, 0, 0.3, 0));
    const head = new THREE.Group(); head.position.set(0, 0.34, -0.4);
    head.add(box(0.24, 0.22, 0.28, fur, 0, 0, 0)); head.add(box(0.1, 0.08, 0.1, pink, 0, -0.03, -0.17));
    head.add(box(0.05, 0.05, 0.02, eye, 0.07, 0.05, -0.14)); head.add(box(0.05, 0.05, 0.02, eye, -0.07, 0.05, -0.14));
    head.add(box(0.08, 0.1, 0.04, pink, 0.1, 0.13, 0.02)); head.add(box(0.08, 0.1, 0.04, pink, -0.1, 0.13, 0.02));
    g.add(head); parts.head = head;
    const tail = new THREE.Group(); tail.position.set(0, 0.3, 0.31); tail.add(box(0.05, 0.05, 0.55, pink, 0, 0, 0.27)); g.add(tail); parts.tail = tail;
    parts.legs = [];
    for (const [x, z] of [[0.14, -0.2], [-0.14, -0.2], [0.14, 0.2], [-0.14, 0.2]]) { const l = new THREE.Group(); l.position.set(x, 0.18, z); l.add(box(0.08, 0.18, 0.08, dark, 0, -0.09, 0)); g.add(l); parts.legs.push(l); }
  } else if (type === 'crow' || type === 'pigeon') {
    const pg = type === 'pigeon', black = M(pg ? 0x8a8e98 : 0x1a1a20), beak = M(pg ? 0x3a3a3a : 0xc8a030), eye = M(pg ? 0xff8a3a : 0x9cff3a, !pg);
    g.add(box(0.3, 0.26, 0.5, black, 0, 0.25, 0));
    const head = new THREE.Group(); head.position.set(0, 0.36, -0.3);
    head.add(box(0.2, 0.2, 0.2, black, 0, 0, 0)); head.add(box(0.06, 0.06, 0.16, beak, 0, -0.02, -0.16));
    head.add(box(0.04, 0.04, 0.02, eye, 0.07, 0.04, -0.1)); head.add(box(0.04, 0.04, 0.02, eye, -0.07, 0.04, -0.1));
    g.add(head); parts.head = head;
    g.add(box(0.2, 0.05, 0.25, black, 0, 0.27, 0.35));
    parts.wings = [];
    for (const sx of [1, -1]) { const wg = new THREE.Group(); wg.position.set(0.15 * sx, 0.32, 0); wg.add(box(0.6, 0.04, 0.32, black, 0.3 * sx, 0, 0)); g.add(wg); parts.wings.push(wg); }
  } else if (type === 'behemoth') {
    const skin = M(0x6a5a4a), dark = M(0x3a3028), pus = M(0x9cff3a, true), eye = M(0xff5a1a, true), bone = M(0xd8d0c0);
    parts.legs = [];
    for (const x of [0.35, -0.35]) { const l = new THREE.Group(); l.position.set(x, 1.3, 0); l.add(box(0.55, 1.3, 0.55, dark, 0, -0.65, 0)); g.add(l); parts.legs.push(l); }
    g.add(box(1.4, 1.2, 0.9, skin, 0, 1.9, 0));
    g.add(box(1.1, 0.4, 0.7, skin, 0, 2.6, 0.05));
    for (const [x, y, z] of [[0.5, 2.2, -0.46], [-0.3, 1.7, -0.46], [0.2, 2.5, 0.4], [-0.6, 2.1, 0.3]]) g.add(box(0.2, 0.2, 0.08, pus, x, y, z));
    for (const x of [0.4, -0.4]) g.add(box(0.12, 0.35, 0.12, bone, x, 2.95, 0.1));
    parts.arms = [];
    for (const x of [0.95, -0.95]) { const a = new THREE.Group(); a.position.set(x, 2.45, 0); a.add(box(0.45, 1.5, 0.45, skin, 0, -0.7, 0)); a.add(box(0.5, 0.3, 0.5, dark, 0, -1.45, 0)); a.rotation.x = -0.6; g.add(a); parts.arms.push(a); }
    const head = new THREE.Group(); head.position.set(0, 2.75, -0.35);
    head.add(box(0.7, 0.6, 0.6, skin, 0, 0, 0));
    head.add(box(0.14, 0.1, 0.02, eye, 0.17, 0.05, -0.31)); head.add(box(0.14, 0.1, 0.02, eye, -0.17, 0.05, -0.31));
    head.add(box(0.5, 0.12, 0.04, bone, 0, -0.18, -0.31));
    g.add(head); parts.head = head;
  } else if (V12_ANIMALS.includes(type)) {
    buildV12Animal(type, g, parts, M);
  } else if (ZOO_ANIMALS.includes(type)) {
    buildZooAnimal(type, g, parts, M);
  } else if (ELDRA_MOBS.includes(type)) {
    buildEldraMob(type, g, parts, M);
  } else if (MOB_TYPES[type].npc || MOB_TYPES[type].human) {
    // personas: ropa según el oficio
    const outfit = { trader: [0x6a4a8a, 0xd8a040], settler: [0x5a6a4a, 0x8a6a4a], leader: [0x8a2a24, 0xe0c23a], instructor: [0xe8e8e8, 0xc8302a], worker: [0x3a5a8a, 0xe0a030],
      elf: [0x4a7a5a, 0xd8d0a0], dwarf: [0x7a4a2a, 0x9a9aa0], halfling: [0x8a6a3a, 0x4a7a3a], mage: [0x34346a, 0xd8d8e0],
      bandit: [0x4a3020, 0x8a1a1a], pirate: [0x2a3a5a, 0xd8d0c0], soldier: [0x4a5a3a, 0x2a3024] }[MOB_TYPES[type].npc || MOB_TYPES[type].human];
    const jacket = M(outfit[0]), trim = M(outfit[1]), pants = M(0x3a3530, false, 'denim'), skin = M(0xb08a6a, false, 'skin'), hair = M(0x3a2a1a, false, 'fur');
    parts.legs = [];
    for (const x of [0.13, -0.13]) { const l = new THREE.Group(); l.position.set(x, 0.75, 0); l.add(box(0.24, 0.75, 0.24, pants, 0, -0.375, 0)); g.add(l); parts.legs.push(l); }
    g.add(box(0.52, 0.72, 0.28, jacket, 0, 1.11, 0));
    g.add(box(0.54, 0.1, 0.3, trim, 0, 0.8, 0));
    parts.arms = [];
    for (const x of [0.36, -0.36]) { const a = new THREE.Group(); a.position.set(x, 1.44, 0); a.add(box(0.18, 0.7, 0.18, jacket, 0, -0.33, 0)); g.add(a); parts.arms.push(a); }
    parts.armsRelaxed = !MOB_TYPES[type].human;
    if (MOB_TYPES[type].human) parts.arms[0].add(box(0.1, 0.12, 0.6, M(0x1a1a1a), 0, -0.62, -0.2)); // arma
    const head = new THREE.Group(); head.position.set(0, 1.65, 0);
    head.add(box(0.44, 0.44, 0.44, skin, 0, 0.1, 0)); head.add(box(0.46, 0.12, 0.46, hair, 0, 0.3, 0.02));
    if (type === 'trader') { head.add(box(0.6, 0.06, 0.6, trim, 0, 0.36, 0)); head.add(box(0.36, 0.2, 0.36, trim, 0, 0.46, 0)); g.add(box(0.4, 0.5, 0.25, M(0x6a4a2a), 0, 1.15, 0.26)); }
    if (type === 'instructor') { head.add(box(0.48, 0.22, 0.48, trim, 0, 0.3, 0)); head.add(box(0.3, 0.05, 0.2, trim, 0, 0.2, -0.3)); }
    if (type === 'leader') { head.add(box(0.1, 0.18, 0.1, trim, 0.12, 0.42, 0)); head.add(box(0.1, 0.18, 0.1, trim, -0.12, 0.42, 0)); }
    if (type === 'bandit') head.add(box(0.46, 0.16, 0.08, trim, 0, 0.0, -0.22)); // pañuelo
    if (type === 'pirate') { head.add(box(0.5, 0.12, 0.5, trim, 0, 0.36, 0)); head.add(box(0.12, 0.1, 0.02, M(0x1a1a1a), 0.1, 0.12, -0.24)); }
    if (type === 'soldier') { head.add(box(0.5, 0.16, 0.5, trim, 0, 0.36, 0)); g.add(box(0.56, 0.5, 0.34, trim, 0, 1.15, 0)); }
    if (type === 'worker') head.add(box(0.48, 0.14, 0.48, trim, 0, 0.36, 0));
    if (type === 'elf') { head.add(box(0.08, 0.2, 0.06, skin, 0.25, 0.2, 0)); head.add(box(0.08, 0.2, 0.06, skin, -0.25, 0.2, 0)); head.add(box(0.48, 0.5, 0.2, M(0xe0d0a0, false, 'fur'), 0, 0.05, 0.22)); g.scale.set(0.95, 1.08, 0.95); }
    if (type === 'dwarf') { head.add(box(0.46, 0.4, 0.14, M(0xb06a3a, false, 'fur'), 0, -0.12, -0.24)); head.add(box(0.5, 0.16, 0.5, trim, 0, 0.36, 0)); g.scale.set(1.15, 0.78, 1.15); }
    if (type === 'halfling') { head.add(box(0.48, 0.16, 0.48, M(0x6a4a2a, false, 'fur'), 0, 0.33, 0)); g.scale.set(0.85, 0.7, 0.85); }
    if (type === 'mage') { head.add(box(0.6, 0.06, 0.6, jacket, 0, 0.34, 0)); head.add(box(0.38, 0.22, 0.38, jacket, 0, 0.47, 0)); head.add(box(0.2, 0.22, 0.2, jacket, 0, 0.66, 0)); head.add(box(0.36, 0.42, 0.1, M(0xe8e8e8, false, 'fur'), 0, -0.16, -0.24)); g.add(box(0.56, 0.75, 0.32, jacket, 0, 0.42, 0)); }
    head.add(box(0.06, 0.06, 0.02, M(0x1a1a1a), 0.1, 0.12, -0.23)); head.add(box(0.06, 0.06, 0.02, M(0x1a1a1a), -0.1, 0.12, -0.23));
    g.add(head); parts.head = head;
  } else if (type === 'dog') {
    const fur = M(0x8a6a4a), dark = M(0x4a3a2a), eye = M(0x1a1a1a);
    g.add(box(0.36, 0.34, 0.8, fur, 0, 0.52, 0));
    const head = new THREE.Group(); head.position.set(0, 0.72, -0.5);
    head.add(box(0.32, 0.3, 0.3, fur, 0, 0, 0)); head.add(box(0.18, 0.14, 0.2, dark, 0, -0.06, -0.22));
    head.add(box(0.08, 0.14, 0.06, dark, 0.11, 0.2, 0.05)); head.add(box(0.08, 0.14, 0.06, dark, -0.11, 0.2, 0.05));
    head.add(box(0.05, 0.05, 0.02, eye, 0.08, 0.06, -0.16)); head.add(box(0.05, 0.05, 0.02, eye, -0.08, 0.06, -0.16));
    g.add(head); parts.head = head;
    const tail = new THREE.Group(); tail.position.set(0, 0.64, 0.4); tail.add(box(0.08, 0.08, 0.35, fur, 0, 0.1, 0.15)); tail.rotation.x = 0.6; g.add(tail); parts.tail = tail;
    parts.collar = box(0.34, 0.06, 0.06, M(0xc8302a), 0, 0.62, -0.38); parts.collar.visible = false; g.add(parts.collar);
    parts.legs = [];
    for (const [x, z] of [[0.12, -0.3], [-0.12, -0.3], [0.12, 0.3], [-0.12, 0.3]]) { const l = new THREE.Group(); l.position.set(x, 0.36, z); l.add(box(0.1, 0.36, 0.1, dark, 0, -0.18, 0)); g.add(l); parts.legs.push(l); }
  } else if (type === 'shroom') {
    const stem = M(0xd8d0c0), cap = M(0x8a3ad8, true), dot = M(0xe09aff, true), eye = M(0x1a1a1a);
    parts.legs = [];
    for (const x of [0.15, -0.15]) { const l = new THREE.Group(); l.position.set(x, 0.4, 0); l.add(box(0.18, 0.4, 0.18, stem, 0, -0.2, 0)); g.add(l); parts.legs.push(l); }
    g.add(box(0.5, 0.6, 0.45, stem, 0, 0.7, 0));
    g.add(box(0.06, 0.08, 0.02, eye, 0.1, 0.85, -0.23)); g.add(box(0.06, 0.08, 0.02, eye, -0.1, 0.85, -0.23));
    const head = new THREE.Group(); head.position.set(0, 1.1, 0);
    head.add(box(1.0, 0.3, 1.0, cap, 0, 0.1, 0)); head.add(box(0.7, 0.2, 0.7, cap, 0, 0.3, 0));
    head.add(box(0.14, 0.04, 0.14, dot, 0.25, 0.42, 0.1)); head.add(box(0.14, 0.04, 0.14, dot, -0.2, 0.42, -0.15));
    g.add(head); parts.head = head;
  } else if (type === 'wolf') {
    const fur = M(0x8a8a86), dark = M(0x5a5a56), eye = M(0x9cff3a, true);
    g.add(box(0.4, 0.38, 0.9, fur, 0, 0.58, 0));
    const head = new THREE.Group(); head.position.set(0, 0.78, -0.55);
    head.add(box(0.34, 0.32, 0.32, fur, 0, 0, 0)); head.add(box(0.2, 0.16, 0.24, dark, 0, -0.06, -0.24));
    head.add(box(0.09, 0.16, 0.06, dark, 0.12, 0.22, 0.05)); head.add(box(0.09, 0.16, 0.06, dark, -0.12, 0.22, 0.05));
    head.add(box(0.06, 0.05, 0.02, eye, 0.09, 0.06, -0.17)); head.add(box(0.06, 0.05, 0.02, eye, -0.09, 0.06, -0.17));
    g.add(head); parts.head = head;
    const tail = new THREE.Group(); tail.position.set(0, 0.66, 0.45); tail.add(box(0.12, 0.12, 0.45, fur, 0, 0, 0.2)); tail.rotation.x = -0.3; g.add(tail); parts.tail = tail;
    parts.legs = [];
    for (const [x, z] of [[0.13, -0.32], [-0.13, -0.32], [0.13, 0.32], [-0.13, 0.32]]) { const l = new THREE.Group(); l.position.set(x, 0.4, z); l.add(box(0.12, 0.4, 0.12, dark, 0, -0.2, 0)); g.add(l); parts.legs.push(l); }
  } else if (type === 'ratqueen') {
    const fur = M(0x4a4038), pink = M(0xc08a8a), eye = M(0xff3a2a, true), crown = M(0xe0c23a, true);
    g.add(box(0.9, 0.7, 1.5, fur, 0, 0.6, 0));
    const head = new THREE.Group(); head.position.set(0, 0.75, -0.9);
    head.add(box(0.55, 0.5, 0.6, fur, 0, 0, 0)); head.add(box(0.2, 0.16, 0.2, pink, 0, -0.08, -0.36));
    head.add(box(0.1, 0.1, 0.02, eye, 0.15, 0.1, -0.31)); head.add(box(0.1, 0.1, 0.02, eye, -0.15, 0.1, -0.31));
    for (const x of [-0.18, 0, 0.18]) head.add(box(0.1, 0.18, 0.1, crown, x, 0.34, 0));
    g.add(head); parts.head = head;
    const tail = new THREE.Group(); tail.position.set(0, 0.6, 0.75); tail.add(box(0.1, 0.1, 1.3, pink, 0, 0, 0.65)); g.add(tail); parts.tail = tail;
    parts.legs = [];
    for (const [x, z] of [[0.35, -0.5], [-0.35, -0.5], [0.35, 0.5], [-0.35, 0.5]]) { const l = new THREE.Group(); l.position.set(x, 0.35, z); l.add(box(0.18, 0.35, 0.18, fur, 0, -0.18, 0)); g.add(l); parts.legs.push(l); }
  } else if (type === 'leviathan') {
    const skin = M(0x4a6a2a), belly = M(0x9ab04a), eye = M(0xffe03a, true), glow = M(0x9cff3a, true);
    parts.segs = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Group(); s.position.set(0, 0.8, i * 0.9);
      const w = 1.2 - i * 0.12;
      s.add(box(w, w * 0.9, 1, skin, 0, 0, 0)); s.add(box(w * 0.7, 0.1, 0.8, belly, 0, -w * 0.45, 0));
      s.add(box(0.12, 0.3, 0.3, glow, 0, w * 0.5, 0));
      g.add(s); parts.segs.push(s);
    }
    const head = new THREE.Group(); head.position.set(0, 1, -0.9);
    head.add(box(1.1, 0.8, 1.1, skin, 0, 0, 0)); head.add(box(0.9, 0.2, 0.5, belly, 0, -0.35, -0.4));
    head.add(box(0.16, 0.12, 0.02, eye, 0.3, 0.15, -0.56)); head.add(box(0.16, 0.12, 0.02, eye, -0.3, 0.15, -0.56));
    g.add(head); parts.head = head;
  } else if (type === 'alpha' || type === 'guardian') {
    const gd = type === 'guardian';
    const skin = M(gd ? 0x3a3450 : 0x7a8a70), rag = M(gd ? 0x14121c : 0x2a2e26), eye = M(gd ? 0xb07aff : 0xff3a2a, true), glow = M(gd ? 0xb07aff : 0x9cff3a, true);
    if (gd) g.scale.setScalar(1.25);
    parts.legs = [];
    for (const x of [0.22, -0.22]) { const l = new THREE.Group(); l.position.set(x, 1.0, 0); l.add(box(0.34, 1.0, 0.34, rag, 0, -0.5, 0)); g.add(l); parts.legs.push(l); }
    g.add(box(0.9, 0.9, 0.5, skin, 0, 1.45, 0));
    for (const [x, y] of [[0.3, 1.6], [-0.2, 1.3], [0.1, 1.8]]) g.add(box(0.16, 0.16, 0.06, glow, x, y, -0.27));
    parts.arms = [];
    for (const x of [0.6, -0.6]) { const a = new THREE.Group(); a.position.set(x, 1.85, 0); a.add(box(0.3, 1.1, 0.3, skin, 0, -0.5, 0)); a.add(box(0.36, 0.2, 0.36, glow, 0, -1.05, 0)); a.rotation.x = -1.2; g.add(a); parts.arms.push(a); }
    const head = new THREE.Group(); head.position.set(0, 2.15, -0.05);
    head.add(box(0.55, 0.55, 0.55, skin, 0, 0, 0));
    head.add(box(0.12, 0.08, 0.02, eye, 0.13, 0.05, -0.29)); head.add(box(0.12, 0.08, 0.02, eye, -0.13, 0.05, -0.29));
    g.add(head); parts.head = head;
  } else {
    const shell = M(0x9a8a2a), dark = M(0x5e5418), glow = M(0x9cff3a, true);
    g.add(box(0.75, 0.3, 1.0, shell, 0, 0.35, 0));
    g.add(box(0.5, 0.22, 0.4, dark, 0, 0.4, -0.6));
    const tail = new THREE.Group(); tail.position.set(0, 0.45, 0.5);
    let seg = tail;
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Group(); s.position.set(0, i ? 0.28 : 0, i ? 0.02 : 0); s.rotation.x = -0.55;
      s.add(box(0.2, 0.3, 0.2, i === 2 ? dark : shell, 0, 0.15, 0)); seg.add(s); seg = s;
    }
    seg.add(box(0.12, 0.2, 0.12, glow, 0, 0.36, -0.08));
    g.add(tail); parts.tail = tail;
    parts.claws = [];
    for (const x of [0.35, -0.35]) { const c = new THREE.Group(); c.position.set(x, 0.35, -0.7); c.add(box(0.2, 0.16, 0.36, shell, 0, 0, -0.15)); c.add(box(0.08, 0.12, 0.2, dark, x > 0 ? 0.08 : -0.08, 0, -0.38)); g.add(c); parts.claws.push(c); }
    parts.legs = [];
    for (const z of [-0.3, 0, 0.3]) for (const x of [0.45, -0.45]) {
      const l = new THREE.Group(); l.position.set(x, 0.35, z); l.add(box(0.3, 0.07, 0.07, dark, x > 0 ? 0.12 : -0.12, -0.12, 0)); l.rotation.z = x > 0 ? -0.6 : 0.6; g.add(l); parts.legs.push(l);
    }
  }
  return { group: g, mats, parts };
}

// patas: grupos que pivotean arriba (para animar el paso)
function legs(g, parts, mat, list, w, len, y) {
  parts.legs = parts.legs || [];
  for (const [x, z] of list) { const l = new THREE.Group(); l.position.set(x, y, z); l.add(box(w, len, w, mat, 0, -len / 2, 0)); g.add(l); parts.legs.push(l); }
}
// v12.7: animales de los biomas nuevos
const V12_ANIMALS = ['lizard', 'goat', 'bat'];
function buildV12Animal(type, g, parts, M) {
  const eye = M(0x111111, false, null);
  if (type === 'lizard') {
    const skin = M(0xb8783a), dark = M(0x7a4a22, false, null);
    g.add(box(0.2, 0.1, 0.42, skin, 0, 0.1, 0)); g.add(box(0.12, 0.02, 0.3, dark, 0, 0.16, 0));
    const h = new THREE.Group(); h.position.set(0, 0.11, -0.27); h.add(box(0.15, 0.09, 0.16, skin, 0, 0, 0)); h.add(box(0.03, 0.03, 0.02, eye, 0.06, 0.03, -0.06)); h.add(box(0.03, 0.03, 0.02, eye, -0.06, 0.03, -0.06)); g.add(h); parts.head = h;
    const t = new THREE.Group(); t.position.set(0, 0.1, 0.2); t.add(box(0.07, 0.06, 0.42, skin, 0, 0, 0.2)); g.add(t); parts.tail = t;
    legs(g, parts, dark, [[0.13, -0.12], [-0.13, -0.12], [0.13, 0.13], [-0.13, 0.13]], 0.05, 0.08, 0.08);
  } else if (type === 'goat') {
    const fur = M(0xe8e0cc), dark = M(0x6a5a48, false, null), horn = M(0x9a8a70, false, null);
    g.add(box(0.48, 0.48, 0.85, fur, 0, 0.78, 0));
    legs(g, parts, fur, [[0.16, -0.3], [-0.16, -0.3], [0.16, 0.3], [-0.16, 0.3]], 0.13, 0.55, 0.55);
    const h = new THREE.Group(); h.position.set(0, 1.08, -0.5); g.add(h); parts.head = h;
    h.add(box(0.28, 0.3, 0.38, fur, 0, 0, -0.06)); h.add(box(0.2, 0.14, 0.12, dark, 0, -0.07, -0.28)); h.add(box(0.06, 0.16, 0.06, fur, 0, -0.24, -0.2));
    h.add(box(0.05, 0.05, 0.02, eye, 0.11, 0.06, -0.2)); h.add(box(0.05, 0.05, 0.02, eye, -0.11, 0.06, -0.2));
    for (const s of [1, -1]) { const hr = new THREE.Group(); hr.position.set(0.08 * s, 0.17, 0.02); hr.rotation.x = 0.9; hr.add(box(0.06, 0.28, 0.06, horn, 0, 0.12, 0)); hr.add(box(0.05, 0.05, 0.14, horn, 0, 0.25, 0.07)); h.add(hr); }
    const t = new THREE.Group(); t.position.set(0, 0.95, 0.43); t.add(box(0.08, 0.12, 0.08, fur, 0, 0.05, 0)); g.add(t); parts.tail = t;
  } else if (type === 'bat') {
    const fur = M(0x3a2e2a), wing = M(0x2a2024, false, 'wrinkle'), red = M(0xff5a3a, true);
    g.add(box(0.16, 0.2, 0.16, fur, 0, 0.15, 0));
    const h = new THREE.Group(); h.position.set(0, 0.3, -0.04); h.add(box(0.14, 0.12, 0.12, fur, 0, 0, 0)); h.add(box(0.04, 0.08, 0.03, fur, 0.05, 0.09, 0)); h.add(box(0.04, 0.08, 0.03, fur, -0.05, 0.09, 0)); h.add(box(0.03, 0.03, 0.02, red, 0.04, 0.01, -0.07)); h.add(box(0.03, 0.03, 0.02, red, -0.04, 0.01, -0.07)); g.add(h); parts.head = h;
    parts.wings = [];
    for (const sx of [1, -1]) { const wg = new THREE.Group(); wg.position.set(0.08 * sx, 0.2, 0); wg.add(box(0.36, 0.03, 0.22, wing, 0.18 * sx, 0, 0)); g.add(wg); parts.wings.push(wg); }
  }
}
function buildZooAnimal(type, g, parts, M) {
  const eye = M(0x111111, false, null), white = M(0xf0ece0, false, null);
  const eyes = (head, y, z, dx) => { head.add(box(0.07, 0.07, 0.03, eye, dx, y, z)); head.add(box(0.07, 0.07, 0.03, eye, -dx, y, z)); };
  const H = (x, y, z) => { const h = new THREE.Group(); h.position.set(x, y, z); g.add(h); parts.head = h; return h; };
  const tail = (x, y, z, len, mat, w = 0.08, tilt = 0.5) => { const t = new THREE.Group(); t.position.set(x, y, z); t.add(box(w, w, len, mat, 0, 0, len / 2)); t.rotation.x = tilt; g.add(t); parts.tail = t; return t; };
  switch (type) {
    case 'lion': {
      const fur = M(0xc89a52), mane = M(0x6a4422), dark = M(0x4a3020);
      g.add(box(0.85, 0.75, 1.55, fur, 0, 0.95, 0.05));
      legs(g, parts, fur, [[0.28, -0.55], [-0.28, -0.55], [0.28, 0.6], [-0.28, 0.6]], 0.22, 0.6, 0.62);
      g.add(box(1.15, 1.1, 0.6, mane, 0, 1.2, -0.75));
      const h = H(0, 1.2, -1.05);
      h.add(box(0.6, 0.55, 0.5, fur, 0, 0, 0)); h.add(box(0.36, 0.26, 0.2, M(0xd8b070), 0, -0.12, -0.32)); h.add(box(0.12, 0.08, 0.05, dark, 0, -0.02, -0.43));
      eyes(h, 0.1, -0.26, 0.15); h.add(box(0.14, 0.14, 0.08, mane, 0.24, 0.32, 0.05)); h.add(box(0.14, 0.14, 0.08, mane, -0.24, 0.32, 0.05));
      const t = tail(0, 1.15, 0.8, 0.8, fur, 0.08, 0.7); t.add(box(0.16, 0.16, 0.18, mane, 0, 0, 0.82));
      break;
    }
    case 'giraffe': {
      const hide = M(0xd8a860), hoof = M(0x3a2a1a, false, null), mane = M(0x7a4a22);
      g.add(box(0.8, 0.85, 1.55, hide, 0, 2.05, 0));
      legs(g, parts, hide, [[0.25, -0.55], [-0.25, -0.55], [0.25, 0.55], [-0.25, 0.55]], 0.2, 1.65, 1.65);
      const neck = new THREE.Group(); neck.position.set(0, 2.35, -0.6); neck.rotation.x = 0.35; g.add(neck);
      neck.add(box(0.32, 1.9, 0.36, hide, 0, 0.95, 0)); neck.add(box(0.08, 1.7, 0.1, mane, 0, 0.95, 0.2));
      const h = new THREE.Group(); h.position.set(0, 1.95, -0.05); neck.add(h); parts.head = h; h.rotation.x = -0.35;
      h.add(box(0.36, 0.36, 0.7, hide, 0, 0, -0.15)); eyes(h, 0.08, -0.2, 0.19);
      h.add(box(0.07, 0.25, 0.07, hoof, 0.1, 0.28, 0.05)); h.add(box(0.07, 0.25, 0.07, hoof, -0.1, 0.28, 0.05));
      tail(0, 2.2, 0.78, 0.7, hide, 0.06, 1.2);
      break;
    }
    case 'elephant': {
      const skin = M(0x8c8a90), dark = M(0x6a686e);
      g.add(box(1.8, 1.6, 2.6, skin, 0, 2.15, 0.1));
      legs(g, parts, dark, [[0.6, -0.8], [-0.6, -0.8], [0.6, 0.95], [-0.6, 0.95]], 0.55, 1.4, 1.42);
      const h = H(0, 2.45, -1.55);
      h.add(box(1.15, 1.15, 0.9, skin, 0, 0, 0)); eyes(h, 0.15, -0.46, 0.38);
      h.add(box(0.12, 1.05, 0.95, skin, 0.66, 0.05, 0.25)); h.add(box(0.12, 1.05, 0.95, skin, -0.66, 0.05, 0.25));
      const trunk = new THREE.Group(); trunk.position.set(0, -0.25, -0.45); h.add(trunk); parts.trunk = trunk;
      trunk.add(box(0.3, 0.7, 0.3, skin, 0, -0.35, -0.05)); trunk.add(box(0.24, 0.6, 0.24, dark, 0, -0.95, -0.12));
      h.add(box(0.1, 0.1, 0.55, white, 0.3, -0.42, -0.55)); h.add(box(0.1, 0.1, 0.55, white, -0.3, -0.42, -0.55));
      tail(0, 2.3, 1.4, 0.7, dark, 0.07, 1.1);
      break;
    }
    case 'zebra': {
      const hide = M(0xf2f0ea), black = M(0x1a1a1a, false, null);
      g.add(box(0.7, 0.72, 1.4, hide, 0, 1.2, 0));
      legs(g, parts, hide, [[0.22, -0.5], [-0.22, -0.5], [0.22, 0.5], [-0.22, 0.5]], 0.17, 0.85, 0.86);
      const neck = new THREE.Group(); neck.position.set(0, 1.45, -0.6); neck.rotation.x = 0.55; g.add(neck);
      neck.add(box(0.28, 0.75, 0.35, hide, 0, 0.35, 0)); neck.add(box(0.07, 0.75, 0.12, black, 0, 0.38, 0.2));
      const h = new THREE.Group(); h.position.set(0, 0.75, -0.1); h.rotation.x = -0.55; neck.add(h); parts.head = h;
      h.add(box(0.3, 0.32, 0.62, hide, 0, 0, -0.2)); h.add(box(0.28, 0.2, 0.16, black, 0, -0.08, -0.52)); eyes(h, 0.06, -0.15, 0.16);
      h.add(box(0.07, 0.18, 0.06, black, 0.09, 0.22, 0.05)); h.add(box(0.07, 0.18, 0.06, black, -0.09, 0.22, 0.05));
      tail(0, 1.35, 0.7, 0.6, black, 0.06, 1.1);
      break;
    }
    case 'gorilla': {
      const fur = M(0x2c2c30), face = M(0x55505a, false, 'skin');
      g.add(box(1.0, 1.0, 0.75, fur, 0, 1.25, 0.05));
      legs(g, parts, fur, [[0.25, 0.1], [-0.25, 0.1]], 0.32, 0.75, 0.78);
      parts.arms = [];
      for (const x of [0.62, -0.62]) { const a = new THREE.Group(); a.position.set(x, 1.65, -0.05); a.add(box(0.3, 1.2, 0.3, fur, 0, -0.55, 0)); a.add(box(0.32, 0.18, 0.36, face, 0, -1.15, -0.04)); g.add(a); parts.arms.push(a); }
      parts.armsRelaxed = true;
      const h = H(0, 1.92, -0.15);
      h.add(box(0.55, 0.52, 0.5, fur, 0, 0, 0)); h.add(box(0.42, 0.34, 0.08, face, 0, -0.04, -0.27)); eyes(h, 0.06, -0.32, 0.11);
      h.add(box(0.46, 0.1, 0.1, fur, 0, 0.14, -0.28));
      break;
    }
    case 'bear': {
      const fur = M(0x5a4030), snout = M(0x8a6a50);
      g.add(box(1.0, 0.95, 1.6, fur, 0, 1.05, 0.05));
      legs(g, parts, fur, [[0.3, -0.55], [-0.3, -0.55], [0.3, 0.6], [-0.3, 0.6]], 0.3, 0.65, 0.66);
      const h = H(0, 1.25, -0.95);
      h.add(box(0.62, 0.58, 0.55, fur, 0, 0, 0)); h.add(box(0.3, 0.24, 0.25, snout, 0, -0.1, -0.36)); h.add(box(0.1, 0.07, 0.04, M(0x111111, false, null), 0, -0.02, -0.5));
      eyes(h, 0.1, -0.28, 0.16); h.add(box(0.15, 0.15, 0.1, fur, 0.25, 0.32, 0.05)); h.add(box(0.15, 0.15, 0.1, fur, -0.25, 0.32, 0.05));
      break;
    }
    case 'crocodile': {
      const skin = M(0x4a6a3a), belly = M(0xb8b080, false, 'shortfur');
      g.add(box(0.8, 0.42, 1.9, skin, 0, 0.35, 0)); g.add(box(0.7, 0.08, 1.8, belly, 0, 0.13, 0));
      for (let i = 0; i < 5; i++) g.add(box(0.1, 0.1, 0.12, skin, (i % 2 ? 0.2 : -0.2), 0.6, -0.7 + i * 0.35));
      legs(g, parts, skin, [[0.45, -0.6], [-0.45, -0.6], [0.45, 0.6], [-0.45, 0.6]], 0.16, 0.3, 0.3);
      const h = H(0, 0.38, -1.25);
      h.add(box(0.6, 0.28, 0.5, skin, 0, 0.04, 0)); h.add(box(0.42, 0.16, 0.65, skin, 0, 0.02, -0.55)); h.add(box(0.42, 0.1, 0.65, belly, 0, -0.12, -0.55));
      for (let i = 0; i < 4; i++) { h.add(box(0.04, 0.06, 0.04, white, 0.2, -0.06, -0.3 - i * 0.15)); h.add(box(0.04, 0.06, 0.04, white, -0.2, -0.06, -0.3 - i * 0.15)); }
      h.add(box(0.1, 0.1, 0.1, M(0xd8c040, true), 0.2, 0.2, 0)); h.add(box(0.1, 0.1, 0.1, M(0xd8c040, true), -0.2, 0.2, 0));
      parts.segs = [];
      for (let i = 0; i < 3; i++) { const s = new THREE.Group(); s.position.set(0, 0.32, 1.05 + i * 0.5); const w = 0.55 - i * 0.15; s.add(box(w, 0.3 - i * 0.06, 0.55, skin, 0, 0, 0)); g.add(s); parts.segs.push(s); }
      break;
    }
    case 'ostrich': {
      const feather = M(0x2a2a2a), pale = M(0xe8e0d0), skin = M(0xc8a090, false, 'skin');
      g.add(box(0.8, 0.65, 0.95, feather, 0, 1.45, 0.05)); g.add(box(0.6, 0.35, 0.3, pale, 0, 1.55, 0.6));
      legs(g, parts, skin, [[0.17, 0.05], [-0.17, 0.05]], 0.12, 1.15, 1.15);
      const neck = new THREE.Group(); neck.position.set(0, 1.65, -0.35); g.add(neck); neck.add(box(0.14, 1.0, 0.14, skin, 0, 0.5, 0));
      const h = new THREE.Group(); h.position.set(0, 1.05, -0.05); neck.add(h); parts.head = h;
      h.add(box(0.22, 0.2, 0.28, skin, 0, 0, 0)); h.add(box(0.12, 0.06, 0.18, M(0xd8a060, false, null), 0, -0.03, -0.2)); eyes(h, 0.04, -0.1, 0.1);
      break;
    }
    case 'kangaroo': {
      const fur = M(0xa87448), light = M(0xd8b088);
      const body = new THREE.Group(); body.position.set(0, 1.0, 0); body.rotation.x = -0.35; g.add(body);
      body.add(box(0.55, 0.85, 0.6, fur, 0, 0.1, 0)); body.add(box(0.4, 0.6, 0.1, light, 0, 0.05, -0.3));
      legs(g, parts, fur, [[0.2, 0.15], [-0.2, 0.15]], 0.24, 0.65, 0.7);
      g.add(box(0.5, 0.12, 0.45, fur, 0.2, 0.06, -0.05)); g.add(box(0.5, 0.12, 0.45, fur, -0.2, 0.06, -0.05));
      parts.arms = [];
      for (const x of [0.2, -0.2]) { const a = new THREE.Group(); a.position.set(x, 1.3, -0.3); a.add(box(0.1, 0.38, 0.1, fur, 0, -0.18, 0)); g.add(a); parts.arms.push(a); }
      parts.armsRelaxed = true;
      const h = H(0, 1.62, -0.25);
      h.add(box(0.3, 0.3, 0.45, fur, 0, 0, -0.05)); eyes(h, 0.06, -0.24, 0.1);
      h.add(box(0.08, 0.3, 0.06, fur, 0.1, 0.27, 0.05)); h.add(box(0.08, 0.3, 0.06, fur, -0.1, 0.27, 0.05));
      tail(0, 0.55, 0.3, 1.0, fur, 0.14, -0.35);
      parts.hop = true;
      break;
    }
    case 'flamingo': {
      const pink = M(0xe88aa0), legC = M(0xd87890, false, null);
      g.add(box(0.45, 0.4, 0.65, pink, 0, 1.25, 0)); g.add(box(0.3, 0.2, 0.25, pink, 0, 1.3, 0.38));
      legs(g, parts, legC, [[0.08, 0], [-0.08, 0]], 0.06, 1.05, 1.06);
      const neck = new THREE.Group(); neck.position.set(0, 1.4, -0.28); g.add(neck);
      neck.add(box(0.09, 0.45, 0.09, pink, 0, 0.22, 0)); neck.add(box(0.09, 0.09, 0.25, pink, 0, 0.45, -0.08)); neck.add(box(0.09, 0.4, 0.09, pink, 0, 0.62, -0.2));
      const h = new THREE.Group(); h.position.set(0, 0.85, -0.22); neck.add(h); parts.head = h;
      h.add(box(0.16, 0.14, 0.2, pink, 0, 0, 0)); h.add(box(0.07, 0.07, 0.18, M(0x1a1a1a, false, null), 0, -0.05, -0.16)); eyes(h, 0.03, -0.08, 0.07);
      break;
    }
    case 'penguin': {
      const black = M(0x1e1e26), white2 = M(0xf0f0ea, false, 'shortfur'), orange = M(0xe8901a, false, null);
      g.add(box(0.5, 0.75, 0.45, black, 0, 0.55, 0)); g.add(box(0.38, 0.6, 0.06, white2, 0, 0.5, -0.24));
      legs(g, parts, orange, [[0.12, -0.05], [-0.12, -0.05]], 0.12, 0.18, 0.18);
      parts.arms = [];
      for (const x of [0.29, -0.29]) { const a = new THREE.Group(); a.position.set(x, 0.8, 0); a.add(box(0.06, 0.45, 0.22, black, 0, -0.2, 0)); g.add(a); parts.arms.push(a); }
      parts.armsRelaxed = true;
      const h = H(0, 1.02, -0.02);
      h.add(box(0.36, 0.32, 0.34, black, 0, 0, 0)); h.add(box(0.1, 0.07, 0.16, orange, 0, -0.04, -0.24)); eyes(h, 0.06, -0.17, 0.09);
      parts.waddle = true;
      break;
    }
    case 'hippo': {
      const skin = M(0x7a6a72), pinkish = M(0xb08a90, false, 'skin');
      g.add(box(1.4, 1.0, 2.0, skin, 0, 0.95, 0.05)); g.add(box(1.2, 0.2, 1.8, pinkish, 0, 0.4, 0.05));
      legs(g, parts, skin, [[0.45, -0.6], [-0.45, -0.6], [0.45, 0.7], [-0.45, 0.7]], 0.38, 0.5, 0.5);
      const h = H(0, 1.0, -1.3);
      h.add(box(0.95, 0.65, 0.75, skin, 0, 0.1, 0)); h.add(box(0.85, 0.5, 0.4, pinkish, 0, -0.08, -0.48)); eyes(h, 0.4, -0.2, 0.3);
      h.add(box(0.12, 0.1, 0.1, skin, 0.3, 0.48, 0.15)); h.add(box(0.12, 0.1, 0.1, skin, -0.3, 0.48, 0.15));
      h.add(box(0.08, 0.15, 0.06, white, 0.25, -0.28, -0.66)); h.add(box(0.08, 0.15, 0.06, white, -0.25, -0.28, -0.66));
      break;
    }
    case 'snake': {
      const skin = M(0x6a8a2a), belly = M(0xd8c87a, false, 'shortfur');
      parts.segs = [];
      for (let i = 0; i < 6; i++) { const s = new THREE.Group(); s.position.set(0, 0.1, -0.1 + i * 0.3); const w = 0.2 - i * 0.02; s.add(box(w, w, 0.32, skin, 0, 0, 0)); s.add(box(w * 0.8, 0.03, 0.3, belly, 0, -w / 2, 0)); g.add(s); parts.segs.push(s); }
      const h = H(0, 0.14, -0.38);
      h.add(box(0.26, 0.16, 0.3, skin, 0, 0, 0)); eyes(h, 0.06, -0.12, 0.08); h.add(box(0.03, 0.02, 0.14, M(0xd83a2a, false, null), 0, -0.04, -0.2));
      break;
    }
    case 'monkey': {
      const fur = M(0x7a5a3a), face = M(0xd8b090, false, 'skin');
      g.add(box(0.35, 0.45, 0.3, fur, 0, 0.62, 0));
      legs(g, parts, fur, [[0.1, 0], [-0.1, 0]], 0.12, 0.38, 0.4);
      parts.arms = [];
      for (const x of [0.23, -0.23]) { const a = new THREE.Group(); a.position.set(x, 0.8, 0); a.add(box(0.1, 0.5, 0.1, fur, 0, -0.22, 0)); g.add(a); parts.arms.push(a); }
      const h = H(0, 1.0, -0.02);
      h.add(box(0.32, 0.3, 0.28, fur, 0, 0, 0)); h.add(box(0.22, 0.18, 0.04, face, 0, -0.03, -0.15)); eyes(h, 0.02, -0.17, 0.06);
      h.add(box(0.08, 0.1, 0.06, face, 0.19, 0.02, 0)); h.add(box(0.08, 0.1, 0.06, face, -0.19, 0.02, 0));
      const t = tail(0, 0.5, 0.15, 0.7, fur, 0.06, -0.9);
      t.add(box(0.06, 0.06, 0.25, fur, 0, 0.1, 0.75));
      break;
    }
    case 'rhino': {
      const skin = M(0x7a7a72), horn = M(0xd8d0b8, false, 'shortfur');
      g.add(box(1.3, 1.1, 2.0, skin, 0, 1.15, 0.05));
      legs(g, parts, skin, [[0.42, -0.65], [-0.42, -0.65], [0.42, 0.7], [-0.42, 0.7]], 0.34, 0.75, 0.76);
      const h = H(0, 1.0, -1.3);
      h.add(box(0.7, 0.62, 0.95, skin, 0, 0.05, -0.1)); eyes(h, 0.12, -0.3, 0.36);
      h.add(box(0.16, 0.5, 0.16, horn, 0, 0.45, -0.48)); h.add(box(0.12, 0.25, 0.12, horn, 0, 0.35, -0.18));
      h.add(box(0.1, 0.18, 0.08, skin, 0.25, 0.42, 0.25)); h.add(box(0.1, 0.18, 0.08, skin, -0.25, 0.42, 0.25));
      tail(0, 1.35, 1.05, 0.4, skin, 0.06, 1.1);
      break;
    }
  }
}

function buildEldraMob(type, g, parts, M) {
  const eye = (c = 0x111111) => M(c, c !== 0x111111, null);
  const H = (x, y, z) => { const h = new THREE.Group(); h.position.set(x, y, z); g.add(h); parts.head = h; return h; };
  switch (type) {
    case 'orc': case 'troll': {
      const big = type === 'troll', s = big ? 1.55 : 1;
      const skin = M(big ? 0x6a7a62 : 0x5a7a3a, false, big ? 'wrinkle' : 'skin'), armor = M(big ? 0x4a4038 : 0x2e2a26, false, 'shell'), cloth = M(0x4a3a2a, false, 'cloth');
      parts.legs = [];
      for (const x of [0.15 * s, -0.15 * s]) { const l = new THREE.Group(); l.position.set(x, 0.8 * s, 0); l.add(box(0.26 * s, 0.8 * s, 0.26 * s, cloth, 0, -0.4 * s, 0)); g.add(l); parts.legs.push(l); }
      g.add(box(0.6 * s, 0.75 * s, 0.34 * s, big ? skin : armor, 0, 1.18 * s, 0));
      parts.arms = [];
      for (const x of [0.42 * s, -0.42 * s]) { const a = new THREE.Group(); a.position.set(x, 1.5 * s, 0); a.add(box(0.2 * s, 0.75 * s, 0.2 * s, skin, 0, -0.35 * s, 0)); g.add(a); parts.arms.push(a); }
      parts.arms[0].add(box(0.14 * s, 0.75 * s, 0.14 * s, M(0x5a3a1a, false, 'shortfur'), 0, -0.8 * s, -0.25 * s)); // garrote
      parts.armsRelaxed = true;
      const h = H(0, 1.72 * s, 0);
      h.add(box(0.46 * s, 0.44 * s, 0.44 * s, skin, 0, 0.1 * s, 0));
      h.add(box(0.07, 0.07, 0.02, eye(0xff3a1a), 0.1 * s, 0.14 * s, -0.23 * s)); h.add(box(0.07, 0.07, 0.02, eye(0xff3a1a), -0.1 * s, 0.14 * s, -0.23 * s));
      h.add(box(0.05, 0.12, 0.05, M(0xe8e0c8, false, null), 0.12 * s, -0.06 * s, -0.24 * s)); h.add(box(0.05, 0.12, 0.05, M(0xe8e0c8, false, null), -0.12 * s, -0.06 * s, -0.24 * s));
      if (!big) h.add(box(0.5, 0.18, 0.5, armor, 0, 0.36, 0));
      break;
    }
    case 'spider': {
      const fur = M(0x2a2420), dark = M(0x161210);
      g.add(box(0.7, 0.45, 0.6, fur, 0, 0.55, -0.25)); g.add(box(0.95, 0.65, 0.95, dark, 0, 0.62, 0.45));
      const h = H(0, 0.55, -0.6); h.add(box(0.45, 0.32, 0.3, fur, 0, 0, 0));
      for (const [x, y] of [[0.12, 0.08], [-0.12, 0.08], [0.06, 0.13], [-0.06, 0.13]]) h.add(box(0.06, 0.06, 0.02, eye(0xff2a1a), x, y, -0.16));
      parts.legs = []; parts.spider = true;
      for (const z of [-0.4, -0.15, 0.1, 0.35]) for (const x of [0.4, -0.4]) { const l = new THREE.Group(); l.position.set(x, 0.55, z); l.add(box(0.6, 0.07, 0.07, fur, x > 0 ? 0.3 : -0.3, 0.05, 0)); l.add(box(0.07, 0.55, 0.07, fur, x > 0 ? 0.6 : -0.6, -0.25, 0)); g.add(l); parts.legs.push(l); }
      break;
    }
    case 'warg': {
      const fur = M(0x3a3634), dark = M(0x24201e);
      g.add(box(0.6, 0.6, 1.3, fur, 0, 0.85, 0)); g.add(box(0.66, 0.3, 0.6, dark, 0, 1.15, -0.25));
      parts.legs = [];
      for (const [x, z] of [[0.2, -0.45], [-0.2, -0.45], [0.2, 0.45], [-0.2, 0.45]]) { const l = new THREE.Group(); l.position.set(x, 0.6, z); l.add(box(0.16, 0.6, 0.16, dark, 0, -0.3, 0)); g.add(l); parts.legs.push(l); }
      const h = H(0, 1.0, -0.8); h.add(box(0.45, 0.42, 0.45, fur, 0, 0, 0)); h.add(box(0.28, 0.22, 0.32, dark, 0, -0.08, -0.32));
      h.add(box(0.07, 0.06, 0.02, eye(0xffb02a), 0.12, 0.08, -0.23)); h.add(box(0.07, 0.06, 0.02, eye(0xffb02a), -0.12, 0.08, -0.23));
      h.add(box(0.1, 0.2, 0.08, dark, 0.15, 0.3, 0.05)); h.add(box(0.1, 0.2, 0.08, dark, -0.15, 0.3, 0.05));
      const t = new THREE.Group(); t.position.set(0, 0.95, 0.65); t.add(box(0.14, 0.14, 0.6, fur, 0, 0, 0.28)); t.rotation.x = -0.4; g.add(t); parts.tail = t;
      break;
    }
    case 'ent': {
      const bark = M(0x6a5034), moss = M(0x4a7a3a, false, 'fur'), leaf = M(0x3e7a34, false, 'fur');
      parts.legs = [];
      for (const x of [0.3, -0.3]) { const l = new THREE.Group(); l.position.set(x, 1.2, 0); l.add(box(0.4, 1.2, 0.4, bark, 0, -0.6, 0)); l.add(box(0.6, 0.15, 0.6, bark, 0, -1.15, -0.05)); g.add(l); parts.legs.push(l); }
      g.add(box(1.0, 1.7, 0.7, bark, 0, 2.05, 0)); g.add(box(1.02, 0.3, 0.72, moss, 0, 2.6, 0));
      parts.arms = [];
      for (const x of [0.7, -0.7]) { const a = new THREE.Group(); a.position.set(x, 2.7, 0); a.add(box(0.28, 1.4, 0.28, bark, 0, -0.6, 0)); a.add(box(0.5, 0.4, 0.5, leaf, 0, -1.3, 0)); g.add(a); parts.arms.push(a); }
      parts.armsRelaxed = true;
      const h = H(0, 3.15, 0); h.add(box(0.8, 0.6, 0.6, bark, 0, 0, 0));
      h.add(box(0.12, 0.1, 0.02, eye(0x9cff3a), 0.18, 0.05, -0.31)); h.add(box(0.12, 0.1, 0.02, eye(0x9cff3a), -0.18, 0.05, -0.31));
      g.add(box(1.8, 0.8, 1.6, leaf, 0, 3.85, 0)); g.add(box(1.2, 0.6, 1.1, leaf, 0.2, 4.4, -0.1));
      break;
    }
    case 'dragon': {
      const scale = M(0x8a2a1a), belly = M(0xd8a060, false, 'shell'), horn = M(0xe8e0c8, false, null);
      g.add(box(1.4, 1.1, 2.6, scale, 0, 1.5, 0)); g.add(box(1.2, 0.3, 2.4, belly, 0, 0.92, 0));
      for (let i = 0; i < 5; i++) g.add(box(0.12, 0.3, 0.3, horn, 0, 2.15, -1 + i * 0.5));
      parts.legs = [];
      for (const [x, z] of [[0.55, -0.8], [-0.55, -0.8], [0.55, 0.9], [-0.55, 0.9]]) { const l = new THREE.Group(); l.position.set(x, 1.0, z); l.add(box(0.35, 1.0, 0.4, scale, 0, -0.5, 0)); g.add(l); parts.legs.push(l); }
      const neck = new THREE.Group(); neck.position.set(0, 1.9, -1.2); neck.rotation.x = -0.6; g.add(neck); neck.add(box(0.55, 1.4, 0.55, scale, 0, 0.6, 0));
      const h = new THREE.Group(); h.position.set(0, 1.35, -0.2); h.rotation.x = 0.6; neck.add(h); parts.head = h;
      h.add(box(0.8, 0.6, 1.0, scale, 0, 0, -0.2)); h.add(box(0.6, 0.25, 0.6, belly, 0, -0.28, -0.6));
      h.add(box(0.12, 0.1, 0.02, eye(0xffd83a), 0.28, 0.12, -0.71)); h.add(box(0.12, 0.1, 0.02, eye(0xffd83a), -0.28, 0.12, -0.71));
      h.add(box(0.1, 0.45, 0.1, horn, 0.25, 0.45, 0.2)); h.add(box(0.1, 0.45, 0.1, horn, -0.25, 0.45, 0.2));
      parts.wings = [];
      for (const sx of [1, -1]) { const w = new THREE.Group(); w.position.set(sx * 0.7, 2.0, -0.2); w.add(box(2.6, 0.08, 1.8, M(0x6a1a12, false, 'wrinkle'), sx * 1.3, 0, 0.3)); g.add(w); parts.wings.push(w); }
      parts.segs = [];
      for (let i = 0; i < 5; i++) { const s = new THREE.Group(); s.position.set(0, 1.4 - i * 0.1, 1.5 + i * 0.6); const ww = 0.7 - i * 0.12; s.add(box(ww, ww, 0.65, scale, 0, 0, 0)); g.add(s); parts.segs.push(s); }
      break;
    }
    case 'robot': {
      const metal = M(0xc8ccd2, false, null), dark = M(0x3a3e44, false, null), blue = M(0x6ab0ff, true, null);
      parts.legs = [];
      for (const x of [0.13, -0.13]) { const l = new THREE.Group(); l.position.set(x, 0.55, 0); l.add(box(0.16, 0.55, 0.16, dark, 0, -0.27, 0)); l.add(box(0.22, 0.1, 0.3, metal, 0, -0.52, -0.04)); g.add(l); parts.legs.push(l); }
      g.add(box(0.56, 0.55, 0.36, metal, 0, 0.85, 0)); g.add(box(0.3, 0.2, 0.02, blue, 0, 0.9, -0.19));
      parts.arms = [];
      for (const x of [0.36, -0.36]) { const a = new THREE.Group(); a.position.set(x, 1.08, 0); a.add(box(0.12, 0.5, 0.12, dark, 0, -0.22, 0)); a.add(box(0.16, 0.12, 0.16, metal, 0, -0.5, 0)); g.add(a); parts.arms.push(a); }
      parts.armsRelaxed = true;
      const h = H(0, 1.18, 0); h.add(box(0.46, 0.36, 0.4, metal, 0, 0.18, 0));
      h.add(box(0.1, 0.08, 0.02, blue, 0.11, 0.2, -0.21)); h.add(box(0.1, 0.08, 0.02, blue, -0.11, 0.2, -0.21)); h.add(box(0.2, 0.03, 0.02, dark, 0, 0.08, -0.21));
      h.add(box(0.04, 0.2, 0.04, dark, 0, 0.46, 0)); h.add(box(0.1, 0.1, 0.1, M(0xff5a4a, true, null), 0, 0.58, 0));
      break;
    }
    case 'horse': {
      const hide = M(0x7a5232), mane = M(0x2a1e14), hoof = M(0x1a1410, false, null);
      g.add(box(0.7, 0.75, 1.5, hide, 0, 1.25, 0));
      parts.legs = [];
      for (const [x, z] of [[0.22, -0.55], [-0.22, -0.55], [0.22, 0.55], [-0.22, 0.55]]) { const l = new THREE.Group(); l.position.set(x, 0.9, z); l.add(box(0.17, 0.85, 0.17, hide, 0, -0.42, 0)); l.add(box(0.19, 0.12, 0.2, hoof, 0, -0.84, 0)); g.add(l); parts.legs.push(l); }
      const neck = new THREE.Group(); neck.position.set(0, 1.5, -0.65); neck.rotation.x = -0.55; g.add(neck);
      neck.add(box(0.3, 0.8, 0.38, hide, 0, 0.35, 0)); neck.add(box(0.08, 0.8, 0.14, mane, 0, 0.38, 0.22));
      const h = new THREE.Group(); h.position.set(0, 0.8, -0.1); h.rotation.x = 0.55; neck.add(h); parts.head = h;
      h.add(box(0.3, 0.34, 0.66, hide, 0, 0, -0.2)); h.add(box(0.07, 0.07, 0.02, eye(), 0.16, 0.06, -0.15)); h.add(box(0.07, 0.07, 0.02, eye(), -0.16, 0.06, -0.15));
      h.add(box(0.07, 0.16, 0.06, hide, 0.09, 0.24, 0.05)); h.add(box(0.07, 0.16, 0.06, hide, -0.09, 0.24, 0.05));
      const t = new THREE.Group(); t.position.set(0, 1.4, 0.75); t.add(box(0.12, 0.12, 0.7, mane, 0, 0, 0.32)); t.rotation.x = 1.0; g.add(t); parts.tail = t;
      break;
    }
  }
}

let NEXT_ID = 1;
const NPC_LABELS = { robot: ['🤖 Profe Robi', '#9ad8ff'], elf: ['Elfa', '#b8f0d0'], dwarf: ['Enano', '#e0a060'], halfling: ['Mediano', '#c8e07a'], mage: ['Mago', '#a8a8ff'], worker: ['Empleado', '#6ab0ff'], trader: ['Comerciante', '#ffd84a'], leader: ['Líder del asentamiento', '#ff8a4a'], instructor: ['Instructor Rolo', '#ff5a4a'], settler: ['Superviviente', '#d8d0c0'], dog: ['Tu perro', '#9cff3a'] };
function labelSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const x = c.getContext('2d');
  x.font = '30px VT323, monospace'; x.textAlign = 'center';
  const w = x.measureText(text).width + 20;
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(128 - w / 2, 6, w, 36);
  x.fillStyle = color; x.fillText(text, 128, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(1.4, 0.26, 1); s.renderOrder = 11;
  return s;
}
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });

class Mob {
  constructor(type, x, y, z, id) {
    this.id = id ?? NEXT_ID++;
    this.type = type; this.def = MOB_TYPES[type];
    this.pos = new THREE.Vector3(x, y, z); this.vel = new THREE.Vector3();
    this.target = new THREE.Vector3(x, y, z); // para interpolar en clientes
    this.yaw = Math.random() * Math.PI * 2; this.targetYaw = this.yaw;
    this.hp = this.def.hp; this.onGround = false;
    this.hurt = 0; this.dying = 0; this.attackCd = 0;
    this.wanderT = 0; this.walking = false; this.fleeT = 0; this.fleeFrom = null;
    this.phase = 0; this.light = 1; this.lightAcc = 0; this.soundAcc = 3 + Math.random() * 8;
    const m = buildModel(type);
    this.group = m.group; this.mats = m.mats; this.parts = m.parts;
    if (NPC_LABELS[type]) {
      this.label = labelSprite(...NPC_LABELS[type]);
      this.label.position.y = this.def.h + 0.45;
      this.label.visible = type !== 'dog';
      this.group.add(this.label);
    }
    if (!this.def.fly) {
      const r = this.def.hw * 1.6;
      const sh = new THREE.Mesh(new THREE.CircleGeometry(r, 12), SHADOW_MAT);
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.renderOrder = 2;
      this.group.add(sh);
    }
  }
}

export class Mobs {
  constructor(scene, world, gen, sfx) {
    this.scene = scene; this.world = world; this.gen = gen; this.sfx = sfx;
    this.list = new Map();
    this.spawnAcc = 0;
    this.authority = true; // false en clientes de una partida online
    this.onAttackRemote = () => {};
    this.onKillRemote = () => {};
  }

  add(type, x, y, z, id, lvl) {
    if (!lvl && this.hardLvl > 1 && MOB_TYPES[type]?.hostile && this.authority) lvl = this.hardLvl;
    const m = new Mob(type, x, y, z, id);
    if (lvl > 1) { m.lvl = lvl; m.hp = Math.round(m.hp * (1 + (lvl - 1) * 0.35)); }
    this.list.set(m.id, m);
    this.scene.add(m.group);
    return m;
  }
  remove(m) { this.scene.remove(m.group); m.group.traverse((o) => o.geometry?.dispose()); m.mats.forEach((x) => x.dispose()); this.list.delete(m.id); }
  boss() { for (const m of this.list.values()) if (m.def.boss && !m.dying) return m; return null; }
  saveKeep() { return [...this.list.values()].filter((m) => (m.owner || m.def.stay || m.keep) && !m.dying).map((m) => ({ type: m.type, x: m.pos.x, y: m.pos.y, z: m.pos.z, owner: m.owner ?? null, name: m.petName ?? null, home: m.home ? [m.home.x, m.home.y, m.home.z] : null, marker: m.marker ?? null, quest: m.quest ?? null, keep: m.keep ?? null, role: m.role ?? null, tamed: m.tamed ?? null, xp: m.petXp ?? null, collar: m.collar ?? null })); }
  loadKeep(list) {
    for (const s of list || []) {
      const m = this.add(s.type, s.x, s.y, s.z);
      m.owner = s.owner; m.petName = s.name; m.marker = s.marker; m.quest = s.quest; m.keep = s.keep; m.role = s.role; m.tamed = s.tamed; m.petXp = s.xp ?? 0; m.collar = s.collar ?? null;
      if (s.home) m.home = new THREE.Vector3(...s.home);
    }
  }
  clear() { for (const m of [...this.list.values()]) this.remove(m); }

  collides(x, y, z, hw, h) {
    const w = this.world;
    const x0 = Math.floor(x - hw), x1 = Math.floor(x + hw - 1e-6);
    const y0 = Math.floor(y), y1 = Math.floor(y + h - 1e-6);
    const z0 = Math.floor(z - hw), z1 = Math.floor(z + hw - 1e-6);
    for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) {
      const b = w.getBlock(bx, by, bz);
      if (b === -1) return true;
      if (!SOLID[b]) continue;
      const cbs = collBox(b, bx, by, bz);
      if (!cbs) return true;
      for (const cb of cbs) if (y < by + cb[4] && y + h > by + cb[1] && x + hw > bx + cb[0] && x - hw < bx + cb[3] && z + hw > bz + cb[2] && z - hw < bz + cb[5]) return true;
    }
    return false;
  }
  move(m, axis, d) {
    if (!d) return false;
    const { hw, h } = m.def;
    m.pos[axis] += d;
    if (this.collides(m.pos.x, m.pos.y, m.pos.z, hw, h)) {
      m.pos[axis] -= d;
      if (axis === 'y' && d < 0) m.pos.y = Math.floor(m.pos.y) + 0.001;
      return true;
    }
    return false;
  }

  // players: [{pos, id, local, dead, creative, player?}]
  update(dt, players, daylight) {
    this.focus = players[0]?.pos;
    if (this.authority) this.spawn(dt, players, daylight);
    for (const m of [...this.list.values()]) {
      if (this.kids && this.authority && m.def.hostile && !m.def.neutral && !m.owner) { this.remove(m); continue; }
      if (this.authority && m.puppet && !m.dying) m.puppet(m, dt);
      else if (this.authority) this.think(m, dt, players, daylight);
      else {
        m.pos.lerp(m.target, Math.min(1, dt * 10));
        let dy = m.targetYaw - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.yaw += dy * Math.min(1, dt * 10);
        m.walking = m.pos.distanceToSquared(m.target) > 0.0004 || m.walking;
      }
      if (!this.authority && m.dying) m.dying += dt;
      if (!this.authority && players[0]) m.nd = players[0].pos.distanceTo(m.pos);
      this.animate(m, dt, daylight);
      if (m.dying && m.dying > 0.45) this.remove(m);
    }
  }

  think(m, dt, players, daylight) {
    const d = m.def, w = this.world;
    if (w.getBlock(Math.floor(m.pos.x), 1, Math.floor(m.pos.z)) === -1) return; // chunk no cargado
    m.hurt = Math.max(0, m.hurt - dt); m.attackCd -= dt;
    if (m.dying) { m.dying += dt; return; }

    // jugador más cercano
    let near = null, nd = Infinity;
    for (const p of players) {
      const dd = p.pos.distanceTo(m.pos);
      if (dd < nd) { nd = dd; near = p; }
    }
    m.life = (m.life || 0) + dt;
    if (m.provoked) { m.provT = (m.provT || 0) + dt; if (m.provT > 30) { m.provoked = false; m.provT = 0; } }
    m.nd = nd;
    if (nd > 80 && !d.stay && !m.owner && !m.keep && !m.raid) { this.remove(m); return; }
    if (nd > 160 && m.raid) { this.remove(m); return; }
    if (d.npc === 'trader' && !m.keep && m.life > 360 && nd > 20) { this.remove(m); return; }

    let mx = 0, mz = 0, speed = 0;
    let target = null;
    // mascotas: siguen al dueño y atacan a lo que lo amenace
    if (m.owner) {
      const owner = players.find((p) => p.name === m.owner);
      if (owner) {
        const od = owner.pos.distanceTo(m.pos);
        if (od > 32) { m.pos.set(owner.pos.x + 1, owner.pos.y + 0.5, owner.pos.z + 1); m.vel.set(0, 0, 0); }
        let prey = null, pd = 9;
        if (!m.sit) for (const o of this.list.values()) { if (!o.def.hostile || o.dying) continue; const dd = o.pos.distanceTo(owner.pos); if (dd < pd) { pd = dd; prey = o; } }
        if (prey) {
          mx = prey.pos.x - m.pos.x; mz = prey.pos.z - m.pos.z; speed = d.speed;
          if (prey.pos.distanceTo(m.pos) < 1.4 && m.attackCd <= 0) { m.attackCd = 1; this.hit(prey, d.dmg * (m.petDmg || 1), new THREE.Vector3(mx, 0, mz).normalize(), null); m.attackAnim = 0.3; this.onPetHit?.(m, prey); }
        } else if (!m.sit && od > 3.5) { mx = owner.pos.x - m.pos.x; mz = owner.pos.z - m.pos.z; speed = od > 8 ? d.speed : d.speed * 0.6; }
      }
    } else if (d.npc && m.goal) {
      mx = m.goal.x - m.pos.x; mz = m.goal.z - m.pos.z; speed = Math.hypot(mx, mz) > 1.2 ? d.speed * 1.4 : 0;
    } else if (d.npc) {
      // las personas pasean cerca de su casa y miran al jugador si está cerca
      m.home = m.home || m.pos.clone();
      if (near && nd < 5) { m.targetYaw = Math.atan2(-(near.pos.x - m.pos.x), -(near.pos.z - m.pos.z)); }
      else {
        m.wanderT -= dt;
        if (m.wanderT <= 0) { m.wanderT = 3 + Math.random() * 5; m.walking = Math.random() < 0.5; m.targetYaw = Math.random() * Math.PI * 2; }
        if (m.pos.distanceTo(m.home) > (d.stay ? 5 : 20)) { m.walking = true; m.targetYaw = Math.atan2(-(m.home.x - m.pos.x), -(m.home.z - m.pos.z)); }
        if (m.walking) { mx = -Math.sin(m.targetYaw); mz = -Math.cos(m.targetYaw); speed = d.speed; }
      }
    } else if (d.hostile && near && !near.dead && !near.creative && nd < (near.player?.stealth && !m.provoked ? Math.min(d.range, 3.5) : d.range) && (!d.neutral || m.provoked) && !(this.peacefulDay && d.animal && daylight > 0.45 && !m.provoked)) {
      target = near;
    }
    // la reina de las ratas llama a sus crías
    if (d.summon && target) { m.summonT = (m.summonT || 0) + dt; if (m.summonT > 8) { m.summonT = 0; let n = 0; for (const o of this.list.values()) if (o.type === d.summon) n++; if (n < 5) { this.add(d.summon, m.pos.x + 1, m.pos.y, m.pos.z); this.add(d.summon, m.pos.x - 1, m.pos.y, m.pos.z); } } }
    if (d.ranged && !target && m.raid && !m.dying) {
      const r = m.raid;
      mx = r.x - m.pos.x; mz = r.z - m.pos.z; speed = Math.hypot(mx, mz) > 2 ? d.speed : 0;
      m.raidT = (m.raidT || 0) + dt;
      if (m.raidT > 2.5) { m.raidT = 0; this.onRaid?.(m); }
    }
    if (target && d.ranged) {
      mx = near.pos.x - m.pos.x; mz = near.pos.z - m.pos.z;
      // mantenerse a distancia media y disparar
      speed = nd > d.ranged.range * 0.7 ? d.speed : nd < 6 ? -d.speed * 0.6 : 0;
      if (speed < 0) { mx = -mx; mz = -mz; speed = -speed; }
      m.shootT = (m.shootT ?? 1 + Math.random()) - dt;
      if (m.shootT <= 0 && nd < d.ranged.range) {
        m.shootT = d.ranged.cd * (0.8 + Math.random() * 0.4);
        const from = new THREE.Vector3(m.pos.x, m.pos.y + 1.45, m.pos.z), to = new THREE.Vector3(near.pos.x, near.pos.y + 1.2, near.pos.z);
        const clear = !this.world.raycast(from, to.clone().sub(from).normalize(), from.distanceTo(to) - 0.5);
        if (clear) {
          const hitIt = Math.random() < d.ranged.acc * (nd < 8 ? 1.3 : 1);
          if (!hitIt) to.add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3));
          this.onShot?.(from, to, m);
          m.attackAnim = 0.3;
          if (hitIt) { if (near.local) near.player.damage(d.ranged.dmg, d.name, 0, null); else this.onAttackRemote(near.id, d.ranged.dmg, 0, new THREE.Vector3(), d.name); }
        }
      }
      // si igual está pegado, golpea
      if (nd < 1.45 && m.attackCd <= 0) { m.attackCd = 1.1; if (near.local) near.player.damage(d.dmg, d.name, 0, new THREE.Vector3(mx, 0, mz).normalize()); else this.onAttackRemote(near.id, d.dmg, 0, new THREE.Vector3(mx, 0, mz).normalize(), d.name); }
    } else if (target) {
      mx = near.pos.x - m.pos.x; mz = near.pos.z - m.pos.z;
      speed = nd < (d.boss ? 1.8 : d.hw > 0.6 ? 0.9 + d.hw : 1.05) && !d.fly ? 0 : (d.charge && nd > 3 ? d.charge : d.speed);
      const dy = near.pos.y - m.pos.y;
      if (nd < (m.type === 'scorpion' ? 1.6 : d.boss ? 2.6 : 1.45 + Math.max(0, d.hw - 0.4)) && Math.abs(dy) < (d.boss ? 3 : 1.8 + Math.max(0, d.h - 1.8) * 0.5) && m.attackCd <= 0) {
        m.attackCd = d.boss ? 1.6 : 1.1;
        const kn = new THREE.Vector3(mx, 0, mz).normalize().multiplyScalar(d.knock ?? 1);
        if (near.local) {
          near.player.damage(d.dmg, d.name, d.rad, kn);
          if (d.poison && Math.random() < 0.25) near.player.disease.intoxicacion = 40;
        } else this.onAttackRemote(near.id, d.dmg, d.rad, kn, d.name);
        m.attackAnim = 0.3;
      }
    } else if (m.owner || d.npc) {
      // ya decidieron su movimiento arriba
    } else if (m.fleeT > 0 && m.fleeFrom) {
      m.fleeT -= dt;
      mx = m.pos.x - m.fleeFrom.x; mz = m.pos.z - m.fleeFrom.z; speed = d.flee;
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) { m.wanderT = 2 + Math.random() * 4; m.walking = Math.random() < 0.6; m.targetYaw = Math.random() * Math.PI * 2; }
      if (m.walking) { mx = -Math.sin(m.targetYaw); mz = -Math.cos(m.targetYaw); speed = d.speed * 0.5; }
      m.aiT = (m.aiT || Math.random()) - dt;
      // cazadores: los animales hostiles persiguen presas cuando no hay jugadores cerca
      if (d.hostile && d.animal && !m.siege && !d.boss) {
        if (m.aiT <= 0) {
          m.aiT = 1.5; m.prey = null; let pd = 14;
          for (const o of this.list.values()) { if (o === m || o.dying || o.owner || !o.def.flee || o.def.hostile) continue; const dd = o.pos.distanceTo(m.pos); if (dd < pd) { pd = dd; m.prey = o; } }
        }
        const pr = m.prey;
        if (pr && !pr.dying && this.list.has(pr.id)) {
          mx = pr.pos.x - m.pos.x; mz = pr.pos.z - m.pos.z; speed = d.speed * 0.9;
          if (Math.hypot(mx, mz) < 1.3 + d.hw && m.attackCd <= 0) { m.attackCd = 1.2; m.attackAnim = 0.3; this.hit(pr, d.dmg, new THREE.Vector3(mx, 0, mz).normalize(), null); }
        }
      } else if (d.flee && !d.hostile && !m.owner && !m.tamed) {
        // presas: se juntan en manada, escapan de los cazadores y vuelven a su lugar de noche
        if (m.aiT <= 0) {
          m.aiT = 2;
          let cx = 0, cz = 0, n = 0, danger = null, dd = 9;
          for (const o of this.list.values()) {
            if (o === m || o.dying) continue;
            const dist = o.pos.distanceTo(m.pos);
            if (o.type === m.type && dist < 18) { cx += o.pos.x; cz += o.pos.z; n++; }
            if (o.def.hostile && o.def.animal && dist < dd) { dd = dist; danger = o; }
          }
          m.herd = n ? { x: cx / n, z: cz / n } : null;
          if (danger) { m.fleeT = 3; m.fleeFrom = danger.pos.clone(); }
        }
        const night = daylight < 0.3;
        if (night && m.home && m.pos.distanceTo(m.home) > 4) { mx = m.home.x - m.pos.x; mz = m.home.z - m.pos.z; speed = d.speed * 0.6; }
        else if (m.herd && Math.hypot(m.herd.x - m.pos.x, m.herd.z - m.pos.z) > 6) { mx = m.herd.x - m.pos.x; mz = m.herd.z - m.pos.z; speed = d.speed * 0.55; }
      }
    }
    // defensa del refugio: van al núcleo salvo que tengan un jugador muy cerca
    if (m.siege && (!target || nd > 8)) {
      const sx = m.siege.x + 0.5 - m.pos.x, sz = m.siege.z + 0.5 - m.pos.z, sd = Math.hypot(sx, sz);
      if (sd > 1.4 + d.hw) { mx = sx; mz = sz; speed = d.speed; }
      else { speed = 0; m.targetYaw = Math.atan2(-sx, -sz); if (m.attackCd <= 0) { m.attackCd = 1.2; m.attackAnim = 0.3; this.onSiege?.(m); } }
    }
    if (m.burnT > 0) { m.burnT -= dt; m.burnAcc = (m.burnAcc || 0) + dt; if (m.burnAcc > 0.6) { m.burnAcc = 0; this.hit(m, 2, null, m.burnBy || null); } }
    // los trolls se convierten en piedra bajo el sol
    if (d.stoneInSun && daylight > 0.55 && this.skyOpen(m)) {
      const bx = Math.floor(m.pos.x), by = Math.floor(m.pos.y), bz = Math.floor(m.pos.z);
      for (let k = 0; k < 3; k++) if (!SOLID[w.getBlock(bx, by + k, bz)]) w.setBlock(bx, by + k, bz, k === 2 ? 211 : 210);
      this.onPetrify?.(m); this.remove(m); return;
    }
    // los necrófagos se desintegran bajo el sol
    if (m.type === 'ghoul' && daylight > 0.6 && this.skyOpen(m)) { m.burn = (m.burn || 0) + dt; if (m.burn > 1) { m.burn = 0; this.hit(m, 2, null, null); } }

    const len = Math.hypot(mx, mz);
    if (len > 0.01) { mx /= len; mz /= len; m.targetYaw = Math.atan2(-mx, -mz); }
    let dyaw = m.targetYaw - m.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    m.yaw += dyaw * Math.min(1, dt * 8);

    const feet = w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.3), Math.floor(m.pos.z));
    const inWater = LIQ[feet] > 0;
    if (LIQ[feet] === 3) { m.lava = (m.lava || 0) + dt; if (m.lava > 0.5) { m.lava = 0; this.hit(m, 3, null, null); } }
    // cercos eléctricos
    m.fenceAcc = (m.fenceAcc || 0) - dt;
    if (this.sim && m.fenceAcc <= 0) {
      const fx = Math.floor(m.pos.x), fy = Math.floor(m.pos.y), fz = Math.floor(m.pos.z);
      for (let dx = -1; dx <= 1 && m.fenceAcc <= 0; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (w.getBlock(fx + dx, fy, fz + dz) === 78 && this.sim.fencePowered(fx + dx, fy, fz + dz) && Math.hypot(fx + dx + 0.5 - m.pos.x, fz + dz + 0.5 - m.pos.z) < 0.6 + m.def.hw + 0.3) {
          m.fenceAcc = 0.6;
          this.hit(m, 3, new THREE.Vector3(m.pos.x - fx - dx - 0.5, 0, m.pos.z - fz - dz - 0.5).normalize(), null);
          this.sfx?.zap?.();
          break;
        }
      }
    }
    const acc = m.onGround || d.fly ? 10 : 2;
    m.vel.x += (mx * speed - m.vel.x) * Math.min(1, acc * dt);
    m.vel.z += (mz * speed - m.vel.z) * Math.min(1, acc * dt);
    if (d.fly) {
      // vuela alto y se tira en picada sobre el objetivo
      let ty = d.caveFly ? (m.homeY ?? m.pos.y) + Math.sin(performance.now() / 600 + m.id) * 0.8 : (m.groundY ?? m.pos.y) + 6;
      if (target) ty = near.pos.y + (nd < 5 ? 1 : 4);
      m.vel.y += ((ty - m.pos.y) * 2 - m.vel.y) * Math.min(1, dt * 3);
      m.groundAcc = (m.groundAcc || 0) - dt;
      if (m.groundAcc <= 0 && !d.caveFly) { m.groundAcc = 1; const gy = this.surfaceY(Math.floor(m.pos.x), Math.floor(m.pos.z)); if (gy != null) m.groundY = gy; }
    } else if (inWater) { m.vel.y = Math.min(m.vel.y + 20 * dt, 2.5); } else m.vel.y -= 28 * dt;
    const hx = this.move(m, 'x', m.vel.x * dt), hz = this.move(m, 'z', m.vel.z * dt);
    if ((hx || hz) && m.onGround && speed > 0 && !d.fly) m.vel.y = d.boss ? 9 : 7.8;
    if ((hx || hz) && d.fly) m.vel.y = 4;
    const vy = m.vel.y;
    const hy = this.move(m, 'y', vy * dt);
    m.onGround = hy && vy < 0;
    if (hy) m.vel.y = 0;
    if (m.pos.y < -10) this.remove(m);
    m.walking = Math.hypot(m.vel.x, m.vel.z) > 0.4;

    // sonidos ambientales
    m.soundAcc -= dt;
    if (m.soundAcc <= 0) { m.soundAcc = 5 + Math.random() * 10; if (nd < 20) this.sfx?.mobIdle(m.type, nd); }
  }

  skyOpen(m) {
    const x = Math.floor(m.pos.x), z = Math.floor(m.pos.z);
    for (let y = Math.floor(m.pos.y + m.def.h); y < Math.floor(m.pos.y) + 40; y++) {
      const b = this.world.getBlock(x, y, z);
      if (b === -1) return true;
      if (OPAQUE[b]) return false;
    }
    return true;
  }

  animate(m, dt, daylight) {
    const g = m.group, P = m.parts;
    g.position.copy(m.pos); g.rotation.y = m.yaw;
    if (m.dying) g.rotation.z = Math.min(Math.PI / 2, m.dying * 5);
    const walk = m.walking ? 1 : 0;
    m.phase += dt * (m.type === 'scorpion' || m.type === 'rat' ? 16 : m.type === 'behemoth' ? 5 : 9) * walk;
    const s = Math.sin(m.phase) * 0.7 * walk;
    if (P.legs) P.legs.forEach((l, i) => { if (m.type === 'scorpion' || P.spider) l.rotation.y = Math.sin(m.phase + i) * 0.4 * walk; else l.rotation.x = i % 2 ? s : -s; });
    if (P.arms) { const atk = m.attackAnim ? Math.sin(m.attackAnim / 0.3 * Math.PI) * 0.8 : 0; P.arms.forEach((a, i) => (a.rotation.x = -1.35 + (i ? s : -s) * 0.2 - atk)); }
    if (P.tail) P.tail.rotation.x = -0.2 + Math.sin(performance.now() / 300) * 0.1 - (m.attackAnim ? 0.8 : 0);
    if (P.claws) P.claws.forEach((c, i) => (c.rotation.y = Math.sin(performance.now() / 200 + i) * 0.2));
    if (P.head && m.type === 'boar') P.head.rotation.x = Math.sin(performance.now() / 500) * 0.1;
    if (P.wings) { const f = Math.sin(performance.now() / 70) * 0.7; P.wings[0].rotation.z = f; P.wings[1].rotation.z = -f; }
    if (P.segs) P.segs.forEach((sg, i) => { sg.position.x = Math.sin(performance.now() / 400 + i * 0.8) * 0.3 * (i + 1) / 3; });
    if (P.armsRelaxed && P.arms) P.arms.forEach((a, i) => (a.rotation.x = (i ? s : -s) * 0.6));
    if (P.collar) P.collar.visible = !!m.owner;
    // miran al jugador cuando está cerca (y respiran cuando están quietos)
    if (P.head && !m.dying && this.focus && !m.def.boss) {
      const dx = this.focus.x - m.pos.x, dz = this.focus.z - m.pos.z, dd = Math.hypot(dx, dz);
      let want = 0;
      if (dd < 7 && dd > 0.6) { want = Math.atan2(-dx, -dz) - m.yaw; want = Math.atan2(Math.sin(want), Math.cos(want)); want = Math.max(-0.9, Math.min(0.9, want)); }
      m.headYaw = (m.headYaw || 0) + (want - (m.headYaw || 0)) * Math.min(1, dt * 4);
      P.head.rotation.y = m.headYaw;
      if (!m.walking) { m.breath = (m.breath || Math.random() * 6) + dt; P.head.position.y += Math.sin(m.breath * 2.2) * 0.0009; }
    }
    if (P.hop) g.position.y += Math.abs(Math.sin(m.phase * 0.5)) * 0.45 * walk;
    if (P.waddle) g.rotation.z = Math.sin(m.phase) * 0.12 * walk;
    if (P.trunk) P.trunk.rotation.x = Math.sin(performance.now() / 700) * 0.25 + (m.attackAnim ? -0.9 : 0);
    if (P.tail && !['scorpion', 'dog', 'rat', 'ratqueen', 'wolf'].includes(m.type) && P.tail.userData.base == null) P.tail.userData.base = P.tail.rotation.x;
    if (P.tail?.userData.base != null) P.tail.rotation.z = Math.sin(performance.now() / 400 + m.id) * 0.25;
    if (m.label) m.label.visible = (m.type !== 'dog' || !!m.owner) && (m.nd ?? 0) < 45 && !m.dying;
    if (m.type === 'dog' && P.tail) P.tail.rotation.y = Math.sin(performance.now() / (m.owner ? 90 : 300)) * 0.5;
    if (m.type === 'rat' && P.tail) P.tail.rotation.y = Math.sin(performance.now() / 150) * 0.4;
    if (m.attackAnim) m.attackAnim = Math.max(0, m.attackAnim - dt);
    // luz aproximada: cielo abierto o techado
    m.lightAcc -= dt;
    if (m.lightAcc <= 0) { m.lightAcc = 0.3; m.light = this.skyOpen(m) ? 0.15 + daylight * 0.85 : 0.22; }
    for (const mat of m.mats) {
      if (mat.userData.glow) continue;
      // userData.base ya incluye la compensación de brillo de la textura
      mat.color.copy(mat.userData.base).multiplyScalar(m.light);
      if (m.hurt > 0 || m.dying) mat.color.lerp(new THREE.Color(0.9, 0.1, 0.05), 0.55);
    }
  }

  hit(m, dmg, dir, attacker) {
    if (m.dying) return;
    if (!this.authority) { this.onHitRemote?.(m.id, dmg, dir); m.hurt = 0.3; this.sfx?.mobHurt(m.type); return; }
    m.hp -= dmg; m.hurt = 0.3;
    if (attacker) { m.provoked = true; m.provT = 0; }
    if (dir) { m.vel.x += dir.x * 6; m.vel.z += dir.z * 6; m.vel.y = 5; }
    this.sfx?.mobHurt(m.type);
    if (!m.def.hostile && m.def.flee && attacker) { m.fleeT = 5; m.fleeFrom = attacker.pos.clone(); }
    if (m.hp <= 0) {
      m.dying = 0.001;
      this.sfx?.mobDie(m.type);
      if (attacker) {
        const loot = [];
        for (const [id, a, b, p] of m.def.drops) if (Math.random() < p) loot.push([id, a + Math.floor(Math.random() * (b - a + 1))]);
        if (m.stolen) for (const s of m.stolen) loot.push([s.id, s.count]);
        if (m.lvl > 1) loot.push([353, m.lvl]);
        if (attacker.inv) { for (const [id, n] of loot) attacker.inv.add(id, n); attacker.onEvent?.('kill', m.type); }
        else this.onKillRemote(attacker.id, loot, m.type);
      }
    }
  }

  raycast(o, d, maxDist) {
    let best = null;
    for (const m of this.list.values()) {
      if (m.dying) continue;
      const { hw, h } = m.def;
      const mn = [m.pos.x - hw, m.pos.y, m.pos.z - hw], mx = [m.pos.x + hw, m.pos.y + h, m.pos.z + hw];
      let t0 = 0, t1 = maxDist;
      const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
      let ok = true;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(D[i]) < 1e-9) { if (O[i] < mn[i] || O[i] > mx[i]) { ok = false; break; } continue; }
        let a = (mn[i] - O[i]) / D[i], b = (mx[i] - O[i]) / D[i];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && (!best || t0 < best.dist)) best = { mob: m, dist: t0 };
    }
    return best;
  }

  surfaceY(x, z) {
    const w = this.world;
    for (let y = 110; y > 2; y--) {
      const b = w.getBlock(x, y, z);
      if (b === -1) return null;
      if (LIQ[b]) return null;
      if (SOLID[b]) {
        if (!SOLID[w.getBlock(x, y + 1, z)] && !SOLID[w.getBlock(x, y + 2, z)] && !LIQ[w.getBlock(x, y + 1, z)]) return y + 1;
        return null;
      }
    }
    return null;
  }

  caveY(x, z, top) {
    const w = this.world;
    for (let y = Math.min(top - 8, SEA - 4); y > 6; y--) {
      if (!SOLID[w.getBlock(x, y, z)] && !SOLID[w.getBlock(x, y + 1, z)] && SOLID[w.getBlock(x, y - 1, z)] && w.getBlock(x, y, z) === 0 && !LIQ[w.getBlock(x, y - 1, z)]) return y;
    }
    return null;
  }

  torchNear(x, y, z, r) {
    const w = this.world;
    for (let dx = -r; dx <= r; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -r; dz <= r; dz++) {
      const b = w.getBlock(x + dx, y + dy, z + dz);
      if (TORCHES.has(b) || b === 28) return true;
    }
    return false;
  }

  spawn(dt, players, daylight) {
    this.spawnAcc += dt;
    if (this.spawnAcc < 1) return;
    this.spawnAcc = 0;
    if (!players.length) return;
    const count = {};
    for (const k of Object.keys(MOB_TYPES)) count[k] = 0;
    for (const m of this.list.values()) count[m.type]++;
    const p = players[Math.floor(Math.random() * players.length)];
    // horda nocturna: oleadas alrededor de los jugadores
    if (this.horde && !this.kids) {
      const hostiles = count.ghoul + count.rat + count.wolf;
      if (hostiles < 30) for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, dd = 18 + Math.random() * 10;
        const hx = Math.floor(p.pos.x + Math.cos(a) * dd), hz = Math.floor(p.pos.z + Math.sin(a) * dd);
        const hy = this.surfaceY(hx, hz);
        if (hy != null) this.add(this.gen.type === 'magic' ? (i === 2 ? 'warg' : 'orc') : i === 2 ? 'rat' : 'ghoul', hx + 0.5, hy, hz + 0.5).hordeMob = true;
      }
    }
    // comerciante errante de día
    if (daylight > 0.5 && count.trader < 1 && Math.random() < 0.006) {
      const a = Math.random() * Math.PI * 2, tx = Math.floor(p.pos.x + Math.cos(a) * 14), tz = Math.floor(p.pos.z + Math.sin(a) * 14);
      const ty = this.surfaceY(tx, tz);
      if (ty != null) { this.add('trader', tx + 0.5, ty, tz + 0.5); this.onTrader?.(); return; }
    }
    if (this.gen.type === 'magic') { this.spawnEldra(p, players, daylight, count); return; }
    // jefes especiales según dónde esté el jugador
    const pc = this.gen.column(Math.floor(p.pos.x), Math.floor(p.pos.z));
    if (pc.biome === BIOME.CITY && p.pos.y < pc.cityLevel - 4 && count.ratqueen < 1 && Math.random() < 0.03) {
      const a = Math.random() * Math.PI * 2; this.add('ratqueen', p.pos.x + Math.cos(a) * 14, p.pos.y, p.pos.z + Math.sin(a) * 14); this.onBoss?.('ratqueen'); return;
    }
    if (pc.biome === BIOME.SWAMP && count.leviathan < 1 && Math.random() < 0.012) {
      for (let tries = 0; tries < 12; tries++) {
        const a = Math.random() * Math.PI * 2, lx = Math.floor(p.pos.x + Math.cos(a) * 16), lz = Math.floor(p.pos.z + Math.sin(a) * 16);
        if (LIQ[this.world.getBlock(lx, SEA, lz)] === 1) { this.add('leviathan', lx + 0.5, SEA - 1, lz + 0.5); this.onBoss?.('leviathan'); return; }
      }
    }
    const ang = Math.random() * Math.PI * 2, dist = 22 + Math.random() * 20;
    const x = Math.floor(p.pos.x + Math.cos(ang) * dist), z = Math.floor(p.pos.z + Math.sin(ang) * dist);
    for (const q of players) if (Math.hypot(q.pos.x - x, q.pos.z - z) < 18) return;
    const col = this.gen.column(x, z);
    const night = daylight < 0.35;
    const r = Math.random();
    const sy = this.surfaceY(x, z);
    // animales sueltos: el bioparque y algunos que escaparon a otros biomas
    const herd = (t, n) => { for (let i = 0; i < n; i++) this.add(t, x + 0.5 + i * 0.9, sy, z + 0.5 + (i % 2) * 0.8); };
    if (sy != null && col.biome === BIOME.ZOO) {
      let n = 0; for (const t of ZOO_ANIMALS) n += count[t];
      if (n < 20 && r < 0.55) {
        const t = ZOO_ANIMALS[Math.floor(Math.random() * ZOO_ANIMALS.length)];
        herd(t, ['zebra', 'flamingo', 'penguin', 'monkey', 'ostrich', 'kangaroo'].includes(t) ? 2 + Math.floor(Math.random() * 2) : 1);
        return;
      }
    }
    // v12.7: murciélagos en las cuevas (cerca del jugador si está bajo tierra)
    {
      const py = Math.floor(p.pos.y), psy = this.surfaceY(Math.floor(p.pos.x), Math.floor(p.pos.z));
      if (psy != null && py < psy - 8 && count.bat < 5 && Math.random() < 0.35) {
        const bx = Math.floor(p.pos.x + (Math.random() - 0.5) * 16), bz = Math.floor(p.pos.z + (Math.random() - 0.5) * 16);
        for (let by = py + 1; by < py + 6; by++) if (this.world.getBlock(bx, by, bz) === 0 && this.world.getBlock(bx, by + 1, bz) === 0) { const m = this.add('bat', bx + 0.5, by + 0.5, bz + 0.5); if (m) m.homeY = by + 0.5; return; }
      }
    }
    // centro porteño: sin bichos peligrosos, con palomas en las plazas
    if (col.biome === BIOME.PORTENO) { if (sy != null && count.pigeon < 10 && r < 0.5) herd('pigeon', 2 + Math.floor(Math.random() * 3)); return; }
    if (sy != null && (col.biome === BIOME.CANYON || col.biome === BIOME.PEAKS) && r > 0.72 && count.goat < 6) { herd('goat', 2 + Math.floor(Math.random() * 2)); return; }
    if (sy != null && (col.biome === BIOME.CANYON || col.biome === BIOME.DESERT || col.biome === BIOME.SALT) && !night && r < 0.12 && count.lizard < 4) { herd('lizard', 1); return; }
    if (sy != null && col.biome === BIOME.TUNDRA && r > 0.92) { if (r > 0.97 && count.bear < 2) herd('bear', 1); else if (count.penguin < 6) herd('penguin', 3); return; }
    if (sy != null && (col.biome === BIOME.SWAMP || col.biome === BIOME.SALT) && r > 0.9) { if (r > 0.96 && count.crocodile < 3) herd('crocodile', 1); else if (count.flamingo < 6) herd('flamingo', 3); return; }
    if (sy != null && (col.biome === BIOME.DESERT || col.biome === BIOME.CANYON) && r > 0.94 && count.snake < 3) { herd('snake', 1); return; }
    if (sy != null) {
      if (col.biome === BIOME.CRATER && count.behemoth < 1 && Math.random() < 0.04) { this.add('behemoth', x + 0.5, sy, z + 0.5); this.onBoss?.(); return; }
      if (night && count.ghoul < 8 && r < 0.65 && !this.torchNear(x, sy, z, 7)) { this.add('ghoul', x + 0.5, sy, z + 0.5); return; }
      if (night && col.biome === BIOME.CITY && count.rat < 6 && r < 0.8 && !this.torchNear(x, sy, z, 6)) { for (let i = 0; i < 2 + (Math.random() < 0.5 ? 1 : 0); i++) this.add('rat', x + 0.5 + i * 0.6, sy, z + 0.5); return; }
      if (!night && count.crow < 4 && r > 0.85 && (col.biome === BIOME.FOREST || col.biome === BIOME.DESERT || col.biome === BIOME.BREW)) { this.add('crow', x + 0.5, sy + 8, z + 0.5); return; }
      if ((col.biome === BIOME.DESERT || col.biome === BIOME.CRATER || col.biome === BIOME.CANYON) && count.scorpion < 3 && r < 0.3) { this.add('scorpion', x + 0.5, sy, z + 0.5); return; }
      if (col.biome === BIOME.TUNDRA && count.wolf < 5 && r < 0.4) { for (let i = 0; i < 2 + (r < 0.15 ? 1 : 0); i++) this.add('wolf', x + 0.5 + i, sy, z + 0.5); return; }
      if (col.biome === BIOME.MUSHROOM && count.shroom < 5 && r < 0.45) { this.add('shroom', x + 0.5, sy, z + 0.5); return; }
      if ((col.biome === BIOME.FOREST || col.biome === BIOME.BREW) && count.dog < 2 && r > 0.92) { this.add('dog', x + 0.5, sy, z + 0.5); return; }
      if (col.biome !== BIOME.CITY && col.biome !== BIOME.CRATER && count.boar < 6 && r < (col.biome === BIOME.BREW ? 0.5 : 0.3)) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.add('boar', x + 0.5 + i * 0.8, sy, z + 0.5);
        return;
      }
    }
    // cuevas oscuras: necrófagos a cualquier hora
    if (count.ghoul < 8 && r < 0.35) {
      const cy = this.caveY(x, z, col.h);
      if (cy != null && !this.torchNear(x, cy, z, 7)) {
        if (count.rat < 6 && Math.random() < 0.4) { this.add('rat', x + 0.5, cy, z + 0.5); this.add('rat', x + 1.1, cy, z + 0.5); }
        else this.add('ghoul', x + 0.5, cy, z + 0.5);
      }
    }
  }

  // fauna de los Reinos de Eldra
  spawnEldra(p, players, daylight, count) {
    const ang = Math.random() * Math.PI * 2, dist = 22 + Math.random() * 20;
    const x = Math.floor(p.pos.x + Math.cos(ang) * dist), z = Math.floor(p.pos.z + Math.sin(ang) * dist);
    for (const q of players) if (Math.hypot(q.pos.x - x, q.pos.z - z) < 18) return;
    const col = this.gen.column(x, z), night = daylight < 0.35, r = Math.random(), b = col.biome;
    const sy = this.surfaceY(x, z);
    const add = (t, n = 1) => { for (let i = 0; i < n; i++) this.add(t, x + 0.5 + i * 0.9, sy, z + 0.5 + (i % 2) * 0.8); };
    if (sy != null) {
      if (night && !this.torchNear(x, sy, z, 7)) {
        if ((b === BIOME.PEAKS || b === BIOME.MIRE) && count.troll < 2 && r < 0.12) return add('troll');
        if (b !== BIOME.VALE || r < 0.4) { if (count.orc < 7 && r < 0.45) return add('orc', 1 + (r < 0.15 ? 1 : 0)); }
        if (count.warg < 5 && r > 0.75 && (b === BIOME.PEAKS || b === BIOME.ASHEN)) return add('warg', 2);
      }
      if (b === BIOME.MIRE && count.spider < 5 && r < 0.35) return add('spider');
      if (b === BIOME.ELFWOOD) {
        if (count.ent < 2 && r < 0.04) return add('ent');
        if (!night && count.elf < 2 && r > 0.95) { this.onTrader?.(); return add('elf'); }
        if (night && count.spider < 3 && r < 0.2) return add('spider');
      }
      if (b === BIOME.ASHEN && count.orc < 6 && r < 0.3) return add('orc', 2);
      if ((b === BIOME.VALE || b === BIOME.ELFWOOD) && !night && count.horse < 6 && r > 0.8) return add('horse', 2 + (r > 0.93 ? 1 : 0));
      if (b === BIOME.VALE && count.boar < 5 && r < 0.2) return add('boar', 1 + (r < 0.07 ? 1 : 0));
      if (b === BIOME.PEAKS && !night && count.boar < 4 && r < 0.12) return add('boar');
    }
    // cuevas oscuras: arañas
    if (count.spider < 6 && r < 0.3) {
      const cy = this.caveY(x, z, col.h);
      if (cy != null && !this.torchNear(x, cy, z, 7)) this.add('spider', x + 0.5, cy, z + 0.5);
    }
  }

  // --- red ---
  serialize() {
    const out = [];
    for (const m of this.list.values()) out.push([m.id, m.type, +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), +m.yaw.toFixed(2), m.hurt > 0 ? 1 : 0, m.dying ? 1 : 0, m.attackAnim ? 1 : 0]);
    return out;
  }
  applyRemote(list) {
    const seen = new Set();
    for (const [id, type, x, y, z, yaw, hurt, dying, atk] of list) {
      seen.add(id);
      let m = this.list.get(id);
      if (!m) { m = this.add(type, x, y, z, id); }
      m.target.set(x, y, z); m.targetYaw = yaw;
      if (hurt) m.hurt = 0.2; else m.hurt = 0;
      if (dying && !m.dying) m.dying = 0.001;
      if (atk && !m.attackAnim) m.attackAnim = 0.3;
      m.walking = m.pos.distanceToSquared(m.target) > 0.0025;
    }
    for (const m of [...this.list.values()]) if (!seen.has(m.id) && !m.dying) this.remove(m);
  }
}


// ---------- Ítems tirados en el suelo ----------
let DROP_ID = 1;
export class Drops {
  constructor(scene, world, icon) {
    this.scene = scene; this.world = world; this.icon = icon;
    this.list = new Map();
    this.texCache = new Map();
    this.authority = true;
    this.onPickupRemote = () => {};
  }
  tex(id) {
    let t = this.texCache.get(id);
    if (!t) { t = new THREE.CanvasTexture(this.icon(id)); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; this.texCache.set(id, t); }
    return t;
  }
  spawn(item, count, pos, vel, dur, id, q) {
    const d = { id: id ?? DROP_ID++, item, count, dur, q, pos: pos.clone(), vel: vel ? vel.clone() : new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2), age: 0 };
    d.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex(item), transparent: true, alphaTest: 0.2 }));
    d.sprite.scale.setScalar(0.42);
    this.scene.add(d.sprite);
    this.list.set(d.id, d);
    return d;
  }
  remove(d) { this.scene.remove(d.sprite); d.sprite.material.dispose(); this.list.delete(d.id); }
  clear() { for (const d of [...this.list.values()]) this.remove(d); }
  update(dt, players, daylight) {
    const w = this.world;
    for (const d of [...this.list.values()]) {
      d.age += dt;
      if (this.authority) {
        d.vel.y -= 20 * dt;
        const nx = d.pos.x + d.vel.x * dt, ny = d.pos.y + d.vel.y * dt, nz = d.pos.z + d.vel.z * dt;
        const under = w.getBlock(Math.floor(d.pos.x), Math.floor(d.pos.y - 0.15), Math.floor(d.pos.z));
        const belt = BLOCKS_REF[under]?.belt ? BLOCKS_REF[under].facing : null;
        if (belt) { d.pos.x += belt[0] * 2 * dt; d.pos.z += belt[1] * 2 * dt; d.pos.y = Math.floor(d.pos.y - 0.15) + 0.2; d.vel.set(0, 0, 0); if (d.age > 0.8) d.age = 0.5; }
        else if (SOLID[Math.max(0, w.getBlock(Math.floor(nx), Math.floor(ny - 0.15), Math.floor(nz)))] || w.getBlock(Math.floor(nx), Math.floor(ny - 0.15), Math.floor(nz)) === -1) { d.vel.set(0, 0, 0); }
        else d.pos.set(nx, ny, nz);
        // una tolva debajo se traga el ítem
        if (this.sim && w.getBlock(Math.floor(d.pos.x), Math.floor(d.pos.y - 0.5), Math.floor(d.pos.z)) === 134) {
          const c = this.sim.container(Math.floor(d.pos.x), Math.floor(d.pos.y - 0.5), Math.floor(d.pos.z));
          if (c && this.sim.insertInto(c, d.item, d.count, d.q)) { this.sim.touch(`${Math.floor(d.pos.x)},${Math.floor(d.pos.y - 0.5)},${Math.floor(d.pos.z)}`); this.remove(d); continue; }
        }
        if (d.age > 300) { this.remove(d); continue; }
        if (d.age > 0.8) {
          for (const p of players) {
            if (p.dead || p.pos.distanceTo(d.pos) > 1.6) continue;
            if (p.local) { const left = p.player.inv.add(d.item, d.count, { q: d.q, dur: d.dur }); p.player.sfx?.pickup?.(); if (left > 0) { d.count = left; continue; } }
            else this.onPickupRemote(p.id, d.item, d.count, d.dur);
            this.remove(d); break;
          }
          if (!this.list.has(d.id)) continue;
        }
      } else if (d.target) d.pos.lerp(d.target, Math.min(1, dt * 10));
      d.sprite.position.set(d.pos.x, d.pos.y + 0.12 + Math.sin(d.age * 3) * 0.06, d.pos.z);
      d.sprite.material.color.setScalar(0.35 + daylight * 0.65);
    }
  }
  serialize() { return [...this.list.values()].map((d) => [d.id, d.item, d.count, +d.pos.x.toFixed(2), +d.pos.y.toFixed(2), +d.pos.z.toFixed(2)]); }
  applyRemote(list) {
    const seen = new Set();
    for (const [id, item, count, x, y, z] of list) {
      seen.add(id);
      let d = this.list.get(id);
      if (!d) d = this.spawn(item, count, new THREE.Vector3(x, y, z), new THREE.Vector3(), undefined, id);
      d.count = count; d.target = new THREE.Vector3(x, y, z);
    }
    for (const d of [...this.list.values()]) if (!seen.has(d.id)) this.remove(d);
  }
}

// ---------- Virotes de ballesta (simulación local de quien dispara) ----------
const BOLT_GEO = new THREE.BoxGeometry(0.05, 0.05, 0.6);
const BOLT_MAT = new THREE.MeshLambertMaterial({ color: 0x6b5234 });
export class Projectiles {
  constructor(scene, world, mobs) { this.scene = scene; this.world = world; this.mobs = mobs; this.list = []; this.pvp = () => null; this.onHitPlayer = () => {}; this.onStuck = () => {}; }
  fire(origin, dir, dmg, shooter, item = 300, speed = 42) {
    const m = new THREE.Mesh(BOLT_GEO, BOLT_MAT);
    const p = { pos: origin.clone().addScaledVector(dir, 0.6), vel: dir.clone().multiplyScalar(speed), dmg, shooter, mesh: m, age: 0, stuck: false, item };
    this.scene.add(m); this.list.push(p);
  }
  update(dt) {
    for (const p of [...this.list]) {
      p.age += dt;
      if (!p.stuck) {
        p.vel.y -= 9 * dt;
        const step = p.vel.length() * dt;
        const dir = p.vel.clone().normalize();
        const hitMob = this.mobs.raycast(p.pos, dir, step);
        const hitBlock = this.world.raycast(p.pos, dir, step);
        const hitPl = this.pvp(p.pos, dir, step);
        const best = [hitMob && { t: 'm', d: hitMob.dist, h: hitMob }, hitBlock && { t: 'b', d: hitBlock.dist, h: hitBlock }, hitPl && { t: 'p', d: hitPl.dist, h: hitPl }].filter(Boolean).sort((a, b) => a.d - b.d)[0];
        if (best) {
          p.pos.addScaledVector(dir, best.d);
          if (best.t === 'm') { this.mobs.hit(best.h.mob, p.dmg, dir, p.shooter); p.shooter?.onEvent?.('shotHit', best.h.mob.type); if (p.fire) best.h.mob.burnT = 5; this.remove(p); continue; }
          if (best.t === 'p') { this.onHitPlayer(best.h.id, Math.round(p.dmg), dir); this.remove(p); continue; }
          p.stuck = true; p.age = 0;
          if (Math.random() < (p.item === 357 ? 0.6 : 0.4)) this.onStuck(p.pos.clone().addScaledVector(dir, -0.3), p.item);
        } else p.pos.addScaledVector(p.vel, dt);
        p.mesh.position.copy(p.pos);
        p.mesh.lookAt(p.pos.clone().add(p.vel));
      }
      if ((p.stuck && p.age > 6) || p.age > 8) this.remove(p);
    }
  }
  remove(p) { this.scene.remove(p.mesh); this.list.splice(this.list.indexOf(p), 1); }
  clear() { for (const p of [...this.list]) this.remove(p); }
}

// ---------- Vehículos ----------
// speed m/s · accel · turn rad/s · hw medio ancho · step escalón que sube · eye altura de cámara · tank nafta · use consumo · hp · storage baúl · ram atropello
export const VEHICLE_TYPES = {
  moto: { name: 'Moto de chatarra', speed: 15, accel: 4, turn: 2.2, hw: 0.45, step: 1.05, eye: 0.25, tank: 60, use: 0.25, hp: 60, seats: 1, storage: 0, item: 312 },
  cross: { name: 'Moto de cross', speed: 14, accel: 5, turn: 2.4, hw: 0.45, step: 1.6, eye: 0.3, tank: 60, use: 0.25, hp: 70, seats: 1, storage: 0, item: 342 },
  racebike: { name: 'Moto de pista', speed: 23, accel: 5.5, turn: 2.0, hw: 0.45, step: 0.55, eye: 0.2, tank: 50, use: 0.35, hp: 50, seats: 1, storage: 0, item: 343 },
  car: { name: 'Auto de chatarra', speed: 18, accel: 3, turn: 1.7, hw: 0.9, step: 1.05, eye: 0.35, tank: 90, use: 0.3, hp: 140, seats: 2, storage: 9, ram: 1, item: 340 },
  truck: { name: 'Camión', speed: 12, accel: 2, turn: 1.1, hw: 1.2, step: 1.05, eye: 1.0, tank: 140, use: 0.4, hp: 260, seats: 4, storage: 27, ram: 2, item: 341 },
  racecar: { name: 'Auto de carrera', speed: 27, accel: 5, turn: 1.9, hw: 0.9, step: 0.55, eye: 0.05, tank: 70, use: 0.45, hp: 90, seats: 1, storage: 0, ram: 1, item: 344 },
  ship: { name: 'Velero', speed: 14, accel: 2.5, turn: 1.3, hw: 1.3, step: 0.55, eye: 1.2, tank: 0, use: 0, hp: 160, seats: 3, storage: 18, boat: true, item: 402 },
  boat: { name: 'Bote', speed: 10, accel: 3, turn: 1.8, hw: 0.8, step: 0.55, eye: 0.3, tank: 0, use: 0, hp: 80, seats: 2, storage: 0, boat: true, item: 345 },
  balloon: { name: 'Globo aerostático', speed: 6.5, accel: 1.2, turn: 1.1, hw: 0.8, step: 1.05, eye: 0.6, tank: 400, use: 0.12, hp: 60, seats: 2, storage: 0, fly: true, climb: 0.45, item: 443 },
  heli: { name: 'Helicóptero', speed: 17, accel: 2.5, turn: 1.6, hw: 0.9, step: 1.05, eye: 0.5, tank: 120, use: 0.5, hp: 120, seats: 2, storage: 9, fly: true, item: 364 },
  cart: { name: 'Vagoneta', speed: 12, accel: 3, turn: 0, hw: 0.45, step: 1.05, eye: 0.2, tank: 0, use: 0, hp: 60, seats: 1, storage: 0, rail: true, item: 365 },
  train: { name: 'Tren del subte', speed: 19, accel: 2.5, turn: 0, hw: 0.45, step: 1.05, eye: 0.6, tank: 0, use: 0, hp: 300, seats: 4, storage: 0, rail: true, ram: 2 },
  mboar: { name: 'Jabalí de monta', speed: 10, accel: 5, turn: 2.6, hw: 0.45, step: 1.05, eye: 0.45, tank: 0, use: 0, hp: 40, seats: 1, storage: 0, mount: 'boar', jump: 9, mscale: 1.35, saddleY: 1.4 },
  mwolf: { name: 'Lobo de monta', speed: 13, accel: 6, turn: 2.8, hw: 0.4, step: 1.05, eye: 0.4, tank: 0, use: 0, hp: 36, seats: 1, storage: 0, mount: 'wolf', jump: 10, mscale: 1.45, saddleY: 1.02 },
  mzebra: { name: 'Cebra de monta', speed: 13, accel: 6, turn: 2.6, hw: 0.4, step: 1.05, eye: 0.7, tank: 0, use: 0, hp: 40, seats: 1, storage: 0, mount: 'zebra', jump: 9, mscale: 1.15, saddleY: 1.62 },
  mostrich: { name: 'Avestruz de monta', speed: 15.5, accel: 7, turn: 3, hw: 0.4, step: 1.05, eye: 1.0, tank: 0, use: 0, hp: 30, seats: 1, storage: 0, mount: 'ostrich', jump: 10, mscale: 1.05, saddleY: 1.92 },
  mhorse: { name: 'Caballo', speed: 16, accel: 6, turn: 2.7, hw: 0.45, step: 1.05, eye: 0.85, tank: 0, use: 0, hp: 40, seats: 1, storage: 0, mount: 'horse', jump: 9.5, mscale: 1.05, saddleY: 1.66 },
  melephant: { name: 'Elefante de monta', speed: 8, accel: 3, turn: 1.4, hw: 1.0, step: 1.05, eye: 2.1, tank: 0, use: 0, hp: 160, seats: 2, storage: 9, mount: 'elephant', jump: 0, ram: 2, mscale: 1, saddleY: 3.02 },
};
// piezas del taller: multiplicadores
export function tuneStats(v) {
  const t = v?.tune || {};
  return { speed: 1 + (t.engine || 0) * 0.08, accel: 1 + (t.engine || 0) * 0.12, turn: 1 + (t.tires || 0) * 0.12, grip: 1 + (t.tires || 0) * 0.3, armor: 1 + (t.armor || 0) * 0.5, nitro: !!t.nitro };
}
let VEH_ID = 1;
function vehicleModel(type) {
  const g = new THREE.Group();
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const B = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const tire = M(0x1a1a1a), steel = M(0x8a8e94), glass = new THREE.MeshLambertMaterial({ color: 0x8ab0c8, transparent: true, opacity: 0.6 }), glow = new THREE.MeshBasicMaterial({ color: 0xffe08a }), red = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
  const wheels4 = (w, l, r, y) => { for (const x of [-w, w]) for (const z of [-l, l]) B(0.3, r * 2, r * 2, tire, x, y, z); };
  if (type === 'car' || type === 'racecar' || type === 'truck') {
    if (type === 'car') {
      const body = M(0x9a5a30);
      wheels4(0.8, 1.15, 0.35, 0.35); B(1.6, 0.55, 3.0, body, 0, 0.72, 0); B(1.5, 0.5, 1.5, body, 0, 1.2, 0.2);
      B(1.46, 0.36, 0.05, glass, 0, 1.2, -0.56); B(1.46, 0.36, 0.05, glass, 0, 1.2, 0.96); B(0.05, 0.36, 1.2, glass, 0.76, 1.2, 0.2); B(0.05, 0.36, 1.2, glass, -0.76, 1.2, 0.2);
      B(0.3, 0.14, 0.06, glow, 0.5, 0.78, -1.52); B(0.3, 0.14, 0.06, glow, -0.5, 0.78, -1.52); B(0.3, 0.12, 0.06, red, 0.5, 0.78, 1.52); B(0.3, 0.12, 0.06, red, -0.5, 0.78, 1.52);
      B(1.6, 0.1, 0.3, steel, 0, 0.5, -1.55);
    } else if (type === 'racecar') {
      const body = M(0xc8302a), white = M(0xe8e8e8);
      wheels4(0.85, 1.2, 0.33, 0.33); B(1.2, 0.35, 3.2, body, 0, 0.5, 0); B(0.7, 0.35, 1.0, body, 0, 0.8, 0.3);
      B(0.72, 0.05, 1.0, white, 0, 0.99, 0.3); B(1.9, 0.08, 0.5, body, 0, 0.45, -1.65); B(1.8, 0.08, 0.4, body, 0, 1.15, 1.5); B(0.08, 0.5, 0.3, body, 0.8, 0.9, 1.5); B(0.08, 0.5, 0.3, body, -0.8, 0.9, 1.5);
      B(0.5, 0.3, 0.2, glass, 0, 0.95, -0.25); B(0.2, 0.1, 0.06, glow, 0.4, 0.55, -1.6); B(0.2, 0.1, 0.06, glow, -0.4, 0.55, -1.6);
    } else {
      const cab = M(0x5a6a4a), bed = M(0x6a5a4a);
      for (const x of [-1.0, 1.0]) for (const z of [-1.7, 0.5, 1.6]) B(0.36, 0.9, 0.9, tire, x, 0.45, z);
      B(2.2, 1.4, 1.5, cab, 0, 1.35, -1.6); B(2.1, 0.5, 0.06, glass, 0, 1.65, -2.36); B(2.2, 0.3, 4.6, steel, 0, 0.75, 0.2);
      B(2.2, 0.9, 3.0, bed, 0, 1.35, 1.0); B(2.0, 0.1, 2.8, M(0x3a3028), 0, 1.81, 1.0);
      B(0.3, 0.2, 0.06, glow, 0.8, 1.0, -2.37); B(0.3, 0.2, 0.06, glow, -0.8, 1.0, -2.37);
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(type === 'truck' ? 2.6 : 1.9, type === 'truck' ? 5 : 3.4), SHADOW_MAT); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    return g;
  }
  if (type === 'balloon') {
    const wicker = M(0x9a7444), rope = M(0x6a5a40), dark = M(0x2a2a2a);
    B(1.4, 0.8, 1.4, wicker, 0, 0.4, 0); B(1.5, 0.12, 1.5, M(0x7a5a34), 0, 0.82, 0);
    for (const [x, z] of [[0.65, 0.65], [-0.65, 0.65], [0.65, -0.65], [-0.65, -0.65]]) { const r = B(0.05, 2.8, 0.05, rope, x * 1.2, 2.2, z * 1.2); r.rotation.z = -x * 0.35; r.rotation.x = z * 0.35; }
    B(0.5, 0.3, 0.5, dark, 0, 1.5, 0);
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), new THREE.MeshBasicMaterial({ color: 0xffa040 })); flame.position.set(0, 1.85, 0); g.add(flame); g.userData.flame = flame;
    const cols = [0xd83a2a, 0xe8c040, 0xd83a2a, 0xe8c040, 0x3a7ad8, 0xe8c040, 0xd83a2a];
    const env = new THREE.Group(); env.position.y = 5.2; g.add(env);
    for (let i = 0; i < 7; i++) {
      const y0 = -1 + i * 0.5, r0 = Math.sin(Math.acos(Math.max(-1, Math.min(1, (y0 + 0.25) / 2.4)))) * 2.3 + 0.2;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r0, i === 0 ? 0.7 : r0 * 0.96, 0.5, 14), M(cols[i])); ring.position.y = y0 + 0.25 + (i === 0 ? 0 : 0); env.add(ring);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 0.5, 14), M(0xd83a2a)); top.position.y = 2.75; env.add(top);
    return g;
  }
  if (type === 'heli') {
    const body = M(0x4a5a3a), dark = M(0x2a3024);
    B(1.6, 1.3, 2.6, body, 0, 1.1, -0.2); B(1.5, 0.7, 0.05, glass, 0, 1.4, -1.52); B(0.05, 0.6, 1.2, glass, 0.81, 1.35, -0.8); B(0.05, 0.6, 1.2, glass, -0.81, 1.35, -0.8);
    B(0.35, 0.35, 3.0, body, 0, 1.3, 2.5); B(0.08, 0.9, 0.5, dark, 0, 1.6, 3.9);
    B(0.1, 0.1, 2.4, steel, 0.7, 0.2, -0.2); B(0.1, 0.1, 2.4, steel, -0.7, 0.2, -0.2); B(0.06, 0.4, 0.06, steel, 0.7, 0.4, -1); B(0.06, 0.4, 0.06, steel, -0.7, 0.4, -1); B(0.06, 0.4, 0.06, steel, 0.7, 0.4, 0.6); B(0.06, 0.4, 0.06, steel, -0.7, 0.4, 0.6);
    B(0.2, 0.3, 0.2, dark, 0, 1.9, -0.2);
    const rotor = new THREE.Group(); rotor.position.set(0, 2.08, -0.2);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.05, 0.3), dark); rotor.add(blade);
    const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; rotor.add(blade2);
    g.add(rotor); g.userData.rotor = rotor;
    const tr = new THREE.Group(); tr.position.set(0.22, 1.6, 3.9); tr.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.12), dark)); g.add(tr); g.userData.tailRotor = tr;
    B(0.2, 0.1, 0.06, glow, 0, 0.8, -1.52);
    return g;
  }
  if (type === 'cart' || type === 'train') {
    if (type === 'cart') {
      const iron = M(0x6a5a4a);
      B(0.9, 0.12, 1.3, iron, 0, 0.3, 0); B(0.08, 0.55, 1.3, iron, 0.45, 0.6, 0); B(0.08, 0.55, 1.3, iron, -0.45, 0.6, 0); B(0.9, 0.55, 0.08, iron, 0, 0.6, 0.65); B(0.9, 0.55, 0.08, iron, 0, 0.6, -0.65);
      for (const z of [-0.4, 0.4]) for (const x of [-0.42, 0.42]) B(0.1, 0.3, 0.3, tire, x, 0.18, z);
    } else {
      const paint = M(0xc8b23a), stripe = M(0x3a5a8a);
      B(1.9, 2.1, 7.5, paint, 0, 1.35, 0); B(1.92, 0.3, 7.52, stripe, 0, 0.9, 0);
      for (const z of [-2.6, -0.9, 0.9, 2.6]) { B(0.05, 0.7, 1.0, glass, 0.96, 1.7, z); B(0.05, 0.7, 1.0, glass, -0.96, 1.7, z); }
      B(1.6, 0.8, 0.05, glass, 0, 1.8, -3.76); B(0.3, 0.16, 0.06, glow, 0.6, 0.8, -3.77); B(0.3, 0.16, 0.06, glow, -0.6, 0.8, -3.77);
      for (const z of [-2.8, 2.8]) for (const x of [-0.6, 0.6]) B(0.2, 0.5, 0.5, tire, x, 0.25, z);
    }
    return g;
  }
  if (VEHICLE_TYPES[type]?.mount) {
    const VT = VEHICLE_TYPES[type];
    const m = buildModel(VT.mount);
    m.group.scale.setScalar(VT.mscale);
    g.add(m.group);
    B(0.55, 0.12, 0.55, M(0x5a3a1a), 0, VT.saddleY, 0.05); // montura
    g.userData.legs = m.parts.legs;
    return g;
  }
  if (type === 'ship') {
    const wood = M(0x7a5a38), dark = M(0x5a4028), sail = M(0xf0ece0), red = M(0xb83a2a);
    B(2.4, 0.3, 5.2, dark, 0, 0.3, 0); B(0.16, 0.9, 5.2, wood, 1.2, 0.75, 0); B(0.16, 0.9, 5.2, wood, -1.2, 0.75, 0);
    B(2.4, 0.9, 0.16, wood, 0, 0.75, 2.6); B(1.6, 0.8, 0.16, wood, 0, 0.75, -2.7); B(0.9, 0.7, 0.16, wood, 0, 0.75, -3.0);
    B(2.3, 0.1, 5.0, wood, 0, 0.62, 0); B(0.2, 0.12, 5.22, red, 1.22, 1.22, 0); B(0.2, 0.12, 5.22, red, -1.22, 1.22, 0);
    B(0.16, 5.5, 0.16, dark, 0, 3.4, -2.3); B(0.1, 0.1, 1.4, dark, 0, 2.0, -1.6);
    B(0.06, 3.2, 1.3, sail, 0, 3.7, -1.6); B(0.06, 1.4, 0.8, sail, 0, 4.4, -2.75);
    B(0.04, 0.4, 0.6, red, 0, 6.3, -2.1);
    return g;
  }
  if (type === 'boat') {
    const wood = M(0x7a5a38), dark = M(0x5a4028);
    B(1.4, 0.2, 2.8, dark, 0, 0.3, 0); B(0.12, 0.5, 2.8, wood, 0.7, 0.55, 0); B(0.12, 0.5, 2.8, wood, -0.7, 0.55, 0);
    B(1.4, 0.5, 0.12, wood, 0, 0.55, 1.4); B(1.0, 0.45, 0.12, wood, 0, 0.55, -1.45); B(1.3, 0.08, 0.3, wood, 0, 0.62, 0.3);
    B(0.06, 0.06, 1.6, dark, 0.9, 0.7, 0.2);
    return g;
  }
  // motos
  const color = { moto: 0x9a5a30, cross: 0xd9823b, racebike: 0xc8302a }[type] ?? 0x9a5a30;
  const rust = M(color), seat = M(0x3a2a1a);
  B(0.18, 0.55, 0.55, tire, 0, 0.28, -0.7); B(0.18, 0.55, 0.55, tire, 0, 0.28, 0.7);
  B(0.34, 0.3, 1.2, rust, 0, 0.62, 0); B(0.3, 0.12, 0.55, seat, 0, 0.82, 0.2);
  B(0.26, 0.26, 0.4, steel, 0, 0.55, 0.05); B(0.06, 0.5, 0.06, steel, 0, 0.85, -0.62);
  B(0.7, 0.06, 0.06, steel, 0, 1.1, -0.62); B(0.14, 0.12, 0.08, glow, 0, 0.9, -0.72);
  B(0.1, 0.1, 0.5, steel, 0.16, 0.4, 0.5);
  if (type === 'cross') { B(0.1, 0.4, 0.1, steel, 0, 0.35, -0.5); B(0.4, 0.06, 0.2, rust, 0, 0.92, -0.72); }
  if (type === 'racebike') { B(0.4, 0.4, 0.7, rust, 0, 0.75, -0.35); B(0.3, 0.2, 0.2, glass, 0, 1.0, -0.6); }
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14), SHADOW_MAT); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; sh.scale.set(0.5, 1.2, 1); g.add(sh);
  return g;
}
export class Vehicles {
  constructor(scene, world) { this.scene = scene; this.world = world; this.list = new Map(); this.authority = true; }
  spawn(pos, yaw, type = 'moto', id, state) {
    const T = VEHICLE_TYPES[type] ? type : 'moto';
    const v = { id: id ?? VEH_ID++, type: T, pos: pos.clone(), yaw, rider: null, vy: 0, mesh: vehicleModel(T), speed: 0, fuel: state?.fuel ?? VEHICLE_TYPES[T].tank, hp: state?.hp ?? VEHICLE_TYPES[T].hp, lights: false, tune: state?.tune ?? null, nitro: state?.nitro ?? 0 };
    if (v.tune?.paint) this.paint(v, v.tune.paint);
    if (typeof v.id === 'number' && v.id >= VEH_ID) VEH_ID = v.id + 1;
    this.scene.add(v.mesh); this.list.set(v.id, v);
    return v;
  }
  raycast(o, d, maxDist) {
    let best = null;
    for (const v of this.list.values()) {
      const hw = VEHICLE_TYPES[v.type].hw + 0.2, hl = hw * 1.8;
      // caja alineada aproximada (suficiente para apuntar)
      const mn = [v.pos.x - hl, v.pos.y, v.pos.z - hl], mx = [v.pos.x + hl, v.pos.y + 1.4, v.pos.z + hl];
      let t0 = 0, t1 = maxDist, ok = true;
      const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
      for (let i = 0; i < 3; i++) {
        if (Math.abs(D[i]) < 1e-9) { if (O[i] < mn[i] || O[i] > mx[i]) { ok = false; break; } continue; }
        let a = (mn[i] - O[i]) / D[i], b = (mx[i] - O[i]) / D[i];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && (!best || t0 < best.dist)) best = { veh: v, dist: t0 };
    }
    return best;
  }
  remove(v) { this.scene.remove(v.mesh); this.list.delete(v.id); }
  // pintura del taller: tiñe la carrocería (el material más usado que no sea goma, vidrio ni luz)
  paint(v, hex) {
    const count = new Map();
    v.mesh.traverse((o) => { const m = o.material; if (!o.isMesh || !m?.isMeshLambertMaterial || m.transparent || m.color.getHex() === 0x1a1a1a || m.color.getHex() === 0x8a8e94) return; count.set(m, (count.get(m) || 0) + 1); });
    const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) best[0].color.set(hex);
  }
  clear() { for (const v of [...this.list.values()]) this.remove(v); }
  nearest(pos, r = 3) { let best = null, bd = r; for (const v of this.list.values()) { const d = v.pos.distanceTo(pos); if (d < bd && !v.rider) { bd = d; best = v; } } return best; }
  update(dt) {
    for (const v of this.list.values()) {
      if (!v.rider && this.authority) {
        // cae hasta el piso
        v.vy -= 20 * dt;
        const ny = v.pos.y + v.vy * dt;
        const b = this.world.getBlock(Math.floor(v.pos.x), Math.floor(ny), Math.floor(v.pos.z));
        if (b === -1 || SOLID[b]) { v.vy = 0; } else v.pos.y = ny;
      } else if (v.target && v.rider !== 'local' && v.rider !== 'ai') { v.pos.lerp(v.target, Math.min(1, dt * 10)); let d = v.tyaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * Math.min(1, dt * 10); }
      v.mesh.position.copy(v.pos); v.mesh.rotation.y = v.yaw;
      // los botes flotan en el agua
      if (VEHICLE_TYPES[v.type].boat && !v.rider && this.authority && LIQ[this.world.getBlock(Math.floor(v.pos.x), Math.floor(v.pos.y + 0.2), Math.floor(v.pos.z))]) { v.pos.y += dt * 1.5; v.vy = 0; }
      v.mesh.rotation.z = v.rider ? Math.sin(performance.now() / 120) * 0.01 * Math.min(1, v.speed) : 0;
      const ud = v.mesh.userData;
      if (ud.flame) { const on = v.rider && (v.fuel ?? 1) > 0; ud.flame.visible = !!on; if (on) ud.flame.scale.setScalar(0.8 + Math.random() * 0.5); }
      if (ud.rotor) { const on = v.rider && (v.fuel ?? 1) > 0; v.spin = (v.spin || 0) + ((on ? 1 : 0) - (v.spin || 0)) * Math.min(1, dt * 0.8); ud.rotor.rotation.y += dt * 30 * v.spin; ud.tailRotor.rotation.x += dt * 40 * v.spin; v.mesh.rotation.x = v.rider ? -Math.min(0.2, (v.speed || 0) / 80) : 0; }
      if (ud.legs) { v.phase = (v.phase || 0) + dt * Math.min(16, (v.speed || 0) * 1.4); const s = Math.sin(v.phase) * 0.7 * Math.min(1, (v.speed || 0) / 2); ud.legs.forEach((l, i) => (l.rotation.x = i % 2 ? s : -s)); }
    }
  }
  serialize() { return [...this.list.values()].map((v) => [v.id, +v.pos.x.toFixed(2), +v.pos.y.toFixed(2), +v.pos.z.toFixed(2), +v.yaw.toFixed(2), v.rider, v.type, Math.round(v.fuel), Math.round(v.hp), v.lights ? 1 : 0, v.tune?.paint ?? 0, +(v.speed || 0).toFixed(1)]); }
  applyRemote(list, myId) {
    const seen = new Set();
    for (const [id, x, y, z, yaw, rider, type, fuel, hp, lights, paint, speed] of list) {
      seen.add(id);
      let v = this.list.get(id);
      if (!v) { v = this.spawn(new THREE.Vector3(x, y, z), yaw, type, id); }
      if (paint && paint !== v.tune?.paint) { v.tune = { ...(v.tune || {}), paint }; this.paint(v, paint); }
      if (v.rider !== 'local') v.speed = speed || 0;
      if (v.rider !== 'local') { v.fuel = fuel; v.hp = hp; v.lights = !!lights; }
      if (v.rider === 'local') continue;
      v.rider = rider === myId ? null : rider;
      v.target = new THREE.Vector3(x, y, z); v.tyaw = yaw;
    }
    for (const v of [...this.list.values()]) if (!seen.has(v.id) && v.rider !== 'local') this.remove(v);
  }
  save() { return [...this.list.values()].filter((v) => v.rider !== 'ai').map((v) => ({ x: v.pos.x, y: v.pos.y, z: v.pos.z, yaw: v.yaw, type: v.type, fuel: v.fuel, hp: v.hp, id: v.id, tune: v.tune ?? null, nitro: v.nitro ?? 0 })); }
}
