/* 副交感 · Office Reset Tracker — service worker
   Minimal and self-replacing. A fetch handler is required for Chrome to offer
   "Install app" on desktop. Bump CACHE (v3 -> v4 ...) whenever index.html changes,
   then open the app twice so the new version takes over. */

const CACHE = 'pns-reset-v3';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.add('./index.html'))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // network-first: always prefer the live file, fall back to cache when offline.
  // This makes stale-cache problems impossible while still working with no signal.
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit =>
          hit || (req.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 504 }))
        )
      )
  );
});
