/* Good Practice GP mobile installation worker.
 * Patient records and authenticated responses are intentionally never cached.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Network-only by design. Do not add clinical or authenticated data to Cache Storage.
});
