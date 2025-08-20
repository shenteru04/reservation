        // Fixed booking-status.js with enhanced features
        const baseURL = window.location.origin + '/reservation';

        document.addEventListener('DOMContentLoaded', function() {
            // Initialize form
            const form = document.getElementById('bookingForm');
            const emailOrPhone = document.getElementById('emailOrPhone');
            const contactIcon = document.getElementById('contactIcon');
            
            // Dynamic icon change based on input
            emailOrPhone.addEventListener('input', function() {
                const value = this.value;
                if (value.includes('@')) {
                    contactIcon.className = 'fas fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400';
                } else if (/^\d/.test(value)) {
                    contactIcon.className = 'fas fa-phone absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400';
                } else {
                    contactIcon.className = 'fas fa-at absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400';
                }
            });
            
            if (form) {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const bookingId = document.getElementById('bookingId').value.trim();
                    const contact = document.getElementById('emailOrPhone').value.trim();
                    
                    // Validation
                    if (!bookingId || !contact) {
                        showNotification('Please fill in all required fields', 'error');
                        return;
                    }
                    
                    if (!isValidContact(contact)) {
                        showNotification('Please enter a valid email address or phone number', 'error');
                        return;
                    }
                    
                    await checkBookingStatus(bookingId, contact);
                });
            }
        });

        function isValidContact(contact) {
            // Simple email regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            // Simple phone regex (digits, spaces, dashes, parentheses)
            const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
            
            return emailRegex.test(contact) || phoneRegex.test(contact.replace(/\s/g, ''));
        }

        async function checkBookingStatus(bookingId, contact) {
            // Hide all states
            hideAllStates();
            
            // Show loading with animation
            showElement('loadingState');
            
            try {
                // Clean booking ID (remove # if present)
                const cleanId = bookingId.replace(/[#\s]/g, '');
                
                console.log('Checking booking:', cleanId, 'with contact:', contact);
                
                const response = await fetch(`${baseURL}/api/admin/pages/booking-status.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        booking_id: cleanId,
                        contact: contact
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                console.log('API Response:', result);
                
                if (result.success && result.booking) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Show loading for at least 1 second
                    displayBookingStatus(result.booking);
                } else {
                    console.error('Booking not found:', result.error);
                    showErrorState(result.error || 'Booking not found');
                }
                
            } catch (error) {
                console.error('Error checking status:', error);
                showErrorState('Unable to check booking status. Please check your internet connection and try again.');
            } finally {
                hideElement('loadingState');
            }
        }

        function displayBookingStatus(booking) {
            const statusIcon = document.getElementById('statusIcon');
            const statusBadge = document.getElementById('statusBadge');
            const bookingInfo = document.getElementById('bookingInfo');
            
            if (!statusIcon || !statusBadge || !bookingInfo) {
                console.error('Required elements not found');
                return;
            }
            
            // Enhanced status configuration
            const statusConfig = {
                'Pending': {
                    icon: 'fas fa-clock text-amber-500',
                    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
                    text: 'Pending Confirmation',
                    message: 'Your booking is being processed. You\'ll receive confirmation soon.'
                },
                'Confirmed': {
                    icon: 'fas fa-check-circle text-green-500',
                    badge: 'bg-green-100 text-green-800 border border-green-200',
                    text: 'Confirmed',
                    message: 'Your booking is confirmed! Please arrive at the scheduled check-in time.'
                },
                'Checked-in': {
                    icon: 'fas fa-door-open text-blue-500',
                    badge: 'bg-blue-100 text-blue-800 border border-blue-200',
                    text: 'Checked In',
                    message: 'Welcome! You\'re currently checked in. Enjoy your stay!'
                },
                'Checked-out': {
                    icon: 'fas fa-flag-checkered text-purple-500',
                    badge: 'bg-purple-100 text-purple-800 border border-purple-200',
                    text: 'Checked Out',
                    message: 'Thank you for staying with us! We hope you had a wonderful experience.'
                },
                'Cancelled': {
                    icon: 'fas fa-times-circle text-red-500',
                    badge: 'bg-red-100 text-red-800 border border-red-200',
                    text: 'Cancelled',
                    message: 'This booking has been cancelled.'
                }
            };
            
            const config = statusConfig[booking.status] || statusConfig['Pending'];
            
            statusIcon.className = config.icon;
            statusBadge.className = `inline-block px-4 py-2 rounded-full text-sm font-semibold shadow-md ${config.badge}`;
            statusBadge.textContent = config.text;
            
            // Enhanced booking information display
            const checkinDate = new Date(booking.check_in_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const checkoutDate = new Date(booking.check_out_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Calculate stay duration
            const stayDuration = Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24));
            
            let serviceRequestsHTML = '';
            if (booking.service_requests && booking.service_requests.length > 0) {
                serviceRequestsHTML = `
                    <div class="bg-gray-50 rounded-xl p-4">
                        <h4 class="font-semibold text-gray-800 text-sm mb-3 flex items-center">
                            <i class="fas fa-concierge-bell mr-2 text-primary-500"></i>
                            Service Requests
                        </h4>
                        <div class="space-y-2">
                            ${booking.service_requests.map(service => `
                                <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                                    <div>
                                        <div class="text-sm font-medium text-gray-800">${service.request_type}</div>
                                        <div class="text-xs text-gray-600">${service.items || 'Processing...'}</div>
                                        <span class="text-xs px-2 py-1 bg-${service.request_status === 'Completed' ? 'green' : service.request_status === 'In Progress' ? 'blue' : 'yellow'}-100 text-${service.request_status === 'Completed' ? 'green' : service.request_status === 'In Progress' ? 'blue' : 'yellow'}-800 rounded-full">${service.request_status}</span>
                                    </div>
                                    <div class="text-sm font-semibold text-primary-600">₱${parseFloat(service.total || 0).toLocaleString()}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            bookingInfo.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div class="bg-white bg-opacity-60 rounded-xl p-4">
                        <div class="text-gray-600 text-xs uppercase tracking-wide mb-1">Booking ID</div>
                        <div class="font-mono text-lg font-bold text-gray-800">#${booking.reservation_id}</div>
                    </div>
                    
                    <div class="bg-white bg-opacity-60 rounded-xl p-4">
                        <div class="text-gray-600 text-xs uppercase tracking-wide mb-1">Guest Name</div>
                        <div class="font-semibold text-gray-800">${booking.first_name} ${booking.last_name}</div>
                        <div class="text-xs text-gray-600 mt-1">${booking.email || booking.phone_number}</div>
                    </div>
                    
                    <div class="bg-white bg-opacity-60 rounded-xl p-4">
                        <div class="text-gray-600 text-xs uppercase tracking-wide mb-1">Room Details</div>
                        <div class="font-semibold text-gray-800">${booking.room_info}</div>
                        <div class="text-xs text-gray-600 mt-1">${booking.guest_count} ${booking.guest_count > 1 ? 'guests' : 'guest'}</div>
                    </div>
                    
                    <div class="bg-white bg-opacity-60 rounded-xl p-4">
                        <div class="text-gray-600 text-xs uppercase tracking-wide mb-1">Stay Duration</div>
                        <div class="font-semibold text-gray-800">${stayDuration} ${stayDuration > 1 ? 'nights' : 'night'}</div>
                        <div class="text-xs text-gray-600 mt-1">Total Amount: <span class="font-semibold text-primary-600">₱${parseFloat(booking.total_amount || 0).toLocaleString()}</span></div>
                    </div>
                    
                    <div class="bg-white bg-opacity-60 rounded-xl p-4 sm:col-span-2">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div class="text-gray-600 text-xs uppercase tracking-wide mb-1 flex items-center">
                                    <i class="fas fa-calendar-check mr-2 text-green-500"></i>Check-in
                                </div>
                                <div class="font-semibold text-gray-800">${checkinDate}</div>
                            </div>
                            <div>
                                <div class="text-gray-600 text-xs uppercase tracking-wide mb-1 flex items-center">
                                    <i class="fas fa-calendar-times mr-2 text-red-500"></i>Check-out
                                </div>
                                <div class="font-semibold text-gray-800">${checkoutDate}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${booking.special_requests ? `
                <div class="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div class="text-gray-700 text-sm font-semibold mb-2 flex items-center">
                        <i class="fas fa-sticky-note mr-2 text-blue-500"></i>Special Requests
                    </div>
                    <div class="text-sm text-gray-700">${booking.special_requests}</div>
                </div>
                ` : ''}
                
                ${serviceRequestsHTML}
                
                <div class="bg-${config.text === 'Confirmed' ? 'green' : config.text === 'Pending' ? 'yellow' : config.text.includes('Checked') ? 'blue' : 'red'}-50 rounded-xl p-4 border border-${config.text === 'Confirmed' ? 'green' : config.text === 'Pending' ? 'yellow' : config.text.includes('Checked') ? 'blue' : 'red'}-200">
                    <div class="flex items-start space-x-3">
                        <i class="${config.icon} text-lg"></i>
                        <div>
                            <div class="font-semibold text-${config.text === 'Confirmed' ? 'green' : config.text === 'Pending' ? 'yellow' : config.text.includes('Checked') ? 'blue' : 'red'}-800 text-sm mb-1">Status Update</div>
                            <div class="text-sm text-${config.text === 'Confirmed' ? 'green' : config.text === 'Pending' ? 'yellow' : config.text.includes('Checked') ? 'blue' : 'red'}-700">${config.message}</div>
                        </div>
                    </div>
                </div>
            `;
            
            showElement('bookingStatus');
        }

        function showErrorState(message = 'Booking not found. Please check your booking ID and contact information, then try again.') {
            const errorElement = document.getElementById('errorState');
            const errorMessage = document.getElementById('errorMessage');
            
            if (errorElement) {
                if (errorMessage) {
                    errorMessage.textContent = message;
                }
                showElement('errorState');
            }
        }

        function showLookupForm() {
            hideAllStates();
            showElement('statusCheckForm');
            
            // Clear form and focus
            const bookingIdField = document.getElementById('bookingId');
            const contactField = document.getElementById('emailOrPhone');
            
            if (bookingIdField) {
                bookingIdField.value = '';
                bookingIdField.focus();
            }
            if (contactField) contactField.value = '';
        }

        function printBooking() {
            const bookingContent = document.getElementById('bookingStatus');
            if (!bookingContent) return;
            
            const printWindow = window.open('', '_blank');
            const styles = `
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 20px; 
                        line-height: 1.6;
                        color: #333;
                    }
                    .no-print, button { display: none !important; }
                    h1 { color: #2563eb; margin-bottom: 20px; text-align: center; }
                    .grid { display: block; margin-bottom: 15px; }
                    .grid > div { 
                        margin-bottom: 10px; 
                        padding: 10px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                    }
                    .font-medium, .font-semibold, .font-bold { font-weight: bold; }
                    .text-primary-600 { color: #2563eb; }
                    .bg-gray-50, .bg-blue-50, .bg-green-50, .bg-yellow-50, .bg-red-50 { 
                        background-color: #f9fafb; 
                        padding: 15px; 
                        margin: 15px 0;
                        border-radius: 8px;
                        border: 1px solid #e5e7eb;
                    }
                    .text-center { text-align: center; }
                    i { display: none; }
                    @media print {
                        body { print-color-adjust: exact; }
                    }
                </style>
            `;
            
            printWindow.document.write(`
                <html>
                <head>
                    <title>Hotel Booking Details</title>
                    ${styles}
                </head>
                <body>
                    <h1>🏨 Hotel Booking Details</h1>
                    <div style="border-top: 3px solid #2563eb; padding-top: 20px;">
                        ${bookingContent.innerHTML}
                    </div>
                    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                        <p>Thank you for choosing our hotel!</p>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            
            // Wait for content to load, then print
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }

        function showNotification(message, type = 'info') {
            // Remove existing notifications
            document.querySelectorAll('.notification').forEach(n => n.remove());

            const colors = {
                info: 'bg-blue-500 border-blue-600',
                success: 'bg-green-500 border-green-600',
                error: 'bg-red-500 border-red-600',
                warning: 'bg-amber-500 border-amber-600'
            };

            const icons = {
                info: 'fas fa-info-circle',
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle'
            };

            const notification = document.createElement('div');
            notification.className = `notification ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl border flex items-center max-w-md fixed top-4 right-4 z-50 transform transition-all duration-300 translate-x-full`;
            notification.innerHTML = `
                <i class="${icons[type]} mr-3 text-lg"></i>
                <span class="flex-1 font-medium">${message}</span>
                <button onclick="this.parentElement.remove()" class="ml-3 text-lg hover:text-opacity-75 transition-opacity">
                    <i class="fas fa-times"></i>
                </button>
            `;

            document.body.appendChild(notification);

            // Animate in
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 100);

            // Auto remove after 5 seconds with animation
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('translate-x-full');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 5000);
        }

        // Helper functions
        function hideAllStates() {
            const elements = ['statusCheckForm', 'bookingStatus', 'errorState', 'loadingState'];
            elements.forEach(id => hideElement(id));
        }

        function showElement(id) {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('hidden');
                element.classList.add('slide-in');
            }
        }

        function hideElement(id) {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
                element.classList.remove('slide-in');
            }
        }

        // Enhanced form validation with real-time feedback
        function setupFormValidation() {
            const bookingId = document.getElementById('bookingId');
            const emailOrPhone = document.getElementById('emailOrPhone');
            const submitBtn = document.getElementById('submitBtn');

            function validateForm() {
                const isBookingIdValid = bookingId.value.trim().length > 0;
                const isContactValid = isValidContact(emailOrPhone.value.trim());
                
                // Visual feedback
                bookingId.classList.toggle('border-red-300', !isBookingIdValid && bookingId.value.length > 0);
                bookingId.classList.toggle('border-green-300', isBookingIdValid);
                
                emailOrPhone.classList.toggle('border-red-300', !isContactValid && emailOrPhone.value.length > 0);
                emailOrPhone.classList.toggle('border-green-300', isContactValid);
                
                // Enable/disable submit button
                const isFormValid = isBookingIdValid && isContactValid;
                submitBtn.disabled = !isFormValid;
                submitBtn.classList.toggle('opacity-50', !isFormValid);
                submitBtn.classList.toggle('cursor-not-allowed', !isFormValid);
                
                return isFormValid;
            }

            bookingId.addEventListener('input', validateForm);
            emailOrPhone.addEventListener('input', validateForm);
            
            // Initial validation
            validateForm();
        }

        // Initialize form validation when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            setupFormValidation();
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Escape key to go back to form
            if (e.key === 'Escape') {
                const currentState = document.querySelector('#bookingStatus:not(.hidden), #errorState:not(.hidden)');
                if (currentState) {
                    showLookupForm();
                }
            }
            
            // Enter key in form fields
            if (e.key === 'Enter' && e.target.matches('#bookingId, #emailOrPhone')) {
                e.preventDefault();
                const form = document.getElementById('bookingForm');
                if (form) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });

        // Add loading timeout protection
        let loadingTimeout;
        
        function startLoadingTimeout() {
            loadingTimeout = setTimeout(() => {
                hideElement('loadingState');
                showErrorState('Request timed out. Please check your internet connection and try again.');
            }, 30000); // 30 second timeout
        }
        
        function clearLoadingTimeout() {
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                loadingTimeout = null;
            }
        }

        // Enhanced error handling for network issues
        window.addEventListener('online', function() {
            showNotification('Connection restored', 'success');
        });

        window.addEventListener('offline', function() {
            showNotification('You appear to be offline. Please check your internet connection.', 'warning');
        });

        // Add smooth scroll to top when switching states
        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Override existing functions to include new features
        const originalCheckBookingStatus = checkBookingStatus;
        checkBookingStatus = async function(bookingId, contact) {
            startLoadingTimeout();
            scrollToTop();
            
            try {
                await originalCheckBookingStatus(bookingId, contact);
            } finally {
                clearLoadingTimeout();
            }
        };

        // Add analytics/tracking (placeholder)
        function trackEvent(action, details = {}) {
            console.log('Analytics Event:', action, details);
            // Here you could integrate with Google Analytics, Mixpanel, etc.
        }

        // Track form submissions
        document.getElementById('bookingForm')?.addEventListener('submit', function() {
            trackEvent('booking_status_search', {
                timestamp: new Date().toISOString()
            });
        });