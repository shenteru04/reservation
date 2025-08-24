        class ResponsiveHotelDashboard {
            constructor() {
                this.sidebar = document.getElementById('sidebar');
                this.burgerMenu = document.getElementById('burgerMenu');
                this.closeSidebar = document.getElementById('closeSidebar');
                this.mobileOverlay = document.getElementById('mobileOverlay');
                this.loadingOverlay = document.getElementById('loadingOverlay');
                this.isMobileOpen = false;
                
                this.init();
            }

            init() {
                this.bindEvents();
                this.updateDateTime();
                this.initializePage();
                this.handleResize();
                
                // Update date/time every second
                setInterval(() => this.updateDateTime(), 1000);
                
                // Handle window resize
                window.addEventListener('resize', () => this.handleResize());
                
                // Hide loading overlay after initialization
                setTimeout(() => this.hideLoading(), 1500);
            }

            bindEvents() {
                // Burger menu toggle
                this.burgerMenu?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleMobileMenu();
                });

                // Close sidebar button
                this.closeSidebar?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closeMobileMenu();
                });

                // Mobile overlay click
                this.mobileOverlay?.addEventListener('click', () => {
                    this.closeMobileMenu();
                });

                // Prevent sidebar close when clicking inside
                this.sidebar?.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                // Close mobile menu when clicking outside
                document.addEventListener('click', (e) => {
                    if (this.isMobileOpen && !this.sidebar.contains(e.target) && !this.burgerMenu.contains(e.target)) {
                        this.closeMobileMenu();
                    }
                });

                // Handle escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.isMobileOpen) {
                        this.closeMobileMenu();
                    }
                });

                // Navigation links
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        // Close mobile menu when navigation item is clicked
                        if (window.innerWidth < 1024) {
                            this.closeMobileMenu();
                        }
                    });
                });

                // Sample button events
                this.bindSampleEvents();
            }

            bindSampleEvents() {
                // Refresh button
                document.getElementById('refreshTableBtn')?.addEventListener('click', () => {
                    this.showToast('Data refreshed successfully!', 'success');
                });

                // Export button
                document.getElementById('exportTableBtn')?.addEventListener('click', () => {
                    this.showToast('Export started...', 'info');
                });

                // Send report button
                document.getElementById('sendReportBtn')?.addEventListener('click', () => {
                    this.showToast('Report sent successfully!', 'success');
                });

                // Quick action buttons
                document.querySelectorAll('.btn-primary, button[class*="bg-gradient"]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        if (!e.target.closest('#burgerMenu') && !e.target.closest('#closeSidebar')) {
                            const buttonText = btn.textContent.trim();
                            this.showToast(`${buttonText} clicked!`, 'info');
                        }
                    });
                });
            }

            toggleMobileMenu() {
                if (this.isMobileOpen) {
                    this.closeMobileMenu();
                } else {
                    this.openMobileMenu();
                }
            }

            openMobileMenu() {
                this.isMobileOpen = true;
                this.sidebar.classList.add('mobile-open');
                this.sidebar.classList.remove('mobile-closing');
                this.mobileOverlay.classList.add('active');
                this.burgerMenu.classList.add('burger-active');
                
                // Prevent body scroll
                document.body.style.overflow = 'hidden';
                
                // Add aria attributes for accessibility
                this.sidebar.setAttribute('aria-hidden', 'false');
                this.burgerMenu.setAttribute('aria-expanded', 'true');
            }

            closeMobileMenu() {
                this.isMobileOpen = false;
                this.sidebar.classList.remove('mobile-open');
                this.sidebar.classList.add('mobile-closing');
                this.mobileOverlay.classList.remove('active');
                this.burgerMenu.classList.remove('burger-active');
                
                // Restore body scroll
                document.body.style.overflow = '';
                
                // Add aria attributes for accessibility
                this.sidebar.setAttribute('aria-hidden', 'true');
                this.burgerMenu.setAttribute('aria-expanded', 'false');
                
                // Remove closing animation class after animation completes
                setTimeout(() => {
                    this.sidebar.classList.remove('mobile-closing');
                }, 300);
            }

            handleResize() {
                // Close mobile menu if window becomes large
                if (window.innerWidth >= 1024 && this.isMobileOpen) {
                    this.closeMobileMenu();
                }
                
                // Update layout based on screen size
                this.updateLayoutForScreenSize();
            }

            updateLayoutForScreenSize() {
                const isMobile = window.innerWidth < 768;
                const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
                
                // Update stats display
                this.updateStatsForScreenSize(isMobile, isTablet);
                
                // Update table responsiveness
                this.updateTableForScreenSize(isMobile);
                
                // Update navigation
                this.updateNavigationForScreenSize(isMobile, isTablet);
            }

            updateStatsForScreenSize(isMobile, isTablet) {
                // Simulate updating stats with random values for demo
                const stats = [
                    { id: 'statTotalReservations', value: Math.floor(Math.random() * 100) + 50 },
                    { id: 'statCheckinsToday', value: Math.floor(Math.random() * 20) + 5 },
                    { id: 'statRevenueToday', value: (Math.random() * 50000 + 10000).toFixed(2) },
                    { id: 'statUnpaidBalance', value: (Math.random() * 25000 + 5000).toFixed(2) }
                ];

                stats.forEach(stat => {
                    const element = document.getElementById(stat.id);
                    if (element) {
                        if (stat.id.includes('Revenue') || stat.id.includes('Balance')) {
                            element.textContent = `₱${stat.value}`;
                        } else {
                            element.textContent = stat.value;
                        }
                    }
                });

                // Update summary stats
                document.getElementById('completedCheckins').textContent = Math.floor(Math.random() * 15) + 3;
                document.getElementById('processedCheckouts').textContent = Math.floor(Math.random() * 12) + 2;
                document.getElementById('paymentsReceived').textContent = Math.floor(Math.random() * 8) + 1;
            }

            updateTableForScreenSize(isMobile) {
                // Update table content for mobile
                const tableBody = document.getElementById('activityTableBody');
                if (tableBody) {
                    const sampleData = [
                        { customer: 'John Doe', date: '2025-01-21', status: 'Confirmed' },
                        { customer: 'Jane Smith', date: '2025-01-20', status: 'Pending' },
                        { customer: 'Mike Johnson', date: '2025-01-19', status: 'Completed' }
                    ];

                    tableBody.innerHTML = sampleData.map((row, index) => `
                        <tr class="hover:bg-blue-50 transition-colors">
                            <td class="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${row.customer}
                            </td>
                            <td class="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-500 mobile-hidden lg:table-cell">
                                ${row.date}
                            </td>
                            <td class="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getStatusClass(row.status)}">
                                    ${row.status}
                                </span>
                            </td>
                            <td class="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-blue-600 hover:text-blue-900 mr-2 touch-target">View</button>
                                ${!isMobile ? '<button class="text-gray-600 hover:text-gray-900 touch-target">Edit</button>' : ''}
                            </td>
                        </tr>
                    `).join('');
                }

                document.getElementById('totalItems').textContent = '3';
            }

            updateNavigationForScreenSize(isMobile, isTablet) {
                // Add active states and update navigation based on screen size
                const navLinks = document.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    // Add touch-friendly sizing for mobile
                    if (isMobile) {
                        link.classList.add('touch-target');
                    }
                });
            }

            getStatusClass(status) {
                const statusClasses = {
                    'Confirmed': 'bg-blue-100 text-blue-800',
                    'Pending': 'bg-yellow-100 text-yellow-800',
                    'Completed': 'bg-green-100 text-green-800',
                    'Cancelled': 'bg-red-100 text-red-800'
                };
                return statusClasses[status] || 'bg-gray-100 text-gray-800';
            }

            updateDateTime() {
                const now = new Date();
                const options = {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                };
                
                const dateTimeString = now.toLocaleDateString('en-US', options);
                const dateTimeElement = document.getElementById('currentDateTime');
                if (dateTimeElement) {
                    dateTimeElement.textContent = dateTimeString;
                }

                // Update last sync times
                const syncElements = ['lastSync', 'lastUpdated', 'lastUpdatedTable'];
                syncElements.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = 'Just now';
                    }
                });
            }

            initializePage() {
                // Initialize accessibility attributes
                this.sidebar.setAttribute('aria-hidden', window.innerWidth < 1024 ? 'true' : 'false');
                this.burgerMenu.setAttribute('aria-expanded', 'false');
                this.burgerMenu.setAttribute('aria-label', 'Toggle navigation menu');
                
                // Add role attributes
                this.sidebar.setAttribute('role', 'navigation');
                this.sidebar.setAttribute('aria-label', 'Main navigation');
                
                // Initialize with sample data
                this.updateLayoutForScreenSize();
            }

            hideLoading() {
                if (this.loadingOverlay) {
                    this.loadingOverlay.style.opacity = '0';
                    setTimeout(() => {
                        this.loadingOverlay.style.display = 'none';
                    }, 500);
                }
            }

            showToast(message, type = 'info') {
                // Create toast notification
                const toast = document.createElement('div');
                toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg text-white transition-all duration-300 transform translate-x-full`;
                
                // Set background color based on type
                const colors = {
                    success: 'bg-green-500',
                    error: 'bg-red-500',
                    warning: 'bg-yellow-500',
                    info: 'bg-blue-500'
                };
                toast.className += ` ${colors[type] || colors.info}`;
                
                // Set icon based on type
                const icons = {
                    success: 'fas fa-check-circle',
                    error: 'fas fa-exclamation-circle',
                    warning: 'fas fa-exclamation-triangle',
                    info: 'fas fa-info-circle'
                };
                
                toast.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <i class="${icons[type] || icons.info}"></i>
                        <span class="font-medium">${message}</span>
                    </div>
                `;
                
                document.body.appendChild(toast);
                
                // Animate in
                setTimeout(() => {
                    toast.classList.remove('translate-x-full');
                }, 100);
                
                // Auto remove after 3 seconds
                setTimeout(() => {
                    toast.classList.add('translate-x-full');
                    setTimeout(() => {
                        if (document.body.contains(toast)) {
                            document.body.removeChild(toast);
                        }
                    }, 300);
                }, 3000);
            }
        }

        // Initialize the responsive dashboard when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            new ResponsiveHotelDashboard();
        });

        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible, refresh data
                console.log('Page visible - refreshing data');
            }
        });