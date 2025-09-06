class AuthService {
    static baseURL = window.location.origin + '/reservation';

    static timeouts = {
        DEFAULT: 30000,
        CHECK_AUTH: 5000,
        LOGOUT: 10000,
        OTP_VERIFY: 45000,
        OTP_RESEND: 30000
    };

    static getAxiosConfig(timeout = AuthService.timeouts.DEFAULT) {
        return {
            headers: { 'Content-Type': 'application/json' },
            timeout,
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
                `${AuthService.baseURL}/api/auth/login.php`,
                { email, password },
                AuthService.getAxiosConfig()
            );
            console.log('Login response:', response.data);
            if (!response.data) {
                throw new Error('Empty response from server');
            }
            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw AuthService.handleAxiosError(error);
        }
    }

    static async logout() {
        try {
            console.log('Attempting logout...');
            const response = await axios.post(
                `${AuthService.baseURL}/api/auth/logout.php`,
                {},
                AuthService.getAxiosConfig(AuthService.timeouts.LOGOUT)
            );
            console.log('Logout response:', response.data);
            AuthService.clearUserData();
            return response.data;
        } catch (error) {
            console.error('Logout error:', error);
            AuthService.clearUserData();
            throw AuthService.handleAxiosError(error, 'Logout failed');
        }
    }

    static async logoutAndRedirect() {
        try {
            await AuthService.logout();
            console.log('Logout successful on server.');
        } catch (error) {
            console.error('Server logout failed, proceeding with client-side cleanup.', error);
        } finally {
            AuthService.clearUserData();
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    registration.unregister();
                }
            }
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
            }
            window.location.replace(`${AuthService.baseURL}/index.html`);
        }
    }

    static async checkAuth() {
        try {
            const response = await axios.get(
                `${AuthService.baseURL}/api/auth/check.php`,
                AuthService.getAxiosConfig(AuthService.timeouts.CHECK_AUTH)
            );
            console.log('Check auth response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Auth check error:', error);
            return { authenticated: false };
        }
    }

    static async getCurrentUser() {
        try {
            const auth = await AuthService.checkAuth();
            if (auth.authenticated) {
                return auth.user;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    static async verifyOTP(employee_id, otp_code, purpose = 'login') {
        try {
            console.log('Attempting OTP verification for:', employee_id, 'with OTP:', otp_code);
            const response = await axios.post(
                `${AuthService.baseURL}/api/auth/verify-otp.php`,
                { 
                    employee_id: employee_id.toString().trim(),
                    otp_code: otp_code.toString().trim(),
                    purpose
                },
                AuthService.getAxiosConfig(AuthService.timeouts.OTP_VERIFY)
            );
            console.log('OTP verification response:', response.data);
            if (!response.data) {
                throw new Error('Empty response from server');
            }
            if (!response.data.success) {
                console.warn('OTP verification failed:', response.data.error);
            }
            return response.data;
        } catch (error) {
            console.error('OTP verification error:', error);
            throw AuthService.handleAxiosError(error);
        }
    }

    static async resendOTP(employee_id, purpose = 'login') {
        try {
            console.log('Resending OTP for:', employee_id);
            const response = await axios.post(
                `${AuthService.baseURL}/api/auth/resend-otp.php`,
                { 
                    employee_id: employee_id.toString().trim(),
                    purpose
                },
                AuthService.getAxiosConfig(AuthService.timeouts.OTP_RESEND)
            );
            console.log('Resend OTP response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Resend OTP error:', error);
            throw AuthService.handleAxiosError(error);
        }
    }

    static handleAxiosError(error, defaultMessage = 'Request failed') {
        console.error('Axios error details:', {
            code: error.code,
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return new Error('Request timeout. Please check your connection and try again.');
        }
        if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') {
            return new Error('Network error. Please check your internet connection.');
        }
        if (error.code === 'ECONNREFUSED') {
            return new Error('Unable to connect to server. Please try again later.');
        }
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            switch (status) {
                case 401:
                    return new Error(data?.error || 'Invalid OTP. Please try again.');
                case 403:
                    return new Error(data?.error || 'Access denied. You do not have permission.');
                case 404:
                    return new Error('Service not found. Please contact support.');
                case 429:
                    return new Error('Too many requests. Please wait a moment and try again.');
                case 500:
                    return new Error('Server error. Please try again later.');
                case 502:
                case 503:
                case 504:
                    return new Error('Server temporarily unavailable. Please try again later.');
                default:
                    return new Error(data?.error || data?.message || defaultMessage);
            }
        } else if (error.request) {
            return new Error('No response from server. Please check your connection and try again.');
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
        const auth = await AuthService.checkAuth();
        if (!auth.authenticated) {
            window.location.href = `${AuthService.baseURL}/index.html`;
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
                dashboardPath = `${baseURL}/index.html`;
        }
        console.log(`Redirecting ${role} to:`, dashboardPath);
        if (!window.location.href.includes(dashboardPath)) {
            window.location.href = dashboardPath;
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
        this.successElement = document.getElementById('successMessage');
        this.submitBtn = this.form.querySelector('#submitButton');
        this.submitBtnText = this.form.querySelector('#submitButtonText');
        this.emailInput = this.form.querySelector('#email');
        this.passwordInput = this.form.querySelector('#password');
        this.departmentInput = this.form.querySelector('#department');
        this.otpInput = this.form.querySelector('#otp');
        this.otpField = this.form.querySelector('#otpField');
        this.otpTimerElement = this.form.querySelector('#otpTimer');
        this.resendOtpBtn = this.form.querySelector('#resendOtp');
        this.rememberMeCheckbox = this.form.querySelector('#rememberMe');
        this.originalBtnText = this.submitBtnText.textContent;
        this.isMfaRequired = false;
        this.employeeId = null;
        this.timerInterval = null;
        this.timer = 0;
        this.currentAttempt = 0;
        this.maxAttempts = 3;

        this.handleSubmit = this.handleSubmit.bind(this);
        this.form.addEventListener('submit', this.handleSubmit);

        if (this.emailInput) {
            this.emailInput.addEventListener('input', () => this.validateEmail());
        }
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => this.resetMessages());
        }
        if (this.otpInput) {
            this.otpInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length === 6) {
                    this.submitBtn.focus();
                }
            });
        }
        if (this.resendOtpBtn) {
            this.resendOtpBtn.addEventListener('click', () => this.resendOTPCode());
        }

        AuthService.checkExistingAuth();
    }

    validateEmail() {
        if (!this.emailInput) return true;
        const email = this.emailInput.value.trim();
        if (!email) {
            this.showError('Email or Employee ID is required');
            return false;
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const employeeIdRegex = /^[a-zA-Z0-9]{1,20}$/;
        if (!emailRegex.test(email) && !employeeIdRegex.test(email)) {
            this.showError('Please enter a valid email address or employee ID');
            return false;
        }
        this.resetMessages();
        return true;
    }

    validateOTP() {
        if (!this.otpInput || !this.isMfaRequired) return true;
        const otp = this.otpInput.value.trim();
        if (!otp) {
            this.showError('Verification code is required');
            return false;
        }
        if (!/^[0-9]{6}$/.test(otp)) {
            this.showError('Verification code must be 6 digits');
            return false;
        }
        if (this.timer <= 0) {
            this.showError('Verification code has expired. Please resend.');
            return false;
        }
        this.resetMessages();
        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.emailInput || !this.passwordInput) {
            this.showError('Form inputs not found');
            return;
        }

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const department = this.departmentInput ? this.departmentInput.value : null;
        const otp = this.otpInput ? this.otpInput.value.trim() : null;
        const rememberMe = this.rememberMeCheckbox ? this.rememberMeCheckbox.checked : false;

        this.resetMessages();

        if (this.isMfaRequired) {
            if (!this.validateOTP()) {
                return;
            }
        } else {
            if (!email || !password) {
                this.showError('Email/Employee ID and password are required');
                if (!email) this.emailInput.focus();
                else this.passwordInput.focus();
                return;
            }
            if (this.departmentInput && !department) {
                this.showError('Please select your department');
                this.departmentInput.focus();
                return;
            }
            if (!this.validateEmail()) {
                return;
            }
        }

        this.setLoadingState(true);

        try {
            if (this.isMfaRequired) {
                console.log('Submitting OTP for verification:', { employeeId: this.employeeId, otp });
                await this.verifyOTPCode(this.employeeId, otp, rememberMe);
            } else {
                const loginData = { email, password };
                if (department) {
                    loginData.department = department;
                }
                console.log('Submitting login request:', loginData);
                const result = await AuthService.login(email, password);
                console.log('Login result:', result);
                if (result.step === 'mfa_required' && result.employee_id) {
                    this.setLoadingState(false);
                    this.employeeId = result.employee_id;
                    this.isMfaRequired = true;
                    this.startOTPTimer(result.expires_in || 300);
                    this.showOTPField();
                    this.showSuccess('Verification code sent to your email.');
                    this.otpInput.focus();
                    return;
                }
                if (result.success && result.user) {
                    this.handleSuccessfulLogin(result, rememberMe);
                } else {
                    throw new Error(result.error || result.message || 'Authentication failed');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'Login failed. Please try again.');
            if (!this.isMfaRequired) {
                if (error.message.toLowerCase().includes('email') || error.message.toLowerCase().includes('user')) {
                    this.emailInput.focus();
                } else if (error.message.toLowerCase().includes('password')) {
                    this.passwordInput.focus();
                }
            } else {
                this.otpInput.focus();
            }
        } finally {
            this.setLoadingState(false);
        }
    }

    startOTPTimer(expires_in) {
        this.stopOTPTimer();
        this.timer = Math.max(expires_in, 60);
        const updateTimer = () => {
            if (this.timer <= 0) {
                this.otpTimerElement.textContent = 'Code expired';
                this.otpTimerElement.className = 'text-red-600';
                this.submitBtn.disabled = true;
                this.stopOTPTimer();
                return;
            }
            const minutes = Math.floor(this.timer / 60);
            const seconds = this.timer % 60;
            this.otpTimerElement.textContent = `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.otpTimerElement.className = this.timer <= 30 ? 'text-red-600' : this.timer <= 60 ? 'text-yellow-600' : 'text-gray-600';
            this.timer--;
        };
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    stopOTPTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showOTPField() {
        if (this.otpField) {
            this.otpField.classList.remove('hidden');
            this.emailInput.disabled = true;
            this.passwordInput.disabled = true;
            if (this.departmentInput) {
                this.departmentInput.disabled = true;
            }
            this.submitBtnText.textContent = 'Verify Code';
        }
    }

    hideOTPField() {
        if (this.otpField) {
            this.otpField.classList.add('hidden');
            this.emailInput.disabled = false;
            this.passwordInput.disabled = false;
            if (this.departmentInput) {
                this.departmentInput.disabled = false;
            }
            this.otpInput.value = '';
            this.submitBtnText.textContent = this.originalBtnText;
            this.stopOTPTimer();
            this.isMfaRequired = false;
            this.employeeId = null;
            this.currentAttempt = 0;
        }
    }

    async verifyOTPCode(employee_id, otp_code, rememberMe) {
        try {
            console.log('Verifying OTP:', { employee_id, otp_code });
            const result = await AuthService.verifyOTP(employee_id, otp_code);
            console.log('OTP verification result:', result);
            if (result.success && result.user) {
                this.handleSuccessfulLogin(result, rememberMe);
            } else {
                this.currentAttempt++;
                if (this.currentAttempt >= this.maxAttempts) {
                    console.warn('Max OTP attempts reached:', this.currentAttempt);
                    this.showError('Too many failed attempts. Please try logging in again.');
                    this.hideOTPField();
                    return;
                }
                const remainingAttempts = this.maxAttempts - this.currentAttempt;
                this.showError(`Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
                this.otpInput.focus();
            }
        } catch (error) {
            console.error('OTP verification error:', error);
            this.currentAttempt++;
            if (this.currentAttempt >= this.maxAttempts) {
                console.warn('Max OTP attempts reached:', this.currentAttempt);
                this.showError('Too many failed attempts. Please try logging in again.');
                this.hideOTPField();
                return;
            }
            const remainingAttempts = this.maxAttempts - this.currentAttempt;
            this.showError(error.message || `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
            this.otpInput.focus();
        }
    }

    async resendOTPCode() {
        if (!this.employeeId) {
            console.error('No employee ID available for OTP resend');
            this.showError('No employee ID available. Please log in again.');
            this.hideOTPField();
            return;
        }
        this.setLoadingState(true);
        try {
            console.log('Requesting OTP resend for employee:', this.employeeId);
            const result = await AuthService.resendOTP(this.employeeId);
            console.log('Resend OTP result:', result);
            if (result.success) {
                this.startOTPTimer(result.expires_in || 300);
                this.showSuccess('New verification code sent to your email.');
                this.currentAttempt = 0;
                this.otpInput.value = '';
                this.otpInput.focus();
            } else {
                this.showError(result.error || 'Failed to resend code.');
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            this.showError(error.message || 'Failed to resend code.');
        } finally {
            this.setLoadingState(false);
        }
    }

    handleSuccessfulLogin(result, rememberMe) {
        console.log('Handling successful login:', result);
        this.stopOTPTimer();
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(result.user));
        storage.setItem('logged_in', 'true');
        storage.setItem('role', result.user.role);
        if (result.token) {
            storage.setItem('token', result.token);
        }
        this.showSuccess('Login successful! Redirecting...');
        setTimeout(() => {
            AuthService.redirectBasedOnRole(result.user.role);
        }, 1500);
    }

    resetMessages() {
        if (this.errorElement) {
            this.errorElement.classList.add('hidden');
        }
        if (this.successElement) {
            this.successElement.classList.add('hidden');
        }
    }

    showError(message) {
        console.error('Login error:', message);
        if (this.errorElement) {
            const errorTextElement = this.errorElement.querySelector('#errorText') || 
                                   this.errorElement.querySelector('p') ||
                                   this.errorElement;
            errorTextElement.textContent = message;
            this.errorElement.classList.remove('hidden');
            if (this.successElement) {
                this.successElement.classList.add('hidden');
            }
            this.errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    showSuccess(message) {
        console.log('Login success:', message);
        if (this.successElement) {
            const successTextElement = this.successElement.querySelector('#successText') || 
                                     this.successElement.querySelector('p');
            if (successTextElement) {
                successTextElement.textContent = message;
            }
            this.successElement.classList.remove('hidden');
            if (this.errorElement) {
                this.errorElement.classList.add('hidden');
            }
        }
    }

    setLoadingState(isLoading) {
        if (this.submitBtn) {
            if (isLoading) {
                this.submitBtn.innerHTML = `
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>Processing...</span>
                `;
                this.submitBtn.disabled = true;
                this.submitBtn.style.opacity = '0.75';
            } else {
                this.submitBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i><span id="submitButtonText">${this.submitBtnText.textContent}</span>`;
                this.submitBtn.disabled = false;
                this.submitBtn.style.opacity = '';
            }
        }
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (!this.isMfaRequired || input !== this.otpInput) {
                input.disabled = isLoading;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = new LoginForm('loginForm');
});

