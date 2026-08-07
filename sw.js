const CACHE_NAME = "wanderpokal-pwa-v2"; // <- v2 wichtig
const ASSETS = [
  "/GDV2026/",
  "/GDV2026/index.html",
  "/GDV2026/manifest.webmanifest",
  "/GDV2026/sw.js",
  "/GDV2026/icon-192.png",
  "/GDV2026/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
