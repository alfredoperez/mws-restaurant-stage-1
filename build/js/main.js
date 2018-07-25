//'use strict';
// ref: https://www.npmjs.com/package/idb

/*eslint-disable no-undef*/
(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());
/*eslint-env es6*/

var idbObj = 'restaurants';
var idbVersion = 1;

var apiUrlRestaurants = 'https://lit-reaches-37723.herokuapp.com/restaurants';

class IdbHelper {
    static get openDatabase() {
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }

        var dbPromise = idb.open('restaurants-db', idbVersion);
        return dbPromise;
    }

    static initialize(callback) {
        IdbHelper.databaseExists((res) => {
            console.log('restaurants-db' + ' exists? ' + res);
            if (!res) {
                IdbHelper.createNewDatabase();
                IdbHelper.populateDatabase(callback);
                console.log('restaurants-db' + ' created and populated ');
            } else {
                callback();
            }
        });
    }
    /**
     * Check if idb restaurants index exists
     */
    static databaseExists(callback) {
        var req = indexedDB.open('restaurants-db');
        var existed = true;
        req.onsuccess = function () {
            req.result.close();
            if (!existed)
                indexedDB.deleteDatabase('restaurants-db');
            callback(existed);
        };
        req.onupgradeneeded = function () {
            existed = false;
        };
    }

    /**
     * Delete idb restaurants index if exists
     */
    static deleteOldDatabase() {
        let DBDeleteRequest = window.indexedDB.deleteDatabase('restaurants-db');
        DBDeleteRequest.onerror = function () {
            console.log('Error deleting database ' + 'restaurants-db');
        };
        DBDeleteRequest.onsuccess = function () {
            console.log('Old db successfully deleted!');
        };
    }

    /**
     * Create new IDB restaurant index
     */
    static createNewDatabase() {
        idb.open('restaurants-db', idbVersion, function (upgradeDb) {
            if (!upgradeDb.objectStoreNames.contains(idbObj)) {
                upgradeDb.createObjectStore(idbObj, { keypath: 'id', autoIncrement: true });
                console.log('restaurants-db' + ' has been created!');
            }
        });
    }

    /**
     * Initialize data population
     */
    static populateDatabase(callback) {
        let call = callback;
        fetch(apiUrlRestaurants)
            .then(res => res.json())
            .then(restaurants => {
                IdbHelper.openDatabase.then(
                    db => {
                        if (!db) return;
                        var tx = db.transaction(idbObj, 'readwrite');
                        var store = tx.objectStore(idbObj);
                        restaurants.map(restaurant => store.put(restaurant));
                        tx.complete;
                        call();
                    })
            });
    }



    /**
     * Read all data from idb restaurants index
     */
    static readAllIdbData() {
        return IdbHelper.openDatabase.then(db => {
            return db.transaction(idbObj)
                .objectStore(idbObj).getAll();
        });
    }


}
/**
 * Common database helper functions.
 * 
 */

class RestaurantService {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {

