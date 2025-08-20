// js/admin/dashboard.js - Fixed Dashboard functionality
class DashboardManager {
    constructor() {
        // More flexible base URL construction
        this.baseURL = this.constructBaseURL();
        this.refreshInterval = null;
        this.init();
    }
    
    constructBaseURL() {
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        
        // If we're already in a reservation subdirectory, don't add it again
        if (pathname.includes('/reservation')) {
            return origin + '/reservation';
        }
        
        // Check if we're in an admin folder
        if (pathname.includes('/admin')) {
            // Go up to find reservation root
            const pathParts = pathname.split('/');
            const reservationIndex = pathParts.findIndex(part => part === 'reservation');
            if (reservationIndex !== -1) {
                return origin + pathParts.slice(0, reservationIndex + 1).join('/');
            }
        }
        
        // Default fallback
        return origin + '/reservation';
    }
    
    async init() {
        try {
            console.log('Initializing dashboard with baseURL:', this.baseURL);
            
            // First check authentication
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Set current date
            this.setCurrentDate();
            
            // Load dashboard data with retry mechanism
            await this.loadDashboardDataWithRetry();
            
            // Set up logout handler
            this.setupLogoutHandler();
            
            // Set up refresh interval (every 5 minutes)
            this.refreshInterval = setInterval(() => {
                console.log('Auto-refreshing dashboard data...');
                this.loadDashboardData();
            }, 5 * 60 * 1000);
            
            console.log('Dashboard initialized successfully');
            
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }
    
    async checkAuthentication() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/check.php`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.authenticated || result.user.role !== 'admin') {
                window.location.href = `${this.baseURL}/html/auth/login.html`;
                return false;
            }
            
            // Update admin name
            const adminNameEl = document.getElementById('adminName');
            if (adminNameEl && result.user) {
                const userName = result.user.name || 
                    `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim() || 
                    'Admin User';
                adminNameEl.textContent = userName;
            }
            
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = `${this.baseURL}/html/auth/login.html`;
            return false;
        }
    }
    
    setCurrentDate() {
        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
            };
            currentDateEl.textContent = now.toLocaleDateString('en-US', options);
        }
    }
    
    async loadDashboardDataWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Loading dashboard data (attempt ${attempt}/${maxRetries})`);
                await this.loadDashboardData();
                return; // Success, exit retry loop
            } catch (error) {
                console.error(`Dashboard data load attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) {
                    this.showError(`Failed to load dashboard data after ${maxRetries} attempts. Please check your server configuration.`);
                    this.setDefaultStats(); // Set zeros instead of mock data
                } else {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
    }
    
    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');
            
            // Show loading state
            this.setLoadingState(true);
            
            // Try multiple possible dashboard endpoints
            const possiblePaths = [
                `${this.baseURL}/api/admin/dashboard.php`,
                `${this.baseURL}/api/dashboard.php`,
                `/reservation/api/admin/dashboard.php`,
                `/api/admin/dashboard.php`,
                `./api/admin/dashboard.php`,
                `../api/admin/dashboard.php`,
                `../../api/admin/dashboard.php`
            ];
            
            let response;
            let successPath;
            let lastError;
            
            for (const path of possiblePaths) {
                try {
                    console.log('Trying dashboard endpoint:', path);
                    response = await fetch(path, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache',
                            'Accept': 'application/json'
                        },
                        credentials: 'same-origin'
                    });
                    
                    if (response.ok) {
                        console.log('Dashboard endpoint successful:', path);
                        successPath = path;
                        break;
                    } else {
                        console.log(`Dashboard endpoint ${path} returned:`, response.status, response.statusText);
                        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } catch (error) {
                    console.log('Dashboard endpoint error:', path, error.message);
                    lastError = error;
                    continue;
                }
            }
            
            if (!response || !response.ok) {
                throw lastError || new Error('All dashboard endpoints failed');
            }
            
            const responseText = await response.text();
            console.log('Dashboard raw response:', responseText.substring(0, 200));
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text:', responseText);
                throw new Error('Invalid JSON response from server');
            }
            
            if (!data.success && data.success !== undefined) {
                throw new Error(data.error || data.message || 'API returned unsuccessful response');
            }
            
            console.log('Dashboard data loaded successfully:', data);
            
            // Handle different response formats
            const processedData = this.processApiResponse(data);
            
            // Update dashboard stats and recent check-ins
            this.updateDashboardStats(processedData);
            this.updateRecentCheckIns(processedData.recentCheckins || []);
            
            // Hide loading state
            this.setLoadingState(false);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            throw error; // Re-throw to be handled by retry mechanism
        }
    }
    
    processApiResponse(data) {
        // Handle the actual API response format from your dashboard.php
        return {
            occupiedRooms: data.occupiedRooms || 0,
            totalRooms: data.totalRooms || 50, // You may need to add this to your API
            availableRooms: (data.totalRooms || 50) - (data.occupiedRooms || 0),
            todaysCheckins: data.todaysCheckins || 0,
            todaysRevenue: data.todaysRevenue || 0,
            pendingReservations: data.pendingReservations || 0,
            recentCheckins: data.recentCheckins || []
        };
    }
    
    setDefaultStats() {
        const defaultValues = {
            occupiedRooms: 0,
            totalRooms: 0,
            availableRooms: 0,
            todaysCheckins: 0,
            todaysRevenue: 0,
            pendingReservations: 0
        };
        
        this.updateDashboardStats(defaultValues);
        this.updateRecentCheckIns([]);
    }
    
    setLoadingState(isLoading) {
        const loadingElements = [
            'occupiedRooms',
            'totalRooms',
            'availableRooms',
            'todaysCheckins',
            'pendingReservations'
        ];
        
        loadingElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (isLoading) {
                    element.innerHTML = '<div class="loading-spinner"></div>';
                }
            }
        });
        
        const todaysRevenueEl = document.getElementById('todaysRevenue');
        if (todaysRevenueEl && isLoading) {
            todaysRevenueEl.innerHTML = '<div class="loading-spinner"></div>';
        }
        
        const recentCheckInsEl = document.getElementById('roomsOverview'); // Reuse table
        if (recentCheckInsEl && isLoading) {
            recentCheckInsEl.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        <div class="loading-spinner mx-auto mb-2"></div>
                        <p class="mt-2">Loading recent check-ins...</p>
                    </td>
                </tr>
            `;
        }
    }
    
    updateDashboardStats(data) {
        // Update main stats based on your API response
        this.animateCounter('occupiedRooms', data.occupiedRooms || 0);
        this.animateCounter('totalRooms', data.totalRooms || 0);
        this.animateCounter('availableRooms', data.availableRooms || 0);
        
        // Update additional stats from your API
        const todaysCheckinsEl = document.getElementById('todaysCheckins');
        if (todaysCheckinsEl) {
            this.animateCounter('todaysCheckins', data.todaysCheckins || 0);
        }
        
        const todaysRevenueEl = document.getElementById('todaysRevenue');
        if (todaysRevenueEl) {
            const revenue = data.todaysRevenue || 0;
            todaysRevenueEl.textContent = '₱' + parseFloat(revenue).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        const pendingReservationsEl = document.getElementById('pendingReservations');
        if (pendingReservationsEl) {
            this.animateCounter('pendingReservations', data.pendingReservations || 0);
        }
        
        // Update occupancy rate
        const occupancyRateEl = document.getElementById('occupancyRate');
        if (occupancyRateEl && data.totalRooms > 0) {
            const rate = ((data.occupiedRooms || 0) / data.totalRooms * 100).toFixed(1);
            occupancyRateEl.textContent = rate + '%';
        }
        
        console.log('Dashboard stats updated successfully');
    }
    
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue === targetValue) {
            element.textContent = targetValue;
            return;
        }
        
        const increment = targetValue > currentValue ? 1 : -1;
        const duration = Math.min(Math.abs(targetValue - currentValue) * 50, 1000);
        const stepTime = Math.max(duration / Math.abs(targetValue - currentValue), 10);
        
        let current = currentValue;
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if (current === targetValue) {
                clearInterval(timer);
            }
        }, stepTime);
    }
    
    updateRecentCheckIns(checkIns) {
        const tbody = document.getElementById('roomsOverview'); // Reuse this table or create new one
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!checkIns || checkIns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        No recent check-ins found
                    </td>
                </tr>
            `;
            return;
        }
        
        checkIns.forEach(checkin => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            // Format check-in date
            const checkInDate = new Date(checkin.check_in_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            
            // Format amount
            const amount = parseFloat(checkin.total_amount || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${checkin.customer_name || 'Guest'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Room ${checkin.room_number || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${checkin.room_type || 'Standard'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${checkInDate}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₱${amount}
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        console.log('Recent check-ins updated:', checkIns.length, 'entries');
    }
    
    setupLogoutHandler() {
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
    }
    
    async handleLogout() {
        try {
            console.log('Logging out...');
            
            // Clear refresh interval
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            
            // Try to call logout endpoint
            try {
                await fetch(`${this.baseURL}/api/auth/logout.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin'
                });
            } catch (error) {
                console.log('Logout request failed, but proceeding with redirect');
            }
            
            // Redirect to login page
            window.location.href = `${this.baseURL}/html/auth/login.html`;
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout request fails
            window.location.href = '/reservation/html/auth/login.html';
        }
    }
    
    viewRoomDetails(roomId) {
        // Navigate to rooms page with specific room selected
        window.location.href = `rooms.html?room=${roomId}`;
    }
    
    showError(message, type = 'error') {
        console.error('Dashboard Error:', message);
        
        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };
        
        // Create or update error notification
        let errorDiv = document.getElementById('dashboard-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'dashboard-error';
            errorDiv.className = `fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded shadow-lg z-50 max-w-md border`;
            document.body.appendChild(errorDiv);
        } else {
            errorDiv.className = `fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded shadow-lg z-50 max-w-md border`;
        }
        
        const icon = type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle';
        
        errorDiv.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-${icon} mr-2 mt-1 flex-shrink-0"></i>
                <div class="flex-1">
                    <p class="text-sm">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 hover:opacity-75 flex-shrink-0">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 8000);
    }
    
    // Method to manually refresh dashboard
    async refresh() {
        console.log('Manual refresh requested');
        await this.loadDashboardDataWithRetry();
    }
    
    // Cleanup method
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Initialize dashboard when DOM is loaded
let dashboardManager;

document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new DashboardManager();
    
    // Make dashboardManager globally accessible
    window.dashboardManager = dashboardManager;
    
    // Add refresh button functionality
    const refreshButtons = document.querySelectorAll('[onclick*="location.reload"]');
    refreshButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        newButton.removeAttribute('onclick');
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (dashboardManager) {
                dashboardManager.refresh();
            }
        });
        button.parentNode.replaceChild(newButton, button);
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboardManager) {
        dashboardManager.destroy();
    }
});

// Add utility functions for other scripts
window.DashboardUtils = {
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    showNotification: (message, type = 'info') => {
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
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4">
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
    },
    
    // Method to get fresh dashboard data
    refreshDashboard: () => {
        if (dashboardManager) {
            dashboardManager.refresh();
        }
    }
};