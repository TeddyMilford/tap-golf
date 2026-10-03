'use strict';

const SCOPE = self.registration.scope;
const PREFIX = `tap-golf:${SCOPE}:`;
const CACHE = `${PREFIX}v5`;
const FILES = ['./', './index.html', './styles.css', './model.js', './app.js', './icon.svg', './manifest.webmanifest'];
const URLS = FILES.map(file => new URL(file, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;
  const url = new URL(request.url);
  url.search = '';
  if (!URLS.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) {
        try { await cache.put(url.href, response.clone()); } catch { /* Still serve the network response if storage is full. */ }
      }
      return response;
    } catch {
      const cached = await cache.match(url.href);
      return cached || Response.error();
    }
  })());
});
