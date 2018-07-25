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