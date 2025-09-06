<?php
// api/auth/login.php - Updated with MFA support
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Set headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to send JSON response and exit
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Function to log errors
function logError($message) {
    error_log("[LOGIN API] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // Start session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Include required files
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../mailer.php';
    require_once __DIR__ . '/../services/OTPService.php';

    // Get database connection
    try {
        $db = getDB();
        logError("Database connection established");
    } catch (Exception $e) {
        logError("Database connection failed: " . $e->getMessage());
        sendResponse([
            'success' => false,
            'error' => 'Database connection failed'
        ], 500);
    }

    // Get and validate input
    $json = file_get_contents('php://input');
    if ($json === false) {
        logError("Failed to read request body");
        sendResponse(['success' => false, 'error' => 'Failed to read request'], 400);
    }
    
    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logError("JSON decode error: " . json_last_error_msg());
        sendResponse(['success' => false, 'error' => 'Invalid JSON'], 400);
    }

    // Get client information
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

    // Handle MFA verification step
    if (isset($data['step']) && $data['step'] === 'verify_otp') {
        if (empty($data['employee_id']) || empty($data['otp_code'])) {
            sendResponse(['success' => false, 'error' => 'Employee ID and OTP code are required'], 400);
        }

        $employeeId = $data['employee_id'];
        $otpCode = $data['otp_code'];

        logError("OTP verification attempt for employee ID: " . $employeeId);

        // Initialize OTP service
        $otpService = new OTPService($db);
        $verificationResult = $otpService->verifyOTP($employeeId, $otpCode, 'login', $ipAddress);

        if ($verificationResult['success']) {
            // Get employee details for session
            $stmt = $db->prepare("
                SELECT e.employee_id, e.first_name, e.last_name, e.email, 
                       e.role_id, e.is_active, r.role_name
                FROM employees e 
                LEFT JOIN user_roles r ON e.role_id = r.role_id 
                WHERE e.employee_id = ?
            ");
            $stmt->execute([$employeeId]);
            $user = $stmt->fetch();

            if (!$user || !$user['is_active']) {
                sendResponse(['success' => false, 'error' => 'Account not found or inactive'], 403);
            }

            // Set session variables
            $role = strtolower($user['role_name'] ?? 'guest');
            if (empty($role) || $role === 'guest') {
                $roles = [1 => 'admin', 2 => 'front desk', 3 => 'handyman'];
                $role = $roles[$user['role_id']] ?? 'guest';
            }

            $_SESSION['user_id'] = $user['employee_id'];
            $_SESSION['employee_id'] = $user['employee_id'];
            $_SESSION['role'] = $role;
            $_SESSION['role_id'] = $user['role_id'];
            $_SESSION['name'] = trim($user['first_name'] . ' ' . $user['last_name']);
            $_SESSION['email'] = $user['email'];
            $_SESSION['login_time'] = time();
            $_SESSION['logged_in'] = true;
            $_SESSION['mfa_verified'] = true;

            // Update last login
            try {
                $updateStmt = $db->prepare("UPDATE employees SET last_login = NOW() WHERE employee_id = ?");
                $updateStmt->execute([$employeeId]);
            } catch (PDOException $e) {
                logError("Failed to update last login: " . $e->getMessage());
            }

            logError("MFA login successful for employee ID: " . $employeeId);

            sendResponse([
                'success' => true,
                'step' => 'complete',
                'user' => [
                    'id' => $user['employee_id'],
                    'employee_id' => $user['employee_id'],
                    'name' => $_SESSION['name'],
                    'email' => $_SESSION['email'],
                    'role' => $role,
                    'role_id' => $user['role_id']
                ],
                'message' => 'Login successful'
            ]);
        } else {
            sendResponse(['success' => false, 'error' => $verificationResult['error']], 401);
        }
    }

    // Handle initial login step (email/password)
    if (empty($data['email']) || empty($data['password'])) {
        logError("Missing email or password");
        sendResponse(['success' => false, 'error' => 'Email and password are required'], 400);
    }

    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    
    logError("Initial login attempt for email: " . $email);

    // Check if user exists and get user data
    try {
        $stmt = $db->prepare("
            SELECT e.employee_id, e.first_name, e.last_name, e.email, e.password, 
                   e.role_id, e.is_active, e.mfa_enabled, r.role_name
            FROM employees e 
            LEFT JOIN user_roles r ON e.role_id = r.role_id 
            WHERE LOWER(e.email) = ? 
            LIMIT 1
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        logError("Database query executed. User found: " . ($user ? 'Yes' : 'No'));
        
    } catch (PDOException $e) {
        logError("Database query error: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database error'], 500);
    }

    if (!$user) {
        logError("User not found for email: " . $email);
        sendResponse(['success' => false, 'error' => 'Invalid email or password'], 401);
    }

    // Check if user is active
    if (!$user['is_active']) {
        logError("Inactive user attempted login: " . $email);
        sendResponse(['success' => false, 'error' => 'Account is deactivated'], 403);
    }

    // Verify password
    if (!password_verify($password, $user['password'])) {
        logError("Password verification failed for user: " . $email);
        sendResponse(['success' => false, 'error' => 'Invalid email or password'], 401);
    }

    logError("Password verification successful for: " . $email);

    // Check if MFA is required
    if ($user['mfa_enabled']) {
        logError("MFA required for user: " . $email);
        
        // Initialize OTP service and send OTP
        $otpService = new OTPService($db);
        $otpResult = $otpService->generateAndSendOTP($user['employee_id'], 'login', $ipAddress, $userAgent);
        
        if ($otpResult['success']) {
            // Store temporary session data (not fully logged in yet)
            $_SESSION['temp_employee_id'] = $user['employee_id'];
            $_SESSION['temp_login_time'] = time();
            
            sendResponse([
                'success' => true,
                'step' => 'mfa_required',
                'employee_id' => $user['employee_id'],
                'message' => 'Please check your email for the verification code',
                'expires_in' => $otpResult['expires_in'] ?? 300
            ]);
        } else {
            logError("Failed to send OTP: " . $otpResult['error']);
            sendResponse(['success' => false, 'error' => 'Failed to send verification code'], 500);
        }
    } else {
        // No MFA required, complete login
        $role = strtolower($user['role_name'] ?? 'guest');
        if (empty($role) || $role === 'guest') {
            $roles = [1 => 'admin', 2 => 'front desk', 3 => 'handyman'];
            $role = $roles[$user['role_id']] ?? 'guest';
        }

        $_SESSION['user_id'] = $user['employee_id'];
        $_SESSION['employee_id'] = $user['employee_id'];
        $_SESSION['role'] = $role;
        $_SESSION['role_id'] = $user['role_id'];
        $_SESSION['name'] = trim($user['first_name'] . ' ' . $user['last_name']);
        $_SESSION['email'] = $user['email'];
        $_SESSION['login_time'] = time();
        $_SESSION['logged_in'] = true;

        // Update last login
        try {
            $updateStmt = $db->prepare("UPDATE employees SET last_login = NOW() WHERE employee_id = ?");
            $updateStmt->execute([$user['employee_id']]);
        } catch (PDOException $e) {
            logError("Failed to update last login: " . $e->getMessage());
        }

        logError("Login successful (no MFA) for user: " . $email . " with role: " . $role);

        sendResponse([
            'success' => true,
            'step' => 'complete',
            'user' => [
                'id' => $user['employee_id'],
                'employee_id' => $user['employee_id'],
                'name' => $_SESSION['name'],
                'email' => $_SESSION['email'],
                'role' => $role,
                'role_id' => $user['role_id']
            ],
            'message' => 'Login successful'
        ]);
    }

} catch (Exception $e) {
    logError("Unexpected error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    sendResponse([
        'success' => false,
        'error' => 'Internal server error'
    ], 500);
}
?>