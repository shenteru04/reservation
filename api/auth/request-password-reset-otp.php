<?php
// api/auth/request-password-reset-otp.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

function logError($message) {
    error_log("[REQUEST PASSWORD RESET OTP API] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // Include database config and services
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../services/OTPService.php';
    require_once __DIR__ . '/../mailer.php';

    // Get database connection
    try {
        $db = getDB();
        if (!$db) {
            throw new Exception('Database connection returned null');
        }
        logError("Database connection successful");
    } catch (Exception $e) {
        logError("Database connection failed: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database connection failed'], 500);
    }

    // Get input data
    $json = file_get_contents('php://input');
    if ($json === false) {
        logError("Failed to read request body");
        sendResponse(['success' => false, 'error' => 'Failed to read request'], 400);
    }

    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logError("JSON decode error: " . json_last_error_msg());
        sendResponse(['success' => false, 'error' => 'Invalid JSON: ' . json_last_error_msg()], 400);
    }

    // Validate email
    if (empty($data['email'])) {
        logError("Email parameter missing");
        sendResponse(['success' => false, 'error' => 'Email is required'], 400);
    }

    $email = trim(strtolower($data['email']));
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        logError("Invalid email format: " . $email);
        sendResponse(['success' => false, 'error' => 'Invalid email format'], 400);
    }

    logError("Password reset OTP requested for: " . $email);

    // Check if user exists and is active
    try {
        $stmt = $db->prepare("
            SELECT employee_id, first_name, last_name, email, is_active 
            FROM employees 
            WHERE LOWER(email) = ? 
            LIMIT 1
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        logError("User lookup result: " . ($user ? "Found user ID: " . $user['employee_id'] : "No user found"));
    } catch (PDOException $e) {
        logError("Database query error: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database error'], 500);
    }

    if (!$user) {
        // For security, don't reveal if email exists or not
        logError("Password reset OTP attempted for non-existent email: " . $email);
        sendResponse([
            'success' => true,
            'message' => 'If the email exists in our system, a verification code has been sent.',
            'employee_id' => 'dummy' // Dummy response for security
        ]);
    }

    if (!$user['is_active']) {
        logError("Password reset OTP attempted for inactive user: " . $email);
        sendResponse([
            'success' => true,
            'message' => 'If the email exists in our system, a verification code has been sent.',
            'employee_id' => 'dummy' // Dummy response for security
        ]);
    }

    // Initialize OTP service
    $otpService = new OTPService($db);
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    // Generate and store OTP
    try {
        $result = $otpService->generateOTP(
            $user['employee_id'], 
            'password_reset', 
            $ipAddress,
            300 // 5 minutes expiry
        );
        
        logError("OTP generation result: " . json_encode($result));
        
        if (!$result['success']) {
            throw new Exception($result['error']);
        }
        
        $otpCode = $result['otp_code'];
        
    } catch (Exception $e) {
        logError("Failed to generate OTP: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Failed to generate verification code'], 500);
    }

    // Send OTP via email
    try {
        logError("Attempting to send password reset OTP email");
        $emailService = new EmailService();
        
        $employeeName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
        if (empty(trim($employeeName))) {
            $employeeName = 'Employee';
        }
        
        logError("Sending password reset OTP email to: " . $email . " for: " . $employeeName);
        $emailResult = $emailService->sendOTPCode($email, $employeeName, $otpCode, 'password_reset');
        logError("Email service result: " . json_encode($emailResult));
        
        if ($emailResult['success']) {
            logError("Password reset OTP email sent successfully to: " . $email);
            sendResponse([
                'success' => true,
                'message' => 'A 6-digit verification code has been sent to your email address.',
                'employee_id' => $user['employee_id'],
                'expires_in' => 300
            ]);
        } else {
            logError("Failed to send password reset OTP email: " . ($emailResult['error'] ?? 'Unknown error'));
            
            // Clean up the OTP since email failed
            try {
                $otpService->invalidateOTP($user['employee_id'], 'password_reset');
                logError("Cleaned up failed OTP");
            } catch (Exception $cleanupError) {
                logError("Failed to cleanup OTP: " . $cleanupError->getMessage());
            }
            
            sendResponse([
                'success' => false, 
                'error' => 'Failed to send verification code: ' . ($emailResult['error'] ?? 'Email service error')
            ], 500);
        }
    } catch (Exception $e) {
        logError("Email service error: " . $e->getMessage());
        logError("Stack trace: " . $e->getTraceAsString());
        
        // Clean up the OTP since email failed
        try {
            $otpService->invalidateOTP($user['employee_id'], 'password_reset');
            logError("Cleaned up failed OTP after email error");
        } catch (Exception $cleanupError) {
            logError("Failed to cleanup OTP after email error: " . $cleanupError->getMessage());
        }
        
        sendResponse([
            'success' => false, 
            'error' => 'Email service error: ' . $e->getMessage()
        ], 500);
    }

} catch (Exception $e) {
    logError("Unexpected error: " . $e->getMessage());
    logError("Stack trace: " . $e->getTraceAsString());
    sendResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
?>