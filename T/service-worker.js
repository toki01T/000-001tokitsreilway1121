const CACHE_NAME = 'toki01-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/favicon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                const absoluteUrls = urlsToCache.map(url => 
                    new URL(url, self.location.origin).href
                );
                
                return cache.addAll(absoluteUrls);
            })
            .catch((error) => {
                console.error('キャッシュの追加中にエラーが発生しました:', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});