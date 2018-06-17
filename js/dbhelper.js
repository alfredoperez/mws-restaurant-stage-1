/**
 * Common database helper functions.
 * 
 */

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 8000 // Change this to your server port
    return `https://lit-reaches-37723.herokuapp.com/restaurants`;
  }


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    return fetch(DBHelper.DATABASE_URL)
      .then(response => {
        return response.text();
      })
      .then(responseBodyAsText => {
        try {
          const bodyAsJson = JSON.parse(responseBodyAsText);
          return restaurants = bodyAsJson;
        } catch (e) {
          Promise.reject({ body: responseBodyAsText, type: 'unparsable' });
        }
      })

      .catch(err => {
        if (false === err instanceof Error && err.type && err.type === 'unparsable') {
          this.props.dispatch(displayTheError(err.body))
          return;
        }
        throw err;
      })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    fetch(`${DBHelper.DATABASE_URL}/1`)
      .then(response => {

        return response.json()
      })
      .catch((e, part) => {
        console.log(e + ' part :' + part);
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants().then((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(restaurants, cuisine, neighborhood) {

    let results = restaurants
    if (cuisine != 'all') { // filter by cuisine
      results = results.filter(r => r.cuisine_type == cuisine);
    }
    if (neighborhood != 'all') { // filter by neighborhood
      results = results.filter(r => r.neighborhood == neighborhood);
    }
    return results;
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(retaurants) {
    const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
    // Remove duplicates from neighborhoods
    const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
    return uniqueNeighborhoods;
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(restaurants) {
    // Fetch all restaurants
    const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
    // Remove duplicates from cuisines
    const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
    return cuisines;

  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`images/${restaurant.photograph}-500_small.jpg`);
  }

  /**
   * Restaurant image URL.
   */
  static imageSrcsetForRestaurant(restaurant, size) {
    var srcSet = size === 'large'
      ? `images/${restaurant.photograph}-1600_1600_large_2x.jpg 2x, images/${restaurant.photograph}-800_800_large_1x.jpg`
      : size === 'medium'
        ? `images/${restaurant.photograph}-500_medium.jpg`
        : `images/${restaurant.photograph}-500_small.jpg`
    return srcSet;
  }

  static createPictureForRestaurant(restaurant) {
    const picture = document.createElement('picture');

    const largeSource = document.createElement('source');
    largeSource.media = '(min-width:750px)';
    largeSource.srcset = this.imageSrcsetForRestaurant(restaurant, 'large');
    largeSource.alt = `${restaurant.name} image`;
    largeSource.classList.add('restaurant-img-large');

    picture.appendChild(largeSource);

    const mediumSource = document.createElement('source');
    mediumSource.media = '(min-width:500px)';
    mediumSource.srcset = this.imageSrcsetForRestaurant(restaurant, 'medium');
    mediumSource.alt = `${restaurant.name} image`;
    mediumSource.classList.add('restaurant-img-medium');
    picture.appendChild(mediumSource);

    const smallSource = document.createElement('img');
    smallSource.src = this.imageSrcsetForRestaurant(restaurant, 'small');
    smallSource.alt = `${restaurant.name} image`;
    smallSource.classList.add('restaurant-img-small');
    picture.appendChild(smallSource);

    return picture;
  }
  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google
      .maps
      .Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP
      });
    return marker;
  }

}