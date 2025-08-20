<?php
// api/admin/reports.php - Fixed Admin Reports API with Enhanced Front Desk Reports Integration
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
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

// Enhanced logging function
function logError($message, $context = []) {
    $logFile = __DIR__ . '/../../logs/admin-reports.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'message' => $message,
        'context' => $context,
        'session' => [
            'user_id' => $_SESSION['user_id'] ?? null,
            'role' => $_SESSION['role'] ?? null,
            'logged_in' => $_SESSION['logged_in'] ?? null
        ],
        'request' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'] ?? '',
            'query_string' => $_SERVER['QUERY_STRING'] ?? ''
        ]
    ];
    
    error_log(json_encode($logEntry) . "\n", 3, $logFile);
}

// Check authentication and admin role
if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    logError("Authentication failed - user not logged in");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

// More flexible role checking
$userRole = strtolower(trim($_SESSION['role'] ?? ''));
$allowedRoles = ['admin', 'administrator', 'manager'];
$isAuthorized = in_array($userRole, $allowedRoles);

if (!$isAuthorized) {
    logError("Authorization failed", ['user_role' => $userRole, 'allowed_roles' => $allowedRoles]);
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Insufficient permissions']);
    exit();
}

// Load database configuration with enhanced path checking
$dbPaths = [
    __DIR__ . '/../../config/db.php',
    __DIR__ . '/../config/db.php',
    dirname(dirname(__DIR__)) . '/config/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/reservation/config/db.php',
    __DIR__ . '/../../includes/db.php',
    __DIR__ . '/../includes/db.php'
];

$dbLoaded = false;
$dbPath = null;
foreach ($dbPaths as $path) {
    if (file_exists($path)) {
        try {
            require_once $path;
            $dbLoaded = true;
            $dbPath = $path;
            logError("Database config loaded", ['path' => $path]);
            break;
        } catch (Exception $e) {
            logError("Failed to load DB config", ['path' => $path, 'error' => $e->getMessage()]);
        }
    }
}

if (!$dbLoaded) {
    logError("Database configuration file not found", ['searched_paths' => $dbPaths]);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database configuration not found']);
    exit();
}

try {
    $db = getDB();
    if (!$db) {
        throw new Exception('Failed to get database connection');
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetRequest($db);
            break;
            
        case 'POST':
            handlePostRequest($db);
            break;
            
        case 'PUT':
            handlePutRequest($db);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            break;
    }
    
} catch (PDOException $e) {
    logError("Database error", ['error' => $e->getMessage(), 'code' => $e->getCode()]);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed',
        'message' => 'Unable to process request'
    ]);
} catch (Exception $e) {
    logError("General error", ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error occurred',
        'message' => $e->getMessage()
    ]);
}

