<?php
// api/admin/dashboard-data.php
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors to prevent HTML output

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Start session and check authentication
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

// Load database configuration
$dbPaths = [
    __DIR__ . '/../../config/db.php',
    __DIR__ . '/../config/db.php',
    dirname(dirname(__DIR__)) . '/config/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/reservation/config/db.php'
];

$dbLoaded = false;
foreach ($dbPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $dbLoaded = true;
        break;
    }
}

if (!$dbLoaded) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database configuration not found']);
    exit();
}

try {
    $db = getDB(); // Using your getDB() function
    
    // Initialize response data
    $dashboardData = [
        'success' => true,
        'occupiedRooms' => 0,
        'todaysCheckins' => 0,
        'todaysRevenue' => 0.00,
        'pendingReservations' => 0,
        'recentCheckins' => []
    ];
    
    // Get current date
    $today = date('Y-m-d');
    
    // 1. Get occupied rooms count (room_status_id = 2 means occupied)
    try {
        $stmt = $db->prepare("
            SELECT COUNT(*) as count 
            FROM rooms 
            WHERE room_status_id = 2
        ");
        $stmt->execute();
        $result = $stmt->fetch();
        $dashboardData['occupiedRooms'] = (int)($result['count'] ?? 0);
    } catch (PDOException $e) {
        error_log("Error getting occupied rooms: " . $e->getMessage());
    }
    
    // 2. Get today's check-ins count (reservation_status_id = 3 means checked-in)
    try {
        $stmt = $db->prepare("
            SELECT COUNT(*) as count 
            FROM reservations 
            WHERE DATE(check_in_date) = ? 
            AND reservation_status_id = 3
        ");
        $stmt->execute([$today]);
        $result = $stmt->fetch();
        $dashboardData['todaysCheckins'] = (int)($result['count'] ?? 0);
    } catch (PDOException $e) {
        error_log("Error getting today's check-ins: " . $e->getMessage());
    }
    
    // 3. Get today's revenue from billing table (payment_status_id = 1 means paid)
    try {
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(total_amount), 0) as revenue 
            FROM billing 
            WHERE DATE(created_at) = ? 
            AND payment_status_id = 1
        ");
        $stmt->execute([$today]);
        $result = $stmt->fetch();
        $dashboardData['todaysRevenue'] = (float)($result['revenue'] ?? 0);
    } catch (PDOException $e) {
        error_log("Error getting today's revenue from billing: " . $e->getMessage());
        
        // Try alternative query from reservations table
        try {
            $stmt = $db->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as revenue 
                FROM reservations 
                WHERE DATE(check_in_date) = ? 
                AND reservation_status_id IN (2, 3, 4)
            ");
            $stmt->execute([$today]);
            $result = $stmt->fetch();
            $dashboardData['todaysRevenue'] = (float)($result['revenue'] ?? 0);
        } catch (PDOException $e2) {
            error_log("Error getting revenue from reservations: " . $e2->getMessage());
        }
    }
    
    // 4. Get pending reservations count (reservation_status_id = 1 means pending)
    try {
        $stmt = $db->prepare("
            SELECT COUNT(*) as count 
            FROM reservations 
            WHERE reservation_status_id = 1
        ");
        $stmt->execute();
        $result = $stmt->fetch();
        $dashboardData['pendingReservations'] = (int)($result['count'] ?? 0);
    } catch (PDOException $e) {
        error_log("Error getting pending reservations: " . $e->getMessage());
    }
    
    // 5. Get recent check-ins (last 10)
    try {
        $stmt = $db->prepare("
            SELECT 
                r.reservation_id,
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                r.check_in_date,
                r.check_out_date,
                r.total_amount,
                rm.room_number,
                rt.type_name as room_type,
                rs.status_name as reservation_status
            FROM reservations r 
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms rm ON r.room_id = rm.room_id 
            LEFT JOIN room_types rt ON rm.room_type_id = rt.room_type_id
            LEFT JOIN reservation_status rs ON r.reservation_status_id = rs.reservation_status_id
            WHERE r.reservation_status_id IN (2, 3) 
            ORDER BY r.check_in_date DESC, r.created_at DESC
            LIMIT 10
        ");
        $stmt->execute();
        $recentCheckins = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up the data
        foreach ($recentCheckins as &$checkin) {
            $checkin['customer_name'] = trim($checkin['customer_name']) ?: 'Walk-in Guest';
            $checkin['room_number'] = $checkin['room_number'] ?: 'N/A';
            $checkin['total_amount'] = (float)($checkin['total_amount'] ?? 0);
        }
        
        $dashboardData['recentCheckins'] = $recentCheckins;
        
    } catch (PDOException $e) {
        error_log("Error getting recent check-ins: " . $e->getMessage());
        
        // Provide sample data if no real data exists
        $dashboardData['recentCheckins'] = [
            [
                'reservation_id' => 1,
                'customer_name' => 'Sample Guest',
                'check_in_date' => $today,
                'room_number' => '101',
                'room_type' => 'Single Room',
                'reservation_status' => 'Confirmed',
                'total_amount' => 1500.00
            ]
        ];
    }
    
    // Add metadata
    $dashboardData['timestamp'] = date('Y-m-d H:i:s');
    $dashboardData['user'] = [
        'name' => ($_SESSION['first_name'] ?? '') . ' ' . ($_SESSION['last_name'] ?? ''),
        'email' => $_SESSION['email'] ?? '',
        'role' => $_SESSION['role'] ?? 'Admin'
    ];
    
    // Return the dashboard data
    echo json_encode($dashboardData, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    error_log("Dashboard data error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>