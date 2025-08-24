class AuthService {
    static baseURL = window.location.origin + '/reservation';
    
    // Configure default Axios settings
    static getAxiosConfig(timeout = 15000) {
        return {
            headers: { 'Content-Type': 'application/json' },
            timeout: timeout,
            validateStatus: function (status) {
                return status >= 200 && status < 600;
            },
            withCredentials: true
        };
    }
    
    static async login(email, password) {
        try {
            console.log('Attempting login for:', email);
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/login.php`,
                { email, password },
                this.getAxiosConfig()
            );

            console.log('Login response:', response.data);

            if (!response.data) {
                throw new Error('Empty response from server');
            }

            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw this.handleAxiosError(error);
        }
    }
    
    static async logout() {
        try {
            console.log('Attempting logout...');
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/logout.php`,
                {},
                this.getAxiosConfig(10000)
            );

            console.log('Logout response:', response.data);
            
            // Clear all stored user data
            this.clearUserData();
            
            return response.data;
        } catch (error) {
            console.error('Logout error:', error);
            
            // Even if logout fails on server, clear all local storage
            this.clearUserData();
            
            throw this.handleAxiosError(error, 'Logout failed');
        }
    }
    
    static async checkAuth() {
        try {
            const response = await axios.get(
                `${this.baseURL}/api/auth/check.php`,
                this.getAxiosConfig(5000)
            );
            
            return response.data;
        } catch (error) {
            console.error('Auth check error:', error);
            return { authenticated: false };
        }
    }

    static async getCurrentUser() {
        try {
            const auth = await this.checkAuth();
            if (auth.authenticated) {
                return auth.user;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    // Additional Axios methods for other auth operations
    static async register(userData) {
        try {
            console.log('Attempting registration...');
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/register.php`,
                userData,
                this.getAxiosConfig()
            );

            console.log('Registration response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Registration error:', error);
            throw this.handleAxiosError(error);
        }
    }

    static async forgotPassword(email) {
        try {
            console.log('Sending password reset request for:', email);
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/forgot-password.php`,
                { email },
                this.getAxiosConfig()
            );

            console.log('Password reset response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Password reset error:', error);
            throw this.handleAxiosError(error);
        }
    }

    static async resetPassword(token, newPassword) {
        try {
            console.log('Attempting password reset...');
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/reset-password.php`,
                { token, password: newPassword },
                this.getAxiosConfig()
            );

            console.log('Password reset response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Password reset error:', error);
            throw this.handleAxiosError(error);
        }
    }

    static async changePassword(currentPassword, newPassword) {
        try {
            console.log('Attempting password change...');
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/change-password.php`,
                { currentPassword, newPassword },
                this.getAxiosConfig()
            );

            console.log('Password change response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Password change error:', error);
            throw this.handleAxiosError(error);
        }
    }

    static async updateProfile(userData) {
        try {
            console.log('Updating user profile...');
            
            const response = await axios.put(
                `${this.baseURL}/api/auth/profile.php`,
                userData,
                this.getAxiosConfig()
            );

            console.log('Profile update response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Profile update error:', error);
            throw this.handleAxiosError(error);
        }
    }

    static async refreshToken() {
        try {
            console.log('Refreshing authentication token...');
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/refresh.php`,
                {},
                this.getAxiosConfig()
            );

            console.log('Token refresh response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw this.handleAxiosError(error);
        }
    }
    
    // Utility methods
    static handleAxiosError(error, defaultMessage = 'Request failed') {
        if (error.code === 'ECONNABORTED') {
            return new Error('Request timeout. Please try again.');
        }
        
        if (error.code === 'ERR_NETWORK') {
            return new Error('Network error. Please check your connection.');
        }
        
        if (error.response) {
            const errorMessage = error.response.data?.error || 
                               error.response.data?.message || 
                               defaultMessage;
            return new Error(errorMessage);
        } else if (error.request) {
            return new Error('No response from server. Please try again.');
        } else {
            return new Error('Request error: ' + error.message);
        }
    }

    static clearUserData() {
        const keys = ['user', 'logged_in', 'role', 'token', 'refresh_token'];
        
        keys.forEach(key => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }

    static async checkExistingAuth() {
        try {
            const auth = await this.checkAuth();
            if (auth.authenticated) {
                console.log('User already authenticated, redirecting...');
                this.redirectBasedOnRole(auth.user.role);
            }
        } catch (error) {
            console.log('No existing authentication found');
        }
    }
    
    static async requireAuth() {
        const auth = await this.checkAuth();
        if (!auth.authenticated) {
            window.location.href = `${this.baseURL}/pages/auth/login.html`;
            return false;
        }
        return auth.user;
    }
    
    static redirectBasedOnRole(role) {
        const baseURL = window.location.origin + '/reservation';
        let dashboardPath;
        
        const normalizedRole = role.toLowerCase().trim();
        
        switch (normalizedRole) {
            case 'admin':
                dashboardPath = `${baseURL}/html/admin/dashboard.html`;
                break;
            case 'front desk':
            case 'frontdesk':
                dashboardPath = `${baseURL}/html/frontdesk/frontdashboard.html`;
                break;
            case 'handyman':
                dashboardPath = `${baseURL}/html/handyman/handydashboard.html`;
                break;
            default:
                console.warn(`Unknown role '${role}', redirecting to login`);
                dashboardPath = `${baseURL}/pages/auth/login.html`;
        }
        
        console.log(`Redirecting ${role} to:`, dashboardPath);
        
        if (!window.location.href.includes(dashboardPath)) {
            window.location.href = dashboardPath;
        }
    }
}

// Enhanced LoginForm class with better Axios integration
class LoginForm {
    constructor(formId) {
        this.form = document.getElementById(formId);
        if (!this.form) {
            console.error(`Form element with ID '${formId}' not found`);
            return;
        }
        
        this.errorElement = document.getElementById('errorMessage');
        this.submitBtn = this.form.querySelector('button[type="submit"]');
        this.emailInput = this.form.querySelector('#email');
        this.passwordInput = this.form.querySelector('#password');
        
        if (!this.submitBtn) {
            console.error('Submit button not found');
            return;
        }
        
        this.originalBtnText = this.submitBtn.innerHTML;
        
        this.handleSubmit = this.handleSubmit.bind(this);
        this.form.addEventListener('submit', this.handleSubmit);
        
        if (this.emailInput) {
            this.emailInput.addEventListener('input', () => this.validateEmail());
        }
        
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => this.resetErrors());
        }

        // Check for existing authentication on load
        this.checkExistingAuth();
    }
    
    async checkExistingAuth() {
        try {
            const auth = await AuthService.checkAuth();
            if (auth.authenticated) {
                console.log('User already authenticated, redirecting...');
                AuthService.redirectBasedOnRole(auth.user.role);
            }
        } catch (error) {
            console.log('No existing authentication found');
        }
    }
    
    validateEmail() {
        if (!this.emailInput) return true;
        
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            this.showError('Please enter a valid email address');
            return false;
        } else {
            this.resetErrors();
            return true;
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.emailInput || !this.passwordInput) {
            this.showError('Form inputs not found');
            return;
        }
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        this.resetErrors();
        
        if (!email || !password) {
            this.showError('Email and password are required');
            if (!email) this.emailInput.focus();
            else this.passwordInput.focus();
            return;
        }
        
        if (!this.validateEmail()) {
            return;
        }
        
        this.setLoadingState(true);
        
        try {
            const result = await AuthService.login(email, password);
            
            if (result.success) {
                this.showSuccess('Login successful! Redirecting...');
                
                // Store user data
                sessionStorage.setItem('user', JSON.stringify(result.user));
                sessionStorage.setItem('logged_in', 'true');
                sessionStorage.setItem('role', result.user.role);
                
                if (result.token) {
                    sessionStorage.setItem('token', result.token);
                }
                
                setTimeout(() => {
                    AuthService.redirectBasedOnRole(result.user.role);
                }, 1500);
            } else {
                throw new Error(result.error || 'Authentication failed');
            }
            
        } catch (error) {
            this.showError(error.message);
            console.error('Login failed:', error);
            
            if (error.message.toLowerCase().includes('email')) {
                this.emailInput.focus();
            } else if (error.message.toLowerCase().includes('password')) {
                this.passwordInput.focus();
            }
        } finally {
            this.setLoadingState(false);
        }
    }
    
    resetErrors() {
        if (this.errorElement) {
            this.errorElement.textContent = '';
            this.errorElement.classList.add('hidden');
            this.errorElement.classList.remove('error', 'success');
        }
    }
    
    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.classList.remove('hidden', 'success');
            this.errorElement.classList.add('error');
            
            this.errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    showSuccess(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.classList.remove('hidden', 'error');
            this.errorElement.classList.add('success');
        }
    }
    
    setLoadingState(isLoading) {
        if (this.submitBtn) {
            if (isLoading) {
                this.submitBtn.innerHTML = '<div class="spinner"></div>Authenticating...';
                this.submitBtn.disabled = true;
                this.submitBtn.style.opacity = '0.75';
            } else {
                this.submitBtn.innerHTML = this.originalBtnText;
                this.submitBtn.disabled = false;
                this.submitBtn.style.opacity = '';
            }
        }
        
        if (this.emailInput) this.emailInput.disabled = isLoading;
        if (this.passwordInput) this.passwordInput.disabled = isLoading;
    }
}

// Initialize login form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = new LoginForm('loginForm');
});

// Enhanced logout function with better error handling
async function logout() {
    try {
        const result = await AuthService.logout();
        console.log('Logout successful:', result);
        
        // Clear service worker cache
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                registration.unregister();
            }
        }
        
        // Clear browser cache for this origin
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }
        
        window.location.replace(`${window.location.origin}/reservation/pages/auth/login.html`);
        
        return result;
    } catch (error) {
        console.error('Logout failed:', error);
        // Redirect even if logout fails
        window.location.replace(`${window.location.origin}/reservation/pages/auth/login.html`);
        throw error;
    }
}

// Axios interceptor for automatic token handling
axios.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Axios interceptor for handling token refresh
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshResult = await AuthService.refreshToken();
                if (refreshResult.success) {
                    sessionStorage.setItem('token', refreshResult.token);
                    originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
                    return axios(originalRequest);
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                AuthService.clearUserData();
                window.location.href = `${AuthService.baseURL}/pages/auth/login.html`;
            }
        }
        
        return Promise.reject(error);
    }
);