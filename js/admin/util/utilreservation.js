// reservations.js

document.addEventListener("DOMContentLoaded", function () {

    const servicesListEl = document.getElementById("servicesList");
    const menuItemsListEl = document.getElementById("menuItemsList");
    const reservationForm = document.getElementById("reservationForm");

    // Fetch Hotel Services
    function loadHotelServices() {
        fetch("api/admin/pages/utilities/hotel-services.php")
            .then(res => res.json())
            .then(data => {
                servicesListEl.innerHTML = "";
                if (data.success && data.services.length > 0) {
                    data.services.forEach(service => {
                        const wrapper = document.createElement("div");
                        wrapper.className = "flex items-center";
                        wrapper.innerHTML = `
                            <input type="checkbox" 
                                   id="service_${service.service_id}" 
                                   name="services[]" 
                                   value="${service.service_id}" 
                                   class="mr-2">
                            <label for="service_${service.service_id}">
                                ${service.service_name} 
                                <span class="text-gray-500 text-sm">($${service.price.toFixed(2)})</span>
                            </label>
                        `;
                        servicesListEl.appendChild(wrapper);
                    });
                } else {
                    servicesListEl.innerHTML = `<p class="text-gray-500 text-sm col-span-2">No services available.</p>`;
                }
            })
            .catch(err => {
                console.error("Error loading hotel services:", err);
                servicesListEl.innerHTML = `<p class="text-red-500 text-sm col-span-2">Error loading services</p>`;
            });
    }

    // Fetch Menu Items
    function loadMenuItems() {
        fetch("api/admin/pages/menu-items.php")
            .then(res => res.json())
            .then(data => {
                menuItemsListEl.innerHTML = "";
                if (data.success && data.menu_items.length > 0) {
                    data.menu_items.forEach(item => {
                        const wrapper = document.createElement("div");
                        wrapper.className = "flex items-center";
                        wrapper.innerHTML = `
                            <input type="checkbox" 
                                   id="menu_${item.menu_item_id}" 
                                   name="menu_items[]" 
                                   value="${item.menu_item_id}" 
                                   class="mr-2">
                            <label for="menu_${item.menu_item_id}">
                                ${item.item_name} 
                                <span class="text-gray-500 text-sm">($${item.price.toFixed(2)})</span>
                            </label>
                        `;
                        menuItemsListEl.appendChild(wrapper);
                    });
                } else {
                    menuItemsListEl.innerHTML = `<p class="text-gray-500 text-sm col-span-2">No menu items available.</p>`;
                }
            })
            .catch(err => {
                console.error("Error loading menu items:", err);
                menuItemsListEl.innerHTML = `<p class="text-red-500 text-sm col-span-2">Error loading menu items</p>`;
            });
    }

    // Open Booking Modal and Load Services/Menu Items
    window.openBookingModal = function () {
        // Your existing code to open modal goes here...

        // Load hotel services & menu items
        loadHotelServices();
        loadMenuItems();
    };

    // Handle Reservation Form Submission
    reservationForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(reservationForm);

        fetch("api/admin/pages/save-reservation.php", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Reservation saved successfully!");
                // Close modal / refresh list
            } else {
                alert("Error: " + data.error);
            }
        })
        .catch(err => {
            console.error("Save Reservation Error:", err);
            alert("Unexpected error occurred.");
        });
    });

});
