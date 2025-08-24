// Enhanced Front Desk Dashboard Manager with Fixed Navigation
class FrontDeskManager {
    constructor() {
        this.baseURL = window.location.origin + '/reservation';
        this.currentView = 'dashboard';
        this.dashboardStats = {};
        
        // Configure request defaults
        this.setupHttpClient();
        this.init();
    }
    
    setupHttpClient() {
        // Set up fetch defaults
        this.fetchDefaults = {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        };
        
        // Configure axios if available
        if (typeof axios !== 'undefined') {
            axios.defaults.withCredentials = true;
            axios.defaults.headers.common['Content-Type'] = 'application/json';
            axios.defaults.headers.common['Accept'] = 'application/json';
            
            // Add response interceptor for error handling
            axios.interceptors.response.use(
                response => response,
                error => {
                    console.error('Axios Error:', error);
                    if (error.response?.status === 401) {
                        this.redirectToLogin();
                    }
                    return Promise.reject(error);
                }
            );
        }
    }
    
    async init() {
        try {
            console.log('Initializing Front Desk Manager...');
            
            // Check authentication first
            const auth = await this.checkAuthentication();
            if (!auth) return;
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial dashboard data
            await this.loadDashboardData();
            
            // Setup periodic refresh (every 5 minutes)
            this.setupPeriodicRefresh();
            
            console.log('Front desk manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize front desk manager:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }
    
    async checkAuthentication() {
        try {
            const response = await this.makeRequest('/api/auth/check.php', 'GET');
            
            if (!response.authenticated) {
                this.redirectToLogin();
                return false;
            }
            
            // Update staff name in UI
            this.updateStaffInfo(response.user);
            return true;
            
        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToLogin();
            return false;
        }
    }
    
    redirectToLogin() {
        console.log('Redirecting to login...');
        window.location.href = `${this.baseURL}/html/auth/login.html`;
    }
    
    updateStaffInfo(user) {
        const staffNameEl = document.getElementById('staffName');
        if (staffNameEl && user) {
            const userName = user.name || 
                `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                'Front Desk Staff';
            staffNameEl.textContent = userName;
        }
    }
    
    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');
            this.setDashboardLoading(true);
            
            const data = await this.makeRequest('/api/frontdesk/dashboard.php', 'GET');
            
            console.log('Dashboard API response:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load dashboard data');
            }
            
            // Store stats for report submission
            this.dashboardStats = {
                total_reservations: data.total_reservations || 0,
                checkins_today: data.checkins_today || 0,
                checkouts_today: data.checkouts_today || 0,
                revenue_today: data.revenue_today || 0,
                unpaid_balance: data.unpaid_balance || 0,
                available_rooms: data.available_rooms || 0,
                occupied_rooms: data.occupied_rooms || 0,
                maintenance_rooms: data.maintenance_rooms || 0,
                total_rooms: data.total_rooms || 0
            };
            
            // Update dashboard display
            this.updateDashboardStats(this.dashboardStats);
            this.updateRecentActivities(
                data.recent_reservations || [], 
                data.pending_payments || []
            );
            
            this.setDashboardLoading(false);
            console.log('Dashboard data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
            
            // Set default values on error
            this.dashboardStats = {
                total_reservations: 0,
                checkins_today: 0,
                checkouts_today: 0,
                revenue_today: 0,
                unpaid_balance: 0,
                available_rooms: 0,
                occupied_rooms: 0,
                maintenance_rooms: 0,
                total_rooms: 0
            };
            
            this.updateDashboardStats(this.dashboardStats);
            this.updateRecentActivities([], []);
            this.setDashboardLoading(false);
        }
    }
    
    setDashboardLoading(isLoading) {
        const loadingElements = [
            'statTotalReservations',
            'statCheckinsToday', 
            'statRevenueToday',
            'statUnpaidBalance'
        ];
        
        loadingElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (isLoading) {
                    element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                }
            }
        });
    }
    
    updateDashboardStats(data) {
        const updates = {
            statTotalReservations: data.total_reservations || 0,
            statCheckinsToday: data.checkins_today || 0,
            statRevenueToday: `₱${parseFloat(data.revenue_today || 0).toLocaleString()}`,
            statUnpaidBalance: `₱${parseFloat(data.unpaid_balance || 0).toLocaleString()}`
        };
        
        Object.entries(updates).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
            }
        });
        
        console.log('Dashboard stats updated:', updates);
    }
    
    updateRecentActivities(recentReservations, pendingPayments) {
        console.log('Updating recent activities:', { recentReservations, pendingPayments });
        
        // Update recent reservations
        const recentReservationsEl = document.getElementById('recentReservations');
        if (recentReservationsEl) {
            if (!recentReservations || recentReservations.length === 0) {
                recentReservationsEl.innerHTML = '<p class="text-center text-gray-500 py-4">No recent reservations</p>';
            } else {
                recentReservationsEl.innerHTML = recentReservations.map(res => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                        <div>
                            <div class="font-medium text-gray-900">${this.escapeHtml(res.customer_name || 'Walk-in Guest')}</div>
                            <div class="text-sm text-gray-500">Room ${res.room_number || 'N/A'} • ${this.escapeHtml(res.status_name || 'Unknown')}</div>
                        </div>
                        <div class="text-sm text-gray-500">
                            ${res.created_at ? new Date(res.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Update pending payments
        const pendingPaymentsEl = document.getElementById('pendingPayments');
        if (pendingPaymentsEl) {
            if (!pendingPayments || pendingPayments.length === 0) {
                pendingPaymentsEl.innerHTML = '<p class="text-center text-gray-500 py-4">No pending payments</p>';
            } else {
                pendingPaymentsEl.innerHTML = pendingPayments.map(inv => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                        <div>
                            <div class="font-medium text-gray-900">${this.escapeHtml(inv.customer_name || 'Walk-in Guest')}</div>
                            <div class="text-sm text-gray-500">${this.escapeHtml(inv.invoice_number || 'N/A')}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-medium text-red-600">₱${parseFloat(inv.balance || 0).toLocaleString()}</div>
                            <div class="text-xs text-gray-500">${this.escapeHtml(inv.payment_status || 'Pending')}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }
    
    setupEventListeners() {
        // FIXED: Handle navigation links properly based on their href attributes
        // Let the default navigation work for links with href attributes
        // Only prevent default for links that need special handling
        
        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        // Report submission
        const sendReportBtn = document.getElementById('sendReportBtn');
        if (sendReportBtn) {
            sendReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openReportModal();
            });
        }
        
        // Dashboard refresh
        const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadDashboardData();
            });
        }
        
        // Report modal event listeners
        this.setupReportModalListeners();
        
        // Quick action buttons
        this.setupQuickActionListeners();
    }
    
    setupReportModalListeners() {
        // Submit report button
        const submitReportBtn = document.getElementById('submitReportBtn');
        if (submitReportBtn) {
            submitReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitReport();
            });
        }
        
        // Cancel report button
        const cancelReportBtn = document.getElementById('cancelReportBtn');
        if (cancelReportBtn) {
            cancelReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeReportModal();
            });
        }
        
        // Close modal on backdrop click
        const reportModal = document.getElementById('reportModal');
        if (reportModal) {
            reportModal.addEventListener('click', (e) => {
                if (e.target === reportModal) {
                    this.closeReportModal();
                }
            });
        }
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('reportModal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.closeReportModal();
                }
            }
        });
    }
    
    setupQuickActionListeners() {
        // FIXED: Use direct navigation instead of trying to switch views
        const quickButtons = document.querySelectorAll('[onclick*="window.location.href"]');
        // Let these buttons work with their existing onclick handlers
        
        const quickCheckinBtn = document.getElementById('quickCheckinBtn');
        if (quickCheckinBtn) {
            quickCheckinBtn.addEventListener('click', () => {
                window.location.href = 'reservations.html';
            });
        }
        
        const quickCheckoutBtn = document.getElementById('quickCheckoutBtn');
        if (quickCheckoutBtn) {
            quickCheckoutBtn.addEventListener('click', () => {
                window.location.href = 'reservations.html';
            });
        }
    }
    
    openReportModal() {
        const modal = document.getElementById('reportModal');
        if (!modal) {
            console.error('Report modal not found');
            return;
        }
        
        // Reset form
        const formElements = [
            'reportSummary',
            'reportNotes', 
            'reportIssues',
            'reportRecommendations'
        ];
        
        formElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        // Clear any previous errors
        this.clearFormErrors();
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus on summary field
        setTimeout(() => {
            const summaryField = document.getElementById('reportSummary');
            if (summaryField) {
                summaryField.focus();
            }
        }, 100);
    }
    
    closeReportModal() {
        const modal = document.getElementById('reportModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }, 300);
        }
    }
    
    clearFormErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500');
            el.classList.add('border-gray-300');
        });
    }
    
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('border-red-500');
            field.classList.remove('border-gray-300');
            
            // Add error message
            const errorEl = document.createElement('p');
            errorEl.className = 'error-message text-red-500 text-sm mt-1';
            errorEl.textContent = message;
            field.parentNode.appendChild(errorEl);
        }
    }
    
    async submitReport() {
        try {
            console.log('Starting report submission...');
            
            // Clear previous errors
            this.clearFormErrors();
            
            // Get form data
            const summary = document.getElementById('reportSummary')?.value?.trim() || '';
            const notes = document.getElementById('reportNotes')?.value?.trim() || '';
            const issues = document.getElementById('reportIssues')?.value?.trim() || '';
            const recommendations = document.getElementById('reportRecommendations')?.value?.trim() || '';
            
            // Validation
            if (!summary) {
                this.showFieldError('reportSummary', 'Please provide a summary for the report');
                return;
            }
            
            if (summary.length < 10) {
                this.showFieldError('reportSummary', 'Summary must be at least 10 characters long');
                return;
            }
            
            // Show loading state
            const submitBtn = document.getElementById('submitReportBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
            submitBtn.disabled = true;
            
            // Prepare comprehensive report data
            const reportData = {
                summary: summary,
                details: {
                    daily_notes: notes,
                    issues_encountered: issues,
                    recommendations: recommendations,
                    submission_metadata: {
                        submitted_at: new Date().toISOString(),
                        dashboard_stats: this.dashboardStats,
                        user_agent: navigator.userAgent,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                }
            };
            
            console.log('Submitting report data:', reportData);
            
            // Submit to API
            const response = await this.makeRequest('/api/frontdesk/reports.php', 'POST', reportData);
            
            console.log('API response:', response);
            
            if (!response.success) {
                throw new Error(response.error || response.message || 'Failed to submit report');
            }
            
            // Success handling
            this.showSuccess(`Report ${response.action || 'submitted'} successfully! (ID: ${response.report_id})`);
            this.closeReportModal();
            
            // Optionally refresh dashboard
            setTimeout(() => {
                this.loadDashboardData();
            }, 1000);
            
        } catch (error) {
            console.error('Failed to submit report:', error);
            this.showError('Failed to submit report: ' + error.message);
        } finally {
            // Reset button state
            const submitBtn = document.getElementById('submitReportBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Report';
                submitBtn.disabled = false;
            }
        }
    }
    
    setupPeriodicRefresh() {
        // Refresh dashboard every 5 minutes
        setInterval(() => {
            if (this.currentView === 'dashboard') {
                console.log('Performing periodic dashboard refresh...');
                this.loadDashboardData();
            }
        }, 5 * 60 * 1000);
    }
    
    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}`;
        console.log(`Making ${method} request to:`, url);
        
        try {
            const options = {
                method: method,
                ...this.fetchDefaults
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP ${response.status} Error:`, errorText);
                throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 200)}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Server returned invalid response format');
            }
            
            const result = await response.json();
            console.log('Request successful:', result);
            return result;
            
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }
    
    async handleLogout() {
        try {
            console.log('Logging out...');
            await this.makeRequest('/api/auth/logout.php', 'POST');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.redirectToLogin();
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Notification Methods
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification-toast').forEach(el => el.remove());
        
        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };
        
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-exclamation-circle'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification-toast fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded-lg shadow-lg z-50 max-w-md border flex items-start transform transition-all duration-300 translate-x-full`;
        
        notification.innerHTML = `
            <i class="${icons[type]} mr-3 mt-0.5 flex-shrink-0"></i>
            <span class="flex-1">${this.escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()" class="ml-4 text-lg hover:opacity-70 flex-shrink-0">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after appropriate time
        const autoRemoveTime = type === 'error' ? 8000 : 5000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, autoRemoveTime);
    }
}

// Initialize when DOM is ready
let frontDeskManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Front Desk Manager...');
    try {
        frontDeskManager = new FrontDeskManager();
        
        // Make globally available for debugging
        window.frontDeskManager = frontDeskManager;
        
        console.log('Front Desk Manager initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Front Desk Manager:', error);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    // Cleanup if needed
    console.log('Front Desk Manager cleanup on page unload');
});