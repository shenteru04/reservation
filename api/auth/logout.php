<?php
// api/auth/logout.php - Logout API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Function to log activity
function logActivity($message) {
    error_log("[LOGOUT API] " . date('Y-m-d H:i:s') . " - " . $message);
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

    // Check if user is logged in
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in'])) {
        logActivity("Logout attempted but user not logged in");
        sendResponse(['success' => false, 'error' => 'Not logged in'], 401);
    }

    // Log the logout attempt
    $userId = $_SESSION['user_id'] ?? 'unknown';
    $userEmail = $_SESSION['email'] ?? 'unknown';
    logActivity("User logout initiated - ID: $userId, Email: $userEmail");

    // Store user info for response before destroying session
    $userName = $_SESSION['name'] ?? '';

    // Destroy session
    session_unset();
    session_destroy();
    
    // Delete the session cookie
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }

    logActivity("Session destroyed successfully for user: $userEmail");

    // Send success response
    sendResponse([
        'success' => true,
        'message' => 'Logout successful',
        'user' => $userName
    ]);

} catch (Exception $e) {
    logActivity("Logout error: " . $e->getMessage());
    sendResponse([
        'success' => false,
        'error' => 'Logout failed: ' . $e->getMessage()
    ], 500);
}
?>