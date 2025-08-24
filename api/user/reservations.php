<?php
// api/user/reservations.php - Updated to handle both room and room type reservations
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to log errors
function logError($message) {
    $logFile = __DIR__ . '/../logs/user_reservations.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[USER_RESERVATIONS] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
        
        switch ($action) {
            case 'payment_methods':
                getPaymentMethods($db);
                break;
            case 'user_reservations':
                getUserReservations($db);
                break;
            case 'check_room_type_availability':
                checkRoomTypeAvailability($db);
                break;
            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid action']);
        }
    } catch (Exception $e) {
        logError("GET error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function getPaymentMethods($db) {
    try {
        $stmt = $db->prepare("SELECT payment_method_id, method_name FROM payment_methods WHERE is_active = 1 ORDER BY method_name");
        $stmt->execute();
        $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'payment_methods' => $methods
        ]);
    } catch (Exception $e) {
        logError("Error fetching payment methods: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to load payment methods'
        ]);
    }
}

function checkRoomTypeAvailability($db) {
    $roomTypeId = $_GET['room_type_id'] ?? null;
    $checkinDateTime = $_GET['checkin_datetime'] ?? null;
    $checkoutDateTime = $_GET['checkout_datetime'] ?? null;
    $guestCount = (int)($_GET['guest_count'] ?? 1);
    
    if (!$roomTypeId || !$checkinDateTime || !$checkoutDateTime) {
        echo json_encode(['success' => false, 'error' => 'Missing required parameters']);
        return;
    }
    
    $availableCount = getRoomTypeAvailability($db, $roomTypeId, $checkinDateTime, $checkoutDateTime, $guestCount);
    
    echo json_encode([
        'success' => true,
        'available_count' => $availableCount
    ]);
}

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        logError("Received booking data: " . json_encode($input));
        
        // Determine if this is a room type booking or specific room booking
        $isRoomTypeBooking = !empty($input['room_type_id']) && (empty($input['room_id']) || isset($input['room_assignment_pending']));
        
        if ($isRoomTypeBooking) {
            handleRoomTypeBooking($db, $input);
        } else {
            handleSpecificRoomBooking($db, $input);
        }
        
    } catch (Exception $e) {
        logError("Error handling booking: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function handleRoomTypeBooking($db, $input) {
    // Validate required fields for room type booking
    $required = ['first_name', 'last_name', 'email', 'phone_number', 'room_type_id', 
                'check_in_date', 'check_out_date', 'total_amount'];
    foreach ($required as $field) {
        if (empty($input[$field]) && $input[$field] !== 0) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Process datetime fields
    $checkinDateTime = processDateTime($input['check_in_date'], $input['checkin_time'] ?? '15:00:00');
    $checkoutDateTime = processDateTime($input['check_out_date'], $input['checkout_time'] ?? '12:00:00');
    
    logError("Room type booking - Check-in datetime: " . $checkinDateTime);
    logError("Room type booking - Check-out datetime: " . $checkoutDateTime);
    
    // Validate datetime logic
    if (strtotime($checkoutDateTime) <= strtotime($checkinDateTime)) {
        throw new Exception('Check-out date and time must be after check-in date and time');
    }
    
    // Validate minimum stay duration
    $timeDiff = strtotime($checkoutDateTime) - strtotime($checkinDateTime);
    if ($timeDiff < (4 * 3600)) { // 4 hours in seconds
        throw new Exception('Minimum stay duration is 4 hours');
    }
    
    // Check room type availability
    $availableCount = getRoomTypeAvailability($db, $input['room_type_id'], $checkinDateTime, $checkoutDateTime, $input['guest_count'] ?? 1);
    if ($availableCount <= 0) {
        throw new Exception('No rooms of this type are available for the selected dates and times');
    }
    
    // Validate advance payment
    $advancePayment = (float)($input['advance_payment'] ?? 0);
    $paymentMethodId = (int)($input['payment_method_id'] ?? 1); // Default to cash
    $referenceNumber = $input['reference_number'] ?? '';
    
    if ($advancePayment > 0 && $paymentMethodId === 0) {
        throw new Exception('Payment method is required when advance payment is provided');
    }
    
    if ($advancePayment > (float)$input['total_amount']) {
        throw new Exception('Advance payment cannot be greater than total amount');
    }
    
    // Calculate time-based pricing adjustments
    $pricingAdjustments = calculateTimePricingAdjustments($input['checkin_time'] ?? '15:00:00', $input['checkout_time'] ?? '12:00:00');
    $adjustedTotal = (float)$input['total_amount'] + $pricingAdjustments['total_adjustment'];
    
    logError("Room type pricing adjustments: " . json_encode($pricingAdjustments));
    logError("Room type adjusted total: " . $adjustedTotal);
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Create/update customer
        $customerId = createOrUpdateCustomer($db, $input);
        logError("Customer ID: " . $customerId);
        
        // Create room type reservation
        $reservationId = createRoomTypeReservation($db, $input, $customerId, $checkinDateTime, $checkoutDateTime, $adjustedTotal);
        logError("Room type reservation ID: " . $reservationId);
        
        // Log reservation creation
        logReservationAction($db, $reservationId, 'created', $customerId, 'customer', [
            'room_type_id' => $input['room_type_id'],
            'checkin_datetime' => $checkinDateTime,
            'checkout_datetime' => $checkoutDateTime,
            'total_amount' => $adjustedTotal,
            'guest_count' => $input['guest_count'] ?? 1,
            'pricing_adjustments' => $pricingAdjustments,
            'booking_type' => 'room_type'
        ], 'Online room type reservation with datetime selection');
        
        // Handle additional services and menu items
        $additionalCharges = 0;
        
        if (!empty($input['services']) && is_array($input['services'])) {
            logError("Adding services to room type booking: " . json_encode($input['services']));
            $additionalCharges += addServicesToReservation($db, $reservationId, $input['services']);
        }
        
        if (!empty($input['menu_items']) && is_array($input['menu_items'])) {
            logError("Adding menu items to room type booking: " . json_encode($input['menu_items']));
            $additionalCharges += addMenuItemsToReservation($db, $reservationId, $input['menu_items']);
        }
        
        // Update total amount if there are additional charges
        if ($additionalCharges > 0) {
            $finalTotal = $adjustedTotal + $additionalCharges;
            updateReservationTotal($db, $reservationId, $finalTotal);
            logError("Updated room type booking total amount to: " . $finalTotal);
            
            // Log the modification
            logReservationAction($db, $reservationId, 'modified', $customerId, 'customer', [
                'old_total' => $adjustedTotal,
                'new_total' => $finalTotal,
                'additional_charges' => $additionalCharges
            ], 'Added services and menu items to room type booking');
        }
        
        // Handle advance payment if provided
        $advancePaymentId = null;
        if ($advancePayment > 0) {
            $advancePaymentId = createAdvancePayment(
                $db, 
                $reservationId, 
                $advancePayment, 
                $paymentMethodId, 
                $referenceNumber
            );
            logError("Created advance payment ID for room type booking: " . $advancePaymentId);
            
            // Update reservation with advance payment amount
            updateReservationAdvancePayment($db, $reservationId, $advancePayment);
            
            // Log payment
            logReservationAction($db, $reservationId, 'payment_received', $customerId, 'customer', [
                'advance_payment_id' => $advancePaymentId,
                'amount' => $advancePayment,
                'payment_method_id' => $paymentMethodId,
                'reference_number' => $referenceNumber
            ], 'Advance payment processed for room type booking');
        }
        
        $db->commit();
        
        logError("User created room type reservation with ID: " . $reservationId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Room type reservation created successfully',
            'reservation_id' => $reservationId,
            'customer_id' => $customerId,
            'advance_payment_id' => $advancePaymentId,
            'advance_amount' => $advancePayment,
            'checkin_datetime' => $checkinDateTime,
            'checkout_datetime' => $checkoutDateTime,
            'pricing_adjustments' => $pricingAdjustments,
            'final_total' => isset($finalTotal) ? $finalTotal : $adjustedTotal,
            'room_assignment_pending' => true,
            'available_rooms_of_type' => $availableCount
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

function handleSpecificRoomBooking($db, $input) {
    // Your existing logic for specific room bookings
    // Validate required fields for specific room booking
    $required = ['first_name', 'last_name', 'email', 'phone_number', 'room_id', 
                'check_in_date', 'check_out_date', 'total_amount'];
    foreach ($required as $field) {
        if (empty($input[$field]) && $input[$field] !== 0) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Process datetime fields
    $checkinDateTime = processDateTime($input['check_in_date'], $input['checkin_time'] ?? '15:00:00');
    $checkoutDateTime = processDateTime($input['check_out_date'], $input['checkout_time'] ?? '12:00:00');
    
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
    
    // Validate datetime logic
    if (strtotime($checkoutDateTime) <= strtotime($checkinDateTime)) {
        throw new Exception('Check-out date and time must be after check-in date and time');
    }
    
    // Validate minimum stay duration
    $timeDiff = strtotime($checkoutDateTime) - strtotime($checkinDateTime);
    if ($timeDiff < (4 * 3600)) {
        throw new Exception('Minimum stay duration is 4 hours');
    }
    
    // Check room availability with datetime
    if (!isRoomAvailableDateTime($db, $input['room_id'], $checkinDateTime, $checkoutDateTime)) {
        throw new Exception('Room is not available for the selected dates and times');
    }
    
    // Calculate time-based pricing adjustments
    $pricingAdjustments = calculateTimePricingAdjustments($input['checkin_time'] ?? '15:00:00', $input['checkout_time'] ?? '12:00:00');
    $adjustedTotal = (float)$input['total_amount'] + $pricingAdjustments['total_adjustment'];
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Create/update customer
        $customerId = createOrUpdateCustomer($db, $input);
        
        // Create reservation with datetime
        $reservationId = createReservationWithDateTime($db, $input, $customerId, $checkinDateTime, $checkoutDateTime, $adjustedTotal);
        
        // Log reservation creation
        logReservationAction($db, $reservationId, 'created', $customerId, 'customer', [
            'room_id' => $input['room_id'],
            'checkin_datetime' => $checkinDateTime,
            'checkout_datetime' => $checkoutDateTime,
            'total_amount' => $adjustedTotal,
            'guest_count' => $input['guest_count'] ?? 1,
            'pricing_adjustments' => $pricingAdjustments,
            'booking_type' => 'specific_room'
        ], 'Online reservation with datetime selection');
        
        // Handle additional services and menu items
        $additionalCharges = 0;
        
        if (!empty($input['services']) && is_array($input['services'])) {
            $additionalCharges += addServicesToReservation($db, $reservationId, $input['services']);
        }
        
        if (!empty($input['menu_items']) && is_array($input['menu_items'])) {
            $additionalCharges += addMenuItemsToReservation($db, $reservationId, $input['menu_items']);
        }
        
        // Update total amount if there are additional charges
        if ($additionalCharges > 0) {
            $finalTotal = $adjustedTotal + $additionalCharges;
            updateReservationTotal($db, $reservationId, $finalTotal);
            
            // Log the modification
            logReservationAction($db, $reservationId, 'modified', $customerId, 'customer', [
                'old_total' => $adjustedTotal,
                'new_total' => $finalTotal,
                'additional_charges' => $additionalCharges
            ], 'Added services and menu items');
        }
        
        // Handle advance payment if provided
        $advancePaymentId = null;
        if ($advancePayment > 0) {
            $advancePaymentId = createAdvancePayment(
                $db, 
                $reservationId, 
                $advancePayment, 
                $paymentMethodId, 
                $referenceNumber
            );
            
            // Update reservation with advance payment amount
            updateReservationAdvancePayment($db, $reservationId, $advancePayment);
            
            // Log payment
            logReservationAction($db, $reservationId, 'payment_received', $customerId, 'customer', [
                'advance_payment_id' => $advancePaymentId,
                'amount' => $advancePayment,
                'payment_method_id' => $paymentMethodId,
                'reference_number' => $referenceNumber
            ], 'Advance payment processed');
        }
        
        // Update room status to reserved
        updateRoomStatusForReservation($db, $input['room_id'], 2);
        
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Reservation created successfully',
            'reservation_id' => $reservationId,
            'customer_id' => $customerId,
            'advance_payment_id' => $advancePaymentId,
            'advance_amount' => $advancePayment,
            'checkin_datetime' => $checkinDateTime,
            'checkout_datetime' => $checkoutDateTime,
            'pricing_adjustments' => $pricingAdjustments,
            'final_total' => isset($finalTotal) ? $finalTotal : $adjustedTotal
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

// Helper Functions

function getRoomTypeAvailability($db, $roomTypeId, $checkinDateTime, $checkoutDateTime, $guestCount = 1) {
    // Get total rooms of this type
    $totalStmt = $db->prepare("
        SELECT COUNT(*) as total_rooms 
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.room_type_id
        WHERE r.room_type_id = ? 
        AND r.room_status_id = 1 
        AND rt.capacity >= ?
    ");
    $totalStmt->execute([$roomTypeId, $guestCount]);
    $totalResult = $totalStmt->fetch(PDO::FETCH_ASSOC);
    $totalRooms = $totalResult['total_rooms'] ?? 0;
    
    if ($totalRooms == 0) {
        return 0;
    }
    
    // Get reserved rooms of this type for the datetime range
    $reservedStmt = $db->prepare("
        SELECT COUNT(DISTINCT COALESCE(ra.room_id, r.room_id)) as reserved_rooms
        FROM reservations res
        LEFT JOIN room_assignments ra ON res.reservation_id = ra.reservation_id
        LEFT JOIN rooms r ON res.room_id = r.room_id
        WHERE (
            (res.room_type_id = ? AND res.booking_type = 'room_type') OR
            (r.room_type_id = ? AND res.booking_type = 'specific_room')
        )
        AND res.reservation_status_id IN (2, 3)
        AND (
            (res.checkin_datetime < ? AND res.checkout_datetime > ?) OR
            (res.checkin_datetime < ? AND res.checkout_datetime > ?) OR
            (res.checkin_datetime >= ? AND res.checkout_datetime <= ?)
        )
    ");
    
    $reservedStmt->execute([
        $roomTypeId, $roomTypeId,
        $checkoutDateTime, $checkinDateTime,
        $checkinDateTime, $checkoutDateTime,
        $checkinDateTime, $checkoutDateTime
    ]);
    
    $reservedResult = $reservedStmt->fetch(PDO::FETCH_ASSOC);
    $reservedRooms = $reservedResult['reserved_rooms'] ?? 0;
    
    $availableRooms = max(0, $totalRooms - $reservedRooms);
    
    logError("Room type {$roomTypeId} availability check: Total={$totalRooms}, Reserved={$reservedRooms}, Available={$availableRooms}");
    
    return $availableRooms;
}

function createRoomTypeReservation($db, $input, $customerId, $checkinDateTime, $checkoutDateTime, $totalAmount) {
    $advancePayment = (float)($input['advance_payment'] ?? 0);
    
    $stmt = $db->prepare("
        INSERT INTO reservations (
            reservation_type_id, room_type_id, customer_id, check_in_date, check_out_date,
            checkin_datetime, checkout_datetime, reservation_status_id, total_amount, 
            advance_payment, guest_count, special_requests, booking_type, 
            room_assignment_pending, created_at, updated_at
        ) VALUES (2, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'room_type', 1, NOW(), NOW())
    ");
    
    $stmt->execute([
        $input['room_type_id'],
        $customerId,
        date('Y-m-d', strtotime($checkinDateTime)),
        date('Y-m-d', strtotime($checkoutDateTime)),
        $checkinDateTime,
        $checkoutDateTime,
        $totalAmount,
        $advancePayment,
        (int)($input['guest_count'] ?? 1),
        $input['special_requests'] ?? null
    ]);
    
    return $db->lastInsertId();
}

function processDateTime($date, $time) {
    $dateObj = new DateTime($date . ' ' . $time);
    return $dateObj->format('Y-m-d H:i:s');
}

function calculateTimePricingAdjustments($checkinTime, $checkoutTime) {
    $adjustments = [
        'checkin_adjustment' => 0,
        'checkout_adjustment' => 0,
        'total_adjustment' => 0,
        'details' => []
    ];
    
    // Check-in time adjustments
    $checkinHour = (int)substr($checkinTime, 0, 2);
    if ($checkinHour < 15) { // Before 3 PM
        $adjustments['checkin_adjustment'] = 500; // Early check-in fee
        $adjustments['details'][] = 'Early check-in fee: ₱500';
    }
    
    // Check-out time adjustments
    $checkoutHour = (int)substr($checkoutTime, 0, 2);
    if ($checkoutHour < 11) { // Before 11 AM
        $adjustments['checkout_adjustment'] = -200; // Early checkout discount
        $adjustments['details'][] = 'Early check-out discount: -₱200';
    } elseif ($checkoutHour > 12) { // After 12 PM
        $adjustments['checkout_adjustment'] = 300; // Late checkout fee
        $adjustments['details'][] = 'Late check-out fee: ₱300';
    }
    
    $adjustments['total_adjustment'] = $adjustments['checkin_adjustment'] + $adjustments['checkout_adjustment'];
    
    return $adjustments;
}

function isRoomAvailableDateTime($db, $roomId, $checkinDateTime, $checkoutDateTime, $excludeReservationId = null) {
    $sql = "
        SELECT COUNT(*) as count 
        FROM reservations 
        WHERE room_id = ? 
        AND reservation_status_id IN (2, 3) 
        AND (
            (checkin_datetime < ? AND checkout_datetime > ?) OR
            (checkin_datetime < ? AND checkout_datetime > ?) OR
            (checkin_datetime >= ? AND checkout_datetime <= ?)
        )
    ";
    
    $params = [
        $roomId,
        $checkoutDateTime, $checkinDateTime,
        $checkinDateTime, $checkoutDateTime,
        $checkinDateTime, $checkoutDateTime
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
                $input['phone_number'],
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
            $input['email'],
            $input['phone_number']
        ]);
        
        $customerId = $db->lastInsertId();
    }
    
    return $customerId;
}

function createReservationWithDateTime($db, $input, $customerId, $checkinDateTime, $checkoutDateTime, $totalAmount) {
    $advancePayment = (float)($input['advance_payment'] ?? 0);
    
    $stmt = $db->prepare("
        INSERT INTO reservations (
            reservation_type_id, room_id, customer_id, check_in_date, check_out_date,
            checkin_datetime, checkout_datetime, reservation_status_id, total_amount, 
            advance_payment, guest_count, special_requests, booking_type, created_at, updated_at
        ) VALUES (2, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'specific_room', NOW(), NOW())
    ");
    
    $stmt->execute([
        $input['room_id'],
        $customerId,
        date('Y-m-d', strtotime($checkinDateTime)),
        date('Y-m-d', strtotime($checkoutDateTime)),
        $checkinDateTime,
        $checkoutDateTime,
        $totalAmount,
        $advancePayment,
        (int)($input['guest_count'] ?? 1),
        $input['special_requests'] ?? null
    ]);
    
    return $db->lastInsertId();
}

function logReservationAction($db, $reservationId, $actionType, $userId, $userType, $data, $notes = '') {
    try {
        $stmt = $db->prepare("
            INSERT INTO reservation_logs (
                reservation_id, action_type, user_id, user_type, 
                new_values, notes, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $reservationId,
            $actionType,
            $userId,
            $userType,
            json_encode($data),
            $notes
        ]);
        
        logError("Logged action: {$actionType} for reservation {$reservationId}");
    } catch (Exception $e) {
        logError("Failed to log reservation action: " . $e->getMessage());
    }
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
    
    // First, let's check what columns exist in the hotel_services table
    $checkStmt = $db->prepare("DESCRIBE hotel_services");
    $checkStmt->execute();
    $columns = $checkStmt->fetchAll(PDO::FETCH_COLUMN);
    logError("Hotel services table columns: " . json_encode($columns));
    
    // Determine the correct price column name
    $priceColumn = 'price';
    if (in_array('service_price', $columns)) {
        $priceColumn = 'service_price';
    } elseif (in_array('cost', $columns)) {
        $priceColumn = 'cost';
    } elseif (in_array('amount', $columns)) {
        $priceColumn = 'amount';
    }
    
    foreach ($services as $serviceId) {
        try {
            // Get service details with dynamic column name
            $serviceStmt = $db->prepare("SELECT service_name, {$priceColumn} as price FROM hotel_services WHERE service_id = ?");
            $serviceStmt->execute([$serviceId]);
            $serviceData = $serviceStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($serviceData) {
                $servicePrice = floatval($serviceData['price'] ?? 0);
                
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
    
    // Check menu_items table structure
    $checkStmt = $db->prepare("DESCRIBE menu_items");
    $checkStmt->execute();
    $columns = $checkStmt->fetchAll(PDO::FETCH_COLUMN);
    logError("Menu items table columns: " . json_encode($columns));
    
    foreach ($menuItems as $menuItem) {
        $menuId = $menuItem['id'];
        $quantity = $menuItem['quantity'] ?? 1;
        
        try {
            // Get menu item details
            $menuStmt = $db->prepare("SELECT item_name, price FROM menu_items WHERE menu_item_id = ?");
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
                    INSERT INTO request_items (request_id, menu_item_id, quantity)
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

function getUserReservations($db) {
    $customerId = $_GET['customer_id'] ?? null;
    $email = $_GET['email'] ?? null;
    
    if (!$customerId && !$email) {
        echo json_encode(['success' => false, 'error' => 'Customer ID or email required']);
        return;
    }
    
    $sql = "
        SELECT r.*, c.first_name, c.last_name, c.email, c.phone_number,
               rt.type_name as room_type_name, rm.room_number,
               rs.status_name as reservation_status,
               CASE 
                   WHEN r.booking_type = 'room_type' THEN 'Room Type Booking'
                   ELSE 'Specific Room Booking'
               END as booking_type_display
        FROM reservations r
        JOIN customers c ON r.customer_id = c.customer_id
        LEFT JOIN room_types rt ON r.room_type_id = rt.room_type_id
        LEFT JOIN rooms rm ON r.room_id = rm.room_id
        LEFT JOIN reservation_statuses rs ON r.reservation_status_id = rs.reservation_status_id
        WHERE 1=1
    ";
    
    $params = [];
    
    if ($customerId) {
        $sql .= " AND r.customer_id = ?";
        $params[] = $customerId;
    } elseif ($email) {
        $sql .= " AND c.email = ?";
        $params[] = $email;
    }
    
    $sql .= " ORDER BY r.created_at DESC";
    
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'reservations' => $reservations
        ]);
    } catch (Exception $e) {
        logError("Error fetching user reservations: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch reservations'
        ]);
    }
}
?>