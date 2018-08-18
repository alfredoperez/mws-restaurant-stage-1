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


var idbVersion = 1;
var apiUrlRestaurants = 'https://immense-dawn-37401.herokuapp.com/';

class IdbHelper {
    static get restaurants() { return 'restaurants'; }
    static get reviews() { return 'reviews'; }
    static get dbName() { return 'restaurants-db'; }

    static get openDatabase() {
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }

        var dbPromise = idb.open(IdbHelper.dbName, idbVersion);
        return dbPromise;
    }

    static initialize(callback) {
        IdbHelper.databaseExists((res) => {
            console.log(IdbHelper.dbName + ' exists? ' + res);
            if (!res) {
                IdbHelper.createNewDatabase();
                IdbHelper.populateDatabase(callback);
                console.log(IdbHelper.dbName + ' created and populated ');
            } else {
                callback();
            }
        });
    }
    static initializeForRestaurant(id, callback) {
        IdbHelper.initialize(() => {
            IdbHelper.populateReviewsById(id, callback);
        });

    }
    /**
     * Check if idb restaurants index exists
     */
    static databaseExists(callback) {
        var req = indexedDB.open(IdbHelper.dbName);
        var existed = true;
        req.onsuccess = function () {
            req.result.close();
            if (!existed)
                indexedDB.deleteDatabase(IdbHelper.dbName);
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
        let DBDeleteRequest = window.indexedDB.deleteDatabase(IdbHelper.dbName);
        DBDeleteRequest.onerror = function () {
            console.log('Error deleting database ' + IdbHelper.dbName);
        };
        DBDeleteRequest.onsuccess = function () {
            console.log('Old db successfully deleted!');
        };
    }

    /**
     * Create new IDB restaurant index
     */
    static createNewDatabase() {
        idb.open(IdbHelper.dbName, idbVersion, function (upgradeDb) {
            if (!upgradeDb.objectStoreNames.contains(IdbHelper.restaurants)) {
                upgradeDb.createObjectStore(IdbHelper.restaurants, { keypath: 'id', autoIncrement: true });
                upgradeDb.createObjectStore('reviews', { keypath: 'id', autoIncrement: true });
                console.log(IdbHelper.dbName + ' has been created!');
            }
        });
    }

    /**
     * Initialize data population
     */
    static populateDatabase(callback) {
        let call = callback;
        fetch(`${apiUrlRestaurants}restaurants/`)
            .then(res => res.json())
            .then(restaurants => {
                IdbHelper.openDatabase.then(
                    db => {
                        if (!db) return;
                        var tx = db.transaction(IdbHelper.restaurants, 'readwrite');
                        var store = tx.objectStore(IdbHelper.restaurants);
                        restaurants.map(restaurant => store.put(restaurant));
                        tx.complete;
                        call();
                    })
            });
    }
    static populateReviewsById(id, callback) {
        let call = callback;
        // Fetch all reviews for the specific restaurant
        const fetchURL = `${apiUrlRestaurants}reviews/?restaurant_id=${id}`;
        fetch(fetchURL, { method: "GET" })
            .then(res => res.json())
            .then(reviews => {
                IdbHelper.openDatabase.then(
                    db => {
                        if (!db) return;
                        var tx = db.transaction(IdbHelper.reviews, 'readwrite');
                        var store = tx.objectStore(IdbHelper.reviews);
                        store.put(reviews, id);
                        tx.complete;
                        call(reviews);
                    })
            })
            .catch(error => callback(error, null));
    }
    static updateCachedRestaurantData(id, updateObj) {
        IdbHelper.openDatabase.then(
            db => {
                console.log("Getting db transaction");
                const tx = db.transaction(IdbHelper.restaurants, "readwrite");
                const store = tx
                    .objectStore(IdbHelper.restaurants)
                    .get(id)
                    .then(restaurant => {
                        if (!restaurant) {
                            console.log("No cached data found");
                            return;
                        }

                        console.log("Specific restaurant obj: ", restaurant);

                        // Update restaurantObj with updateObj details
                        if (!restaurant) return;
                        const keys = Object.keys(updateObj);
                        keys.forEach(k => {
                            restaurant[k] = updateObj[k];
                        });

                        // Put the data back in IDB storage
                        IdbHelper.openDatabase.then(db => {
                            const tx = db.transaction(IdbHelper.restaurants, "readwrite");
                            tx.objectStore(IdbHelper.restaurants)
                                .put(restaurant, id);
                            return tx.complete;
                        });
                    });
            });
    }

    static updateCachedRestaurantReview(id, bodyObj) {
        console.log("updating cache for new review: ", bodyObj);
        // Push the review into the reviews store
        IdbHelper.openDatabase.then(
            db => {
                const tx = db.transaction(IdbHelper.reviews, "readwrite");
                const store = tx.objectStore(IdbHelper.reviews);
                console.log("putting cached review into store");
                store.put({
                    id: Date.now(),
                    restaurant_id: id,
                    data: bodyObj
                });
                console.log("successfully put cached review into store");
                return tx.complete;
            });
    }

    /**
     * Read all data from idb restaurants index
     */
    static readAllIdbData(entity) {
        return IdbHelper.openDatabase.then(db => {
            return db.transaction(entity)
                .objectStore(entity).getAll();
        });
    }

    static updateFavorite(id, newState, callback) {

        fetch(`${apiUrlRestaurants}reviews/${id}/?is_favorite=${newState}`,
            { method: "PUT" })
            .then(response => {
                // If we don't get a good response then assume we're offline
                if (!response.ok && !response.redirected) {
                    return;
                }

            }).then(() => {
                IdbHelper.updateCachedRestaurantData(id, { is_favorite: newState });
                callback(null, { id, value: newState });
            })
    }
    static saveReview(id, name, rating, comment, callback) {

        const body = {
            restaurant_id: id,
            name: name,
            rating: rating,
            comments: comment,
            createdAt: Date.now()
        };

        fetch(`${apiUrlRestaurants}reviews/`, { method: "POST", body: JSON.stringify(body) })
            .then(res => res.json())
            .then((result) => {
                if (result === undefined) return;
                IdbHelper.updateCachedRestaurantReview(result);
                callback(null, result);
            })

    }

    static updateCachedRestaurantReview(bodyObj) {
        IdbHelper.readAllIdbData((previousReviews) => {
            console.log("updating cache for new review: ", bodyObj);
            // Push the review into the reviews store
            IdbHelper.openDatabase.then(db => {
                const tx = db.transaction(IdbHelper.reviews, "readwrite");
                const store = tx.objectStore(IdbHelper.reviews);
                console.log("putting cached review into store");
                previousReviews.push(bodyObj);
                store.put(previousReviews, bodyObj.restaurant_id);
                console.log("successfully put cached review into store");
                return tx.complete;
            });
        })

    }


}
class ViewHelper {
    /**
     * Get a parameter by name from page URL.
     */
    static getParameterByName(name, url) {
        if (!url)
            url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results)
            return null;
        if (!results[2])
            return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    static fillRestaurantHTML(restaurant) {

        let image = document.getElementsByClassName('restaurant-figure')[0];
        image.alt = restaurant.name + ' Restaurant';
        let picture = RestaurantService.createPictureForRestaurant(restaurant);
        ViewHelper.addFavoriteIcon(image, restaurant);
        image.appendChild(picture);

        let name = document.getElementsByClassName('restaurant-name')[0];
        name.innerHTML = restaurant.name;

        let address = document.getElementsByClassName('restaurant-address')[0];
        if (address !== undefined)
            address.innerHTML = restaurant.address;

        let cuisine = document.getElementsByClassName('restaurant-cuisine')[0];
        cuisine.innerHTML = restaurant.cuisine_type;
    };

