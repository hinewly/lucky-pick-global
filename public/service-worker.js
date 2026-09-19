const CACHE_VERSION = 'v24';
const CACHE_NAME = 'lucky-pick-global-' + CACHE_VERSION;
const PRECACHE_URLS = [
  './?v=24',
  'index.html?v=24',
  'manifest.json?v=24',
  'css/styles.css?v=24',
  'js/engine.js?v=24',
  'js/app.js?v=24',
  'icons/icon.svg?v=24',
  'data/powerball.js?v=24',
  'data/megamillions.js?v=24',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS.map(u => u.replace('?v=24', ''))))
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
