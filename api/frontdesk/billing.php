<?php
// api/frontdesk/billing.php - Fixed Front Desk Billing Management API
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

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
        @mkdir($logDir, 0755, true);
    }
    error_log("[FRONTDESK_BILLING] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

// Function to send JSON response and exit
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Function to handle exceptions and send error response
function handleError($message, $statusCode = 500) {
    logError($message);
    sendResponse([
        'success' => false,
        'error' => $message
    ], $statusCode);
}

// Get client IP address
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'];
    }
}

// Log an action to the payment_logs table
function logAction($db, $invoiceId, $reservationId, $amount, $paymentMethod, $referenceNumber, $notes, $actionType, $previousStatus = null, $newStatus = null) {
    try {
        // Get current user from session (assuming you have a logged-in user)
        $recordedBy = $_SESSION['username'] ?? $_SESSION['employee_name'] ?? 'Unknown User';
        
        $sql = "INSERT INTO payment_logs (
            invoice_id, reservation_id, amount, payment_method, reference_number, 
            notes, recorded_by, action_type, previous_status, new_status, 
            ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $invoiceId,
            $reservationId,
            $amount,
            $paymentMethod,
            $referenceNumber,
            $notes,
            $recordedBy,
            $actionType,
            $previousStatus,
            $newStatus,
            getClientIP(),
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
        
        return $db->lastInsertId();
    } catch (PDOException $e) {
        logError("Failed to log action: " . $e->getMessage());
        return null;
    }
}

// Load database configuration
function createDatabaseConnection() {
    try {
        $host = 'localhost';
        $dbname = 'hotel_management'; // Updated to match your database name
        $username = 'root';
        $password = '';
        
        $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        logError("Database connection failed: " . $e->getMessage());
        return null;
    }
}

try {
    $db = createDatabaseConnection();
    if (!$db) {
        handleError("Database connection failed");
    }
    
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
            handleError("Method not allowed", 405);
    }
    
} catch (PDOException $e) {
    handleError("Database error: " . $e->getMessage());
} catch (Exception $e) {
    handleError("Server error: " . $e->getMessage());
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
                getPaymentMethods();
                break;
            case 'payment_logs':
                getPaymentLogs($db);
                break;
            default:
                getInvoices($db);
                break;
        }
        
    } catch (Exception $e) {
        handleError("Error in GET request: " . $e->getMessage());
    }
}

function getInvoices($db) {
    try {
        // Get query parameters for filtering
        $filters = [
            'search' => $_GET['search'] ?? '',
            'status' => $_GET['status'] ?? '',
            'payment_method' => $_GET['payment_method'] ?? '',
            'date_from' => $_GET['date_from'] ?? '',
            'date_to' => $_GET['date_to'] ?? '',
            'limit' => min(100, max(1, intval($_GET['limit'] ?? 50))),
            'offset' => max(0, intval($_GET['offset'] ?? 0))
        ];
        
        // Build WHERE clause
        $whereConditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['search'])) {
            $whereConditions[] = "(
                i.invoice_number LIKE ? OR
                CAST(i.reservation_id AS CHAR) LIKE ? OR
                CONCAT(c.first_name, ' ', c.last_name) LIKE ?
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
        
        if (!empty($filters['payment_method'])) {
            // Check if an invoice has any payment with the specified method
            $whereConditions[] = "EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = i.invoice_id AND p.payment_method = ?)";
            $params[] = $filters['payment_method'];
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
        
        // Main query with proper joins
        $sql = "
            SELECT 
                i.invoice_id,
                i.invoice_number,
                i.reservation_id,
                i.total_amount,
                i.paid_amount,
                (i.total_amount - COALESCE(i.paid_amount, 0)) as balance,
                i.payment_status,
                (SELECT p.payment_method FROM payments p WHERE p.invoice_id = i.invoice_id ORDER BY p.payment_date DESC LIMIT 1) as payment_method,
                i.due_date,
                i.notes,
                i.created_at,
                i.updated_at,
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                c.email,
                r.room_id,
                COALESCE(ro.room_number, 'N/A') as room_number
            FROM invoices i
            LEFT JOIN reservations r ON i.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ro ON r.room_id = ro.room_id
            $whereClause
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $filters['limit'];
        $params[] = $filters['offset'];
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up the invoice data
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
                'payment_method' => $invoice['payment_method'],
                'due_date' => $invoice['due_date'],
                'notes' => $invoice['notes'] ?: '',
                'created_at' => $invoice['created_at'],
                'updated_at' => $invoice['updated_at'],
                'customer_name' => trim($invoice['customer_name']) ?: 'Guest #' . $invoice['reservation_id'],
                'email' => $invoice['email'] ?: '',
                'room_number' => $invoice['room_number'] ?: 'N/A'
            ];
        }
        
        // Get total count for pagination
        $countSql = "
            SELECT COUNT(*) as total 
            FROM invoices i
            LEFT JOIN reservations r ON i.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            $whereClause
        ";
        $countParams = array_slice($params, 0, -2);
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($countParams);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        sendResponse([
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
        handleError("Database error retrieving invoices: " . $e->getMessage());
    }
}

