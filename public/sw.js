// Minimal service worker: lets the app be installed. It never caches anything,
// so users always get the latest version and live data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
