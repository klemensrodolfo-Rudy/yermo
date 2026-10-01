// Partidas online.
//  · Modo anfitrión (PeerJS/WebRTC): quien abre la sala es la autoridad (mundo, criaturas, clima, máquinas).
//  · Modo servidor dedicado (WebSocket, `node server.js --dedicado`): el servidor guarda el mundo y
//    elige a un jugador como autoridad para la simulación; si se va, pasa a otro.
import * as THREE from 'three';
import { patternTex, scaleBoxUV } from './entities.js';

const PREFIX = 'yermo-v4-';
let PeerCtor = null;
async function loadPeer() {
  if (PeerCtor) return PeerCtor;
  const m = await import('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/+esm');
  PeerCtor = m.Peer ?? m.default;
  return PeerCtor;
}
const makeCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const b64 = {
  enc(u8) { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); },
  dec(str) { const s = atob(str); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; },
};

export const TEAMS = { none: { name: 'Sin equipo', color: '#ffffff' }, rojo: { name: 'Rojo', color: '#ff5a4a' }, azul: { name: 'Azul', color: '#4a9aff' }, verde: { name: 'Verde', color: '#7ad84a' }, amarillo: { name: 'Amarillo', color: '#ffd84a' } };

// ---------- Avatares de otros jugadores ----------
const COLORS = [0xc0662a, 0x3a7ac0, 0x7ac03a, 0xc03a8a, 0xc0b03a, 0x3ac0b0];
function nameSprite(name, color = '#fff') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const x = c.getContext('2d');
  x.font = '32px VT323, monospace'; x.textAlign = 'center';
  const w = x.measureText(name).width + 20;
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(128 - w / 2, 4, w, 40);
  x.fillStyle = color; x.fillText(name, 128, 36);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(2, 0.375, 1); s.position.y = 2.25; s.renderOrder = 10;
  return s;
}
export const EMOTES = {
  wave: { icon: '👋', name: 'Saludar', txt: 'saluda' }, yes: { icon: '👍', name: 'Sí', txt: 'asiente' }, no: { icon: '👎', name: 'No', txt: 'niega con la cabeza' },
  laugh: { icon: '😂', name: 'Reír', txt: 'se ríe' }, cheers: { icon: '🍺', name: 'Brindar', txt: 'levanta la cerveza: ¡salud!' }, dance: { icon: '💃', name: 'Bailar', txt: 'baila' },
  angry: { icon: '😡', name: 'Enojarse', txt: 'está furioso' }, sit: { icon: '🪑', name: 'Sentarse', txt: 'se sienta a descansar' }, help: { icon: '🆘', name: 'Pedir ayuda', txt: 'pide ayuda' },
};
export class Avatar {
  constructor(scene, id, name, idx) {
    this.id = id; this.name = name; this.scene = scene; this.team = 'none';
    this.pos = new THREE.Vector3(); this.target = new THREE.Vector3(); this.yaw = 0; this.tyaw = 0; this.pitch = 0;
    this.dead = false; this.creative = false; this.phase = 0; this.seen = false; this.riding = 0;
    const g = new THREE.Group();
    const col = COLORS[idx % COLORS.length];
    // materiales con textura (tela, jean, piel, cuero) que se repite según el tamaño de cada pieza
    const M = (c, pat) => new THREE.MeshLambertMaterial({ color: c, map: pat ? patternTex(pat) : null });
    const B = (w, h, d, m, x, y, z) => { const geo = new THREE.BoxGeometry(w, h, d); if (m.map) scaleBoxUV(geo, w, h, d, 3); const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
    const jacket = M(col, 'cloth'), pants = M(0x3a3530, 'denim'), skin = M(0xb08a6a, 'skin'), mask = M(0x2a2a2a, 'skin'), lens = new THREE.MeshBasicMaterial({ color: 0x9cff3a });
    const boot = M(0x2a2018, 'skin'), leather = M(0x5a3e26, 'skin'), dark = M(0x1e1a16), white = M(0xe8e4dc), hairM = M(0x3a2a1a, 'fur'), lip = M(0x7a4038);
    const trim = M(0x2a2622, 'cloth');
    this.mats = { jacket, pants, skin, mask, lens };
    this.legs = [];
    for (const x of [0.13, -0.13]) {
      const l = new THREE.Group(); l.position.set(x, 0.75, 0);
      l.add(B(0.24, 0.75, 0.24, pants, 0, -0.375, 0));
      l.add(B(0.27, 0.18, 0.32, boot, 0, -0.68, -0.03)); // botas
      g.add(l); this.legs.push(l);
    }
    g.add(B(0.52, 0.72, 0.28, jacket, 0, 1.11, 0));
    g.add(B(0.04, 0.62, 0.02, trim, 0, 1.12, -0.145)); // cierre
    g.add(B(0.14, 0.12, 0.02, trim, 0.15, 0.98, -0.145)); g.add(B(0.14, 0.12, 0.02, trim, -0.15, 0.98, -0.145)); // bolsillos
    g.add(B(0.54, 0.08, 0.3, leather, 0, 0.79, 0)); g.add(B(0.08, 0.07, 0.02, M(0xb8a060), 0, 0.79, -0.155)); // cinturón y hebilla
    g.add(B(0.4, 0.46, 0.18, leather, 0, 1.13, 0.23)); g.add(B(0.44, 0.13, 0.13, M(0x6a6a4a, 'cloth'), 0, 1.42, 0.25)); // mochila y bolsa de dormir
    this.arms = [];
    for (const x of [0.36, -0.36]) {
      const a = new THREE.Group(); a.position.set(x, 1.44, 0);
      a.add(B(0.18, 0.7, 0.18, jacket, 0, -0.33, 0));
      a.add(B(0.16, 0.14, 0.16, skin, 0, -0.74, 0)); // mano
      g.add(a); this.arms.push(a);
    }
    this.head = new THREE.Group(); this.head.position.set(0, 1.65, 0);
    this.head.add(B(0.44, 0.44, 0.44, skin, 0, 0.1, 0));
    // cara (se tapa con la máscara de gas)
    this.faceMeshes = [
      B(0.08, 0.06, 0.02, white, 0.1, 0.12, -0.225), B(0.08, 0.06, 0.02, white, -0.1, 0.12, -0.225),
      B(0.04, 0.05, 0.02, dark, 0.09, 0.12, -0.235), B(0.04, 0.05, 0.02, dark, -0.09, 0.12, -0.235),
      B(0.1, 0.03, 0.02, hairM, 0.1, 0.19, -0.226), B(0.1, 0.03, 0.02, hairM, -0.1, 0.19, -0.226),
      B(0.06, 0.08, 0.05, skin, 0, 0.04, -0.235), B(0.13, 0.03, 0.02, lip, 0, -0.04, -0.226),
    ];
    this.faceMeshes.forEach((m) => this.head.add(m));
    this.hair = [B(0.46, 0.1, 0.46, hairM, 0, 0.33, 0.01), B(0.46, 0.22, 0.08, hairM, 0, 0.2, 0.2)];
    this.hair.forEach((m) => this.head.add(m));
    this.maskMeshes = [B(0.46, 0.2, 0.1, mask, 0, 0.05, -0.2), B(0.1, 0.08, 0.02, lens, 0.1, 0.12, -0.26), B(0.1, 0.08, 0.02, lens, -0.1, 0.12, -0.26), B(0.12, 0.12, 0.08, mask, 0, -0.02, -0.28)];
    this.maskMeshes.forEach((m) => this.head.add(m));
    this.hat = B(0.5, 0.14, 0.5, M(0x5a5048, 'cloth'), 0, 0.36, 0); this.hat.visible = false; this.head.add(this.hat);
    g.add(this.head);
    this.tag = nameSprite(name);
    g.add(this.tag);
    this.group = g;
    scene.add(g);
  }
  setSkin(s) {
    if (!s || s === this.skinKey) return;
    this.skinKey = s;
    const [jacket, pants, mask, hat, skinTone] = s.split('|');
    // las texturas oscurecen un poco: se compensa el color
    this.mats.jacket.color.set('#' + jacket).multiplyScalar(1.12); this.mats.pants.color.set('#' + pants).multiplyScalar(1.12); this.mats.skin.color.set('#' + skinTone).multiplyScalar(1.1);
    this.maskMeshes.forEach((m) => (m.visible = mask === 'gas'));
    this.faceMeshes.forEach((m) => (m.visible = mask !== 'gas'));
    this.hat.visible = hat !== 'none';
    this.hair[0].visible = hat === 'none';
    if (hat === 'casco') this.hat.material.color.set(0x8a8e94); else if (hat === 'gorro') this.hat.material.color.set(0xc8302a); else if (hat === 'sombrero') this.hat.material.color.set(0x6a4a2a);
  }
  setName(name) {
    if (!name || name === this.name) return;
    this.name = name;
    this.group.remove(this.tag); this.tag.material.map.dispose(); this.tag.material.dispose();
    this.tag = nameSprite(name, TEAMS[this.team]?.color); this.group.add(this.tag);
  }
  setTeam(team) {
    if (team === this.team) return;
    this.team = team;
    this.group.remove(this.tag); this.tag.material.map.dispose(); this.tag.material.dispose();
    this.tag = nameSprite(this.name, TEAMS[team]?.color); this.group.add(this.tag);
  }
  update(dt) {
    const moved = this.pos.distanceTo(this.target);
    this.pos.lerp(this.target, Math.min(1, dt * 12));
    let d = this.tyaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12);
    const walking = moved > 0.02 && !this.riding ? 1 : 0;
    this.phase += dt * 9 * walking;
    const s = Math.sin(this.phase) * 0.7 * walking;
    this.legs[0].rotation.x = this.riding ? -1.2 : s; this.legs[1].rotation.x = this.riding ? -1.2 : -s;
    this.arms[0].rotation.x = this.riding ? -1 : -s * 0.8 - (this.swing || 0); this.arms[1].rotation.x = this.riding ? -1 : s * 0.8;
    this.swing = Math.max(0, (this.swing || 0) - dt * 4);
    this.head.rotation.x = -this.pitch;
    this.group.position.copy(this.pos); if (this.riding) this.group.position.y += 0.35;
    this.group.rotation.y = this.yaw;
    this.group.visible = !this.dead && this.seen;
    this.animEmote(dt);
  }
  // gestos: burbuja sobre la cabeza y animación por unos segundos
  emote(e) {
    if (this.bubble) { this.group.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); }
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(64, 58, 50, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(50, 100); x.lineTo(64, 124); x.lineTo(78, 100); x.fill();
    x.font = '64px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(EMOTES[e]?.icon ?? '❓', 64, 60);
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    this.bubble.scale.set(0.7, 0.7, 1); this.bubble.position.y = 2.75; this.bubble.renderOrder = 12;
    this.group.add(this.bubble);
    this.emoteKind = e; this.emoteT = 3.5;
  }
  animEmote(dt) {
    if (!(this.emoteT > 0)) { if (this.bubble) { this.group.remove(this.bubble); this.bubble = null; } return; }
    this.emoteT -= dt;
    const t = performance.now() / 1000, e = this.emoteKind;
    if (e === 'wave') { this.arms[0].rotation.x = -2.8; this.arms[0].rotation.z = Math.sin(t * 10) * 0.4; }
    else if (e === 'cheers') { this.arms[0].rotation.x = -2.2; }
    else if (e === 'dance') { this.group.rotation.y += t % 1 < 0.5 ? 0.3 : -0.3; this.arms[0].rotation.x = -2.6 + Math.sin(t * 8) * 0.5; this.arms[1].rotation.x = -2.6 - Math.sin(t * 8) * 0.5; this.group.position.y += Math.abs(Math.sin(t * 8)) * 0.15; }
    else if (e === 'laugh') this.head.rotation.x = -0.3 + Math.sin(t * 20) * 0.15;
    else if (e === 'no') this.head.rotation.y = Math.sin(t * 12) * 0.5;
    else if (e === 'yes') this.head.rotation.x = Math.sin(t * 10) * 0.4;
    else if (e === 'angry') { this.arms[0].rotation.x = -1.6 + Math.sin(t * 14) * 0.6; }
    else if (e === 'sit') { this.legs[0].rotation.x = this.legs[1].rotation.x = -1.4; this.group.position.y -= 0.5; }
    if (this.emoteT <= 0) { this.arms[0].rotation.z = 0; this.head.rotation.y = 0; }
  }
  // caja para PvP
  hitTest(o, d, max) {
    const mn = [this.pos.x - 0.35, this.pos.y, this.pos.z - 0.35], mx = [this.pos.x + 0.35, this.pos.y + 1.9, this.pos.z + 0.35];
    let t0 = 0, t1 = max;
    const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(D[i]) < 1e-9) { if (O[i] < mn[i] || O[i] > mx[i]) return null; continue; }
      let a = (mn[i] - O[i]) / D[i], b = (mx[i] - O[i]) / D[i];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) return null;
    }
    return t0;
  }
  dispose() { this.scene.remove(this.group); this.group.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose?.(); o.material?.dispose?.(); }); }
}

