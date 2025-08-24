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

        // Update time every minute
        updateDateTime();
        setInterval(updateDateTime, 60000);

        // Enhanced hover effects for navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(8px)';
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
            });
        });

        // Service cards animation on load
        document.addEventListener('DOMContentLoaded', function() {
            // Add demo data after a delay
            setTimeout(() => {
                document.getElementById('totalServices').textContent = '16';
                document.getElementById('complimentaryServices').textContent = '8';
                document.getElementById('paidServices').textContent = '8';
                document.getElementById('totalUsage').textContent = '142';
            }, 1500);

            // Animate cards
            const cards = document.querySelectorAll('.card-hover');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('fade-in-up');
            });
        });

        // Enhanced modal functionality
        document.addEventListener('DOMContentLoaded', function() {
            const modal = document.getElementById('serviceModal');
            const addBtn = document.getElementById('addServiceBtn');
            const closeBtn = document.getElementById('closeModal');
            const cancelBtn = document.getElementById('cancelBtn');

            addBtn?.addEventListener('click', function() {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                setTimeout(() => {
                    modal.style.opacity = '1';
                }, 10);
            });

            function closeModal() {
                modal.style.opacity = '0';
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }, 300);
            }

            closeBtn?.addEventListener('click', closeModal);
            cancelBtn?.addEventListener('click', closeModal);

            // Close modal when clicking backdrop
            modal?.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal();
                }
            });
        });

        // Enhanced notification system
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 animate-slide-in glass-effect ${
                type === 'success' ? 'border-l-4 border-green-500 text-green-800' :
                type === 'error' ? 'border-l-4 border-red-500 text-red-800' :
                type === 'warning' ? 'border-l-4 border-yellow-500 text-yellow-800' :
                'border-l-4 border-blue-500 text-blue-800'
            }`;
            notification.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'} text-xl"></i>
                    <span class="font-medium">${message}</span>
                </div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }, 4000);
        }