function getInvoice($db, $invoiceId) {
    try {
        if (!$invoiceId) {
            handleError('Invoice ID is required', 400);
        }
        
        $invoiceStmt = $db->prepare("
            SELECT 
                i.*,
                (i.total_amount - COALESCE(i.paid_amount, 0)) as balance,
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                c.email,
                r.room_id,
                COALESCE(ro.room_number, 'N/A') as room_number
            FROM invoices i
            LEFT JOIN reservations r ON i.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ro ON r.room_id = ro.room_id
            WHERE i.invoice_id = ?
        ");
        $invoiceStmt->execute([$invoiceId]);
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            handleError('Invoice not found', 404);
        }
        
        // Get invoice items
        $items = [];
        try {
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
        } catch (PDOException $e) {
            logError("Could not retrieve invoice items: " . $e->getMessage());
        }
        
        // Get payment history
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
            logError("Could not retrieve payments: " . $e->getMessage());
        }
        
        // Get payment logs for this invoice
        $logs = [];
        try {
            $logsStmt = $db->prepare("
                SELECT 
                    pl.log_id,
                    pl.amount,
                    pl.payment_method,
                    pl.reference_number,
                    pl.notes,
                    pl.recorded_by,
                    pl.recorded_at,
                    pl.action_type,
                    pl.previous_status,
                    pl.new_status
                FROM payment_logs pl
                WHERE pl.invoice_id = ?
                ORDER BY pl.recorded_at DESC
            ");
            $logsStmt->execute([$invoiceId]);
            $logs = $logsStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            logError("Could not retrieve payment logs: " . $e->getMessage());
        }
        
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
            'customer_name' => trim($invoice['customer_name']) ?: 'Guest #' . $invoice['reservation_id'],
            'email' => $invoice['email'] ?: '',
            'room_number' => $invoice['room_number'] ?: 'N/A',
            'items' => $items,
            'payments' => $payments,
            'logs' => $logs
        ];
        
        sendResponse([
            'success' => true,
            'invoice' => $cleanedInvoice
        ]);
        
    } catch (Exception $e) {
        handleError("Error retrieving invoice: " . $e->getMessage());
    }
}

function getPaymentMethods() {
    $methods = [
        ['id' => 'cash', 'name' => 'Cash', 'value' => 'cash'],
        ['id' => 'gcash', 'name' => 'GCash', 'value' => 'gcash'],
        ['id' => 'bank_transfer', 'name' => 'Bank Transfer', 'value' => 'bank_transfer'],
        ['id' => 'credit_card', 'name' => 'Credit Card', 'value' => 'credit_card'],
        ['id' => 'debit_card', 'name' => 'Debit Card', 'value' => 'debit_card']
    ];
    
    sendResponse([
        'success' => true,
        'payment_methods' => $methods
    ]);
}

