// js/admin/rooms.js - Enhanced Rooms Management with Amenities and Images
class EnhancedRoomsManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.rooms = [];
        this.roomTypes = [];
        this.amenities = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentLimit = 50;
        this.currentFilters = {};
        this.currentEditId = null;
        this.searchTimeout = null;
        this.displayMode = 'grid'; // grid, list, table
        
        // Default images for different room types
        this.defaultImages = {
            room: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop&crop=center',
            deluxe: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop&crop=center',
            suite: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop&crop=center',
            standard: 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=400&h=300&fit=crop&crop=center',
            single: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&h=300&fit=crop&crop=center',
            double: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=300&fit=crop&crop=center',
            family: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&crop=center'
        };
        
        this.init();
    }
    
    // Get appropriate image for room type
    getRoomImage(room) {
        // If room has a custom image_url, use it
        if (room.image_url) {
            return room.image_url;
        }
        
        // Match room type to default image
        const typeName = room.type_name ? room.type_name.toLowerCase() : '';
        
        // Try to find matching image key
        const imageKey = Object.keys(this.defaultImages).find(key => 
            typeName.includes(key)
        );
        
        // Return matching image or fallback to generic room image
        return this.defaultImages[imageKey] || this.defaultImages.room;
    }
    
    async init() {
        try {
            // Check authentication
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Load room types and amenities
            await Promise.all([
                this.loadRoomTypes(),
                this.loadAmenities()
            ]);
            
            // Load rooms with pagination
            await this.loadRooms();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Enhanced rooms manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize rooms manager:', error);
            this.showError('Failed to initialize rooms manager: ' + error.message);
        }
    }
    
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/check.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Authentication check failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.authenticated) {
                window.location.href = `${this.baseURL}/pages/auth/login.html`;
                return false;
            }
            
            // Update admin name
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl && result.user) {
                const userName = result.user.name || `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim() || 'Admin User';
                adminNameEl.textContent = userName;
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
            const response = await fetch(`${this.baseURL}/api/admin/pages/room-types.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load room types: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load room types');
            }
            
            this.roomTypes = data.roomTypes || [];
            this.populateRoomTypeSelects();
            
        } catch (error) {
            console.error('Failed to load room types:', error);
            this.showError('Failed to load room types: ' + error.message);
        }
    }
    
    async loadAmenities() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/amenities.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load amenities: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load amenities');
            }
            
            this.amenities = data.amenities || [];
            this.populateAmenitiesContainer();
            
        } catch (error) {
            console.error('Failed to load amenities:', error);
            this.showError('Failed to load amenities: ' + error.message);
        }
    }
    
    populateRoomTypeSelects() {
        const selects = ['roomType', 'typeFilter', 'bulkRoomType'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Clear existing options (except first for filters)
                const firstOption = select.querySelector('option');
                select.innerHTML = '';
                if (selectId.includes('Filter') && firstOption) {
                    select.appendChild(firstOption);
                } else if (selectId !== 'bulkRoomType') {
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Select Room Type';
                    select.appendChild(defaultOption);
                }
                
                this.roomTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.room_type_id;
                    option.textContent = `${type.type_name} - ₱${parseFloat(type.price_per_night).toLocaleString()}`;
                    select.appendChild(option);
                });
            }
        });
    }
    
    populateAmenitiesContainer() {
        const container = document.getElementById('amenitiesContainer');
        if (!container) return;
        
        if (this.amenities.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-gray-500">No amenities available</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${this.amenities.map(amenity => `
                    <div class="amenity-checkbox flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" 
                               id="amenity_${amenity.amenity_id}" 
                               value="${amenity.amenity_id}"
                               class="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <label for="amenity_${amenity.amenity_id}" class="flex items-center cursor-pointer flex-1">
                            <i class="${amenity.icon || 'fas fa-star'} text-blue-600 mr-2 w-4"></i>
                            <span class="text-sm font-medium text-gray-700">${amenity.amenity_name}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add click handlers to labels
        container.querySelectorAll('.amenity-checkbox').forEach(div => {
            div.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = div.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                    }
                }
            });
        });
    }
    
    async loadRooms(page = 1, resetPage = false) {
        try {
            if (resetPage) {
                page = 1;
                this.currentPage = 1;
            }
            
            // Build query parameters
            const params = new URLSearchParams({
                page: page,
                limit: this.currentLimit
            });
            
            // Add filters
            if (this.currentFilters.search) {
                params.append('search', this.currentFilters.search);
            }
            if (this.currentFilters.status) {
                params.append('status', this.currentFilters.status);
            }
            if (this.currentFilters.type) {
                params.append('type', this.currentFilters.type);
            }
            if (this.currentFilters.floor) {
                params.append('floor', this.currentFilters.floor);
            }
            
            const response = await fetch(
                `${this.baseURL}/api/admin/pages/rooms.php?${params.toString()}`,
                {
                    credentials: "same-origin",
                    headers: { "Cache-Control": "no-cache" },
                }
            );
            
            if (!response.ok) {
                throw new Error(`Failed to load rooms: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load rooms');
            }
            
            this.rooms = data.rooms || [];
            this.currentPage = data.pagination.current_page;
            this.totalPages = data.pagination.total_pages;
            
            this.renderRooms();
            this.updatePagination(data.pagination);
            this.updateStats();
            
        } catch (error) {
            console.error('Failed to load rooms:', error);
            this.showError('Failed to load rooms: ' + error.message);
            this.renderEmptyState();
        }
    }
    
    setDisplayMode(mode) {
        this.displayMode = mode;
        
        // Update active display mode button
        document.querySelectorAll('.display-mode-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-600');
        });
        
        const activeBtn = document.getElementById(`${mode}ModeBtn`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-gray-200', 'text-gray-600');
            activeBtn.classList.add('bg-blue-600', 'text-white');
        }
        
        this.renderRooms();
    }
    
    renderRooms() {
        const container = document.getElementById('roomsContainer');
        if (!container) return;
        
        if (this.rooms.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        switch (this.displayMode) {
            case 'grid':
                container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
                container.innerHTML = this.rooms.map(room => this.createRoomCard(room)).join('');
                break;
            case 'list':
                container.className = 'space-y-4';
                container.innerHTML = this.rooms.map(room => this.createRoomListItem(room)).join('');
                break;
            case 'table':
                container.className = 'overflow-x-auto';
                container.innerHTML = this.createRoomTable();
                break;
        }
        
        // Add fade-in animation
        container.classList.add('fade-in');
        setTimeout(() => container.classList.remove('fade-in'), 300);
    }
    
    createRoomCard(room) {
        const statusColors = {
            'Available': 'bg-green-100 text-green-800 border-green-200',
            'Occupied': 'bg-red-100 text-red-800 border-red-200',
            'Reserved': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Out of Order': 'bg-gray-100 text-gray-800 border-gray-200',
            'Under Maintenance': 'bg-orange-100 text-orange-800 border-orange-200'
        };
        
        const statusClass = statusColors[room.status_name] || 'bg-gray-100 text-gray-800 border-gray-200';
        const roomImage = this.getRoomImage(room);
        
        // Create amenities display
        const amenitiesHtml = room.amenities && room.amenities.length > 0 
            ? `<div class="mt-3 pt-3 border-t border-gray-100">
                 <div class="flex flex-wrap gap-1">
                   ${room.amenities.slice(0, 4).map(amenity => `
                     <span class="amenity-tag inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                       <i class="${amenity.icon || 'fas fa-star'} mr-1"></i>
                       ${amenity.amenity_name}
                     </span>
                   `).join('')}
                   ${room.amenities.length > 4 ? `<span class="amenity-tag inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-full">+${room.amenities.length - 4} more</span>` : ''}
                 </div>
               </div>`
            : '<div class="mt-3 pt-3 border-t border-gray-100"><span class="text-xs text-gray-400">No amenities listed</span></div>';
        
        return `
            <div class="room-card bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <!-- Room Image -->
                <div class="relative h-48 bg-gray-200 overflow-hidden">
                    <img src="${roomImage}" 
                         alt="Room ${room.room_number}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='${this.defaultImages.room}'; this.onerror=null;">
                    <div class="absolute top-3 left-3">
                        <span class="inline-block px-3 py-1 text-xs font-medium border rounded-full ${statusClass}">
                            ${room.status_name}
                        </span>
                    </div>
                    <div class="absolute top-3 right-3 flex space-x-2">
                        <button onclick="enhancedRoomsManager.editRoom(${room.room_id})" 
                                class="bg-white bg-opacity-90 text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-full shadow-md transition-colors" 
                                title="Edit Room">
                            <i class="fas fa-edit text-sm"></i>
                        </button>
                        <button onclick="enhancedRoomsManager.deleteRoom(${room.room_id})" 
                                class="bg-white bg-opacity-90 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-full shadow-md transition-colors" 
                                title="Delete Room">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Room Details -->
                <div class="p-4">
                    <div class="mb-3">
                        <h3 class="text-lg font-bold text-gray-800">Room ${room.room_number}</h3>
                        <p class="text-sm text-gray-500">Floor ${room.floor_number}</p>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Type:</span>
                            <span class="text-sm font-medium text-gray-800">${room.type_name}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Capacity:</span>
                            <div class="flex items-center">
                                <i class="fas fa-users text-gray-400 mr-1 text-xs"></i>
                                <span class="text-sm">${room.capacity} guests</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Price:</span>
                            <span class="text-sm font-bold text-green-600">₱${parseFloat(room.price_per_night).toLocaleString()}/night</span>
                        </div>
                    </div>
                    
                    ${amenitiesHtml}
                    
                    ${room.status_name === 'Under Maintenance' || room.status_name === 'Out of Order' ? 
                        `<div class="mt-4 pt-3 border-t border-gray-100">
                            <button onclick="enhancedRoomsManager.updateRoomStatus(${room.room_id}, 1)" 
                                    class="w-full bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                                <i class="fas fa-check mr-2"></i>Mark Available
                            </button>
                        </div>` : ''
                    }
                </div>
            </div>
        `;
    }
    
    createRoomListItem(room) {
        const statusColors = {
            'Available': 'bg-green-100 text-green-800 border-green-200',
            'Occupied': 'bg-red-100 text-red-800 border-red-200',
            'Reserved': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Out of Order': 'bg-gray-100 text-gray-800 border-gray-200',
            'Under Maintenance': 'bg-orange-100 text-orange-800 border-orange-200'
        };
        
        const statusClass = statusColors[room.status_name] || 'bg-gray-100 text-gray-800 border-gray-200';
        const roomImage = this.getRoomImage(room);
        
        const amenitiesDisplay = room.amenities && room.amenities.length > 0 
            ? room.amenities.slice(0, 5).map(amenity => amenity.amenity_name).join(', ') + (room.amenities.length > 5 ? '...' : '')
            : 'No amenities listed';
        
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                <div class="flex items-center space-x-4">
                    <!-- Room Image -->
                    <div class="flex-shrink-0">
                        <img src="${roomImage}" 
                             alt="Room ${room.room_number}" 
                             class="w-16 h-16 rounded-lg object-cover border"
                             onerror="this.src='${this.defaultImages.room}'; this.onerror=null;">
                    </div>
                    
                    <!-- Room Info -->
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-semibold text-gray-800">Room ${room.room_number}</h3>
                        <p class="text-sm text-gray-500">Floor ${room.floor_number} • ${room.type_name}</p>
                        <p class="text-xs text-gray-400 mt-1 truncate">${amenitiesDisplay}</p>
                    </div>
                    
                    <!-- Room Stats -->
                    <div class="hidden sm:flex items-center space-x-6">
                        <div class="text-center">
                            <div class="text-sm font-medium text-gray-900 flex items-center">
                                <i class="fas fa-users text-gray-400 mr-1 text-xs"></i>
                                ${room.capacity}
                            </div>
                            <div class="text-xs text-gray-500">Guests</div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm font-medium text-green-600">₱${parseFloat(room.price_per_night).toLocaleString()}</div>
                            <div class="text-xs text-gray-500">Per Night</div>
                        </div>
                        <div>
                            <span class="inline-block px-3 py-1 text-xs font-medium border rounded-full ${statusClass}">
                                ${room.status_name}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex items-center space-x-2">
                        ${room.status_name === 'Under Maintenance' || room.status_name === 'Out of Order' ? 
                            `<button onclick="enhancedRoomsManager.updateRoomStatus(${room.room_id}, 1)" 
                                    class="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                                Available
                            </button>` : ''
                        }
                        <button onclick="enhancedRoomsManager.editRoom(${room.room_id})" 
                                class="text-blue-600 hover:text-blue-800 p-2" title="Edit Room">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="enhancedRoomsManager.deleteRoom(${room.room_id})" 
                                class="text-red-600 hover:text-red-800 p-2" title="Delete Room">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    createRoomTable() {
        const statusColors = {
            'Available': 'bg-green-100 text-green-800',
            'Occupied': 'bg-red-100 text-red-800',
            'Reserved': 'bg-yellow-100 text-yellow-800',
            'Out of Order': 'bg-gray-100 text-gray-800',
            'Under Maintenance': 'bg-orange-100 text-orange-800'
        };
        
        return `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amenities</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${this.rooms.map(room => {
                        const statusClass = statusColors[room.status_name] || 'bg-gray-100 text-gray-800';
                        const amenitiesCount = room.amenities ? room.amenities.length : 0;
                        const roomImage = this.getRoomImage(room);
                        
                        return `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <img src="${roomImage}" 
                                             alt="Room ${room.room_number}" 
                                             class="w-10 h-10 rounded-lg object-cover border mr-3"
                                             onerror="this.src='${this.defaultImages.room}'; this.onerror=null;">
                                        <div>
                                            <div class="text-sm font-medium text-gray-900">Room ${room.room_number}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">${room.type_name}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">${room.floor_number}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900 flex items-center">
                                        <i class="fas fa-users text-gray-400 mr-1 text-xs"></i>
                                        ${room.capacity} guests
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-green-600">₱${parseFloat(room.price_per_night).toLocaleString()}</div>
                                    <div class="text-xs text-gray-500">per night</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                                        ${room.status_name}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">${amenitiesCount} amenities</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div class="flex items-center space-x-2">
                                        ${room.status_name === 'Under Maintenance' || room.status_name === 'Out of Order' ? 
                                            `<button onclick="enhancedRoomsManager.updateRoomStatus(${room.room_id}, 1)" 
                                                    class="text-green-600 hover:text-green-900" title="Mark Available">
                                                <i class="fas fa-check"></i>
                                            </button>` : ''
                                        }
                                        <button onclick="enhancedRoomsManager.editRoom(${room.room_id})" 
                                                class="text-blue-600 hover:text-blue-900" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="enhancedRoomsManager.deleteRoom(${room.room_id})" 
                                                class="text-red-600 hover:text-red-900" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
    
    renderEmptyState() {
        const container = document.getElementById('roomsContainer');
        if (container) {
            container.className = 'col-span-full';
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-bed text-gray-300 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg mb-2">No rooms found</p>
                    <p class="text-gray-400 text-sm mb-4">Try adjusting your search filters or add new rooms</p>
                    <button onclick="enhancedRoomsManager.showAddModal()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Add Room
                    </button>
                </div>
            `;
        }
    }
    
    updatePagination(pagination) {
        // Update page info
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Page ${pagination.current_page} of ${pagination.total_pages}`;
        }
        
        // Update showing range
        const showingRange = document.getElementById('showingRange');
        if (showingRange) {
            const start = ((pagination.current_page - 1) * pagination.per_page) + 1;
            const end = Math.min(start + pagination.per_page - 1, pagination.total_items);
            showingRange.textContent = `${start}-${end} of ${pagination.total_items}`;
        }
        
        // Update pagination buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) {
            prevBtn.disabled = pagination.current_page <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = !pagination.has_more;
        }
    }
    
    updateStats() {
        const stats = {
            available: 0,
            occupied: 0,
            reserved: 0,
            maintenance: 0,
            total: this.rooms.length
        };
        
        this.rooms.forEach(room => {
            switch (room.status_name) {
                case 'Available':
                    stats.available++;
                    break;
                case 'Occupied':
                    stats.occupied++;
                    break;
                case 'Reserved':
                    stats.reserved++;
                    break;
                case 'Under Maintenance':
                case 'Out of Order':
                    stats.maintenance++;
                    break;
            }
        });
        
        // Update DOM elements safely
        const elements = [
            { id: 'availableCount', value: stats.available },
            { id: 'occupiedCount', value: stats.occupied },
            { id: 'reservedCount', value: stats.reserved },
            { id: 'maintenanceCount', value: stats.maintenance },
            { id: 'totalCount', value: stats.total }
        ];
        
        elements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    setupEventListeners() {
        // Display mode buttons
        const gridModeBtn = document.getElementById('gridModeBtn');
        const listModeBtn = document.getElementById('listModeBtn');
        const tableModeBtn = document.getElementById('tableModeBtn');
        
        if (gridModeBtn) {
            gridModeBtn.addEventListener('click', () => this.setDisplayMode('grid'));
        }
        if (listModeBtn) {
            listModeBtn.addEventListener('click', () => this.setDisplayMode('list'));
        }
        if (tableModeBtn) {
            tableModeBtn.addEventListener('click', () => this.setDisplayMode('table'));
        }
        
        // Add room button
        const addBtn = document.getElementById('addRoomBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
        
        // Bulk add button
        const bulkBtn = document.getElementById('bulkAddBtn');
        if (bulkBtn) {
            bulkBtn.addEventListener('click', () => this.showBulkModal());
        }
        
        // Modal events
        this.setupModalEvents();
        
        // Search and filters with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.trim();
                    this.loadRooms(1, true);
                }, 500);
            });
        }
        
        // Filter change events
        ['statusFilter', 'typeFilter', 'floorFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', (e) => {
                    this.currentFilters[filterId.replace('Filter', '')] = e.target.value;
                    this.loadRooms(1, true);
                });
            }
        });
        
        // Limit change event
        const limitSelect = document.getElementById('limitSelect');
        if (limitSelect) {
            limitSelect.addEventListener('change', (e) => {
                this.currentLimit = parseInt(e.target.value);
                this.loadRooms(1, true);
            });
        }
        
        // Pagination events
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.loadRooms(this.currentPage - 1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.loadRooms(this.currentPage + 1);
                }
            });
        }
        
        // Bulk modal events
        this.setupBulkModalEvents();
        
        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }
    
    setupModalEvents() {
        const modal = document.getElementById('roomModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideModal());
            }
        });
        
        // Click outside modal to close
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
        
        // Form submission
        const form = document.getElementById('roomForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveRoom();
            });
        }
    }
    
    setupBulkModalEvents() {
        const bulkModal = document.getElementById('bulkModal');
        const closeBulkBtn = document.getElementById('closeBulkModal');
        const cancelBulkBtn = document.getElementById('cancelBulkBtn');
        const previewBtn = document.getElementById('previewBtn');
        
        [closeBulkBtn, cancelBulkBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideBulkModal());
            }
        });
        
        // Click outside modal to close
        if (bulkModal) {
            bulkModal.addEventListener('click', (e) => {
                if (e.target === bulkModal) {
                    this.hideBulkModal();
                }
            });
        }
        
        // Preview button
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewBulkRooms());
        }
        
        // Form submission
        const bulkForm = document.getElementById('bulkForm');
        if (bulkForm) {
            bulkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveBulkRooms();
            });
        }
    }
    
    showAddModal() {
        this.currentEditId = null;
        const modalTitle = document.getElementById('modalTitle');
        const roomForm = document.getElementById('roomForm');
        const roomId = document.getElementById('roomId');
        const roomStatus = document.getElementById('roomStatus');
        
        if (modalTitle) modalTitle.textContent = 'Add New Room';
        if (roomForm) roomForm.reset();
        if (roomId) roomId.value = '';
        
        // Set status to Available (1) and disable the dropdown for new rooms
        if (roomStatus) {
            roomStatus.value = '1'; // Set to Available status ID
            roomStatus.disabled = true; // Disable the dropdown
            
            // Add visual indication that it's disabled
            roomStatus.style.backgroundColor = '#f3f4f6';
            roomStatus.style.color = '#6b7280';
            
            // Optional: Add a note explaining why it's disabled
            const statusNote = document.getElementById('statusNote');
            if (statusNote) {
                statusNote.textContent = 'New rooms are automatically set to Available status';
                statusNote.style.display = 'block';
            }
        }
        
        // Clear amenities checkboxes
        this.clearAmenitiesSelection();
        
        // Direct modal show instead of this.showModal()
        const modal = document.getElementById('roomModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    editRoom(roomId) {
        const room = this.rooms.find(r => r.room_id == roomId);
        if (!room) return;
        
        this.currentEditId = roomId;
        
        const elements = [
            { id: 'modalTitle', value: 'Edit Room', prop: 'textContent' },
            { id: 'roomId', value: room.room_id, prop: 'value' },
            { id: 'roomNumber', value: room.room_number, prop: 'value' },
            { id: 'roomType', value: room.room_type_id, prop: 'value' },
            { id: 'roomStatus', value: room.room_status_id, prop: 'value' },
            { id: 'floorNumber', value: room.floor_number, prop: 'value' }
        ];
        
        elements.forEach(({ id, value, prop }) => {
            const element = document.getElementById(id);
            if (element) {
                element[prop] = value;
            }
        });
        
        // Re-enable status dropdown for editing
        const roomStatus = document.getElementById('roomStatus');
        if (roomStatus) {
            roomStatus.disabled = false; // Enable the dropdown for editing
            roomStatus.style.backgroundColor = ''; // Reset background color
            roomStatus.style.color = ''; // Reset text color
        }
        
        // Hide the status note during editing
        const statusNote = document.getElementById('statusNote');
        if (statusNote) {
            statusNote.style.display = 'none';
        }
        
        // Set amenities checkboxes
        this.setAmenitiesSelection(room.amenities || []);
        
        // Direct modal show
        const modal = document.getElementById('roomModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    clearAmenitiesSelection() {
        const container = document.getElementById('amenitiesContainer');
        if (container) {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }
    
    setAmenitiesSelection(roomAmenities) {
        const container = document.getElementById('amenitiesContainer');
        if (container) {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                const amenityId = parseInt(checkbox.value);
                checkbox.checked = roomAmenities.some(amenity => amenity.amenity_id === amenityId);
            });
        }
    }
    
    getSelectedAmenities() {
        const container = document.getElementById('amenitiesContainer');
        const selectedAmenities = [];
        
        if (container) {
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                selectedAmenities.push(parseInt(checkbox.value));
            });
        }
        
        return selectedAmenities;
    }
    
    async deleteRoom(roomId) {
        const room = this.rooms.find(r => r.room_id == roomId);
        if (!room) return;
        
        if (!confirm(`Are you sure you want to delete Room ${room.room_number}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/rooms.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({ room_id: roomId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete room');
            }
            
            this.showSuccess('Room deleted successfully');
            await this.loadRooms(this.currentPage);
            
        } catch (error) {
            console.error('Failed to delete room:', error);
            this.showError('Failed to delete room: ' + error.message);
        }
    }
    
    async updateRoomStatus(roomId, statusId) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/pages/rooms.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    room_id: roomId,
                    room_status_id: statusId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to update room status');
            }
            
            this.showSuccess('Room status updated successfully');
            await this.loadRooms(this.currentPage);
            
        } catch (error) {
            console.error('Failed to update room status:', error);
            this.showError('Failed to update room status: ' + error.message);
        }
    }
    
    async saveRoom() {
        try {
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            
            // Disable button and show loading
            if (saveBtn) saveBtn.disabled = true;
            if (saveBtnText) saveBtnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
            
            const formData = {
                room_number: this.getElementValue('roomNumber').trim(),
                room_type_id: this.getElementValue('roomType'),
                room_status_id: this.getElementValue('roomStatus'),
                floor_number: this.getElementValue('floorNumber'),
                amenities: this.getSelectedAmenities()
            };
            
            // Validation
            if (!formData.room_number || !formData.room_type_id || !formData.room_status_id || !formData.floor_number) {
                throw new Error('Please fill in all required fields');
            }
            
            const isEdit = this.currentEditId !== null;
            if (isEdit) {
                formData.room_id = this.currentEditId;
            }
            
            const response = await fetch(`${this.baseURL}/api/admin/pages/rooms.php`, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to save room');
            }
            
            this.showSuccess(`Room ${isEdit ? 'updated' : 'created'} successfully`);
            this.hideModal();
            await this.loadRooms(this.currentPage);
            
        } catch (error) {
            console.error('Failed to save room:', error);
            this.showError('Failed to save room: ' + error.message);
        } finally {
            // Re-enable button
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            if (saveBtn) saveBtn.disabled = false;
            if (saveBtnText) saveBtnText.textContent = 'Save Room';
        }
    }
    
    getElementValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }
    
    showBulkModal() {
        const bulkForm = document.getElementById('bulkForm');
        const roomPreview = document.getElementById('roomPreview');
        
        if (bulkForm) bulkForm.reset();
        if (roomPreview) roomPreview.classList.add('hidden');
        
        this.showBulkModalElement();
    }
    
    previewBulkRooms() {
        try {
            const floor = this.getElementValue('bulkFloor');
            const startingNumber = this.getElementValue('startingNumber').trim();
            const roomCount = parseInt(this.getElementValue('roomCount'));
            const pattern = this.getElementValue('numberPattern');
            
            if (!floor || !startingNumber || !roomCount) {
                throw new Error('Please fill in all required fields');
            }
            
            if (roomCount < 1 || roomCount > 50) {
                throw new Error('Room count must be between 1 and 50');
            }
            
            // Generate room numbers
            const roomNumbers = [];
            let currentNumber = parseInt(startingNumber);
            
            for (let i = 0; i < roomCount; i++) {
                roomNumbers.push(currentNumber.toString());
                if (pattern === 'sequential') {
                    currentNumber++;
                } else { // skip pattern
                    currentNumber += 2;
                }
            }
            
            // Display preview
            const previewDiv = document.getElementById('roomPreview');
            const previewList = document.getElementById('previewList');
            const bulkRoomTypeSelect = document.getElementById('bulkRoomType');
            
            if (previewList) {
                const selectedTypeText = bulkRoomTypeSelect && bulkRoomTypeSelect.selectedOptions[0] 
                    ? bulkRoomTypeSelect.selectedOptions[0].text 
                    : 'Not selected';
                
                previewList.innerHTML = `
                    <div class="mb-2"><strong>Rooms to be created:</strong></div>
                    <div class="grid grid-cols-5 gap-2">
                        ${roomNumbers.map(num => `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center">${num}</span>`).join('')}
                    </div>
                    <div class="mt-2 text-sm text-gray-600">
                        Floor: ${floor}, Room Type: ${selectedTypeText}
                    </div>
                `;
            }
            
            if (previewDiv) {
                previewDiv.classList.remove('hidden');
            }
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    async saveBulkRooms() {
        try {
            const bulkSaveBtn = document.getElementById('bulkSaveBtn');
            const bulkSaveBtnText = document.getElementById('bulkSaveBtnText');
            
            // Disable button and show loading
            if (bulkSaveBtn) bulkSaveBtn.disabled = true;
            if (bulkSaveBtnText) bulkSaveBtnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
            
            const floor = this.getElementValue('bulkFloor');
            const roomTypeId = this.getElementValue('bulkRoomType');
            const startingNumber = this.getElementValue('startingNumber').trim();
            const roomCount = parseInt(this.getElementValue('roomCount'));
            const pattern = this.getElementValue('numberPattern');
            
            if (!floor || !roomTypeId || !startingNumber || !roomCount) {
                throw new Error('Please fill in all required fields');
            }
            
            // Generate room data
            const rooms = [];
            let currentNumber = parseInt(startingNumber);
            
            for (let i = 0; i < roomCount; i++) {
                rooms.push({
                    room_number: currentNumber.toString(),
                    room_type_id: roomTypeId,
                    room_status_id: 1, // Available by default
                    floor_number: floor,
                    amenities: [] // No amenities for bulk creation, can be added later
                });
                
                if (pattern === 'sequential') {
                    currentNumber++;
                } else {
                    currentNumber += 2;
                }
            }
            
            const response = await fetch(`${this.baseURL}/api/admin/pages/rooms.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    bulk_create: true,
                    rooms: rooms
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create rooms');
            }
            
            let message = `${result.created_count} rooms created successfully`;
            if (result.errors && result.errors.length > 0) {
                message += `\n\nErrors:\n${result.errors.join('\n')}`;
            }
            
            this.showSuccess(message);
            this.hideBulkModal();
            await this.loadRooms(1, true);
            
        } catch (error) {
            console.error('Failed to create bulk rooms:', error);
            this.showError('Failed to create rooms: ' + error.message);
        } finally {
            // Re-enable button
            const bulkSaveBtn = document.getElementById('bulkSaveBtn');
            const bulkSaveBtnText = document.getElementById('bulkSaveBtnText');
            if (bulkSaveBtn) bulkSaveBtn.disabled = false;
            if (bulkSaveBtnText) bulkSaveBtnText.textContent = 'Create Rooms';
        }
    }
    
    showModal() {
        const modal = document.getElementById('roomModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    hideModal() {
        const modal = document.getElementById('roomModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        this.currentEditId = null;
    }
    
    showBulkModalElement() {
        const modal = document.getElementById('bulkModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
    
    hideBulkModal() {
        const modal = document.getElementById('bulkModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
    
    async handleLogout() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/logout.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin'
            });
            
            window.location.href = `${this.baseURL}/pages/auth/login.html`;
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = `${this.baseURL}/pages/auth/login.html`;
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded shadow-lg z-50 max-w-md border`;
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="whitespace-pre-line">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize enhanced rooms manager when DOM is loaded
let enhancedRoomsManager;

document.addEventListener('DOMContentLoaded', () => {
    enhancedRoomsManager = new EnhancedRoomsManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (enhancedRoomsManager) {
        // Cleanup if needed
    }
});