 class AdminPasswordResetManager {
            constructor() {
                this.currentStep = 1;
                this.employeeId = null;
                this.otpTimer = null;
                this.timeRemaining = 0;
                this.baseURL = window.location.origin + '/reservation';
                
                this.initializeEventListeners();
                this.setupOTPInputs();
            }

            initializeEventListeners() {
                // Step 1: Request OTP
                document.getElementById('requestOtpForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.requestOTP();
                });

                // Step 2: Verify OTP
                document.getElementById('verifyOtpForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.verifyOTP();
                });

                document.getElementById('resendOtpButton').addEventListener('click', () => {
                    this.resendOTP();
                });

                // Step 3: Reset Password
                document.getElementById('resetPasswordForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.resetPassword();
                });

                // Password visibility toggles
                document.getElementById('toggleNewPassword').addEventListener('click', () => {
                    this.togglePasswordVisibility('newPassword', 'newPasswordEyeIcon');
                });

                document.getElementById('toggleConfirmPassword').addEventListener('click', () => {
                    this.togglePasswordVisibility('confirmPassword', 'confirmPasswordEyeIcon');
                });

                // Password strength checker
                document.getElementById('newPassword').addEventListener('input', () => {
                    this.checkPasswordStrength();
                });
            }

            setupOTPInputs() {
                const inputs = document.querySelectorAll('.otp-input');
                inputs.forEach((input, index) => {
                    input.addEventListener('input', (e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        e.target.value = value;
                        
                        if (value) {
                            e.target.classList.add('filled');
                            if (index < inputs.length - 1) {
                                inputs[index + 1].focus();
                            }
                        } else {
                            e.target.classList.remove('filled');
                        }
                    });

                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace' && !input.value && index > 0) {
                            inputs[index - 1].focus();
                        }
                    });

                    input.addEventListener('paste', (e) => {
                        e.preventDefault();
                        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
                        const digits = pastedData.split('');
                        
                        inputs.forEach((inp, idx) => {
                            if (digits[idx]) {
                                inp.value = digits[idx];
                                inp.classList.add('filled');
                            }
                        });
                        
                        if (digits.length === 6) {
                            document.getElementById('verifyOtpButton').focus();
                        }
                    });
                });
            }

            async requestOTP() {
                const email = document.getElementById('email').value.trim();
                
                if (!email) {
                    this.showError('Please enter your administrator email address');
                    return;
                }

                this.setLoadingState('requestOtpButton', true);
                this.hideMessages();

                try {
                    const response = await axios.post(`${this.baseURL}/api/auth/request-password-reset-otp.php`, {
                        email: email
                    });

                    if (response.data.success) {
                        this.employeeId = response.data.employee_id;
                        this.showSuccess(response.data.message);
                        this.moveToStep(2);
                        this.startOTPTimer(300); // 5 minutes
                    } else {
                        this.showError(response.data.error || 'Failed to send security code');
                    }
                } catch (error) {
                    console.error('Request OTP error:', error);
                    this.showError(error.response?.data?.error || 'Failed to send security code');
                } finally {
                    this.setLoadingState('requestOtpButton', false);
                }
            }

            async verifyOTP() {
                const otpInputs = document.querySelectorAll('.otp-input');
                const otp = Array.from(otpInputs).map(input => input.value).join('');
                
                if (otp.length !== 6) {
                    this.showError('Please enter the complete 6-digit security code');
                    return;
                }

                this.setLoadingState('verifyOtpButton', true);
                this.hideMessages();

                try {
                    const response = await axios.post(`${this.baseURL}/api/auth/verify-password-reset-otp.php`, {
                        employee_id: this.employeeId,
                        otp_code: otp,
                        purpose: 'password_reset'
                    });

                    if (response.data.success) {
                        this.showSuccess('Security code verified successfully!');
                        this.stopOTPTimer();
                        this.moveToStep(3);
                    } else {
                        this.showError(response.data.error || 'Invalid or expired security code');
                        otpInputs[0].focus();
                    }
                } catch (error) {
                    console.error('Verify OTP error:', error);
                    this.showError(error.response?.data?.error || 'Verification failed');
                    otpInputs[0].focus();
                } finally {
                    this.setLoadingState('verifyOtpButton', false);
                }
            }

            async resendOTP() {
                if (!this.employeeId) {
                    this.showError('Please start over by requesting a new security code');
                    return;
                }

                this.setLoadingState('resendOtpButton', true);
                this.hideMessages();

                try {
                    const response = await axios.post(`${this.baseURL}/api/auth/resend-password-reset-otp.php`, {
                        employee_id: this.employeeId,
                        purpose: 'password_reset'
                    });

                    if (response.data.success) {
                        this.showSuccess('New security code sent successfully!');
                        this.startOTPTimer(300); // Reset to 5 minutes
                        
                        // Clear OTP inputs
                        const otpInputs = document.querySelectorAll('.otp-input');
                        otpInputs.forEach(input => {
                            input.value = '';
                            input.classList.remove('filled');
                        });
                        otpInputs[0].focus();
                    } else {
                        this.showError(response.data.error || 'Failed to resend security code');
                    }
                } catch (error) {
                    console.error('Resend OTP error:', error);
                    this.showError(error.response?.data?.error || 'Failed to resend security code');
                } finally {
                    this.setLoadingState('resendOtpButton', false);
                }
            }

            async resetPassword() {
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (newPassword !== confirmPassword) {
                    this.showError('Passwords do not match');
                    return;
                }
                
                if (newPassword.length < 8) {
                    this.showError('Password must be at least 8 characters long');
                    return;
                }

                this.setLoadingState('resetSubmitButton', true);
                this.hideMessages();

                try {
                    const response = await axios.post(`${this.baseURL}/api/auth/reset-password-with-otp.php`, {
                        employee_id: this.employeeId,
                        new_password: newPassword
                    });

                    if (response.data.success) {
                        this.showSuccess('Administrator password reset successfully! Redirecting to login...');
                        setTimeout(() => {
                            window.location.href = `${this.baseURL}/html/auth/login.html`;
                        }, 2000);
                    } else {
                        this.showError(response.data.error || 'Failed to reset password');
                    }
                } catch (error) {
                    console.error('Reset password error:', error);
                    this.showError(error.response?.data?.error || 'Failed to reset password');
                } finally {
                    this.setLoadingState('resetSubmitButton', false);
                }
            }

            moveToStep(step) {
                this.currentStep = step;
                
                // Hide all sections
                document.getElementById('requestOtpSection').classList.add('hidden');
                document.getElementById('verifyOtpSection').classList.add('hidden');
                document.getElementById('resetPasswordSection').classList.add('hidden');
                
                // Update step indicators
                for (let i = 1; i <= 3; i++) {
                    const stepEl = document.getElementById(`step${i}`);
                    const lineEl = document.getElementById(`line${i}`);
                    
                    if (i < step) {
                        stepEl.className = 'step completed';
                        if (lineEl) lineEl.className = 'step-line completed';
                    } else if (i === step) {
                        stepEl.className = 'step active';
                        if (lineEl) lineEl.className = 'step-line';
                    } else {
                        stepEl.className = 'step inactive';
                        if (lineEl) lineEl.className = 'step-line';
                    }
                }
                
                // Show current step section
                switch (step) {
                    case 1:
                        document.getElementById('requestOtpSection').classList.remove('hidden');
                        break;
                    case 2:
                        document.getElementById('verifyOtpSection').classList.remove('hidden');
                        document.querySelector('.otp-input').focus();
                        break;
                    case 3:
                        document.getElementById('resetPasswordSection').classList.remove('hidden');
                        document.getElementById('newPassword').focus();
                        break;
                }
            }

            startOTPTimer(seconds) {
                this.stopOTPTimer();
                this.timeRemaining = seconds;
                
                const updateTimer = () => {
                    const minutes = Math.floor(this.timeRemaining / 60);
                    const secs = this.timeRemaining % 60;
                    
                    const timerEl = document.getElementById('otpTimer');
                    if (this.timeRemaining > 0) {
                        timerEl.textContent = `Code expires in ${minutes}:${secs.toString().padStart(2, '0')}`;
                        timerEl.className = this.timeRemaining <= 30 ? 'text-sm text-red-600 mt-2' : 
                                           this.timeRemaining <= 60 ? 'text-sm text-yellow-600 mt-2' : 
                                           'text-sm text-gray-500 mt-2';
                        this.timeRemaining--;
                    } else {
                        timerEl.textContent = 'Security code has expired. Please request a new one.';
                        timerEl.className = 'text-sm text-red-600 mt-2';
                        this.stopOTPTimer();
                    }
                };
                
                updateTimer();
                this.otpTimer = setInterval(updateTimer, 1000);
            }

            stopOTPTimer() {
                if (this.otpTimer) {
                    clearInterval(this.otpTimer);
                    this.otpTimer = null;
                }
            }

            togglePasswordVisibility(inputId, iconId) {
                const input = document.getElementById(inputId);
                const icon = document.getElementById(iconId);
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            }

            checkPasswordStrength() {
                const password = document.getElementById('newPassword').value;
                const strengthBar = document.getElementById('strengthBar');
                const strengthText = document.getElementById('strengthText');
                
                let strength = 0;
                let feedback = [];
                
                if (password.length >= 8) strength += 20;
                else feedback.push('at least 8 characters');
                
                if (/[a-z]/.test(password)) strength += 20;
                else feedback.push('lowercase letter');
                
                if (/[A-Z]/.test(password)) strength += 20;
                else feedback.push('uppercase letter');
                
                if (/[0-9]/.test(password)) strength += 20;
                else feedback.push('number');
                
                if (/[^A-Za-z0-9]/.test(password)) strength += 20;
                else feedback.push('special character');
                
                // Update strength bar
                strengthBar.style.width = `${strength}%`;
                
                if (strength < 60) {
                    strengthBar.className = 'bg-red-500 h-2 rounded-full transition-all duration-300';
                    strengthText.textContent = `Weak - Add: ${feedback.join(', ')}`;
                    strengthText.className = 'text-xs text-red-600 mt-1';
                } else if (strength < 100) {
                    strengthBar.className = 'bg-yellow-500 h-2 rounded-full transition-all duration-300';
                    strengthText.textContent = `Good - Add: ${feedback.join(', ')}`;
                    strengthText.className = 'text-xs text-yellow-600 mt-1';
                } else {
                    strengthBar.className = 'bg-green-500 h-2 rounded-full transition-all duration-300';
                    strengthText.textContent = 'Strong administrator password';
                    strengthText.className = 'text-xs text-green-600 mt-1';
                }
            }

            setLoadingState(buttonId, isLoading) {
                const button = document.getElementById(buttonId);
                
                if (isLoading) {
                    const originalText = button.textContent;
                    button.disabled = true;
                    button.innerHTML = `
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        <span>Processing...</span>
                    `;
                    button.dataset.originalText = originalText;
                } else {
                    button.disabled = false;
                    const originalText = button.dataset.originalText || 'Submit';
                    const icon = buttonId === 'requestOtpButton' ? 'paper-plane' : 
                                buttonId === 'verifyOtpButton' ? 'check' : 'shield-alt';
                    button.innerHTML = `<i class="fas fa-${icon} mr-2"></i><span>${originalText}</span>`;
                }
            }

            showError(message) {
                const errorEl = document.getElementById('errorMessage');
                const errorText = document.getElementById('errorText');
                const successEl = document.getElementById('successMessage');
                
                errorText.textContent = message;
                errorEl.classList.remove('hidden');
                successEl.classList.add('hidden');
                
                errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            showSuccess(message) {
                const successEl = document.getElementById('successMessage');
                const successText = document.getElementById('successText');
                const errorEl = document.getElementById('errorMessage');
                
                successText.textContent = message;
                successEl.classList.remove('hidden');
                errorEl.classList.add('hidden');
            }

            hideMessages() {
                document.getElementById('errorMessage').classList.add('hidden');
                document.getElementById('successMessage').classList.add('hidden');
            }
        }

        // Initialize the admin password reset manager when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new AdminPasswordResetManager();
        });