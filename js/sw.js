const CACHE_NAME = 'healfly-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/consultation.js',
    '/js/session.js',
    '/js/encryption.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
}); 