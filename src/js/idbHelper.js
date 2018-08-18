

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