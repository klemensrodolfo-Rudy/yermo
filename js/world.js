// Gestión de chunks: carga/descarga, pool de workers, remallado y guardado.
import * as THREE from 'three';
import { CHUNK, HEIGHT, SOLID, LIQ } from './blocks.js';
import { PAD, W } from './mesher.js';
import { Storage } from './storage.js';

const key = (cx, cz) => cx + ',' + cz;

class Chunk {
  constructor(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.data = null;
    this.state = 'loading'; // loading | ready
    this.meshSolid = null; this.meshWater = null;
    this.dirty = false;        // necesita remallado
    this.meshing = false;
    this.version = 0;
    this.hasMesh = false;
    this.modified = false;
  }
}

export class World {
  constructor(scene, materials, meta) {
    this.scene = scene;
    this.mat = materials;
    this.meta = meta;
    this.chunks = new Map();
    this.renderDist = meta.renderDist ?? 6;
    this.savedKeys = new Set();
    this.unsaved = new Set();
    this.jobId = 0;
    this.pending = new Map();
    this.meshQueue = [];
    const n = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    this.workers = [];
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      w.postMessage({ type: 'init', seed: meta.seed, worldType: meta.worldType || 'normal' });
      w.busy = 0;
      w.onmessage = (e) => this.onWorker(w, e.data);
      w.onerror = (e) => console.error('worker error', e);
      this.workers.push(w);
    }
    this.genQueue = [];
    this.centerCx = 0; this.centerCz = 0;
    this.pendingEdits = new Map(); // key -> [[x,y,z,id]] para chunks no cargados
    this.remoteLoader = null;      // cliente online: pide chunks modificados al anfitrión
    this.noSave = false;
    this.onLocalSet = null;
    this.onChunkReady = null;   // (chunk) al tener datos
    this.onBlockChanged = null; // (x, y, z, antes, ahora)
  }

  applyPending(c) {
    const k = key(c.cx, c.cz);
    const list = this.pendingEdits.get(k);
    if (!list) return;
    this.pendingEdits.delete(k);
    for (const [x, y, z, id] of list) c.data[(x - c.cx * CHUNK) + ((z - c.cz * CHUNK) << 4) + (y << 8)] = id;
    c.modified = true; this.unsaved.add(k);
  }

  // edición que llega por red (o local sobre chunk no cargado)
  applyEdit(x, y, z, id) {
    if (this.setBlock(x, y, z, id, true)) return;
    const k = key(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
    if (!this.pendingEdits.has(k)) this.pendingEdits.set(k, []);
    this.pendingEdits.get(k).push([x, y, z, id]);
  }

  // anfitrión: datos de un chunk para un cliente
  async chunkForNet(k) {
    const c = this.chunks.get(k);
    if (c && c.state === 'ready') return c.modified ? { data: c.data.slice() } : { data: null };
    const edits = this.pendingEdits.get(k);
    if (this.savedKeys.has(k)) {
      const [cx, cz] = k.split(',').map(Number);
      const data = this.cloudLoad ? await this.cloudLoad(k).catch(() => null) : await Storage.loadChunk(this.meta.id, cx, cz).catch(() => null);
      if (data) {
        if (edits) for (const [x, y, z, id] of edits) data[(x - cx * CHUNK) + ((z - cz * CHUNK) << 4) + (y << 8)] = id;
        return { data };
      }
    }
    return { data: null, edits: edits ?? null };
  }

  async init() {
    const keys = await Storage.chunkKeys(this.meta.id);
    for (const k of keys) this.savedKeys.add(k.slice(k.indexOf(':') + 1));
  }

  worker() {
    let best = null;
    for (const w of this.workers) if (!best || w.busy < best.busy) best = w;
    return best.busy < 3 ? best : null;
  }

  onWorker(w, m) {
    w.busy--;
    const c = this.chunks.get(key(m.cx, m.cz));
    if (m.type === 'gen') {
      if (!c) return;
      c.data = m.data; c.state = 'ready';
      if (c.netEdits) { for (const [x, y, z, id] of c.netEdits) c.data[(x - c.cx * CHUNK) + ((z - c.cz * CHUNK) << 4) + (y << 8)] = id; c.netEdits = null; c.modified = true; }
      this.applyPending(c);
      this.onChunkReady?.(c);
      this.markNeighborsDirty(c.cx, c.cz, true);
    } else if (m.type === 'mesh') {
      if (!c) return;
      c.meshing = false;
      if (m.version !== c.version) { c.dirty = true; }
      this.applyMesh(c, m.mesh);
    }
  }

  markNeighborsDirty(cx, cz, includeSelf) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!includeSelf && !dx && !dz) continue;
      const c = this.chunks.get(key(cx + dx, cz + dz));
      if (c && c.state === 'ready') { c.dirty = true; c.version++; }
    }
  }

  geom(g, d) {
    g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
    g.setAttribute('lit', new THREE.BufferAttribute(d.lit, 4, true));
    g.setAttribute('tinf', new THREE.BufferAttribute(d.inf, 4, false));
    g.setAttribute('tint', new THREE.BufferAttribute(d.tint, 4, true));
    if (d.lcol) g.setAttribute('lcol', new THREE.BufferAttribute(d.lcol, 3, true));
    g.setIndex(new THREE.BufferAttribute(d.idx, 1));
    g.computeBoundingSphere();
  }

  applyMesh(c, mesh) {
    const put = (name, d, material, order) => {
      let m = c[name];
      if (d.idx.length === 0) { if (m) { this.scene.remove(m); m.geometry.dispose(); c[name] = null; } return; }
      if (!m) {
        m = new THREE.Mesh(new THREE.BufferGeometry(), material);
        m.position.set(c.cx * CHUNK, 0, c.cz * CHUNK);
        m.matrixAutoUpdate = false; m.updateMatrix();
        m.renderOrder = order;
        if (name === 'meshSolid') m.layers.enable(1); // proyecta sombras
        this.scene.add(m);
        c[name] = m;
      } else {
        m.geometry.dispose();
        m.geometry = new THREE.BufferGeometry();
      }
      this.geom(m.geometry, d);
    };
    put('meshSolid', mesh.solid, this.mat.solid, 0);
    put('meshWater', mesh.water, this.mat.water, 1);
    c.hasMesh = true;
  }

  neighborsReady(cx, cz) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const n = this.chunks.get(key(cx + dx, cz + dz));
      if (!n || n.state !== 'ready') return false;
    }
    return true;
  }

  buildVolume(cx, cz) {
    const vol = new Uint8Array(W * W * HEIGHT);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const d = this.chunks.get(key(cx + dx, cz + dz)).data;
      const vx0 = PAD + dx * CHUNK, vz0 = PAD + dz * CHUNK;
      const lx0 = Math.max(0, -vx0), lx1 = Math.min(CHUNK, W - vx0);
      const lz0 = Math.max(0, -vz0), lz1 = Math.min(CHUNK, W - vz0);
      if (lx0 >= lx1 || lz0 >= lz1) continue;
      for (let y = 0; y < HEIGHT; y++) for (let lz = lz0; lz < lz1; lz++) {
        const src = lx0 + (lz << 4) + (y << 8);
        const dst = (vx0 + lx0) + (vz0 + lz) * W + y * W * W;
        vol.set(d.subarray(src, src + (lx1 - lx0)), dst);
      }
    }
    return vol;
  }

  requestMesh(c) {
    const w = this.worker();
    if (!w) return false;
    c.dirty = false; c.meshing = true;
    const vol = this.buildVolume(c.cx, c.cz);
    // formas y decoración del sector: [índice en el volumen, material/tipo, rotación]
    let shapes = null;
    if (this.shapeInfo) {
      const d = c.data, list = [];
      for (let i = 0; i < d.length; i++) {
        const id = d[i];
        if (id !== 128 && id !== 129 && id !== 254 && id !== 255) continue;
        const lx = i & 15, lz = (i >> 4) & 15, y = i >> 8;
        const info = this.shapeInfo(c.cx * CHUNK + lx, y, c.cz * CHUNK + lz);
        if (info) list.push((PAD + lx) + (PAD + lz) * W + y * W * W, info[0], info[1]);
      }
      if (list.length) shapes = list;
    }
    w.busy++;
    w.postMessage({ type: 'mesh', cx: c.cx, cz: c.cz, version: c.version, vol, shapes }, [vol.buffer]);
    return true;
  }

  update(px, pz) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    const R = this.renderDist, LR = R + 1;
    // pedir chunks faltantes, ordenados por distancia
    const want = [];
    for (let dx = -LR; dx <= LR; dx++) for (let dz = -LR; dz <= LR; dz++) {
      if (dx * dx + dz * dz > LR * LR + 1) continue;
      const k = key(pcx + dx, pcz + dz);
      if (!this.chunks.has(k)) want.push([dx * dx + dz * dz - (this.bias ? (dx * this.bias.x + dz * this.bias.z) * 2.5 : 0), pcx + dx, pcz + dz]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cz] of want) {
      const k = key(cx, cz);
      if (this.savedKeys.has(k)) {
        const c = new Chunk(cx, cz); this.chunks.set(k, c);
        const load = this.remoteLoader ? this.remoteLoader(k) : Storage.loadChunk(this.meta.id, cx, cz).then((data) => ({ data }));
        load.then(({ data, edits }) => {
          if (this.chunks.get(k) !== c) return;
          if (data) { c.data = data; c.state = 'ready'; c.modified = true; this.applyPending(c); this.onChunkReady?.(c); this.markNeighborsDirty(cx, cz, true); }
          else { c.netEdits = edits; this.genQueue.push(c); }
        }).catch(() => { if (this.chunks.get(k) === c) this.genQueue.push(c); });
        continue;
      }
      const w = this.worker();
      if (!w) break;
      const c = new Chunk(cx, cz); this.chunks.set(k, c);
      w.busy++;
      w.postMessage({ type: 'gen', cx, cz });
    }
    while (this.genQueue.length) {
      const w = this.worker(); if (!w) break;
      const c = this.genQueue.shift();
      w.busy++; w.postMessage({ type: 'gen', cx: c.cx, cz: c.cz });
    }

    // remallar sucios cercanos primero
    const dirty = [];
    for (const c of this.chunks.values()) {
      if (!c.dirty || c.meshing || c.state !== 'ready') continue;
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > R * R + 1) continue;
      if (!this.neighborsReady(c.cx, c.cz)) continue;
      dirty.push([dx * dx + dz * dz - (c.priority ? 1000 : 0), c]);
    }
    dirty.sort((a, b) => a[0] - b[0]);
    let budget = 4;
    for (const [, c] of dirty) { if (budget-- <= 0 || !this.requestMesh(c)) break; c.priority = false; }

    // descargar lejanos
    const UR = LR + 2;
    for (const [k, c] of this.chunks) {
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > UR * UR) {
        if (c.modified && this.unsaved.has(k)) this.saveChunkNow(c);
        if (c.meshSolid) { this.scene.remove(c.meshSolid); c.meshSolid.geometry.dispose(); }
        if (c.meshWater) { this.scene.remove(c.meshWater); c.meshWater.geometry.dispose(); }
        this.chunks.delete(k);
      } else if (c.hasMesh) {
        const vis = dx * dx + dz * dz <= (R + 0.5) * (R + 0.5);
        if (c.meshSolid) c.meshSolid.visible = vis;
        if (c.meshWater) c.meshWater.visible = vis;
      }
    }
  }

  loadedAround(px, pz, r = 1) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const c = this.chunks.get(key(pcx + dx, pcz + dz));
      if (!c || !c.hasMesh) return false;
    }
    return true;
  }

  getBlock(x, y, z) {
    if (y < 0) return 1;
    if (y >= HEIGHT) return 0;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(key(cx, cz));
    if (!c || c.state !== 'ready') return -1;
    return c.data[(x - cx * CHUNK) + ((z - cz * CHUNK) << 4) + (y << 8)];
  }

  isSolid(x, y, z) {
    const b = this.getBlock(x, y, z);
    return b === -1 ? true : SOLID[b] === 1;
  }

  // volver a dibujar el sector de un bloque (cuando cambia su información, no su número)
  touchAt(x, z) { const c = this.chunks.get(key(Math.floor(x / CHUNK), Math.floor(z / CHUNK))); if (c && c.state === 'ready') { c.dirty = true; c.version++; c.priority = true; } }
  setBlock(x, y, z, id, remote = false) {
    if (y < 0 || y >= HEIGHT) return false;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(key(cx, cz));
    if (!c || c.state !== 'ready') return false;
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    const old = c.data[lx + (lz << 4) + (y << 8)];
    if (old === id) return true;
    c.data[lx + (lz << 4) + (y << 8)] = id;
    this.onBlockChanged?.(x, y, z, old, id);
    c.modified = true;
    if (!remote && this.onLocalSet) this.onLocalSet(x, y, z, id);
    const k = key(cx, cz);
    this.unsaved.add(k); this.savedKeys.add(k);
    // remallar: propio chunk con prioridad, vecinos (luz/caras)
    c.dirty = true; c.version++; c.priority = true;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const nx = lx + dx * 16, nz = lz + dz * 16;
      // ¿el bloque cae dentro del padding del vecino?
      const inPad = (dx === 0 || (dx < 0 ? lx < PAD : lx >= CHUNK - PAD)) && (dz === 0 || (dz < 0 ? lz < PAD : lz >= CHUNK - PAD));
      if (!inPad) continue;
      const n = this.chunks.get(key(cx + dx, cz + dz));
      if (n && n.state === 'ready') {
        n.dirty = true; n.version++;
        if ((dx === -1 && lx === 0) || (dx === 1 && lx === 15) || (dz === -1 && lz === 0) || (dz === 1 && lz === 15)) n.priority = true;
      }
      void nx; void nz;
    }
    return true;
  }

  saveChunkNow(c) {
    const k = key(c.cx, c.cz);
    this.unsaved.delete(k);
    if (this.noSave) return Promise.resolve();
    return Storage.saveChunks(this.meta.id, [{ cx: c.cx, cz: c.cz, data: c.data.slice() }]);
  }

  async saveAll() {
    if (this.noSave) return;
    const list = [];
    for (const k of this.unsaved) {
      const c = this.chunks.get(k);
      if (c && c.data) list.push({ cx: c.cx, cz: c.cz, data: c.data.slice() });
    }
    this.unsaved.clear();
    if (list.length) await (this.cloudSave ? this.cloudSave(list) : Storage.saveChunks(this.meta.id, list));
  }

  // DDA voxel raycast (liquids: detenerse también en fuentes de líquido)
  raycast(o, d, maxDist, liquids = false) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tmx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
    let tmy = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
    let tmz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
    let face = [0, 0, 0], t = 0;
    while (t <= maxDist) {
      const b = this.getBlock(x, y, z);
      if (b > 0 && (!LIQ[b] || (liquids && (b === 17 || b === 47 || b === 55)))) return { x, y, z, id: b, face, dist: t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; face = [-sx, 0, 0]; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; face = [0, -sy, 0]; }
      else { z += sz; t = tmz; tmz += tdz; face = [0, 0, -sz]; }
    }
    return null;
  }

  dispose() {
    for (const w of this.workers) w.terminate();
    for (const c of this.chunks.values()) {
      if (c.meshSolid) { this.scene.remove(c.meshSolid); c.meshSolid.geometry.dispose(); }
      if (c.meshWater) { this.scene.remove(c.meshWater); c.meshWater.geometry.dispose(); }
    }
    this.chunks.clear();
  }
}