function getPaymentLogs($db) {
    try {
        $filters = [
            'invoice_id' => $_GET['invoice_id'] ?? '',
            'action_type' => $_GET['action_type'] ?? '',
            'date_from' => $_GET['date_from'] ?? '',
            'date_to' => $_GET['date_to'] ?? '',
            'limit' => min(100, max(1, intval($_GET['limit'] ?? 50))),
            'offset' => max(0, intval($_GET['offset'] ?? 0))
        ];
        
        $whereConditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['invoice_id'])) {
            $whereConditions[] = "pl.invoice_id = ?";
            $params[] = $filters['invoice_id'];
        }
        
        if (!empty($filters['action_type'])) {
            $whereConditions[] = "pl.action_type = ?";
            $params[] = $filters['action_type'];
        }
        
        if (!empty($filters['date_from'])) {
            $whereConditions[] = "DATE(pl.recorded_at) >= ?";
            $params[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $whereConditions[] = "DATE(pl.recorded_at) <= ?";
            $params[] = $filters['date_to'];
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        
        $sql = "
            SELECT 
                pl.*,
                i.invoice_number,
                CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                r.reservation_id
            FROM payment_logs pl
            LEFT JOIN invoices i ON pl.invoice_id = i.invoice_id
            LEFT JOIN reservations r ON pl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            $whereClause
            ORDER BY pl.recorded_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $filters['limit'];
        $params[] = $filters['offset'];
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up the log data
        $cleanedLogs = [];
        foreach ($logs as $log) {
            $cleanedLogs[] = [
                'log_id' => (int)$log['log_id'],
                'invoice_id' => (int)$log['invoice_id'],
                'reservation_id' => !empty($log['reservation_id']) ? (int)$log['reservation_id'] : null,
                'amount' => (float)($log['amount'] ?: 0),
                'payment_method' => $log['payment_method'] ?: '',
                'reference_number' => $log['reference_number'] ?: '',
                'notes' => $log['notes'] ?: '',
                'recorded_by' => $log['recorded_by'] ?: 'Unknown',
                'recorded_at' => $log['recorded_at'],
                'action_type' => $log['action_type'],
                'previous_status' => $log['previous_status'],
                'new_status' => $log['new_status'],
                'invoice_number' => $log['invoice_number'] ?: 'N/A',
                'customer_name' => trim($log['customer_name']) ?: 'Unknown Customer'
            ];
        }
        
        // Get total count for pagination
        $countSql = "
            SELECT COUNT(*) as total 
            FROM payment_logs pl
            $whereClause
        ";
        $countParams = array_slice($params, 0, -2);
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($countParams);
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        sendResponse([
            'success' => true,
            'logs' => $cleanedLogs,
            'pagination' => [
                'total' => (int)$totalCount,
                'count' => count($cleanedLogs),
                'limit' => $filters['limit'],
                'offset' => $filters['offset'],
                'has_more' => ($filters['offset'] + count($cleanedLogs)) < $totalCount
            ]
        ]);
        
    } catch (PDOException $e) {
        handleError("Database error retrieving payment logs: " . $e->getMessage());
    }
}

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            handleError('Invalid JSON input: ' . json_last_error_msg(), 400);
        }
        
        if (!$input || empty($input['action'])) {
            handleError('Missing action parameter', 400);
        }
        
        $action = $input['action'];
        logError("Processing POST action: " . $action);
        
        switch ($action) {
            case 'create_invoice':
                createInvoice($db, $input);
                break;
            case 'record_payment':
                recordPayment($db, $input);
                break;
            default:
                handleError('Unknown action: ' . $action, 400);
        }
        
    } catch (Exception $e) {
        handleError("Error handling POST request: " . $e->getMessage(), 400);
    }
}

