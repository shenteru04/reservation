<?php
// api/auth/resend-password-reset-otp.php
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
    error_log("[RESEND PASSWORD RESET OTP API] " . date('Y-m-d H:i:s') . " - " . $message);
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

    // Validate employee_id
    if (empty($data['employee_id'])) {
        logError("Employee ID parameter missing");
        sendResponse(['success' => false, 'error' => 'Employee ID is required'], 400);
    }

    $employeeId = trim($data['employee_id']);
    $purpose = trim($data['purpose'] ?? 'password_reset');
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    logError("Password reset OTP resend requested for employee: " . $employeeId);

    // Check if employee exists and is active
    try {
        $stmt = $db->prepare("
            SELECT employee_id, first_name, last_name, email, is_active 
            FROM employees 
            WHERE employee_id = ? 
            LIMIT 1
        ");
        $stmt->execute([$employeeId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        logError("Employee lookup result: " . ($user ? "Found employee: " . $user['employee_id'] : "No employee found"));
    } catch (PDOException $e) {
        logError("Database query error: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database error'], 500);
    }

    if (!$user) {
        logError("OTP resend attempted for non-existent employee: " . $employeeId);
        sendResponse(['success' => false, 'error' => 'Employee not found'], 404);
    }

    if (!$user['is_active']) {
        logError("OTP resend attempted for inactive employee: " . $employeeId);
        sendResponse(['success' => false, 'error' => 'Account is not active'], 403);
    }

    // Initialize OTP service
    $otpService = new OTPService($db);

    // Check rate limiting - prevent too frequent resend requests
    try {
        $rateLimitStmt = $db->prepare("
            SELECT COUNT(*) as recent_count 
            FROM otp_codes 
            WHERE employee_id = ? 
            AND purpose = ? 
            AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)
        ");
        $rateLimitStmt->execute([$employeeId, $purpose]);
        $recentCount = $rateLimitStmt->fetchColumn();
        
        if ($recentCount >= 3) {
            logError("Rate limit exceeded for employee: " . $employeeId);
            sendResponse([
                'success' => false, 
                'error' => 'Too many resend attempts. Please wait 2 minutes before requesting again.'
            ], 429);
        }
        
    } catch (PDOException $e) {
        logError("Rate limit check error: " . $e->getMessage());
        // Continue without rate limiting if check fails
    }

    // Generate and store new OTP
    try {
        $result = $otpService->generateOTP(
            $user['employee_id'], 
            $purpose, 
            $ipAddress,
            300 // 5 minutes expiry
        );
        
        logError("OTP regeneration result: " . json_encode($result));
        
        if (!$result['success']) {
            throw new Exception($result['error']);
        }
        
        $otpCode = $result['otp_code'];
        
    } catch (Exception $e) {
        logError("Failed to generate new OTP: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Failed to generate new verification code'], 500);
    }

    // Send OTP via email
    try {
        logError("Attempting to send resend password reset OTP email");
        $emailService = new EmailService();
        
        $employeeName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
        if (empty(trim($employeeName))) {
            $employeeName = 'Employee';
        }
        
        logError("Sending resend password reset OTP email to: " . $user['email'] . " for: " . $employeeName);
        $emailResult = $emailService->sendOTPCode($user['email'], $employeeName, $otpCode, $purpose);
        logError("Email service result: " . json_encode($emailResult));
        
        if ($emailResult['success']) {
            logError("Password reset OTP resent successfully to: " . $user['email']);
            sendResponse([
                'success' => true,
                'message' => 'A new verification code has been sent to your email address.',
                'expires_in' => 300
            ]);
        } else {
            logError("Failed to send resend password reset OTP email: " . ($emailResult['error'] ?? 'Unknown error'));
            
            // Clean up the OTP since email failed
            try {
                $otpService->invalidateOTP($user['employee_id'], $purpose);
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
            $otpService->invalidateOTP($user['employee_id'], $purpose);
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