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