function createInvoice($db, $input) {
    try {
        logError("Creating invoice with input: " . json_encode($input));
        
        // Validate required fields
        $required = ['reservation_id', 'total_amount'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || $input[$field] === '' || $input[$field] === null) {
                handleError("Missing required field: $field", 400);
            }
        }
        
        $reservationId = (int)$input['reservation_id'];
        $totalAmount = (float)$input['total_amount'];
        $paidAmount = (float)($input['paid_amount'] ?? 0);
        $paymentStatus = $input['payment_status'] ?? 'Unpaid';
        $paymentMethod = !empty($input['payment_method']) ? $input['payment_method'] : null;
        $notes = $input['notes'] ?? '';
        
        // Validate amounts
        if ($totalAmount <= 0) {
            handleError('Total amount must be greater than zero', 400);
        }
        
        if ($paidAmount < 0) {
            handleError('Paid amount cannot be negative', 400);
        }
        
        if ($paidAmount > $totalAmount) {
            handleError('Paid amount cannot exceed total amount', 400);
        }
        
        // Check if invoice already exists for this reservation
        $existingStmt = $db->prepare("SELECT invoice_id FROM invoices WHERE reservation_id = ?");
        $existingStmt->execute([$reservationId]);
        if ($existingStmt->fetch()) {
            handleError('Invoice already exists for this reservation', 409);
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
                    invoice_number, reservation_id, total_amount, paid_amount, payment_status,
                    due_date, notes, created_at, updated_at
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
                    logError("Could not record initial payment: " . $e->getMessage());
                }
            }
            
            // Log the action
            logAction(
                $db,
                $invoiceId,
                $reservationId,
                $totalAmount,
                $paymentMethod ?? 'N/A',
                'INV-' . $invoiceNumber,
                $notes,
                'create_invoice',
                null,
                $paymentStatus
            );
            
            $db->commit();
            
            logError("Invoice created successfully with ID: " . $invoiceId);
            
            sendResponse([
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
        handleError('Failed to create invoice: ' . $e->getMessage(), 500);
    }
}

function recordPayment($db, $input) {
    try {
        logError("Recording payment with input: " . json_encode($input));
        
        $required = ['invoice_id', 'amount', 'payment_method'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                handleError("Missing required field: $field", 400);
            }
        }
        
        $invoiceId = (int)$input['invoice_id'];
        $amount = (float)$input['amount'];
        $paymentMethod = $input['payment_method'];
        $referenceNumber = $input['reference_number'] ?? ('PAY-' . time());
        $notes = $input['notes'] ?? 'Payment recorded via front desk';
        
        if ($amount <= 0) {
            handleError('Payment amount must be greater than zero', 400);
        }
        
        // Get invoice details
        $invoiceStmt = $db->prepare("
            SELECT total_amount, paid_amount, payment_status, reservation_id 
            FROM invoices 
            WHERE invoice_id = ?
        ");
        $invoiceStmt->execute([$invoiceId]);
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            handleError('Invoice not found', 404);
        }
        
        $currentPaid = (float)($invoice['paid_amount'] ?: 0);
        $totalAmount = (float)$invoice['total_amount'];
        $remainingBalance = $totalAmount - $currentPaid;
        
        if ($amount > $remainingBalance) {
            handleError('Payment amount exceeds remaining balance of ₱' . number_format($remainingBalance, 2), 400);
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Record payment in payments table
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
                    $referenceNumber,
                    $notes
                ]);
                
                $paymentId = $db->lastInsertId();
            } catch (PDOException $e) {
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
            
            // Log the action
            logAction(
                $db,
                $invoiceId,
                $invoice['reservation_id'],
                $amount,
                $paymentMethod,
                $referenceNumber,
                $notes,
                'record_payment',
                $invoice['payment_status'],
                $newStatus
            );
            
            $db->commit();
            
            logError("Payment recorded successfully: ₱" . $amount . " for invoice ID: " . $invoiceId);
            
            sendResponse([
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
        handleError('Failed to record payment: ' . $e->getMessage(), 500);
    }
}

function handlePut($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['invoice_id'])) {
            handleError('Missing invoice_id', 400);
        }
        
        $invoiceId = (int)$input['invoice_id'];
        
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
            // Get current status for logging
            $currentStatusStmt = $db->prepare("SELECT payment_status FROM invoices WHERE invoice_id = ?");
            $currentStatusStmt->execute([$invoiceId]);
            $currentStatus = $currentStatusStmt->fetch(PDO::FETCH_ASSOC)['payment_status'];
            
            $updateFields[] = "updated_at = NOW()";
            $updateValues[] = $invoiceId;
            
            $sql = "UPDATE invoices SET " . implode(', ', $updateFields) . " WHERE invoice_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($updateValues);
            
            // Log the action if status changed
            $newStatus = $input['payment_status'] ?? $currentStatus;
            if ($currentStatus !== $newStatus) {
                logAction(
                    $db,
                    $invoiceId,
                    null,
                    0,
                    'N/A',
                    'N/A',
                    $input['notes'] ?? 'Invoice updated',
                    'update_invoice',
                    $currentStatus,
                    $newStatus
                );
            }
            
            logError("Invoice updated with ID: " . $invoiceId);
            
            sendResponse([
                'success' => true,
                'message' => 'Invoice updated successfully'
            ]);
        } else {
            sendResponse([
                'success' => true,
                'message' => 'No changes made'
            ]);
        }
        
    } catch (Exception $e) {
        handleError("Error updating invoice: " . $e->getMessage(), 400);
    }
}

