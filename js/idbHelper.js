/*eslint-env es6*/
const idbDb = 'restaurants-db';
const idbObj = 'restaurants';
const version = 1;

const apiUrlRestaurants = `https://lit-reaches-37723.herokuapp.com/restaurants`;

class IdbHelper {
    static get dbPromise() {
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }

        const dbPromise = idb.open(idbDb, version);
        return dbPromise;
    }

    static initialize(callback) {
        IdbHelper.databaseExists((res) => {
            console.log(IdbHelper.idbDb + ' exists? ' + res);
            if (res) {
                IdbHelper.createNewDatabase();
                IdbHelper.populateDatabase(callback);
            } else {
                callback();
            }
        });
    }
    /**
     * Check if idb restaurants index exists
     */
    static databaseExists(callback) {
        var req = indexedDB.open(idbDb);
        var existed = true;
        req.onsuccess = function () {
            req.result.close();
            if (!existed)
                indexedDB.deleteDatabase(idbDb);
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
        let DBDeleteRequest = window.indexedDB.deleteDatabase(idbDb);
        DBDeleteRequest.onerror = function () {
            console.log('Error deleting database ' + idbDb);
        };
        DBDeleteRequest.onsuccess = function () {
            console.log('Old db successfully deleted!');
        };
    }

    /**
     * Create new IDB restaurant index
     */
    static createNewDatabase() {
        /*eslint-disable no-undef*/
        idb.open(idbDb, version, function (upgradeDb) {
            /*eslint-enable no-undef*/
            if (!upgradeDb.objectStoreNames.contains(idbObj)) {
                upgradeDb.createObjectStore(idbObj, { keypath: 'id', autoIncrement: true });
            }
            console.log(idbDb + ' has been created!');
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
                IdbHelper.dbPromise.then(
                    db => {
                        const tx = db.transaction(idbObj, 'readwrite');
                        const store = tx.objectStore(idbObj);
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
        return IdbHelper.dbPromise.then(db => {
            return db.transaction(idbObj)
                .objectStore(idbObj).getAll();
        });
    }


}