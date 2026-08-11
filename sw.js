// Job Estimator service worker — minimal app-shell cache.
//
// Strategy:
//   - On install, pre-cache the static app shell (HTML, manifest, icons, logo).
//   - For HTML navigations, serve the cached shell immediately AND refresh it
//     in the background. That means a single refresh always lands on the new
//     build once the new worker activates.
//   - For same-origin assets (icons, logo, manifest), serve cache-first for
//     instant loads, then background-fetch.
//   - Cross-origin (React/Babel/Tailwind CDN) is untouched — the browser HTTP
//     cache handles those.
//
// Version bumps: bump VERSION on every deploy so the activate step wipes the
// old cache and forces the app shell to be re-fetched cleanly.

const VERSION = 'je-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo.jpg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-1024.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      // `cache: 'reload'` bypasses the HTTP cache so we don't repopulate the
      // new cache with the exact stale bytes it was built to replace.
      Promise.all(
        SHELL.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      ),
    ),
  );
  // Activate immediately. The page decides when to reload — the worker taking
  // over is not the disruptive part, the navigation is.
  self.skipWaiting();
});

// Defensive escape hatch: if a worker somehow ends up waiting, the page can
// release it via postMessage rather than being stuck across sessions.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'je-skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  // Cross-origin (CDN scripts, fonts, etc.) — let the browser handle it.
  if (url.origin !== self.location.origin) return;

  // HTML navigations — cache-first, revalidate in background.
  if (req.mode === 'navigate') {
    const networkUpdate = fetch(req).then(async (res) => {
      if (res && res.ok) {
        const cache = await caches.open(VERSION);
        await cache.put('./index.html', res.clone());
      }
      return res;
    });
    event.waitUntil(networkUpdate.catch(() => {}));
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const cached = await cache.match('./index.html');
        if (cached) return cached;
        try {
          return await networkUpdate;
        } catch (e) {
          return Response.error();
        }
      })(),
    );
    return;
  }

  // Same-origin assets — cache-first, then network.
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return Response.error();
      }
    })(),
  );
});
