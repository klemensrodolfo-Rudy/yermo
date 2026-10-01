// Servidor de Yermo.
//   node server.js                         → sólo sirve el juego en http://localhost:5173
//   node server.js --dedicado [--mundo N] [--semilla S] [--tipo brew] [--creativo] [--pvp]
//                                          → además mantiene un mundo compartido siempre online
// Sin dependencias: WebSocket implementado a mano (RFC 6455, frames simples).
import http from 'node:http';
import crypto from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : def; };
const port = +process.env.PORT || +arg('puerto', 5173);
const DEDICATED = !!arg('dedicado', false);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

// ---------------- mundo del servidor dedicado ----------------
let world = null;
async function loadWorld() {
  const { WorldGen } = await import('./js/worldgen.js');
  const name = String(arg('mundo', 'servidor')).replace(/[^\w-]/g, '_');
  const dir = join(root, 'mundos', name);
  await mkdir(join(dir, 'chunks'), { recursive: true });
  const readJSON = async (f, d) => { try { return JSON.parse(await readFile(join(dir, f), 'utf8')); } catch { return d; } };
  let meta = await readJSON('meta.json', null);
  if (!meta) {
    const s = arg('semilla', null);
    const seed = s == null ? (Math.random() * 2e9) | 0 : /^-?\d+$/.test(s) ? parseInt(s) : [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
    meta = { name, seed, mode: arg('creativo', false) ? 'creative' : 'survival', worldType: arg('tipo', 'normal') === 'brew' ? 'brew' : 'normal', time: 0.3, pvp: !!arg('pvp', false) };
    const gen = new WorldGen(meta.seed, meta.worldType);
    meta.spawn = gen.findSpawn();
  }
  const gen = new WorldGen(meta.seed, meta.worldType);
  const chunkFiles = (await readdir(join(dir, 'chunks'))).filter((f) => f.endsWith('.bin'));
  world = {
    dir, meta, gen,
    keys: new Set(chunkFiles.map((f) => f.slice(0, -4).replace('_', ','))),
    chunks: new Map(), dirty: new Set(),
    containers: await readJSON('containers.json', {}),
    players: await readJSON('players.json', {}),
  };
  console.log(`Mundo "${name}" · semilla ${meta.seed} · ${meta.worldType === 'brew' ? 'cervecero' : 'normal'} · ${meta.mode === 'creative' ? 'creativo' : 'supervivencia'}${meta.pvp ? ' · PvP' : ''} · ${world.keys.size} sectores modificados`);
}
async function getChunk(k, create) {
  let d = world.chunks.get(k);
  if (d) return d;
  if (world.keys.has(k)) {
    try { d = new Uint8Array(await readFile(join(world.dir, 'chunks', k.replace(',', '_') + '.bin'))); } catch { d = null; }
  }
  if (!d && create) { const [cx, cz] = k.split(',').map(Number); d = world.gen.generate(cx, cz); }
  if (d) world.chunks.set(k, d);
  return d;
}
async function saveWorld() {
  if (!world) return;
  for (const k of world.dirty) {
    const d = world.chunks.get(k);
    if (d) await writeFile(join(world.dir, 'chunks', k.replace(',', '_') + '.bin'), d);
  }
  world.dirty.clear();
  await writeFile(join(world.dir, 'meta.json'), JSON.stringify(world.meta));
  await writeFile(join(world.dir, 'containers.json'), JSON.stringify(world.containers));
  await writeFile(join(world.dir, 'players.json'), JSON.stringify(world.players));
  // liberar memoria de chunks que no cambiaron
  if (world.chunks.size > 400) world.chunks.clear();
}

// ---------------- WebSocket mínimo ----------------
const clients = new Map(); // id -> {sock, name, team}
const lobby = new Map();   // código -> sala anunciada
let authorityId = null;
let nextId = 1;
function wsSend(sock, obj) {
  if (sock.destroyed) return;
  const data = Buffer.from(JSON.stringify(obj));
  let head;
  if (data.length < 126) head = Buffer.from([0x81, data.length]);
  else if (data.length < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(data.length, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(data.length), 2); }
  sock.write(Buffer.concat([head, data]));
}
function send(id, obj) { const c = clients.get(id); if (c) wsSend(c.sock, obj); }
function broadcast(obj, except) { for (const [id, c] of clients) if (id !== except) wsSend(c.sock, obj); }

function handleUpgrade(req, sock) {
  if (!DEDICATED || req.url !== '/ws') { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  const id = 'p' + nextId++;
  let buf = Buffer.alloc(0), frag = [];
  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskOff = off; if (masked) off += 4;
      if (buf.length < off + len) return;
      let payload = buf.subarray(off, off + len);
      if (masked) { const mk = buf.subarray(maskOff, maskOff + 4); payload = Buffer.from(payload.map((b, i) => b ^ mk[i & 3])); }
      buf = buf.subarray(off + len);
      if (op === 8) { sock.end(); return; }
      if (op === 9) { sock.write(Buffer.from([0x8a, 0])); continue; }
      if (op === 1 || op === 0) {
        frag.push(payload);
        if (fin) { const text = Buffer.concat(frag).toString('utf8'); frag = []; try { onMessage(id, sock, JSON.parse(text)); } catch (e) { console.error('mensaje inválido', e.message); } }
      }
    }
  });
  const bye = () => onLeave(id);
  sock.on('close', bye); sock.on('error', bye);
}

