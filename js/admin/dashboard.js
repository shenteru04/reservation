// Enhanced Dashboard Manager extending BaseManager

class DashboardManager extends BaseManager {
    constructor() {
        super('DashboardManager');
        this.refreshInterval = null;
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing dashboard...');
            
            // Check authentication
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Set current date
            this.setCurrentDate();
            
            // Load dashboard data with retry mechanism
            await this.loadDashboardDataWithRetry();
            
            // Set up common event listeners
            this.setupCommonEventListeners();
            
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
                    this.setDefaultStats();
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
            this.setLoadingState('dashboardContent', true, 'Loading dashboard data...');
            
            // Try multiple possible dashboard endpoints
            const possiblePaths = [
                '/api/admin/dashboard.php',
                '/api/dashboard.php',
                '../api/admin/dashboard.php'
            ];
            
            let response;
            let lastError;
            
            for (const path of possiblePaths) {
                try {
                    console.log('Trying dashboard endpoint:', path);
                    response = await this.api.get(path);
                    console.log('Dashboard endpoint successful:', path);
                    break;
                } catch (error) {
                    console.log(`Dashboard endpoint ${path} failed:`, error.response?.status);
                    lastError = error;
                    continue;
                }
            }
            
            if (!response) {
                throw lastError || new Error('All dashboard endpoints failed');
            }
            
            const data = response.data;
            
            if (!data.success && data.success !== undefined) {
                throw new Error(data.error || 'API returned unsuccessful response');
            }
            
            // Process and update dashboard data
            const processedData = this.processApiResponse(data);
            this.updateDashboardStats(processedData);
            this.updateRecentCheckIns(processedData.recentCheckins || []);
            
            // Hide loading state
            this.setLoadingState('dashboardContent', false);
            
            console.log('Dashboard data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.setLoadingState('dashboardContent', false);
            throw error;
        }
    }
    
    processApiResponse(data) {
        return {
            occupiedRooms: data.occupiedRooms || 0,
            totalRooms: data.totalRooms || 50,
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
    
    updateDashboardStats(data) {
        // Update main stats
        this.animateCounter('occupiedRooms', data.occupiedRooms || 0);
        this.animateCounter('totalRooms', data.totalRooms || 0);
        this.animateCounter('availableRooms', data.availableRooms || 0);
        this.animateCounter('todaysCheckins', data.todaysCheckins || 0);
        this.animateCounter('pendingReservations', data.pendingReservations || 0);
        
        // Update revenue
        const todaysRevenueEl = document.getElementById('todaysRevenue');
        if (todaysRevenueEl) {
            todaysRevenueEl.textContent = this.formatCurrency(data.todaysRevenue || 0);
        }
        
        // Update occupancy rate
        const occupancyRateEl = document.getElementById('occupancyRate');
        if (occupancyRateEl && data.totalRooms > 0) {
            const rate = ((data.occupiedRooms || 0) / data.totalRooms * 100).toFixed(1);
            occupancyRateEl.textContent = rate + '%';
        }
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
        const tbody = document.getElementById('roomsOverview');
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
            
            const checkInDate = this.formatDate(checkin.check_in_date, {
                month: 'short',
                day: 'numeric'
            });
            
            const amount = this.formatCurrency(checkin.total_amount || 0);
            
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
                    ${amount}
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    // Manual refresh method
    async refresh() {
        console.log('Manual refresh requested');
        await this.loadDashboardDataWithRetry();
        this.showSuccess('Dashboard refreshed successfully');
    }
    
    // Cleanup method
    destroy() {
        super.destroy();
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
    const refreshButtons = document.querySelectorAll('[data-action="refresh"]');
    refreshButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            if (dashboardManager) {
                dashboardManager.refresh();
            }
        });
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboardManager) {
        dashboardManager.destroy();
    }
});

// Utility functions
window.DashboardUtils = {
    formatDate: (dateString) => dashboardManager?.formatDate(dateString),
    formatCurrency: (amount) => dashboardManager?.formatCurrency(amount),
    showNotification: (message, type = 'info') => dashboardManager?.showNotification(message, type),
    refreshDashboard: () => dashboardManager?.refresh()
};