// js/frontdesk/reservations.js - Fixed Front Desk Reservations Management

function formatTimeTo12Hour(time24) {
    if (!time24) return 'N/A';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
}

// Add this utility function to convert 12-hour to 24-hour format
function formatTimeTo24Hour(time12) {
    if (!time12) return '15:00:00'; // default
    
    const [time, ampm] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
}
class FrontDeskReservations {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.reservations = [];
        this.roomTypes = [];
        this.availableRooms = [];
        this.hotelServices = [];
        this.menuItems = [];
        this.paymentMethods = [];
        this.currentEditId = null;
        this.currentPage = 0;
        this.pageSize = 20;
        this.totalCount = 0;
        this.currentStatusId = null;
        // Add logs properties
        this.reservationLogs = [];
        this.logsCurrentPage = 0;
        this.logsPageSize = 50;
        this.logsTotalCount = 0;
        this.logsUserRequested = false; // Track if logs were requested by user
    }
    
    async init() {
        try {
            console.log('Initializing Front Desk Reservations...');
            
            // Check authentication first
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Setup event listeners early
            this.setupEventListeners();
            
            // Load initial data
            console.log('Loading initial data...');
            await Promise.all([
                this.loadRoomTypes(),
                this.loadHotelServices(), 
                this.loadMenuItems(),
                this.loadPaymentMethods()
            ]);
            
            // Load reservations after other data is loaded
            await this.loadReservations();
            
            // Check if logs API is available and load reservation logs
            const logsAvailable = await this.checkLogsAPIAvailability();
            if (logsAvailable) {
                try {
                    await this.loadReservationLogs();
                } catch (error) {
                    console.warn('Failed to load reservation logs, but continuing with initialization:', error);
                    this.showNotification('Warning: Could not load activity logs. Some features may be limited.', 'warning');
                }
            } else {
                console.warn('Logs API not available - hiding logs section');
                this.hideLogsSection();
                this.showNotification('Note: Activity logs are not available. Reservation management will continue to work normally.', 'info');
            }
            
            // Set minimum dates
            this.setMinimumDates();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            console.log('Front desk reservations manager initialized successfully');
            this.showSuccess('System initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize reservations manager:', error);
            this.showError('Failed to initialize system: ' + error.message);
        }
    }
    
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/check.php`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Authentication check failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.authenticated || result.user.role !== 'front desk') {
                window.location.href = `${this.baseURL}/html/auth/login.html`;
                return false;
            }
            
            // Update staff name
            const staffNameEl = document.getElementById('staffName');
            if (staffNameEl && result.user) {
                const userName = result.user.name || 
                    `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim() || 
                    'Front Desk Staff';
                staffNameEl.textContent = userName;
            }
            
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showError('Authentication failed. Please refresh the page.');
            return false;
        }
    }
    
    async loadRoomTypes() {
        try {
            console.log('Loading room types...');
            const response = await fetch(`${this.baseURL}/api/admin/pages/room-types.php`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Room types API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load room types');
            }
            
            this.roomTypes = data.roomTypes || [];
            this.populateRoomTypeSelects();
            console.log('Loaded room types:', this.roomTypes.length);
            
        } catch (error) {
            console.error('Failed to load room types:', error);
            this.showError('Failed to load room types. Using defaults.');
            this.roomTypes = [];
            this.populateRoomTypeSelects();
        }
    }
    
    async loadHotelServices() {
        try {
            console.log('Loading hotel services...');
            const response = await fetch(`${this.baseURL}/api/admin/pages/utilities/hotel-services.php`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Hotel services API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load hotel services');
            }
            
            this.hotelServices = data.services || [];
            console.log('Loaded hotel services:', this.hotelServices.length);
            
        } catch (error) {
            console.error('Failed to load hotel services:', error);
            this.showError('Failed to load hotel services.');
            this.hotelServices = [];
        }
    }
    
    async loadMenuItems() {
        try {
            console.log('Loading menu items...');
            const response = await fetch(`${this.baseURL}/api/admin/pages/menu-items.php`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Menu items API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load menu items');
            }
            
            this.menuItems = data.menu_items || [];
            console.log('Loaded menu items:', this.menuItems.length);
            
        } catch (error) {
            console.error('Failed to load menu items:', error);
            this.showError('Failed to load menu items.');
            this.menuItems = [];
        }
    }
    
    async loadPaymentMethods() {
        try {
            console.log('Loading payment methods...');
            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php?action=payment_methods`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Payment methods API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load payment methods');
            }
            
            this.paymentMethods = data.payment_methods || [];
            this.populatePaymentMethods();
            console.log('Loaded payment methods:', this.paymentMethods.length);
            
        } catch (error) {
            console.error('Failed to load payment methods:', error);
            this.showError('Failed to load payment methods.');
            this.paymentMethods = [];
            this.populatePaymentMethods();
        }
    }
    
    async loadReservations(page = 0) {
        try {
            console.log('Loading reservations, page:', page);
            // Show loading state
            this.showLoadingState();
            
            // Build query parameters
            const params = new URLSearchParams({
                limit: this.pageSize.toString(),
                offset: (page * this.pageSize).toString()
            });
            
            // Add filters
            this.addFiltersToParams(params);
            
            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php?${params}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Reservations API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load reservations');
            }
            
            this.reservations = data.reservations || [];
            this.currentPage = page;
            this.totalCount = data.pagination?.total || 0;
            
            this.renderReservations();
            this.updatePagination(data.pagination);
            this.updateTotalCount();
            this.updateLastUpdated();
            
            console.log('Loaded reservations:', this.reservations.length);
            
        } catch (error) {
            console.error('Failed to load reservations:', error);
            this.showError('Failed to load reservations: ' + error.message);
            this.renderEmptyState();
        }
    }
    
    async checkLogsAPIAvailability() {
        try {
            const response = await fetch(`${this.baseURL}/api/frontdesk/reservation_logs.php?action=all_logs&page=1&limit=1`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.success;
            }
            
            return false;
        } catch (error) {
            console.warn('Logs API availability check failed:', error);
            return false;
        }
    }
    
    async loadReservationLogs(page = 0) {
        try {
            console.log('Loading reservation logs, page:', page);
            
            // Build query parameters
            const params = new URLSearchParams({
                action: 'all_logs',
                page: (page + 1).toString(),
                limit: this.logsPageSize.toString()
            });
            
            // Add logs filters
            this.addLogsFiltersToParams(params);
            
            const response = await fetch(`${this.baseURL}/api/frontdesk/reservation_logs.php?${params}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Reservation logs API response:', errorText);
                
                // If it's a 400 error, it might be a parameter issue
                if (response.status === 400) {
                    console.warn('Logs API returned 400 - trying without filters');
                    // Try again without filters
                    const simpleParams = new URLSearchParams({
                        action: 'all_logs',
                        page: (page + 1).toString(),
                        limit: this.logsPageSize.toString()
                    });
                    
                    const retryResponse = await fetch(`${this.baseURL}/api/frontdesk/reservation_logs.php?${simpleParams}`, {
                        method: 'GET',
                        credentials: 'same-origin',
                        headers: { 
                            'Cache-Control': 'no-cache',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!retryResponse.ok) {
                        throw new Error(`Reservation logs API error: ${retryResponse.status} - ${await retryResponse.text()}`);
                    }
                    
                    const retryData = await retryResponse.json();
                    if (!retryData.success) {
                        throw new Error(retryData.error || 'Failed to load reservation logs');
                    }
                    
                    // Use the retry data
                    this.reservationLogs = retryData.logs || [];
                    this.logsCurrentPage = page;
                    this.logsTotalCount = retryData.pagination?.total_logs || 0;
                    
                    this.renderReservationLogs();
                    this.updateLogsPagination(retryData.pagination);
                    this.updateLogsTotalCount();
                    this.updateLogsLastUpdated();
                    
                    if (!retryData.pagination) {
                        this.updateLogsPaginationInfo({
                            total_logs: this.logsTotalCount,
                            limit: this.logsPageSize,
                            current_page: 1
                        });
                    }
                    
                    console.log('Loaded reservation logs (retry):', this.reservationLogs.length);
                    
                    // Reset user requested flag after successful retry
                    this.logsUserRequested = false;
                    return;
                }
                
                throw new Error(`Reservation logs API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load reservation logs');
            }
            
            this.reservationLogs = data.logs || [];
            this.logsCurrentPage = page;
            this.logsTotalCount = data.pagination?.total_logs || 0;
            
            this.renderReservationLogs();
            this.updateLogsPagination(data.pagination);
            this.updateLogsTotalCount();
            this.updateLogsLastUpdated();
            
            // Update pagination info even if no pagination data
            if (!data.pagination) {
                this.updateLogsPaginationInfo({
                    total_logs: this.logsTotalCount,
                    limit: this.logsPageSize,
                    current_page: 1
                });
            }
            
            console.log('Loaded reservation logs:', this.reservationLogs.length);
            
            // Reset user requested flag after successful load
            this.logsUserRequested = false;
            
        } catch (error) {
            console.error('Failed to load reservation logs:', error);
            
            // Don't show error to user if this is a background refresh
            // Only show error if user explicitly requested logs
            if (this.logsUserRequested) {
                this.showError('Failed to load reservation logs: ' + error.message);
            }
            
            this.renderLogsEmptyState();
            
            // Update pagination info for error state
            this.updateLogsPaginationInfo({
                total_logs: 0,
                limit: this.logsPageSize,
                current_page: 1
            });
            
            // Reset user requested flag after error
            this.logsUserRequested = false;
        }
    }
    
    addFiltersToParams(params) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput?.value?.trim()) {
            params.append('search', searchInput.value.trim());
        }
        
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter?.value) {
            params.append('status', statusFilter.value);
        }
        
        const checkinFilter = document.getElementById('checkinFilter');
        if (checkinFilter?.value) {
            params.append('checkin_date', checkinFilter.value);
        }
        
        const roomTypeFilter = document.getElementById('roomTypeFilter');
        if (roomTypeFilter?.value) {
            params.append('room_type', roomTypeFilter.value);
        }
    }
    
    addLogsFiltersToParams(params) {
        const actionFilter = document.getElementById('logsActionFilter');
        if (actionFilter?.value) {
            params.append('action_type', actionFilter.value);
        }
        
        const dateFromFilter = document.getElementById('logsDateFrom');
        if (dateFromFilter?.value) {
            params.append('date_from', dateFromFilter.value);
        }
        
        const dateToFilter = document.getElementById('logsDateTo');
        if (dateToFilter?.value) {
            params.append('date_to', dateToFilter.value);
        }
    }
    
    populateRoomTypeSelects() {
        const selects = ['roomTypeSelect', 'roomTypeFilter'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            // Save first option for filters
            const firstOption = select.querySelector('option');
            const firstText = firstOption ? firstOption.textContent : '';
            const firstValue = firstOption ? firstOption.value : '';
            
            select.innerHTML = '';
            
            // Add first option back for filters
            if (selectId.includes('Filter')) {
                const option = document.createElement('option');
                option.value = firstValue;
                option.textContent = firstText || 'All Types';
                select.appendChild(option);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Select Room Type';
                select.appendChild(option);
            }
            
            this.roomTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.room_type_id;
                option.textContent = `${type.type_name} - ₱${parseFloat(type.price_per_night || 0).toLocaleString()}/night`;
                select.appendChild(option);
            });
        });
    }
    
    populatePaymentMethods() {
        const select = document.getElementById('paymentMethodSelect');
        if (!select) return;
        
        // Clear and add default option
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'No advance payment';
        select.appendChild(defaultOption);
        
        this.paymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method.payment_method_id;
            option.textContent = method.method_name;
            select.appendChild(option);
        });
        
        console.log('Payment methods populated:', this.paymentMethods.length);
    }
    
    populateHotelServices() {
        const servicesListEl = document.getElementById('servicesList');
        if (!servicesListEl) return;
        
        servicesListEl.innerHTML = '';
        
        if (this.hotelServices.length === 0) {
            servicesListEl.innerHTML = '<p class="text-gray-500 text-sm">No services available.</p>';
            return;
        }
        
        this.hotelServices.forEach(service => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center p-2 hover:bg-gray-50 rounded';
            
            const price = parseFloat(service.price || service.service_price || service.cost || service.amount || 0);
            const isComplimentary = service.is_complimentary || price === 0;
            
            wrapper.innerHTML = `
                <input type="checkbox" 
                       id="service_${service.service_id}" 
                       name="services[]" 
                       value="${service.service_id}" 
                       data-price="${price}"
                       class="mr-2 service-checkbox">
                <label for="service_${service.service_id}" class="text-sm cursor-pointer flex-1">
                    ${service.service_name} 
                    <span class="text-gray-500">(₱${price.toFixed(2)}${isComplimentary ? ' - Complimentary' : ''})</span>
                </label>
            `;
            servicesListEl.appendChild(wrapper);
        });
        
        // Add event listeners for price calculation
        this.attachServiceEventListeners();
    }
    
    populateMenuItems() {
        const menuItemsListEl = document.getElementById('menuItemsList');
        if (!menuItemsListEl) return;
        
        menuItemsListEl.innerHTML = '';
        
        if (this.menuItems.length === 0) {
            menuItemsListEl.innerHTML = '<p class="text-gray-500 text-sm">No menu items available.</p>';
            return;
        }
        
        // Group menu items by category
        const groupedItems = this.menuItems.reduce((acc, item) => {
            const category = item.category || 'General';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
        
        Object.keys(groupedItems).forEach(category => {
            // Add category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'font-medium text-gray-800 border-b border-gray-200 pb-1 mb-2 mt-3 first:mt-0 category-header';
            categoryHeader.textContent = category;
            menuItemsListEl.appendChild(categoryHeader);
            
            // Add items in this category
            groupedItems[category].forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'flex items-center justify-between p-2 hover:bg-gray-50 rounded';
                
                const price = parseFloat(item.price || 0);
                
                wrapper.innerHTML = `
                    <div class="flex items-center flex-1">
                        <input type="checkbox" 
                               id="menu_${item.menu_id}" 
                               name="menu_items[]" 
                               value="${item.menu_id}" 
                               data-price="${price}"
                               class="mr-2 menu-checkbox">
                        <label for="menu_${item.menu_id}" class="text-sm cursor-pointer">
                            ${item.item_name} 
                            <span class="text-gray-500">(₱${price.toFixed(2)})</span>
                        </label>
                    </div>
                    <div class="flex items-center ml-2">
                        <label class="text-xs text-gray-500 mr-1">Qty:</label>
                        <input type="number" 
                               id="qty_${item.menu_id}" 
                               min="1" 
                               max="10" 
                               value="1" 
                               class="w-12 h-6 text-xs border border-gray-300 rounded menu-quantity" 
                               disabled>
                    </div>
                `;
                menuItemsListEl.appendChild(wrapper);
            });
        });
        
        // Add event listeners for checkboxes and quantities
        this.attachMenuEventListeners();
    }
    
    attachServiceEventListeners() {
        document.querySelectorAll('.service-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log('Service checkbox changed:', checkbox.checked);
                this.calculateTotalAmount();
            });
        });
    }
    
    attachMenuEventListeners() {
        document.querySelectorAll('.menu-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const menuId = e.target.value;
                const quantityInput = document.getElementById(`qty_${menuId}`);
                
                if (e.target.checked) {
                    quantityInput.disabled = false;
                    quantityInput.addEventListener('input', () => this.calculateTotalAmount());
                } else {
                    quantityInput.disabled = true;
                    quantityInput.removeEventListener('input', () => this.calculateTotalAmount());
                }
                
                console.log('Menu checkbox changed:', checkbox.checked);
                this.calculateTotalAmount();
            });
        });
    }
    
    calculateTotalAmount() {
        try {
            console.log('Calculating total amount...');
            
            const roomTypeId = document.getElementById('roomTypeSelect')?.value;
            const checkinDate = document.getElementById('checkinDate')?.value;
            const checkoutDate = document.getElementById('checkoutDate')?.value;
            
            if (!roomTypeId || !checkinDate || !checkoutDate) {
                this.resetPriceDisplay();
                return;
            }

            // Get room type and calculate nights
            const roomType = this.roomTypes.find(rt => rt.room_type_id == roomTypeId);
            if (!roomType) {
                this.resetPriceDisplay();
                return;
            }
            
            const checkin = new Date(checkinDate);
            const checkout = new Date(checkoutDate);
            const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
            
            if (nights <= 0) {
                document.getElementById('totalAmount').innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="flex items-center text-gray-700">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Invalid dates
                        </span>
                        <span class="text-lg text-red-600">₱0.00</span>
                    </div>
                `;
                return;
            }
            
            // Calculate room cost
            const roomPrice = parseFloat(roomType.price_per_night || 0);
            const roomTotal = roomPrice * nights;
            
            // Calculate services total
            let servicesTotal = 0;
            document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
                const price = parseFloat(checkbox.getAttribute('data-price') || 0);
                servicesTotal += price;
            });
            
            // Calculate menu items total
            let menuTotal = 0;
            document.querySelectorAll('.menu-checkbox:checked').forEach(checkbox => {
                const menuId = checkbox.value;
                const price = parseFloat(checkbox.getAttribute('data-price') || 0);
                const quantityInput = document.getElementById(`qty_${menuId}`);
                const quantity = parseInt(quantityInput?.value || 1);
                menuTotal += price * quantity;
            });
            
            // Calculate grand total
            const grandTotal = roomTotal + servicesTotal + menuTotal;
            
            // Update display
            this.updatePriceDisplay(roomPrice, nights, roomTotal, servicesTotal, menuTotal, grandTotal);
            
            console.log('Total calculation completed:', {
                roomPrice,
                nights,
                roomTotal,
                servicesTotal,
                menuTotal,
                grandTotal
            });
            
        } catch (error) {
            console.error('Error calculating total amount:', error);
            this.resetPriceDisplay();
        }
    }
    
    updatePriceDisplay(roomPrice, nights, roomTotal, servicesTotal, menuTotal, grandTotal) {
        // Update individual elements
        const roomRateEl = document.getElementById('roomRate');
        const nightsCountEl = document.getElementById('nightsCount');
        const totalAmountEl = document.getElementById('totalAmount');
        
        if (roomRateEl) roomRateEl.textContent = `₱${roomPrice.toLocaleString()}`;
        if (nightsCountEl) nightsCountEl.textContent = nights.toString();
        
        if (totalAmountEl) {
            totalAmountEl.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Room (${nights} nights):</span>
                        <span>₱${roomTotal.toLocaleString()}</span>
                    </div>
                    ${servicesTotal > 0 ? `
                        <div class="flex justify-between text-sm text-blue-600">
                            <span>Services:</span>
                            <span>₱${servicesTotal.toLocaleString()}</span>
                        </div>
                    ` : ''}
                    ${menuTotal > 0 ? `
                        <div class="flex justify-between text-sm text-green-600">
                            <span>Menu Items:</span>
                            <span>₱${menuTotal.toLocaleString()}</span>
                        </div>
                    ` : ''}
                    <div class="border-t pt-2 font-semibold">
                        <div class="flex justify-between items-center">
                            <span class="flex items-center text-gray-700">
                                <i class="fas fa-receipt mr-2"></i>
                                Total:
                            </span>
                            <span class="text-xl text-blue-600">₱${grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Update advance payment balance calculation
        this.updateAdvancePaymentBalance(grandTotal);
    }
    
    updateAdvancePaymentBalance(totalAmount) {
        const advanceAmountInput = document.getElementById('advanceAmount');
        const balanceDisplay = document.getElementById('remainingBalance');
        
        if (advanceAmountInput && balanceDisplay) {
            const advanceAmount = parseFloat(advanceAmountInput.value || 0);
            const remainingBalance = Math.max(0, totalAmount - advanceAmount);
            balanceDisplay.textContent = `₱${remainingBalance.toLocaleString()}`;
        }
    }
    
    resetPriceDisplay() {
        const elements = [
            { id: 'roomRate', value: '₱0.00' },
            { id: 'nightsCount', value: '0' },
            { id: 'remainingBalance', value: '₱0.00' }
        ];
        
        elements.forEach(({ id, value }) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
        
        const totalAmountEl = document.getElementById('totalAmount');
        if (totalAmountEl) {
            totalAmountEl.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="flex items-center text-gray-700">
                        <i class="fas fa-receipt mr-2"></i>
                        Total:
                    </span>
                    <span class="text-xl text-blue-600">₱0.00</span>
                </div>
            `;
        }
    }
    
    renderReservations() {
        const tbody = document.getElementById('reservationsTableBody');
        if (!tbody) return;
        
        if (this.reservations.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        tbody.innerHTML = this.reservations.map(reservation => this.createReservationRow(reservation)).join('');
    }
    
    renderReservationLogs() {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;
        
        if (this.reservationLogs.length === 0) {
            this.renderLogsEmptyState();
            return;
        }
        
        tbody.innerHTML = this.reservationLogs.map(log => this.createLogRow(log)).join('');
    }
    
createReservationRow(reservation) {
    const statusColors = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Confirmed': 'bg-blue-100 text-blue-800',
        'Checked-in': 'bg-green-100 text-green-800',
        'Checked-out': 'bg-gray-100 text-gray-800',
        'Cancelled': 'bg-red-100 text-red-800'
    };
    const statusClass = statusColors[reservation.status_name] || 'bg-gray-100 text-gray-800';

    const checkinDate = new Date(reservation.check_in_date).toLocaleDateString();
    const checkoutDate = new Date(reservation.check_out_date).toLocaleDateString();

    // Time extraction with 12-hour format conversion
    let checkinTime = '';
    let checkoutTime = '';
    if (reservation.checkin_datetime && reservation.checkin_datetime.includes(' ')) {
        const time24 = reservation.checkin_datetime.split(' ')[1]?.substring(0, 5) || '';
        checkinTime = formatTimeTo12Hour(time24);
    }
    if (reservation.checkout_datetime && reservation.checkout_datetime.includes(' ')) {
        const time24 = reservation.checkout_datetime.split(' ')[1]?.substring(0, 5) || '';
        checkoutTime = formatTimeTo12Hour(time24);
    }
    const timeInfo =
        `<div class="text-xs text-gray-500">
            <div>Time: ${checkinTime || 'N/A'} - ${checkoutTime || 'N/A'}</div>
        </div>`;

    // Rest of the method remains the same...
    let reservationType = reservation.type_name || '';
    if (!reservationType || reservationType.toLowerCase().includes('front') || reservationType.toLowerCase().includes('walk')) {
        reservationType = 'Walk-In';
    }

    const showAssignRoom = 
        (reservation.status_name === 'Pending' || reservation.status_name === 'Confirmed') && 
        (!reservation.room_id || !reservation.room_number) && 
        reservation.room_type_id;

    return `
        <tr class="hover:bg-gray-50 transition-colors table-row">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">#${reservation.reservation_id}</div>
                <div class="text-xs text-gray-500">${reservationType}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${reservation.customer_name || `${reservation.first_name} ${reservation.last_name}`}</div>
                <div class="text-sm text-gray-500">${reservation.email || 'No email'}</div>
                <div class="text-sm text-gray-500">${reservation.phone_number || 'No phone'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${reservation.room_type_name || reservation.type_name || 'Room Type'}</div>
                <div class="text-sm text-gray-500">
                    ${reservation.room_number ? `Room ${reservation.room_number}` : '<span class="text-orange-600 font-medium">No room assigned</span>'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                    <div><strong>In:</strong> ${checkinDate} ${checkinTime !== 'N/A' ? `<span class="text-xs">(${checkinTime})</span>` : ''}</div>
                    <div><strong>Out:</strong> ${checkoutDate} ${checkoutTime !== 'N/A' ? `<span class="text-xs">(${checkoutTime})</span>` : ''}</div>
                    ${timeInfo}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">₱${parseFloat(reservation.total_amount || 0).toLocaleString()}</div>
                ${reservation.advance_payment > 0 ? `<div class="text-sm text-green-600 advance-payment">Advance: ₱${parseFloat(reservation.advance_payment).toLocaleString()}</div>` : ''}
                <div class="text-sm text-gray-500">Guests: ${reservation.guest_count || 1}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                    ${reservation.status_name}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                    <button onclick="window.reservationsManager.editReservation(${reservation.reservation_id})"
                            class="text-blue-600 hover:text-blue-900 action-btn p-1" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.reservationsManager.updateStatus(${reservation.reservation_id}, '${reservation.status_name}')"
                            class="text-green-600 hover:text-green-900 action-btn p-1" title="Update Status">
                        <i class="fas fa-clipboard-check"></i>
                    </button>
                    <button onclick="window.reservationsManager.viewReservation(${reservation.reservation_id})"
                            class="text-purple-600 hover:text-purple-900 action-btn p-1" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                 ${showAssignRoom ? `
                <button onclick="window.reservationsManager.showRoomAssignmentModal(${reservation.reservation_id}, ${reservation.room_type_id})"
                    class="text-orange-600 hover:text-orange-900 action-btn p-1" title="Assign Room">
                    <i class="fas fa-door-open"></i>
                </button>
                ` : ''}
                </div>
            </td>
        </tr>
    `;
}
    
    createLogRow(log) {
        const actionColors = {
            'created': 'bg-green-100 text-green-800',
            'updated': 'bg-blue-100 text-blue-800',
            'status_changed': 'bg-yellow-100 text-yellow-800',
            'room_assigned': 'bg-purple-100 text-purple-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        
        const actionClass = actionColors[log.action_type] || 'bg-gray-100 text-gray-800';
        const timestamp = new Date(log.timestamp).toLocaleString();
        const customerName = log.customer?.name || 'N/A';
        const roomInfo = log.room?.room_number ? `Room ${log.room.room_number}` : 'N/A';
        const userInfo = log.user_type ? `${log.user_type} (ID: ${log.user_id || 'N/A'})` : 'System';
        
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${timestamp}</div>
                    <div class="text-xs text-gray-500">${log.formatted_timestamp || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">#${log.reservation_id}</div>
                    <div class="text-xs text-gray-500">Reservation</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${customerName}</div>
                    <div class="text-xs text-gray-500">${log.customer?.email || 'No email'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionClass}">
                        ${log.action_type.replace('_', ' ').toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${roomInfo}</div>
                    <div class="text-xs text-gray-500">${log.room?.room_type || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${userInfo}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 max-w-xs truncate" title="${log.notes || 'No notes'}">
                        ${log.notes || 'No notes'}
                    </div>
                </td>
            </tr>
        `;
    }
    
    renderEmptyState() {
        const tbody = document.getElementById('reservationsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-calendar-check text-gray-300 text-4xl mb-4"></i>
                            <p class="text-lg mb-2">No reservations found</p>
                            <p class="text-sm mb-4">Try adjusting your filters or create a new reservation</p>
                            <button onclick="window.reservationsManager.showAddModal()" 
                                    class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-plus mr-2"></i>New Reservation
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    renderLogsEmptyState() {
        const tbody = document.getElementById('logsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-history text-gray-300 text-4xl mb-4"></i>
                            <p class="text-lg mb-2">No activity logs found</p>
                            <p class="text-sm mb-4">Try adjusting your filters or check back later</p>
                            <button onclick="window.reservationsManager.logsUserRequested = true; window.reservationsManager.loadReservationLogs(0)" 
                                    class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                                <i class="fas fa-sync-alt mr-2"></i>Retry Loading Logs
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    showLoadingState() {
        const tbody = document.getElementById('reservationsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <div class="loading-spinner mx-auto mb-4"></div>
                            <p class="text-lg mb-2">Loading reservations...</p>
                            <p class="text-sm text-gray-400">Please wait while we fetch the latest data</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    updateTotalCount() {
        const totalEl = document.getElementById('totalReservations');
        if (totalEl) {
            totalEl.textContent = this.totalCount.toString();
        }
        
        // Update pagination info
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            const start = this.currentPage * this.pageSize + 1;
            const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalCount);
            paginationInfo.textContent = `Showing ${start} to ${end} of ${this.totalCount} results`;
        }
    }
    
    updateLastUpdated() {
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }
    
    updateLogsTotalCount() {
        const totalEl = document.getElementById('totalLogs');
        if (totalEl) {
            totalEl.textContent = this.logsTotalCount.toString();
        }
    }
    
    updateLogsLastUpdated() {
        const lastUpdatedEl = document.getElementById('logsLastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }
    
    updatePagination(pagination) {
        const buttonsContainer = document.getElementById('paginationButtons');
        if (!buttonsContainer || !pagination) return;
        
        buttonsContainer.innerHTML = '';
        
        const { total, limit, offset } = pagination;
        const currentPage = Math.floor(offset / limit);
        const totalPages = Math.ceil(total / limit);
        
        if (totalPages <= 1) return;
        
        // Previous button
        if (currentPage > 0) {
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.className = 'px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors';
            prevBtn.onclick = () => this.loadReservations(currentPage - 1);
            buttonsContainer.appendChild(prevBtn);
        }
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(0, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = (i + 1).toString();
            pageBtn.className = `px-3 py-1 text-sm border border-gray-300 rounded-md transition-colors ${
                i === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
            }`;
            pageBtn.onclick = () => this.loadReservations(i);
            buttonsContainer.appendChild(pageBtn);
        }
        
        // Next button
        if (currentPage < totalPages - 1) {
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.className = 'px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors';
            nextBtn.onclick = () => this.loadReservations(currentPage + 1);
            buttonsContainer.appendChild(nextBtn);
        }
    }
    
    updateLogsPagination(pagination) {
        const buttonsContainer = document.getElementById('logsPaginationButtons');
        if (!buttonsContainer || !pagination) return;
        
        buttonsContainer.innerHTML = '';
        
        const { total_logs, limit, current_page } = pagination;
        const totalPages = Math.ceil(total_logs / limit);
        
        if (totalPages <= 1) return;
        
        // Previous button
        if (current_page > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.className = 'px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors';
            prevBtn.onclick = () => {
                this.logsUserRequested = true;
                this.loadReservationLogs(current_page - 2);
            };
            buttonsContainer.appendChild(prevBtn);
        }
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, current_page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i.toString();
            pageBtn.className = `px-3 py-1 text-sm border border-gray-300 rounded-md transition-colors ${
                i === current_page ? 'bg-purple-600 text-white' : 'hover:bg-gray-50'
            }`;
            pageBtn.onclick = () => {
                this.logsUserRequested = true;
                this.loadReservationLogs(i - 1);
            };
            buttonsContainer.appendChild(pageBtn);
        }
        
        // Next button
        if (current_page < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.className = 'px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors';
            nextBtn.onclick = () => {
                this.logsUserRequested = true;
                this.loadReservationLogs(current_page);
            };
            buttonsContainer.appendChild(nextBtn);
        }
        
        // Update pagination info
        this.updateLogsPaginationInfo(pagination);
    }
    
    updateLogsPaginationInfo(pagination) {
        const paginationInfo = document.getElementById('logsPaginationInfo');
        if (paginationInfo && pagination) {
            const { total_logs, limit, current_page } = pagination;
            const start = (current_page - 1) * limit + 1;
            const end = Math.min(current_page * limit, total_logs);
            paginationInfo.textContent = `Showing ${start} to ${end} of ${total_logs} results`;
        }
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Add reservation button
        const addBtn = document.getElementById('addReservationBtn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAddModal();
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportReservations();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadReservations(this.currentPage);
            });
        }
        
        // Print button
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.printReservations();
            });
        }
        
        // Modal events
        this.setupModalEvents();
        
        // Form events
        this.setupFormEvents();
        
        // Filter events
        this.setupFilterEvents();
        
        // Quick actions
        this.setupQuickActions();
        
        // Mobile sidebar
        this.setupMobileSidebar();
        
        // Logs events
        this.setupLogsEventListeners();
        
        // Logout
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }
    
    setupModalEvents() {
        // Main reservation modal
        const modal = document.getElementById('reservationModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelReservationBtn');
        
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideModal();
                });
            }
        });
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
        
        // Status modal
        const statusModal = document.getElementById('statusModal');
        const closeStatusBtn = document.getElementById('closeStatusModal');
        const cancelStatusBtn = document.getElementById('cancelStatusBtn');
        
        [closeStatusBtn, cancelStatusBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.hideStatusModal();
                });
            }
        });
        
        if (statusModal) {
            statusModal.addEventListener('click', (e) => {
                if (e.target === statusModal) {
                    this.hideStatusModal();
                }
            });
        }
        
        // Details modal
        const detailsModal = document.getElementById('detailsModal');
        const closeDetailsBtn = document.getElementById('closeDetailsModal');
        
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideDetailsModal();
            });
        }
        
        if (detailsModal) {
            detailsModal.addEventListener('click', (e) => {
                if (e.target === detailsModal) {
                    this.hideDetailsModal();
                }
            });
        }
        
        // Room assignment modal
        const roomAssignmentModal = document.getElementById('roomAssignmentModal');
        const roomAssignmentCloseBtn = document.getElementById('closeRoomAssignmentModal');
        const roomAssignmentCancelBtn = document.getElementById('cancelRoomAssignmentBtn');
        
        console.log('Setting up room assignment modal event listeners');
        console.log('Modal element:', roomAssignmentModal);
        console.log('Close button:', roomAssignmentCloseBtn);
        console.log('Cancel button:', roomAssignmentCancelBtn);
        
        [roomAssignmentCloseBtn, roomAssignmentCancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Room assignment modal close button clicked');
                    this.hideRoomAssignmentModal();
                });
            }
        });
        
        if (roomAssignmentModal) {
            roomAssignmentModal.addEventListener('click', (e) => {
                if (e.target === roomAssignmentModal) {
                    console.log('Room assignment modal background clicked');
                    this.hideRoomAssignmentModal();
                }
        
            });
        }
        if (roomAssignmentCloseBtn) {
    roomAssignmentCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideRoomAssignmentModal();
    });
}

