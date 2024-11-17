const CACHE_NAME = 'healfly-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/styles.css',
    './js/consultation.js',
    './js/userInfo.js',
    './js/symptoms.js',
    './js/config.js',
    './data/symptoms.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.error('캐시 추가 실패:', url, err);
                            return Promise.resolve();
                        });
                    })
                );
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(error => {
                    console.error('Fetch failed:', error);
                    if (event.request.url.includes('/api/')) {
                        return new Response(
                            JSON.stringify({
                                error: {
                                    message: '네트워크 연결을 확인해주세요.'
                                }
                            }),
                            {
                                status: 503,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                    }
                    return new Response(
                        '네트워크 연결을 확인해주세요.',
                        {
                            status: 503,
                            headers: {
                                'Content-Type': 'text/plain'
                            }
                        }
                    );
                });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
}); 