const CACHE_VERSION = 'v16';
const CACHE_NAME = 'lucky-pick-global-' + CACHE_VERSION;
const PRECACHE_URLS = [
  './?v=16',
  'index.html?v=16',
  'manifest.json?v=16',
  'css/styles.css?v=16',
  'js/engine.js?v=16',
  'js/app.js?v=16',
  'icons/icon.svg?v=16',
  'data/powerball.js?v=16',
  'data/megamillions.js?v=16',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS.map(u => u.replace('?v=16', ''))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      // 清掉所有旧版本（lucky-pick-global-*）
      keys.filter(k => k.startsWith('lucky-pick-global-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isHTML = event.request.mode === 'navigate'
              || event.request.destination === 'document'
              || (event.request.headers.get('accept') || '').includes('text/html');
  
  // 所有文件都用 network-first（确保最新）
  if (isHTML || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') 
      || url.pathname.includes('/data/') || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }
  
  // 图片等用 cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
