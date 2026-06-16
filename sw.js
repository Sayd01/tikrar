// Tikrar Service Worker — stratégie network-first
// Sert toujours la dernière version quand en ligne, tombe sur le cache hors-ligne.
const CACHE_NAME = 'tikrar-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/program.json',
  './data/quran-pages.json',
  './data/quran-milestones.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // Met à jour le cache en arrière-plan
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