    static addFavoriteIcon(el, restaurant) {

        const isFavorite = (restaurant["is_favorite"] && restaurant["is_favorite"].toString() === "true") ? true : false;
        const favoriteDiv = document.createElement("div");
        favoriteDiv.className = "favorite-icon";
        const favorite = document.createElement("button");
        favorite.style.background = isFavorite
            ? `url("/images/fav-2.svg") no-repeat`
            : `url("/images/fav-1.svg") no-repeat`;
        favorite.innerHTML = isFavorite
            ? restaurant.name + " is a favorite"
            : restaurant.name + " is not a favorite";
        favorite.id = "favorite-icon-" + restaurant.id;
        favorite.onclick = () => ViewHelper.handleFavoriteClick(restaurant, !isFavorite);
        favoriteDiv.append(favorite);
        el.append(favoriteDiv);

    }

    static handleFavoriteClick(restaurant, newState) {
        // Update properties of the restaurant data object
        const favorite = document.getElementById("favorite-icon-" + restaurant.id);
        restaurant["is_favorite"] = newState;
        favorite.onclick = null;

        IdbHelper.updateFavorite(restaurant.id, newState, (error, resultObj) => {
            if (error) {
                console.log("Error updating favorite");
                return;
            }
            const isFavorite = resultObj.value;
            // Update the button background for the specified favorite
            const favorite = document.getElementById("favorite-icon-" + resultObj.id);
            favorite.style.background = isFavorite
                ? `url("/images/fav-2.svg") no-repeat`
                : `url("/images/fav-1.svg") no-repeat`;

            favorite.onclick = () => ViewHelper.handleFavoriteClick(restaurant, !isFavorite);
        });
    };

