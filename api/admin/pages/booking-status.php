<?php
// api/admin/pages/booking-status.php - Fixed Booking Status Lookup API
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to log errors
function logError($message) {
    $logFile = __DIR__ . '/../../../logs/booking-status.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[BOOKING-STATUS] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

// Load database configuration
$dbPaths = [
    __DIR__ . '/../../../config/db.php',
    __DIR__ . '/../../config/db.php',
    dirname(dirname(dirname(__DIR__))) . '/config/db.php',
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

// Only handle POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logError("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $db = getDB();
    
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Invalid JSON data provided');
    }
    
    $bookingId = trim($data['booking_id'] ?? '');
    $contact = trim($data['contact'] ?? '');
    
    if (empty($bookingId) || empty($contact)) {
        throw new Exception('Missing required parameters: booking_id and contact');
    }
    
    // Clean booking ID (remove # if present)
    $bookingId = str_replace('#', '', $bookingId);
    
    if (!is_numeric($bookingId)) {
        throw new Exception('Invalid booking ID format');
    }
    
    logError("Looking up booking ID: $bookingId with contact: $contact");
    
    // Fixed query - based on actual database schema from the SQL dump
    $sql = "SELECT 
                r.reservation_id,
                c.first_name,
                c.last_name,
                c.email,
                c.phone_number,
                r.room_id,
                r.check_in_date,
                r.check_out_date,
                r.guest_count,
                r.total_amount,
                r.special_requests,
                r.created_at,
                rt.type_name as room_type,
                rt.price_per_night,
                rm.room_number,
                rm.floor_number,
                rs.status_name as status
            FROM reservations r 
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms rm ON r.room_id = rm.room_id
            LEFT JOIN room_types rt ON rm.room_type_id = rt.room_type_id
            LEFT JOIN reservation_status rs ON r.reservation_status_id = rs.reservation_status_id
            WHERE r.reservation_id = ? 
            AND (c.email = ? OR c.phone_number = ?)
            LIMIT 1";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$bookingId, $contact, $contact]);
    
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$booking) {
        logError("No booking found for ID: $bookingId with contact: $contact");
        echo json_encode([
            'success' => false,
            'error' => 'Booking not found. Please check your booking ID and contact information.'
        ]);
        exit();
    }
    
    // Clean up the booking data
    $roomInfo = '';
    if ($booking['room_type'] && $booking['room_number']) {
        $roomInfo = $booking['room_type'] . ' - Room ' . $booking['room_number'];
        if ($booking['floor_number']) {
            $roomInfo .= ' (Floor ' . $booking['floor_number'] . ')';
        }
    } else {
        $roomInfo = 'Room #' . $booking['room_id'];
    }
    
    $cleanedBooking = [
        'reservation_id' => (int)$booking['reservation_id'],
        'first_name' => $booking['first_name'],
        'last_name' => $booking['last_name'],
        'email' => $booking['email'],
        'phone_number' => $booking['phone_number'],
        'room_id' => (int)$booking['room_id'],
        'room_info' => $roomInfo,
        'check_in_date' => $booking['check_in_date'],
        'check_out_date' => $booking['check_out_date'],
        'guest_count' => (int)$booking['guest_count'],
        'total_amount' => (float)$booking['total_amount'],
        'special_requests' => $booking['special_requests'],
        'status' => $booking['status'] ?: 'Pending',
        'created_at' => $booking['created_at']
    ];
    
    // Get service requests for this reservation
    try {
        $servicesStmt = $db->prepare("
            SELECT 
                sr.request_id,
                sr.request_type_id,
                sr.total,
                rt.type_name as request_type,
                rs.status_name as request_status,
                GROUP_CONCAT(
                    CASE 
                        WHEN ri.service_id IS NOT NULL THEN CONCAT(hs.service_name, ' (', ri.quantity, 'x)')
                        WHEN ri.menu_id IS NOT NULL THEN CONCAT(mi.item_name, ' (', ri.quantity, 'x)')
                    END SEPARATOR ', '
                ) as items
            FROM service_requests sr
            LEFT JOIN request_types rt ON sr.request_type_id = rt.request_type_id
            LEFT JOIN request_status rs ON sr.request_status_id = rs.request_status_id
            LEFT JOIN request_items ri ON sr.request_id = ri.request_id
            LEFT JOIN hotel_services hs ON ri.service_id = hs.service_id
            LEFT JOIN menu_items mi ON ri.menu_id = mi.menu_id
            WHERE sr.reservation_id = ?
            GROUP BY sr.request_id
        ");
        $servicesStmt->execute([$bookingId]);
        $services = $servicesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($services)) {
            $cleanedBooking['service_requests'] = $services;
        }
        
    } catch (Exception $e) {
        // Log but don't fail the main query
        logError("Error fetching service requests: " . $e->getMessage());
    }
    
    logError("Successfully found booking for ID: $bookingId");
    
    echo json_encode([
        'success' => true,
        'booking' => $cleanedBooking
    ]);
    
} catch (PDOException $e) {
    logError("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred. Please try again later.'
    ]);
} catch (Exception $e) {
    logError("Error looking up booking: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>