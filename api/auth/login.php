<?php
// api/auth/login.php - Fixed Login API
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
    
    // Include database configuration
    require_once __DIR__ . '/../config/db.php';

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

    // Check required fields
    if (empty($data['email']) || empty($data['password'])) {
        logError("Missing email or password");
        sendResponse(['success' => false, 'error' => 'Email and password are required'], 400);
    }

    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    
    logError("Attempting login for email: " . $email);

    // Check if user exists and get user data
    try {
        $stmt = $db->prepare("
            SELECT e.employee_id, e.first_name, e.last_name, e.email, e.password, 
                   e.role_id, e.is_active, r.role_name
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

    // Get role name (fallback to role_id if role_name not found)
    $role = strtolower($user['role_name'] ?? 'guest');
    if (empty($role) || $role === 'guest') {
        $roles = [
            1 => 'admin',
            2 => 'front desk', 
            3 => 'handyman'
        ];
        $role = $roles[$user['role_id']] ?? 'guest';
    }

    // Set session variables
    $_SESSION['user_id'] = $user['employee_id'];
    $_SESSION['role'] = $role;
    $_SESSION['role_id'] = $user['role_id'];
    $_SESSION['name'] = trim($user['first_name'] . ' ' . $user['last_name']);
    $_SESSION['email'] = $user['email'];
    $_SESSION['login_time'] = time();
    $_SESSION['logged_in'] = true;

    logError("Login successful for user: " . $email . " with role: " . $role);

    // Update last login timestamp
    try {
        $updateStmt = $db->prepare("UPDATE employees SET last_login = NOW() WHERE employee_id = ?");
        $updateStmt->execute([$user['employee_id']]);
        logError("Last login timestamp updated");
    } catch (PDOException $e) {
        logError("Failed to update last login: " . $e->getMessage());
        // Don't fail the login for this
    }

    // Send success response
    sendResponse([
        'success' => true,
        'user' => [
            'id' => $user['employee_id'],
            'name' => $_SESSION['name'],
            'email' => $_SESSION['email'],
            'role' => $role,
            'role_id' => $user['role_id']
        ],
        'message' => 'Login successful'
    ]);

} catch (Exception $e) {
    logError("Unexpected error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    sendResponse([
        'success' => false,
        'error' => 'Internal server error'
    ], 500);
}
?>