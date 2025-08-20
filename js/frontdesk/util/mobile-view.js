       // Mobile sidebar functionality
        document.addEventListener('DOMContentLoaded', function() {
            const openSidebar = document.getElementById('openSidebar');
            const closeSidebar = document.getElementById('closeSidebar');
            const sidebar = document.getElementById('sidebar');
            const mobileOverlay = document.getElementById('mobileOverlay');

            if (openSidebar && closeSidebar && sidebar && mobileOverlay) {
                openSidebar.addEventListener('click', function() {
                    sidebar.classList.add('mobile-open');
                    mobileOverlay.classList.add('active');
                });

                closeSidebar.addEventListener('click', function() {
                    sidebar.classList.remove('mobile-open');
                    mobileOverlay.classList.remove('active');
                });

                mobileOverlay.addEventListener('click', function() {
                    sidebar.classList.remove('mobile-open');
                    mobileOverlay.classList.remove('active');
                });
            }

            // Character counter for special requests
            const specialRequests = document.getElementById('specialRequests');
            const specialRequestsCount = document.getElementById('specialRequestsCount');
            
            if (specialRequests && specialRequestsCount) {
                specialRequests.addEventListener('input', function() {
                    specialRequestsCount.textContent = this.value.length;
                });
            }

            // Quick actions floating button
            const quickActionsBtn = document.getElementById('quickActionsBtn');
            const quickActionsMenu = document.getElementById('quickActionsMenu');
            
            if (quickActionsBtn && quickActionsMenu) {
                quickActionsBtn.addEventListener('click', function() {
                    quickActionsMenu.classList.toggle('opacity-0');
                    quickActionsMenu.classList.toggle('scale-95');
                    quickActionsMenu.classList.toggle('pointer-events-none');
                });

                // Close menu when clicking outside
                document.addEventListener('click', function(e) {
                    if (!quickActionsBtn.contains(e.target) && !quickActionsMenu.contains(e.target)) {
                        quickActionsMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
                    }
                });
            }

            // Update last updated timestamp
            function updateTimestamp() {
                const now = new Date();
                const timeString = now.toLocaleTimeString();
                const lastUpdated = document.getElementById('lastUpdated');
                if (lastUpdated) {
                    lastUpdated.textContent = `Last updated: ${timeString}`;
                }
            }

            // Update timestamp every minute
            updateTimestamp();
            setInterval(updateTimestamp, 60000);

            // Enhanced filter functionality
            const searchInput = document.getElementById('searchInput');
            const statusFilter = document.getElementById('statusFilter');
            const checkinFilter = document.getElementById('checkinFilter');
            const roomTypeFilter = document.getElementById('roomTypeFilter');
            const filterCount = document.getElementById('filterCount');

            function updateFilterCount() {
                let count = 0;
                if (searchInput && searchInput.value.trim()) count++;
                if (statusFilter && statusFilter.value) count++;
                if (checkinFilter && checkinFilter.value) count++;
                if (roomTypeFilter && roomTypeFilter.value) count++;
                
                if (filterCount) {
                    filterCount.textContent = count;
                }
            }

            // Add event listeners for filter count
            [searchInput, statusFilter, checkinFilter, roomTypeFilter].forEach(element => {
                if (element) {
                    element.addEventListener('change', updateFilterCount);
                    element.addEventListener('input', updateFilterCount);
                }
            });

            // Initialize filter count
            updateFilterCount();

            // Advanced toggle functionality
            const advancedToggle = document.getElementById('advancedToggle');
            if (advancedToggle) {
                advancedToggle.addEventListener('click', function() {
                    // Add advanced filter functionality here
                    console.log('Advanced filters toggled');
                });
            }

            // Quick search functionality
            const quickSearch = document.getElementById('quickSearch');
            if (quickSearch) {
                quickSearch.addEventListener('click', function() {
                    // Add quick search functionality here
                    console.log('Quick search activated');
                });
            }

            // Enhanced button interactions
            const actionButtons = document.querySelectorAll('.action-btn');
            actionButtons.forEach(btn => {
                btn.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                });
                btn.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                });
            });
        });