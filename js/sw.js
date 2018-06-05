const staticName = 'mws-static-';
const contentImgsName = 'mws-content-imgs-'
const version = 'v0';

const dataCacheName = staticName + version;
const contentImgsCache = contentImgsName + version;

const allCaches = [
    dataCacheName,
    contentImgsCache
];

var filesToCache = [
    'data/restaurants.json',

    'js/dbhelper.js',
    'js/main.js',
    'js/restaurant_info.js',

    'css/helpers.css',
    'css/home.css',
    'css/main.css',
    'css/restaurant-details.css',

    'images/icon.svg',
    'images/1-500_medium.jpg',
    'images/1-500_small.jpg',
    'images/1-800_800_large_1x.jpg',
    'images/1-1600_1600_large_2x.jpg',
    'images/2-500_medium.jpg',
    'images/2-500_small.jpg',
    'images/2-800_800_large_1x.jpg',
    'images/2-1600_1600_large_2x.jpg',
    'images/3-500_medium.jpg',
    'images/3-500_small.jpg',
    'images/3-800_800_large_1x.jpg',
    'images/3-1600_1600_large_2x.jpg',
    'images/4-500_medium.jpg',
    'images/4-500_small.jpg',
    'images/4-800_800_large_1x.jpg',
    'images/4-1600_1600_large_2x.jpg',
    'images/5-500_medium.jpg',
    'images/5-500_small.jpg',
    'images/5-800_800_large_1x.jpg',
    'images/5-1600_1600_large_2x.jpg',
    'images/6-500_medium.jpg',
    'images/6-500_small.jpg',
    'images/6-800_800_large_1x.jpg',
    'images/6-1600_1600_large_2x.jpg',
    'images/7-500_medium.jpg',
    'images/7-500_small.jpg',
    'images/7-800_800_large_1x.jpg',
    'images/7-1600_1600_large_2x.jpg',
    'images/8-500_medium.jpg',
    'images/8-500_small.jpg',
    'images/8-800_800_large_1x.jpg',
    'images/8-1600_1600_large_2x.jpg',
    'images/9-500_medium.jpg',
    'images/9-500_small.jpg',
    'images/9-800_800_large_1x.jpg',
    'images/9-1600_1600_large_2x.jpg',
    'images/10-500_medium.jpg',
    'images/10-500_small.jpg',
    'images/10-800_800_large_1x.jpg',
    'images/10-1600_1600_large_2x.jpg',

    'https://normalize-css.googlecode.com/svn/trunk/normalize.css',
    'http://fonts.googleapis.com/css?family=Courgette|Roboto:400,300',
];
var APIUrlBase = 'http://192.168.1.68:8080/data/restaurants.json';

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log('[Service Worker] Caching App Shell');
            // cache.addAll is atomic. 
            // If any of the files fail it will fail the whole add all
            return cache.addAll(filesToCache);
        })
    )
})

self.addEventListener('activate', function (e) {
    console.log('[Service Worker] Activate');
    e.waitUntil(
        caches.keys().then(function (keyList) {
            return Promise.all(keyList.map(function (key) {
                if (key !== cacheName && key !== dataCacheName) {
                    console.log('[Service Worker] removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    )
})

self.addEventListener('fetch', function (e) {
    console.log('[Service Worker] Fetch', e.request.url);
    // check if the request is to the weather api
    if (e.request.url.startsWith(APIUrlBase)) {
        e.respondWith(
            fetch(e.request)
                .then(function (response) {
                    // opening the cache with data
                    return caches.open(dataCacheName).then(function (cache) {
                        cache.put(e.request.url, response.clone());
                        console.log('[Service Worker] Fetched and Cached Data!');
                    });
                })
        )
    } else {
        e.respondWith(

            // Evaluates request and check if it is available in the cache
            caches.match(e.request).then(function (response) {
                console.log('[Service Worker] Fetch Only!', e.request.url);
                // Returns the resource from cached version 
                // or uses fetch to get it from the network
                return response || fetch(e.request);
            })
        )
    }

})