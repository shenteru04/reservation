// js/admin/base-manager.js - Base Manager Class with Common Functionality
class BaseManager {
    constructor(moduleName = 'BaseManager') {
        this.moduleName = moduleName;
        this.baseURL = this.constructBaseURL();
        this.setupAxios();
        console.log(`${this.moduleName} - Base URL:`, this.baseURL);
    }
    
    constructBaseURL() {
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        
        if (pathname.includes('/reservation')) {
            return origin + '/reservation';
        }
        
        if (pathname.includes('/admin')) {
            const pathParts = pathname.split('/');
            const reservationIndex = pathParts.findIndex(part => part === 'reservation');
            if (reservationIndex !== -1) {
                return origin + pathParts.slice(0, reservationIndex + 1).join('/');
            }
        }
        
        return origin + '/reservation';
    }
    
    setupAxios() {
        // Create a new axios instance for this manager
        this.api = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        // Request interceptor
        this.api.interceptors.request.use(
            config => {
                console.log(`${this.moduleName} - API Request:`, config.method?.toUpperCase(), config.url);
                return config;
            },
            error => {
                console.error(`${this.moduleName} - Request Error:`, error);
                return Promise.reject(error);
            }
        );
        
        // Response interceptor
        this.api.interceptors.response.use(
            response => {
                console.log(`${this.moduleName} - API Response:`, response.status, response.config.url);
                return response;
            },
            error => {
                console.error(`${this.moduleName} - Response Error:`, error.response?.status, error.message);
                
                if (error.response?.status === 401) {
                    this.handleUnauthorized();
                }
                
                return Promise.reject(error);
            }
        );
    }
    
    handleUnauthorized() {
        console.log(`${this.moduleName} - Unauthorized access, redirecting to login`);
        window.location.href = `${this.baseURL}/html/auth/login.html`;
    }
    
    async checkAuthentication() {
        try {
            const response = await this.api.get('/api/auth/check.php');
            const result = response.data;
            
            if (!result.authenticated) {
                this.handleUnauthorized();
                return false;
            }
            
            // Update admin name in sidebar
            this.updateAdminName(result.user);
            
            console.log(`${this.moduleName} - Authentication successful:`, result.user?.email);
            return true;
            
        } catch (error) {
            console.error(`${this.moduleName} - Auth check failed:`, error);
            this.handleUnauthorized();
            return false;
        }
    }
    
    updateAdminName(user) {
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl && user) {
            const userName = user.name || 
                `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                'Admin User';
            adminNameEl.textContent = userName;
        }
    }
    
    async handleLogout() {
        try {
            console.log(`${this.moduleName} - Logging out...`);
            
            await this.api.post('/api/auth/logout.php');
            
            // Redirect to login page
            window.location.href = `${this.baseURL}/html/auth/login.html`;
            
        } catch (error) {
            console.error(`${this.moduleName} - Logout error:`, error);
            // Force redirect even if logout request fails
            window.location.href = `${this.baseURL}/html/auth/login.html`;
        }
    }
    
    // Notification methods
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
        const colors = {
            info: 'bg-blue-100 border-blue-400 text-blue-700',
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700'
        };
        
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-exclamation-circle'
        };
        
        // Remove existing notifications of the same type
        const existingNotifications = document.querySelectorAll(`.notification-${type}`);
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification-${type} fixed top-4 right-4 ${colors[type]} px-4 py-3 rounded-lg shadow-lg z-50 max-w-md border transition-all transform translate-x-0`;
        
        notification.innerHTML = `
            <div class="flex items-start">
                <i class="fas ${icons[type]} mr-3 mt-1 flex-shrink-0"></i>
                <div class="flex-1">
                    <p class="text-sm whitespace-pre-line">${this.escapeHtml(message)}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="ml-3 text-current hover:opacity-75 flex-shrink-0">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto-remove based on message length and type
        const duration = type === 'error' ? 8000 : type === 'warning' ? 6000 : 5000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
    // Modal helper methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    }
    
    // Loading state methods
    setLoadingState(elementId, isLoading, loadingText = 'Loading...') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (isLoading) {
            element.dataset.originalContent = element.innerHTML;
            element.innerHTML = `
                <div class="flex items-center justify-center py-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span class="text-sm text-gray-600">${loadingText}</span>
                </div>
            `;
        } else {
            if (element.dataset.originalContent) {
                element.innerHTML = element.dataset.originalContent;
                delete element.dataset.originalContent;
            }
        }
    }
    
    // Format currency helper
    formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return '₱' + num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    // Format date helper
    formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }
    
    // Get form data helper
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // Handle checkboxes
            if (form.querySelector(`[name="${key}"]`)?.type === 'checkbox') {
                data[key] = form.querySelector(`[name="${key}"]`).checked;
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }
    
    // Validate form helper
    validateRequired(formId, requiredFields) {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        const errors = [];
        
        requiredFields.forEach(field => {
            const element = form.querySelector(`[name="${field}"]`);
            if (!element) {
                errors.push(`Field ${field} not found`);
                return;
            }
            
            if (element.type === 'checkbox') {
                // For checkboxes, we might not require them to be checked
                return;
            }
            
            const value = element.value?.trim();
            if (!value) {
                errors.push(`${field.replace('_', ' ')} is required`);
                element.classList.add('border-red-500');
            } else {
                element.classList.remove('border-red-500');
            }
        });
        
        if (errors.length > 0) {
            this.showError('Please fix the following errors:\n' + errors.join('\n'));
            return false;
        }
        
        return true;
    }
    
    // Setup common event listeners
    setupCommonEventListeners() {
        // Logout functionality
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
        
        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                const modal = e.target;
                this.hideModal(modal.id);
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.modal:not(.hidden)');
                openModals.forEach(modal => {
                    this.hideModal(modal.id);
                });
            }
        });
    }
    
    // Cleanup method
    destroy() {
        console.log(`${this.moduleName} - Cleaning up...`);
        
        // Cancel any pending requests
        if (this.api) {
            // Axios doesn't have a direct way to cancel all requests,
            // but we can create a cancel token for future use
        }
        
        // Clear intervals/timeouts if any
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Remove event listeners if needed
        document.removeEventListener('keydown', this.handleEscapeKey);
    }
}