<?php 
// api/auth/check.php - Check Authentication Status

// Define the allowed origin.
// IMPORTANT: In a production environment, replace 'http://localhost' with your actual frontend domain.
$allowed_origin = 'http://localhost';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . $allowed_origin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // The browser sends an OPTIONS request first to check CORS policy.
    // We respond with 200 OK to indicate the actual request is allowed.
    http_response_code(200);
    exit();
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is authenticated
if (isset($_SESSION['user_id']) && isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true) {
    // Check session timeout (optional - 24 hours)
    $sessionTimeout = 24 * 60 * 60; // 24 hours in seconds
    if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $sessionTimeout) {
        // Session expired
        session_unset();
        session_destroy();
        
        http_response_code(401);
        echo json_encode([
            'authenticated' => false,
            'error' => 'Session expired'
        ]);
        exit();
    }

    // User is authenticated
    echo json_encode([
        'authenticated' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'employee_id' => $_SESSION['employee_id'] ?? $_SESSION['user_id'], // ADDED: Include employee_id
            'name' => $_SESSION['name'] ?? 'User',
            'email' => $_SESSION['email'] ?? '',
            'role' => $_SESSION['role'] ?? 'guest',
            'role_id' => $_SESSION['role_id'] ?? 0
        ]
    ]);
} else {
    // User is not authenticated
    http_response_code(401);
    echo json_encode([
        'authenticated' => false,
        'error' => 'Not authenticated'
    ]);
}
?>