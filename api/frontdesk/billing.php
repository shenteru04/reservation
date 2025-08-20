<?php
// api/frontdesk/billing.php - Fixed Front Desk Billing Management API
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
    $logFile = __DIR__ . '/../logs/frontdesk_billing.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[FRONTDESK_BILLING] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
        case 'GET':
            handleGet($db);
            break;
        case 'POST':
            handlePost($db);
            break;
        case 'PUT':
            handlePut($db);
            break;
        case 'DELETE':
            handleDelete($db);
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

function handleGet($db) {
    try {
        $endpoint = $_GET['endpoint'] ?? 'invoices';
        
        switch ($endpoint) {
            case 'invoices':
                getInvoices($db);
                break;
            case 'invoice':
                getInvoice($db, $_GET['id'] ?? null);
                break;
            case 'payment_methods':
                getPaymentMethods($db);
                break;
            default:
                getInvoices($db);
                break;
        }
        
    } catch (Exception $e) {
        logError("Error in GET request: " . $e->getMessage());
        throw $e;
    }
}

function getInvoices($db) {
    try {
        // Get query parameters for filtering
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? '',
            'date_from' => $_GET['date_from'] ?? '',
            'date_to' => $_GET['date_to'] ?? '',
            'limit' => min(100, max(1, intval($_GET['limit'] ?? 50))),
            'offset' => max(0, intval($_GET['offset'] ?? 0))
        ];
        
        // Build WHERE clause
        $whereConditions = ['1=1']; // Always true condition to make building easier
        $params = [];
        
        if (!empty($filters['search'])) {
            $whereConditions[] = "(
                i.invoice_number LIKE ? OR
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) LIKE ? OR
                rm.room_number LIKE ?
            )";
            $searchTerm = '%' . $filters['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        if (!empty($filters['status'])) {
            $whereConditions[] = "i.payment_status = ?";
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['date_from'])) {
            $whereConditions[] = "DATE(i.created_at) >= ?";
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $whereConditions[] = "DATE(i.created_at) <= ?";
            $params[] = $filters['date_to'];
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        
        // Updated query to get invoices with proper joins
        $sql = "
            SELECT 
                i.invoice_id,
                i.invoice_number,
                i.reservation_id,
                i.total_amount,
                i.paid_amount,
                (i.total_amount - COALESCE(i.paid_amount, 0)) as balance,
                i.payment_status,
                i.due_date,
                i.notes,
                i.created_at,
                i.updated_at,
                r.check_in_date,
                r.check_out_date,
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                c.first_name,
                c.last_name,
                c.email,
                c.phone_number,
                rm.room_number,
                rt.type_name as room_type_name
            FROM invoices i
            LEFT JOIN reservations r ON i.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms rm ON r.room_id = rm.room_id
            LEFT JOIN room_types rt ON rm.room_type_id = rt.room_type_id
            $whereClause
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $filters['limit'];
        $params[] = $filters['offset'];
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up data
        $cleanedInvoices = [];
        foreach ($invoices as $invoice) {
            $cleanedInvoices[] = [
                'invoice_id' => (int)$invoice['invoice_id'],
                'invoice_number' => $invoice['invoice_number'],
                'reservation_id' => (int)$invoice['reservation_id'],
                'total_amount' => (float)($invoice['total_amount'] ?: 0),
                'paid_amount' => (float)($invoice['paid_amount'] ?: 0),
                'balance' => (float)($invoice['balance'] ?: 0),
                'payment_status' => $invoice['payment_status'],
                'due_date' => $invoice['due_date'],
                'notes' => $invoice['notes'] ?: '',
                'created_at' => $invoice['created_at'],
                'updated_at' => $invoice['updated_at'],
                'check_in_date' => $invoice['check_in_date'],
                'check_out_date' => $invoice['check_out_date'],
                'customer_name' => trim($invoice['customer_name']) ?: 'Walk-in Guest',
                'first_name' => $invoice['first_name'] ?: '',
                'last_name' => $invoice['last_name'] ?: '',
                'email' => $invoice['email'] ?: '',
                'phone_number' => $invoice['phone_number'] ?: '',
                'room_number' => $invoice['room_number'] ?: 'N/A',
                'room_type_name' => $invoice['room_type_name'] ?: 'Unknown'
            ];
        }
        
        // Get total count for pagination
        $countSql = "
            SELECT COUNT(*) as total
            FROM invoices i
            LEFT JOIN reservations r ON i.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms rm ON r.room_id = rm.room_id
            $whereClause
        ";
        
        // Remove limit and offset params for count
        $countParams = array_slice($params, 0, -2);
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($countParams);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        echo json_encode([
            'success' => true,
            'invoices' => $cleanedInvoices,
            'pagination' => [
                'total' => (int)$totalCount,
                'count' => count($cleanedInvoices),
                'limit' => $filters['limit'],
                'offset' => $filters['offset'],
                'has_more' => ($filters['offset'] + count($cleanedInvoices)) < $totalCount
            ]
        ]);
        
    } catch (PDOException $e) {
        logError("Error retrieving invoices: " . $e->getMessage());
        throw $e;
    }
}

