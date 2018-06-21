const staticName = 'mws-static-';
const version = 'v25';

var cacheName = `${staticName}-${version}`;
var dataCacheName = `${staticName}data-${version}`;

var filesToCache = [
    '/',
    '/index.html',
    '/restaurant.html',
    '/manifest.json',

    '/js/idb.js',
    '/js/idbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/js/RestaurantService.js',
    '/sw.js',

    '/css/helpers.css',
    '/css/home.css',
    '/css/main.css',
    '/css/restaurant-details.css',

    '/images/icon.svg',
    '/images/1-500_medium.jpg',
    '/images/1-500_small.jpg',
    '/images/1-800_800_large_1x.jpg',
    '/images/1-1600_1600_large_2x.jpg',
    '/images/2-500_medium.jpg',
    '/images/2-500_small.jpg',
    '/images/2-800_800_large_1x.jpg',
    '/images/2-1600_1600_large_2x.jpg',
    '/images/3-500_medium.jpg',
    '/images/3-500_small.jpg',
    '/images/3-800_800_large_1x.jpg',
    '/images/3-1600_1600_large_2x.jpg',
    '/images/4-500_medium.jpg',
    '/images/4-500_small.jpg',
    '/images/4-800_800_large_1x.jpg',
    '/images/4-1600_1600_large_2x.jpg',
    '/images/5-500_medium.jpg',
    '/images/5-500_small.jpg',
    '/images/5-800_800_large_1x.jpg',
    '/images/5-1600_1600_large_2x.jpg',
    '/images/6-500_medium.jpg',
    '/images/6-500_small.jpg',
    '/images/6-800_800_large_1x.jpg',
    '/images/6-1600_1600_large_2x.jpg',
    '/images/7-500_medium.jpg',
    '/images/7-500_small.jpg',
    '/images/7-800_800_large_1x.jpg',
    '/images/7-1600_1600_large_2x.jpg',
    '/images/8-500_medium.jpg',
    '/images/8-500_small.jpg',
    '/images/8-800_800_large_1x.jpg',
    '/images/8-1600_1600_large_2x.jpg',
    '/images/9-500_medium.jpg',
    '/images/9-500_small.jpg',
    '/images/9-800_800_large_1x.jpg',
    '/images/9-1600_1600_large_2x.jpg',
    '/images/10-500_medium.jpg',
    '/images/10-500_small.jpg',
    '/images/10-800_800_large_1x.jpg',
    '/images/10-1600_1600_large_2x.jpg'

];
var apiUrlBase = 'https://lit-reaches-37723.herokuapp.com/';
var googleMaps = 'https://maps.googleapis.com/maps/';
self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log('[Service Worker] Caching App Shell');
            // cache.addAll is atomic. 
            // If any of the files fail it will fail the whole add all
            return cache.addAll(filesToCache).then(
                () => {
                    console.log('[Service Worker] Install Completed');
                },
                (response) => { console.log('rejected' + response) });
        })
    )
})

self.addEventListener('activate', function (e) {
    console.log('[Service Worker] Activate');
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {

                //   console.log('[Service Worker] CURRENT CACHE NAME', cacheName);
                if (key !== cacheName && key !== dataCacheName) {
                    //   console.log('[Service Worker] removing old cache', key);

                    return caches.delete(key);
                }
            }));
        })
    )
})

self.addEventListener('fetch', function (e) {
    //  console.log('[Service Worker] Fetch ', e.request.url);
    if (e.request.url.startsWith(apiUrlBase)) {
        //  console.log('[Service Worker] Fetch Data Only!', e.request.url);
        e.respondWith(serveData(e.request));
    } else if (e.request.url.startsWith(googleMaps)) {
        if (e.request.url.indexOf('Quota') > -1 || e.request.url.indexOf('Authenticate') > -1) {
            return new Response();
        }
        e.respondWith(serveMap(e.request));
    } else {
        //check if the request is to the data api
        e.respondWith(

            // Evaluates request and check if it is available in the cache
            caches.match(e.request).then(function (response) {

                // Returns the resource from cached version 
                // or uses fetch to get it from the network
                return response || fetch(e.request);
            })
        )
    }

})

function serveData(request) {
    return caches.open(dataCacheName).then((cache) => {
        return cache.match(request.url).then((response) => {
            var fetchPromise = fetch(request).then((networkResponse) => {
                //   console.log('[Service Worker] saving data');
                cache.put(request.url, networkResponse.clone());
                return networkResponse;
            });

            return response || fetchPromise;

        });
    });
}

function serveMap(request) {
    return caches.open(dataCacheName).then((cache) => {
        return cache.match(request.url).then((response) => {
            var fetchPromise = fetch(request).then((networkResponse) => {
                cache.put(request.url, networkResponse.clone());
                return networkResponse;
            });

            return response || fetchPromise;

        });
    });
}