const TO_AUTHORITY = new Set(['hitMob', 'drop', 'vehSpawn', 'vehMove']);
async function onMessage(id, sock, m) {
  const c = clients.get(id);
  if (m.t === 'join') {
    const name = String(m.name || 'Superviviente').slice(0, 20);
    clients.set(id, { sock, name });
    if (!authorityId) authorityId = id;
    const w = world;
    wsSend(sock, {
      t: 'hello', seed: w.meta.seed, mode: w.meta.mode, worldType: w.meta.worldType, time: w.meta.time, you: id,
      keys: [...w.keys],
      spawn: w.meta.spawn, worldName: w.meta.name, hostName: 'el servidor', containers: w.containers,
      guest: w.players[name] ?? null, authority: authorityId === id, pvp: w.meta.pvp,
    });
    broadcast({ t: 'chat', name: null, text: `${name} se unió` }, id);
    console.log(`+ ${name} (${clients.size} conectados)${authorityId === id ? ' · autoridad' : ''}`);
    return;
  }
  if (!c) return;
  if (m.to) { send(m.to, { ...m, from: id }); return; }
  switch (m.t) {
    case 'getChunk': {
      const d = await getChunk(m.k, false);
      wsSend(sock, { t: 'chunk', k: m.k, data: d && world.keys.has(m.k) ? Buffer.from(d).toString('base64') : null });
      break;
    }
    case 'set': {
      // protección de terreno: los tótems guardan dueño y equipo
      const claim = Object.entries(world.containers).find(([ck, cv]) => cv.type === 'claim' && (() => { const [x, , z] = ck.split(',').map(Number); return Math.abs(x - m.x) <= 12 && Math.abs(z - m.z) <= 12; })());
      if (claim && claim[1].owner !== c.name && !(c.team && c.team !== 'none' && claim[1].team === c.team)) {
        const cx0 = Math.floor(m.x / 16), cz0 = Math.floor(m.z / 16);
        const d0 = await getChunk(cx0 + ',' + cz0, true);
        wsSend(sock, { t: 'set', x: m.x, y: m.y, z: m.z, id: d0[(m.x - cx0 * 16) + ((m.z - cz0 * 16) << 4) + (m.y << 8)] });
        break;
      }
      const cx = Math.floor(m.x / 16), cz = Math.floor(m.z / 16), k = cx + ',' + cz;
      const d = await getChunk(k, true);
      d[(m.x - cx * 16) + ((m.z - cz * 16) << 4) + (m.y << 8)] = m.id;
      world.dirty.add(k); world.keys.add(k);
      broadcast(m, id);
      break;
    }
    case 'pos': c.team = m.team; broadcast({ ...m, from: id, name: c.name }, id); break;
    case 'race': broadcast(m, id); break;
    case 'fx': broadcast({ ...m, from: id }, id); break;
    case 'state':
      if (id !== authorityId) break;
      world.meta.time = m.time;
      broadcast(m, id);
      break;
    case 'cont':
      if (m.c) world.containers[m.k] = m.c; else delete world.containers[m.k];
      broadcast(m, id);
      break;
    case 'chat': broadcast({ t: 'chat', name: c.name, text: String(m.text).slice(0, 160) }, id); break;
    case 'save': world.players[c.name] = m.data; break;
    default:
      if (TO_AUTHORITY.has(m.t) && authorityId && authorityId !== id) send(authorityId, { ...m, from: id });
  }
}
function onLeave(id) {
  const c = clients.get(id);
  if (!c) return;
  clients.delete(id);
  broadcast({ t: 'leave', id });
  broadcast({ t: 'chat', name: null, text: `${c.name} salió` });
  if (authorityId === id) {
    authorityId = clients.keys().next().value ?? null;
    if (authorityId) send(authorityId, { t: 'authority' });
  }
  console.log(`- ${c.name} (${clients.size} conectados)`);
}

// ---------------- HTTP ----------------
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
  if (p === '/api/server') {
    res.writeHead(200, cors);
    res.end(JSON.stringify(DEDICATED ? { dedicated: true, name: world.meta.name, players: clients.size, type: world.meta.worldType, pvp: world.meta.pvp } : { dedicated: false }));
    return;
  }
  // lista pública de partidas: las salas por código se anuncian acá cada 30 s
  if (p === '/api/lobby') {
    const now = Date.now();
    for (const [k, v] of lobby) if (now - v.t > 75000) lobby.delete(k);
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (d) => { body += d; if (body.length > 2000) req.destroy(); });
      req.on('end', () => {
        try {
          const r = JSON.parse(body);
          if (/^[A-Z0-9]{5}$/.test(r.code)) lobby.set(r.code, { code: r.code, name: String(r.name).slice(0, 20), world: String(r.world).slice(0, 40), players: +r.players || 1, type: r.type === 'brew' ? 'brew' : 'normal', mode: r.mode === 'creative' ? 'creative' : 'survival', t: now });
        } catch { /* ignorar */ }
        res.writeHead(204, cors).end();
      });
      return;
    }
    const list = [...lobby.values()].map(({ t, ...rest }) => rest);
    if (DEDICATED) list.unshift({ server: true, name: world.meta.name, world: world.meta.name, players: clients.size, type: world.meta.worldType, mode: world.meta.mode });
    res.writeHead(200, cors); res.end(JSON.stringify(list));
    return;
  }
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(root, p));
  if (!file.startsWith(root) || file.includes(join(root, 'mundos'))) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
});
server.on('upgrade', handleUpgrade);

if (DEDICATED) {
  await loadWorld();
  setInterval(() => saveWorld().catch((e) => console.error('error al guardar', e)), 30000);
  const exit = async () => { console.log('\nGuardando el mundo…'); await saveWorld(); process.exit(0); };
  process.on('SIGINT', exit); process.on('SIGTERM', exit);
}
server.listen(port, () => {
  console.log(`Yermo en http://localhost:${port}`);
  if (DEDICATED) console.log(`Servidor dedicado activo. Tus amigos entran a http://<tu-ip>:${port} y tocan «Entrar al servidor».`);
});
void existsSync;
