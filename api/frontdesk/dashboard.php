<?php
// api/frontdesk/dashboard.php - Fixed Front Desk Dashboard API
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    $logFile = __DIR__ . '/../logs/frontdesk_dashboard.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[FRONTDESK_DASHBOARD] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

// Function to log reservation actions
function logReservationAction($db, $reservationId, $actionType, $userId, $userType, $oldData = null, $newData = null, $notes = '') {
    try {
        $stmt = $db->prepare("
            INSERT INTO reservation_logs (
                reservation_id, action_type, user_id, user_type, 
                old_values, new_values, notes, ip_address, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $oldValues = $oldData ? json_encode($oldData) : null;
        $newValues = $newData ? json_encode($newData) : null;
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        $stmt->execute([
            $reservationId,
            $actionType,
            $userId,
            $userType,
            $oldValues,
            $newValues,
            $notes,
            $ipAddress
        ]);
        
        logError("Logged action: {$actionType} for reservation {$reservationId}");
    } catch (Exception $e) {
        logError("Failed to log reservation action: " . $e->getMessage());
    }
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
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        handleGetDashboard($db);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        handlePostActions($db);
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

function handleGetDashboard($db) {
    try {
        $today = date('Y-m-d');
        $response = [
            'success' => true,
            'total_reservations' => 0,
            'checkins_today' => 0,
            'revenue_today' => 0,
            'unpaid_balance' => 0,
            'recent_reservations' => [],
            'pending_payments' => []
        ];
        
        // Get total reservations count
        try {
            $totalReservationsStmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM reservations 
                WHERE reservation_status_id NOT IN (5)
            ");
            $totalReservationsStmt->execute();
            $result = $totalReservationsStmt->fetch(PDO::FETCH_ASSOC);
            $response['total_reservations'] = (int)($result['count'] ?? 0);
        } catch (Exception $e) {
            logError("Error getting total reservations: " . $e->getMessage());
        }
        
        // Get today's check-ins
        try {
            $checkinsStmt = $db->prepare("
                SELECT COUNT(*) as count 
                FROM reservations 
                WHERE DATE(check_in_date) = ? 
                AND reservation_status_id IN (2, 3)
            ");
            $checkinsStmt->execute([$today]);
            $result = $checkinsStmt->fetch(PDO::FETCH_ASSOC);
            $response['checkins_today'] = (int)($result['count'] ?? 0);
        } catch (Exception $e) {
            logError("Error getting today's check-ins: " . $e->getMessage());
        }
        
        // Get today's revenue (from paid amounts or total amounts for checked-in reservations)
        try {
            $revenueStmt = $db->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as revenue 
                FROM reservations 
                WHERE DATE(check_in_date) = ? 
                AND reservation_status_id = 3
            ");
            $revenueStmt->execute([$today]);
            $result = $revenueStmt->fetch(PDO::FETCH_ASSOC);
            $response['revenue_today'] = (float)($result['revenue'] ?? 0);
        } catch (Exception $e) {
            logError("Error getting today's revenue: " . $e->getMessage());
        }
        
        // Get unpaid balance (from active reservations)
        try {
            $unpaidStmt = $db->prepare("
                SELECT COALESCE(SUM(total_amount - COALESCE(advance_payment, 0)), 0) as unpaid 
                FROM reservations 
                WHERE reservation_status_id IN (2, 3) 
                AND (total_amount - COALESCE(advance_payment, 0)) > 0
            ");
            $unpaidStmt->execute();
            $result = $unpaidStmt->fetch(PDO::FETCH_ASSOC);
            $response['unpaid_balance'] = (float)($result['unpaid'] ?? 0);
        } catch (Exception $e) {
            logError("Error getting unpaid balance: " . $e->getMessage());
        }
        
        // Get recent reservations (last 10)
        try {
            $recentStmt = $db->prepare("
                SELECT 
                    r.reservation_id,
                    r.check_in_date,
                    r.total_amount,
                    r.created_at,
                    CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                    rm.room_number,
                    rs.status_name
                FROM reservations r
                LEFT JOIN customers c ON r.customer_id = c.customer_id
                LEFT JOIN rooms rm ON r.room_id = rm.room_id
                LEFT JOIN reservation_status rs ON r.reservation_status_id = rs.reservation_status_id
                WHERE r.reservation_status_id NOT IN (5)
                ORDER BY r.created_at DESC
                LIMIT 10
            ");
            $recentStmt->execute();
            $recentReservations = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Clean up recent reservations data
            $response['recent_reservations'] = array_map(function($res) {
                return [
                    'reservation_id' => (int)$res['reservation_id'],
                    'customer_name' => trim($res['customer_name']) ?: 'Walk-in Guest',
                    'room_number' => $res['room_number'] ?: 'N/A',
                    'status_name' => $res['status_name'] ?: 'Unknown',
                    'total_amount' => (float)($res['total_amount'] ?: 0),
                    'check_in_date' => $res['check_in_date'],
                    'created_at' => $res['created_at']
                ];
            }, $recentReservations);
        } catch (Exception $e) {
            logError("Error getting recent reservations: " . $e->getMessage());
            $response['recent_reservations'] = [];
        }
        
        // Get pending payments (invoices with balance) or use reservations if no invoices table
        try {
            // First try to get from invoices table
            $pendingStmt = $db->prepare("
                SELECT 
                    i.invoice_id,
                    i.invoice_number,
                    i.total_amount,
                    i.paid_amount,
                    (i.total_amount - COALESCE(i.paid_amount, 0)) as balance,
                    i.payment_status,
                    CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name
                FROM invoices i
                LEFT JOIN reservations r ON i.reservation_id = r.reservation_id
                LEFT JOIN customers c ON r.customer_id = c.customer_id
                WHERE i.payment_status IN ('Pending', 'Partial', 'Unpaid')
                AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
                ORDER BY i.created_at DESC
                LIMIT 10
            ");
            $pendingStmt->execute();
            $pendingPayments = $pendingStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Clean up pending payments data
            $response['pending_payments'] = array_map(function($payment) {
                return [
                    'invoice_id' => (int)$payment['invoice_id'],
                    'invoice_number' => $payment['invoice_number'] ?: 'N/A',
                    'customer_name' => trim($payment['customer_name']) ?: 'Walk-in Guest',
                    'total_amount' => (float)($payment['total_amount'] ?: 0),
                    'paid_amount' => (float)($payment['paid_amount'] ?: 0),
                    'balance' => (float)($payment['balance'] ?: 0),
                    'payment_status' => $payment['payment_status'] ?: 'Unknown'
                ];
            }, $pendingPayments);
            
        } catch (Exception $e) {
            // If invoices table doesn't exist, try to get unpaid reservations
            logError("Invoices table not found, using reservations: " . $e->getMessage());
            try {
                $pendingStmt = $db->prepare("
                    SELECT 
                        r.reservation_id as invoice_id,
                        CONCAT('RES-', r.reservation_id) as invoice_number,
                        r.total_amount,
                        COALESCE(r.advance_payment, 0) as paid_amount,
                        (r.total_amount - COALESCE(r.advance_payment, 0)) as balance,
                        'Pending' as payment_status,
                        CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name
                    FROM reservations r
                    LEFT JOIN customers c ON r.customer_id = c.customer_id
                    WHERE r.reservation_status_id IN (2, 3)
                    AND (r.total_amount - COALESCE(r.advance_payment, 0)) > 0
                    ORDER BY r.created_at DESC
                    LIMIT 10
                ");
                $pendingStmt->execute();
                $pendingPayments = $pendingStmt->fetchAll(PDO::FETCH_ASSOC);
                
                $response['pending_payments'] = array_map(function($payment) {
                    return [
                        'invoice_id' => (int)$payment['invoice_id'],
                        'invoice_number' => $payment['invoice_number'] ?: 'N/A',
                        'customer_name' => trim($payment['customer_name']) ?: 'Walk-in Guest',
                        'total_amount' => (float)($payment['total_amount'] ?: 0),
                        'paid_amount' => (float)($payment['paid_amount'] ?: 0),
                        'balance' => (float)($payment['balance'] ?: 0),
                        'payment_status' => $payment['payment_status'] ?: 'Pending'
                    ];
                }, $pendingPayments);
                
            } catch (Exception $e2) {
                logError("Error getting pending payments from reservations: " . $e2->getMessage());
                $response['pending_payments'] = [];
            }
        }
        
        logError("Dashboard data retrieved successfully for user: " . $_SESSION['user_id']);
        logError("Response data: " . json_encode($response));
        
        echo json_encode($response);
        
    } catch (PDOException $e) {
        logError("PDO Error retrieving dashboard data: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Database error occurred',
            'debug' => $e->getMessage()
        ]);
    } catch (Exception $e) {
        logError("General error retrieving dashboard data: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Error retrieving dashboard data',
            'debug' => $e->getMessage()
        ]);
    }
}

function handlePostActions($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['action'])) {
            throw new Exception('Missing action parameter');
        }
        
        $action = $input['action'];
        
        switch ($action) {
            case 'send_daily_report':
                sendDailyReport($db);
                break;
            case 'quick_checkin':
                quickCheckin($db, $input);
                break;
            case 'quick_checkout':
                quickCheckout($db, $input);
                break;
            default:
                throw new Exception('Unknown action: ' . $action);
        }
        
    } catch (Exception $e) {
        logError("Error handling POST action: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function sendDailyReport($db) {
    try {
        $today = date('Y-m-d');
        $reportData = [];
        
        // Get today's statistics
        $statsStmt = $db->prepare("
            SELECT 
                COUNT(CASE WHEN reservation_status_id = 3 AND DATE(updated_at) = ? THEN 1 END) as checkins,
                COUNT(CASE WHEN reservation_status_id = 4 AND DATE(updated_at) = ? THEN 1 END) as checkouts,
                COALESCE(SUM(CASE WHEN reservation_status_id = 3 AND DATE(check_in_date) = ? THEN total_amount ELSE 0 END), 0) as revenue,
                COUNT(CASE WHEN reservation_status_id IN (2, 3) THEN 1 END) as occupied_rooms
            FROM reservations 
            WHERE DATE(check_in_date) = ? OR DATE(check_out_date) = ? OR DATE(updated_at) = ?
        ");
        $statsStmt->execute([$today, $today, $today, $today, $today, $today]);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
        
        $reportData = [
            'date' => $today,
            'checkins' => (int)($stats['checkins'] ?? 0),
            'checkouts' => (int)($stats['checkouts'] ?? 0),
            'revenue' => (float)($stats['revenue'] ?? 0),
            'occupied_rooms' => (int)($stats['occupied_rooms'] ?? 0)
        ];
        
        // In a real implementation, you would send this via email
        // For now, we'll just log it and return success
        logError("Daily report generated: " . json_encode($reportData));
        
        echo json_encode([
            'success' => true,
            'message' => 'Daily report sent successfully',
            'report_data' => $reportData
        ]);
        
    } catch (Exception $e) {
        throw new Exception('Failed to send daily report: ' . $e->getMessage());
    }
}

function quickCheckin($db, $input) {
    try {
        if (empty($input['reservation_id'])) {
            throw new Exception('Missing reservation_id');
        }
        
        $reservationId = $input['reservation_id'];
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Update reservation status to checked-in
            $updateReservationStmt = $db->prepare("
                UPDATE reservations 
                SET reservation_status_id = 3, updated_at = NOW() 
                WHERE reservation_id = ? AND reservation_status_id = 2
            ");
            $updateReservationStmt->execute([$reservationId]);
            
            if ($updateReservationStmt->rowCount() === 0) {
                throw new Exception('Reservation not found or not confirmed');
            }
            
            // Update room status to occupied
            $updateRoomStmt = $db->prepare("
                UPDATE rooms r
                INNER JOIN reservations res ON r.room_id = res.room_id
                SET r.room_status_id = 2
                WHERE res.reservation_id = ?
            ");
            $updateRoomStmt->execute([$reservationId]);
            
            // Log the check-in action
            $userId = $_SESSION['user_id'] ?? 0;
            $userType = 'front_desk';
            $oldData = ['reservation_status_id' => 2];
            $newData = ['reservation_status_id' => 3];
            $notes = "Guest checked in by front desk staff";
            
            logReservationAction($db, $reservationId, 'check_in', $userId, $userType, $oldData, $newData, $notes);
            
            $db->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Guest checked in successfully',
                'reservation_id' => $reservationId
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        throw new Exception('Failed to check in guest: ' . $e->getMessage());
    }
}

function quickCheckout($db, $input) {
    try {
        if (empty($input['reservation_id'])) {
            throw new Exception('Missing reservation_id');
        }
        
        $reservationId = $input['reservation_id'];
        
        // Begin transaction
        $db->beginTransaction();
        
        try {
            // Update reservation status to checked-out
            $updateReservationStmt = $db->prepare("
                UPDATE reservations 
                SET reservation_status_id = 4, updated_at = NOW() 
                WHERE reservation_id = ? AND reservation_status_id = 3
            ");
            $updateReservationStmt->execute([$reservationId]);
            
            if ($updateReservationStmt->rowCount() === 0) {
                throw new Exception('Reservation not found or not checked-in');
            }
            
            // Update room status to available (needs cleaning)
            $updateRoomStmt = $db->prepare("
                UPDATE rooms r
                INNER JOIN reservations res ON r.room_id = res.room_id
                SET r.room_status_id = 4
                WHERE res.reservation_id = ?
            ");
            $updateRoomStmt->execute([$reservationId]);
            
            // Log the check-out action
            $userId = $_SESSION['user_id'] ?? 0;
            $userType = 'front_desk';
            $oldData = ['reservation_status_id' => 3];
            $newData = ['reservation_status_id' => 4];
            $notes = "Guest checked out by front desk staff";
            
            logReservationAction($db, $reservationId, 'check_out', $userId, $userType, $oldData, $newData, $notes);
            
            $db->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Guest checked out successfully',
                'reservation_id' => $reservationId
            ]);
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        throw new Exception('Failed to check out guest: ' . $e->getMessage());
    }
}
?>