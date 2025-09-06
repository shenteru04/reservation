<?php
// api/auth/verify-password-reset-otp.php
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

function logError($message, $exception = null) {
    $context = [
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    $logMessage = "[VERIFY PASSWORD RESET OTP API] $message";
    if ($exception) {
        $logMessage .= "\nException: " . $exception->getMessage() . 
                       "\nFile: " . $exception->getFile() . 
                       "\nLine: " . $exception->getLine();
    }
    $logMessage .= "\nContext: " . json_encode($context);
    error_log($logMessage);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // Configure session settings
    ini_set('session.cookie_secure', '0'); // Set to 1 for HTTPS
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');

    // Start session for storing temporary reset verification
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_lifetime' => 3600, // 1 hour
            'cookie_secure' => false, // Set to true for HTTPS
            'cookie_httponly' => true,
            'use_strict_mode' => true
        ]);
    }

    // Include required files
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../services/OTPService.php';

    $db = getDB();
    $json = file_get_contents('php://input');
    logError("Raw request body: $json");
    
    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logError("JSON decode error: " . json_last_error_msg());
        sendResponse(['success' => false, 'error' => 'Invalid JSON format'], 400);
    }
    
    logError("Parsed data: " . json_encode($data));

    if (empty($data['employee_id']) || empty($data['otp_code'])) {
        logError("Missing required fields - employee_id: " . ($data['employee_id'] ?? 'missing') . ", otp_code: " . ($data['otp_code'] ?? 'missing'));
        sendResponse(['success' => false, 'error' => 'Employee ID and OTP code are required'], 400);
    }

    $employeeId = trim($data['employee_id']);
    $otpCode = trim($data['otp_code']);
    $purpose = trim($data['purpose'] ?? 'password_reset');
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;

    logError("Processing password reset OTP verification - Employee ID: '$employeeId', OTP: '$otpCode', Purpose: '$purpose'");

    // Validate OTP format
    if (!preg_match('/^[0-9]{6}$/', $otpCode)) {
        logError("Invalid OTP format: '$otpCode'");
        sendResponse(['success' => false, 'error' => 'OTP must be a 6-digit number'], 400);
    }

    // Check if employee exists and is active
    $employeeStmt = $db->prepare("SELECT employee_id, is_active FROM employees WHERE employee_id = ?");
    $employeeStmt->execute([$employeeId]);
    $employee = $employeeStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$employee) {
        logError("Employee not found: '$employeeId'");
        sendResponse(['success' => false, 'error' => 'Employee not found'], 404);
    }

    if (!$employee['is_active']) {
        logError("Password reset attempted for inactive employee: '$employeeId'");
        sendResponse(['success' => false, 'error' => 'Account is not active'], 403);
    }

    $otpService = new OTPService($db);
    $result = $otpService->verifyOTP($employeeId, $otpCode, $purpose, $ipAddress);

    logError("OTP verification result: " . json_encode($result));

    if ($result['success']) {
        // Store temporary session data for password reset
        session_regenerate_id(true);
        $_SESSION['temp_password_reset'] = [
            'employee_id' => $employeeId,
            'verified_at' => time(),
            'ip_address' => $ipAddress,
            'expires_at' => time() + 1800 // 30 minutes to complete password reset
        ];

        logError("Password reset OTP verification successful for employee: $employeeId");

        sendResponse([
            'success' => true,
            'message' => 'OTP verified successfully. You can now set a new password.',
            'employee_id' => $employeeId
        ]);
    } else {
        logError("Password reset OTP verification failed for employee: $employeeId - " . $result['error']);
        sendResponse(['success' => false, 'error' => $result['error']], 401);
    }

} catch (Exception $e) {
    logError("Unexpected error in verify-password-reset-otp.php", $e);
    sendResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
?>