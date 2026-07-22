/* ============================================
   SW.JS — Service Worker (Network First + Cache Busting)
   ============================================ */

const CACHE_NAME = 'mony-dashboard-v99';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// 모든 요청: 네트워크 우선 (Network First), 실패 시에만 캐시 사용
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).then(response => {
            return response;
        }).catch(() => caches.match(event.request))
    );
});
