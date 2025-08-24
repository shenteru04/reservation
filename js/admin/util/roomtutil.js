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

        // Enhanced room type card generation
        function createRoomTypeCard(roomType) {
            return `
                <div class="room-type-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <i class="fas fa-bed text-white text-lg"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">${roomType.type_name}</h4>
                                <p class="text-sm text-gray-500">${roomType.capacity} guests</p>
                            </div>
                        </div>
                        <div class="price-tag">
                            ₱${parseFloat(roomType.price_per_night).toLocaleString()}
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <p class="text-gray-600 text-sm leading-relaxed">
                            ${roomType.description || 'No description available'}
                        </p>
                    </div>
                    
                    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div class="flex items-center space-x-2">
                            <div class="flex items-center space-x-1 text-xs text-gray-500">
                                <i class="fas fa-users text-blue-500"></i>
                                <span>Up to ${roomType.capacity}</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="editRoomType(${roomType.room_type_id})" 
                                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                    title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteRoomType(${roomType.room_type_id})" 
                                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                    title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Enhanced hover effects for navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(8px)';
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
            });
        });

        // Smooth loading animations
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('animate-fade-in');
            });
        });

        // Update stats
        function updateStats(roomTypes) {
            const totalTypes = roomTypes.length;
            const prices = roomTypes.map(rt => parseFloat(rt.price_per_night));
            const capacities = roomTypes.map(rt => parseInt(rt.capacity));
            
            const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
            const maxCapacity = capacities.length ? Math.max(...capacities) : 0;
            const minPrice = prices.length ? Math.min(...prices) : 0;
            const maxPrice = prices.length ? Math.max(...prices) : 0;
            
            document.getElementById('totalTypesCount').textContent = totalTypes;
            document.getElementById('totalTypesCountHeader').textContent = totalTypes;
            document.getElementById('averagePrice').textContent = '₱' + avgPrice.toLocaleString();
            document.getElementById('maxCapacity').textContent = maxCapacity;
            document.getElementById('priceRange').textContent = `₱${minPrice.toLocaleString()} - ₱${maxPrice.toLocaleString()}`;
        }

        // Enhanced modal animations
        const modal = document.getElementById('roomTypeModal');
        const modalContent = modal.querySelector('.bg-white');
        
        function showModal() {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modalContent.style.transform = 'scale(1)';
                modalContent.style.opacity = '1';
            }, 10);
        }
        
        function hideModal() {
            modalContent.style.transform = 'scale(0.95)';
            modalContent.style.opacity = '0';
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 200);
        }

        // Global functions for room type management
        window.editRoomType = function(id) {
            // Implementation would be handled by room-types.js
            console.log('Edit room type:', id);
        };

        window.deleteRoomType = function(id) {
            // Implementation would be handled by room-types.js
            console.log('Delete room type:', id);
        };