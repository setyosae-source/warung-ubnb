// JAWARA Service Worker — minimal, hanya untuk syarat PWA installability.
// Tidak melakukan caching agresif supaya data selalu fresh dari Supabase.
const SW_VERSION = 'jawara-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch: tidak meng-cache apapun, biar data selalu real-time.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
