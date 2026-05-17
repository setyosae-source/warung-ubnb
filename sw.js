// Service Worker - Warung UBNB PWA
const CACHE_NAME = 'warung-ubnb-v1';

// Install - cache minimal
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', e => {
  self.clients.claim();
});

// Fetch - network first (selalu online)
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
