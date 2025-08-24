// Enhanced Online Reservation System with Room Type Focus
class OnlineReservation {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.currentStep = 1;
        this.reservationData = {
            checkinDate: '',
            checkoutDate: '',
            checkinTime: '15:00:00',
            checkoutTime: '12:00:00',
            guestCount: 1,
            selectedRoomType: null,
            selectedServices: [],
            selectedMenuItems: [],
            guestInfo: {},
            totalAmount: 0,
            pricingAdjustments: {
                checkin_adjustment: 0,
                checkout_adjustment: 0,
                total_adjustment: 0,
                details: []
            }
        };
        this.roomTypes = [];
        this.availableRoomTypes = [];
        this.hotelServices = [];
        this.menuItems = [];
        this.paymentMethods = [];
        
        // Default images from reliable CDN sources
        this.defaultImages = {
            room: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop&crop=center',
            deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop&crop=center',
            suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop&crop=center',
            standard: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&crop=center',
            single: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&crop=center',
            double: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&h=300&fit=crop&crop=center',
            family: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&crop=center',
            premium: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop&crop=center'
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
            await this.loadPaymentMethods();
            
            // Initialize advance payment display
            this.updateAdvancePaymentDisplay();
            
            // Calculate initial pricing adjustments
            this.calculateAndDisplayPricingAdjustments();
            
            // Trigger initial room type search after everything is loaded
            console.log('Triggering initial room type search...');
            setTimeout(() => {
                this.searchRoomTypes();
            }, 500);
            
            console.log('Enhanced room type reservation system initialized');
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError('Failed to initialize booking system. Please refresh the page.');
        }
    }

    // Helper method to get appropriate image for room type
    getRoomTypeImage(roomType) {
        // If room type has an image URL and it's not a local path, use it
        if (roomType.image_url && (roomType.image_url.startsWith('http://') || roomType.image_url.startsWith('https://'))) {
            return roomType.image_url;
        }
        
        // Otherwise, determine image based on room type name
        const typeName = roomType.type_name ? roomType.type_name.toLowerCase() : '';
        
        if (typeName.includes('suite') || typeName.includes('presidential')) {
            return this.defaultImages.suite;
        } else if (typeName.includes('deluxe') || typeName.includes('premium')) {
            return this.defaultImages.deluxe;
        } else if (typeName.includes('single')) {
            return this.defaultImages.single;
        } else if (typeName.includes('double') || typeName.includes('twin')) {
            return this.defaultImages.double;
        } else if (typeName.includes('family') || typeName.includes('triple')) {
            return this.defaultImages.family;
        } else if (typeName.includes('standard')) {
            return this.defaultImages.standard;
        } else if (typeName.includes('premium')) {
            return this.defaultImages.premium;
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
        // Date and time change handlers with debouncing
        let searchTimeout;
        
        const debouncedSearch = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchRoomTypes();
            }, 500);
        };

        const debouncedPricingUpdate = () => {
            clearTimeout(this.pricingTimeout);
            this.pricingTimeout = setTimeout(() => {
                this.calculateAndDisplayPricingAdjustments();
            }, 300);
        };
        
        const checkinInput = document.getElementById('checkinDate');
        const checkoutInput = document.getElementById('checkoutDate');
        const checkinTimeInput = document.getElementById('checkinTime');
        const checkoutTimeInput = document.getElementById('checkoutTime');
        const guestCountInput = document.getElementById('guestCount');
        
        if (checkinInput) {
            checkinInput.addEventListener('change', () => {
                console.log('Check-in date changed:', checkinInput.value);
                this.updateCheckoutMinDate();
                this.reservationData.checkinDate = checkinInput.value;
                debouncedPricingUpdate();
                debouncedSearch();
            });
        }
        
        if (checkoutInput) {
            checkoutInput.addEventListener('change', () => {
                console.log('Check-out date changed:', checkoutInput.value);
                this.reservationData.checkoutDate = checkoutInput.value;
                debouncedPricingUpdate();
                debouncedSearch();
            });
        }

        if (checkinTimeInput) {
            checkinTimeInput.addEventListener('change', () => {
                console.log('Check-in time changed:', checkinTimeInput.value);
                this.reservationData.checkinTime = checkinTimeInput.value;
                debouncedPricingUpdate();
                debouncedSearch();
            });
        }

        if (checkoutTimeInput) {
            checkoutTimeInput.addEventListener('change', () => {
                console.log('Check-out time changed:', checkoutTimeInput.value);
                this.reservationData.checkoutTime = checkoutTimeInput.value;
                debouncedPricingUpdate();
                debouncedSearch();
            });
        }
        
        if (guestCountInput) {
            guestCountInput.addEventListener('change', () => {
                console.log('Guest count changed:', guestCountInput.value);
                this.reservationData.guestCount = guestCountInput.value;
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

    // Calculate and display pricing adjustments based on time selection
    calculateAndDisplayPricingAdjustments() {
        const checkinTimeInput = document.getElementById('checkinTime');
        const checkoutTimeInput = document.getElementById('checkoutTime');
        const pricingAdjustmentsDiv = document.getElementById('pricingAdjustments');
        const pricingDetailsDiv = document.getElementById('pricingDetails');

        if (!checkinTimeInput || !checkoutTimeInput || !pricingAdjustmentsDiv || !pricingDetailsDiv) return;

        const checkinTime = checkinTimeInput.value;
        const checkoutTime = checkoutTimeInput.value;

        // Calculate adjustments (matching PHP logic)
        let adjustments = {
            checkin_adjustment: 0,
            checkout_adjustment: 0,
            total_adjustment: 0,
            details: []
        };

        // Check-in time adjustments
        const checkinHour = parseInt(checkinTime.split(':')[0]);
        if (checkinHour < 15) { // Before 3 PM
            adjustments.checkin_adjustment = 500; // Early check-in fee
            adjustments.details.push('Early check-in fee: ₱500');
        }

        // Check-out time adjustments
        const checkoutHour = parseInt(checkoutTime.split(':')[0]);
        if (checkoutHour < 11) { // Before 11 AM
            adjustments.checkout_adjustment = -200; // Early checkout discount
            adjustments.details.push('Early check-out discount: -₱200');
        } else if (checkoutHour > 12) { // After 12 PM
            adjustments.checkout_adjustment = 300; // Late checkout fee
            adjustments.details.push('Late check-out fee: ₱300');
        }

        adjustments.total_adjustment = adjustments.checkin_adjustment + adjustments.checkout_adjustment;

        // Store adjustments
        this.reservationData.pricingAdjustments = adjustments;

        // Display adjustments if any
        if (adjustments.details.length > 0) {
            pricingDetailsDiv.innerHTML = adjustments.details.map(detail => `
                <div class="flex justify-between items-center py-1">
                    <span class="text-sm">${detail.split(':')[0]}:</span>
                    <span class="text-sm font-semibold ${detail.includes('-') ? 'text-green-600' : 'text-red-600'}">
                        ${detail.split(':')[1].trim()}
                    </span>
                </div>
            `).join('');
            
            const totalAdjustment = adjustments.total_adjustment;
            if (totalAdjustment !== 0) {
                pricingDetailsDiv.innerHTML += `
                    <div class="border-t pt-2 mt-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-semibold">Total Time Adjustments:</span>
                            <span class="text-sm font-bold ${totalAdjustment < 0 ? 'text-green-600' : 'text-red-600'}">
                                ${totalAdjustment > 0 ? '+' : ''}₱${Math.abs(totalAdjustment)}
                            </span>
                        </div>
                    </div>
                `;
            }

            pricingAdjustmentsDiv.classList.remove('hidden');
        } else {
            pricingAdjustmentsDiv.classList.add('hidden');
        }

        console.log('Pricing adjustments calculated:', adjustments);
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

async searchRoomTypes() {
    // Get form elements and their values
    const checkinElement = document.getElementById('checkinDate');
    const checkoutElement = document.getElementById('checkoutDate');
    const checkinTimeElement = document.getElementById('checkinTime');
    const checkoutTimeElement = document.getElementById('checkoutTime');
    const guestCountElement = document.getElementById('guestCount');
    
    const checkinDate = checkinElement ? checkinElement.value : '';
    const checkoutDate = checkoutElement ? checkoutElement.value : '';
    const checkinTime = checkinTimeElement ? checkinTimeElement.value : '15:00:00';
    const checkoutTime = checkoutTimeElement ? checkoutTimeElement.value : '12:00:00';
    const guestCount = guestCountElement ? guestCountElement.value : '1';

    console.log('Form values:', { checkinDate, checkoutDate, checkinTime, checkoutTime, guestCount });

    // Validate required fields
    if (!checkinDate || !checkoutDate) {
        console.log('Missing dates - stopping search');
        return; // Don't show error on initial load
    }

    const checkinDateTime = new Date(`${checkinDate} ${checkinTime}`);
    const checkoutDateTime = new Date(`${checkoutDate} ${checkoutTime}`);

    if (checkoutDateTime <= checkinDateTime) {
        this.showError('Check-out date and time must be after check-in date and time');
        return;
    }

    // Check minimum stay duration (4 hours as per PHP)
    const timeDiff = checkoutDateTime.getTime() - checkinDateTime.getTime();
    if (timeDiff < (4 * 60 * 60 * 1000)) { // 4 hours in milliseconds
        this.showError('Minimum stay duration is 4 hours');
        return;
    }

    // Show loading state
    const roomTypesLoading = document.getElementById('roomTypesLoading');
    const roomTypesSection = document.getElementById('roomTypesSection');
    const step1Next = document.getElementById('step1Next');
    
    if (roomTypesLoading) roomTypesLoading.classList.remove('hidden');
    if (roomTypesSection) roomTypesSection.classList.add('hidden');
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

        // Since we're dealing with room types only (not specific rooms),
        // we'll display all available room types without checking room availability
        console.log('Displaying all room types (no availability check needed for room types)');
        
        let availableRoomTypes = [];

        // Process each room type and add default availability info
        this.roomTypes.forEach(roomType => {
            // Filter by guest capacity if the room type has a capacity limit
            const roomCapacity = roomType.capacity || roomType.max_guests || 10; // Default high capacity
            const requestedGuests = parseInt(guestCount);
            
            if (requestedGuests <= roomCapacity) {
                const roomTypeWithAvailability = {
                    ...roomType,
                    available_count: 'Available', // Since we're not checking specific rooms
                    max_guests: roomCapacity,
                    amenities: roomType.amenities || []
                };
                
                availableRoomTypes.push(roomTypeWithAvailability);
                console.log(`Room type ${roomType.type_name} added (capacity: ${roomCapacity}, requested: ${requestedGuests})`);
            } else {
                console.log(`Room type ${roomType.type_name} filtered out (capacity: ${roomCapacity}, requested: ${requestedGuests})`);
            }
        });

        console.log(`Total room types available: ${availableRoomTypes.length}`);
        this.availableRoomTypes = availableRoomTypes;
        this.populateRoomTypes();

    } catch (error) {
        console.error('Failed to search room types:', error);
        this.showError(`Failed to search available room types: ${error.message}`);
        this.availableRoomTypes = [];
        this.populateRoomTypes();
    } finally {
        // Hide loading state
        if (roomTypesLoading) roomTypesLoading.classList.add('hidden');
    }
}

    populateRoomTypes() {
        const roomTypesList = document.getElementById('roomTypesList');
        const roomTypesSection = document.getElementById('roomTypesSection');
        const roomTypeCount = document.getElementById('roomTypeCount');

        if (!roomTypesList || !roomTypesSection) {
            console.error('Room type list or section elements not found');
            return;
        }

        if (roomTypeCount) {
            roomTypeCount.textContent = `${this.availableRoomTypes.length} room type${this.availableRoomTypes.length !== 1 ? 's' : ''} available`;
        }

        if (this.availableRoomTypes.length === 0) {
            roomTypesList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-bed text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg mb-2">No room types available</p>
                    <p class="text-gray-400">Please try different dates/times or adjust guest count</p>
                </div>
            `;
            roomTypesSection.classList.remove('hidden');
            return;
        }

        roomTypesList.innerHTML = this.availableRoomTypes.map(roomType => {
            // Calculate adjusted price with time-based adjustments
            const basePrice = parseFloat(roomType.price_per_night);
            const adjustedPrice = basePrice + this.reservationData.pricingAdjustments.total_adjustment;
            
            return `
                <div class="room-type-card bg-white rounded-xl shadow-md overflow-hidden border-2 border-transparent cursor-pointer hover:border-blue-300 transition-all duration-300" 
                     data-room-type-id="${roomType.room_type_id}"
                     data-price="${basePrice}"
                     data-adjusted-price="${adjustedPrice}"
                     data-available-count="${roomType.available_count}">
                    <div class="relative">
                        <img src="${this.getRoomTypeImage(roomType)}" 
                             alt="${roomType.type_name}" 
                             class="w-full h-48 object-cover"
                             onerror="this.src='${this.defaultImages.room}'; this.onerror=null;">
                        <div class="absolute top-4 right-4">
                            <div class="bg-white px-3 py-1 rounded-full shadow-md mb-1">
                                <span class="text-green-600 font-semibold">₱${adjustedPrice.toLocaleString()}/night</span>
                            </div>
                            ${this.reservationData.pricingAdjustments.total_adjustment !== 0 ? `
                                <div class="bg-blue-100 px-2 py-1 rounded-full text-xs">
                                    <span class="${this.reservationData.pricingAdjustments.total_adjustment > 0 ? 'text-red-600' : 'text-green-600'}">
                                        ${this.reservationData.pricingAdjustments.total_adjustment > 0 ? '+' : ''}₱${Math.abs(this.reservationData.pricingAdjustments.total_adjustment)} time adj.
                                    </span>
                                </div>
                            ` : ''}
                            <div class="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                ${roomType.available_count} rooms
                            </div>
                        </div>
                    </div>
                    <div class="p-6">
                        <h4 class="text-xl font-bold text-gray-800 mb-2">${roomType.type_name}</h4>
                        <p class="text-gray-600 mb-4">${roomType.description || 'Comfortable and well-appointed room with modern amenities'}</p>
                        <div class="space-y-2 mb-4">
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-users mr-2"></i>
                                Up to ${roomType.max_guests || roomType.capacity || 2} guests
                            </div>
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-home mr-2"></i>
                                ${roomType.available_count} rooms of this type available
                            </div>
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-wifi mr-2"></i>
                                Free WiFi & Amenities
                            </div>
                            <div class="flex items-center text-sm text-gray-600">
                                <i class="fas fa-concierge-bell mr-2 text-blue-500"></i>
                                Room assigned at check-in by front desk
                            </div>
                        </div>
                        
                        ${roomType.amenities && roomType.amenities.length > 0 ? `
                            <div class="mb-4">
                                <p class="text-sm font-semibold text-gray-700 mb-2">Amenities:</p>
                                <div class="flex flex-wrap gap-1">
                                    ${roomType.amenities.slice(0, 4).map(amenity => `
                                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${amenity}</span>
                                    `).join('')}
                                    ${roomType.amenities.length > 4 ? `
                                        <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">+${roomType.amenities.length - 4} more</span>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        <button class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors select-room-type-btn">
                            Select This Room Type
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers for room type selection
        document.querySelectorAll('.room-type-card').forEach(card => {
            card.addEventListener('click', () => this.selectRoomType(card));
        });

        document.querySelectorAll('.select-room-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectRoomType(btn.closest('.room-type-card'));
            });
        });

        roomTypesSection.classList.remove('hidden');
        console.log('Room types populated successfully with datetime pricing');
    }

    selectRoomType(roomTypeCard) {
        // Remove previous selection
        document.querySelectorAll('.room-type-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Select current room type
        roomTypeCard.classList.add('selected');

        // Hide all other room types with animation
        document.querySelectorAll('.room-type-card').forEach(card => {
            if (card !== roomTypeCard) {
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

        // Store room type data with adjusted price
        const roomTypeInfo = this.availableRoomTypes.find(rt => rt.room_type_id == roomTypeCard.dataset.roomTypeId);
        
        this.reservationData.selectedRoomType = {
            roomTypeId: roomTypeCard.dataset.roomTypeId,
            price: parseFloat(roomTypeCard.dataset.price), // Base price
            adjustedPrice: parseFloat(roomTypeCard.dataset.adjustedPrice), // Price with time adjustments
            availableCount: parseInt(roomTypeCard.dataset.availableCount),
            typeName: roomTypeInfo ? roomTypeInfo.type_name : 'Unknown',
            description: roomTypeInfo ? roomTypeInfo.description : '',
            maxGuests: roomTypeInfo ? (roomTypeInfo.max_guests || roomTypeInfo.capacity || 2) : 2,
            amenities: roomTypeInfo ? roomTypeInfo.amenities || [] : []
        };

        // Store current date/time values
        this.reservationData.checkinDate = document.getElementById('checkinDate')?.value || '';
        this.reservationData.checkoutDate = document.getElementById('checkoutDate')?.value || '';
        this.reservationData.checkinTime = document.getElementById('checkinTime')?.value || '15:00:00';
        this.reservationData.checkoutTime = document.getElementById('checkoutTime')?.value || '12:00:00';
        this.reservationData.guestCount = document.getElementById('guestCount')?.value || '1';

        // Enable next button
        const step1Next = document.getElementById('step1Next');
        if (step1Next) step1Next.disabled = false;

        // Add a "Change Room Type" button for better UX
        this.addChangeRoomTypeButton(roomTypeCard);

        this.showSuccess(`${roomTypeInfo.type_name} selected! Specific room will be assigned by front desk at check-in.`);
    }

    addChangeRoomTypeButton(selectedCard) {
        // Remove existing change room type button if any
        const existingBtn = document.querySelector('.change-room-type-btn');
        if (existingBtn) existingBtn.remove();

        // Create change room type button
        const changeBtn = document.createElement('button');
        changeBtn.className = 'change-room-type-btn w-full bg-gray-600 text-white py-2 mt-2 rounded-lg font-medium hover:bg-gray-700 transition-colors';
        changeBtn.textContent = 'Change Room Type Selection';
        
        changeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showAllRoomTypes();
        });

        // Insert after the select button
        const selectBtn = selectedCard.querySelector('.select-room-type-btn');
        if (selectBtn) {
            selectBtn.parentNode.insertBefore(changeBtn, selectBtn.nextSibling);
            selectBtn.textContent = 'Selected ✓';
            selectBtn.disabled = true;
            selectBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            selectBtn.classList.add('bg-green-600');
        }
    }

    showAllRoomTypes() {
        document.querySelectorAll('.room-type-card').forEach(card => {
            // Reset styles
            card.style.display = 'block';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
            card.classList.remove('selected', 'ring-4', 'ring-blue-500', 'ring-opacity-50');
            
            // Reset select button
            const selectBtn = card.querySelector('.select-room-type-btn');
            if (selectBtn) {
                selectBtn.textContent = 'Select This Room Type';
                selectBtn.disabled = false;
                selectBtn.classList.remove('bg-green-600');
                selectBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
        });

        // Remove change room type buttons
        document.querySelectorAll('.change-room-type-btn').forEach(btn => btn.remove());

        // Clear selection
        this.reservationData.selectedRoomType = null;
        
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
        // Calculate totals with datetime considerations
        const checkinDate = new Date(this.reservationData.checkinDate + ' ' + this.reservationData.checkinTime);
        const checkoutDate = new Date(this.reservationData.checkoutDate + ' ' + this.reservationData.checkoutTime);
        
        // Calculate duration in hours and convert to nights (minimum 1 night for billing)
        const durationHours = (checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60);
        const nights = Math.max(1, Math.ceil(durationHours / 24));

        const roomTypeBasePrice = this.reservationData.selectedRoomType ? this.reservationData.selectedRoomType.price : 0;
        const roomTotal = roomTypeBasePrice * nights;
        const timeAdjustments = this.reservationData.pricingAdjustments.total_adjustment;
        const adjustedRoomTotal = roomTotal + timeAdjustments;
        
        const servicesTotal = this.reservationData.selectedServices.reduce((sum, service) => sum + service.price, 0);
        const menuTotal = this.reservationData.selectedMenuItems.reduce((sum, item) => sum + item.total, 0);
        const grandTotal = adjustedRoomTotal + servicesTotal + menuTotal;

        this.reservationData.totalAmount = grandTotal;

        // Update payment booking summary
        const paymentSummaryEl = document.getElementById('paymentBookingSummary');
        if (paymentSummaryEl) {
            let summaryHtml = `
                <div class="space-y-4">
                    <div>
                        <h5 class="font-semibold text-gray-800 mb-2">Room Type Details</h5>
                        <p class="text-sm text-gray-600">${this.reservationData.selectedRoomType?.typeName || 'No room type selected'}</p>
                        <p class="text-sm text-gray-600">
                            ${Math.floor(durationHours)} hours (${nights} night${nights > 1 ? 's' : ''} billing) × ₱${roomTypeBasePrice.toLocaleString()}
                        </p>
                        <p class="text-sm text-gray-600">Base room cost: ₱${roomTotal.toLocaleString()}</p>
                        ${timeAdjustments !== 0 ? `
                            <p class="text-sm ${timeAdjustments > 0 ? 'text-red-600' : 'text-green-600'}">
                                Time adjustments: ${timeAdjustments > 0 ? '+' : ''}₱${Math.abs(timeAdjustments)}
                            </p>
                        ` : ''}
                        <p class="font-medium">Subtotal: ₱${adjustedRoomTotal.toLocaleString()}</p>
                        <p class="text-xs text-blue-600 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>
                            Specific room will be assigned at check-in (${this.reservationData.selectedRoomType?.availableCount || 'N/A'} rooms available)
                        </p>
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
                        <p class="text-xs text-gray-500 mt-1">
                            Check-in: ${this.formatDateTime(checkinDate)} • Check-out: ${this.formatDateTime(checkoutDate)}
                        </p>
                    </div>
                </div>
            `;

            paymentSummaryEl.innerHTML = summaryHtml;
        }
        
        // Update advance payment display after setting total amount
        this.updateAdvancePaymentDisplay();

        console.log('Payment summary populated with room type datetime pricing:', {
            durationHours,
            nights,
            roomTotal,
            timeAdjustments,
            adjustedRoomTotal,
            servicesTotal,
            menuTotal,
            grandTotal
        });
    }

    formatDateTime(dateTime) {
        return dateTime.toLocaleDateString() + ' ' + dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        // Calculate totals with enhanced datetime information
        const checkinDate = new Date(this.reservationData.checkinDate + ' ' + this.reservationData.checkinTime);
        const checkoutDate = new Date(this.reservationData.checkoutDate + ' ' + this.reservationData.checkoutTime);
        
        const durationHours = (checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60);
        const nights = Math.max(1, Math.ceil(durationHours / 24));

        const roomTypeBasePrice = this.reservationData.selectedRoomType ? this.reservationData.selectedRoomType.price : 0;
        const roomTotal = roomTypeBasePrice * nights;
        const timeAdjustments = this.reservationData.pricingAdjustments.total_adjustment;
        const adjustedRoomTotal = roomTotal + timeAdjustments;
        
        const servicesTotal = this.reservationData.selectedServices.reduce((sum, service) => sum + service.price, 0);
        const menuTotal = this.reservationData.selectedMenuItems.reduce((sum, item) => sum + item.total, 0);
        const grandTotal = adjustedRoomTotal + servicesTotal + menuTotal;

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

        // Final Room Type Summary
        const finalRoomSummaryEl = document.getElementById('finalRoomSummary');
        if (finalRoomSummaryEl) {
            finalRoomSummaryEl.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Room Type:</strong> ${this.reservationData.selectedRoomType?.typeName || 'No room type selected'}</p>
                    <p><strong>Description:</strong> ${this.reservationData.selectedRoomType?.description || 'N/A'}</p>
                    <p><strong>Capacity:</strong> Up to ${this.reservationData.selectedRoomType?.maxGuests || 2} guests</p>
                    <p><strong>Base Rate:</strong> ₱${roomTypeBasePrice.toLocaleString()}/night</p>
                    <p><strong>Available Rooms:</strong> ${this.reservationData.selectedRoomType?.availableCount || 'N/A'} rooms</p>
                    ${timeAdjustments !== 0 ? `
                        <p><strong>Time Adjustments:</strong> 
                            <span class="${timeAdjustments > 0 ? 'text-red-600' : 'text-green-600'}">
                                ${timeAdjustments > 0 ? '+' : ''}₱${Math.abs(timeAdjustments)}
                            </span>
                        </p>
                    ` : ''}
                    <div class="bg-blue-50 rounded p-3 mt-2">
                        <p class="text-sm text-blue-700">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Room Assignment:</strong> Your specific room will be assigned by the front desk at check-in based on availability and preferences.
                        </p>
                    </div>
                </div>
            `;
        }

        // Final Stay Summary with enhanced datetime info
        const finalStaySummaryEl = document.getElementById('finalStaySummary');
        if (finalStaySummaryEl) {
            finalStaySummaryEl.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Check-in:</strong> ${this.formatDateTime(checkinDate)}</p>
                    <p><strong>Check-out:</strong> ${this.formatDateTime(checkoutDate)}</p>
                    <p><strong>Duration:</strong> ${Math.floor(durationHours)} hours (${nights} night${nights > 1 ? 's' : ''} billing)</p>
                    <p><strong>Guests:</strong> ${this.reservationData.guestCount}</p>
                    ${this.reservationData.pricingAdjustments.details.length > 0 ? `
                        <div class="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <strong>Time-based adjustments:</strong>
                            <ul class="mt-1">
                                ${this.reservationData.pricingAdjustments.details.map(detail => `<li>• ${detail}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Final Price Summary with detailed breakdown
        let priceHtml = `
            <div class="space-y-3">
                <div class="flex justify-between py-2">
                    <span>Room Type (${nights} night${nights > 1 ? 's' : ''})</span>
                    <span>₱${roomTotal.toLocaleString()}</span>
                </div>
        `;

        if (timeAdjustments !== 0) {
            priceHtml += `
                <div class="flex justify-between py-2 ${timeAdjustments > 0 ? 'text-red-600' : 'text-green-600'}">
                    <span>Time Adjustments</span>
                    <span>${timeAdjustments > 0 ? '+' : ''}₱${Math.abs(timeAdjustments)}</span>
                </div>
            `;
        }

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

        console.log('Enhanced final summary populated for room type booking:', {
            durationHours,
            nights,
            roomTotal,
            timeAdjustments,
            adjustedRoomTotal,
            servicesTotal,
            menuTotal,
            grandTotal,
            advanceAmount,
            checkinDateTime: checkinDate,
            checkoutDateTime: checkoutDate,
            roomType: this.reservationData.selectedRoomType
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

        // Prepare booking data with room type instead of specific room
        const bookingData = {
            // Guest information
            first_name: this.reservationData.guestInfo.firstName,
            last_name: this.reservationData.guestInfo.lastName,
            email: this.reservationData.guestInfo.email,
            phone_number: this.reservationData.guestInfo.phoneNumber,
            
            // Room type and dates/times (no specific room_id)
            room_type_id: parseInt(this.reservationData.selectedRoomType.roomTypeId),
            check_in_date: this.reservationData.checkinDate,
            check_out_date: this.reservationData.checkoutDate,
            checkin_time: this.reservationData.checkinTime,
            checkout_time: this.reservationData.checkoutTime,
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
            })),
            
            // Room assignment flag (to be handled by front desk)
            room_assignment_pending: true,
            booking_type: 'room_type_selection' // Indicates this is room type booking, not specific room
        };

        console.log('Submitting room type booking data:', bookingData);

        // Submit booking using the existing reservations.php endpoint
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

        console.log('Room type booking submission result:', result);

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        if (!result.success) {
            throw new Error(result.error || 'Failed to submit booking');
        }

        // Show success modal with room type booking details
        this.showBookingSuccess(result);

    } catch (error) {
        console.error('Failed to submit room type booking:', error);
        this.showError('Failed to submit booking: ' + error.message);
    } finally {
        // Reset button state
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.classList.add('hidden');
        confirmBtn.disabled = false;
    }
}
    // Enhanced payment method selection
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

    // Enhanced advance amount calculation
    calculateAdvanceAmount() {
        const advanceSlider = document.getElementById('advanceSlider');
        if (!advanceSlider) return 0;
        
        const advancePercent = parseInt(advanceSlider.value);
        const totalAmount = this.reservationData.totalAmount || 0;
        return (totalAmount * advancePercent) / 100;
    }

    // Enhanced advance payment display update
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
        
        const checkinDateTime = new Date(this.reservationData.checkinDate + ' ' + this.reservationData.checkinTime);
        const checkoutDateTime = new Date(this.reservationData.checkoutDate + ' ' + this.reservationData.checkoutTime);
        
        if (bookingDetailsEl) {
            bookingDetailsEl.innerHTML = `
                <div class="space-y-3">
                    <div class="text-center mb-4">
                        <h5 class="text-lg font-semibold text-gray-800">Room Type Reservation Confirmed</h5>
                        <p class="text-2xl font-bold text-blue-600">#${result.reservation_id}</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><strong>Guest:</strong> ${this.reservationData.guestInfo.firstName} ${this.reservationData.guestInfo.lastName}</p>
                            <p><strong>Email:</strong> ${this.reservationData.guestInfo.email}</p>
                            <p><strong>Phone:</strong> ${this.reservationData.guestInfo.phoneNumber}</p>
                        </div>
                        <div>
                            <p><strong>Room Type:</strong> ${this.reservationData.selectedRoomType.typeName}</p>
                            <p><strong>Check-in:</strong> ${this.formatDateTime(checkinDateTime)}</p>
                            <p><strong>Check-out:</strong> ${this.formatDateTime(checkoutDateTime)}</p>
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p class="text-sm font-semibold text-blue-800 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>
                            Room Assignment Information:
                        </p>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• Your specific room will be assigned at check-in by our front desk team</li>
                            <li>• We guarantee availability of your selected room type</li>
                            <li>• Room assignment considers your preferences and special requests</li>
                            <li>• ${this.reservationData.selectedRoomType.availableCount} rooms of this type were available when you booked</li>
                        </ul>
                    </div>
                    
                    ${result.pricing_adjustments && result.pricing_adjustments.details && result.pricing_adjustments.details.length > 0 ? `
                        <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p class="text-sm font-semibold text-blue-800 mb-2">Time-based Adjustments Applied:</p>
                            <ul class="text-xs text-blue-700 space-y-1">
                                ${result.pricing_adjustments.details.map(detail => `<li>• ${detail}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="border-t pt-3 mt-3">
                        <p class="text-center"><strong>Total Amount:</strong> <span class="text-lg font-bold text-green-600">₱${result.final_total ? result.final_total.toLocaleString() : this.reservationData.totalAmount.toLocaleString()}</span></p>
                        ${result.advance_amount > 0 ? `
                            <p class="text-sm text-gray-600 text-center">Advance Payment: ₱${result.advance_amount.toLocaleString()}</p>
                            <p class="text-sm text-gray-600 text-center">Balance Due: ₱${(result.final_total - result.advance_amount).toLocaleString()}</p>
                        ` : ''}
                        <p class="text-sm text-gray-500 text-center mt-1">Status: Confirmed - Pending Room Assignment</p>
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
                            A detailed confirmation email has been sent to your email address with all booking information and check-in instructions.
                        </p>
                    </div>
                    
                    <div class="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p class="text-sm text-green-700">
                            <i class="fas fa-clock mr-2"></i>
                            Your room type reservation is confirmed. Our front desk will assign your specific room at check-in based on your preferences and special requests.
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

// Initialize the enhanced room type booking system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing room type reservation system...');
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
    
    // Time change listeners for pricing adjustments
    const checkinTime = document.getElementById('checkinTime');
    const checkoutTime = document.getElementById('checkoutTime');
    
    if (checkinTime) {
        checkinTime.addEventListener('change', () => {
            window.reservationSystem.calculateAndDisplayPricingAdjustments();
        });
    }
    
    if (checkoutTime) {
        checkoutTime.addEventListener('change', () => {
            window.reservationSystem.calculateAndDisplayPricingAdjustments();
        });
    }
});