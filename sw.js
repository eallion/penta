const CDN = 'https://images.eallion.com';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.startsWith(CDN)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open('penta-images').then(cache => cache.put(e.request, copy));
        return res;
      });
    })
  );
});
