 // Enhanced loading and initialization
        window.addEventListener('load', function() {
            setTimeout(() => {
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.style.opacity = '0';
                    loadingOverlay.style.transition = 'opacity 0.5s ease-out';
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';
                    }, 500);
                }
            }, 800);
        });

        // Real-time clock update
        function updateDateTime() {
            const now = new Date();
            const options = { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            document.getElementById('currentDateTime').textContent = 
                now.toLocaleDateString('en-US', options);
        }

        // Update time every second
        updateDateTime();
        setInterval(updateDateTime, 1000);

        // Enhanced hover effects for navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(8px)';
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
            });
        });

        // Display mode toggle functionality
        const gridBtn = document.getElementById('gridModeBtn');
        const listBtn = document.getElementById('listModeBtn');
        const tableBtn = document.getElementById('tableModeBtn');

        function setDisplayMode(mode) {
            // Remove active class from all buttons
            [gridBtn, listBtn, tableBtn].forEach(btn => {
                btn.classList.remove('active');
                btn.classList.add('bg-gray-200', 'text-gray-600');
            });

            // Add active class to selected button
            const activeBtn = mode === 'grid' ? gridBtn : mode === 'list' ? listBtn : tableBtn;
            activeBtn.classList.add('active');
            activeBtn.classList.remove('bg-gray-200', 'text-gray-600');

            // Update container layout
            const container = document.getElementById('roomsContainer');
            if (mode === 'grid') {
                container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
            } else if (mode === 'list') {
                container.className = 'grid grid-cols-1 gap-4';
            } else {
                container.className = 'overflow-x-auto';
            }
        }

        gridBtn.addEventListener('click', () => setDisplayMode('grid'));
        listBtn.addEventListener('click', () => setDisplayMode('list'));
        tableBtn.addEventListener('click', () => setDisplayMode('table'));

        // Enhanced room card generation
        function createRoomCard(room) {
            const statusClasses = {
                1: 'status-available',
                2: 'status-occupied',
                3: 'status-reserved',
                4: 'status-out-of-order',
                5: 'status-maintenance'
            };

            const statusIcons = {
                1: 'fas fa-check-circle',
                2: 'fas fa-user',
                3: 'fas fa-calendar-check',
                4: 'fas fa-times-circle',
                5: 'fas fa-tools'
            };

            const statusTexts = {
                1: 'Available',
                2: 'Occupied',
                3: 'Reserved',
                4: 'Out of Order',
                5: 'Maintenance'
            };

            return `
                <div class="room-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                                <i class="fas fa-bed text-white text-lg"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-800 group-hover:text-emerald-600 transition-colors text-lg">
                                    Room ${room.room_number}
                                </h4>
                                <p class="text-sm text-gray-500">${room.type_name}</p>
                            </div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClasses[room.room_status_id]}">
                            <i class="${statusIcons[room.room_status_id]} mr-1"></i>
                            ${statusTexts[room.room_status_id]}
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div class="flex items-center space-x-2 text-gray-600">
                            <i class="fas fa-building text-indigo-500"></i>
                            <span>Floor ${room.floor_number}</span>
                        </div>
                        <div class="flex items-center space-x-2 text-gray-600">
                            <i class="fas fa-users text-blue-500"></i>
                            <span>${room.capacity} guests</span>
                        </div>
                        <div class="flex items-center space-x-2 text-gray-600">
                            <i class="fas fa-peso-sign text-green-500"></i>
                            <span>₱${parseFloat(room.price_per_night).toLocaleString()}/night</span>
                        </div>
                        <div class="flex items-center space-x-2 text-gray-600">
                            <i class="fas fa-star text-yellow-500"></i>
                            <span>${room.amenities ? room.amenities.split(',').length : 0} amenities</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div class="text-xs text-gray-500">
                            <i class="fas fa-clock mr-1"></i>
                            Updated: ${new Date(room.updated_at).toLocaleDateString()}
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="editRoom(${room.room_id})" 
                                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                    title="Edit Room">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteRoom(${room.room_id})" 
                                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                    title="Delete Room">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Smooth loading animations
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('animate-fade-in');
            });
        });

        // Global functions for room management
        window.editRoom = function(id) {
            console.log('Edit room:', id);
        };

        window.deleteRoom = function(id) {
            console.log('Delete room:', id);
        };