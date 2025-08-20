// Online Reservation System - Fixed Version with Payment Methods
class OnlineReservation {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.currentStep = 1;
        this.reservationData = {
            checkinDate: '',
            checkoutDate: '',
            guestCount: 1,
            selectedRoom: null,
            selectedServices: [],
            selectedMenuItems: [],
            guestInfo: {},
            totalAmount: 0
        };
        this.roomTypes = [];
        this.availableRooms = [];
        this.hotelServices = [];
        this.menuItems = [];
        this.paymentMethods = []; // Add this property
        
        // Default images from reliable CDN sources
        this.defaultImages = {
            room: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop&crop=center',
            deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop&crop=center',
            suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop&crop=center',
            standard: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&crop=center',
            single: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&crop=center',
            double: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&h=300&fit=crop&crop=center',
            family: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&crop=center'
        };
        
        this.init();
    }

    async init() {
        try {
            this.setMinimumDates();
            this.setupEventListeners();
            await this.loadRoomTypes();
            await this.loadHotelServices();
            await this.loadMenuItems();
            await this.loadPaymentMethods(); // Add this line
            
            // Initialize advance payment display
            this.updateAdvancePaymentDisplay();
            
            // Trigger initial room search after everything is loaded
            console.log('Triggering initial room search...');
            setTimeout(() => {
                this.searchRooms();
            }, 500);
            
            console.log('Online reservation system initialized');
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError('Failed to initialize booking system. Please refresh the page.');
        }
    }

    // Add this new method to load payment methods
    async loadPaymentMethods() {
        try {
            const response = await fetch(`${this.baseURL}/api/user/reservations.php?action=payment_methods`);
            if (!response.ok) throw new Error('Failed to load payment methods');
            
            const data = await response.json();
            if (data.success) {
                this.paymentMethods = data.payment_methods || [];
                this.populatePaymentMethods();
                console.log('Payment methods loaded:', this.paymentMethods.length);
            } else {
                throw new Error(data.error || 'Failed to load payment methods');
            }
        } catch (error) {
            console.error('Failed to load payment methods:', error);
            this.paymentMethods = [
                { payment_method_id: 1, method_name: 'Cash' },
                { payment_method_id: 2, method_name: 'GCash' },
                { payment_method_id: 3, method_name: 'Bank Transfer' }
            ];
            this.populatePaymentMethods();
        }
    }

    // Helper method to get appropriate image for room type
    getRoomImage(room) {
        // If room has an image URL and it's not a local path, use it
        if (room.image_url && (room.image_url.startsWith('http://') || room.image_url.startsWith('https://'))) {
            return room.image_url;
        }
        
        // Otherwise, determine image based on room type name
        const roomType = room.type_name ? room.type_name.toLowerCase() : '';
        
        if (roomType.includes('suite')) {
            return this.defaultImages.suite;
        } else if (roomType.includes('deluxe')) {
            return this.defaultImages.deluxe;
        } else if (roomType.includes('single')) {
            return this.defaultImages.single;
        } else if (roomType.includes('double')) {
            return this.defaultImages.double;
        } else if (roomType.includes('family')) {
            return this.defaultImages.family;
        } else if (roomType.includes('standard')) {
            return this.defaultImages.standard;
        } else {
            return this.defaultImages.room; // Default fallback
        }
    }

    setMinimumDates() {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        
        const todayString = today.toISOString().split('T')[0];
        const tomorrowString = tomorrow.toISOString().split('T')[0];
        
        const checkinInput = document.getElementById('checkinDate');
        const checkoutInput = document.getElementById('checkoutDate');
        
        if (checkinInput) {
            checkinInput.min = todayString;
            checkinInput.value = todayString;
        }
        if (checkoutInput) {
            checkoutInput.min = tomorrowString;
            checkoutInput.value = tomorrowString;
        }
    }

    setupEventListeners() {
        // Date change handlers with debouncing to avoid too many API calls
        let searchTimeout;
        
        const debouncedSearch = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchRooms();
            }, 500);
        };
        
        const checkinInput = document.getElementById('checkinDate');
        const checkoutInput = document.getElementById('checkoutDate');
        const guestCountInput = document.getElementById('guestCount');
        
        if (checkinInput) {
            checkinInput.addEventListener('change', () => {
                console.log('Check-in date changed:', checkinInput.value);
                this.updateCheckoutMinDate();
                debouncedSearch();
            });
        }
        
        if (checkoutInput) {
            checkoutInput.addEventListener('change', () => {
                console.log('Check-out date changed:', checkoutInput.value);
                debouncedSearch();
            });
        }
        
        if (guestCountInput) {
            guestCountInput.addEventListener('change', () => {
                console.log('Guest count changed:', guestCountInput.value);
                debouncedSearch();
            });
        }

        // Step navigation
        const step1Next = document.getElementById('step1Next');
        const step2Back = document.getElementById('step2Back');
        const step2Next = document.getElementById('step2Next');
        const step3Back = document.getElementById('step3Back');
        const step3Next = document.getElementById('step3Next');
        const step4Back = document.getElementById('step4Back');
        const step4Next = document.getElementById('step4Next');
        const step5Back = document.getElementById('step5Back');
        const confirmBooking = document.getElementById('confirmBooking');
        
        if (step1Next) step1Next.addEventListener('click', () => this.nextStep());
        if (step2Back) step2Back.addEventListener('click', () => this.prevStep());
        if (step2Next) step2Next.addEventListener('click', () => this.nextStep());
        if (step3Back) step3Back.addEventListener('click', () => this.prevStep());
        if (step3Next) step3Next.addEventListener('click', () => this.validateStep3());
        if (step4Back) step4Back.addEventListener('click', () => this.prevStep());
        if (step4Next) step4Next.addEventListener('click', () => this.nextStep());
        if (step5Back) step5Back.addEventListener('click', () => this.prevStep());
        if (confirmBooking) confirmBooking.addEventListener('click', () => this.submitBooking());

        // Guest form validation
        const requiredFields = ['firstName', 'lastName', 'email', 'phoneNumber'];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.validateGuestForm();
                });
            }
        });

        // Advanced payment slider event listener
        const advanceSlider = document.getElementById('advanceSlider');
        if (advanceSlider) {
            advanceSlider.addEventListener('input', () => {
                this.updateAdvancePaymentDisplay();
            });
        }
        
        // Quick advance buttons
        document.querySelectorAll('.advance-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const percent = parseInt(btn.dataset.percent);
                if (advanceSlider) {
                    advanceSlider.value = percent;
                    this.updateAdvancePaymentDisplay();
                }
            });
        });
        
        console.log('Event listeners setup complete');
    }

    updateCheckoutMinDate() {
        const checkinInput = document.getElementById('checkinDate');
        const checkoutInput = document.getElementById('checkoutDate');
        
        if (!checkinInput || !checkoutInput) return;
        
        const checkinDate = checkinInput.value;
        if (checkinDate) {
            const minCheckout = new Date(checkinDate);
            minCheckout.setDate(minCheckout.getDate() + 1);
            checkoutInput.min = minCheckout.toISOString().split('T')[0];
            
            // Update checkout date if it's before the new minimum
            const checkoutDate = checkoutInput.value;
            if (checkoutDate && new Date(checkoutDate) <= new Date(checkinDate)) {
                checkoutInput.value = minCheckout.toISOString().split('T')[0];
            }
        }
    }

    async loadRoomTypes() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/room-types.php`);
            if (!response.ok) throw new Error('Failed to load room types');
            
            const data = await response.json();
            if (data.success) {
                this.roomTypes = data.roomTypes || [];
                console.log('Room types loaded:', this.roomTypes.length);
            }
        } catch (error) {
            console.error('Failed to load room types:', error);
            this.roomTypes = [];
        }
    }

    async loadHotelServices() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/utilities/hotel-services.php`);
            if (!response.ok) throw new Error('Failed to load hotel services');
            
            const data = await response.json();
            if (data.success) {
                this.hotelServices = data.services || [];
                this.populateHotelServices();
                console.log('Hotel services loaded:', this.hotelServices.length);
            }
        } catch (error) {
            console.error('Failed to load hotel services:', error);
            this.hotelServices = [];
            this.populateHotelServices();
        }
    }

    async loadMenuItems() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/menu-items.php`);
            if (!response.ok) throw new Error('Failed to load menu items');
            
            const data = await response.json();
            if (data.success) {
                this.menuItems = data.menu_items || [];
                this.populateMenuItems();
                console.log('Menu items loaded:', this.menuItems.length);
            }
        } catch (error) {
            console.error('Failed to load menu items:', error);
            this.menuItems = [];
            this.populateMenuItems();
        }
    }

    async searchRooms() {
        // Get form elements and their values
        const checkinElement = document.getElementById('checkinDate');
        const checkoutElement = document.getElementById('checkoutDate');
        const guestCountElement = document.getElementById('guestCount');
        
        const checkinDate = checkinElement ? checkinElement.value : '';
        const checkoutDate = checkoutElement ? checkoutElement.value : '';
        const guestCount = guestCountElement ? guestCountElement.value : '1';

        console.log('Form values:', { checkinDate, checkoutDate, guestCount });

        // Validate required fields
        if (!checkinDate || !checkoutDate) {
            console.log('Missing dates - stopping search');
            return; // Don't show error on initial load
        }

        if (new Date(checkoutDate) <= new Date(checkinDate)) {
            this.showError('Check-out date must be after check-in date');
            return;
        }

        // Show loading state
        const roomsLoading = document.getElementById('roomsLoading');
        const roomsSection = document.getElementById('roomsSection');
        const step1Next = document.getElementById('step1Next');
        
        if (roomsLoading) roomsLoading.classList.remove('hidden');
        if (roomsSection) roomsSection.classList.add('hidden');
        if (step1Next) step1Next.disabled = true;

        try {
            // Ensure room types are loaded
            if (this.roomTypes.length === 0) {
                console.log('Loading room types first...');
                await this.loadRoomTypes();
                if (this.roomTypes.length === 0) {
                    throw new Error('No room types available. Please contact support.');
                }
            }

            let allRooms = [];

            // Search each room type
            for (const roomType of this.roomTypes) {
                try {
                    const params = new URLSearchParams({
                        room_type_id: roomType.room_type_id.toString(),
                        checkin_date: checkinDate,
                        checkout_date: checkoutDate,
                        guest_count: guestCount
                    });
                    
                    const url = `${this.baseURL}/api/admin/pages/available-rooms.php?${params.toString()}`;
                    console.log(`Searching room type ${roomType.type_name} (ID: ${roomType.room_type_id})`);

                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        console.warn(`Failed to search room type ${roomType.room_type_id}: ${response.status}`);
                        continue;
                    }
                    
                    const data = await response.json();
                    
                    if (data.success && data.rooms && data.rooms.length > 0) {
                        console.log(`Found ${data.rooms.length} rooms for ${roomType.type_name}`);
                        
                        // Add room_type_id to each room for proper identification
                        const roomsWithType = data.rooms.map(room => ({
                            ...room,
                            room_type_id: roomType.room_type_id
                        }));
                        
                        allRooms = allRooms.concat(roomsWithType);
                    }
                    
                } catch (typeError) {
                    console.error(`Error searching room type ${roomType.room_type_id}:`, typeError);
                }
            }

            console.log(`Total rooms found: ${allRooms.length}`);
            this.availableRooms = allRooms;
            this.populateRooms();

        } catch (error) {
            console.error('Failed to search rooms:', error);
            this.showError(`Failed to search available rooms: ${error.message}`);
            this.availableRooms = [];
            this.populateRooms();
        } finally {
            // Hide loading state
            if (roomsLoading) roomsLoading.classList.add('hidden');
        }
    }

    populateRooms() {
        const roomsList = document.getElementById('roomsList');
        const roomsSection = document.getElementById('roomsSection');

        if (!roomsList || !roomsSection) {
            console.error('Room list or section elements not found');
            return;
        }

        if (this.availableRooms.length === 0) {
            roomsList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-bed text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg mb-2">No rooms available</p>
                    <p class="text-gray-400">Please try different dates or adjust guest count</p>
                </div>
            `;
            roomsSection.classList.remove('hidden');
            return;
        }

        roomsList.innerHTML = this.availableRooms.map(room => `
            <div class="room-card bg-white rounded-xl shadow-md overflow-hidden border-2 border-transparent cursor-pointer hover:border-blue-300 transition-all duration-300" 
                 data-room-id="${room.room_id}" 
                 data-room-type-id="${room.room_type_id}"
                 data-price="${room.price_per_night}">
                <div class="relative">
                    <img src="${this.getRoomImage(room)}" 
                         alt="${room.type_name}" 
                         class="w-full h-48 object-cover"
                         onerror="this.src='${this.defaultImages.room}'; this.onerror=null;">
                    <div class="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-md">
                        <span class="text-green-600 font-semibold">₱${parseFloat(room.price_per_night).toLocaleString()}/night</span>
                    </div>
                </div>
                <div class="p-6">
                    <h4 class="text-xl font-bold text-gray-800 mb-2">${room.type_name}</h4>
                    <p class="text-gray-600 mb-4">${room.description || 'Comfortable and well-appointed room with modern amenities'}</p>
                    <div class="space-y-2 mb-4">
                        <div class="flex items-center text-sm text-gray-600">
                            <i class="fas fa-bed mr-2"></i>
                            Room ${room.room_number} - Floor ${room.floor_number}
                        </div>
                        <div class="flex items-center text-sm text-gray-600">
                            <i class="fas fa-users mr-2"></i>
                            Up to ${room.capacity || 2} guests
                        </div>
                        <div class="flex items-center text-sm text-gray-600">
                            <i class="fas fa-wifi mr-2"></i>
                            Free WiFi & Amenities
                        </div>
                        <div class="flex items-center text-sm text-gray-600">
                            <i class="fas fa-check-circle mr-2 text-green-500"></i>
                            ${room.status_name}
                        </div>
                    </div>
                    <button class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors select-room-btn">
                        Select This Room
                    </button>
                </div>
            </div>
        `).join('');

        // Add click handlers for room selection
        document.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', () => this.selectRoom(card));
        });

        document.querySelectorAll('.select-room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectRoom(btn.closest('.room-card'));
            });
        });

        roomsSection.classList.remove('hidden');
        console.log('Rooms populated successfully');
    }

    selectRoom(roomCard) {
        // Remove previous selection
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Select current room
        roomCard.classList.add('selected');

        // Hide all other rooms with animation
        document.querySelectorAll('.room-card').forEach(card => {
            if (card !== roomCard) {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '0.3';
                card.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            } else {
                card.style.transition = 'all 0.3s ease';
                card.style.transform = 'scale(1.02)';
                card.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
            }
        });

        // Store room data
        this.reservationData.selectedRoom = {
            roomId: roomCard.dataset.roomId,
            roomTypeId: roomCard.dataset.roomTypeId,
            price: parseFloat(roomCard.dataset.price),
            roomInfo: roomCard.querySelector('h4').textContent,
            roomDetails: roomCard.querySelector('.fa-bed').parentElement.textContent.trim()
        };

        // Store dates
        const checkinInput = document.getElementById('checkinDate');
        const checkoutInput = document.getElementById('checkoutDate');
        const guestCountInput = document.getElementById('guestCount');
        
        this.reservationData.checkinDate = checkinInput ? checkinInput.value : '';
        this.reservationData.checkoutDate = checkoutInput ? checkoutInput.value : '';
        this.reservationData.guestCount = guestCountInput ? guestCountInput.value : '1';

        // Enable next button
        const step1Next = document.getElementById('step1Next');
        if (step1Next) step1Next.disabled = false;

        // Add a "Change Room" button for better UX
        this.addChangeRoomButton(roomCard);

        this.showSuccess('Room selected! Click Next to continue.');
    }

    addChangeRoomButton(selectedCard) {
        // Remove existing change room button if any
        const existingBtn = document.querySelector('.change-room-btn');
        if (existingBtn) existingBtn.remove();

        // Create change room button
        const changeBtn = document.createElement('button');
        changeBtn.className = 'change-room-btn w-full bg-gray-600 text-white py-2 mt-2 rounded-lg font-medium hover:bg-gray-700 transition-colors';
        changeBtn.textContent = 'Change Room Selection';
        
        changeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showAllRooms();
        });

        // Insert after the select button
        const selectBtn = selectedCard.querySelector('.select-room-btn');
        if (selectBtn) {
            selectBtn.parentNode.insertBefore(changeBtn, selectBtn.nextSibling);
            selectBtn.textContent = 'Selected ✓';
            selectBtn.disabled = true;
            selectBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            selectBtn.classList.add('bg-green-600');
        }
    }

    showAllRooms() {
        document.querySelectorAll('.room-card').forEach(card => {
            // Reset styles
            card.style.display = 'block';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
            card.classList.remove('selected', 'ring-4', 'ring-blue-500', 'ring-opacity-50');
            
            // Reset select button
            const selectBtn = card.querySelector('.select-room-btn');
            if (selectBtn) {
                selectBtn.textContent = 'Select This Room';
                selectBtn.disabled = false;
                selectBtn.classList.remove('bg-green-600');
                selectBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
        });

        // Remove change room buttons
        document.querySelectorAll('.change-room-btn').forEach(btn => btn.remove());

        // Clear selection
        this.reservationData.selectedRoom = null;
        
        // Disable next button
        const step1Next = document.getElementById('step1Next');
        if (step1Next) step1Next.disabled = true;
    }

    populateHotelServices() {
        const servicesList = document.getElementById('servicesList');
        if (!servicesList) return;

        if (this.hotelServices.length === 0) {
            servicesList.innerHTML = '<p class="text-gray-500 text-center py-8">No additional services available.</p>';
            return;
        }

        servicesList.innerHTML = this.hotelServices.map(service => {
            // Safely handle the price value
            let price = 0;
            try {
                price = parseFloat(service.price || service.service_price || 0);
                if (isNaN(price)) price = 0;
            } catch (e) {
                console.warn('Invalid price for service:', service.service_id, service.price);
                price = 0;
            }

            const formattedPrice = price.toFixed(2);

            return `
                <div class="service-item bg-white rounded-lg p-4 shadow-sm border">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" 
                               class="service-checkbox mr-3" 
                               data-service-id="${service.service_id}"
                               data-price="${price}">
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="font-medium text-gray-800">${service.service_name}</h5>
                                    ${service.description ? `<p class="text-sm text-gray-600 mt-1">${service.description}</p>` : ''}
                                </div>
                                <div class="text-right">
                                    <span class="font-semibold text-gray-800">₱${formattedPrice}</span>
                                    ${service.is_complimentary ? '<div class="text-xs text-green-600">Complimentary</div>' : ''}
                                </div>
                            </div>
                        </div>
                    </label>
                </div>
            `;
        }).join('');

        // Add change handlers
        document.querySelectorAll('.service-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedServices();
                console.log('Services updated:', this.reservationData.selectedServices);
            });
        });
    }

    populateMenuItems() {
        const menuItemsList = document.getElementById('menuItemsList');
        if (!menuItemsList) return;

        if (this.menuItems.length === 0) {
            menuItemsList.innerHTML = '<p class="text-gray-500 text-center py-8">No menu items available.</p>';
            return;
        }

        // Group items by category
        const groupedItems = this.menuItems.reduce((acc, item) => {
            const category = item.category || 'General';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});

        menuItemsList.innerHTML = Object.entries(groupedItems).map(([category, items]) => `
            <div class="category-section mb-6">
                <h5 class="font-semibold text-gray-800 mb-3 pb-2 border-b">${category}</h5>
                <div class="space-y-3">
                    ${items.map(item => `
                        <div class="menu-item bg-white rounded-lg p-4 shadow-sm border">
                            <div class="flex items-center justify-between">
                                <label class="flex items-center cursor-pointer flex-1">
                                    <input type="checkbox" 
                                           class="menu-checkbox mr-3" 
                                           data-menu-id="${item.menu_item_id || item.menu_id}"
                                           data-price="${item.price}">
                                    <div class="flex-1">
                                        <h6 class="font-medium text-gray-800">${item.item_name}</h6>
                                        ${item.description ? `<p class="text-sm text-gray-600 mt-1">${item.description}</p>` : ''}
                                    </div>
                                </label>
                                <div class="flex items-center space-x-3">
                                    <span class="font-semibold text-gray-800">₱${parseFloat(item.price).toFixed(2)}</span>
                                    <div class="flex items-center">
                                        <label class="text-xs text-gray-500 mr-2">Qty:</label>
                                        <input type="number" 
                                               class="menu-quantity w-16 px-2 py-1 border border-gray-300 rounded text-sm" 
                                               data-menu-id="${item.menu_item_id || item.menu_id}"
                                               min="1" max="10" value="1" disabled>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Add change handlers
        document.querySelectorAll('.menu-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const menuId = e.target.dataset.menuId;
                const quantityInput = document.querySelector(`.menu-quantity[data-menu-id="${menuId}"]`);
                
                if (e.target.checked) {
                    quantityInput.disabled = false;
                } else {
                    quantityInput.disabled = true;
                }
                
                this.updateSelectedMenuItems();
                console.log('Menu items updated:', this.reservationData.selectedMenuItems);
            });
        });

        document.querySelectorAll('.menu-quantity').forEach(input => {
            input.addEventListener('input', () => {
                this.updateSelectedMenuItems();
                console.log('Menu items updated:', this.reservationData.selectedMenuItems);
            });
        });
    }

    updateSelectedServices() {
        this.reservationData.selectedServices = [];
        document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
            const serviceId = parseInt(checkbox.dataset.serviceId);
            let price = 0;
            try {
                price = parseFloat(checkbox.dataset.price || 0);
                if (isNaN(price)) price = 0;
            } catch (e) {
                console.warn('Invalid price for selected service:', serviceId, checkbox.dataset.price);
                price = 0;
            }
            
            const service = this.hotelServices.find(s => s.service_id === serviceId);
            
            if (service) {
                this.reservationData.selectedServices.push({
                    service_id: serviceId,
                    name: service.service_name,
                    price: price
                });
            }
        });
        
        console.log('Selected services:', this.reservationData.selectedServices);
    }

    updateSelectedMenuItems() {
        this.reservationData.selectedMenuItems = [];
        document.querySelectorAll('.menu-checkbox:checked').forEach(checkbox => {
            const menuId = parseInt(checkbox.dataset.menuId);
            const price = parseFloat(checkbox.dataset.price);
            const quantityInput = document.querySelector(`.menu-quantity[data-menu-id="${menuId}"]`);
            const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
            const menuItem = this.menuItems.find(m => (m.menu_item_id || m.menu_id) === menuId);
            
            if (menuItem) {
                this.reservationData.selectedMenuItems.push({
                    menu_item_id: menuId,
                    name: menuItem.item_name,
                    price: price,
                    quantity: quantity,
                    total: price * quantity
                });
            }
        });
        
        console.log('Selected menu items:', this.reservationData.selectedMenuItems);
    }

    validateGuestForm() {
        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const emailEl = document.getElementById('email');
        const phoneEl = document.getElementById('phoneNumber');
        const step3NextEl = document.getElementById('step3Next');
        
        const firstName = firstNameEl ? firstNameEl.value.trim() : '';
        const lastName = lastNameEl ? lastNameEl.value.trim() : '';
        const email = emailEl ? emailEl.value.trim() : '';
        const phone = phoneEl ? phoneEl.value.trim() : '';

        const isValid = firstName && lastName && email && phone;
        if (step3NextEl) step3NextEl.disabled = !isValid;
        return isValid;
    }

    validateStep3() {
        if (!this.validateGuestForm()) {
            this.showError('Please fill in all required fields');
            return;
        }

        // Store guest information
        this.reservationData.guestInfo = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            specialRequests: document.getElementById('specialRequests')?.value.trim() || ''
        };

        this.nextStep();
    }

    nextStep() {
        if (this.currentStep < 5) {
            // Always update selected services and menu items before moving to next step
            this.updateSelectedServices();
            this.updateSelectedMenuItems();
            
            // If moving to step 4 (payment), populate the booking summary
            if (this.currentStep === 3) {
                this.populatePaymentSummary();
            }
            
            // If moving to step 5 (confirmation), populate final summary
            if (this.currentStep === 4) {
                this.populateFinalSummary();
            }
            
            this.showStep(this.currentStep + 1);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    showStep(step) {
        // Hide current step
        const currentStepEl = document.getElementById(`step${this.currentStep}`);
        const currentIndicatorEl = document.getElementById(`step${this.currentStep}-indicator`);
        
        if (currentStepEl) currentStepEl.classList.add('hidden');
        if (currentIndicatorEl) {
            currentIndicatorEl.classList.remove('step-active');
            currentIndicatorEl.classList.add('step-completed');
        }

        // Show new step
        this.currentStep = step;
        const newStepEl = document.getElementById(`step${step}`);
        const newIndicatorEl = document.getElementById(`step${step}-indicator`);
        
        if (newStepEl) newStepEl.classList.remove('hidden');
        if (newIndicatorEl) {
            newIndicatorEl.classList.add('step-active');
            newIndicatorEl.classList.remove('step-completed');
        }

        // Update completed steps
        for (let i = 1; i < step; i++) {
            const indicatorEl = document.getElementById(`step${i}-indicator`);
            if (indicatorEl) {
                indicatorEl.classList.add('step-completed');
                indicatorEl.classList.remove('step-active');
            }
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    populatePaymentSummary() {
        // Calculate totals
        const nights = Math.ceil(
            (new Date(this.reservationData.checkoutDate) - new Date(this.reservationData.checkinDate)) 
            / (1000 * 60 * 60 * 24)
        );

        const roomTotal = this.reservationData.selectedRoom ? this.reservationData.selectedRoom.price * nights : 0;
        const servicesTotal = this.reservationData.selectedServices.reduce((sum, service) => sum + service.price, 0);
        const menuTotal = this.reservationData.selectedMenuItems.reduce((sum, item) => sum + item.total, 0);
        const grandTotal = roomTotal + servicesTotal + menuTotal;

        this.reservationData.totalAmount = grandTotal;

        // Update payment booking summary
        const paymentSummaryEl = document.getElementById('paymentBookingSummary');
        if (paymentSummaryEl) {
            let summaryHtml = `
                <div class="space-y-4">
                    <div>
                        <h5 class="font-semibold text-gray-800 mb-2">Room Details</h5>
                        <p class="text-sm text-gray-600">${this.reservationData.selectedRoom?.roomInfo || 'No room selected'}</p>
                        <p class="text-sm text-gray-600">${nights} night${nights > 1 ? 's' : ''} × ₱${this.reservationData.selectedRoom?.price.toLocaleString() || '0'}</p>
                        <p class="font-medium">₱${roomTotal.toLocaleString()}</p>
                    </div>
            `;

            if (this.reservationData.selectedServices.length > 0) {
                summaryHtml += `
                    <div>
                        <h5 class="font-semibold text-gray-800 mb-2">Hotel Services</h5>
                        ${this.reservationData.selectedServices.map(service => 
                            `<p class="text-sm text-gray-600">• ${service.name} - ₱${service.price.toLocaleString()}</p>`
                        ).join('')}
                        <p class="font-medium text-purple-600">₱${servicesTotal.toLocaleString()}</p>
                    </div>
                `;
            }

            if (this.reservationData.selectedMenuItems.length > 0) {
                summaryHtml += `
                    <div>
                        <h5 class="font-semibold text-gray-800 mb-2">Menu Items</h5>
                        ${this.reservationData.selectedMenuItems.map(item => 
                            `<p class="text-sm text-gray-600">• ${item.name} (x${item.quantity}) - ₱${item.total.toLocaleString()}</p>`
                        ).join('')}
                        <p class="font-medium text-orange-600">₱${menuTotal.toLocaleString()}</p>
                    </div>
                `;
            }

            summaryHtml += `
                    <div class="border-t pt-4">
                        <div class="flex justify-between items-center">
                            <span class="text-lg font-bold">Total Amount</span>
                            <span class="text-lg font-bold text-green-600">₱${grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
            

            paymentSummaryEl.innerHTML = summaryHtml;
        }
        
        // Update advance payment display after setting total amount
        this.updateAdvancePaymentDisplay();

        console.log('Payment summary populated:', {
            nights,
            roomTotal,
            servicesTotal,
            menuTotal,
            grandTotal
        });
    }
    
    populatePaymentMethods() {
        const paymentMethodsList = document.getElementById('paymentMethodsList');
        if (!paymentMethodsList) return;

        if (!this.paymentMethods || this.paymentMethods.length === 0) {
            paymentMethodsList.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-credit-card text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500">No payment methods available</p>
                    <button onclick="window.reservationSystem.loadPaymentMethods()" 
                            class="mt-2 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-sync-alt mr-1"></i> Retry
                    </button>
                </div>
            `;
            return;
        }

        paymentMethodsList.innerHTML = this.paymentMethods.map(method => {
            // Add icons for specific payment methods
            let icon = 'fa-credit-card'; // default icon
            if (method.method_name.toLowerCase().includes('gcash')) {
                icon = 'fa-mobile-alt';
            } else if (method.method_name.toLowerCase().includes('bank')) {
                icon = 'fa-university';
            } else if (method.method_name.toLowerCase().includes('cash')) {
                icon = 'fa-money-bill-wave';
            }

            return `
                <div class="payment-method-option border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors mb-3" 
                     data-method-id="${method.payment_method_id}">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <i class="fas ${icon} text-blue-600"></i>
                        </div>
                        <div class="flex-1">
                            <span class="font-medium">${method.method_name}</span>
                            ${this.getPaymentMethodDescription(method)}
                        </div>
                        <i class="fas fa-check-circle text-blue-600 opacity-0"></i>
                    </div>
                </div>
            `;
        }).join('');

        // Set up click handlers
        this.setupPaymentMethodSelection();
    }

    getPaymentMethodDescription(method) {
        // Add descriptions for your specific payment methods
        switch(method.method_name.toLowerCase()) {
            case 'cash':
                return '<p class="text-xs text-gray-500 mt-1">Pay when you arrive at the hotel</p>';
            case 'gcash':
                return '<p class="text-xs text-gray-500 mt-1">Send payment to +63 123 456 7890</p>';
            case 'bank transfer':
                return '<p class="text-xs text-gray-500 mt-1">Transfer to BDO Account #123456789</p>';
            default:
                return '';
        }
    }

    populateFinalSummary() {
        // Calculate totals
        const nights = Math.ceil(
            (new Date(this.reservationData.checkoutDate) - new Date(this.reservationData.checkinDate)) 
            / (1000 * 60 * 60 * 24)
        );

        const roomTotal = this.reservationData.selectedRoom ? this.reservationData.selectedRoom.price * nights : 0;
        const servicesTotal = this.reservationData.selectedServices.reduce((sum, service) => sum + service.price, 0);
        const menuTotal = this.reservationData.selectedMenuItems.reduce((sum, item) => sum + item.total, 0);
        const grandTotal = roomTotal + servicesTotal + menuTotal;

        this.reservationData.totalAmount = grandTotal;

        // Final Guest Summary
        const finalGuestSummaryEl = document.getElementById('finalGuestSummary');
        if (finalGuestSummaryEl) {
            finalGuestSummaryEl.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Name:</strong> ${this.reservationData.guestInfo.firstName} ${this.reservationData.guestInfo.lastName}</p>
                    <p><strong>Email:</strong> ${this.reservationData.guestInfo.email}</p>
                    <p><strong>Phone:</strong> ${this.reservationData.guestInfo.phoneNumber}</p>
                    ${this.reservationData.guestInfo.specialRequests ? 
                        `<p><strong>Special Requests:</strong> ${this.reservationData.guestInfo.specialRequests}</p>` : ''}
                </div>
            `;
        }

        // Final Room Summary
        const finalRoomSummaryEl = document.getElementById('finalRoomSummary');
        if (finalRoomSummaryEl) {
            finalRoomSummaryEl.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Room:</strong> ${this.reservationData.selectedRoom?.roomInfo || 'No room selected'}</p>
                    <p><strong>Details:</strong> ${this.reservationData.selectedRoom?.roomDetails || 'N/A'}</p>
                    <p><strong>Rate:</strong> ₱${this.reservationData.selectedRoom?.price.toLocaleString() || '0'}/night</p>
                </div>
            `;
        }

        // Final Stay Summary
        const finalStaySummaryEl = document.getElementById('finalStaySummary');
        if (finalStaySummaryEl) {
            finalStaySummaryEl.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Check-in:</strong> ${new Date(this.reservationData.checkinDate).toLocaleDateString()}</p>
                    <p><strong>Check-out:</strong> ${new Date(this.reservationData.checkoutDate).toLocaleDateString()}</p>
                    <p><strong>Duration:</strong> ${nights} night${nights > 1 ? 's' : ''}</p>
                    <p><strong>Guests:</strong> ${this.reservationData.guestCount}</p>
                </div>
            `;
        }

        // Final Price Summary
        let priceHtml = `
            <div class="space-y-3">
                <div class="flex justify-between py-2">
                    <span>Room (${nights} night${nights > 1 ? 's' : ''})</span>
                    <span>₱${roomTotal.toLocaleString()}</span>
                </div>
        `;

        if (servicesTotal > 0) {
            priceHtml += `
                <div class="flex justify-between py-2 text-purple-600">
                    <span>Hotel Services</span>
                    <span>₱${servicesTotal.toLocaleString()}</span>
                </div>
            `;
        }

        if (menuTotal > 0) {
            priceHtml += `
                <div class="flex justify-between py-2 text-orange-600">
                    <span>Dining</span>
                    <span>₱${menuTotal.toLocaleString()}</span>
                </div>
            `;
        }

        priceHtml += `
                <div class="border-t pt-3 mt-3">
                    <div class="flex justify-between py-2 font-bold text-lg">
                        <span>Total Amount</span>
                        <span class="text-green-600">₱${grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;

        const finalPriceSummaryEl = document.getElementById('finalPriceSummary');
        if (finalPriceSummaryEl) {
            finalPriceSummaryEl.innerHTML = priceHtml;
        }

        // Final Extras Summary
        const finalExtrasSummaryEl = document.getElementById('finalExtrasSummary');
        const finalExtrasDetailsEl = document.getElementById('finalExtrasDetails');
        
        if (this.reservationData.selectedServices.length > 0 || this.reservationData.selectedMenuItems.length > 0) {
            let extrasHtml = '';
            
            if (this.reservationData.selectedServices.length > 0) {
                extrasHtml += '<div class="mb-4"><strong class="text-purple-600">Services:</strong><ul class="ml-4 mt-2 space-y-1">';
                this.reservationData.selectedServices.forEach(service => {
                    extrasHtml += `<li class="text-gray-600">• ${service.name} - ₱${service.price.toLocaleString()}</li>`;
                });
                extrasHtml += '</ul></div>';
            }

            if (this.reservationData.selectedMenuItems.length > 0) {
                extrasHtml += '<div><strong class="text-orange-600">Menu Items:</strong><ul class="ml-4 mt-2 space-y-1">';
                this.reservationData.selectedMenuItems.forEach(item => {
                    extrasHtml += `<li class="text-gray-600">• ${item.name} (x${item.quantity}) - ₱${item.total.toLocaleString()}</li>`;
                });
                extrasHtml += '</ul></div>';
            }

            if (finalExtrasDetailsEl) finalExtrasDetailsEl.innerHTML = extrasHtml;
            if (finalExtrasSummaryEl) finalExtrasSummaryEl.classList.remove('hidden');
        } else {
            if (finalExtrasSummaryEl) finalExtrasSummaryEl.classList.add('hidden');
        }

        // Final Payment Details
        const finalPaymentSummaryEl = document.getElementById('finalPaymentSummary');
        const finalPaymentDetailsEl = document.getElementById('finalPaymentDetails');
        
        const advanceAmount = this.calculateAdvanceAmount();
        const selectedMethod = document.querySelector('.payment-method-option.selected');
        const methodName = selectedMethod ? selectedMethod.querySelector('.font-medium').textContent : 'Pay upon check-in';
        
        if (finalPaymentDetailsEl) {
            finalPaymentDetailsEl.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Payment Method:</span>
                        <span>${methodName}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Advance Payment:</span>
                        <span>₱${advanceAmount.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between font-semibold border-t pt-2">
                        <span>Amount Due at Check-in:</span>
                        <span>₱${(grandTotal - advanceAmount).toLocaleString()}</span>
                    </div>
                </div>
            `;
        }

        console.log('Final summary populated:', {
            nights,
            roomTotal,
            servicesTotal,
            menuTotal,
            grandTotal,
            advanceAmount,
            selectedServices: this.reservationData.selectedServices.length,
            selectedMenuItems: this.reservationData.selectedMenuItems.length
        });
    }

    async submitBooking() {
        const agreeTermsEl = document.getElementById('agreeTerms');
        const confirmBtn = document.getElementById('confirmBooking');
        
        if (!agreeTermsEl || !agreeTermsEl.checked) {
            this.showError('Please agree to the terms and conditions');
            return;
        }

        if (!confirmBtn) {
            this.showError('Submit button not found');
            return;
        }

        const btnText = confirmBtn.querySelector('.btn-text');
        const spinner = confirmBtn.querySelector('.loading-spinner');

        // Show loading state
        if (btnText) btnText.style.display = 'none';
        if (spinner) spinner.classList.remove('hidden');
        confirmBtn.disabled = true;

        try {
            // Make sure we have the latest selections
            this.updateSelectedServices();
            this.updateSelectedMenuItems();

            // Get advance payment details
            const advanceSlider = document.getElementById('advanceSlider');
            const paymentMethodSelect = document.querySelector('.payment-method-option.selected');
            const referenceNumber = document.getElementById('referenceNumber')?.value || '';
            
            const advancePercent = advanceSlider ? parseInt(advanceSlider.value) : 0;
            const advanceAmount = (this.reservationData.totalAmount * advancePercent) / 100;
            const paymentMethodId = paymentMethodSelect ? parseInt(paymentMethodSelect.dataset.methodId) : 1; // Default to cash

            // Prepare booking data
            const bookingData = {
                // Guest information
                first_name: this.reservationData.guestInfo.firstName,
                last_name: this.reservationData.guestInfo.lastName,
                email: this.reservationData.guestInfo.email,
                phone_number: this.reservationData.guestInfo.phoneNumber,
                
                // Room and dates
                room_id: parseInt(this.reservationData.selectedRoom.roomId),
                check_in_date: this.reservationData.checkinDate,
                check_out_date: this.reservationData.checkoutDate,
                guest_count: parseInt(this.reservationData.guestCount),
                
                // Additional details
                special_requests: this.reservationData.guestInfo.specialRequests,
                total_amount: this.reservationData.totalAmount,
                advance_payment: advanceAmount,
                payment_method_id: paymentMethodId,
                reference_number: referenceNumber,
                
                // Services and menu items
                services: this.reservationData.selectedServices.map(s => s.service_id),
                menu_items: this.reservationData.selectedMenuItems.map(item => ({
                    id: item.menu_item_id,
                    quantity: item.quantity
                }))
            };

            console.log('Submitting booking data:', bookingData);

            // Submit booking
            const response = await fetch(`${this.baseURL}/api/user/reservations.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError);
                const textResponse = await response.text();
                console.error('Raw response:', textResponse);
                throw new Error(`Server returned invalid JSON. Status: ${response.status}`);
            }

            console.log('Booking submission result:', result);

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit booking');
            }

            // Show success modal
            this.showBookingSuccess(result);

        } catch (error) {
            console.error('Failed to submit booking:', error);
            this.showError('Failed to submit booking: ' + error.message);
        } finally {
            // Reset button state
            if (btnText) btnText.style.display = 'inline';
            if (spinner) spinner.classList.add('hidden');
            confirmBtn.disabled = false;
        }
    }

    // Fixed payment method selection
    setupPaymentMethodSelection() {
        document.querySelectorAll('.payment-method-option').forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                document.querySelectorAll('.payment-method-option').forEach(opt => {
                    opt.classList.remove('selected', 'border-blue-500', 'bg-blue-50');
                    opt.querySelector('.fa-check-circle').classList.add('opacity-0');
                });
                
                // Add selected class to clicked option
                option.classList.add('selected', 'border-blue-500', 'bg-blue-50');
                option.querySelector('.fa-check-circle').classList.remove('opacity-0');
                
                // Show/hide reference number section based on payment method
                const referenceSection = document.getElementById('referenceSection');
                const paymentMethodId = option.dataset.methodId;
                const paymentMethodName = option.querySelector('.font-medium').textContent;
                
                if (paymentMethodId !== '1') { // 1 is cash
                    referenceSection.classList.remove('hidden');
                    
                    // Update payment instructions
                    const instructions = document.getElementById('paymentInstructions');
                    if (instructions) {
                        instructions.innerHTML = `
                            <p>Please make your payment of <strong>₱${this.calculateAdvanceAmount().toLocaleString()}</strong> via:</p>
                            <p class="font-semibold">${paymentMethodName}</p>
                            ${this.getPaymentInstructions(paymentMethodName)}
                            <p>After payment, please enter your reference number above.</p>
                        `;
                    }
                } else {
                    referenceSection.classList.add('hidden');
                }
            });
        });

        // Select Cash by default
        const cashOption = document.querySelector('.payment-method-option[data-method-id="1"]');
        if (cashOption) cashOption.click();
    }

    getPaymentInstructions(methodName) {
        switch(methodName.toLowerCase()) {
            case 'gcash':
                return `
                    <p>GCash Number: +63 123 456 7890</p>
                    <p>Account Name: Sky Oro Hotel</p>
                    <p>Please include reservation number as reference</p>
                `;
            case 'bank transfer':
                return `
                    <p>Bank: BDO (Banco de Oro)</p>
                    <p>Account Name: Sky Oro Hotel</p>
                    <p>Account Number: 1234-5678-9012</p>
                `;
            default:
                return '';
        }
    }

    // Fixed advance amount calculation
    calculateAdvanceAmount() {
        const advanceSlider = document.getElementById('advanceSlider');
        if (!advanceSlider) return 0;
        
        const advancePercent = parseInt(advanceSlider.value);
        const totalAmount = this.reservationData.totalAmount || 0;
        return (totalAmount * advancePercent) / 100;
    }

    // Fixed advance payment display update
    updateAdvancePaymentDisplay() {
        const advanceAmount = this.calculateAdvanceAmount();
        const advanceDisplay = document.getElementById('advanceAmountDisplay');
        const advanceSlider = document.getElementById('advanceSlider');
        
        if (advanceDisplay) {
            advanceDisplay.textContent = `₱${advanceAmount.toLocaleString()}`;
        }
        
        // Update slider percentage display and styling
        if (advanceSlider) {
            const percent = advanceSlider.value;
            advanceSlider.style.background = `linear-gradient(to right, #10b981 0%, #10b981 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
            
            // Update slider title to show percentage
            advanceSlider.title = `${percent}% - ₱${advanceAmount.toLocaleString()}`;
        }
        
        // Update payment instructions if reference section is visible
        const referenceSection = document.getElementById('referenceSection');
        if (referenceSection && !referenceSection.classList.contains('hidden')) {
            const selectedMethod = document.querySelector('.payment-method-option.selected');
            if (selectedMethod) {
                const instructions = document.getElementById('paymentInstructions');
                if (instructions) {
                    const methodName = selectedMethod.querySelector('.font-medium').textContent;
                    instructions.innerHTML = `
                        <p>Please make your payment of <strong>₱${advanceAmount.toLocaleString()}</strong> via:</p>
                        <p class="font-semibold">${methodName}</p>
                        ${this.getPaymentInstructions(methodName)}
                        <p>After payment, please enter your reference number above.</p>
                    `;
                }
            }
        }
    }

    showBookingSuccess(result) {
        const bookingDetailsEl = document.getElementById('bookingDetails');
        const successModalEl = document.getElementById('successModal');
        
        if (bookingDetailsEl) {
            bookingDetailsEl.innerHTML = `
                <div class="space-y-3">
                    <div class="text-center mb-4">
                        <h5 class="text-lg font-semibold text-gray-800">Reservation Confirmed</h5>
                        <p class="text-2xl font-bold text-blue-600">#${result.reservation_id}</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><strong>Guest:</strong> ${this.reservationData.guestInfo.firstName} ${this.reservationData.guestInfo.lastName}</p>
                            <p><strong>Email:</strong> ${this.reservationData.guestInfo.email}</p>
                            <p><strong>Phone:</strong> ${this.reservationData.guestInfo.phoneNumber}</p>
                        </div>
                        <div>
                            <p><strong>Room:</strong> ${this.reservationData.selectedRoom.roomInfo}</p>
                            <p><strong>Check-in:</strong> ${new Date(this.reservationData.checkinDate).toLocaleDateString()}</p>
                            <p><strong>Check-out:</strong> ${new Date(this.reservationData.checkoutDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="border-t pt-3 mt-3">
                        <p class="text-center"><strong>Total Amount:</strong> <span class="text-lg font-bold text-green-600">₱${this.reservationData.totalAmount.toLocaleString()}</span></p>
                        <p class="text-sm text-gray-500 text-center mt-1">Status: Pending Confirmation</p>
                    </div>
                    ${this.reservationData.selectedServices.length > 0 || this.reservationData.selectedMenuItems.length > 0 ? `
                    <div class="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p class="text-sm text-yellow-700">
                            <i class="fas fa-info-circle mr-2"></i>
                            Additional services and menu items have been noted and will be confirmed by hotel staff.
                        </p>
                    </div>
                    ` : ''}
                    <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p class="text-sm text-blue-700">
                            <i class="fas fa-envelope mr-2"></i>
                            A detailed confirmation email has been sent to your email address with all booking information.
                        </p>
                    </div>
                </div>
            `;
        }

        // Show modal
        if (successModalEl) {
            successModalEl.classList.remove('hidden');
            successModalEl.classList.add('flex');
        }
    }

    // Utility methods
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${colors[type]} px-4 py-3 rounded-lg shadow-lg border flex items-center max-w-md fixed top-4 right-4 z-50`;
        notification.innerHTML = `
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-3 text-lg hover:text-opacity-75">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(notificationContainer);
        }

        notificationContainer.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize the booking system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing reservation system...');
    window.reservationSystem = new OnlineReservation();
    
    // Add event listeners for advance payment controls
    const advanceSlider = document.getElementById('advanceSlider');
    if (advanceSlider) {
        advanceSlider.addEventListener('input', () => {
            window.reservationSystem.updateAdvancePaymentDisplay();
        });
    }
    
    // Quick advance buttons
    document.querySelectorAll('.advance-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const percent = parseInt(btn.dataset.percent);
            if (advanceSlider) {
                advanceSlider.value = percent;
                window.reservationSystem.updateAdvancePaymentDisplay();
            }
        });
    });
});