    /**
     * Add restaurant name to the breadcrumb navigation menu
     */
    static fillBreadcrumb(restaurant, isInReviewPage = false) {
        const breadcrumb = document.getElementById("breadcrumb");
        const li1 = document.createElement("li");
        const a1 = document.createElement("a");
        a1.href = "/restaurant.html?id=" + restaurant.id;
        a1.innerHTML = restaurant.name;
        li1.appendChild(a1);
        breadcrumb.appendChild(li1);

        if (isInReviewPage) {
            const li2 = document.createElement("li");
            const a2 = document.createElement("a");
            a2.href = window.location;
            a2.innerHTML = "Write Review";
            li2.appendChild(a2);
            breadcrumb.appendChild(li2);
        }
    };

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

    return 'https://immense-dawn-37401.herokuapp.com/';
  }


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return IdbHelper.readAllIdbData(IdbHelper.restaurants)
      .then(response => {

        return response;
      });
  }
  /**
 * Fetch all restaurants.
 */
  static fetchReviews(restaurantId) {
    return IdbHelper.openDatabase.then(db => {
      return db.transaction(IdbHelper.reviews)
        .objectStore(IdbHelper.reviews)
        .get(restaurantId);

    });
  }


  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    return RestaurantService.fetchRestaurants()
      .then(restaurants => {
        let restaurant = restaurants.filter(r => r.id == id);
        return restaurant[0];
      })

  }
  /**
 * Fetch a restaurant by its ID.
 */
  static fetchReviewsById(id) {
    return RestaurantService.fetchReviews()
      .then(reviews => {
        let review = reviews.filter(r => r.id == id);
        return review[0];
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
        let results = restaurants.filter(r => r.cuisine_type == cuisine);
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
        let results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(restaurants, cuisine, neighborhood) {

    let results = restaurants;
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
    let neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
    // Remove duplicates from neighborhoods
    let uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
    return uniqueNeighborhoods;
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(restaurants) {
    // Fetch all restaurants
    let cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
    // Remove duplicates from cuisines
    let uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
    return uniqueCuisines;

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
    let srcSet = restaurant.photograph === undefined
      ? 'images/undefined-500_small.jpg'
      : size === 'large'
        ? 'images/' + restaurant.photograph + '-1600_1600_large_2x.jpg 2x, images/' + restaurant.photograph + '-800_800_large_1x.jpg'
        : size === 'medium'
          ? 'images/' + restaurant.photograph + '-500_medium.jpg'
          : 'images/' + restaurant.photograph + '-500_small.jpg';
    return srcSet;
  }
  static setStaticAllRestaurantsMapImage(restaurants, onClickStaticMap) {
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    const mapDiv = document.getElementById("map");
    // Create static map image for initial display
    let mapURL = `https://maps.googleapis.com/maps/api/staticmap?center=${
      loc.lat},${loc.lng}&zoom=12&size=${mapDiv.clientWidth}x${mapDiv.clientHeight}&markers=color:red`;
    restaurants.forEach(r => {
      mapURL += `|${r.latlng.lat},${r.latlng.lng}`;
    });
    mapURL += "&key=AIzaSyDoDNWukXLvotuWDEci0WLuv9QXXbyXLF8";


    mapDiv.alt = "Map Image";
    mapDiv.onclick = () => {
      if (onClickStaticMap !== undefined) onClickStaticMap();
      else switchToLiveMap()
    };
    mapDiv.style.backgroundImage = `url(${mapURL})`;
    mapDiv.style.backgroundSize = 'cover';
    mapDiv.style.backgroundRepeat = 'no-repeat';
    mapDiv.style.backgroundPosition = '50% 50%';
  }
  static createPictureForRestaurant(restaurant) {
    let picture = document.createElement('picture');

    let largeSource = document.createElement('source');
    largeSource.media = '(min-width:1000px)';
    largeSource.srcset = this.imageSrcsetForRestaurant(restaurant, 'large');
    largeSource.alt = restaurant.name + ' image';
    largeSource.classList.add('restaurant-img-large');

    picture.appendChild(largeSource);

    let mediumSource = document.createElement('source');
    mediumSource.media = '(min-width:500px)';
    mediumSource.srcset = this.imageSrcsetForRestaurant(restaurant, 'medium');
    mediumSource.alt = restaurant.name + ' image';
    mediumSource.classList.add('restaurant-img-medium');
    picture.appendChild(mediumSource);

    let smallSource = document.createElement('img');
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
    let marker = new google
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
document.addEventListener('DOMContentLoaded', () => {

    const vm = new RestaurantReviewViewModel();
    IdbHelper.initialize(() => vm.initialize());

});

class RestaurantReviewViewModel {
    initialize() {
        let that = this;
        var id = ViewHelper.getParameterByName('id') || 0;
        document.getElementById('btnSaveReview').addEventListener(
            'click',
            this.saveReview.bind(this)
        );
        RestaurantService.fetchRestaurantById(id).then(restaurant => {
            if (restaurant === undefined) {
                console.error('Restaurant not found');
                return;
            }
            that.restaurant = restaurant;
            ViewHelper.fillRestaurantHTML(that.restaurant);
            ViewHelper.fillBreadcrumb(that.restaurant, true);
        });
    }

    saveReview() {
        // Get the data points for the review
        const name = document.getElementById("reviewName").value;
        const rating = document.getElementById("reviewRating").value - 0;
        const comment = document.getElementById("reviewComment").value;

        console.log("reviewName: ", name);

        // Block any more clicks on the submit button until the callback
        const btn = document.getElementById("btnSaveReview");
        btn.onclick = null;

        IdbHelper.saveReview(this.restaurant.id, name, rating, comment, (error, review) => {
            console.log("got saveReview callback");
            if (error) {
                console.log("Error saving review")
            }
            // Update the button onclick event
            const btn = document.getElementById("btnSaveReview");
            btn.onclick = event => saveReview();

            window.location.href = "/restaurant.html?id=" + review.restaurant_id;
        });
    }

}