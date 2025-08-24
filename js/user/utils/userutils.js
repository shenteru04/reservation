 function createEnhancedNotification(message, type = 'info') {
            const colors = {
                info: 'bg-blue-500 border-blue-600',
                success: 'bg-green-500 border-green-600',
                error: 'bg-red-500 border-red-600',
                warning: 'bg-yellow-500 border-yellow-600'
            };

            const icons = {
                info: 'fas fa-info-circle',
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle'
            };

            const notification = document.createElement('div');
            notification.className = `notification-enter ${colors[type]} text-white px-6 py-4 rounded-xl shadow-lg border-l-4 flex items-center space-x-3 max-w-sm`;
            notification.innerHTML = `
                <i class="${icons[type]} text-lg"></i>
                <span class="flex-1 font-medium">${message}</span>
                <button onclick="this.parentElement.remove()" class="ml-2 text-white/80 hover:text-white text-lg">
                    <i class="fas fa-times"></i>
                </button>
            `;

            const container = document.getElementById('notificationContainer');
            container.appendChild(notification);

            // Auto remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        }

        // Enhanced room card interactions
        document.addEventListener('DOMContentLoaded', function() {
            // Add intersection observer for animations
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                    }
                });
            }, observerOptions);

            // Observe all room cards and other elements
            const elementsToObserve = document.querySelectorAll('.room-card, .glass-card-light');
            elementsToObserve.forEach(el => observer.observe(el));
        });

        // Add CSS for fadeInUp animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
                
        `;
        
        document.head.appendChild(style);
