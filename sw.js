/* 副交感 · Office Reset Tracker — service worker (flat paths)
   Cache-first app shell. Designed so a missing asset can never break install:
   each file is cached individually and failures are ignored.
   When you update index.html, bump CACHE to v3, v4 ... and reopen twice. */

const CACHE = 'pns-reset-v2';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c =>
      // individual puts — one 404 will not abort the whole install
      Promise.all(SHELL.map(url =>
        fetch(url, { cache: 'reload' })
          .then(res => (res && res.ok) ? c.put(url, res) : null)
          .catch(() => null)
      ))
    ).then(() => self.skipWaiting()).catch(() => {})
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

  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const url = new URL(req.url);
        const cacheable = url.origin === location.origin
          || url.hostname.endsWith('gstatic.com')
          || url.hostname.endsWith('googleapis.com');
        if (cacheable && res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