axios.interceptors.request.use(
    (config) => {
        config.params = { ...config.params, _t: Date.now() };
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('Making request:', config.method?.toUpperCase(), config.url);
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => {
        console.log('Response received:', response.status, response.config.url);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        originalRequest._retryCount = originalRequest._retryCount || 0;
        if (error.response?.status === 401 && originalRequest._retryCount < 2) {
            originalRequest._retryCount++;
            try {
                console.log('Attempting token refresh...');
                const refreshResult = await AuthService.refreshToken();
                if (refreshResult.success && refreshResult.token) {
                    const newToken = refreshResult.token;
                    const storage = sessionStorage.getItem('token') ? sessionStorage : localStorage;
                    storage.setItem('token', newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    console.log('Retrying request with new token...');
                    return axios(originalRequest);
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                AuthService.clearUserData();
                if (!window.location.href.includes('login') && !window.location.href.includes('index.html')) {
                    window.location.href = `${AuthService.baseURL}/index.html`;
                }
                return Promise.reject(refreshError);
            }
        }
        if ((error.code === 'ECONNABORTED' || error.message.includes('timeout')) && 
            originalRequest.url?.includes('verify-otp') && 
            originalRequest._retryCount < 2) {
            originalRequest._retryCount++;
            originalRequest.timeout = 60000;
            console.log('Retrying OTP verification with extended timeout...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return axios(originalRequest);
        }
        return Promise.reject(error);
    }
);

window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.config && event.reason.config.url) {
        console.error('Unhandled axios rejection:', event.reason.message, event.reason.config.url);
        if (event.reason.code === 'ERR_NETWORK' || event.reason.code === 'ECONNABORTED') {
            event.preventDefault();
        }
    }
});