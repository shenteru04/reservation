        class PasswordResetManager {
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
                    this.showError('Please enter your email address');
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
                        this.showError(response.data.error || 'Failed to send verification code');
                    }
                } catch (error) {
                    console.error('Request OTP error:', error);
                    this.showError(error.response?.data?.error || 'Failed to send verification code');
                } finally {
                    this.setLoadingState('requestOtpButton', false);
                }
            }

            async verifyOTP() {
                const otpInputs = document.querySelectorAll('.otp-input');
                const otp = Array.from(otpInputs).map(input => input.value).join('');
                
                if (otp.length !== 6) {
                    this.showError('Please enter the complete 6-digit code');
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
                        this.showSuccess('Code verified successfully!');
                        this.stopOTPTimer();
                        this.moveToStep(3);
                    } else {
                        this.showError(response.data.error || 'Invalid or expired code');
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
                    this.showError('Please start over by requesting a new code');
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
                        this.showSuccess('A new verification code has been sent to your email.');
                        this.startOTPTimer(300); // Reset timer to 5 minutes
                        // Clear OTP inputs
                        document.querySelectorAll('.otp-input').forEach(input => {
                            input.value = '';
                            input.classList.remove('filled');
                        });
                        document.querySelector('.otp-input').focus();
                    } else {
                        this.showError(response.data.error || 'Failed to resend verification code');
                    }
                } catch (error) {
                    console.error('Resend OTP error:', error);
                    this.showError(error.response?.data?.error || 'Failed to resend verification code');
                } finally {
                    this.setLoadingState('resendOtpButton', false);
                }
            }

            async resetPassword() {
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                if (!newPassword || !confirmPassword) {
                    this.showError('Please enter and confirm your new password.');
                    return;
                }
                if (newPassword.length < 8) {
                    this.showError('Password must be at least 8 characters.');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    this.showError('Passwords do not match.');
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
                        this.showSuccess('Your password has been reset successfully! Redirecting to login...');
                        setTimeout(() => {
                            window.location.href = 'employee-login.html';
                        }, 2500);
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
                // Step indicators
                document.getElementById('step1').className = 'step' + (step === 1 ? ' active' : step > 1 ? ' completed' : ' inactive');
                document.getElementById('step2').className = 'step' + (step === 2 ? ' active' : step > 2 ? ' completed' : ' inactive');
                document.getElementById('step3').className = 'step' + (step === 3 ? ' active' : ' inactive');
                document.getElementById('line1').className = 'step-line' + (step > 1 ? ' completed' : '');
                document.getElementById('line2').className = 'step-line' + (step > 2 ? ' completed' : '');

                // Sections
                document.getElementById('requestOtpSection').classList.toggle('hidden', step !== 1);
                document.getElementById('verifyOtpSection').classList.toggle('hidden', step !== 2);
                document.getElementById('resetPasswordSection').classList.toggle('hidden', step !== 3);
            }

            startOTPTimer(seconds) {
                this.stopOTPTimer();
                this.timeRemaining = seconds;
                const timerDiv = document.getElementById('otpTimer');
                if (!timerDiv) return;

                timerDiv.textContent = `Code expires in ${Math.floor(this.timeRemaining / 60)}:${('0' + (this.timeRemaining % 60)).slice(-2)}`;
                this.otpTimer = setInterval(() => {
                    this.timeRemaining--;
                    if (this.timeRemaining <= 0) {
                        clearInterval(this.otpTimer);
                        timerDiv.textContent = 'Code expired. Please resend.';
                    } else {
                        timerDiv.textContent = `Code expires in ${Math.floor(this.timeRemaining / 60)}:${('0' + (this.timeRemaining % 60)).slice(-2)}`;
                    }
                }, 1000);
            }

            stopOTPTimer() {
                if (this.otpTimer) {
                    clearInterval(this.otpTimer);
                    this.otpTimer = null;
                }
            }

            setLoadingState(buttonId, isLoading) {
                const btn = document.getElementById(buttonId);
                if (!btn) return;
                
                if (isLoading) {
                    btn.disabled = true;
                    btn.classList.add('opacity-60', 'cursor-not-allowed');
                    const originalContent = btn.innerHTML;
                    btn.dataset.originalContent = originalContent;
                    btn.innerHTML = `
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        <span>Processing...</span>
                    `;
                } else {
                    btn.disabled = false;
                    btn.classList.remove('opacity-60', 'cursor-not-allowed');
                    if (btn.dataset.originalContent) {
                        btn.innerHTML = btn.dataset.originalContent;
                    }
                }
            }

            showError(message) {
                const errorDiv = document.getElementById('errorMessage');
                const errorText = document.getElementById('errorText');
                const successDiv = document.getElementById('successMessage');
                
                if (errorDiv && errorText) {
                    errorText.textContent = message;
                    errorDiv.classList.remove('hidden');
                }
                if (successDiv) {
                    successDiv.classList.add('hidden');
                }
            }

            showSuccess(message) {
                const successDiv = document.getElementById('successMessage');
                const successText = document.getElementById('successText');
                const errorDiv = document.getElementById('errorMessage');
                
                if (successDiv && successText) {
                    successText.textContent = message;
                    successDiv.classList.remove('hidden');
                }
                if (errorDiv) {
                    errorDiv.classList.add('hidden');
                }
            }

            hideMessages() {
                const errorDiv = document.getElementById('errorMessage');
                const successDiv = document.getElementById('successMessage');
                
                if (errorDiv) errorDiv.classList.add('hidden');
                if (successDiv) successDiv.classList.add('hidden');
            }

            togglePasswordVisibility(inputId, iconId) {
                const input = document.getElementById(inputId);
                const icon = document.getElementById(iconId);
                
                if (!input || !icon) return;
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }

            checkPasswordStrength() {
                const password = document.getElementById('newPassword').value;
                const strengthBar = document.getElementById('strengthBar');
                const strengthText = document.getElementById('strengthText');
                
                if (!strengthBar || !strengthText) return;
                
                let strength = 0;

                if (password.length >= 8) strength++;
                if (/[A-Z]/.test(password)) strength++;
                if (/[a-z]/.test(password)) strength++;
                if (/[0-9]/.test(password)) strength++;
                if (/[\W_]/.test(password)) strength++;

                let width = '0%';
                let color = 'bg-red-500';
                let text = 'Enter at least 8 characters';

                if (strength === 1) {
                    width = '20%';
                    color = 'bg-red-500';
                    text = 'Very Weak';
                } else if (strength === 2) {
                    width = '40%';
                    color = 'bg-orange-400';
                    text = 'Weak';
                } else if (strength === 3) {
                    width = '60%';
                    color = 'bg-yellow-400';
                    text = 'Moderate';
                } else if (strength === 4) {
                    width = '80%';
                    color = 'bg-blue-500';
                    text = 'Strong';
                } else if (strength === 5) {
                    width = '100%';
                    color = 'bg-green-500';
                    text = 'Very Strong';
                }

                strengthBar.style.width = width;
                strengthBar.className = `h-2 rounded-full transition-all duration-300 ${color}`;
                strengthText.textContent = text;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new PasswordResetManager();
        });