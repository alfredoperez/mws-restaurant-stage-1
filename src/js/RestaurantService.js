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