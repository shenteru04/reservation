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
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
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

        // Mobile sidebar functionality
        document.getElementById('openSidebar').addEventListener('click', function() {
            document.getElementById('sidebar').classList.add('mobile-open');
            document.getElementById('mobileOverlay').classList.add('active');
        });

        document.getElementById('closeSidebar').addEventListener('click', function() {
            document.getElementById('sidebar').classList.remove('mobile-open');
            document.getElementById('mobileOverlay').classList.remove('active');
        });

        document.getElementById('mobileOverlay').addEventListener('click', function() {
            document.getElementById('sidebar').classList.remove('mobile-open');
            this.classList.remove('active');
        });

        // Enhanced modal functionality
        document.getElementById('addReservationBtn').addEventListener('click', function() {
            document.getElementById('reservationModal').classList.remove('hidden');
            document.getElementById('reservationModal').classList.add('show');
        });

        document.getElementById('closeModal').addEventListener('click', function() {
            document.getElementById('reservationModal').classList.remove('show');
            setTimeout(() => {
                document.getElementById('reservationModal').classList.add('hidden');
            }, 300);
        });

        document.getElementById('cancelReservationBtn').addEventListener('click', function() {
            document.getElementById('reservationModal').classList.remove('show');
            setTimeout(() => {
                document.getElementById('reservationModal').classList.add('hidden');
            }, 300);
        });

        // Quick actions menu
        document.getElementById('quickActionsBtn').addEventListener('click', function() {
            const menu = document.getElementById('quickActionsMenu');
            menu.classList.toggle('show');
        });

        // Close quick actions menu when clicking outside
        document.addEventListener('click', function(event) {
            const btn = document.getElementById('quickActionsBtn');
            const menu = document.getElementById('quickActionsMenu');
            if (!btn.contains(event.target) && !menu.contains(event.target)) {
                menu.classList.remove('show');
            }
        });

        // Smooth loading animations
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('animate-fade-in');
            });

            // Add demo data loading simulation
            setTimeout(() => {
                document.getElementById('totalReservations').textContent = '42';
                document.getElementById('lastUpdated').textContent = 'Last updated: Just now';
            }, 1500);
        });

        // Enhanced form interactions
        document.getElementById('paymentMethodSelect').addEventListener('change', function() {
            const advanceFields = document.getElementById('advancePaymentFields');
            if (this.value) {
                advanceFields.classList.remove('hidden');
            } else {
                advanceFields.classList.add('hidden');
            }
        });

        // Character count for special requests
        document.getElementById('specialRequests').addEventListener('input', function() {
            const count = this.value.length;
            document.getElementById('specialRequestsCount').textContent = count;
            
            if (count > 450) {
                document.getElementById('specialRequestsCount').style.color = '#ef4444';
            } else {
                document.getElementById('specialRequestsCount').style.color = '#6b7280';
            }
        });

        // Advance amount calculation
        document.getElementById('advanceAmount').addEventListener('input', function() {
            const total = parseFloat(document.querySelector('#totalAmount span').textContent.replace('₱', '').replace(',', '')) || 0;
            const advance = parseFloat(this.value) || 0;
            const remaining = total - advance;
            
            document.getElementById('remainingBalance').textContent = '₱' + remaining.toFixed(2);
        });