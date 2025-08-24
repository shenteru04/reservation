<?php
// debug_dashboard.php - Test script to debug dashboard issues
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../../config/db.php';

$debug_info = [
    'session_status' => session_status(),
    'session_id' => session_id(),
    'session_data' => $_SESSION,
    'php_version' => phpversion(),
    'current_time' => date('Y-m-d H:i:s'),
    'server_info' => [
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
        'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'unknown',
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'unknown'
    ]
];

// Test database connection
try {
    $db = getDB();
    $debug_info['database'] = [
        'status' => 'connected',
        'connection_type' => get_class($db)
    ];
    
    // Test a simple query
    $stmt = $db->query("SELECT COUNT(*) as total FROM rooms");
    $result = $stmt->fetch();
    $debug_info['database']['room_count'] = $result['total'];
    
} catch (Exception $e) {
    $debug_info['database'] = [
        'status' => 'error',
        'error' => $e->getMessage()
    ];
}

// Check authentication status
$debug_info['authentication'] = [
    'user_id' => $_SESSION['user_id'] ?? null,
    'logged_in' => $_SESSION['logged_in'] ?? null,
    'email' => $_SESSION['email'] ?? null,
    'role' => $_SESSION['role'] ?? null,
    'role_id' => $_SESSION['role_id'] ?? null,
    'first_name' => $_SESSION['first_name'] ?? null,
    'last_name' => $_SESSION['last_name'] ?? null
];

// Check if authenticated
$debug_info['is_authenticated'] = (
    isset($_SESSION['user_id']) && 
    isset($_SESSION['logged_in']) && 
    $_SESSION['logged_in'] === true
);

echo json_encode($debug_info, JSON_PRETTY_PRINT);
?>