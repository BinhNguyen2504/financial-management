// Only the neutral offline document is cached. Never cache account pages or APIs.
const CACHE = "fm-offline-v6";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline.html")));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith("fm-offline-") && key !== CACHE)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () => {
    return (await caches.match("/offline.html", { cacheName: CACHE })) ?? new Response("Mất kết nối. Vui lòng thử lại.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
