<?php
// api/user/reservations.php - User Reservations Management API with Advance Payment
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

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        logError("Received booking data: " . json_encode($input));
        
        // Validate required fields
        $required = ['first_name', 'last_name', 'email', 'phone_number', 'room_id', 
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
            if ($advancePayment > 0) {
                $advancePaymentId = createAdvancePayment(
                    $db, 
                    $reservationId, 
                    $advancePayment, 
                    $paymentMethodId, 
                    $referenceNumber
                );
                logError("Created advance payment ID: " . $advancePaymentId);
                
                // Update reservation with advance payment amount
                updateReservationAdvancePayment($db, $reservationId, $advancePayment);
            }
            
            // Update room status to reserved
            updateRoomStatusForReservation($db, $input['room_id'], 2); // 2 = Reserved/Confirmed
            
            $db->commit();
            
            logError("User created reservation with ID: " . $reservationId);
            
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

function createReservation($db, $input, $customerId) {
    $advancePayment = (float)($input['advance_payment'] ?? 0);
    
    $stmt = $db->prepare("
        INSERT INTO reservations (
            reservation_type_id, room_id, customer_id, check_in_date, 
            check_out_date, reservation_status_id, total_amount, 
            advance_payment, guest_count, special_requests, created_at, updated_at
        ) VALUES (2, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $stmt->execute([
        $input['room_id'],
        $customerId,
        $input['check_in_date'],
        $input['check_out_date'],
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
?>