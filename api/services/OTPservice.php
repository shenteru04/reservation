<?php
require_once __DIR__ . '/../config/db.php';

// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

class OTPService {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function generateOTP($employeeId, $purpose = 'login', $ipAddress = null) {
        try {
            $otpCode = sprintf("%06d", mt_rand(100000, 999999)); // Generate 6-digit OTP
            // Fix timezone issue - use current timestamp + 5 minutes
            $expiresAt = date('Y-m-d H:i:s', time() + (5 * 60)); // OTP valid for 5 minutes
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

            error_log("[OTPService] Generating OTP for employee: $employeeId, purpose: $purpose");

            // Delete any existing OTPs for this employee and purpose
            $deleteStmt = $this->db->prepare("
                DELETE FROM email_otp 
                WHERE employee_id = ? AND purpose = ? AND verified_at IS NULL
            ");
            $deleteStmt->execute([$employeeId, $purpose]);
            error_log("[OTPService] Deleted existing OTPs for employee: $employeeId");

            // Insert new OTP
            $insertStmt = $this->db->prepare("
                INSERT INTO email_otp (
                    employee_id, otp_code, purpose, expires_at, 
                    attempts, max_attempts, created_at, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, 0, 3, NOW(), ?, ?)
            ");
            $insertStmt->execute([$employeeId, $otpCode, $purpose, $expiresAt, $ipAddress, $userAgent]);
            
            $insertedId = $this->db->lastInsertId();
            error_log("[OTPService] Inserted new OTP record with ID: $insertedId, code: $otpCode, expires: $expiresAt");

            // Send OTP via email
            $this->sendOTPEmail($employeeId, $otpCode, $purpose);

            return [
                'success' => true,
                'expires_in' => 300, // 5 minutes in seconds
                'message' => 'OTP generated and sent',
                'otp_code' => $otpCode // <-- Add this line
            ];
        } catch (Exception $e) {
            error_log("[OTPService] Error generating OTP: " . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to generate OTP'];
        }
    }

    // Add the missing method that login.php is trying to call
    public function generateAndSendOTP($employeeId, $purpose = 'login', $ipAddress = null, $userAgent = null) {
        try {
            $otpCode = sprintf("%06d", mt_rand(100000, 999999)); // Generate 6-digit OTP
            // Fix timezone issue - use current timestamp + 5 minutes
            $expiresAt = date('Y-m-d H:i:s', time() + (5 * 60)); // OTP valid for 5 minutes

            error_log("[OTPService] generateAndSendOTP for employee: $employeeId, purpose: $purpose");

            // Delete any existing OTPs for this employee and purpose
            $deleteStmt = $this->db->prepare("
                DELETE FROM email_otp 
                WHERE employee_id = ? AND purpose = ? AND verified_at IS NULL
            ");
            $deleteStmt->execute([$employeeId, $purpose]);
            error_log("[OTPService] Deleted existing OTPs for employee: $employeeId");

            // Insert new OTP
            $insertStmt = $this->db->prepare("
                INSERT INTO email_otp (
                    employee_id, otp_code, purpose, expires_at, 
                    attempts, max_attempts, created_at, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, 0, 3, NOW(), ?, ?)
            ");
            $insertStmt->execute([$employeeId, $otpCode, $purpose, $expiresAt, $ipAddress, $userAgent]);
            
            $insertedId = $this->db->lastInsertId();
            error_log("[OTPService] Inserted new OTP record with ID: $insertedId, code: $otpCode, expires: $expiresAt");

            // Send OTP via email
            $this->sendOTPEmail($employeeId, $otpCode, $purpose);

            return [
                'success' => true,
                'expires_in' => 300, // 5 minutes in seconds
                'message' => 'OTP generated and sent successfully'
            ];
        } catch (Exception $e) {
            error_log("[OTPService] Error generating and sending OTP: " . $e->getMessage());
            return ['success' => false, 'error' => 'Failed to generate and send OTP'];
        }
    }

    public function verifyOTP($employeeId, $otpCode, $purpose = 'login', $ipAddress = null) {
        try {
            error_log("[OTPService] Verifying OTP for employee: '$employeeId', code: '$otpCode', purpose: '$purpose'");
            
            // Clean the inputs - remove any whitespace
            $employeeId = trim($employeeId);
            $otpCode = trim($otpCode);
            $purpose = trim($purpose);
            
            // First, let's see what OTPs exist for this employee
            $debugStmt = $this->db->prepare("
                SELECT otp_id, employee_id, otp_code, purpose, expires_at, attempts, max_attempts, 
                       verified_at, created_at, 
                       (expires_at > NOW()) as not_expired,
                       (verified_at IS NULL) as not_verified
                FROM email_otp 
                WHERE employee_id = ? 
                ORDER BY created_at DESC
                LIMIT 5
            ");
            $debugStmt->execute([$employeeId]);
            $allOtps = $debugStmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("[OTPService] All OTPs for employee '$employeeId': " . json_encode($allOtps));
            
            // Fetch the latest unverified OTP
            $stmt = $this->db->prepare("
                SELECT otp_id, otp_code, expires_at, attempts, max_attempts, created_at
                FROM email_otp 
                WHERE employee_id = ? 
                AND purpose = ? 
                AND verified_at IS NULL 
                AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            ");
            $stmt->execute([$employeeId, $purpose]);
            $otpRecord = $stmt->fetch(PDO::FETCH_ASSOC);

            error_log("[OTPService] Query result: " . json_encode($otpRecord));

            if (!$otpRecord) {
                error_log("[OTPService] No valid OTP found for employee: '$employeeId', purpose: '$purpose'");
                
                // Check if there's an OTP but it's expired
                $expiredStmt = $this->db->prepare("
                    SELECT otp_id, expires_at, (expires_at <= NOW()) as is_expired
                    FROM email_otp 
                    WHERE employee_id = ? AND purpose = ? AND verified_at IS NULL 
                    ORDER BY created_at DESC LIMIT 1
                ");
                $expiredStmt->execute([$employeeId, $purpose]);
                $expiredOtp = $expiredStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($expiredOtp) {
                    error_log("[OTPService] Found expired OTP: " . json_encode($expiredOtp));
                    return ['success' => false, 'error' => 'OTP has expired. Please request a new code.'];
                }
                
                return ['success' => false, 'error' => 'No valid OTP found. Please request a new code.'];
            }

            error_log("[OTPService] Comparing codes - Stored: '{$otpRecord['otp_code']}', Provided: '$otpCode'");

            if ($otpRecord['attempts'] >= $otpRecord['max_attempts']) {
                error_log("[OTPService] Max attempts exceeded for OTP ID: {$otpRecord['otp_id']}");
                return ['success' => false, 'error' => 'Maximum OTP attempts exceeded. Please request a new code.'];
            }

            // Compare OTP codes as strings
            if (strcmp($otpRecord['otp_code'], $otpCode) !== 0) {
                error_log("[OTPService] OTP mismatch - stored: '{$otpRecord['otp_code']}', provided: '$otpCode'");
                
                // Increment attempts
                $updateStmt = $this->db->prepare("
                    UPDATE email_otp 
                    SET attempts = attempts + 1 
                    WHERE otp_id = ?
                ");
                $updateStmt->execute([$otpRecord['otp_id']]);
                
                $remainingAttempts = $otpRecord['max_attempts'] - ($otpRecord['attempts'] + 1);
                return ['success' => false, 'error' => "Invalid OTP code. $remainingAttempts attempts remaining."];
            }

            // OTP is valid, mark as verified
            $updateStmt = $this->db->prepare("
                UPDATE email_otp 
                SET verified_at = NOW(), attempts = attempts + 1 
                WHERE otp_id = ?
            ");
            $updateStmt->execute([$otpRecord['otp_id']]);

            error_log("[OTPService] OTP verified successfully for employee: $employeeId");
            return ['success' => true, 'message' => 'OTP verified successfully'];
            
        } catch (Exception $e) {
            error_log("[OTPService] Error verifying OTP: " . $e->getMessage());
            error_log("[OTPService] Stack trace: " . $e->getTraceAsString());
            return ['success' => false, 'error' => 'Failed to verify OTP'];
        }
    }

    public function resendOTP($employeeId, $purpose = 'login', $ipAddress = null) {
        return $this->generateOTP($employeeId, $purpose, $ipAddress);
    }

    private function sendOTPEmail($employeeId, $otpCode, $purpose = 'login') {
        try {
            // Get employee details
            $stmt = $this->db->prepare("SELECT email, first_name, last_name FROM employees WHERE employee_id = ?");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$employee || !$employee['email']) {
                error_log("[OTPService] No email found for employee: $employeeId");
                throw new Exception('No email found for employee');
            }
            
            // Use your EmailService class
            require_once __DIR__ . '/../mailer.php';
            $emailService = new EmailService();
            
            $employeeName = trim(($employee['first_name'] ?? '') . ' ' . ($employee['last_name'] ?? ''));
            if (empty(trim($employeeName))) {
                $employeeName = 'Employee';
            }
            
            $result = $emailService->sendOTPCode($employee['email'], $employeeName, $otpCode, $purpose);
            
            if (!$result['success']) {
                throw new Exception($result['error']);
            }
            
            error_log("[OTPService] OTP $otpCode sent to {$employee['email']} for employee: $employeeId");
            
        } catch (Exception $e) {
            error_log("[OTPService] Failed to send OTP email: " . $e->getMessage());
            throw new Exception('Failed to send verification code: ' . $e->getMessage());
        }
    }
}
?>