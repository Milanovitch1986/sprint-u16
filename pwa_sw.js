const CACHE = 'sprint-u16-v2';
const FILES = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Installeer: cache de basisbestanden
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

// Activeer: verwijder oude caches (ook de oude 'sprint-u16-v1')
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch-strategie:
//  - HTML/navigatie (app.html, index.html, "/"): NETWERK-EERST.
//    Zo zie je online altijd de nieuwste versie van de app; de cache is
//    enkel een terugval wanneer je offline bent. Dit voorkomt dat een
//    oude, gecachte app.html blijft hangen na een nieuwe patch.
//  - Overige bestanden (iconen, manifest e.d.): cache-eerst voor snelheid.
self.addEventListener('fetch', e => {
  const req = e.request;
  let isHTML = req.mode === 'navigate';
  try {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname.endsWith('.html')) isHTML = true;
  } catch (_) { /* niet-parsebare URL: laat isHTML zoals het is */ }

  if (isHTML) {
    e.respondWith(
      fetch(req).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return response;
      }).catch(() =>
        caches.match(req).then(cached => cached || caches.match('/index.html'))
      )
    );
    return;
  }

  // Cache-eerst voor de rest
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
