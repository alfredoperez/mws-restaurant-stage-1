let restaurants,
  restaurantsData,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  DBHelper.fetchRestaurants().then((response) => {
    self.restaurantsData = response;
    updateRestaurants();
    fetchNeighborhoods();
    fetchCuisines();
  })

});


/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {

  self.neighborhoods = DBHelper.fetchNeighborhoods(self.restaurantsData);
  fillNeighborhoodsHTML();
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementsByClassName('neighborhoods-select')[0];
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {

  self.cuisines = DBHelper.fetchCuisines(self.restaurantsData);
  fillCuisinesHTML();

}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementsByClassName('cuisines-select')[0];

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
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
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  if (!self.map || !self.restaurantsData) return;
  const cSelect = document.getElementsByClassName('cuisines-select')[0];
  const nSelect = document.getElementsByClassName('neighborhoods-select')[0];

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  const filteredRestaurants = DBHelper.fetchRestaurantByCuisineAndNeighborhood(self.restaurantsData, cuisine, neighborhood);

  resetRestaurants(filteredRestaurants);
  fillRestaurantsHTML(self.restaurants);


}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementsByClassName('restaurants-list')[0];
  ul.innerHTML = '';

  // Remove all map markers
  self
    .markers
    .forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants) => {
  const ul = document.getElementsByClassName('restaurants-list')[0];
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.alt = `${restaurant.name} image`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.tabIndex = 0;
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
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
