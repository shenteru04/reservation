<?php
require __DIR__ . '/../vendor/autoload.php';

//Import PHPMailer classes into the global namespace
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class EmailService {
    private $mail;
    
    public function __construct() {
        $this->mail = new PHPMailer(true);
        $this->configureMailer();
    }
    
    private function configureMailer() {
        try {
            // Server settings
            $this->mail->isSMTP();
            $this->mail->Host       = 'smtp.gmail.com';
            $this->mail->SMTPAuth   = true;
            $this->mail->Username   = 'christiandaveboncales@gmail.com';
            $this->mail->Password   = 'fled ccbj xvff rsbz';
            $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mail->Port       = 587;
            
            // Default sender
            $this->mail->setFrom('christiandaveboncales@gmail.com', 'Sky Oro Hotel');
            $this->mail->addReplyTo('christiandaveboncales@gmail.com', 'Sky Oro Hotel Support');
        } catch (Exception $e) {
            error_log("Mailer configuration error: " . $e->getMessage());
            throw new Exception("Email service configuration failed");
        }
    }
    
    /**
     * Send welcome email to new employee
     */
    public function sendWelcomeEmail($employeeEmail, $employeeName, $temporaryPassword) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($employeeEmail, $employeeName);
            
            $this->mail->isHTML(true);
            $this->mail->Subject = 'Welcome to Sky Oro Hotel - Your Account Details';
            
            $this->mail->Body = $this->getWelcomeEmailTemplate($employeeName, $employeeEmail, $temporaryPassword);
            $this->mail->AltBody = strip_tags($this->getWelcomeEmailTemplate($employeeName, $employeeEmail, $temporaryPassword));
            
            $this->mail->send();
            return ['success' => true, 'message' => 'Welcome email sent successfully'];
            
        } catch (Exception $e) {
            error_log("Welcome email error: " . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to send welcome email: ' . $e->getMessage()];
        }
    }
    
    /**
     * Send password reset email
     */
    public function sendPasswordResetEmail($email, $resetToken, $employeeName) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($email, $employeeName);
            
            $this->mail->isHTML(true);
            $this->mail->Subject = 'Sky Oro Hotel - Password Reset Request';
            
            $resetLink = "http://localhost/reservation/html/auth/reset-password.html?token=" . $resetToken;
            
            $this->mail->Body = $this->getPasswordResetTemplate($employeeName, $resetLink);
            $this->mail->AltBody = strip_tags($this->getPasswordResetTemplate($employeeName, $resetLink));
            
            $this->mail->send();
            return ['success' => true, 'message' => 'Password reset email sent successfully'];
            
        } catch (Exception $e) {
            error_log("Password reset email error: " . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to send password reset email: ' . $e->getMessage()];
        }
    }
    
    /**
     * Send task assignment notification
     */
    public function sendTaskNotification($employeeEmail, $employeeName, $taskDetails) {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($employeeEmail, $employeeName);
            
            $this->mail->isHTML(true);
            $this->mail->Subject = 'New Task Assignment - Sky Oro Hotel';
            
            $this->mail->Body = $this->getTaskNotificationTemplate($employeeName, $taskDetails);
            $this->mail->AltBody = strip_tags($this->getTaskNotificationTemplate($employeeName, $taskDetails));
            
            $this->mail->send();
            return ['success' => true, 'message' => 'Task notification sent successfully'];
            
        } catch (Exception $e) {
            error_log("Task notification error: " . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to send task notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Send OTP code for Multi-Factor Authentication
     */
    public function sendOTPCode($employeeEmail, $employeeName, $otpCode, $purpose = 'login') {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($employeeEmail, $employeeName);
            
            $this->mail->isHTML(true);
            
            switch ($purpose) {
                case 'login':
                    $this->mail->Subject = 'Sky Oro Hotel - Your Login Verification Code';
                    break;
                case 'password_reset':
                    $this->mail->Subject = 'Sky Oro Hotel - Password Reset Verification Code';
                    break;
                default:
                    $this->mail->Subject = 'Sky Oro Hotel - Verification Code';
            }
            
            $this->mail->Body = $this->getOTPTemplate($employeeName, $otpCode, $purpose);
            $this->mail->AltBody = strip_tags($this->getOTPTemplate($employeeName, $otpCode, $purpose));
            
            $this->mail->send();
            return ['success' => true, 'message' => 'OTP sent successfully'];
            
        } catch (Exception $e) {
            error_log("OTP email error: " . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to send OTP: ' . $e->getMessage()];
        }
    }
    
    private function getWelcomeEmailTemplate($name, $email, $temporaryPassword) {
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .credentials { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Welcome to Sky Oro Hotel!</h1>
                </div>
                <div class='content'>
                    <h2>Hello {$name},</h2>
                    <p>Welcome to the Sky Oro Hotel team! Your employee account has been created successfully.</p>
                    
                    <div class='credentials'>
                        <h3>Your Login Credentials:</h3>
                        <p><strong>Email:</strong> {$email}</p>
                        <p><strong>Temporary Password:</strong> {$temporaryPassword}</p>
                    </div>
                    
                    <p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
                    
                    <p style='text-align: center;'>
                        <a href='http://localhost/reservation/html/auth/employee-login.html' class='btn'>Login to Employee Portal</a>
                    </p>
                    
                    <p>If you have any questions, please contact the IT department at ext. 101.</p>
                </div>
                <div class='footer'>
                    <p>© 2025 Sky Oro Hotel - Employee Management System</p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    private function getPasswordResetTemplate($name, $resetLink) {
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Password Reset Request</h1>
                </div>
                <div class='content'>
                    <h2>Hello {$name},</h2>
                    <p>We received a request to reset your Sky Oro Hotel employee account password.</p>
                    
                    <p style='text-align: center;'>
                        <a href='{$resetLink}' class='btn'>Reset Your Password</a>
                    </p>
                    
                    <div class='warning'>
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This link will expire in 1 hour</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Contact IT immediately if you suspect unauthorized access</li>
                        </ul>
                    </div>
                    
                    <p>For security reasons, please change your password regularly.</p>
                </div>
                <div class='footer'>
                    <p>© 2025 Sky Oro Hotel - Employee Management System</p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    private function getTaskNotificationTemplate($name, $taskDetails) {
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .task-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>New Task Assignment</h1>
                </div>
                <div class='content'>
                    <h2>Hello {$name},</h2>
                    <p>You have been assigned a new task:</p>
                    
                    <div class='task-box'>
                        <h3>{$taskDetails['title']}</h3>
                        <p><strong>Description:</strong> {$taskDetails['description']}</p>
                        <p><strong>Priority:</strong> {$taskDetails['priority']}</p>
                        <p><strong>Due Date:</strong> {$taskDetails['due_date']}</p>
                        <p><strong>Location:</strong> {$taskDetails['location']}</p>
                    </div>
                    
                    <p style='text-align: center;'>
                        <a href='http://localhost/reservation/html/handyman/handydashboard.html' class='btn'>View Task Details</a>
                    </p>
                    
                    <p>Please log into your dashboard to view full task details and update the status.</p>
                </div>
                <div class='footer'>
                    <p>© 2025 Sky Oro Hotel - Employee Management System</p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    private function getOTPTemplate($name, $otpCode, $purpose = 'login') {
        $purposeText = $purpose === 'login' ? 'complete your login' : 'verify your identity';
        $urgencyText = $purpose === 'login' ? 'Please enter this code in your login screen to complete authentication.' : 'Please enter this code to proceed with your request.';
        
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .otp-box { background: white; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0; border: 2px dashed #10b981; }
                .otp-code { font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 8px; margin: 20px 0; }
                .security-notice { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🔐 Verification Code</h1>
                </div>
                <div class='content'>
                    <h2>Hello {$name},</h2>
                    <p>To {$purposeText}, please use the verification code below:</p>
                    
                    <div class='otp-box'>
                        <p style='margin: 0; color: #666; font-size: 14px;'>Your verification code is:</p>
                        <div class='otp-code'>{$otpCode}</div>
                        <p style='margin: 0; color: #666; font-size: 12px;'>This code expires in 5 minutes</p>
                    </div>
                    
                    <p>{$urgencyText}</p>
                    
                    <div class='security-notice'>
                        <h4 style='margin-top: 0;'>🛡️ Security Notice:</h4>
                        <ul style='margin: 5px 0; padding-left: 20px;'>
                            <li>This code is valid for 5 minutes only</li>
                            <li>Never share this code with anyone</li>
                            <li>Sky Oro Hotel staff will never ask for this code</li>
                            <li>If you didn't request this code, please contact IT immediately</li>
                        </ul>
                    </div>
                    
                    <p style='text-align: center; margin-top: 30px;'>
                        <small style='color: #666;'>
                            Need help? Contact IT Support at ext. 101 or email support@skyorohotel.com
                        </small>
                    </p>
                </div>
                <div class='footer'>
                    <p>© 2025 Sky Oro Hotel - Secure Employee Portal</p>
                    <p style='font-size: 10px; color: #999;'>This is an automated security message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
?>