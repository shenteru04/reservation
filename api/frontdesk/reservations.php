<?php
// api/frontdesk/reservations.php - Front Desk Reservations Management API
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
    $logFile = __DIR__ . '/../logs/frontdesk_reservations.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[FRONTDESK_RESERVATIONS] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        handlePost($db);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        handleGet($db);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        handlePut($db);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        handleDelete($db);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
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

function handleGet($db) {
    try {
        $action = $_GET['action'] ?? '';
        
        // Check if requesting single reservation
        if (isset($_GET['id'])) {
            return getSingleReservation($db, $_GET['id']);
        }
        
        switch ($action) {
            case 'payment_methods':
                getPaymentMethods($db);
                break;
            default:
                getAllReservations($db);
                break;
        }
    } catch (Exception $e) {
        logError("GET error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getPaymentMethods($db) {
    try {
        $stmt = $db->prepare("SELECT payment_method_id, method_name FROM payment_methods WHERE 1 ORDER BY method_name");
        $stmt->execute();
        $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        logError("Loaded " . count($methods) . " payment methods");
        
        echo json_encode([
            'success' => true,
            'payment_methods' => $methods
        ]);
    } catch (Exception $e) {
        logError("Error fetching payment methods: " . $e->getMessage());
        throw $e;
    }
}

function getAllReservations($db) {
    try {
        // Get query parameters for filtering
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? '',
            'checkin_date' => $_GET['checkin_date'] ?? '',
            'room_type' => $_GET['room_type'] ?? '',
            'limit' => min(100, max(1, intval($_GET['limit'] ?? 50))),
            'offset' => max(0, intval($_GET['offset'] ?? 0))
        ];
        
        // Build WHERE clause
        $whereConditions = [];
        $params = [];
        
        if (!empty($filters['search'])) {
            $whereConditions[] = "(
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) LIKE ? OR
                rm.room_number LIKE ? OR
                r.reservation_id LIKE ?
            )";
            $searchTerm = '%' . $filters['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        if (!empty($filters['status'])) {
            $whereConditions[] = "r.reservation_status_id = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['checkin_date'])) {
            $whereConditions[] = "DATE(r.check_in_date) = ?";
            $params[] = $filters['checkin_date'];
        }
        
        if (!empty($filters['room_type'])) {
            $whereConditions[] = "rt.room_type_id = ?";
            $params[] = $filters['room_type'];
        }
        
        $whereClause = '';
        if (!empty($whereConditions)) {
            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        }
        
        // Get total count for pagination
        $countSql = "
            SELECT COUNT(*) as total
            FROM reservations r
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms rm ON r.room_id = rm.room_id
            LEFT JOIN room_types rt ON rm.room_type_id = rt.room_type_id
            $whereClause
        ";
        
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get reservations with pagination
        $sql = "
            SELECT 
                r.reservation_id,
                r.reservation_type_id,
                r.room_id,
                r.customer_id,
                r.check_in_date,
                r.check_out_date,
                r.reservation_status_id,
                r.total_amount,
                r.advance_payment,
                r.guest_count,
                r.special_requests,
                r.created_at,
                r.updated_at,
                c.first_name,
                c.last_name,
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                c.email,
                c.phone_number,
                rm.room_number,
                rm.floor_number,
                rt.type_name as room_type_name,
                rt.room_type_id,
                rt.price_per_night,
                rs.status_name,
                rst.type_name as reservation_type_name,
                ap.advance_payment_id,
                ap.amount as advance_amount,
                ap.reference_number,
                ap.payment_date,
                pm.method_name as payment_method,
                ps.status_name as payment_status
            FROM reservations r
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms rm ON r.room_id = rm.room_id
            LEFT JOIN room_types rt ON rm.room_type_id = rt.room_type_id
            LEFT JOIN reservation_status rs ON r.reservation_status_id = rs.reservation_status_id
            LEFT JOIN reservation_type rst ON r.reservation_type_id = rst.reservation_type_id
            LEFT JOIN advance_payments ap ON r.reservation_id = ap.reservation_id
            LEFT JOIN payment_methods pm ON ap.payment_method_id = pm.payment_method_id
            LEFT JOIN payment_status ps ON ap.payment_status_id = ps.payment_status_id
            $whereClause
            ORDER BY r.created_at DESC, r.check_in_date DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $filters['limit'];
        $params[] = $filters['offset'];
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up the data
        $cleanedReservations = [];
        foreach ($reservations as $reservation) {
            $cleanedReservations[] = [
                'reservation_id' => (int)$reservation['reservation_id'],
                'reservation_type_id' => (int)$reservation['reservation_type_id'],
                'room_id' => (int)$reservation['room_id'],
                'customer_id' => (int)$reservation['customer_id'],
                'check_in_date' => $reservation['check_in_date'],
                'check_out_date' => $reservation['check_out_date'],
                'reservation_status_id' => (int)$reservation['reservation_status_id'],
                'total_amount' => (float)($reservation['total_amount'] ?: 0),
                'advance_payment' => (float)($reservation['advance_payment'] ?: 0),
                'guest_count' => (int)($reservation['guest_count'] ?: 1),
                'special_requests' => $reservation['special_requests'] ?: '',
                'created_at' => $reservation['created_at'],
                'updated_at' => $reservation['updated_at'],
                'first_name' => $reservation['first_name'] ?: '',
                'last_name' => $reservation['last_name'] ?: '',
                'customer_name' => trim($reservation['customer_name']) ?: 'Walk-in Guest',
                'email' => $reservation['email'] ?: '',
                'phone_number' => $reservation['phone_number'] ?: '',
                'room_number' => $reservation['room_number'] ?: 'N/A',
                'floor_number' => (int)($reservation['floor_number'] ?: 0),
                'room_type_name' => $reservation['room_type_name'] ?: 'Unknown',
                'room_type_id' => (int)($reservation['room_type_id'] ?: 0),
                'price_per_night' => (float)($reservation['price_per_night'] ?: 0),
                'status_name' => $reservation['status_name'] ?: 'Unknown',
                'type_name' => $reservation['reservation_type_name'] ?: 'Walk-in',
                'advance_payment_id' => $reservation['advance_payment_id'] ? (int)$reservation['advance_payment_id'] : null,
                'advance_amount' => (float)($reservation['advance_amount'] ?: 0),
                'reference_number' => $reservation['reference_number'] ?: '',
                'payment_date' => $reservation['payment_date'],
                'payment_method' => $reservation['payment_method'] ?: '',
                'payment_status' => $reservation['payment_status'] ?: ''
            ];
        }
        
        logError("Front desk retrieved " . count($cleanedReservations) . " reservations (total: $totalCount)");
        
        echo json_encode([
            'success' => true,
            'reservations' => $cleanedReservations,
            'pagination' => [
                'total' => (int)$totalCount,
                'count' => count($cleanedReservations),
                'limit' => $filters['limit'],
                'offset' => $filters['offset'],
                'has_more' => ($filters['offset'] + count($cleanedReservations)) < $totalCount
            ]
        ]);
        
    } catch (PDOException $e) {
        logError("Error retrieving reservations: " . $e->getMessage());
        throw $e;
    }
}

