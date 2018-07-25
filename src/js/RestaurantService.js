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