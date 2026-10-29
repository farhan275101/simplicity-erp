// SIMPLICITY ERP - BULLETPROOF SERVICE WORKER
const CACHE_NAME = 'simplicity-cache-v2';
const urlsToCache = [
  'index.html',
  'style.css',
  'manifest.json'
];

// 1. Install Event (Safe Cache)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Har file ko alag add karega taaki 1 file se poora app block na ho
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('Caching skipped for:', url);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event (Chrome PWA Requirement)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
