/* Simplicity ERP - Service Worker */
const CACHE_NAME = 'simplicity-cache-v37';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Online-first strategy taaki Firebase aur live data me koi rukawat na aaye
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
