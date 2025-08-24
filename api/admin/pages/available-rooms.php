<?php
// api/admin/pages/available-rooms.php - Available Rooms API
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Function to log errors
function logError($message) {
    $logFile = __DIR__ . '/../../logs/available-rooms.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[AVAILABLE-ROOMS] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

// Check authentication
if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    logError("Unauthorized access attempt");
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
    logError("Database configuration file not found");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database configuration not found']);
    exit();
}

try {
    $db = getDB();
    
    // Get query parameters
    $roomTypeId = $_GET['room_type_id'] ?? null;
    $checkinDate = $_GET['checkin_date'] ?? null;
    $checkoutDate = $_GET['checkout_date'] ?? null;
    
    if (!$roomTypeId || !$checkinDate || !$checkoutDate) {
        throw new Exception('Missing required parameters: room_type_id, checkin_date, checkout_date');
    }
    
    // Validate dates
    if (strtotime($checkoutDate) <= strtotime($checkinDate)) {
        throw new Exception('Check-out date must be after check-in date');
    }
    
    // Get available rooms for the specified type and date range
    $stmt = $db->prepare("
        SELECT 
            r.room_id,
            r.room_number,
            r.floor_number,
            rt.type_name,
            rt.price_per_night,
            rt.capacity,
            rs.status_name
        FROM rooms r
        INNER JOIN room_types rt ON r.room_type_id = rt.room_type_id
        INNER JOIN room_status rs ON r.room_status_id = rs.room_status_id
        WHERE r.room_type_id = ?
        AND r.room_status_id = 1  -- Available status
        AND r.room_id NOT IN (
            SELECT DISTINCT room_id 
            FROM reservations 
            WHERE reservation_status_id IN (2, 3) -- Confirmed or Checked-in
            AND (
                (check_in_date <= ? AND check_out_date > ?) OR
                (check_in_date < ? AND check_out_date >= ?) OR
                (check_in_date >= ? AND check_out_date <= ?)
            )
        )
        ORDER BY r.room_number ASC
    ");
    
    $stmt->execute([
        $roomTypeId,
        $checkinDate, $checkinDate,
        $checkoutDate, $checkoutDate,
        $checkinDate, $checkoutDate
    ]);
    
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Clean up the data
    $cleanedRooms = [];
    foreach ($rooms as $room) {
        $cleanedRooms[] = [
            'room_id' => (int)$room['room_id'],
            'room_number' => $room['room_number'],
            'floor_number' => (int)$room['floor_number'],
            'type_name' => $room['type_name'],
            'price_per_night' => (float)$room['price_per_night'],
            'capacity' => (int)$room['capacity'],
            'status_name' => $room['status_name']
        ];
    }
    
    logError("Retrieved " . count($cleanedRooms) . " available rooms for type $roomTypeId from $checkinDate to $checkoutDate");
    
    echo json_encode([
        'success' => true,
        'rooms' => $cleanedRooms,
        'total' => count($cleanedRooms),
        'room_type_id' => (int)$roomTypeId,
        'checkin_date' => $checkinDate,
        'checkout_date' => $checkoutDate
    ]);
    
} catch (Exception $e) {
    logError("Error retrieving available rooms: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>