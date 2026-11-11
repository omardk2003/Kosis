/*
 * DISCIPLINE service worker: shell only (ADR-0008, architecture §7.3).
 * - Caches ONLY hashed static build assets and the offline fallback page.
 * - NEVER caches authenticated HTML, RSC payloads, server-action or API responses.
 * - No personal data is written to Cache Storage.
 */
const VERSION = "shell-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isCacheableStatic(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    // Network only for pages; offline falls back to the static offline page (no user data).
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || new Response("Offline", { status: 503 })),
      ),
    );
    return;
  }

  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }),
        ),
      ),
    );
  }
  // Everything else (RSC, server actions, APIs): straight to the network, never cached.
});

self.addEventListener("message", (event) => {
  if (event.data === "purge") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});