export class Net {
  constructor() {
    this.peer = null; this.role = null; this.code = null; this.transport = null; // 'peer' | 'ws'
    this.conns = new Map();
    this.conn = null; this.ws = null;
    this.avatars = new Map();
    this.game = null; this.scene = null;
    this.sendAcc = 0; this.saveAcc = 0;
    this.myId = null; this.myName = 'Superviviente'; this.team = 'none';
    this.authority = false;
    this.pvp = false;
    this.onChat = () => {}; this.onClosed = () => {}; this.onAuthority = () => {}; this.onRace = () => {}; this.onFx = () => {};
    this.skin = ''; this.hostPeerId = null; this.public = false; this.lobbyAcc = 0;
    this.pendingChunk = new Map();
  }
  get active() { return !!this.role; }
  get isHost() { return this.role === 'host'; }
  get isClient() { return this.role === 'client'; }

  // ================= ANFITRIÓN (PeerJS) =================
  async host(game, scene, name) {
    const Peer = await loadPeer();
    this.game = game; this.scene = scene; this.myName = name; this.myId = 'host';
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = makeCode();
      try {
        this.peer = await new Promise((res, rej) => {
          const p = new Peer(PREFIX + code);
          p.on('open', () => res(p));
          p.on('error', (e) => rej(e));
        });
        this.code = code;
        break;
      } catch (e) { if (attempt === 2) throw e; }
    }
    this.role = 'host'; this.transport = 'peer'; this.authority = true;
    this.hostPeerId = this.peer.id;
    this.peer.on('connection', (conn) => this.acceptConn(conn));
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch { /* ignorar */ } });
    return this.code;
  }

  acceptConn(conn) {
    conn.on('open', () => {
      if (this.conns.size >= 7) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      this.conns.set(conn.peer, { conn, name: '...' });
    });
    conn.on('data', (m) => this.onHostData(conn, m));
    conn.on('close', () => this.dropPeer(conn.peer));
    conn.on('error', () => this.dropPeer(conn.peer));
  }

  helloFor(id, name) {
    const g = this.game;
    return {
      t: 'hello', seed: g.meta.seed, mode: g.meta.mode, worldType: g.meta.worldType || 'normal', time: g.time, you: id, rules: g.meta.rules,
      keys: [...g.world.savedKeys, ...g.world.pendingEdits.keys()],
      spawn: g.meta.spawn ?? g.meta.origin, hostName: this.myName,
      containers: g.sim.serialize(), guest: g.meta.guests?.[name] ?? null, pvp: this.pvp,
    };
  }

  dropPeer(id) {
    const c = this.conns.get(id);
    if (!c) return;
    this.conns.delete(id);
    const a = this.avatars.get(id); if (a) { a.dispose(); this.avatars.delete(id); }
    // su moto queda donde estaba
    for (const v of this.game?.vehicles.list.values() ?? []) if (v.rider === id) v.rider = null;
    this.onChat(null, `${c.name} salió de la partida`);
    this.broadcast({ t: 'chat', name: null, text: `${c.name} salió de la partida` });
  }

  broadcast(m, except) { for (const [id, c] of this.conns) if (id !== except && c.conn.open) c.conn.send(m); }

  async onHostData(conn, m) {
    const g = this.game, c = this.conns.get(conn.peer);
    if (!c || !g) return;
    const from = conn.peer;
    if (m.to) { // reenviar mensajes dirigidos
      if (m.to === 'host') this.onClientData({ ...m, from });
      else this.sendTo(m.to, { ...m, from });
      return;
    }
    switch (m.t) {
      case 'join': {
        c.name = String(m.name || 'Superviviente').slice(0, 20);
        conn.send(this.helloFor(from, c.name));
        this.avatarFor(from, c.name);
        this.onChat(null, `${c.name} se unió a la partida`);
        this.broadcast({ t: 'chat', name: null, text: `${c.name} se unió a la partida` });
        break;
      }
      case 'getChunk': {
        const r = await g.world.chunkForNet(m.k);
        if (conn.open) conn.send({ t: 'chunk', k: m.k, data: r.data, edits: r.edits });
        break;
      }
      case 'set': {
        const a = this.avatars.get(from);
        if (!g.sim.canEdit(m.x, m.z, c.name, a?.team)) { const cur = g.world.getBlock(m.x, m.y, m.z); if (cur >= 0) conn.send({ t: 'set', x: m.x, y: m.y, z: m.z, id: cur }); break; }
        g.world.applyEdit(m.x, m.y, m.z, m.id);
        this.broadcast(m, from);
        break;
      }
      case 'race': this.onRace(m); this.broadcast(m, from); break;
      case 'fx':
        if (m.op === 'rename') { c.name = String(m.name).slice(0, 20); const a = this.avatars.get(from); a?.setName(c.name); this.onChat(null, `${m.old} ahora se llama ${c.name}`); }
        this.onFx({ ...m, from }); this.broadcast({ ...m, from }, from);
        break;
      case 'pos': this.applyPos(from, c.name, m); break;
      case 'chat': {
        const text = String(m.text).slice(0, 160);
        this.onChat(c.name, text);
        this.broadcast({ t: 'chat', name: c.name, text }, from);
        break;
      }
      case 'save': {
        g.meta.guests = g.meta.guests || {};
        g.meta.guests[c.name] = m.data;
        break;
      }
      case 'cont':
        g.sim.setRemote(m.k, m.c);
        this.broadcast(m, from);
        this.game.onRemoteContainer?.(m.k);
        break;
      default: this.authorityMsg(from, m);
    }
  }

  // mensajes que procesa quien tiene la autoridad (anfitrión o jugador elegido por el servidor)
  authorityMsg(from, m) {
    const g = this.game;
    const a = this.avatars.get(from);
    switch (m.t) {
      case 'hitMob': {
        const mob = g.mobs.list.get(m.id);
        if (mob && a) g.mobs.hit(mob, Math.min(14, m.dmg), new THREE.Vector3(m.dir[0], 0, m.dir[1]), { id: from, pos: a.pos });
        break;
      }
      case 'drop': g.drops.spawn(m.item, m.count, new THREE.Vector3(...m.pos), new THREE.Vector3(...m.vel), m.dur); break;
      case 'vehSpawn': g.vehicles.spawn(new THREE.Vector3(...m.pos), m.yaw, m.type); break;
      case 'vehMove': {
        const v = g.vehicles.list.get(m.id);
        if (v) { v.pos.set(m.x, m.y, m.z); v.yaw = m.yaw; v.rider = m.rider ? from : null; }
        break;
      }
    }
  }

  applyPos(id, name, m) {
    const a = this.avatarFor(id, name);
    a.target.set(m.p[0], m.p[1], m.p[2]); a.tyaw = m.p[3]; a.pitch = m.p[4]; a.dead = !!m.dead; a.creative = !!m.cr; a.riding = m.ride || 0;
    if (!a.seen) { a.pos.copy(a.target); a.seen = true; }
    if (m.sw) a.swing = 1;
    if (m.team) a.setTeam(m.team);
    if (m.skin) a.setSkin(m.skin);
  }

  remotePlayers() {
    const out = [];
    for (const [id, a] of this.avatars) if (a.seen) out.push({ id, name: a.name, pos: a.pos, dead: a.dead, creative: a.creative, local: false });
    return out;
  }
  sendTo(id, m) {
    if (this.transport === 'ws') { this.wsSend({ ...m, to: id }); return; }
    if (this.isHost) { const c = this.conns.get(id); if (c?.conn.open) c.conn.send(m); }
    else this.conn?.send({ ...m, to: id });
  }

  // ================= CLIENTE (PeerJS) =================
  async join(code, name) {
    const Peer = await loadPeer();
    this.myName = name;
    this.peer = await new Promise((res, rej) => {
      const p = new Peer();
      p.on('open', () => res(p));
      p.on('error', (e) => rej(e));
    });
    const conn = this.peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true });
    this.conn = conn;
    this.code = code.trim().toUpperCase();
    const hello = await new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('No se encontró la partida. Revisá el código.')), 12000);
      this.peer.on('error', (e) => { clearTimeout(to); rej(e.type === 'peer-unavailable' ? new Error('No existe una partida con ese código.') : e); });
      conn.on('open', () => conn.send({ t: 'join', name }));
      conn.on('data', (m) => {
        if (m.t === 'hello') { clearTimeout(to); res(m); }
        else if (m.t === 'full') { clearTimeout(to); rej(new Error('La partida está llena.')); }
        else this.onClientData(m);
      });
    });
    this.role = 'client'; this.transport = 'peer'; this.authority = false;
    this.hostPeerId = PREFIX + this.code;
    this.myId = hello.you; this.pvp = !!hello.pvp;
    conn.on('close', () => this.onClosed('Se cortó la conexión con el anfitrión.'));
    return hello;
  }

  // ================= CLIENTE (servidor dedicado, WebSocket) =================
  async joinServer(url, name) {
    this.myName = name;
    const ws = new WebSocket(url);
    this.ws = ws;
    const hello = await new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('El servidor no respondió.')), 10000);
      ws.onerror = () => { clearTimeout(to); rej(new Error('No se pudo conectar al servidor.')); };
      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', name }));
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.t === 'hello') { clearTimeout(to); res(m); } else this.onClientData(m);
      };
    });
    this.role = 'client'; this.transport = 'ws';
    this.myId = hello.you; this.authority = !!hello.authority; this.pvp = !!hello.pvp;
    this.code = hello.worldName;
    ws.onclose = () => this.onClosed('Se cortó la conexión con el servidor.');
    return hello;
  }
  wsSend(m) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }

  attachClient(game, scene) { this.game = game; this.scene = scene; }

  send(m) { if (this.transport === 'ws') this.wsSend(m); else if (this.isHost) this.broadcast(m); else this.conn?.send(m); }

  requestChunk(k) {
    return new Promise((res) => {
      this.pendingChunk.set(k, res);
      this.send({ t: 'getChunk', k });
    });
  }

  onClientData(m) {
    const g = this.game;
    if (m.t === 'chunk') {
      const r = this.pendingChunk.get(m.k); this.pendingChunk.delete(m.k);
      const data = typeof m.data === 'string' ? b64.dec(m.data) : m.data ? new Uint8Array(m.data) : null;
      r?.({ data, edits: m.edits });
      return;
    }
    if (!g) return;
    switch (m.t) {
      case 'set': g.world.applyEdit(m.x, m.y, m.z, m.id); break;
      case 'state': {
        if (this.authority) break;
        g.time = m.time;
        g.mobs.applyRemote(m.mobs);
        if (m.drops) g.drops.applyRemote(m.drops);
        if (m.veh) g.vehicles.applyRemote(m.veh, this.myId);
        if (m.weather) g.weather.setRemote(m.weather[0], m.weather[1]);
        if (m.rules && JSON.stringify(m.rules) !== JSON.stringify(g.meta.rules)) { g.meta.rules = m.rules; g.applyRules?.(); }
        this.pvp = !!m.pvp;
        if (m.players) {
          const seen = new Set();
          for (const [id, name, x, y, z, yaw, pitch, dead, cr, sw, team, ride, skin] of m.players) {
            if (id === this.myId) continue;
            seen.add(id);
            this.applyPos(id, name, { p: [x, y, z, yaw, pitch], dead, cr, sw, team, ride, skin });
          }
          for (const [id, a] of this.avatars) if (!seen.has(id)) { a.dispose(); this.avatars.delete(id); }
        }
        break;
      }
      case 'pos': this.applyPos(m.from, m.name, m); break;
      case 'leave': { const a = this.avatars.get(m.id); if (a) { a.dispose(); this.avatars.delete(m.id); } break; }
      case 'dmg': g.player.damage(m.amount, m.cause, m.rad, new THREE.Vector3(m.knock[0], 0, m.knock[1])); break;
      case 'give': for (const [id, n, dur] of m.items) { const left = g.inv.add(id, n); if (dur != null) { /* durabilidad por defecto */ } if (left > 0) g.dropLocal?.(id, left); } if (m.kill) g.player.onEvent('kill', m.kill); g.sfx?.pickup(); break;
      case 'chat': this.onChat(m.name, m.text); break;
      case 'race': this.onRace(m); break;
      case 'fx':
        if (m.op === 'rename') { this.avatars.get(m.from ?? m.id)?.setName(m.name); this.onChat(null, `${m.old} ahora se llama ${m.name}`); }
        this.onFx(m);
        break;
      case 'cont': g.sim.setRemote(m.k, m.c); g.onRemoteContainer?.(m.k); break;
      case 'authority':
        this.authority = true;
        this.onAuthority();
        break;
      default:
        if (this.authority && m.from) this.authorityMsg(m.from, m);
    }
  }

  avatarFor(id, name) {
    let a = this.avatars.get(id);
    if (!a) { a = new Avatar(this.scene, id, name, this.avatars.size + 1); this.avatars.set(id, a); }
    return a;
  }

  // ---------- acciones ----------
  sendChat(text) {
    if (this.isHost) this.broadcast({ t: 'chat', name: this.myName, text });
    else this.send({ t: 'chat', text, name: this.myName });
    this.onChat(this.myName, text);
  }
  sendSet(x, y, z, id) { this.send({ t: 'set', x, y, z, id }); }
  sendHitMob(id, dmg, dir) { this.toAuthority({ t: 'hitMob', id, dmg, dir: [dir?.x ?? 0, dir?.z ?? 0] }); }
  sendContainer(k, c) { this.send({ t: 'cont', k, c }); }
  sendDrop(item, count, pos, vel, dur) { this.toAuthority({ t: 'drop', item, count, pos: pos.toArray(), vel: vel.toArray(), dur }); }
  sendVehSpawn(pos, yaw, type) { this.toAuthority({ t: 'vehSpawn', pos: pos.toArray(), yaw, type }); }
  sendVehMove(v, riding) { this.toAuthority({ t: 'vehMove', id: v.id, x: v.pos.x, y: v.pos.y, z: v.pos.z, yaw: v.yaw, rider: riding ? 1 : 0 }); }
  hitPlayer(id, dmg, dir) {
    if (!this.pvp) return;
    const a = this.avatars.get(id);
    if (a && a.team !== 'none' && a.team === this.team) return; // sin fuego amigo
    const m = { t: 'dmg', amount: dmg, rad: 0, knock: [dir.x, dir.z], cause: this.myName };
    if (id === 'host' && this.transport === 'peer') this.conn?.send({ ...m, to: 'host' });
    else this.sendTo(id, m);
  }
  toAuthority(m) {
    if (this.authority) { this.authorityMsg(this.myId, m); return; }
    if (this.transport === 'ws') this.wsSend(m); // el servidor lo reenvía a la autoridad
    else this.conn?.send(m);
  }
  pvpRaycast(o, d, max) {
    if (!this.pvp || !this.active) return null;
    let best = null;
    for (const [id, a] of this.avatars) {
      if (!a.seen || a.dead) continue;
      const t = a.hitTest(o, d, max);
      if (t != null && (!best || t < best.dist)) best = { id, dist: t };
    }
    return best;
  }

  async announce() {
    if (!this.isHost || !this.public) return;
    try {
      await fetch('/api/lobby', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: this.code, name: this.myName, world: this.game.meta.name, players: this.conns.size + 1, type: this.game.meta.worldType, mode: this.game.meta.mode }) });
    } catch { /* sin lobby en este sitio */ }
  }

  // ---------- por frame ----------
  update(dt) {
    if (!this.active || !this.game) return;
    this.lobbyAcc += dt;
    if (this.lobbyAcc > 30) { this.lobbyAcc = 0; this.announce(); }
    for (const a of this.avatars.values()) a.update(dt);
    const g = this.game, p = g.player;
    this.sendAcc += dt; this.saveAcc += dt;
    if (this.sendAcc < 0.1) return;
    this.sendAcc = 0;
    const swing = p.swing > 0.8 ? 1 : 0;
    const ride = p.riding ? p.riding.id : 0;
    if (p.riding && !this.authority) this.sendVehMove(p.riding, true);
    const statePayload = () => ({
      t: 'state', time: g.time, mobs: g.mobs.serialize(), drops: g.drops.serialize(), veh: g.vehicles.serialize(),
      weather: [g.weather.type, +g.weather.k.toFixed(2)], pvp: this.pvp, rules: g.meta.rules,
    });
    if (this.isHost) {
      const players = [['host', this.myName, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.yaw.toFixed(2), +p.pitch.toFixed(2), p.dead ? 1 : 0, p.creative ? 1 : 0, swing, this.team, ride, this.skin]];
      for (const [id, a] of this.avatars) players.push([id, a.name, +a.target.x.toFixed(2), +a.target.y.toFixed(2), +a.target.z.toFixed(2), +a.tyaw.toFixed(2), +a.pitch.toFixed(2), a.dead ? 1 : 0, a.creative ? 1 : 0, a.swing > 0.8 ? 1 : 0, a.team, a.riding, a.skinKey]);
      if (this.conns.size) this.broadcast({ ...statePayload(), players });
    } else {
      const pos = { t: 'pos', p: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.yaw.toFixed(2), +p.pitch.toFixed(2)], dead: p.dead ? 1 : 0, cr: p.creative ? 1 : 0, sw: swing, team: this.team, ride, name: this.myName, skin: this.skin };
      this.send(pos);
      if (this.authority && this.transport === 'ws') this.wsSend(statePayload());
      // guardar mi progreso en el anfitrión / servidor
      if (this.saveAcc > 10) { this.saveAcc = 0; this.send({ t: 'save', data: g.guestData() }); }
    }
  }

  close() {
    if (this.isClient && this.game) this.send({ t: 'save', data: this.game.guestData() });
    for (const a of this.avatars.values()) a.dispose();
    this.avatars.clear();
    try { this.ws?.close(); } catch { /* ignorar */ }
    try { this.peer?.destroy(); } catch { /* ignorar */ }
    this.peer = null; this.ws = null; this.role = null; this.transport = null; this.conns.clear(); this.conn = null; this.game = null; this.authority = false;
  }
}
export { b64 };