    return 'https://lit-reaches-37723.herokuapp.com/restaurants';
  }


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return IdbHelper.readAllIdbData()
      .then(response => {

        return response;
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    return RestaurantService.fetchRestaurants()
      .then(restaurants => {
        var restaurant = restaurants.filter(r => r.id == id);
        return restaurant[0];
      })

  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    RestaurantService.fetchRestaurants().then((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        var results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    RestaurantService.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        var results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(restaurants, cuisine, neighborhood) {

    let results = restaurants
    if (cuisine !== 'all') { // filter by cuisine
      results = results.filter(r => r.cuisine_type == cuisine);
    }
    if (neighborhood !== 'all') { // filter by neighborhood
      results = results.filter(r => r.neighborhood == neighborhood);
    }
    return results;
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(restaurants) {
    var neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
    // Remove duplicates from neighborhoods
    var uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
    return uniqueNeighborhoods;
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(restaurants) {
    // Fetch all restaurants
    var cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
    // Remove duplicates from cuisines
    var uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
    return cuisines;

  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return ('./restaurant.html?id=' + restaurant.id);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {

    return restaurant.photograph === undefined
      ? 'images/undefined-500_small.jpg'
      : 'images/' + restaurant.photograph + '-500_small.jpg';
  }

  /**
   * Restaurant image URL.
   */
  static imageSrcsetForRestaurant(restaurant, size) {
    var srcSet = restaurant.photograph === undefined
      ? 'images/undefined-500_small.jpg'
      : size === 'large'
        ? 'images/' + restaurant.photograph + '-1600_1600_large_2x.jpg 2x, images/' + restaurant.photograph + '-800_800_large_1x.jpg'
        : size === 'medium'
          ? 'images/' + restaurant.photograph + '-medium.jpg'
          : 'images/' + restaurant.photograph + '-500_small.jpg';
    return srcSet;
  }
  static async setStaticAllRestaurantsMapImage(restaurants) {
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    const mapDiv = document.getElementById("map");
    // Create static map image for initial display
    let mapURL = `https://maps.googleapis.com/maps/api/staticmap?center=${
      loc.lat},${loc.lng}&zoom=12&size=400x400&markers=color:red`;
    restaurants.forEach(r => {
      mapURL += `|${r.latlng.lat},${r.latlng.lng}`;
    });
    mapURL += "&key=AIzaSyCKSc-OLG4ijho4YL41eL3WCHvehx8xADc";
    //const mapURL = RestaurantService.getStaticAllRestaurantsMapImage(self.restaurants);

    const mapImg = document.createElement("img");
    mapImg.id = "mapImg";
    mapImg.alt = "Map Image"
    mapImg.onclick = e => switchToLiveMap();
    mapImg.src = mapURL;
    mapDiv.append(mapImg);
    return mapURL;
  }
  static createPictureForRestaurant(restaurant) {
    var picture = document.createElement('picture');

    var largeSource = document.createElement('source');
    largeSource.media = '(min-width:750px)';
    largeSource.srcset = this.imageSrcsetForRestaurant(restaurant, 'large');
    largeSource.alt = restaurant.name + ' image';
    largeSource.classList.add('restaurant-img-large');

    picture.appendChild(largeSource);

    var mediumSource = document.createElement('source');
    mediumSource.media = '(min-width:500px)';
    mediumSource.srcset = this.imageSrcsetForRestaurant(restaurant, 'medium');
    mediumSource.alt = restaurant.name + ' image';
    mediumSource.classList.add('restaurant-img-medium');
    picture.appendChild(mediumSource);

    var smallSource = document.createElement('img');
    smallSource.src = this.imageSrcsetForRestaurant(restaurant, 'small');
    smallSource.alt = restaurant.name + ' image';
    smallSource.classList.add('restaurant-img-small');
    picture.appendChild(smallSource);

    return picture;
  }
  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    var marker = new google
      .maps
      .Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: RestaurantService.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP
      });
    return marker;
  }

}
let restaurants,
  restaurantsData,
  neighborhoods,
  cuisines, firstLoad = true, liveMap = false;
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  IdbHelper.initialize(self.initialize);
});

initialize = () => {
  RestaurantService.fetchRestaurants()
    .then((response) => {
      self.restaurantsData = response;
      self.restaurants = response;
      initFakeMap();
      updateRestaurants();
      fetchNeighborhoods();
      fetchCuisines();
      firstLoad = false;
      //addMarkersToMap();
    });

}


/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {

  self.neighborhoods = RestaurantService.fetchNeighborhoods(self.restaurantsData);
  fillNeighborhoodsHTML();
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  var select = document.getElementsByClassName('neighborhoods-select')[0];
  neighborhoods.forEach(neighborhood => {
    var option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {

  self.cuisines = RestaurantService.fetchCuisines(self.restaurantsData);
  fillCuisinesHTML();

}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  var select = document.getElementsByClassName('cuisines-select')[0];

  cuisines.forEach(cuisine => {
    var option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  // IdbHelper.populateDatabase()

}
async function initFakeMap() {
  RestaurantService.setStaticAllRestaurantsMapImage(self.restaurants);
  // const mapDiv = document.getElementById("map");
  // const mapImg = document.createElement("img");
  // mapImg.id = "mapImg";
  // mapImg.onclick = e => switchToLiveMap();
  // mapImg.src = mapURL;
  // mapDiv.append(mapImg);

}
switchToLiveMap = () => {
  if (liveMap)
    return;

  document
    .getElementById("mapImg")
    .remove();
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google
    .maps
    .Map(document.getElementsByClassName('map')[0], {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
  addMarkersToMap();
  liveMap = true;
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  if (!self.restaurantsData) return;
  var cSelect = document.getElementsByClassName('cuisines-select')[0];
  var nSelect = document.getElementsByClassName('neighborhoods-select')[0];

  var cIndex = cSelect.selectedIndex;
  var nIndex = nSelect.selectedIndex;

  var cuisine = cSelect[cIndex].value;
  var neighborhood = nSelect[nIndex].value;

  var filteredRestaurants = RestaurantService.fetchRestaurantByCuisineAndNeighborhood(self.restaurantsData, cuisine, neighborhood);

  resetRestaurants(filteredRestaurants);
  fillRestaurantsHTML();
  if (!firstLoad) {

    if (liveMap) {
      addMarkersToMap();
    } else {
      switchToLiveMap();
    }
  }
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  var ul = document.getElementsByClassName('restaurants-list')[0];
  ul.innerHTML = '';
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = () => {
  console.log('fillREstaurants');
  var ul = document.getElementsByClassName('restaurants-list')[0];
  self.restaurants.forEach(restaurant => {
    createRestaurantHTML(restaurant, ul);
  });

}


/**
 * Create restaurant HTML.
 */
function createRestaurantHTML(restaurant, ul) {
  var li = document.createElement('li');

  var image = document.createElement('img');
  image.className = 'restaurant-img';
  image.id = 'restaurant-img-' + restaurant.id;
  image.alt = restaurant.name + ' image';
  //image.srcset = RestaurantService.imageSrcsetForRestaurant(restaurant);
  image.src = RestaurantService.imageUrlForRestaurant(restaurant);
  li.append(image);

  var name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  var neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  var address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  var more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.tabIndex = 0;
  more.href = RestaurantService.urlForRestaurant(restaurant);
  li.append(more);
  ul.append(li);
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  // Remove all map markers
  if (!self.map || !self.restaurants) return;
  self
    .markers
    .forEach(m => m.setMap(null));
  self.markers = [];


  self.restaurants.forEach((restaurant) => {
    // Add marker to the map
    var marker = RestaurantService.mapMarkerForRestaurant(restaurant, self.map);
    google
      .maps
      .event
      .addListener(marker, 'click', () => {
        window.location.href = marker.url
      });
    self
      .markers
      .push(marker);


  });
}