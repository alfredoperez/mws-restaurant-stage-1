const staticName = 'mws-cache';
const version = 'v2';

var staticCacheName = `${staticName}-static-${version}`;
var dynamicCacheName = `${staticName}-dynamic-${version}`;
var filesToCache = [
    '/',
    '/index.html',
    '/restaurant.html',

    '/sw.js',
    '/js/main.js',
    '/js/restaurant_info.js',


    '/css/home.min.css',
    '/css/restaurant-details.min.css',
    '/images/1-500_small.jpg',
    '/images/2-500_small.jpg',
    '/images/3-500_small.jpg',
    '/images/4-500_small.jpg',
    '/images/5-500_small.jpg',
    '/images/6-500_small.jpg',
    '/images/7-500_small.jpg',
    '/images/8-500_small.jpg',
    '/images/9-500_small.jpg',
    '/images/10-500_small.jpg',
    '/images/undefined-500_small.jpg'
];

var apiUrlBase = 'https://lit-reaches-37723.herokuapp.com/';
var googleMaps = 'https://maps.googleapis.com/maps/';


self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            console.log('[Service Worker] Caching App Shell');
            // cache.addAll is atomic. 
            // If any of the files fail it will fail the whole add all
            return cache.addAll(filesToCache).then(
                () => { console.log('[Service Worker] Install Completed'); },
                (response) => { console.log('[Service Worker] Rejected :' + response); });
        })
    )
});

self.addEventListener('activate', function (e) {
    console.log('[Service Worker] Activate');
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {

                //   console.log('[Service Worker] CURRENT CACHE NAME', cacheName);
                if (key !== staticCacheName) {
                    //   console.log('[Service Worker] removing old cache', key);

                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', function (e) {
    const requestUrl = new URL(e.request.url);
    console.log('[Service Worker] Fetch ', e.request.url);

    if (requestUrl.origin === location.origin) {
        // Redirect 'http://localhost:8000' to 'http://localhost:8000/index.html' since 
        // they should bascially be the same html
        if (requestUrl.pathname === '/') {
            e.respondWith(caches.match('index.html'));
            return;
        }
    }

    // if (e.request.url.startsWith(googleMaps)) {
    //     if (e.request.url.indexOf('Quota') > -1 || e.request.url.indexOf('Authenticate') > -1) {
    //         return new Response();
    //     }
    //     e.respondWith(serveMap(e.request));
    //     return;
    // }

    // if (requestUrl.origin.indexOf('chrome-extension') === -1 &&requestUrl.origin.indexOf('maps') === -1) {
    if (requestUrl.origin.indexOf('chrome-extension') === -1) {

        serve(e, e.request);
    }



});

function serve(event, cacheRequest) {
    // Check if the HTML request has previously been cached.
    // If so, return the response from the cache. If not,
    // fetch the request, cache it, and then return it.
    event.respondWith(
        caches.match(cacheRequest).then(response => {
            console.log(cacheRequest.url + ' -> RESPONSE:' + response);
            return (
                response ||
                fetch(event.request)
                    .then(fetchResponse => {
                        return caches.open(dynamicCacheName).then(cache => {
                            cache.put(event.request, fetchResponse.clone());

                            console.log('saving in cache: ' + JSON.stringify(event.request.url));
                            return fetchResponse;
                        });
                    })
                    .catch(error => {
                        if (event.request.url.indexOf(".jpg") > -1) {
                            return caches.match('/images/undefined-500_small.jpg');
                        }
                        return new Response(
                            "Application is not connected to the internet",
                            {
                                status: 404,
                                statusText: "Application is not connected to the internet"
                            }
                        );
                    })
            );
        })
    );
}

function serveMap(request) {
    return caches.open(staticCacheName).then((cache) => {
        return cache.match(request.url, { ignoreSearch: true }).then((response) => {
            var fetchPromise = fetch(request).then((networkResponse) => {
                cache.put(request.url, networkResponse.clone());
                return networkResponse;
            });

            return response || fetchPromise;

        });
    });
}