<?php
// api/auth/verify-otp.php - Debug version with detailed logging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
        'request_body' => file_get_contents('php://input'),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    $logMessage = "[VERIFY OTP API] $message";
    if ($exception) {
        $logMessage .= "\nException: " . $exception->getMessage() . 
                       "\nFile: " . $exception->getFile() . 
                       "\nLine: " . $exception->getLine();
    }
    $logMessage .= "\nContext: " . json_encode($context);
    error_log($logMessage);
}

// Utility function to get role name
function getRoleName($roleId, $roleName, $db) {
    if (!empty($roleName) && $roleName !== 'guest') {
        return strtolower($roleName);
    }
    
    $stmt = $db->prepare("SELECT role_name FROM user_roles WHERE role_id = ?");
    $stmt->execute([$roleId]);
    $role = $stmt->fetchColumn();
    
    return $role ? strtolower($role) : 'guest';
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // Configure session settings
    ini_set('session.cookie_secure', '0'); // Set to 1 for HTTPS
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');

    // Start session
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_lifetime' => 86400, // 24 hours
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
    $purpose = trim($data['purpose'] ?? 'login');
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;

    logError("Processing OTP verification - Employee ID: '$employeeId', OTP: '$otpCode', Purpose: '$purpose'");

    // Validate OTP format
    if (!preg_match('/^[0-9]{6}$/', $otpCode)) {
        logError("Invalid OTP format: '$otpCode'");
        sendResponse(['success' => false, 'error' => 'OTP must be a 6-digit number'], 400);
    }

    // Check if employee exists
    $employeeStmt = $db->prepare("SELECT employee_id FROM employees WHERE employee_id = ?");
    $employeeStmt->execute([$employeeId]);
    $employeeExists = $employeeStmt->fetch();
    
    if (!$employeeExists) {
        logError("Employee not found: '$employeeId'");
        sendResponse(['success' => false, 'error' => 'Employee not found'], 404);
    }

    $otpService = new OTPService($db);
    $result = $otpService->verifyOTP($employeeId, $otpCode, $purpose, $ipAddress);

    logError("OTP verification result: " . json_encode($result));

    if ($result['success']) {
        // Get employee details for complete login
        $stmt = $db->prepare("
            SELECT e.employee_id, e.first_name, e.last_name, e.email, 
                   e.role_id, e.is_active, r.role_name
            FROM employees e 
            LEFT JOIN user_roles r ON e.role_id = r.role_id 
            WHERE e.employee_id = ?
        ");
        $stmt->execute([$employeeId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        logError("Employee details: " . json_encode($user));

        if (!$user || !$user['is_active']) {
            logError("Account not found or inactive for employee: $employeeId");
            sendResponse(['success' => false, 'error' => 'Account not found or inactive'], 403);
        }

        // Complete the login session
        $role = getRoleName($user['role_id'], $user['role_name'], $db);

        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['employee_id'];
        $_SESSION['employee_id'] = $user['employee_id'];
        $_SESSION['role'] = $role;
        $_SESSION['role_id'] = $user['role_id'];
        $_SESSION['name'] = trim($user['first_name'] . ' ' . $user['last_name']);
        $_SESSION['email'] = $user['email'];
        $_SESSION['login_time'] = time();
        $_SESSION['logged_in'] = true;
        $_SESSION['mfa_verified'] = true;

        // Clear temporary session data
        unset($_SESSION['temp_employee_id']);
        unset($_SESSION['temp_login_time']);

        logError("Session set for user: " . json_encode($_SESSION));

        // Update last login
        try {
            $updateStmt = $db->prepare("UPDATE employees SET last_login = NOW() WHERE employee_id = ?");
            $updateStmt->execute([$employeeId]);
            logError("Updated last login for employee: $employeeId");
        } catch (PDOException $e) {
            logError("Failed to update last login: " . $e->getMessage());
        }

        logError("OTP verification successful for employee: $employeeId");

        sendResponse([
            'success' => true,
            'user' => [
                'id' => $user['employee_id'],
                'employee_id' => $user['employee_id'],
                'name' => $_SESSION['name'],
                'email' => $_SESSION['email'],
                'role' => $role,
                'role_id' => $user['role_id']
            ],
            'message' => 'OTP verified successfully'
        ]);
    } else {
        logError("OTP verification failed for employee: $employeeId - " . $result['error']);
        sendResponse(['success' => false, 'error' => $result['error']], 401);
    }

} catch (Exception $e) {
    logError("Unexpected error in verify-otp.php", $e);
    sendResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
?>