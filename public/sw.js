// Minimal "no-op" service worker: declares PWA and takes control ASAP
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

// Optional: transparent pass-through fetch (kept for clarity)
self.addEventListener("fetch", () => {
  // no caching logic yet
});