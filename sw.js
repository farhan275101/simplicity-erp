/* ========================================================
   SIMPLICITY ERP - BULLETPROOF PWA SERVICE WORKER
   File: sw.js • Developed by Farhan Jawed
======================================================== */

const CACHE_NAME = 'simplicity-cache-v4';
const urlsToCache = [
  './',
  './index.html',
  './landing.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Install Event (GitHub Pages Safe Cache)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
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

// 2. Activate Event (Old Cache Clean)
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

// 3. Fetch Event (Chrome Desktop PWA Requirement)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      return caches.match('./index.html');
    })
  );
});