if (roomAssignmentCancelBtn) {
    roomAssignmentCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideRoomAssignmentModal();
    });
}
    }
    
    setupFormEvents() {
        // Main form
        const form = document.getElementById('reservationForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveReservation();
            });
        }
        
        // Status form
        const statusForm = document.getElementById('statusForm');
        if (statusForm) {
            statusForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveStatusUpdate();
            });
        }
        
        // Room assignment form
       const roomAssignmentForm = document.getElementById('roomAssignmentForm');
        if (roomAssignmentForm) {
            roomAssignmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveRoomAssignment();
            });
        } else {
            console.error('Room assignment form not found!');
        }
        
        // Room type change
        const roomTypeSelect = document.getElementById('roomTypeSelect');
        if (roomTypeSelect) {
            roomTypeSelect.addEventListener('change', () => {
                this.updateAvailableRooms();
                this.calculateTotalAmount();
            });
        }
        
        // Date changes
        const checkinDate = document.getElementById('checkinDate');
        const checkoutDate = document.getElementById('checkoutDate');
        
        if (checkinDate) {
            checkinDate.addEventListener('change', () => {
                this.updateAvailableRooms();
                this.calculateTotalAmount();
                this.updateCheckoutMinDate();
            });
        }
        
        if (checkoutDate) {
            checkoutDate.addEventListener('change', () => {
                this.updateAvailableRooms();
                this.calculateTotalAmount();
            });
        }
        
        // Guest count change
        const guestCount = document.getElementById('guestCount');
        if (guestCount) {
            guestCount.addEventListener('change', () => {
                this.calculateTotalAmount();
            });
        }
        
        // Payment method change
        const paymentMethodSelect = document.getElementById('paymentMethodSelect');
        if (paymentMethodSelect) {
            paymentMethodSelect.addEventListener('change', (e) => {
                const advanceFields = document.getElementById('advancePaymentFields');
                if (e.target.value) {
                    advanceFields?.classList.remove('hidden');
                    // Focus on advance amount field
                    const advanceAmountField = document.getElementById('advanceAmount');
                    if (advanceAmountField) {
                        setTimeout(() => advanceAmountField.focus(), 100);
                    }
                } else {
                    advanceFields?.classList.add('hidden');
                    const advanceAmount = document.getElementById('advanceAmount');
                    const referenceNumber = document.getElementById('referenceNumber');
                    if (advanceAmount) advanceAmount.value = '';
                    if (referenceNumber) referenceNumber.value = '';
                }
            });
        }
        
        // Advanced payment amount validation and balance calculation
        const advanceAmount = document.getElementById('advanceAmount');
        if (advanceAmount) {
            advanceAmount.addEventListener('input', (e) => {
                const amount = parseFloat(e.target.value) || 0;
                const formData = this.collectFormData();
                const totalAmount = this.calculateTotalAmountValue(formData);
                
                if (amount > totalAmount && totalAmount > 0) {
                    e.target.setCustomValidity('Advance payment cannot be greater than total amount');
                } else {
                    e.target.setCustomValidity('');
                }
                
                this.updateAdvancePaymentBalance(totalAmount);
            });
        }
        
        // Special requests character counter
        const specialRequests = document.getElementById('specialRequests');
        const specialRequestsCount = document.getElementById('specialRequestsCount');
        if (specialRequests && specialRequestsCount) {
            specialRequests.addEventListener('input', (e) => {
                specialRequestsCount.textContent = e.target.value.length.toString();
            });
        }
        
        // Recalculate button
        const recalculateBtn = document.getElementById('recalculateBtn');
        if (recalculateBtn) {
            recalculateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.calculateTotalAmount();
                this.showSuccess('Prices recalculated!');
            });
        }
        
        // Preview button
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.previewReservation();
            });
        }
    }
    
    setupFilterEvents() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.loadReservations(0), 500);
            });
        }
        
        // Filter dropdowns
        ['statusFilter', 'checkinFilter', 'roomTypeFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => this.loadReservations(0));
            }
        });
        
        // Clear filters button
        const clearBtn = document.getElementById('clearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearFilters();
            });
        }
        
        // Page size selector
        const pageSizeSelect = document.getElementById('pageSizeSelect');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.loadReservations(0);
            });
        }
    }
    
    setupQuickActions() {
        const quickActionsBtn = document.getElementById('quickActionsBtn');
        const quickActionsMenu = document.getElementById('quickActionsMenu');
        
        if (quickActionsBtn && quickActionsMenu) {
            quickActionsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isVisible = !quickActionsMenu.classList.contains('opacity-0');
                
                if (isVisible) {
                    quickActionsMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
                } else {
                    quickActionsMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!quickActionsBtn.contains(e.target) && !quickActionsMenu.contains(e.target)) {
                    quickActionsMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
                }
            });
            
            // Quick action buttons
            const quickActionBtns = quickActionsMenu.querySelectorAll('button');
            quickActionBtns.forEach((btn, index) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    quickActionsMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
                    
                    switch (index) {
                        case 0: // New Reservation
                            this.showAddModal();
                            break;
                        case 1: // Refresh Data
                            this.loadReservations(this.currentPage);
                            break;
                        case 2: // Export Data
                            this.exportReservations();
                            break;
                    }
                });
            });
        }
    }
    
    setupMobileSidebar() {
        const openSidebarBtn = document.getElementById('openSidebar');
        const closeSidebarBtn = document.getElementById('closeSidebar');
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (openSidebarBtn && sidebar && mobileOverlay) {
            openSidebarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.add('mobile-open');
                mobileOverlay.classList.add('active');
            });
        }
        
        [closeSidebarBtn, mobileOverlay].forEach(el => {
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (sidebar) sidebar.classList.remove('mobile-open');
                    if (mobileOverlay) mobileOverlay.classList.remove('active');
                });
            }
        });
    }
    
    setMinimumDates() {
        const today = new Date().toISOString().split('T')[0];
        const checkinDate = document.getElementById('checkinDate');
        const checkoutDate = document.getElementById('checkoutDate');
        
        if (checkinDate) {
            checkinDate.min = today;
        }
        
        if (checkoutDate) {
            checkoutDate.min = today;
        }
    }
    
    updateCheckoutMinDate() {
        const checkinDate = document.getElementById('checkinDate')?.value;
        const checkoutDate = document.getElementById('checkoutDate');
        
        if (checkinDate && checkoutDate) {
            const minCheckout = new Date(checkinDate);
            minCheckout.setDate(minCheckout.getDate() + 1);
            checkoutDate.min = minCheckout.toISOString().split('T')[0];
            
            // Update checkout date if it's before the new minimum
            if (checkoutDate.value && new Date(checkoutDate.value) <= new Date(checkinDate)) {
                checkoutDate.value = minCheckout.toISOString().split('T')[0];
                this.calculateTotalAmount();
            }
        }
    }
    
    async updateAvailableRooms() {
        try {
            const roomTypeId = document.getElementById('roomTypeSelect')?.value;
            const checkinDate = document.getElementById('checkinDate')?.value;
            const checkoutDate = document.getElementById('checkoutDate')?.value;
            
            if (!roomTypeId || !checkinDate || !checkoutDate) {
                this.resetRoomSelect();
                return;
            }
            
            if (new Date(checkoutDate) <= new Date(checkinDate)) {
                this.showError('Check-out date must be after check-in date');
                this.resetRoomSelect();
                return;
            }
            
            // Show loading state
            const roomSelect = document.getElementById('roomSelect');
            if (roomSelect) {
                roomSelect.innerHTML = '<option value="">Loading rooms...</option>';
                roomSelect.disabled = true;
            }
            
            await this.loadAvailableRooms(roomTypeId, checkinDate, checkoutDate);
            
        } catch (error) {
            console.error('Failed to update available rooms:', error);
            this.showError('Failed to load available rooms: ' + error.message);
        }
    }
    
    async loadAvailableRooms(roomTypeId, checkinDate, checkoutDate) {
        try {
            const params = new URLSearchParams({
                room_type_id: roomTypeId,
                checkin_date: checkinDate,
                checkout_date: checkoutDate
            });
            
            if (this.currentEditId) {
                params.append('exclude_reservation', this.currentEditId);
            }
            
            const response = await fetch(`${this.baseURL}/api/admin/pages/available-rooms.php?${params}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Available rooms API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load available rooms');
            }
            
            this.availableRooms = data.rooms || [];
            this.populateRoomSelect();
            
        } catch (error) {
            console.error('Failed to load available rooms:', error);
            this.showError('Failed to load available rooms: ' + error.message);
            this.availableRooms = [];
            this.populateRoomSelect();
        }
    }
    
    populateRoomSelect() {
        const roomSelect = document.getElementById('roomSelect');
        if (!roomSelect) return;
        
        roomSelect.innerHTML = '<option value="">Select Room</option>';
        roomSelect.disabled = false;
        
        if (this.availableRooms.length === 0) {
            roomSelect.innerHTML = '<option value="">No rooms available for selected dates</option>';
            roomSelect.disabled = true;
            return;
        }
        
        this.availableRooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.room_id;
            option.textContent = `Room ${room.room_number} - Floor ${room.floor_number}`;
            roomSelect.appendChild(option);
        });
    }
    
    resetRoomSelect() {
        const roomSelect = document.getElementById('roomSelect');
        if (roomSelect) {
            roomSelect.innerHTML = '<option value="">Select room type and dates first</option>';
            roomSelect.disabled = true;
        }
    }
    
    clearFilters() {
        const elements = [
            { id: 'searchInput', value: '' },
            { id: 'statusFilter', value: '' },
            { id: 'checkinFilter', value: '' },
            { id: 'roomTypeFilter', value: '' }
        ];
        
        elements.forEach(({ id, value }) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        
        this.loadReservations(0);
        this.showSuccess('Filters cleared!');
    }
    
    async showAddModal() {
        try {
            console.log('Opening new reservation modal...');
            
            this.currentEditId = null;
            
            // Update modal title
            document.getElementById('modalTitle').textContent = 'New Reservation';
            document.getElementById('modalSubtitle').textContent = 'Create a new reservation for your guest';
            
            // Reset form
            const form = document.getElementById('reservationForm');
            if (form) form.reset();
            
            document.getElementById('reservationId').value = '';
            
            // Set default dates
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            
            document.getElementById('checkinDate').value = today.toISOString().split('T')[0];
            document.getElementById('checkoutDate').value = tomorrow.toISOString().split('T')[0];
            
            // Reset room selection
            this.resetRoomSelect();
            
            // Reset price display
            this.resetPriceDisplay();
            
            // Hide advance payment fields
            const advanceFields = document.getElementById('advancePaymentFields');
            if (advanceFields) advanceFields.classList.add('hidden');
            
            // Clear payment method selection
            const paymentMethodSelect = document.getElementById('paymentMethodSelect');
            if (paymentMethodSelect) paymentMethodSelect.value = '';
            
            document.getElementById('advanceAmount').value = '';
            document.getElementById('referenceNumber').value = '';
            
            // Populate services and menu items
            this.populateHotelServices();
            this.populateMenuItems();
            
            // Update minimum dates
            this.setMinimumDates();
            this.updateCheckoutMinDate();
            
            this.showModal();
            
            // Focus on first name field
            setTimeout(() => {
                const firstNameField = document.getElementById('firstName');
                if (firstNameField) firstNameField.focus();
            }, 100);
            
        } catch (error) {
            console.error('Failed to show add modal:', error);
            this.showError('Failed to initialize reservation form: ' + error.message);
        }
    }
    
    // Helper method to collect form data
    collectFormData() {
        const formData = {
            // Customer information
            firstName: document.getElementById('firstName')?.value?.trim() || '',
            lastName: document.getElementById('lastName')?.value?.trim() || '',
            email: document.getElementById('email')?.value?.trim() || '',
            phoneNumber: document.getElementById('phoneNumber')?.value?.trim() || '',
            
            // Reservation details
            roomId: document.getElementById('roomSelect')?.value || '',
            checkinDate: document.getElementById('checkinDate')?.value || '',
            checkoutDate: document.getElementById('checkoutDate')?.value || '',
            guestCount: document.getElementById('guestCount')?.value || '1',
            specialRequests: document.getElementById('specialRequests')?.value?.trim() || '',
            
            // Payment information
            paymentMethodId: document.getElementById('paymentMethodSelect')?.value || '',
            advanceAmount: parseFloat(document.getElementById('advanceAmount')?.value || '0'),
            referenceNumber: document.getElementById('referenceNumber')?.value?.trim() || '',
            
            // Selected services and menu items
            selectedServices: [],
            selectedMenuItems: []
        };

        // Collect selected services
        document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
            const serviceId = parseInt(checkbox.value);
            const price = parseFloat(checkbox.getAttribute('data-price') || 0);
            formData.selectedServices.push({
                service_id: serviceId,
                price: price
            });
        });

        // Collect selected menu items
        document.querySelectorAll('.menu-checkbox:checked').forEach(checkbox => {
            const menuId = parseInt(checkbox.value);
            const price = parseFloat(checkbox.getAttribute('data-price') || 0);
            const quantity = parseInt(document.getElementById(`qty_${menuId}`)?.value) || 1;
            formData.selectedMenuItems.push({
                menu_id: menuId,
                quantity: quantity,
                price: price
            });
        });

        // Calculate total amount
        formData.totalAmount = this.calculateTotalAmountValue(formData);

        return formData;
    }

    // Helper method to validate form data
    validateFormData(formData) {
        const errors = [];

        // Required field validation
        if (!formData.firstName) {
            errors.push('First name is required');
        }
        
        if (!formData.lastName) {
            errors.push('Last name is required');
        }
        
        if (!formData.roomId) {
            errors.push('Room selection is required');
        }
        
        if (!formData.checkinDate) {
            errors.push('Check-in date is required');
        }
        
        if (!formData.checkoutDate) {
            errors.push('Check-out date is required');
        }
        
        if (!formData.guestCount || parseInt(formData.guestCount) < 1) {
            errors.push('Guest count must be at least 1');
        }

        // Date validation
        if (formData.checkinDate && formData.checkoutDate) {
            const checkinDate = new Date(formData.checkinDate);
            const checkoutDate = new Date(formData.checkoutDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (checkinDate < today && !this.currentEditId) {
                errors.push('Check-in date cannot be in the past');
            }
            
            if (checkoutDate <= checkinDate) {
                errors.push('Check-out date must be after check-in date');
            }
        }

        // Email validation (if provided)
        if (formData.email && !this.isValidEmail(formData.email)) {
            errors.push('Please enter a valid email address');
        }

        // Advance payment validation
        if (formData.advanceAmount > 0) {
            if (!formData.paymentMethodId) {
                errors.push('Payment method is required when advance payment is provided');
            }
            
            if (formData.advanceAmount > formData.totalAmount) {
                errors.push('Advance payment cannot be greater than total amount');
            }
        }

        // Show errors if any
        if (errors.length > 0) {
            this.showError('Please fix the following errors:\n• ' + errors.join('\n• '));
            return false;
        }

        return true;
    }

    // Helper method to calculate total amount as a number
    calculateTotalAmountValue(formData) {
        const roomTypeId = document.getElementById('roomTypeSelect')?.value;
        if (!roomTypeId || !formData.checkinDate || !formData.checkoutDate) {
            return 0;
        }

        // Calculate room cost
        const roomType = this.roomTypes.find(rt => rt.room_type_id == roomTypeId);
        if (!roomType) return 0;

        const nights = Math.ceil(
            (new Date(formData.checkoutDate) - new Date(formData.checkinDate)) / (1000 * 60 * 60 * 24)
        );

        let total = parseFloat(roomType.price_per_night || 0) * nights;

        // Add services cost
        formData.selectedServices.forEach(service => {
            total += parseFloat(service.price || 0);
        });

        // Add menu items cost
        formData.selectedMenuItems.forEach(item => {
            total += parseFloat(item.price || 0) * parseInt(item.quantity || 1);
        });

        return total;
    }

    // Helper method for email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Save reservation method
async saveReservation() {
    try {
        const saveBtn = document.getElementById('saveReservationBtn');
        const btnText = saveBtn?.querySelector('.btn-text');
        const btnSpinner = saveBtn?.querySelector('.loading-spinner');
        if (saveBtn) {
            saveBtn.disabled = true;
            if (btnText) btnText.textContent = this.currentEditId ? 'Updating...' : 'Saving...';
            if (btnSpinner) btnSpinner.classList.remove('hidden');
        }

        const formData = this.collectFormData();
        if (!this.validateFormData(formData)) {
            if (saveBtn) {
                saveBtn.disabled = false;
                if (btnText) btnText.textContent = this.currentEditId ? 'Update Reservation' : 'Save Reservation';
                if (btnSpinner) btnSpinner.classList.add('hidden');
            }
            return;
        }

        // Always set Walk-In type for front desk
        let reservationTypeId = 1;

        // Get times from form with 12-hour to 24-hour conversion
        const checkinDate = formData.checkinDate;
        const checkoutDate = formData.checkoutDate;
        
        // Default times in 12-hour format
        let checkinTime12 = '3:00 PM';  // Changed from 15:00:00
        let checkoutTime12 = '12:00 PM'; // Changed from 12:00:00
        
        const checkinTimeEl = document.getElementById('checkinTime');
        const checkoutTimeEl = document.getElementById('checkoutTime');
        if (checkinTimeEl && checkinTimeEl.value) checkinTime12 = checkinTimeEl.value;
        if (checkoutTimeEl && checkoutTimeEl.value) checkoutTime12 = checkoutTimeEl.value;

        // Convert to 24-hour format for database storage
        const checkinTime24 = formatTimeTo24Hour(checkinTime12);
        const checkoutTime24 = formatTimeTo24Hour(checkoutTime12);

        const checkin_datetime = (checkinDate && checkinTime24) ? `${checkinDate} ${checkinTime24}` : '';
        const checkout_datetime = (checkoutDate && checkoutTime24) ? `${checkoutDate} ${checkoutTime24}` : '';

        const requestData = {
            // Customer info
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email || null,
            phone_number: formData.phoneNumber || null,
            // Reservation details
            room_id: formData.roomId ? parseInt(formData.roomId) : null,
            room_type_id: document.getElementById('roomTypeSelect')?.value ? parseInt(document.getElementById('roomTypeSelect').value) : null,
            check_in_date: checkinDate,
            check_out_date: checkoutDate,
            checkin_datetime,
            checkout_datetime,
            guest_count: parseInt(formData.guestCount),
            special_requests: formData.specialRequests || null,
            reservation_type_id: reservationTypeId,
            booking_type: "room",
            room_assignment_pending: 0,
            reservation_status_id: 1, // Pending
            // Financial info
            total_amount: formData.totalAmount,
            advance_payment: formData.advanceAmount || 0,
            payment_method_id: formData.paymentMethodId ? parseInt(formData.paymentMethodId) : null,
            reference_number: formData.referenceNumber || null,
            // Services and menu
            services: formData.selectedServices.map(s => s.service_id),
            menu_items: formData.selectedMenuItems.map(item => ({
                id: item.menu_id,
                quantity: item.quantity
            }))
        };

        if (this.currentEditId) {
            requestData.reservation_id = this.currentEditId;
        }

        const url = `${this.baseURL}/api/frontdesk/reservations.php`;
        const response = await fetch(url, {
            method: this.currentEditId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            credentials: 'same-origin',
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to save reservation');
        }

        this.showSuccess(
            this.currentEditId
                ? 'Reservation updated successfully!'
                : `Reservation created successfully! ID: #${result.reservation_id}`
        );

        this.hideModal();
        await this.loadReservations(this.currentPage);

    } catch (error) {
        this.showError('Failed to save reservation: ' + error.message);
    } finally {
        const saveBtn = document.getElementById('saveReservationBtn');
        const btnText = saveBtn?.querySelector('.btn-text');
        const btnSpinner = saveBtn?.querySelector('.loading-spinner');
        if (saveBtn) {
            saveBtn.disabled = false;
            if (btnText) btnText.textContent = this.currentEditId ? 'Update Reservation' : 'Save Reservation';
            if (btnSpinner) btnSpinner.classList.add('hidden');
        }
    }
}

