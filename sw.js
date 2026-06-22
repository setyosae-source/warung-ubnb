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
// ============================================================
// sw-push-addon.js
//
// JANGAN dipakai sebagai file sw.js baru — index.html JAWARA
// SUDAH PUNYA /sw.js sendiri (untuk PWA installability).
// Tambahkan / gabungkan 2 event listener di bawah ini ke
// /sw.js yang sudah ada di root domain ubnb.pw.
// ============================================================

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "JAWARA";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-badge-72.png",
    data: { url: data.url || "/" },
    tag: data.jenis || "umum",
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      if ("setAppBadge" in self.navigator && data.jamaahDid) {
        try {
          const res = await fetch(
            "https://skltbmcrqutevmtcxqxj.supabase.co/rest/v1/rpc/fn_hitung_badge_jamaah",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbHRibWNycXV0ZXZtdGN4cXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzM5ODIsImV4cCI6MjA5MTI0OTk4Mn0._nogUZg5UylVyP45QTGYw69u76pNxGryj9hZORIfE_A",
                Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbHRibWNycXV0ZXZtdGN4cXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzM5ODIsImV4cCI6MjA5MTI0OTk4Mn0._nogUZg5UylVyP45QTGYw69u76pNxGryj9hZORIfE_A",
              },
              body: JSON.stringify({ p_jamaah_did: data.jamaahDid }),
            }
          );
          const count = await res.json();
          await self.navigator.setAppBadge(count || 0);
        } catch (e) {
          console.error("Gagal update badge:", e);
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
