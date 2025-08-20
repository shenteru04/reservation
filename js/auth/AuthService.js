class AuthService {
    static baseURL = window.location.origin + '/reservation';
    
    static async login(email, password) {
        try {
            console.log('Attempting login for:', email);
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/login.php`,
                { email, password },
                {
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: function (status) {
                        return status >= 200 && status < 600;
                    },
                    timeout: 15000
                }
            );

            console.log('Login response:', response.data);

            if (!response.data) {
                throw new Error('Empty response from server');
            }

            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout. Please try again.');
            }
            
            if (error.code === 'ERR_NETWORK') {
                throw new Error('Network error. Please check your connection.');
            }
            
            if (error.response) {
                const errorMessage = error.response.data?.error || 
                                   error.response.data?.message || 
                                   'Login failed';
                throw new Error(errorMessage);
            } else if (error.request) {
                throw new Error('No response from server. Please try again.');
            } else {
                throw new Error('Request error: ' + error.message);
            }
        }
    }
    
    static async logout() {
        try {
            console.log('Attempting logout...');
            
            const response = await axios.post(
                `${this.baseURL}/api/auth/logout.php`,
                {},
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            console.log('Logout response:', response.data);
            
            // Clear all stored user data
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('logged_in');
            sessionStorage.removeItem('role');
            localStorage.removeItem('user');
            localStorage.removeItem('logged_in');
            localStorage.removeItem('role');
            
            return response.data;
        } catch (error) {
            console.error('Logout error:', error);
            
            // Even if logout fails on server, clear all local storage
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('logged_in');
            sessionStorage.removeItem('role');
            localStorage.removeItem('user');
            localStorage.removeItem('logged_in');
            localStorage.removeItem('role');
            
            if (error.response) {
                const errorMessage = error.response.data?.error || 'Logout failed';
                throw new Error(errorMessage);
            } else {
                throw new Error('Logout request failed');
            }
        }
    }
    
    static async checkAuth() {
        try {
            const response = await axios.get(
                `${this.baseURL}/api/auth/check.php`,
                {
                    timeout: 5000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 600;
                    },
                    withCredentials: true
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('Auth check error:', error);
            return { authenticated: false };
        }
    }

    static async checkExistingAuth() {
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
}

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
                
                sessionStorage.setItem('user', JSON.stringify(result.user));
                sessionStorage.setItem('logged_in', 'true');
                sessionStorage.setItem('role', result.user.role);
                
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

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = new LoginForm('loginForm');
});

async function logout() {
    try {
        const result = await AuthService.logout();
        console.log('Logout successful:', result);
        
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                registration.unregister();
            }
        }
        
        window.location.replace(`${window.location.origin}/reservation/pages/auth/login.html`);
        
        return result;
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.replace(`${window.location.origin}/reservation/pages/auth/login.html`);
        throw error;
    }
}