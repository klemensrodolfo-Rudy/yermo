// Genera los íconos PNG de la app (pixel-art: una "Y" naranja sobre el yermo al atardecer).
// Uso: node tools/make_icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// diseño de 16×16
const ART = [
  '................',
  '................',
  '..YY........YY..',
  '..YYY......YYY..',
  '...YYY....YYY...',
  '....YYY..YYY....',
  '.....YYYYYY.....',
  '......YYYY......',
  '......YYYY......',
  '......YYYY......',
  '......YYYY......',
  '......YYYY......',
  'gggggggggggggggg',
  'dgdddgdddgddgddd',
  'dddddddddddddddd',
  'dddddddddddddddd',
];
function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const cell = size / 16;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell), ch = ART[gy][gx];
    // cielo: degradé de atardecer
    const t = y / size;
    let c = [Math.round(60 + t * 120), Math.round(44 + t * 60), Math.round(40 + t * 20)];
    if (ch === 'Y') {
      const edge = (x % cell) < cell * 0.18 || (y % cell) < cell * 0.18;
      c = edge ? [255, 176, 96] : [217, 130, 59];
      const below = ART[gy + 1]?.[gx], right = ART[gy]?.[gx + 1];
      if ((below !== 'Y' && (y % cell) > cell * 0.8) || (right !== 'Y' && (x % cell) > cell * 0.8)) c = [120, 64, 28];
    } else if (ch === 'g') c = [110, 102, 64];
    else if (ch === 'd') c = [86, 64, 44];
    const i = (y * size + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return px;
}
for (const s of [192, 512, 180]) writeFileSync(new URL(`../icon-${s}.png`, import.meta.url), png(s, render(s)));
console.log('íconos listos');