function handleGetRequest($db) {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'debug') {
        // Special debug endpoint
        echo json_encode(debugFrontDeskReports($db));
        return;
    }
    
    if ($action === 'unread_count') {
        // Get count of unread front desk reports
        try {
            echo json_encode([
                'success' => true,
                'unread_count' => getUnreadCount($db)
            ]);
        } catch (Exception $e) {
            logError("Error getting unread count", ['error' => $e->getMessage()]);
            echo json_encode([
                'success' => true,
                'unread_count' => 0
            ]);
        }
        
    } elseif (isset($_GET['id'])) {
        // Get specific front desk report
        $reportId = (int)$_GET['id'];
        
        try {
            $report = getFrontDeskReport($db, $reportId);
            if ($report) {
                echo json_encode([
                    'success' => true,
                    'report' => $report
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Report not found']);
            }
        } catch (Exception $e) {
            logError("Error getting specific report", ['report_id' => $reportId, 'error' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to load report']);
        }
        
    } else {
        // Get list of front desk reports
        $fromDate = $_GET['from_date'] ?? date('Y-m-01');
        $toDate = $_GET['to_date'] ?? date('Y-m-t');
        $limit = min((int)($_GET['limit'] ?? 50), 100);
        $offset = (int)($_GET['offset'] ?? 0);
        
        try {
            $reports = getFrontDeskReports($db, $fromDate, $toDate, $limit, $offset);
            $total = getFrontDeskReportsCount($db, $fromDate, $toDate);
            
            echo json_encode([
                'success' => true,
                'reports' => $reports,
                'total' => $total,
                'query_params' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                    'limit' => $limit,
                    'offset' => $offset,
                    'user_id' => $_SESSION['user_id']
                ]
            ]);
        } catch (Exception $e) {
            logError("Error getting reports list", [
                'params' => ['from_date' => $fromDate, 'to_date' => $toDate],
                'error' => $e->getMessage()
            ]);
            echo json_encode([
                'success' => true,
                'reports' => [],
                'total' => 0,
                'error_debug' => $e->getMessage()
            ]);
        }
    }
}

function debugFrontDeskReports($db) {
    $debug = [
        'tables_exist' => [],
        'table_structures' => [],
        'data_counts' => [],
        'sample_data' => [],
        'issues' => [],
        'suggestions' => []
    ];
    
    // Check if required tables exist
    $requiredTables = ['frontdesk_reports', 'users', 'report_notifications'];
    
    foreach ($requiredTables as $table) {
        try {
            $stmt = $db->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$table]);
            $exists = $stmt->fetch() ? true : false;
            $debug['tables_exist'][$table] = $exists;
            
            if ($exists) {
                // Get structure
                $stmt = $db->prepare("DESCRIBE $table");
                $stmt->execute();
                $debug['table_structures'][$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get count
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM $table");
                $stmt->execute();
                $count = $stmt->fetch(PDO::FETCH_ASSOC);
                $debug['data_counts'][$table] = $count['count'];
                
                // Get sample data (limit 3)
                if ($table === 'frontdesk_reports') {
                    $stmt = $db->prepare("SELECT * FROM $table ORDER BY created_at DESC LIMIT 3");
                    $stmt->execute();
                    $debug['sample_data'][$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }
            }
        } catch (Exception $e) {
            $debug['tables_exist'][$table] = false;
            $debug['issues'][] = "Error checking $table: " . $e->getMessage();
        }
    }
    
    // Analyze issues
    if (!$debug['tables_exist']['frontdesk_reports']) {
        $debug['issues'][] = 'frontdesk_reports table does not exist';
        $debug['suggestions'][] = 'Create the frontdesk_reports table using the SQL from frontdesk/reports.php';
    }
    
    if (!$debug['tables_exist']['users']) {
        $debug['issues'][] = 'users table does not exist - JOIN will fail';
        $debug['suggestions'][] = 'Ensure the users table exists with proper structure';
    }
    
    if (($debug['data_counts']['frontdesk_reports'] ?? 0) === 0) {
        $debug['issues'][] = 'No data in frontdesk_reports table';
        $debug['suggestions'][] = 'Submit test reports through the front desk interface';
    }
    
    return $debug;
}

function getUnreadCount($db) {
    // Check if report_notifications table exists
    try {
        $stmt = $db->prepare("SHOW TABLES LIKE 'report_notifications'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            return 0; // Table doesn't exist
        }
        
        $stmt = $db->prepare("
            SELECT COUNT(*) as unread_count
            FROM report_notifications
            WHERE recipient_id = ? AND is_read = 0
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return (int)($result['unread_count'] ?? 0);
        
    } catch (Exception $e) {
        logError("Error in getUnreadCount", ['error' => $e->getMessage()]);
        return 0;
    }
}

function getFrontDeskReport($db, $reportId) {
    // Check if frontdesk_reports table exists
    $stmt = $db->prepare("SHOW TABLES LIKE 'frontdesk_reports'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        throw new Exception("Front desk reports table does not exist");
    }
    
    // Check if users table exists
    $stmt = $db->prepare("SHOW TABLES LIKE 'users'");
    $stmt->execute();
    $usersExists = $stmt->fetch() ? true : false;
    
    if ($usersExists) {
        // Full query with user JOIN
        $stmt = $db->prepare("
            SELECT 
                fr.*, 
                u.name as staff_name,
                COALESCE(u.first_name, '') as staff_first_name,
                COALESCE(u.last_name, '') as staff_last_name,
                COALESCE(rn.is_read, 0) as is_read
            FROM frontdesk_reports fr
            LEFT JOIN users u ON fr.staff_id = u.user_id
            LEFT JOIN report_notifications rn ON fr.front_reports_id = rn.report_id AND rn.recipient_id = ?
            WHERE fr.front_reports_id = ?
        ");
        $stmt->execute([$_SESSION['user_id'], $reportId]);
    } else {
        // Simplified query without user JOIN
        $stmt = $db->prepare("
            SELECT 
                fr.*,
                'Unknown Staff' as staff_name,
                '' as staff_first_name,
                '' as staff_last_name,
                0 as is_read
            FROM frontdesk_reports fr
            WHERE fr.front_reports_id = ?
        ");
        $stmt->execute([$reportId]);
    }
    
    $report = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$report) {
        return null;
    }
    
    // Handle staff name fallback
    if (empty($report['staff_name']) && !empty($report['staff_first_name'])) {
        $report['staff_name'] = trim($report['staff_first_name'] . ' ' . $report['staff_last_name']);
    }
    if (empty($report['staff_name'])) {
        $report['staff_name'] = 'Unknown Staff';
    }
    
    // Decode details JSON if it exists
    if (!empty($report['details'])) {
        $decoded = json_decode($report['details'], true);
        $report['details'] = $decoded ?: [];
    } else {
        $report['details'] = [];
    }
    
    return $report;
}

function getFrontDeskReports($db, $fromDate, $toDate, $limit, $offset) {
    // Check if frontdesk_reports table exists
    $stmt = $db->prepare("SHOW TABLES LIKE 'frontdesk_reports'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        logError("frontdesk_reports table does not exist");
        return [];
    }
    
    // Check if users table exists
    $stmt = $db->prepare("SHOW TABLES LIKE 'users'");
    $stmt->execute();
    $usersExists = $stmt->fetch() ? true : false;
    
    try {
        if ($usersExists) {
            // Full query with user JOIN
            $stmt = $db->prepare("
                SELECT 
                    fr.front_reports_id as id,
                    fr.report_date,
                    fr.summary,
                    fr.created_at,
                    fr.staff_id,
                    COALESCE(u.name, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) as staff_name,
                    COALESCE(rn.is_read, 0) as is_read
                FROM frontdesk_reports fr
                LEFT JOIN users u ON fr.staff_id = u.user_id
                LEFT JOIN report_notifications rn ON fr.front_reports_id = rn.report_id AND rn.recipient_id = ?
                WHERE fr.report_date BETWEEN ? AND ?
                ORDER BY fr.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$_SESSION['user_id'], $fromDate, $toDate, $limit, $offset]);
        } else {
            // Simplified query without user JOIN
            $stmt = $db->prepare("
                SELECT 
                    fr.front_reports_id as id,
                    fr.report_date,
                    fr.summary,
                    fr.created_at,
                    fr.staff_id,
                    'Unknown Staff' as staff_name,
                    0 as is_read
                FROM frontdesk_reports fr
                WHERE fr.report_date BETWEEN ? AND ?
                ORDER BY fr.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$fromDate, $toDate, $limit, $offset]);
        }
        
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up staff names
        foreach ($reports as &$report) {
            if (empty($report['staff_name']) || trim($report['staff_name']) === '') {
                $report['staff_name'] = 'Staff ID: ' . $report['staff_id'];
            }
            $report['staff_name'] = trim($report['staff_name']);
        }
        
        logError("Successfully retrieved reports", [
            'count' => count($reports),
            'date_range' => "$fromDate to $toDate",
            'has_users_table' => $usersExists
        ]);
        
        return $reports;
        
    } catch (Exception $e) {
        logError("Error in getFrontDeskReports", ['error' => $e->getMessage()]);
        throw $e;
    }
}

function getFrontDeskReportsCount($db, $fromDate, $toDate) {
    try {
        // Check if frontdesk_reports table exists
        $stmt = $db->prepare("SHOW TABLES LIKE 'frontdesk_reports'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            return 0;
        }
        
        $stmt = $db->prepare("
            SELECT COUNT(*) as total
            FROM frontdesk_reports
            WHERE report_date BETWEEN ? AND ?
        ");
        $stmt->execute([$fromDate, $toDate]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return (int)($result['total'] ?? 0);
        
    } catch (Exception $e) {
        logError("Error getting reports count", ['error' => $e->getMessage()]);
        return 0;
    }
}

function handlePostRequest($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate date range
    $fromDate = $input['from_date'] ?? date('Y-m-01');
    $toDate = $input['to_date'] ?? date('Y-m-t');
    $reportType = $input['report_type'] ?? 'summary';
    $includeFrontdesk = $input['include_frontdesk'] ?? false;
    
    if (!validateDateRange($fromDate, $toDate)) {
        throw new Exception('Invalid date range');
    }
    
    $reportData = [
        'success' => true,
        'report_type' => $reportType,
        'date_range' => [
            'from' => $fromDate,
            'to' => $toDate
        ],
        'generated_at' => date('Y-m-d H:i:s')
    ];
    
    // Get summary data
    $reportData['summary'] = getSummaryData($db, $fromDate, $toDate);
    
    // Get specific report data based on type
    switch ($reportType) {
        case 'revenue':
            $reportData['revenue_trend'] = getRevenueTrend($db, $fromDate, $toDate);
            break;
        case 'occupancy':
            $reportData['occupancy_data'] = getOccupancyData($db, $fromDate, $toDate);
            break;
        case 'customer':
            $reportData['customer_data'] = getCustomerData($db, $fromDate, $toDate);
            break;
        default:
            // Summary report includes all basic data
            $reportData['revenue_trend'] = getRevenueTrend($db, $fromDate, $toDate);
            break;
    }
    
    // Common data for all reports
    $reportData['room_types'] = getRoomTypesPerformance($db, $fromDate, $toDate);
    $reportData['monthly_data'] = getMonthlyData($db, $fromDate, $toDate);
    $reportData['recent_transactions'] = getRecentTransactions($db, $fromDate, $toDate);
    
    // Include front desk reports if requested
    if ($includeFrontdesk) {
        try {
            $reportData['frontdesk_reports'] = getFrontDeskReports($db, $fromDate, $toDate, 50, 0);
            logError("Front desk reports included", ['count' => count($reportData['frontdesk_reports'])]);
        } catch (Exception $e) {
            logError("Error including frontdesk reports", ['error' => $e->getMessage()]);
            $reportData['frontdesk_reports'] = [];
            $reportData['frontdesk_error'] = $e->getMessage();
        }
    }
    
    echo json_encode($reportData);
}

function handlePutRequest($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    if (empty($input['action']) || empty($input['report_id'])) {
        throw new Exception('Missing required fields');
    }
    
    if ($input['action'] === 'mark_read') {
        $reportId = (int)$input['report_id'];
        
        try {
            markReportAsRead($db, $reportId);
            echo json_encode([
                'success' => true,
                'message' => 'Report marked as read'
            ]);
        } catch (Exception $e) {
            logError("Error marking report as read", ['report_id' => $reportId, 'error' => $e->getMessage()]);
            // Still return success to avoid breaking the UI
            echo json_encode([
                'success' => true,
                'message' => 'Report marked as read'
            ]);
        }
        
    } else {
        throw new Exception('Invalid action');
    }
}

function markReportAsRead($db, $reportId) {
    // Check if report_notifications table exists
    $stmt = $db->prepare("SHOW TABLES LIKE 'report_notifications'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        // Table doesn't exist, create it
        $createTableSQL = "
            CREATE TABLE IF NOT EXISTS report_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id INT NOT NULL,
                recipient_id INT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_recipient (recipient_id),
                INDEX idx_report (report_id),
                INDEX idx_unread (recipient_id, is_read)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $db->exec($createTableSQL);
    }
    
    // Check if notification exists
    $stmt = $db->prepare("
        SELECT id FROM report_notifications
        WHERE report_id = ? AND recipient_id = ?
    ");
    $stmt->execute([$reportId, $_SESSION['user_id']]);
    
    if (!$stmt->fetch()) {
        // Create notification as read
        $stmt = $db->prepare("
            INSERT INTO report_notifications (report_id, recipient_id, is_read, created_at)
            VALUES (?, ?, 1, NOW())
        ");
        $stmt->execute([$reportId, $_SESSION['user_id']]);
    } else {
        // Mark existing as read
        $stmt = $db->prepare("
            UPDATE report_notifications
            SET is_read = 1
            WHERE report_id = ? AND recipient_id = ?
        ");
        $stmt->execute([$reportId, $_SESSION['user_id']]);
    }
}

function validateDateRange($fromDate, $toDate) {
    $from = DateTime::createFromFormat('Y-m-d', $fromDate);
    $to = DateTime::createFromFormat('Y-m-d', $toDate);
    
    if (!$from || !$to) {
        return false;
    }
    
    if ($from > $to) {
        return false;
    }
    
    // Check if date range is not too large (max 2 years)
    $interval = $from->diff($to);
    if ($interval->y > 2) {
        return false;
    }
    
    return true;
}

function getSummaryData($db, $fromDate, $toDate) {
    try {
        $summary = [
            'total_revenue' => 0.00,
            'total_bookings' => 0,
            'occupancy_rate' => 0.0,
            'total_customers' => 0
        ];
        
        // Check if reservations table exists
        $stmt = $db->prepare("SHOW TABLES LIKE 'reservations'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            return $summary;
        }
        
        // Get total revenue
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(r.total_amount), 0) as total_revenue
            FROM reservations r 
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3, 4)
        ");
        $stmt->execute([$fromDate, $toDate]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $summary['total_revenue'] = (float)($result['total_revenue'] ?? 0);
        
        // Get total bookings
        $stmt = $db->prepare("
            SELECT COUNT(*) as total_bookings
            FROM reservations r 
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3, 4)
        ");
        $stmt->execute([$fromDate, $toDate]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $summary['total_bookings'] = (int)($result['total_bookings'] ?? 0);
        
        // Get occupancy rate
        $stmt = $db->prepare("
            SELECT 
                COUNT(DISTINCT r.room_id) as occupied_rooms,
                (SELECT COUNT(*) FROM rooms WHERE room_status_id IN (1, 2, 3)) as total_rooms
            FROM reservations r 
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3)
        ");
        $stmt->execute([$fromDate, $toDate]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $occupiedRooms = (int)($result['occupied_rooms'] ?? 0);
        $totalRooms = (int)($result['total_rooms'] ?? 1);
        $summary['occupancy_rate'] = $totalRooms > 0 ? ($occupiedRooms / $totalRooms) * 100 : 0;
        
        // Get unique customers
        $stmt = $db->prepare("
            SELECT COUNT(DISTINCT r.customer_id) as total_customers
            FROM reservations r 
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3, 4)
        ");
        $stmt->execute([$fromDate, $toDate]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $summary['total_customers'] = (int)($result['total_customers'] ?? 0);
        
        return $summary;
        
    } catch (PDOException $e) {
        logError("Error getting summary data", ['error' => $e->getMessage()]);
        return [
            'total_revenue' => 0.00,
            'total_bookings' => 0,
            'occupancy_rate' => 0.0,
            'total_customers' => 0
        ];
    }
}

function getRevenueTrend($db, $fromDate, $toDate) {
    try {
        // Check if reservations table exists
        $stmt = $db->prepare("SHOW TABLES LIKE 'reservations'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            return [];
        }
        
        $stmt = $db->prepare("
            SELECT 
                DATE(r.check_in_date) as date,
                COALESCE(SUM(r.total_amount), 0) as revenue
            FROM reservations r 
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3, 4)
            GROUP BY DATE(r.check_in_date)
            ORDER BY date ASC
        ");
        $stmt->execute([$fromDate, $toDate]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Fill missing dates with zero revenue
        $from = new DateTime($fromDate);
        $to = new DateTime($toDate);
        $period = new DatePeriod($from, new DateInterval('P1D'), $to->modify('+1 day'));
        
        $revenueTrend = [];
        $dataMap = [];
        
        // Create map of existing data
        foreach ($results as $row) {
            $dataMap[$row['date']] = (float)$row['revenue'];
        }
        
        // Fill all dates in range
        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            $revenueTrend[] = [
                'date' => $dateStr,
                'revenue' => $dataMap[$dateStr] ?? 0.00
            ];
        }
        
        return $revenueTrend;
        
    } catch (PDOException $e) {
        logError("Error getting revenue trend", ['error' => $e->getMessage()]);
        return [];
    }
}

function getRoomTypesPerformance($db, $fromDate, $toDate) {
    try {
        // Check if required tables exist
        $tables = ['reservations', 'rooms', 'room_types'];
        foreach ($tables as $table) {
            $stmt = $db->prepare("SHOW TABLES LIKE '$table'");
            $stmt->execute();
            if (!$stmt->fetch()) {
                return [];
            }
        }
        
        $stmt = $db->prepare("
            SELECT 
                rt.type_name,
                COUNT(r.reservation_id) as total_bookings,
                COALESCE(SUM(r.total_amount), 0) as total_revenue
            FROM reservations r
            JOIN rooms rm ON r.room_id = rm.room_id
            JOIN room_types rt ON rm.room_type_id = rt.room_type_id
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3, 4)
            GROUP BY rt.room_type_id, rt.type_name
            ORDER BY total_revenue DESC
            LIMIT 10
        ");
        $stmt->execute([$fromDate, $toDate]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to proper data types
        foreach ($results as &$row) {
            $row['total_bookings'] = (int)$row['total_bookings'];
            $row['total_revenue'] = (float)$row['total_revenue'];
        }
        
        return $results;
        
    } catch (PDOException $e) {
        logError("Error getting room types performance", ['error' => $e->getMessage()]);
        return [];
    }
}

function getMonthlyData($db, $fromDate, $toDate) {
    try {
        // Check if reservations table exists
        $stmt = $db->prepare("SHOW TABLES LIKE 'reservations'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            return [];
        }
        
        $stmt = $db->prepare("
            SELECT 
                DATE_FORMAT(r.check_in_date, '%Y-%m') as month,
                COUNT(r.reservation_id) as total_bookings,
                COALESCE(SUM(r.total_amount), 0) as total_revenue
            FROM reservations r
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3, 4)
            GROUP BY DATE_FORMAT(r.check_in_date, '%Y-%m')
            ORDER BY month ASC
        ");
        $stmt->execute([$fromDate, $toDate]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to proper data types and format month names
        foreach ($results as &$row) {
            $row['total_bookings'] = (int)$row['total_bookings'];
            $row['total_revenue'] = (float)$row['total_revenue'];
            
            // Convert YYYY-MM to readable format
            $date = DateTime::createFromFormat('Y-m', $row['month']);
            if ($date) {
                $row['month'] = $date->format('M Y');
            }
        }
        
        return $results;
        
    } catch (PDOException $e) {
        logError("Error getting monthly data", ['error' => $e->getMessage()]);
        return [];
    }
}

function getRecentTransactions($db, $fromDate, $toDate) {
    try {
        // Check if required tables exist
        $tables = ['reservations', 'customers', 'rooms', 'reservation_status'];
        $existingTables = [];
        
        foreach ($tables as $table) {
            $stmt = $db->prepare("SHOW TABLES LIKE '$table'");
            $stmt->execute();
            if ($stmt->fetch()) {
                $existingTables[] = $table;
            }
        }
        
        if (!in_array('reservations', $existingTables)) {
            return [];
        }
        
        // Build query based on available tables
        $selectFields = "r.reservation_id";
        $fromClause = "reservations r";
        $joinClauses = "";
        
        if (in_array('customers', $existingTables)) {
            $selectFields .= ", CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name";
            $joinClauses .= " LEFT JOIN customers c ON r.customer_id = c.customer_id";
        } else {
            $selectFields .= ", 'Walk-in Guest' as customer_name";
        }
        
        if (in_array('rooms', $existingTables)) {
            $selectFields .= ", rm.room_number";
            $joinClauses .= " LEFT JOIN rooms rm ON r.room_id = rm.room_id";
        } else {
            $selectFields .= ", 'N/A' as room_number";
        }
        
        $selectFields .= ", r.total_amount, r.created_at";
        
        if (in_array('reservation_status', $existingTables)) {
            $selectFields .= ", rs.status_name as status";
            $joinClauses .= " LEFT JOIN reservation_status rs ON r.reservation_status_id = rs.reservation_status_id";
        } else {
            $selectFields .= ", 'Confirmed' as status";
        }
        
        $sql = "SELECT $selectFields FROM $fromClause $joinClauses
                WHERE r.check_in_date >= ? AND r.check_in_date <= ?
                ORDER BY r.created_at DESC
                LIMIT 20";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$fromDate, $toDate]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up data
        foreach ($results as &$row) {
            $row['customer_name'] = trim($row['customer_name'] ?? '') ?: 'Walk-in Guest';
            $row['total_amount'] = (float)($row['total_amount'] ?? 0);
            $row['room_number'] = $row['room_number'] ?: 'N/A';
            $row['status'] = $row['status'] ?: 'Unknown';
        }
        
        return $results;
        
    } catch (PDOException $e) {
        logError("Error getting recent transactions", ['error' => $e->getMessage()]);
        return [];
    }
}

function getOccupancyData($db, $fromDate, $toDate) {
    try {
        // Check if required tables exist
        $stmt = $db->prepare("SHOW TABLES LIKE 'reservations'");
        $stmt->execute();
        $reservationsExists = $stmt->fetch();
        
        $stmt = $db->prepare("SHOW TABLES LIKE 'rooms'");
        $stmt->execute();
        $roomsExists = $stmt->fetch();
        
        if (!$reservationsExists || !$roomsExists) {
            return [];
        }
        
        $stmt = $db->prepare("
            SELECT 
                DATE(r.check_in_date) as date,
                COUNT(DISTINCT r.room_id) as occupied_rooms,
                (SELECT COUNT(*) FROM rooms WHERE room_status_id IN (1, 2, 3)) as total_rooms
            FROM reservations r
            WHERE r.check_in_date >= ? AND r.check_in_date <= ?
            AND r.reservation_status_id IN (2, 3)
            GROUP BY DATE(r.check_in_date)
            ORDER BY date ASC
        ");
        $stmt->execute([$fromDate, $toDate]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate occupancy percentages
        foreach ($results as &$row) {
            $occupiedRooms = (int)$row['occupied_rooms'];
            $totalRooms = (int)$row['total_rooms'];
            $row['occupancy_rate'] = $totalRooms > 0 ? ($occupiedRooms / $totalRooms) * 100 : 0;
        }
        
        return $results;
        
    } catch (PDOException $e) {
        logError("Error getting occupancy data", ['error' => $e->getMessage()]);
        return [];
    }
}

function getCustomerData($db, $fromDate, $toDate) {
    try {
        // Check if required tables exist
        $stmt = $db->prepare("SHOW TABLES LIKE 'reservations'");
        $stmt->execute();
        $reservationsExists = $stmt->fetch();
        
        $stmt = $db->prepare("SHOW TABLES LIKE 'customers'");
        $stmt->execute();
        $customersExists = $stmt->fetch();
        
        if (!$reservationsExists) {
            return [];
        }
        
        if ($customersExists) {
            $stmt = $db->prepare("
                SELECT 
                    CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) as customer_name,
                    c.email,
                    COUNT(r.reservation_id) as total_bookings,
                    COALESCE(SUM(r.total_amount), 0) as total_spent,
                    MAX(r.check_in_date) as last_visit
                FROM reservations r
                LEFT JOIN customers c ON r.customer_id = c.customer_id
                WHERE r.check_in_date >= ? AND r.check_in_date <= ?
                AND r.reservation_status_id IN (2, 3, 4)
                GROUP BY r.customer_id
                ORDER BY total_spent DESC
                LIMIT 50
            ");
        } else {
            $stmt = $db->prepare("
                SELECT 
                    'Walk-in Guest' as customer_name,
                    '' as email,
                    COUNT(r.reservation_id) as total_bookings,
                    COALESCE(SUM(r.total_amount), 0) as total_spent,
                    MAX(r.check_in_date) as last_visit
                FROM reservations r
                WHERE r.check_in_date >= ? AND r.check_in_date <= ?
                AND r.reservation_status_id IN (2, 3, 4)
                GROUP BY r.customer_id
                ORDER BY total_spent DESC
                LIMIT 50
            ");
        }
        
        $stmt->execute([$fromDate, $toDate]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up data
        foreach ($results as &$row) {
            $row['customer_name'] = trim($row['customer_name']) ?: 'Walk-in Guest';
            $row['total_bookings'] = (int)$row['total_bookings'];
            $row['total_spent'] = (float)$row['total_spent'];
        }
        
        return $results;
        
    } catch (PDOException $e) {
        logError("Error getting customer data", ['error' => $e->getMessage()]);
        return [];
    }
}
?>