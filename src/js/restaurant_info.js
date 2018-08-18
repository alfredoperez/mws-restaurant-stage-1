/**
 * Initialize Google map, called from HTML.
 */
document.addEventListener('DOMContentLoaded', () => {
  const vm = new RestaurantInfoViewModel();
  let id = ViewHelper.getParameterByName('id') || 0;
  IdbHelper.initializeForRestaurant(id, () => vm.initialize());

});

class RestaurantInfoViewModel {

  initialize(reviews) {
    let that = this;
    let id = ViewHelper.getParameterByName('id') || 0;

    RestaurantService.fetchRestaurantById(id)
      .then(restaurant => {

        that.restaurant = restaurant;
        ViewHelper.fillRestaurantHTML(that.restaurant);
        if (restaurant.operating_hours) {
          this.fillRestaurantHoursHTML();
        }
        ViewHelper.fillBreadcrumb(that.restaurant);
        RestaurantService.fetchReviews(id).then((reviews) => {
          that.fillReviewsHTML(reviews);
          setTimeout(() => {
            RestaurantService.setStaticAllRestaurantsMapImage(
              [that.restaurant],
              that.switchToLiveMap.bind(that)
            );
          }, 15);
        });
      });
  };

  switchToLiveMap() {
    if (this.liveMap !== undefined)
      return;

    let map = document.getElementsByClassName('map')[0];
    this.map = new google
      .maps
      .Map(map, {
        zoom: 16,
        center: this.restaurant.latlng,
        scrollwheel: false
      });

    RestaurantService.mapMarkerForRestaurant(this.restaurant, this.map);
    this.liveMap = true;
  };

  fillRestaurantHoursHTML(operatingHours = this.restaurant.operating_hours) {
    let hours = document.getElementsByClassName('restaurant-hours')[0];
    for (let key in operatingHours) {
      let row = document.createElement('tr');

      let day = document.createElement('td');
      day.innerHTML = key;
      row.appendChild(day);

      let time = document.createElement('td');
      if (operatingHours.hasOwnProperty(key)) {
        time.innerHTML = operatingHours[key];
        row.appendChild(time);
      }

      hours.appendChild(row);
    }
  };


  fillReviewsHTML(reviews) {
    let container = document.getElementsByClassName('reviews-container')[0];
    let title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    const addReviewLink = document.createElement("a");
    addReviewLink.href = `/review.html?id=${this.restaurant.id}`;
    addReviewLink.innerHTML = "Add Review";
    addReviewLink.className = "add-review-button";
    container.appendChild(addReviewLink);

    if (!reviews) {

      let noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    let ul = document.getElementsByClassName('reviews-list')[0];
    reviews.forEach(review => {
      ul.appendChild(RestaurantInfoViewModel.createReviewHTML(review));
    });
    container.appendChild(ul);
  };

  /**
   * Create review HTML and add it to the webpage.
   */
  static createReviewHTML(review) {
    let li = document.createElement('li');
    li
      .classList
      .add('reviewer');

    let header = document.createElement('div');
    header
      .classList
      .add('reviewer-header');

    let name = document.createElement('p');
    name
      .classList
      .add('name');
    name.innerHTML = review.name;
    header.appendChild(name);

    let date = document.createElement('p');
    date
      .classList
      .add('date');
    date.innerHTML = new Date(review.createdAt).toDateString();
    header.appendChild(date);

    li.appendChild(header);

    let rating = document.createElement('p');
    rating
      .classList
      .add('rating');
    rating.innerHTML = 'Rating: ' + review.rating;
    li.appendChild(rating);

    let comments = document.createElement('p');
    comments
      .classList
      .add('comments');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
  };


}

