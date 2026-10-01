// Service worker de YERMO: permite instalarlo como app, jugar sin conexión y que siempre cargue la última versión.
// Archivos propios: primero la red (si hay conexión se usa lo nuevo) y, si falla, la copia guardada.
// Librerías del CDN (Three.js, PeerJS): primero la copia guardada (no cambian).
const CACHE = 'yermo-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return; // servidor dedicado: nunca desde la caché
  const own = url.origin === self.location.origin;
  const cdn = /cdn\.jsdelivr\.net|unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!own && !cdn) return;
  if (own) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
    );
  } else {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })),
    );
  }
});
