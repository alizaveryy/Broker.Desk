// Broker Desk offline cache. Bump VERSION when you upload a new index.html.
const VERSION = 'bd-21';
const SHELL = ['./', './index.html', './manifest-v2.webmanifest', './icon-192-v2.png', './icon-512-v2.png', './icon-180-v2.png', './icon-maskable-v2.png'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.all(LIBS.map(u => fetch(u, {mode: 'no-cors'}).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  if (sameOrigin) {
    // Open instantly from the cache, refresh the cache in the background when online.
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const key = req.mode === 'navigate' ? './index.html' : req;
      const cached = await c.match(key, {ignoreSearch: true});
      const fresh = fetch(req).then(r => { if (r && r.ok) c.put(key, r.clone()); return r; }).catch(() => null);
      if (cached) { e.waitUntil(fresh); return cached; }
      return (await fresh) || new Response('Offline', {status: 503});
    })());
    return;
  }
  // Fonts and libraries: cache first, then network.
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const cached = await c.match(req);
    if (cached) return cached;
    try { const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }
    catch (err) { return new Response('', {status: 504}); }
  })());
});