function getInvoice($db, $invoiceId) {
    try {
        if (!$invoiceId) {
            throw new Exception('Invoice ID is required');
        }
        
        // Get invoice details with all related information
        $invoiceStmt = $db->prepare("
            SELECT 
                i.*,
                r.check_in_date,
                r.check_out_date,
                r.guest_count,
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                c.first_name,
                c.last_name,
                c.email,
                c.phone_number,
                rm.room_number,
                rm.floor_number,
                rt.type_name as room_type_name,
                rt.price_per_night,
                (i.total_amount - COALESCE(i.paid_amount, 0)) as balance
            FROM invoices i
            LEFT JOIN reservations r ON i.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms rm ON r.room_id = rm.room_id
            LEFT JOIN room_types rt ON rm.room_type_id = rt.room_type_id
            WHERE i.invoice_id = ?
        ");
        $invoiceStmt->execute([$invoiceId]);
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            throw new Exception('Invoice not found');
        }
        
        // Get invoice items if they exist
        $itemsStmt = $db->prepare("
            SELECT 
                ii.invoice_item_id,
                ii.description,
                ii.quantity,
                ii.unit_price,
                ii.total_price,
                ii.item_type
            FROM invoice_items ii
            WHERE ii.invoice_id = ?
            ORDER BY ii.invoice_item_id
        ");
        $itemsStmt->execute([$invoiceId]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get payment history if payments table exists
        $payments = [];
        try {
            $paymentsStmt = $db->prepare("
                SELECT 
                    p.payment_id,
                    p.amount,
                    p.payment_method,
                    p.payment_date,
                    p.reference_number,
                    p.notes
                FROM payments p
                WHERE p.invoice_id = ?
                ORDER BY p.payment_date DESC
            ");
            $paymentsStmt->execute([$invoiceId]);
            $payments = $paymentsStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            // Payments table might not exist, continue without it
            logError("Could not retrieve payments for invoice $invoiceId: " . $e->getMessage());
        }
        
        // Clean up data
        $cleanedInvoice = [
            'invoice_id' => (int)$invoice['invoice_id'],
            'invoice_number' => $invoice['invoice_number'],
            'reservation_id' => (int)$invoice['reservation_id'],
            'total_amount' => (float)($invoice['total_amount'] ?: 0),
            'paid_amount' => (float)($invoice['paid_amount'] ?: 0),
            'balance' => (float)($invoice['balance'] ?: 0),
            'payment_status' => $invoice['payment_status'],
            'due_date' => $invoice['due_date'],
            'notes' => $invoice['notes'] ?: '',
            'created_at' => $invoice['created_at'],
            'updated_at' => $invoice['updated_at'],
            'check_in_date' => $invoice['check_in_date'],
            'check_out_date' => $invoice['check_out_date'],
            'guest_count' => (int)($invoice['guest_count'] ?: 1),
            'customer_name' => trim($invoice['customer_name']) ?: 'Walk-in Guest',
            'first_name' => $invoice['first_name'] ?: '',
            'last_name' => $invoice['last_name'] ?: '',
            'email' => $invoice['email'] ?: '',
            'phone_number' => $invoice['phone_number'] ?: '',
            'room_number' => $invoice['room_number'] ?: 'N/A',
            'floor_number' => (int)($invoice['floor_number'] ?: 0),
            'room_type_name' => $invoice['room_type_name'] ?: 'Unknown',
            'price_per_night' => (float)($invoice['price_per_night'] ?: 0),
            'items' => array_map(function($item) {
                return [
                    'invoice_item_id' => (int)$item['invoice_item_id'],
                    'description' => $item['description'],
                    'quantity' => (int)$item['quantity'],
                    'unit_price' => (float)$item['unit_price'],
                    'total_price' => (float)$item['total_price'],
                    'item_type' => $item['item_type']
                ];
            }, $items),
            'payments' => array_map(function($payment) {
                return [
                    'payment_id' => (int)$payment['payment_id'],
                    'amount' => (float)$payment['amount'],
                    'payment_method' => $payment['payment_method'],
                    'payment_date' => $payment['payment_date'],
                    'reference_number' => $payment['reference_number'] ?: '',
                    'notes' => $payment['notes'] ?: ''
                ];
            }, $payments)
        ];
        
        echo json_encode([
            'success' => true,
            'invoice' => $cleanedInvoice
        ]);
        
    } catch (Exception $e) {
        logError("Error retrieving invoice: " . $e->getMessage());
        throw $e;
    }
}

function getPaymentMethods($db) {
    try {
        $methods = [
            ['id' => '1', 'name' => 'Cash', 'value' => 'cash'],
            ['id' => '2', 'name' => 'GCash', 'value' => 'gcash'],
            ['id' => '3', 'name' => 'Bank Transfer', 'value' => 'bank_transfer'],
            ['id' => '4', 'name' => 'Credit Card', 'value' => 'credit_card'],
            ['id' => '5', 'name' => 'Debit Card', 'value' => 'debit_card']
        ];
        
        echo json_encode([
            'success' => true,
            'payment_methods' => $methods
        ]);
        
    } catch (Exception $e) {
        logError("Error retrieving payment methods: " . $e->getMessage());
        throw $e;
    }
}

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['action'])) {
            throw new Exception('Missing action parameter');
        }
        
        $action = $input['action'];
        
        switch ($action) {
            case 'create_invoice':
                createInvoice($db, $input);
                break;
            case 'record_payment':
                recordPayment($db, $input);
                break;
            default:
                throw new Exception('Unknown action: ' . $action);
        }
        
    } catch (Exception $e) {
        logError("Error handling POST request: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function createInvoice($db, $input) {
    try {
        // Validate required fields
        $required = ['reservation_id', 'total_amount'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || $input[$field] === '') {
                throw new Exception("Missing required field: $field");
            }
        }
        
        $reservationId = (int)$input['reservation_id'];
        $totalAmount = (float)$input['total_amount'];
        $paidAmount = (float)($input['paid_amount'] ?? 0);
        $paymentStatus = $input['payment_status'] ?? 'Unpaid';
        $paymentMethod = $input['payment_method'] ?? null;
        $notes = $input['notes'] ?? '';
        
        // Validate amounts
        if ($totalAmount <= 0) {
            throw new Exception('Total amount must be greater than zero');
        }
        
        if ($paidAmount < 0) {
            throw new Exception('Paid amount cannot be negative');
        }
        
        if ($paidAmount > $totalAmount) {
            throw new Exception('Paid amount cannot exceed total amount');
        }
        
        // Check if reservation exists
        $reservationStmt = $db->prepare("SELECT reservation_id FROM reservations WHERE reservation_id = ?");
        $reservationStmt->execute([$reservationId]);
        if (!$reservationStmt->fetch()) {
            throw new Exception('Reservation not found');
        }
        
        // Check if invoice already exists for this reservation
        $existingStmt = $db->prepare("SELECT invoice_id FROM invoices WHERE reservation_id = ?");
        $existingStmt->execute([$reservationId]);
        if ($existingStmt->fetch()) {
            throw new Exception('Invoice already exists for this reservation');
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Generate invoice number
            $invoiceNumber = generateInvoiceNumber($db);
            
            // Calculate due date (7 days from now)
            $dueDate = date('Y-m-d', strtotime('+7 days'));
            
            // Determine payment status based on amounts
            if ($paidAmount >= $totalAmount) {
                $paymentStatus = 'Paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'Partial';
            } else {
                $paymentStatus = 'Unpaid';
            }
            
            // Create invoice
            $invoiceStmt = $db->prepare("
                INSERT INTO invoices (
                    invoice_number, reservation_id, total_amount, paid_amount,
                    payment_status, due_date, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            
            $invoiceStmt->execute([
                $invoiceNumber,
                $reservationId,
                $totalAmount,
                $paidAmount,
                $paymentStatus,
                $dueDate,
                $notes
            ]);
            
            $invoiceId = $db->lastInsertId();
            
            // Create basic invoice item for room charges
            try {
                $itemStmt = $db->prepare("
                    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, item_type)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $itemStmt->execute([
                    $invoiceId,
                    'Room charges and services',
                    1,
                    $totalAmount,
                    $totalAmount,
                    'room'
                ]);
            } catch (PDOException $e) {
                // Invoice items table might not exist, continue without it
                logError("Could not create invoice items: " . $e->getMessage());
            }
            
            // Record initial payment if any
            if ($paidAmount > 0 && $paymentMethod) {
                try {
                    $paymentStmt = $db->prepare("
                        INSERT INTO payments (
                            invoice_id, amount, payment_method, payment_date, 
                            reference_number, notes, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ");
                    $paymentStmt->execute([
                        $invoiceId,
                        $paidAmount,
                        $paymentMethod,
                        date('Y-m-d H:i:s'),
                        'INV-' . $invoiceNumber,
                        'Initial payment recorded with invoice'
                    ]);
                } catch (PDOException $e) {
                    // Payments table might not exist, continue without it
                    logError("Could not record initial payment: " . $e->getMessage());
                }
            }
            
            $db->commit();
            
            logError("Invoice created with ID: " . $invoiceId . " for reservation: " . $reservationId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Invoice created successfully',
                'invoice_id' => $invoiceId,
                'invoice_number' => $invoiceNumber,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'payment_status' => $paymentStatus
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        throw new Exception('Failed to create invoice: ' . $e->getMessage());
    }
}

function recordPayment($db, $input) {
    try {
        $required = ['invoice_id', 'amount', 'payment_method'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }
        
        $invoiceId = (int)$input['invoice_id'];
        $amount = (float)$input['amount'];
        $paymentMethod = $input['payment_method'];
        
        if ($amount <= 0) {
            throw new Exception('Payment amount must be greater than zero');
        }
        
        // Get invoice details
        $invoiceStmt = $db->prepare("
            SELECT total_amount, paid_amount, payment_status 
            FROM invoices 
            WHERE invoice_id = ?
        ");
        $invoiceStmt->execute([$invoiceId]);
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            throw new Exception('Invoice not found');
        }
        
        $currentPaid = (float)($invoice['paid_amount'] ?: 0);
        $totalAmount = (float)$invoice['total_amount'];
        $remainingBalance = $totalAmount - $currentPaid;
        
        if ($amount > $remainingBalance) {
            throw new Exception('Payment amount exceeds remaining balance of ₱' . number_format($remainingBalance, 2));
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Record payment in payments table if it exists
            try {
                $paymentStmt = $db->prepare("
                    INSERT INTO payments (
                        invoice_id, amount, payment_method, payment_date, 
                        reference_number, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                ");
                
                $paymentStmt->execute([
                    $invoiceId,
                    $amount,
                    $paymentMethod,
                    $input['payment_date'] ?? date('Y-m-d H:i:s'),
                    $input['reference_number'] ?? ('PAY-' . time()),
                    $input['notes'] ?? 'Payment recorded via front desk'
                ]);
                
                $paymentId = $db->lastInsertId();
            } catch (PDOException $e) {
                // Payments table might not exist, continue without it
                logError("Could not record payment in payments table: " . $e->getMessage());
                $paymentId = null;
            }
            
            // Update invoice paid amount and status
            $newPaidAmount = $currentPaid + $amount;
            $newStatus = ($newPaidAmount >= $totalAmount) ? 'Paid' : 'Partial';
            
            $updateInvoiceStmt = $db->prepare("
                UPDATE invoices 
                SET paid_amount = ?, payment_status = ?, updated_at = NOW() 
                WHERE invoice_id = ?
            ");
            $updateInvoiceStmt->execute([$newPaidAmount, $newStatus, $invoiceId]);
            
            $db->commit();
            
            logError("Payment recorded: ₱" . $amount . " for invoice ID: " . $invoiceId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Payment recorded successfully',
                'payment_id' => $paymentId,
                'new_balance' => $totalAmount - $newPaidAmount,
                'payment_status' => $newStatus,
                'total_paid' => $newPaidAmount
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        throw new Exception('Failed to record payment: ' . $e->getMessage());
    }
}

function handlePut($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['invoice_id'])) {
            throw new Exception('Missing invoice_id');
        }
        
        $invoiceId = (int)$input['invoice_id'];
        
        // Update invoice
        $updateFields = [];
        $updateValues = [];
        
        $allowedFields = ['due_date', 'notes', 'payment_status'];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field]) && $input[$field] !== '') {
                $updateFields[] = "$field = ?";
                $updateValues[] = $input[$field];
            }
        }
        
        if (!empty($updateFields)) {
            $updateFields[] = "updated_at = NOW()";
            $updateValues[] = $invoiceId;
            
            $sql = "UPDATE invoices SET " . implode(', ', $updateFields) . " WHERE invoice_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($updateValues);
            
            logError("Invoice updated with ID: " . $invoiceId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Invoice updated successfully'
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'message' => 'No changes made'
            ]);
        }
        
    } catch (Exception $e) {
        logError("Error updating invoice: " . $e->getMessage());
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
        
        if (!$input || empty($input['invoice_id'])) {
            throw new Exception('Missing invoice_id');
        }
        
        $invoiceId = (int)$input['invoice_id'];
        
        // Check if invoice exists and can be deleted
        $invoiceStmt = $db->prepare("SELECT payment_status, paid_amount FROM invoices WHERE invoice_id = ?");
        $invoiceStmt->execute([$invoiceId]);
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            throw new Exception('Invoice not found');
        }
        
        // Don't allow deletion of paid invoices
        if ($invoice['payment_status'] === 'Paid' || (float)($invoice['paid_amount'] ?? 0) > 0) {
            throw new Exception('Cannot delete invoices with recorded payments');
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Delete invoice items if table exists
            try {
                $deleteItemsStmt = $db->prepare("DELETE FROM invoice_items WHERE invoice_id = ?");
                $deleteItemsStmt->execute([$invoiceId]);
            } catch (PDOException $e) {
                // Table might not exist, continue
            }
            
            // Delete payments if table exists
            try {
                $deletePaymentsStmt = $db->prepare("DELETE FROM payments WHERE invoice_id = ?");
                $deletePaymentsStmt->execute([$invoiceId]);
            } catch (PDOException $e) {
                // Table might not exist, continue
            }
            
            // Delete invoice
            $deleteInvoiceStmt = $db->prepare("DELETE FROM invoices WHERE invoice_id = ?");
            $deleteInvoiceStmt->execute([$invoiceId]);
            
            if ($deleteInvoiceStmt->rowCount() === 0) {
                throw new Exception('Invoice not found or could not be deleted');
            }
            
            $db->commit();
            
            logError("Invoice deleted with ID: " . $invoiceId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Invoice deleted successfully'
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        logError("Error deleting invoice: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

// Helper Functions

function generateInvoiceNumber($db) {
    $year = date('Y');
    $month = date('m');
    
    // Get the last invoice number for this year and month
    $stmt = $db->prepare("
        SELECT invoice_number 
        FROM invoices 
        WHERE invoice_number LIKE ? 
        ORDER BY invoice_number DESC 
        LIMIT 1
    ");
    $stmt->execute(["INV-{$year}{$month}%"]);
    $lastInvoice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($lastInvoice) {
        // Extract the last 4 digits and increment
        $lastNumber = (int)substr($lastInvoice['invoice_number'], -4);
        $nextNumber = $lastNumber + 1;
    } else {
        $nextNumber = 1;
    }
    
    return sprintf("INV-%s%s%04d", $year, $month, $nextNumber);
}

function createInvoicesTable($db) {
    try {
        $sql = "
            CREATE TABLE IF NOT EXISTS invoices (
                invoice_id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                reservation_id INT NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                payment_status ENUM('Paid', 'Unpaid', 'Partial', 'Pending') DEFAULT 'Unpaid',
                due_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE CASCADE
            )
        ";
        $db->exec($sql);
        
        // Create invoice_items table
        $itemsSql = "
            CREATE TABLE IF NOT EXISTS invoice_items (
                invoice_item_id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                description VARCHAR(255) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                item_type ENUM('room', 'service', 'food', 'other') DEFAULT 'other',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
            )
        ";
        $db->exec($itemsSql);
        
        // Create payments table
        $paymentsSql = "
            CREATE TABLE IF NOT EXISTS payments (
                payment_id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reference_number VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
            )
        ";
        $db->exec($paymentsSql);
        
        logError("Invoice tables created successfully");
        
    } catch (PDOException $e) {
        logError("Error creating invoice tables: " . $e->getMessage());
        // Don't throw error, let the system continue without these tables
    }
}

// Initialize tables on first run
try {
    $db = getDB();
    
    // Check if invoices table exists, if not create it
    $checkTable = $db->query("SHOW TABLES LIKE 'invoices'");
    if ($checkTable->rowCount() === 0) {
        createInvoicesTable($db);
    }
} catch (Exception $e) {
    logError("Error checking/creating tables: " . $e->getMessage());
}

?>