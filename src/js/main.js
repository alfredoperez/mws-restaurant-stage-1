document.addEventListener('DOMContentLoaded', () => {
  const vm = new RestaurantsViewModel();
  IdbHelper.initialize(() => vm.initialize());
});

class RestaurantsViewModel {

  constructor() {

    this.markers = []
    this.firstLoad = true;
    this.liveMap = false;
  }
  initialize() {
    let that = this;
    RestaurantService.fetchRestaurants()
      .then((response) => {
        that.restaurantsData = response;
        that.restaurants = response;
        RestaurantService.setStaticAllRestaurantsMapImage(
          this.restaurants,
          that.switchToLiveMap.bind(that));
        that.updateRestaurants();
        that.fillNeighborhoods();
        that.fillCuisines();
        that.firstLoad = false;
      });

  }


  fillNeighborhoods() {
    this.neighborhoods = RestaurantService.fetchNeighborhoods(this.restaurantsData);
    var select = document.getElementsByClassName('neighborhoods-select')[0];
    this.neighborhoods.forEach(neighborhood => {
      var option = document.createElement('option');
      option.innerHTML = neighborhood;
      option.value = neighborhood;
      select.append(option);
    });
    select.addEventListener('change', this.updateRestaurants.bind(this));
  }

  fillCuisines() {
    this.cuisines = RestaurantService.fetchCuisines(this.restaurantsData);
    var select = document.getElementsByClassName('cuisines-select')[0];

    this.cuisines.forEach(cuisine => {
      var option = document.createElement('option');
      option.innerHTML = cuisine;
      option.value = cuisine;
      select.append(option);
    });
    select.addEventListener('change', this.updateRestaurants.bind(this));
  }

  switchToLiveMap() {
    if (this.liveMap)
      return;


    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    this.map = new google
      .maps
      .Map(document.getElementsByClassName('map')[0], {
        zoom: 12,
        center: loc,
        scrollwheel: false
      });
    this.addMarkersToMap();
    this.liveMap = true;
  }

  updateRestaurants() {
    if (!this.restaurantsData) return;
    var cSelect = document.getElementsByClassName('cuisines-select')[0];
    var nSelect = document.getElementsByClassName('neighborhoods-select')[0];

    var cIndex = cSelect.selectedIndex;
    var nIndex = nSelect.selectedIndex;

    var cuisine = cSelect[cIndex].value;
    var neighborhood = nSelect[nIndex].value;

    var filteredRestaurants = RestaurantService.fetchRestaurantByCuisineAndNeighborhood(
      this.restaurantsData,
      cuisine,
      neighborhood);

    this.resetRestaurants(filteredRestaurants);
    this.fillRestaurantsHTML();
    if (!this.firstLoad) {

      if (this.liveMap) {
        this.addMarkersToMap();
      } else {
        this.switchToLiveMap();
      }
    }
  }

  resetRestaurants(restaurants) {
    // Remove all restaurants
    this.restaurants = [];
    var ul = document.getElementsByClassName('restaurants-list')[0];
    ul.innerHTML = '';
    this.restaurants = restaurants;
  }

  fillRestaurantsHTML() {
    console.log('fillREstaurants');
    var ul = document.getElementsByClassName('restaurants-list')[0];
    this.restaurants.forEach(restaurant => {
      this.createRestaurantHTML(restaurant, ul);
    });

  }
  /**
   * Create restaurant HTML.
   */
  createRestaurantHTML(restaurant, ul) {
    var li = document.createElement('li');

    var image = document.createElement('img');
    image.className = 'restaurant-img';
    image.id = 'restaurant-img-' + restaurant.id;
    image.alt = restaurant.name + ' image for restaurant ' + restaurant.id;
    //image.srcset = RestaurantService.imageSrcsetForRestaurant(restaurant);
    image.src = RestaurantService.imageUrlForRestaurant(restaurant);

    li.append(image);

    var name = document.createElement('h2');
    name.innerHTML = restaurant.name;
    li.append(name);
    ViewHelper.addFavoriteIcon(li, restaurant);

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


  addMarkersToMap() {
    // Remove all map markers
    if (!this.map || !this.restaurants) return;
    this
      .markers
      .forEach(m => m.setMap(null));
    this.markers = [];

    this.restaurants.forEach((restaurant) => {
      // Add marker to the map
      var marker = RestaurantService.mapMarkerForRestaurant(restaurant, this.map);
      google
        .maps
        .event
        .addListener(marker, 'click', () => {
          window.location.href = marker.url
        });
      this
        .markers
        .push(marker);

    });
  }
}
