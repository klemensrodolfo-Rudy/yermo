// Service worker de YERMO: permite instalarlo como app, jugar sin conexión y que siempre cargue la última versión.
// Archivos propios: primero la red (si hay conexión se usa lo nuevo; si tarda más de 3 s o falla, la copia guardada).
// Librerías del CDN (Three.js, PeerJS, fuentes): primero la copia guardada (no cambian).
// Al instalarse guarda todo lo necesario para jugar sin internet (en el avión, en el campo…).
const CACHE = 'yermo-v17';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  ...['achievements', 'audio', 'blocks', 'cloud', 'creative', 'eldra', 'entities', 'extras', 'features', 'features2', 'fx', 'guide', 'input',
    'inventory', 'learn', 'main', 'map', 'mesher', 'minigames', 'modes', 'nature', 'net', 'noise', 'npc', 'player', 'race', 'sea', 'sim',
    'social', 'storage', 'visuals', 'ux', 'voicecmd', 'life', 'progress', 'building', 'together', 'geo', 'textures', 'tutorial', 'ui', 'voice', 'worker', 'world', 'worldgen'].map((f) => `js/${f}.js`),
];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
  'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=VT323&display=swap',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // de a uno: si algún archivo falla, el resto igual queda guardado
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all([
    ...CORE.map((u) => fetch(u, { cache: 'no-cache' }).then((r) => r.ok && c.put(u, r)).catch(() => {})),
    ...LIBS.map((u) => fetch(u, { mode: 'cors' }).then((r) => (r.ok || r.type === 'opaque') && c.put(u, r)).catch(() => {})),
  ])));
});
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), ms));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return; // servidor dedicado: nunca desde la caché
  const own = url.origin === self.location.origin;
  const cdn = /cdn\.jsdelivr\.net|unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!own && !cdn) return;
  if (own) {
    const net = fetch(req, { cache: 'no-cache' }).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; });
    const cached = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./'));
    e.respondWith(Promise.race([net, timeout(3000)]).catch(() => cached().then((r) => r || net)));
  } else {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })),
    );
  }
});
