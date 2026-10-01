// Minimapa (esquina) y mapa grande (tecla M) a partir de los chunks explorados.
import { BLOCKS, CHUNK, HEIGHT, LIQ, ATLAS, tileRect } from './blocks.js';

export class MapView {
  constructor(atlas) {
    // color promedio de cada tile del atlas
    const ctx = atlas.getContext('2d');
    const SZ = ATLAS.size, img = ctx.getImageData(0, 0, SZ, SZ).data;
    this.tileColor = [];
    for (let t = 0; t < 256; t++) {
      const [tx, ty, R] = tileRect(t);
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = 0; y < R; y += 2) for (let x = 0; x < R; x += 2) {
        const i = ((ty + y) * SZ + tx + x) * 4;
        if (img[i + 3] < 100) continue;
        r += img[i]; g += img[i + 1]; b += img[i + 2]; n++;
      }
      this.tileColor[t] = n ? [r / n, g / n, b / n] : [0, 0, 0];
    }
    this.cache = new Map(); // "cx,cz" -> {canvas, version}
    this.mini = document.getElementById('minimap');
    this.big = document.getElementById('bigmap');
    this.acc = 0;
    this.zoom = 2;
    this.bigRadius = 110; this.panX = 0; this.panZ = 0;
  }

  chunkImage(c) {
    const k = c.cx + ',' + c.cz;
    let e = this.cache.get(k);
    if (e && e.version === c.version) return e.canvas;
    if (!e) { const cv = document.createElement('canvas'); cv.width = cv.height = CHUNK; e = { canvas: cv }; this.cache.set(k, e); }
    e.version = c.version;
    const ctx = e.canvas.getContext('2d');
    const id = ctx.createImageData(CHUNK, CHUNK);
    const d = c.data;
    const heights = new Int16Array(CHUNK * CHUNK);
    for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
      let y = HEIGHT - 1, b = 0;
      for (; y > 0; y--) { b = d[x + (z << 4) + (y << 8)]; if (b && b !== 16) break; }
      heights[x + z * CHUNK] = y;
      const blk = BLOCKS[b];
      let col = blk?.tex ? this.tileColor[blk.tex.top] : [0, 0, 0];
      if (LIQ[b] === 1) col = [110, 140, 42]; else if (LIQ[b] === 2) col = [58, 122, 184]; else if (LIQ[b] === 3) col = [216, 74, 26];
      const i = (x + z * CHUNK) * 4;
      id.data[i] = col[0]; id.data[i + 1] = col[1]; id.data[i + 2] = col[2]; id.data[i + 3] = 255;
    }
    // relieve: sombrear según la altura del vecino del noroeste
    for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
      const h = heights[x + z * CHUNK], hn = heights[Math.max(0, x - 1) + Math.max(0, z - 1) * CHUNK];
      const k = h > hn ? 1.15 : h < hn ? 0.8 : 1;
      const i = (x + z * CHUNK) * 4;
      id.data[i] *= k; id.data[i + 1] *= k; id.data[i + 2] *= k;
    }
    ctx.putImageData(id, 0, 0);
    return e.canvas;
  }

  refresh(world) {
    let n = 0;
    for (const c of world.chunks.values()) {
      if (c.state !== 'ready') continue;
      const e = this.cache.get(c.cx + ',' + c.cz);
      if (!e || e.version !== c.version) { this.chunkImage(c); if (++n > 6) break; }
    }
  }

  draw(canvas, px, pz, yaw, radius, markers, ox = 0, oz = 0) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, scale = W / (radius * 2);
    const ppx = px, ppz = pz; px += ox; pz += oz; // centro del mapa (puede estar corrido) y posición real del jugador
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#14120f'; ctx.fillRect(0, 0, W, W);
    const c0x = Math.floor((px - radius) / CHUNK), c1x = Math.floor((px + radius) / CHUNK);
    const c0z = Math.floor((pz - radius) / CHUNK), c1z = Math.floor((pz + radius) / CHUNK);
    for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
      const e = this.cache.get(cx + ',' + cz);
      if (!e) continue;
      ctx.drawImage(e.canvas, (cx * CHUNK - px + radius) * scale, (cz * CHUNK - pz + radius) * scale, CHUNK * scale + 0.5, CHUNK * scale + 0.5);
    }
    const toXY = (x, z) => [(x - px + radius) * scale, (z - pz + radius) * scale];
    // etiquetas sin encimarse: si choca con otra ya escrita, se omite
    const used = [];
    const label = (txt, lx, ly, font) => {
      ctx.font = font; const w = ctx.measureText(txt).width;
      const r = [lx, ly - 13, lx + w, ly + 3];
      if (used.some((u) => r[0] < u[2] && r[2] > u[0] && r[1] < u[3] && r[3] > u[1])) return;
      used.push(r);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(r[0] - 2, r[1], w + 4, 17);
      ctx.fillStyle = '#fff'; ctx.fillText(txt, lx, ly);
    };
    for (const m of markers) {
      let [x, y] = toXY(m.x, m.z);
      if (x < -8 || y < -8 || x > W + 8 || y > W + 8) {
        if ((m.kind !== 'poi' && m.kind !== 'npc') || (m.kind === 'poi' && canvas !== this.big)) continue;
        // fuera del mapa: marcar en el borde con la distancia
        const cx = W / 2, cy = W / 2, dx = x - cx, dy = y - cy, k = (W / 2 - 14) / Math.max(Math.abs(dx), Math.abs(dy));
        const dist = Math.round(Math.hypot(m.x - px, m.z - pz));
        x = cx + dx * k; y = cy + dy * k;
        ctx.fillStyle = m.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (canvas === this.big) label(`${m.label} ${dist} m`, Math.min(W - 130, Math.max(4, x + 7)), Math.min(W - 6, Math.max(16, y + 4)), '15px VT323, monospace');
        continue;
      }
      ctx.fillStyle = m.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (m.kind === 'home') { ctx.rect(x - 4, y - 4, 8, 8); }
      else if (m.kind === 'poi') { ctx.moveTo(x, y - 7); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 6, y); ctx.closePath(); }
      else if (m.kind === 'npc') { ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y + 5); ctx.lineTo(x - 5, y + 5); ctx.closePath(); }
      else ctx.arc(x, y, m.kind === 'boss' ? 6 : 4, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (m.label && (canvas === this.big || m.kind === 'npc')) label(m.label, x + 7, y + 4, canvas === this.big ? '16px VT323, monospace' : '12px VT323, monospace');
    }
    // flecha del jugador
    ctx.save(); ctx.translate((ppx - px + radius) * scale, (ppz - pz + radius) * scale); ctx.rotate(-yaw);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // norte
    ctx.fillStyle = '#d9823b'; ctx.font = '16px Silkscreen, monospace'; ctx.fillText('N', W / 2 - 5, 14);
  }

  update(dt, world, player, markers, bigOpen) {
    this.acc += dt;
    if (this.acc < (bigOpen ? 0.08 : 0.3)) return;
    this.acc = 0;
    this.refresh(world);
    this.draw(this.mini, player.pos.x, player.pos.z, player.yaw, 64, markers);
    if (bigOpen) this.draw(this.big, player.pos.x, player.pos.z, player.yaw, this.bigRadius, markers, this.panX, this.panZ);
  }
  // de un punto del mapa grande (en píxeles de pantalla) a coordenadas del mundo
  bigToWorld(clientX, clientY, player) {
    const r = this.big.getBoundingClientRect(), radius = this.bigRadius;
    return { x: player.pos.x + this.panX + ((clientX - r.left) / r.width * 2 - 1) * radius, z: player.pos.z + this.panZ + ((clientY - r.top) / r.height * 2 - 1) * radius };
  }
}