function handleDelete($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['invoice_id'])) {
            handleError('Missing invoice_id', 400);
        }
        
        $invoiceId = (int)$input['invoice_id'];
        
        // Check if invoice exists and can be deleted
        $invoiceStmt = $db->prepare("
            SELECT payment_status, paid_amount, reservation_id 
            FROM invoices 
            WHERE invoice_id = ?
        ");
        $invoiceStmt->execute([$invoiceId]);
        $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            handleError('Invoice not found', 404);
        }
        
        // Don't allow deletion of paid invoices
        if ($invoice['payment_status'] === 'Paid' || (float)($invoice['paid_amount'] ?? 0) > 0) {
            handleError('Cannot delete invoices with recorded payments', 409);
        }
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Delete invoice items
            try {
                $deleteItemsStmt = $db->prepare("DELETE FROM invoice_items WHERE invoice_id = ?");
                $deleteItemsStmt->execute([$invoiceId]);
            } catch (PDOException $e) {
                logError("Could not delete invoice items: " . $e->getMessage());
            }
            
            // Delete payments
            try {
                $deletePaymentsStmt = $db->prepare("DELETE FROM payments WHERE invoice_id = ?");
                $deletePaymentsStmt->execute([$invoiceId]);
            } catch (PDOException $e) {
                logError("Could not delete payments: " . $e->getMessage());
            }
            
            // Log the action before deletion
            logAction(
                $db,
                $invoiceId,
                $invoice['reservation_id'],
                0,
                'N/A',
                'N/A',
                'Invoice deleted',
                'delete_invoice',
                $invoice['payment_status'],
                null
            );
            
            // Delete invoice
            $deleteInvoiceStmt = $db->prepare("DELETE FROM invoices WHERE invoice_id = ?");
            $deleteInvoiceStmt->execute([$invoiceId]);
            
            if ($deleteInvoiceStmt->rowCount() === 0) {
                handleError('Invoice not found or could not be deleted', 404);
            }
            
            $db->commit();
            
            logError("Invoice deleted with ID: " . $invoiceId);
            
            sendResponse([
                'success' => true,
                'message' => 'Invoice deleted successfully'
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        handleError("Error deleting invoice: " . $e->getMessage(), 400);
    }
}

function generateInvoiceNumber($db) {
    $year = date('Y');
    $month = date('m');
    
    try {
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
        
    } catch (PDOException $e) {
        logError("Error generating invoice number: " . $e->getMessage());
        // Fallback to timestamp-based number
        return "INV-" . $year . $month . sprintf("%04d", rand(1, 9999));
    }
}

?>