// Job Estimator service worker — app-shell cache, pinned until asked.
//
// UPDATES ARE MANUAL. A rep mid-appointment must never have the app change
// underneath them, so the build in the cache is the build they keep until
// somebody taps Settings → Check for updates. Nothing here goes looking for
// a new version on its own.
//
// What that costs, deliberately:
//   - The cache name is STABLE, not per-deploy. A versioned name would mean a
//     new worker starts from an empty cache and re-downloads the shell, which
//     is an auto-update by another route.
//   - Install only fills entries that are MISSING. It never overwrites, so a
//     newly installed worker cannot swap the app version out from under a
//     device that already has one.
//   - Navigations are served purely from cache, with no background re-fetch.
//     A background refresh would quietly stage new code for the next reload.
//
// Exactly one thing overwrites the shell: the 'je-refresh-shell' message,
// which only the Check for updates button sends. The page decides what's
// deployed by reading APP_VERSION off the network ('je-version-probe' below),
// which needs no cooperation from this file — so a deploy that forgets to
// touch sw.js is still found.
//
// Note the worker's own CODE still updates on its own (skipWaiting +
// clients.claim below). That's intentional and is not an app update: fixes to
// this file should land, and because install never overwrites, adopting a new
// worker leaves the cached app version exactly where it was.

const CACHE = 'je-shell';

// Legacy per-deploy cache names from builds before updates were pinned.
// Cleaned up on activate so they don't sit around forever.
const LEGACY_CACHES = ['je-v1', 'je-v2', 'je-v3', 'je-v4', 'je-v5', 'je-v6'];
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
    caches.open(CACHE).then(async (cache) => {
      // Fill gaps only. On a first install the cache is empty and this pulls
      // the whole shell; on a worker update every entry is already there and
      // this does nothing, which is what keeps the app version pinned.
      // `cache: 'reload'` bypasses the HTTP cache so a genuine first fetch
      // can't land stale bytes.
      await Promise.all(
        SHELL.map(async (url) => {
          if (await cache.match(url)) return;
          try {
            const res = await fetch(new Request(url, { cache: 'reload' }));
            if (res.ok) await cache.put(url, res);
          } catch (e) {
            /* offline first-run — the fetch handler will backfill later */
          }
        }),
      );
    }),
  );
  // Adopt the new worker's code right away. Safe precisely because install
  // above can't change which app version is cached.
  self.skipWaiting();
});

// Defensive escape hatch: if a worker somehow ends up waiting, the page can
// release it via postMessage rather than being stuck across sessions.
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'je-skip-waiting') self.skipWaiting();

  // The ONLY path that changes which build is cached. Re-fetches the whole
  // shell from the network, overwrites it, then tells the page to reload onto
  // it. Sent by Settings → Check for updates and by nothing else.
  if (event.data.type === 'je-refresh-shell') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
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
  // Only the retired per-deploy caches go. Deleting anything else — the
  // stable cache above all — would force a re-download and auto-update the
  // app behind the rep's back.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => LEGACY_CACHES.includes(k)).map((k) => caches.delete(k))),
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
  // touch sw.js is still detectable instead of invisible forever.
  if (url.searchParams.has('je-version-probe')) {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }

  // HTML navigations — cache only. No background revalidate: re-fetching
  // here would quietly stage a newer build for the next reload, which is the
  // auto-update this worker exists to prevent. Network is the fallback for a
  // cold first run, never a refresh path.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match('./index.html');
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && res.ok) await cache.put('./index.html', res.clone());
          return res;
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
      const cache = await caches.open(CACHE);
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