function getSingleReservation($db, $reservationId) {
    try {
        // Validate reservation ID
        if (!is_numeric($reservationId) || $reservationId <= 0) {
            logError("Invalid reservation ID provided: " . $reservationId);
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid reservation ID']);
            return;
        }
        
        $sql = "
            SELECT 
                r.*,
                c.first_name,
                c.last_name,
                c.email,
                c.phone_number,
                rt.type_name,
                rs.status_name as reservation_status,
                room.room_number,
                room.floor_number,
                ap.advance_payment_id,
                ap.amount as advance_amount,
                ap.reference_number,
                ap.payment_date,
                pm.method_name as payment_method,
                pm.payment_method_id,
                ps.status_name as payment_status
            FROM reservations r
            JOIN customers c ON r.customer_id = c.customer_id
            JOIN rooms room ON r.room_id = room.room_id
            JOIN room_types rt ON room.room_type_id = rt.room_type_id
            JOIN reservation_status rs ON r.reservation_status_id = rs.reservation_status_id
            LEFT JOIN advance_payments ap ON r.reservation_id = ap.reservation_id
            LEFT JOIN payment_methods pm ON ap.payment_method_id = pm.payment_method_id
            LEFT JOIN payment_status ps ON ap.payment_status_id = ps.payment_status_id
            WHERE r.reservation_id = ?
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$reservationId]);
        $reservation = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$reservation) {
            logError("Reservation not found: " . $reservationId);
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Reservation not found']);
            return;
        }
        
        logError("Front desk retrieved single reservation: " . $reservationId);
        
        echo json_encode([
            'success' => true,
            'reservation' => $reservation
        ]);
        
    } catch (PDOException $e) {
        logError("Error retrieving single reservation $reservationId: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database error occurred while retrieving reservation',
            'debug' => $e->getMessage()
        ]);
    }
}

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        logError("Received booking data: " . json_encode($input));
        
        // Validate required fields
        $required = ['first_name', 'last_name', 'room_id', 
                    'check_in_date', 'check_out_date', 'total_amount'];
        foreach ($required as $field) {
            if (empty($input[$field]) && $input[$field] !== 0) {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Validate advance payment if provided
        $advancePayment = (float)($input['advance_payment'] ?? 0);
        $paymentMethodId = (int)($input['payment_method_id'] ?? 0);
        $referenceNumber = $input['reference_number'] ?? '';
        
        if ($advancePayment > 0 && $paymentMethodId === 0) {
            throw new Exception('Payment method is required when advance payment is provided');
        }
        
        if ($advancePayment > (float)$input['total_amount']) {
            throw new Exception('Advance payment cannot be greater than total amount');
        }
        
        // Validate dates
        if (strtotime($input['check_out_date']) <= strtotime($input['check_in_date'])) {
            throw new Exception('Check-out date must be after check-in date');
        }
        
        // Check room availability
        if (!isRoomAvailable($db, $input['room_id'], $input['check_in_date'], $input['check_out_date'])) {
            throw new Exception('Room is not available for the selected dates');
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Create/update customer
            $customerId = createOrUpdateCustomer($db, $input);
            logError("Customer ID: " . $customerId);
            
            // Create reservation
            $reservationId = createReservation($db, $input, $customerId);
            logError("Reservation ID: " . $reservationId);
            
            // Handle additional services and menu items
            $additionalCharges = 0;
            
            if (!empty($input['services']) && is_array($input['services'])) {
                logError("Adding services: " . json_encode($input['services']));
                $additionalCharges += addServicesToReservation($db, $reservationId, $input['services']);
            }
            
            if (!empty($input['menu_items']) && is_array($input['menu_items'])) {
                logError("Adding menu items: " . json_encode($input['menu_items']));
                $additionalCharges += addMenuItemsToReservation($db, $reservationId, $input['menu_items']);
            }
            
            // Update total amount if there are additional charges
            if ($additionalCharges > 0) {
                $newTotal = (float)($input['total_amount'] ?? 0) + $additionalCharges;
                updateReservationTotal($db, $reservationId, $newTotal);
                logError("Updated total amount to: " . $newTotal);
            }
            
            // Handle advance payment if provided
            $advancePaymentId = null;
            if ($advancePayment > 0 && $paymentMethodId > 0) {
                $advancePaymentId = createAdvancePayment($db, $reservationId, $advancePayment, $paymentMethodId, $referenceNumber);
                logError("Created advance payment ID: " . $advancePaymentId);
                
                // Update reservation with advance payment amount
                updateReservationAdvancePayment($db, $reservationId, $advancePayment);
            }
            
            // Update room status to reserved/confirmed based on reservation status
            $reservationStatus = $input['reservation_status_id'] ?? 1;
            updateRoomStatusForReservation($db, $input['room_id'], $reservationStatus);
            
            $db->commit();
            
            logError("Front desk created reservation with ID: " . $reservationId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Reservation created successfully',
                'reservation_id' => $reservationId,
                'customer_id' => $customerId,
                'advance_payment_id' => $advancePaymentId,
                'advance_amount' => $advancePayment
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        logError("Error creating reservation: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function handlePut($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['reservation_id'])) {
            throw new Exception('Missing reservation_id');
        }
        
        $reservationId = $input['reservation_id'];
        
        // Get current reservation data
        $currentReservation = getCurrentReservation($db, $reservationId);
        if (!$currentReservation) {
            throw new Exception('Reservation not found');
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Update reservation
            updateReservation($db, $reservationId, $input);
            
            // Update customer if provided
            if (isset($input['first_name']) || isset($input['last_name']) || 
                isset($input['email']) || isset($input['phone_number'])) {
                
                $customerData = [
                    'first_name' => $input['first_name'] ?? null,
                    'last_name' => $input['last_name'] ?? null,
                    'email' => $input['email'] ?? null,
                    'phone_number' => $input['phone_number'] ?? null
                ];
                
                updateCustomer($db, $currentReservation['customer_id'], $customerData);
            }
            
            // Update room status if status changed
            if (isset($input['reservation_status_id'])) {
                $roomId = $input['room_id'] ?? $currentReservation['room_id'];
                updateRoomStatusForReservation($db, $roomId, (int)$input['reservation_status_id']);
            }
            
            $db->commit();
            
            logError("Front desk updated reservation with ID: " . $reservationId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Reservation updated successfully',
                'reservation_id' => $reservationId
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        logError("Error updating reservation: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function handleDelete($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['reservation_id'])) {
            throw new Exception('Missing reservation_id');
        }
        
        $reservationId = $input['reservation_id'];
        
        // Get reservation details
        $reservation = getCurrentReservation($db, $reservationId);
        if (!$reservation) {
            throw new Exception('Reservation not found');
        }
        
        // Check if reservation can be deleted (only pending/cancelled)
        if (!in_array($reservation['reservation_status_id'], [1, 5])) {
            throw new Exception('Cannot delete confirmed or active reservations');
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Delete related advance payments
            $deletePaymentStmt = $db->prepare("DELETE FROM advance_payments WHERE reservation_id = ?");
            $deletePaymentStmt->execute([$reservationId]);
            
            // Delete related service requests and request items
            deleteReservationServices($db, $reservationId);
            
            // Delete reservation
            $deleteStmt = $db->prepare("DELETE FROM reservations WHERE reservation_id = ?");
            $deleteStmt->execute([$reservationId]);
            
            // Update room status to available
            updateRoomStatusForReservation($db, $reservation['room_id'], 5); // Cancelled status
            
            $db->commit();
            
            logError("Front desk deleted reservation with ID: " . $reservationId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Reservation deleted successfully',
                'reservation_id' => $reservationId
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        logError("Error deleting reservation: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

// Helper Functions

function isRoomAvailable($db, $roomId, $checkinDate, $checkoutDate, $excludeReservationId = null) {
    $sql = "
        SELECT COUNT(*) as count 
        FROM reservations 
        WHERE room_id = ? 
        AND reservation_status_id IN (2, 3) 
        AND (
            (check_in_date <= ? AND check_out_date > ?) OR
            (check_in_date < ? AND check_out_date >= ?) OR
            (check_in_date >= ? AND check_out_date <= ?)
        )
    ";
    
    $params = [
        $roomId,
        $checkinDate, $checkinDate,
        $checkoutDate, $checkoutDate,
        $checkinDate, $checkoutDate
    ];
    
    if ($excludeReservationId) {
        $sql .= " AND reservation_id != ?";
        $params[] = $excludeReservationId;
    }
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result['count'] == 0;
}

function createOrUpdateCustomer($db, $input) {
    $customerId = null;
    
    // Check if customer exists by email
    if (!empty($input['email'])) {
        $stmt = $db->prepare("SELECT customer_id FROM customers WHERE email = ?");
        $stmt->execute([$input['email']]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            $customerId = $existing['customer_id'];
            
            // Update customer info
            $updateStmt = $db->prepare("
                UPDATE customers 
                SET first_name = ?, last_name = ?, phone_number = ? 
                WHERE customer_id = ?
            ");
            $updateStmt->execute([
                $input['first_name'],
                $input['last_name'],
                $input['phone_number'] ?? '',
                $customerId
            ]);
        }
    }
    
    // Create new customer if not exists
    if (!$customerId) {
        $stmt = $db->prepare("
            INSERT INTO customers (first_name, last_name, email, phone_number)
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['first_name'],
            $input['last_name'],
            $input['email'] ?? '',
            $input['phone_number'] ?? ''
        ]);
        
        $customerId = $db->lastInsertId();
    }
    
    return $customerId;
}

function createReservation($db, $input, $customerId) {
    $advancePayment = (float)($input['advance_payment'] ?? 0);
    
    $stmt = $db->prepare("
        INSERT INTO reservations (
            reservation_type_id, room_id, customer_id, check_in_date, 
            check_out_date, reservation_status_id, total_amount, 
            advance_payment, guest_count, special_requests, created_at, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $stmt->execute([
        $input['room_id'],
        $customerId,
        $input['check_in_date'],
        $input['check_out_date'],
        $input['reservation_status_id'] ?? 1,
        (float)($input['total_amount'] ?? 0),
        $advancePayment,
        (int)($input['guest_count'] ?? 1),
        $input['special_requests'] ?? null
    ]);
    
    return $db->lastInsertId();
}

function createAdvancePayment($db, $reservationId, $amount, $paymentMethodId, $referenceNumber = '') {
    // Determine payment status based on payment method and reference number
    $paymentStatusId = 3; // Default to Pending
    
    // If reference number is provided, mark as pending review
    if (!empty($referenceNumber)) {
        $paymentStatusId = 3; // Pending - needs verification
    }
    
    $stmt = $db->prepare("
        INSERT INTO advance_payments (
            reservation_id, amount, payment_method_id, payment_status_id, 
            reference_number, payment_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())
    ");
    
    $notes = "Advance payment for reservation";
    if (!empty($referenceNumber)) {
        $notes .= " - Reference: " . $referenceNumber;
    }
    
    $stmt->execute([
        $reservationId,
        $amount,
        $paymentMethodId,
        $paymentStatusId,
        $referenceNumber,
        $notes
    ]);
    
    return $db->lastInsertId();
}

function updateReservationAdvancePayment($db, $reservationId, $advanceAmount) {
    $stmt = $db->prepare("UPDATE reservations SET advance_payment = ? WHERE reservation_id = ?");
    $stmt->execute([$advanceAmount, $reservationId]);
}

function addServicesToReservation($db, $reservationId, $services) {
    $totalCharges = 0;
    
    foreach ($services as $serviceId) {
        try {
            // Get service details - try different column names for price
            $serviceStmt = $db->prepare("
                SELECT service_name, 
                       COALESCE(price, service_price, cost, amount) as service_price 
                FROM hotel_services 
                WHERE service_id = ?
            ");
            $serviceStmt->execute([$serviceId]);
            $serviceData = $serviceStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($serviceData) {
                $servicePrice = floatval($serviceData['service_price'] ?? 0);
                
                // Create service request
                $requestStmt = $db->prepare("
                    INSERT INTO service_requests (
                        request_type_id, request_status_id, reservation_id, 
                        total, request_time, created_at, updated_at
                    ) VALUES (1, 1, ?, ?, NOW(), NOW(), NOW())
                ");
                $requestStmt->execute([$reservationId, $servicePrice]);
                $requestId = $db->lastInsertId();
                
                // Add service to request items
                $itemStmt = $db->prepare("
                    INSERT INTO request_items (request_id, service_id, quantity)
                    VALUES (?, ?, 1)
                ");
                $itemStmt->execute([$requestId, $serviceId]);
                
                $totalCharges += $servicePrice;
                logError("Added service {$serviceId} with price {$servicePrice}");
            } else {
                logError("Service not found: " . $serviceId);
            }
        } catch (Exception $e) {
            logError("Error adding service {$serviceId}: " . $e->getMessage());
        }
    }
    
    return $totalCharges;
}

function addMenuItemsToReservation($db, $reservationId, $menuItems) {
    $totalCharges = 0;
    
    foreach ($menuItems as $menuItem) {
        $menuId = $menuItem['id'];
        $quantity = $menuItem['quantity'] ?? 1;
        
        try {
            // Get menu item details using menu_id
            $menuStmt = $db->prepare("SELECT item_name, price FROM menu_items WHERE menu_id = ?");
            $menuStmt->execute([$menuId]);
            $menuItemData = $menuStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($menuItemData) {
                $itemPrice = floatval($menuItemData['price'] ?? 0);
                $itemTotal = $itemPrice * $quantity;
                
                // Create food delivery request
                $requestStmt = $db->prepare("
                    INSERT INTO service_requests (
                        request_type_id, request_status_id, reservation_id, 
                        total, request_time, created_at, updated_at
                    ) VALUES (2, 1, ?, ?, NOW(), NOW(), NOW())
                ");
                $requestStmt->execute([$reservationId, $itemTotal]);
                $requestId = $db->lastInsertId();
                
                // Add menu item to request items
                $itemStmt = $db->prepare("
                    INSERT INTO request_items (request_id, menu_id, quantity)
                    VALUES (?, ?, ?)
                ");
                $itemStmt->execute([$requestId, $menuId, $quantity]);
                
                $totalCharges += $itemTotal;
                logError("Added menu item {$menuId} with quantity {$quantity} and total {$itemTotal}");
            } else {
                logError("Menu item not found: " . $menuId);
            }
        } catch (Exception $e) {
            logError("Error adding menu item {$menuId}: " . $e->getMessage());
        }
    }
    
    return $totalCharges;
}

function updateReservationTotal($db, $reservationId, $newTotal) {
    $stmt = $db->prepare("UPDATE reservations SET total_amount = ? WHERE reservation_id = ?");
    $stmt->execute([$newTotal, $reservationId]);
}

function updateRoomStatusForReservation($db, $roomId, $reservationStatus) {
    $roomStatus = 1; // Available by default
    
    switch ($reservationStatus) {
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
}

function getCurrentReservation($db, $reservationId) {
    $stmt = $db->prepare("
        SELECT r.*, rm.room_status_id as current_room_status 
        FROM reservations r 
        LEFT JOIN rooms rm ON r.room_id = rm.room_id 
        WHERE r.reservation_id = ?
    ");
    $stmt->execute([$reservationId]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function updateReservation($db, $reservationId, $input) {
    $updateFields = [];
    $updateValues = [];
    
    // Map input fields to database fields
    $fieldMap = [
        'reservation_type_id' => 'reservation_type_id',
        'room_id' => 'room_id',
        'check_in_date' => 'check_in_date',
        'check_out_date' => 'check_out_date',
        'reservation_status_id' => 'reservation_status_id',
        'total_amount' => 'total_amount',
        'advance_payment' => 'advance_payment',
        'guest_count' => 'guest_count',
        'special_requests' => 'special_requests'
    ];
    
    foreach ($fieldMap as $inputField => $dbField) {
        if (isset($input[$inputField]) && $input[$inputField] !== '') {
            $updateFields[] = "$dbField = ?";
            $updateValues[] = $input[$inputField];
        }
    }
    
    if (!empty($updateFields)) {
        $updateFields[] = "updated_at = NOW()";
        $updateValues[] = $reservationId;
        
        $sql = "UPDATE reservations SET " . implode(', ', $updateFields) . " WHERE reservation_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
    }
}

function updateCustomer($db, $customerId, $input) {
    $updateFields = [];
    $updateValues = [];
    
    $customerFields = ['first_name', 'last_name', 'email', 'phone_number'];
    
    foreach ($customerFields as $field) {
        if (isset($input[$field])) {
            $updateFields[] = "$field = ?";
            $updateValues[] = $input[$field];
        }
    }
    
    if (!empty($updateFields)) {
        $updateValues[] = $customerId;
        $sql = "UPDATE customers SET " . implode(', ', $updateFields) . " WHERE customer_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
    }
}

function deleteReservationServices($db, $reservationId) {
    // Delete request items first
    $deleteItemsStmt = $db->prepare("
        DELETE ri FROM request_items ri 
        INNER JOIN service_requests sr ON ri.request_id = sr.request_id 
        WHERE sr.reservation_id = ?
    ");
    $deleteItemsStmt->execute([$reservationId]);
    
    // Delete service requests
    $deleteRequestsStmt = $db->prepare("DELETE FROM service_requests WHERE reservation_id = ?");
    $deleteRequestsStmt->execute([$reservationId]);
}
?>