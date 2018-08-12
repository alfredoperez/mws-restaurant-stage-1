class ViewHelper {
    /**
     * Get a parameter by name from page URL.
     */
    static getParameterByName(name, url) {
        if (!url)
            url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results)
            return null;
        if (!results[2])
            return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    static fillRestaurantHTML(restaurant) {

        let name = document.getElementsByClassName('restaurant-name')[0];
        name.innerHTML = restaurant.name;

        let address = document.getElementsByClassName('restaurant-address')[0];
        if (address !== undefined)
            address.innerHTML = restaurant.address;

        let image = document.getElementsByClassName('restaurant-figure')[0];
        image.alt = restaurant.name + ' Restaurant';
        let picture = RestaurantService.createPictureForRestaurant(restaurant);
        ViewHelper.addFavoriteIcon(image, restaurant);
        image.appendChild(picture);

        let cuisine = document.getElementsByClassName('restaurant-cuisine')[0];
        cuisine.innerHTML = restaurant.cuisine_type;
    };

    static addFavoriteIcon(el, restaurant) {

        const isFavorite = (restaurant["is_favorite"] && restaurant["is_favorite"].toString() === "true") ? true : false;
        const favoriteDiv = document.createElement("div");
        favoriteDiv.className = "favorite-icon";
        const favorite = document.createElement("button");
        favorite.style.background = isFavorite
            ? `url("/images/fav-2.svg") no-repeat`
            : `url("/images/fav-1.svg") no-repeat`;
        favorite.innerHTML = isFavorite
            ? restaurant.name + " is a favorite"
            : restaurant.name + " is not a favorite";
        favorite.id = "favorite-icon-" + restaurant.id;
        favorite.onclick = () => ViewHelper.handleFavoriteClick(restaurant, !isFavorite);
        favoriteDiv.append(favorite);
        el.append(favoriteDiv);

    }

    static handleFavoriteClick(restaurant, newState) {
        // Update properties of the restaurant data object
        const favorite = document.getElementById("favorite-icon-" + restaurant.id);
        restaurant["is_favorite"] = newState;
        favorite.onclick = null;

        IdbHelper.updateFavorite(restaurant.id, newState, (error, resultObj) => {
            if (error) {
                console.log("Error updating favorite");
                return;
            }
            const isFavorite = resultObj.value;
            // Update the button background for the specified favorite
            const favorite = document.getElementById("favorite-icon-" + resultObj.id);
            favorite.style.background = isFavorite
                ? `url("/images/fav-2.svg") no-repeat`
                : `url("/images/fav-1.svg") no-repeat`;

            favorite.onclick = () => ViewHelper.handleFavoriteClick(restaurant, !isFavorite);
        });
    };

    /**
     * Add restaurant name to the breadcrumb navigation menu
     */
    static fillBreadcrumb(restaurant, isInReviewPage = false) {
        const breadcrumb = document.getElementById("breadcrumb");
        const li1 = document.createElement("li");
        const a1 = document.createElement("a");
        a1.href = "/restaurant.html?id=" + restaurant.id;
        a1.innerHTML = restaurant.name;
        li1.appendChild(a1);
        breadcrumb.appendChild(li1);

        if (isInReviewPage) {
            const li2 = document.createElement("li");
            const a2 = document.createElement("a");
            a2.href = window.location;
            a2.innerHTML = "Write Review";
            li2.appendChild(a2);
            breadcrumb.appendChild(li2);
        }
    };

}