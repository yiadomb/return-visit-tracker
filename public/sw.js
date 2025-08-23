const VERSION = 'rv-tracker-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// On install, cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate new SW immediately
  self.skipWaiting();
});

// Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys
        .filter((k) => k !== VERSION)
        .map((k) => caches.delete(k))
      )),
      self.clients.claim()
    ])
  );
});

// Network-first for navigation; cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass caching during development (localhost or LAN IP)
  const isDevHost = url.hostname === 'localhost' || /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(url.hostname);
  if (isDevHost) {
    return; // Let the network handle it to avoid stale assets while developing
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(VERSION).then((cache) => cache.put('/index.html', copy));
        return resp;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((resp) => {
          const copy = resp.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return resp;
        });
      })
    );
  }
});