// PATCH editReservation: If booking_type is 'room_type_selection' or room_assignment_pending==1 treat as room type (no room_id required)
// and set checkin_datetime/checkout_datetime if available

async editReservation(reservationId) {
    try {
        const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php?id=${reservationId}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load reservation details');
        }

        const reservation = data.reservation;
        this.currentEditId = reservationId;

        document.getElementById('modalTitle').textContent = `Edit Reservation #${reservationId}`;
        document.getElementById('modalSubtitle').textContent = 'Update reservation details (Type: Walk-In)';
        document.getElementById('reservationId').value = reservationId;
        document.getElementById('firstName').value = reservation.first_name || '';
        document.getElementById('lastName').value = reservation.last_name || '';
        document.getElementById('email').value = reservation.email || '';
        document.getElementById('phoneNumber').value = reservation.phone_number || '';

        let roomTypeId = reservation.room_type_id;
        if (roomTypeId) {
            document.getElementById('roomTypeSelect').value = roomTypeId;
        }

        document.getElementById('checkinDate').value = reservation.check_in_date;
        document.getElementById('checkoutDate').value = reservation.check_out_date;
        document.getElementById('guestCount').value = reservation.guest_count || 1;
        document.getElementById('specialRequests').value = reservation.special_requests || '';

        // Set checkin/checkout time with 12-hour format conversion
        if (document.getElementById('checkinTime') && reservation.checkin_datetime) {
            const time24 = reservation.checkin_datetime.split(' ')[1] || '15:00:00';
            const time12 = formatTimeTo12Hour(time24.substring(0, 5));
            document.getElementById('checkinTime').value = time12;
        }
        if (document.getElementById('checkoutTime') && reservation.checkout_datetime) {
            const time24 = reservation.checkout_datetime.split(' ')[1] || '12:00:00';
            const time12 = formatTimeTo12Hour(time24.substring(0, 5));
            document.getElementById('checkoutTime').value = time12;
        }

        // Load available rooms for this type and dates
        if (roomTypeId) {
            await this.loadAvailableRooms(roomTypeId, reservation.check_in_date, reservation.check_out_date);
            setTimeout(() => {
                document.getElementById('roomSelect').value = reservation.room_id;
            }, 100);
        } else {
            this.resetRoomSelect();
        }

        this.populateHotelServices();
        this.populateMenuItems();

        // Set advance payment information if exists
        if (reservation.advance_payment > 0) {
            document.getElementById('paymentMethodSelect').value = reservation.payment_method_id || '';
            document.getElementById('advanceAmount').value = reservation.advance_payment;
            document.getElementById('referenceNumber').value = reservation.reference_number || '';
            if (reservation.payment_method_id) {
                document.getElementById('advancePaymentFields').classList.remove('hidden');
            }
        }

        this.setMinimumDates();
        this.updateCheckoutMinDate();

        setTimeout(() => {
            this.calculateTotalAmount();
        }, 200);

        this.showModal();

        setTimeout(() => {
            const firstNameField = document.getElementById('firstName');
            if (firstNameField) firstNameField.focus();
        }, 300);

    } catch (error) {
        this.showError('Failed to load reservation details: ' + error.message);
    }
}
    // Helper method to get room type from room ID
    async getRoomTypeFromRoomId(roomId) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/rooms.php?id=${roomId}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.room) {
                return data.room.room_type_id;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get room type:', error);
            return null;
        }
    }
    
    // Update status method
    updateStatus(reservationId, currentStatus) {
        try {
            console.log(`Updating status for reservation ${reservationId}, current: ${currentStatus}`);
            
            this.currentStatusId = reservationId;
            
            // Set current reservation ID
            document.getElementById('statusReservationId').value = reservationId;
            
            // Set appropriate next status options based on current status
            const statusSelect = document.getElementById('newStatus');
            statusSelect.innerHTML = '<option value="">Select Status</option>';
            
            const statusOptions = {
                'Pending': [
                    { value: '2', text: '🔵 Confirmed' },
                    { value: '5', text: '🔴 Cancelled' }
                ],
                'Confirmed': [
                    { value: '3', text: '🟢 Checked-in' },
                    { value: '5', text: '🔴 Cancelled' }
                ],
                'Checked-in': [
                    { value: '4', text: '⚫ Checked-out' }
                ],
                'Checked-out': [],
                'Cancelled': []
            };
            
            const availableStatuses = statusOptions[currentStatus] || [];
            
            if (availableStatuses.length === 0) {
                this.showError('No status updates available for this reservation.');
                return;
            }
            
            availableStatuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status.value;
                option.textContent = status.text;
                statusSelect.appendChild(option);
            });
            
            this.showStatusModal();
            
        } catch (error) {
            console.error('Failed to show status modal:', error);
            this.showError('Failed to initialize status update: ' + error.message);
        }
    }

    // Save status update method
    async saveStatusUpdate() {
        try {
            console.log('Saving status update...');
            
            const saveBtn = document.getElementById('saveStatusBtn');
            const btnText = saveBtn?.querySelector('.btn-text');
            const btnSpinner = saveBtn?.querySelector('.loading-spinner');
            
            if (saveBtn) {
                saveBtn.disabled = true;
                if (btnText) btnText.textContent = 'Updating...';
                if (btnSpinner) btnSpinner.classList.remove('hidden');
            }

            const reservationId = document.getElementById('statusReservationId').value;
            const newStatusId = document.getElementById('newStatus').value;
            
            if (!reservationId || !newStatusId) {
                this.showError('Please select a status');
                return;
            }

            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    reservation_id: parseInt(reservationId),
                    reservation_status_id: parseInt(newStatusId)
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to update status');
            }

            this.showSuccess('Reservation status updated successfully!');
            this.hideStatusModal();
            await this.loadReservations(this.currentPage);

        } catch (error) {
            console.error('Failed to update status:', error);
            this.showError('Failed to update status: ' + error.message);
        } finally {
            // Reset button state
            const saveBtn = document.getElementById('saveStatusBtn');
            const btnText = saveBtn?.querySelector('.btn-text');
            const btnSpinner = saveBtn?.querySelector('.loading-spinner');
            
            if (saveBtn) {
                saveBtn.disabled = false;
                if (btnText) btnText.textContent = 'Update Status';
                if (btnSpinner) btnSpinner.classList.add('hidden');
            }
        }
    }
    
    // Cancel reservation method
    async cancelReservation(reservationId) {
        try {
            if (!confirm('Are you sure you want to cancel this reservation? This action cannot be undone.')) {
                return;
            }

            console.log(`Cancelling reservation ${reservationId}`);

            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    reservation_id: parseInt(reservationId),
                    reservation_status_id: 5 // Cancelled status
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to cancel reservation');
            }

            this.showSuccess('Reservation cancelled successfully!');
            await this.loadReservations(this.currentPage);

        } catch (error) {
            console.error('Failed to cancel reservation:', error);
            this.showError('Failed to cancel reservation: ' + error.message);
        }
    }
    
    // View reservation details method
    async viewReservation(reservationId) {
        try {
            // Validate reservation ID
            if (!reservationId || isNaN(reservationId) || reservationId <= 0) {
                this.showError('Invalid reservation ID');
                return;
            }

            console.log(`Fetching reservation details for ID: ${reservationId}`);

            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php?id=${reservationId}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const responseText = await response.text();
                console.error('Response text:', responseText);
                throw new Error(`Server responded with ${response.status}: ${responseText}`);
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (!data.success) {
                throw new Error(data.error || 'Failed to load reservation details');
            }

            const reservation = data.reservation;
            
            // Create detailed view modal content
            const checkinDate = new Date(reservation.check_in_date).toLocaleDateString();
            const checkoutDate = new Date(reservation.check_out_date).toLocaleDateString();
            
            const detailsContainer = document.getElementById('reservationDetails');
            if (detailsContainer) {
                detailsContainer.innerHTML = this.generateReservationDetailsHTML(reservation, checkinDate, checkoutDate);
                this.showDetailsModal();
            } else {
                // Fallback to alert if modal not found
                this.showReservationDetailsAlert(reservation, checkinDate, checkoutDate);
            }

        } catch (error) {
            console.error('Failed to view reservation:', error);
            
            // Show a more detailed error message
            let errorMessage = 'Failed to load reservation details: ';
            if (error.message.includes('500')) {
                errorMessage += 'Server error occurred. Please check the server logs for more details.';
            } else if (error.message.includes('404')) {
                errorMessage += 'Reservation not found.';
            } else if (error.message.includes('403')) {
                errorMessage += 'Access denied. Please check your permissions.';
            } else {
                errorMessage += error.message;
            }
            
            this.showError(errorMessage);
        }
    }
    
     generateReservationDetailsHTML(reservation, checkinDate, checkoutDate) {
        let checkinTime = '';
        let checkoutTime = '';
        if (reservation.checkin_datetime && reservation.checkin_datetime.includes(' ')) {
            checkinTime = reservation.checkin_datetime.split(' ')[1]?.substring(0, 5) || '';
        }
        if (reservation.checkout_datetime && reservation.checkout_datetime.includes(' ')) {
            checkoutTime = reservation.checkout_datetime.split(' ')[1]?.substring(0, 5) || '';
        }

        let reservationType = reservation.reservation_type_name || '';
        if (!reservationType || reservationType.toLowerCase().includes('front') || reservationType.toLowerCase().includes('walk')) {
            reservationType = 'Walk-In';
        }

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-info-circle mr-2 text-blue-600"></i>
                            Reservation Information
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Reservation ID:</span>
                                <span class="font-medium">#${reservation.reservation_id}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Type:</span>
                                <span class="font-medium">${reservationType}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Status:</span>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClass(reservation.reservation_status)}">${reservation.reservation_status}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Check-in Time:</span>
                                <span class="font-medium">${checkinTime || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Check-out Time:</span>
                                <span class="font-medium">${checkoutTime || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Created:</span>
                                <span class="font-medium">${new Date(reservation.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-user-circle mr-2 text-blue-600"></i>
                            Customer Information
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Name:</span>
                                <span class="font-medium">${reservation.first_name} ${reservation.last_name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Email:</span>
                                <span class="font-medium">${reservation.email || 'Not provided'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Phone:</span>
                                <span class="font-medium">${reservation.phone_number || 'Not provided'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-bed mr-2 text-green-600"></i>
                            Room Information
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Room:</span>
                                <span class="font-medium">${reservation.room_number}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Type:</span>
                                <span class="font-medium">${reservation.type_name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Check-in:</span>
                                <span class="font-medium">${checkinDate}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Check-out:</span>
                                <span class="font-medium">${checkoutDate}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Guests:</span>
                                <span class="font-medium">${reservation.guest_count}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-yellow-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-credit-card mr-2 text-yellow-600"></i>
                            Financial Information
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Total Amount:</span>
                                <span class="font-medium text-lg">₱${parseFloat(reservation.total_amount).toLocaleString()}</span>
                            </div>
                            ${reservation.advance_payment > 0 ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Advance Payment:</span>
                                    <span class="font-medium text-green-600">₱${parseFloat(reservation.advance_payment).toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Remaining Balance:</span>
                                    <span class="font-medium text-orange-600">₱${(parseFloat(reservation.total_amount) - parseFloat(reservation.advance_payment)).toLocaleString()}</span>
                                </div>
                            ` : ''}
                            ${reservation.payment_method ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Payment Method:</span>
                                    <span class="font-medium">${reservation.payment_method}</span>
                                </div>
                            ` : ''}
                            ${reservation.reference_number ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Reference:</span>
                                    <span class="font-medium">${reservation.reference_number}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            ${reservation.special_requests ? `
                <div class="mt-6 bg-purple-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-2 flex items-center">
                        <i class="fas fa-clipboard-list mr-2 text-purple-600"></i>
                        Special Requests
                    </h4>
                    <p class="text-sm text-gray-700">${reservation.special_requests}</p>
                </div>
            ` : ''}
        `;
    }
    
    getStatusBadgeClass(status) {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Confirmed': 'bg-blue-100 text-blue-800',
            'Checked-in': 'bg-green-100 text-green-800',
            'Checked-out': 'bg-gray-100 text-gray-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }
    
    showReservationDetailsAlert(reservation, checkinDate, checkoutDate) {
        let details = `Reservation #${reservation.reservation_id}\n\n`;
        details += `Customer: ${reservation.first_name} ${reservation.last_name}\n`;
        details += `Email: ${reservation.email || 'Not provided'}\n`;
        details += `Phone: ${reservation.phone_number || 'Not provided'}\n`;
        details += `Room: ${reservation.room_number} (${reservation.type_name})\n`;
        details += `Check-in: ${checkinDate}\n`;
        details += `Check-out: ${checkoutDate}\n`;
        details += `Guests: ${reservation.guest_count}\n`;
        details += `Status: ${reservation.reservation_status}\n`;
        details += `Total: ₱${parseFloat(reservation.total_amount).toLocaleString()}\n`;
        
        if (reservation.advance_payment > 0) {
            details += `Advance Payment: ₱${parseFloat(reservation.advance_payment).toLocaleString()}\n`;
        }
        
        if (reservation.special_requests) {
            details += `\nSpecial Requests: ${reservation.special_requests}\n`;
        }
        
        alert(details);
    }
    
    // Preview reservation method
    previewReservation() {
        try {
            const formData = this.collectFormData();
            
            if (!this.validateFormData(formData)) {
                return;
            }
            
            const previewContent = this.generatePreviewHTML(formData);
            
            // Create preview modal
            this.showPreviewModal(previewContent);
            
        } catch (error) {
            console.error('Failed to preview reservation:', error);
            this.showError('Failed to generate preview: ' + error.message);
        }
    }
    
    generatePreviewHTML(formData) {
        const roomType = this.roomTypes.find(rt => rt.room_type_id == document.getElementById('roomTypeSelect')?.value);
        const checkin = new Date(formData.checkinDate);
        const checkout = new Date(formData.checkoutDate);
        const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Customer Information</h4>
                    <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
                    <p><strong>Email:</strong> ${formData.email || 'Not provided'}</p>
                    <p><strong>Phone:</strong> ${formData.phoneNumber || 'Not provided'}</p>
                </div>
                
                <div class="bg-green-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Reservation Details</h4>
                    <p><strong>Room Type:</strong> ${roomType?.type_name || 'Unknown'}</p>
                    <p><strong>Check-in:</strong> ${new Date(formData.checkinDate).toLocaleDateString()}</p>
                    <p><strong>Check-out:</strong> ${new Date(formData.checkoutDate).toLocaleDateString()}</p>
                    <p><strong>Nights:</strong> ${nights}</p>
                    <p><strong>Guests:</strong> ${formData.guestCount}</p>
                    ${formData.specialRequests ? `<p><strong>Special Requests:</strong> ${formData.specialRequests}</p>` : ''}
                </div>
                
                <div class="bg-yellow-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Financial Summary</h4>
                    <p><strong>Total Amount:</strong> ₱${formData.totalAmount.toLocaleString()}</p>
                    ${formData.advanceAmount > 0 ? `
                        <p><strong>Advance Payment:</strong> ₱${formData.advanceAmount.toLocaleString()}</p>
                        <p><strong>Balance:</strong> ₱${(formData.totalAmount - formData.advanceAmount).toLocaleString()}</p>
                    ` : ''}
                </div>
                
                ${formData.selectedServices.length > 0 ? `
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">Selected Services</h4>
                        <ul class="list-disc list-inside">
                            ${formData.selectedServices.map(service => {
                                const serviceData = this.hotelServices.find(s => s.service_id == service.service_id);
                                return `<li>${serviceData?.service_name || 'Unknown Service'} - ₱${service.price.toLocaleString()}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${formData.selectedMenuItems.length > 0 ? `
                    <div class="bg-orange-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">Selected Menu Items</h4>
                        <ul class="list-disc list-inside">
                            ${formData.selectedMenuItems.map(item => {
                                const menuData = this.menuItems.find(m => m.menu_id == item.menu_id);
                                return `<li>${menuData?.item_name || 'Unknown Item'} (Qty: ${item.quantity}) - ₱${(item.price * item.quantity).toLocaleString()}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    showPreviewModal(content) {
        // Create or update preview modal
        let previewModal = document.getElementById('previewModal');
        
        if (!previewModal) {
            previewModal = document.createElement('div');
            previewModal.id = 'previewModal';
            previewModal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 hidden flex items-center justify-center z-50 p-4';
            
            previewModal.innerHTML = `
                <div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xl font-bold text-gray-800 flex items-center">
                                <i class="fas fa-eye mr-2 text-purple-600"></i>
                                Reservation Preview
                            </h3>
                            <button id="closePreviewModal" class="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-6" id="previewContent">
                        <!-- Content will be inserted here -->
                    </div>
                    
                    <div class="border-t p-6 bg-gray-50 rounded-b-lg">
                        <div class="flex justify-end gap-3">
                            <button id="closePreviewBtn" class="px-4 py-2 text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors">
                                Close
                            </button>
                            <button id="proceedSaveBtn" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                                Proceed to Save
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(previewModal);
            
            // Add event listeners
            const closePreviewModal = document.getElementById('closePreviewModal');
            const closePreviewBtn = document.getElementById('closePreviewBtn');
            const proceedSaveBtn = document.getElementById('proceedSaveBtn');
            
            [closePreviewModal, closePreviewBtn].forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => this.hidePreviewModal());
                }
            });
            
            if (proceedSaveBtn) {
                proceedSaveBtn.addEventListener('click', () => {
                    this.hidePreviewModal();
                    this.saveReservation();
                });
            }
            
            previewModal.addEventListener('click', (e) => {
                if (e.target === previewModal) {
                    this.hidePreviewModal();
                }
            });
        }
        
        // Update content
        const previewContentEl = document.getElementById('previewContent');
        if (previewContentEl) {
            previewContentEl.innerHTML = content;
        }
        
        // Show modal
        previewModal.classList.remove('hidden');
        previewModal.classList.add('flex');
    }
    
    hidePreviewModal() {
        const previewModal = document.getElementById('previewModal');
        if (previewModal) {
            previewModal.classList.add('hidden');
            previewModal.classList.remove('flex');
        }
    }
    
    // Modal control methods
    showModal() {
        const modal = document.getElementById('reservationModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }
    
    hideModal() {
        const modal = document.getElementById('reservationModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
        }
        this.currentEditId = null;
        
        // Reset form
        const form = document.getElementById('reservationForm');
        if (form) {
            form.reset();
        }
        
        // Hide advance payment fields
        const advanceFields = document.getElementById('advancePaymentFields');
        if (advanceFields) advanceFields.classList.add('hidden');
        
        // Clear checkboxes
        document.querySelectorAll('.service-checkbox, .menu-checkbox').forEach(cb => {
            cb.checked = false;
        });
        
        // Reset quantity inputs
        document.querySelectorAll('.menu-quantity').forEach(input => {
            input.disabled = true;
            input.value = 1;
        });
        
        // Reset price display
        this.resetPriceDisplay();
    }
    
    showStatusModal() {
        const modal = document.getElementById('statusModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }
    
    hideStatusModal() {
        const modal = document.getElementById('statusModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
        }
        
        // Reset form
        const form = document.getElementById('statusForm');
        if (form) {
            form.reset();
        }
        
        this.currentStatusId = null;
    }
    
    showDetailsModal() {
        const modal = document.getElementById('detailsModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }
    
    hideDetailsModal() {
        const modal = document.getElementById('detailsModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
        }
    }
    
    // Export functionality
    // Replace the existing exportReservations method in your FrontDeskReservations class

async exportReservations() {
    try {
        console.log('Exporting reservations...');
        
        // Show loading state
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Exporting...';
        }
        
        // Build query parameters for export
        const params = new URLSearchParams();
        this.addFiltersToParams(params);
        params.append('export', 'csv');
        
        const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php?${params}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 
                'Cache-Control': 'no-cache',
                'Accept': 'text/csv, application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            // Server returned JSON (possibly an error)
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Export failed');
            }
            
            // If JSON contains data, convert to CSV
            if (data.reservations) {
                this.downloadCSVFromData(data.reservations);
                return;
            }
        }
        
        // Handle CSV response
        const csvContent = await response.text();
        
        // Check if the response is actually CSV
        if (csvContent.trim().length === 0) {
            throw new Error('No data to export');
        }
        
        // Validate and fix CSV format
        const fixedCSV = this.validateAndFixCSV(csvContent);
        
        // Create and download the file
        this.downloadCSVFile(fixedCSV, `reservations_${new Date().toISOString().split('T')[0]}.csv`);
        
        this.showSuccess('Reservations exported successfully!');
        
    } catch (error) {
        console.error('Failed to export reservations:', error);
        
        // Fallback: Export current page data as CSV
        this.showError('Server export failed. Generating CSV from current data...');
        this.downloadCSVFromData(this.reservations);
        
    } finally {
        // Reset export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Export';
        }
    }
}

// New method to validate and fix CSV format
validateAndFixCSV(csvContent) {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
            throw new Error('Empty CSV content');
        }
        
        // Check if first line looks like headers
        const firstLine = lines[0];
        const hasHeaders = firstLine.includes('Reservation ID') || 
                          firstLine.includes('reservation_id') || 
                          firstLine.includes('Customer') ||
                          firstLine.includes('customer_name');
        
        if (!hasHeaders) {
            // Add headers if missing
            const headers = [
                'Reservation ID',
                'Customer Name',
                'Email',
                'Phone',
                'Room Number',
                'Room Type',
                'Check-in Date',
                'Check-out Date',
                'Guests',
                'Total Amount',
                'Advance Payment',
                'Status',
                'Created Date'
            ];
            lines.unshift(headers.join(','));
        }
        
        // Ensure all lines have consistent comma separation
        const fixedLines = lines.map(line => {
            // Handle quoted fields properly
            if (line.includes('"')) {
                return line;
            }
            
            // Fix common CSV issues
            return line.replace(/,+/g, ',') // Remove multiple consecutive commas
                      .replace(/^,|,$/g, ''); // Remove leading/trailing commas
        });
        
        return fixedLines.join('\n');
        
    } catch (error) {
        console.error('CSV validation failed:', error);
        return csvContent; // Return original if validation fails
    }
}

// New method to generate CSV from data array
downloadCSVFromData(reservations) {
    try {
        if (!reservations || reservations.length === 0) {
            this.showError('No reservation data to export');
            return;
        }
        
        // Define CSV headers
        const headers = [
            'Reservation ID',
            'Customer Name', 
            'Email',
            'Phone',
            'Room Number',
            'Room Type',
            'Check-in Date',
            'Check-out Date',
            'Check-in Time',
            'Check-out Time',
            'Guests',
            'Total Amount',
            'Advance Payment',
            'Payment Method',
            'Reference Number',
            'Status',
            'Special Requests',
            'Created Date'
        ];
        
        // Generate CSV rows
        const csvRows = [headers.join(',')];
        
        reservations.forEach(reservation => {
            // Extract times from datetime fields
            let checkinTime = '';
            let checkoutTime = '';
            if (reservation.checkin_datetime && reservation.checkin_datetime.includes(' ')) {
                checkinTime = reservation.checkin_datetime.split(' ')[1]?.substring(0, 8) || '';
            }
            if (reservation.checkout_datetime && reservation.checkout_datetime.includes(' ')) {
                checkoutTime = reservation.checkout_datetime.split(' ')[1]?.substring(0, 8) || '';
            }
            
            const row = [
                `"#${reservation.reservation_id}"`,
                `"${(reservation.customer_name || `${reservation.first_name || ''} ${reservation.last_name || ''}`).trim()}"`,
                `"${reservation.email || 'N/A'}"`,
                `"${reservation.phone_number || 'N/A'}"`,
                `"${reservation.room_number || 'Not Assigned'}"`,
                `"${reservation.room_type_name || reservation.type_name || 'N/A'}"`,
                `"${new Date(reservation.check_in_date).toLocaleDateString()}"`,
                `"${new Date(reservation.check_out_date).toLocaleDateString()}"`,
                `"${checkinTime || 'N/A'}"`,
                `"${checkoutTime || 'N/A'}"`,
                `"${reservation.guest_count || 1}"`,
                `"₱${parseFloat(reservation.total_amount || 0).toLocaleString()}"`,
                `"₱${parseFloat(reservation.advance_payment || 0).toLocaleString()}"`,
                `"${reservation.payment_method || 'N/A'}"`,
                `"${reservation.reference_number || 'N/A'}"`,
                `"${reservation.status_name || reservation.reservation_status || 'N/A'}"`,
                `"${(reservation.special_requests || 'None').replace(/"/g, '""')}"`,
                `"${new Date(reservation.created_at).toLocaleString()}"`
            ];
            
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const filename = `reservations_${new Date().toISOString().split('T')[0]}.csv`;
        
        this.downloadCSVFile(csvContent, filename);
        this.showSuccess(`${reservations.length} reservations exported successfully!`);
        
    } catch (error) {
        console.error('Failed to generate CSV from data:', error);
        this.showError('Failed to generate CSV file: ' + error.message);
    }
}

// New method to handle CSV file download
downloadCSVFile(csvContent, filename) {
    try {
        // Create blob with proper CSV content type and UTF-8 BOM for Excel compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Failed to download CSV file:', error);
        this.showError('Failed to download file: ' + error.message);
    }
}

// Also update the exportReservationLogs method with similar improvements
async exportReservationLogs() {
    try {
        console.log('Exporting reservation logs...');
        
        // Show loading state
        const exportLogsBtn = document.getElementById('exportLogsBtn');
        if (exportLogsBtn) {
            exportLogsBtn.disabled = true;
            exportLogsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Exporting...';
        }
        
        // Build query parameters for export
        const params = new URLSearchParams({
            action: 'export_logs',
            format: 'csv'
        });
        
        // Add current filters
        this.addLogsFiltersToParams(params);
        
        const response = await fetch(`${this.baseURL}/api/frontdesk/reservation_logs.php?${params}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 
                'Cache-Control': 'no-cache',
                'Accept': 'text/csv, application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Logs export failed: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Logs export failed');
            }
            
            if (data.logs) {
                this.downloadLogsCSVFromData(data.logs);
                return;
            }
        }
        
        const csvContent = await response.text();
        
        if (csvContent.trim().length === 0) {
            throw new Error('No logs data to export');
        }
        
        const fixedCSV = this.validateAndFixCSV(csvContent);
        this.downloadCSVFile(fixedCSV, `reservation_logs_${new Date().toISOString().split('T')[0]}.csv`);
        
        this.showSuccess('Reservation logs exported successfully!');
        
    } catch (error) {
        console.error('Failed to export reservation logs:', error);
        
        // Fallback: Export current logs data
        this.showError('Server export failed. Generating CSV from current logs data...');
        this.downloadLogsCSVFromData(this.reservationLogs);
        
    } finally {
        // Reset export button
        const exportLogsBtn = document.getElementById('exportLogsBtn');
        if (exportLogsBtn) {
            exportLogsBtn.disabled = false;
            exportLogsBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Export Logs';
        }
    }
}

// New method to generate logs CSV from data
downloadLogsCSVFromData(logs) {
    try {
        if (!logs || logs.length === 0) {
            this.showError('No logs data to export');
            return;
        }
        
        const headers = [
            'Timestamp',
            'Reservation ID',
            'Customer Name',
            'Action Type',
            'Room Info',
            'User Type',
            'User ID',
            'Notes'
        ];
        
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const row = [
                `"${new Date(log.timestamp).toLocaleString()}"`,
                `"#${log.reservation_id}"`,
                `"${log.customer?.name || 'N/A'}"`,
                `"${log.action_type.replace('_', ' ').toUpperCase()}"`,
                `"${log.room?.room_number ? `Room ${log.room.room_number}` : 'N/A'}"`,
                `"${log.user_type || 'System'}"`,
                `"${log.user_id || 'N/A'}"`,
                `"${(log.notes || 'No notes').replace(/"/g, '""')}"`
            ];
            
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const filename = `reservation_logs_${new Date().toISOString().split('T')[0]}.csv`;
        
        this.downloadCSVFile(csvContent, filename);
        this.showSuccess(`${logs.length} log entries exported successfully!`);
        
    } catch (error) {
        console.error('Failed to generate logs CSV:', error);
        this.showError('Failed to generate logs CSV: ' + error.message);
    }
}
    
    // Print functionality
    printReservations() {
        try {
            console.log('Printing reservations...');
            
            const printWindow = window.open('', '_blank');
            const reservationsHtml = this.generatePrintableReservations();
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reservations Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .filters { margin-bottom: 20px; font-size: 12px; color: #666; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Reservations Report</h1>
                        <p>Generated on ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="filters">
                        <strong>Applied Filters:</strong> 
                        ${this.getCurrentFiltersText()}
                    </div>
                    ${reservationsHtml}
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.print();
            
            this.showSuccess('Print dialog opened!');
            
        } catch (error) {
            console.error('Failed to print reservations:', error);
            this.showError('Failed to print reservations: ' + error.message);
        }
    }
    
    generatePrintableReservations() {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Reservation ID</th>
                        <th>Customer</th>
                        <th>Room</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.reservations.forEach(reservation => {
            const checkinDate = new Date(reservation.check_in_date).toLocaleDateString();
            const checkoutDate = new Date(reservation.check_out_date).toLocaleDateString();
            
            html += `
                <tr>
                    <td>#${reservation.reservation_id}</td>
                    <td>${reservation.customer_name || `${reservation.first_name} ${reservation.last_name}`}</td>
                    <td>Room ${reservation.room_number} (${reservation.room_type_name || reservation.type_name})</td>
                    <td>${checkinDate}</td>
                    <td>${checkoutDate}</td>
                    <td>₱${parseFloat(reservation.total_amount || 0).toLocaleString()}</td>
                    <td>${reservation.status_name}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        return html;
    }
    
    getCurrentFiltersText() {
        const filters = [];
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput?.value?.trim()) {
            filters.push(`Search: "${searchInput.value.trim()}"`);
        }
        
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter?.value) {
            const statusText = statusFilter.options[statusFilter.selectedIndex].text;
            filters.push(`Status: ${statusText}`);
        }
        
        const checkinFilter = document.getElementById('checkinFilter');
        if (checkinFilter?.value) {
            filters.push(`Check-in Date: ${checkinFilter.value}`);
        }
        
        const roomTypeFilter = document.getElementById('roomTypeFilter');
        if (roomTypeFilter?.value) {
            const roomTypeText = roomTypeFilter.options[roomTypeFilter.selectedIndex].text;
            filters.push(`Room Type: ${roomTypeText}`);
        }
        
        return filters.length > 0 ? filters.join(', ') : 'None';
    }
    
    // Logout handler
    async handleLogout() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/logout.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin'
            });
            
            window.location.href = `${this.baseURL}/html/auth/login.html`;
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = `${this.baseURL}/html/auth/login.html`;
        }
    }
    
    // Notification system
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        // Remove any existing notifications first
        const existing = document.querySelectorAll('.notification');
        existing.forEach(el => el.remove());
        
        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };
        
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-exclamation-circle'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded-lg shadow-lg z-50 max-w-md border-l-4 border flex items-start notification-enter`;
        notification.innerHTML = `
            <i class="${icons[type]} mr-3 mt-0.5 flex-shrink-0"></i>
            <div class="flex-1">
                <span class="text-sm">${message}</span>
            </div>
            <button onclick="this.parentElement.remove()" class="ml-3 text-lg hover:opacity-70 flex-shrink-0">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('notification-exit');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                if (!document.getElementById('reservationModal')?.classList.contains('hidden')) {
                    this.hideModal();
                }
                if (!document.getElementById('statusModal')?.classList.contains('hidden')) {
                    this.hideStatusModal();
                }
                if (!document.getElementById('detailsModal')?.classList.contains('hidden')) {
                    this.hideDetailsModal();
                }
                if (!document.getElementById('previewModal')?.classList.contains('hidden')) {
                    this.hidePreviewModal();
                }
            }
            
            // Ctrl/Cmd + N for new reservation
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showAddModal();
            }
            
            // Ctrl/Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Ctrl/Cmd + R to refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.loadReservations(this.currentPage);
                this.showSuccess('Data refreshed!');
            }
        });
    }
    
    // Room assignment for room type bookings
    async assignRoomToReservation(reservationId, roomId) {
        try {
            console.log('Assigning room', roomId, 'to reservation', reservationId);
            
            const response = await fetch(`${this.baseURL}/api/frontdesk/reservations.php`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    reservation_id: parseInt(reservationId),
                    room_id: parseInt(roomId),
                    action: 'assign_room'
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Room assignment response:', errorText);
                throw new Error(`Room assignment failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to assign room');
            }
            
            this.showSuccess('Room assigned successfully!');
            
            // Refresh reservations first (required)
            await this.loadReservations(this.currentPage);
            
            // Try to refresh logs (optional - don't fail if it doesn't work)
            try {
                await this.loadReservationLogs(this.logsCurrentPage);
            } catch (error) {
                console.warn('Failed to refresh logs after room assignment:', error);
                // Don't show error to user since room assignment was successful
            }
            
        } catch (error) {
            console.error('Failed to assign room:', error);
            this.showError('Failed to assign room: ' + error.message);
            throw error; // Re-throw to be handled by caller
        }
    }
    
    // Show room assignment modal
showRoomAssignmentModal(reservationId, roomTypeId) {
    console.log('Showing room assignment modal for reservation:', reservationId, 'room type:', roomTypeId);
    const modal = document.getElementById('roomAssignmentModal');
    if (!modal) {
        this.showError('Room assignment modal not found');
        return;
    }

    // Store reservation ID for assignment
    modal.dataset.reservationId = reservationId;
    modal.dataset.roomTypeId = roomTypeId;

    // Use the same modal system as other modals
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    console.log('Modal shown, loading available rooms...');
    
    // Load available rooms of this type
    this.loadAvailableRoomsForAssignment(roomTypeId);
}
    
    // Load available rooms for assignment
async loadAvailableRoomsForAssignment(roomTypeId) {
    try {
        console.log('Loading available rooms for assignment, room type:', roomTypeId);
        
        // First try to get available rooms based on room type and status
        let response = await fetch(`${this.baseURL}/api/admin/pages/rooms.php?type=${roomTypeId}&status=1`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Fallback: try to get all rooms of this type
            console.warn('First attempt failed, trying fallback approach...');
            response = await fetch(`${this.baseURL}/api/admin/pages/rooms.php?type=${roomTypeId}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                }
            });
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Available rooms API response:', errorText);
            throw new Error(`Failed to load rooms: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load rooms');
        }
        
        console.log('All rooms from API:', result.rooms);
        
        let availableRooms = result.rooms || [];
        
        // Filter for available rooms (status 1 = available)
        if (availableRooms.length > 0) {
            const filteredRooms = availableRooms.filter(room => 
                room.room_status_id == 1 || room.status_name === 'Available'
            );
            
            // Use filtered rooms if we found any, otherwise use all rooms
            availableRooms = filteredRooms.length > 0 ? filteredRooms : availableRooms;
        }
        
        console.log('Available rooms for assignment:', availableRooms);
        this.populateRoomAssignmentSelect(availableRooms);
        
    } catch (error) {
        console.error('Failed to load available rooms for assignment:', error);
        
        const select = document.getElementById('roomAssignmentSelect');
        if (select) {
            select.innerHTML = '<option value="">Error loading rooms - Please contact support</option>';
            select.disabled = true;
        }
        this.showError('Failed to load available rooms: ' + error.message);
    }
}
    
    // Populate room assignment select
    populateRoomAssignmentSelect(rooms) {
        console.log('Populating room assignment select with rooms:', rooms);
        
        const select = document.getElementById('roomAssignmentSelect');
        if (!select) {
            console.error('Room assignment select element not found!');
            return;
        }
        
        select.innerHTML = '<option value="">Select a room</option>';
        
        if (!rooms || rooms.length === 0) {
            select.innerHTML = '<option value="">No available rooms of this type</option>';
            select.disabled = true;
            console.warn('No rooms provided to populate select');
            return;
        }
        
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.room_id;
            option.textContent = `Room ${room.room_number} - Floor ${room.floor_number}`;
            select.appendChild(option);
        });
        
        console.log('Room assignment select populated with', rooms.length, 'rooms');
        console.log('Select element:', select);
    }
    
    // Hide room assignment modal
hideRoomAssignmentModal() {
    console.log('Hiding room assignment modal');
    const modal = document.getElementById('roomAssignmentModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
        
        // Reset the form
        const select = document.getElementById('roomAssignmentSelect');
        if (select) {
            select.innerHTML = '<option value="">Loading available rooms...</option>';
            select.disabled = false;
        }
        
        // Clear stored data
        delete modal.dataset.reservationId;
        delete modal.dataset.roomTypeId;
    }
}
    
    // Save room assignment
    async saveRoomAssignment() {
        console.log('saveRoomAssignment method called');
        
        const modal = document.getElementById('roomAssignmentModal');
        const select = document.getElementById('roomAssignmentSelect');
        const saveBtn = document.getElementById('saveRoomAssignmentBtn');
        const btnText = saveBtn?.querySelector('.btn-text');
        const spinner = saveBtn?.querySelector('.loading-spinner');
        
        console.log('Room assignment elements:', { modal, select, saveBtn });
        
        if (!modal || !select || !saveBtn) {
            this.showError('Room assignment form elements not found');
            return;
        }
        
        const roomId = select.value;
        const reservationId = modal.dataset.reservationId;
        
        if (!roomId) {
            this.showError('Please select a room to assign');
            return;
        }
        
        if (!reservationId) {
            this.showError('Reservation ID not found');
            return;
        }
        
        try {
            // Show loading state
            if (btnText) btnText.style.display = 'none';
            if (spinner) spinner.classList.remove('hidden');
            saveBtn.disabled = true;
            
            console.log('Assigning room', roomId, 'to reservation', reservationId);
            
            // Assign room
            await this.assignRoomToReservation(reservationId, roomId);
            
            // Hide modal
            this.hideRoomAssignmentModal();
            
        } catch (error) {
            console.error('Failed to save room assignment:', error);
            this.showError('Failed to save room assignment: ' + error.message);
        } finally {
            // Reset button state
            if (btnText) btnText.style.display = 'inline';
            if (spinner) spinner.classList.add('hidden');
            saveBtn.disabled = false;
        }
    }
    
    setupLogsEventListeners() {
        // Refresh logs button
        const refreshLogsBtn = document.getElementById('refreshLogsBtn');
        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logsUserRequested = true;
                this.loadReservationLogs(this.logsCurrentPage);
            });
        }
        
        // Export logs button
        const exportLogsBtn = document.getElementById('exportLogsBtn');
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportReservationLogs();
            });
        }
        
        // Logs filter toggle button
        const logsFilterBtn = document.getElementById('logsFilterBtn');
        if (logsFilterBtn) {
            logsFilterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleLogsFilter();
            });
        }
        
        // Apply logs filter button
        const applyLogsFilter = document.getElementById('applyLogsFilter');
        if (applyLogsFilter) {
            applyLogsFilter.addEventListener('click', (e) => {
                e.preventDefault();
                this.logsUserRequested = true;
                this.loadReservationLogs(0);
            });
        }
        
        // Clear logs filter button
        const clearLogsFilter = document.getElementById('clearLogsFilter');
        if (clearLogsFilter) {
            clearLogsFilter.addEventListener('click', (e) => {
                e.preventDefault();
                this.logsUserRequested = true;
                this.clearLogsFilters();
            });
        }
        
        // Logs page size selector
        const logsPageSizeSelect = document.getElementById('logsPageSizeSelect');
        if (logsPageSizeSelect) {
            logsPageSizeSelect.addEventListener('change', (e) => {
                this.logsPageSize = parseInt(e.target.value);
                this.logsUserRequested = true;
                this.loadReservationLogs(0);
            });
        }
    }
    
    toggleLogsFilter() {
        const filterSection = document.getElementById('logsFilterSection');
        if (filterSection) {
            const isHidden = filterSection.classList.contains('hidden');
            filterSection.classList.toggle('hidden', !isHidden);
            
            // Set default dates if showing filters
            if (!isHidden) {
                const today = new Date();
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(today.getDate() - 30);
                
                const dateFrom = document.getElementById('logsDateFrom');
                const dateTo = document.getElementById('logsDateTo');
                
                if (dateFrom) dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0];
                if (dateTo) dateTo.value = today.toISOString().split('T')[0];
            }
        }
    }
    
    clearLogsFilters() {
        const elements = [
            { id: 'logsActionFilter', value: '' },
            { id: 'logsDateFrom', value: '' },
            { id: 'logsDateTo', value: '' }
        ];
        
        elements.forEach(({ id, value }) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        
        this.loadReservationLogs(0);
        this.showSuccess('Logs filters cleared!');
    }
    
    async exportReservationLogs() {
        try {
            console.log('Exporting reservation logs...');
            
            // Build query parameters for export
            const params = new URLSearchParams({
                action: 'export_logs',
                format: 'csv'
            });
            
            // Add current filters
            this.addLogsFiltersToParams(params);
            
            // Create download link
            const url = `${this.baseURL}/api/frontdesk/reservation_logs.php?${params}`;
            const link = document.createElement('a');
            link.href = url;
            link.download = `reservation_logs_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Reservation logs export started. Check your downloads folder.');
            
        } catch (error) {
            console.error('Failed to export reservation logs:', error);
            this.showError('Failed to export reservation logs: ' + error.message);
        }
    }
    
    hideLogsSection() {
        // Find the logs section by looking for the heading text
        const logsHeading = Array.from(document.querySelectorAll('h3')).find(h3 => 
            h3.textContent.includes('Reservation Activity Logs')
        );
        
        if (logsHeading) {
            const logsSection = logsHeading.closest('.card-hover');
            if (logsSection) {
                logsSection.style.display = 'none';
                console.log('Logs section hidden successfully');
            }
        } else {
            console.warn('Could not find logs section to hide');
        }
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slide-out {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-enter {
        animation: slide-in 0.3s ease-out forwards;
    }
    
    .notification-exit {
        animation: slide-out 0.3s ease-in forwards;
    }
    
    .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Enhanced modal transitions */
    .modal {
        transition: opacity 0.25s ease;
    }
    
    #reservationModal, #statusModal, #detailsModal {
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
    }
    
    #reservationModal.show, #statusModal.show, #detailsModal.show {
        opacity: 1;
        pointer-events: auto;
    }
        /* Room assignment modal styles - ADD THIS */
    #roomAssignmentModal {
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
    }
    
    #roomAssignmentModal.show {
        opacity: 1;
        pointer-events: auto;
    }
`;
document.head.appendChild(style);

// Initialize reservations manager when DOM is loaded
let reservationsManager;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing reservations manager...');
    
    reservationsManager = new FrontDeskReservations();
    
    // Make manager available globally for button click handlers
    window.reservationsManager = reservationsManager;
    
    // Initialize the manager
    reservationsManager.init().catch(error => {
        console.error('Failed to initialize reservations manager:', error);
    });
});

// Fallback for older browsers or if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // Still loading, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', initializeManager);
} else {
    // Already loaded
    setTimeout(initializeManager, 100);
}

function initializeManager() {
    if (!window.reservationsManager) {
        console.log('Fallback initialization...');
        reservationsManager = new FrontDeskReservations();
        window.reservationsManager = reservationsManager;
        reservationsManager.init().catch(error => {
            console.error('Failed to initialize reservations manager:', error);
        });
    }
}