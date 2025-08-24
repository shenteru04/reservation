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
                year: 'numeric', 
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

        // Tab switching functionality
        document.getElementById('revenueTab').addEventListener('click', function() {
            showRevenueTab();
        });

        document.getElementById('frontDeskTab').addEventListener('click', function() {
            showFrontDeskTab();
        });

        function showRevenueTab() {
            document.getElementById('revenueContent').classList.remove('hidden');
            document.getElementById('frontDeskContent').classList.add('hidden');
            
            document.getElementById('revenueTab').classList.add('tab-active');
            document.getElementById('revenueTab').classList.remove('tab-inactive');
            
            document.getElementById('frontDeskTab').classList.remove('tab-active');
            document.getElementById('frontDeskTab').classList.add('tab-inactive');
        }

        function showFrontDeskTab() {
            document.getElementById('frontDeskContent').classList.remove('hidden');
            document.getElementById('revenueContent').classList.add('hidden');
            
            document.getElementById('frontDeskTab').classList.add('tab-active');
            document.getElementById('frontDeskTab').classList.remove('tab-inactive');
            
            document.getElementById('revenueTab').classList.remove('tab-active');
            document.getElementById('revenueTab').classList.add('tab-inactive');
        }

        // Modal functions
        function closeReportModal() {
            document.getElementById('reportViewModal').classList.add('hidden');
        }

        // Print functionality
        document.getElementById('printReport').addEventListener('click', function() {
            // Set print date
            document.getElementById('printDate').textContent = new Date().toLocaleDateString();
            window.print();
        });

        // Export functionality
        document.getElementById('exportReport').addEventListener('click', function() {
            // Placeholder for export functionality
            alert('Export functionality would be implemented here');
        });

        // Generate report functionality
        document.getElementById('generateReport').addEventListener('click', function() {
            // Show loading state
            const button = this;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
            button.disabled = true;

            // Simulate report generation
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
                
                // Update sample data
                document.getElementById('totalRevenue').textContent = '₱125,450';
                document.getElementById('totalBookings').textContent = '87';
                document.getElementById('occupancyRate').textContent = '76%';
                document.getElementById('totalCustomers').textContent = '234';
                
                // Show success notification
                showNotification('Report generated successfully!', 'success');
            }, 2000);
        });

        // Notification system
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 animate-slide-in ${
                type === 'success' ? 'bg-green-500 text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
            }`;
            notification.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        // Enhanced animations on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });

        document.querySelectorAll('.card-hover').forEach((card) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });

        // Add some demo data loading simulation
        setTimeout(() => {
            if (document.getElementById('totalRevenue').innerHTML.includes('spinner')) {
                document.getElementById('totalRevenue').textContent = '₱89,250';
                document.getElementById('totalBookings').textContent = '64';
                document.getElementById('occupancyRate').textContent = '72%';
                document.getElementById('totalCustomers').textContent = '189';
            }
        }, 1500);