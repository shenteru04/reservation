<?php
// api/frontdesk/reservations-status.php - Reservation Status Update API
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
    $logFile = __DIR__ . '/../logs/status_updates.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[STATUS_UPDATE] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

// Check authentication and role
if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    logError("Unauthorized access attempt");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

// Check if user has front desk role
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'front desk') {
    logError("Access denied for user role: " . ($_SESSION['role'] ?? 'unknown'));
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Access denied. Front desk role required.']);
    exit();
}

// Load database configuration
$dbPaths = [
    __DIR__ . '/../config/db.php',
    __DIR__ . '/../../config/db.php',
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
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'PUT':
            handleStatusUpdate($db);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            break;
    }
    
} catch (Exception $e) {
    logError("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred',
        'debug' => $e->getMessage()
    ]);
}

function handleStatusUpdate($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        // Validate required fields
        if (empty($input['reservation_id'])) {
            throw new Exception('Missing reservation_id');
        }
        
        if (empty($input['status_id'])) {
            throw new Exception('Missing status_id');
        }
        
        $reservationId = (int)$input['reservation_id'];
        $statusId = (int)$input['status_id'];
        
        // Validate status_id
        if (!in_array($statusId, [1, 2, 3, 4, 5])) {
            throw new Exception('Invalid status_id. Must be between 1 and 5.');
        }
        
        // Get current reservation
        $stmt = $db->prepare("
            SELECT r.*, rm.room_id, rm.room_status_id as current_room_status
            FROM reservations r 
            LEFT JOIN rooms rm ON r.room_id = rm.room_id 
            WHERE r.reservation_id = ?
        ");
        $stmt->execute([$reservationId]);
        $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$reservation) {
            throw new Exception('Reservation not found');
        }
        
        // Validate status transition
        $currentStatus = (int)$reservation['reservation_status_id'];
        if (!isValidStatusTransition($currentStatus, $statusId)) {
            throw new Exception('Invalid status transition');
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Update reservation status
            $updateStmt = $db->prepare("
                UPDATE reservations 
                SET reservation_status_id = ?, updated_at = NOW() 
                WHERE reservation_id = ?
            ");
            $updateStmt->execute([$statusId, $reservationId]);
            
            // Update room status based on reservation status
            updateRoomStatusForReservation($db, $reservation['room_id'], $statusId);
            
            // Log status change
            logError("Reservation {$reservationId} status updated from {$currentStatus} to {$statusId}");
            
            $db->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Reservation status updated successfully',
                'reservation_id' => $reservationId,
                'new_status_id' => $statusId
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        logError("Error updating status: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function isValidStatusTransition($currentStatus, $newStatus) {
    // Define valid transitions
    $validTransitions = [
        1 => [2, 5], // Pending -> Confirmed, Cancelled
        2 => [3, 5], // Confirmed -> Checked-in, Cancelled
        3 => [4],    // Checked-in -> Checked-out
        4 => [],     // Checked-out -> (no transitions)
        5 => []      // Cancelled -> (no transitions)
    ];
    
    return in_array($newStatus, $validTransitions[$currentStatus] ?? []);
}

function updateRoomStatusForReservation($db, $roomId, $reservationStatus) {
    $roomStatus = 1; // Available by default
    
    switch ($reservationStatus) {
        case 1: // Pending
            $roomStatus = 3; // Reserved
            break;
        case 2: // Confirmed
            $roomStatus = 3; // Reserved
            break;
        case 3: // Checked-in
            $roomStatus = 2; // Occupied
            break;
        case 4: // Checked-out
            $roomStatus = 4; // Needs Cleaning
            break;
        case 5: // Cancelled
            $roomStatus = 1; // Available
            break;
    }
    
    $stmt = $db->prepare("UPDATE rooms SET room_status_id = ? WHERE room_id = ?");
    $stmt->execute([$roomStatus, $roomId]);
    
    logError("Room {$roomId} status updated to {$roomStatus} for reservation status {$reservationStatus}");
}
?>