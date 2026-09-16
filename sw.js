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
//
// Forgetting that bump used to strand every installed app permanently: the
// browser saw an identical sw.js, installed nothing, and this worker kept
// serving the old shell from cache with no way to notice. Settings → Check
// for updates is now the safety net — it reads the deployed APP_VERSION off
// the network (the 'je-version-probe' branch below) and, if it differs from
// what's running, drives 'je-refresh-shell' to re-pull the shell. Bumping
// VERSION is still the right thing to do; it just isn't load-bearing.

const VERSION = 'je-v6';
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
  if (!event.data) return;
  if (event.data.type === 'je-skip-waiting') self.skipWaiting();

  // Self-heal: re-fetch the whole app shell straight from the network and
  // overwrite what's cached, then tell the page it's safe to reload.
  //
  // This is the escape hatch for a deploy where index.html changed but sw.js
  // did NOT. The browser sees an identical sw.js, so it installs no new
  // worker and the install-time pre-cache never runs — leaving this worker
  // happily serving a stale shell with no way out. Settings → Check for
  // updates drives this path.
  if (event.data.type === 'je-refresh-shell') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(VERSION);
        await Promise.all(
          SHELL.map((u) =>
            fetch(new Request(u, { cache: 'reload' }))
              .then((res) => (res.ok ? cache.put(u, res) : null))
              .catch(() => null),
          ),
        );
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: 'je-shell-refreshed' }));
      })(),
    );
  }
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

  // Version probe — always network, never cached, never written to the cache.
  // This is how the page asks "what's actually deployed right now?" without
  // depending on whether sw.js itself changed, so a deploy that forgets to
  // bump VERSION is still detectable instead of invisible forever.
  if (url.searchParams.has('je-version-probe')) {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }

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
