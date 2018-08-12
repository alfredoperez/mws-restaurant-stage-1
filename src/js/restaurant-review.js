document.addEventListener('DOMContentLoaded', () => {

    const vm = new RestaurantReviewViewModel();
    IdbHelper.initialize(() => vm.initialize());

});

class RestaurantReviewViewModel {
    initialize() {
        let that = this;
        var id = ViewHelper.getParameterByName('id') || 0;
        document.getElementById('btnSaveReview').addEventListener(
            'click',
            this.saveReview.bind(this)
        );
        RestaurantService.fetchRestaurantById(id).then(restaurant => {
            if (restaurant === undefined) {
                console.error('Restaurant not found');
                return;
            }
            that.restaurant = restaurant;
            ViewHelper.fillRestaurantHTML(that.restaurant);
            ViewHelper.fillBreadcrumb(that.restaurant, true);
        });
    }

    saveReview() {
        // Get the data points for the review
        const name = document.getElementById("reviewName").value;
        const rating = document.getElementById("reviewRating").value - 0;
        const comment = document.getElementById("reviewComment").value;

        console.log("reviewName: ", name);

        // Block any more clicks on the submit button until the callback
        const btn = document.getElementById("btnSaveReview");
        btn.onclick = null;

        IdbHelper.saveReview(this.restaurant.id, name, rating, comment, (error, review) => {
            console.log("got saveReview callback");
            if (error) {
                console.log("Error saving review")
            }
            // Update the button onclick event
            const btn = document.getElementById("btnSaveReview");
            btn.onclick = event => saveReview();

            window.location.href = "/restaurant.html?id=" + self.restaurant.id;
        });
    }

}