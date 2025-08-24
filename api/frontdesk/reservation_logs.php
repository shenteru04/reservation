<?php
// api/frontdesk/reservation_logs.php - Reservation Logs API for Front Desk
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

// Function to log errors
function logError($message) {
    $logFile = __DIR__ . '/../logs/reservation_logs_api.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[RESERVATION_LOGS_API] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
        $action = $_GET['action'] ?? 'all_logs';
        
        switch ($action) {
            case 'all_logs':
                getAllReservationLogs($db);
                break;
            case 'reservation_history':
                getReservationHistory($db);
                break;
            case 'activity_summary':
                getActivitySummary($db);
                break;
            case 'recent_activities':
                getRecentActivities($db);
                break;
            case 'logs_by_date':
                getLogsByDateRange($db);
                break;
            case 'logs_by_action':
                getLogsByAction($db);
                break;
            case 'logs_by_user':
                getLogsByUser($db);
                break;
            case 'export_logs':
                exportLogs($db);
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

function getAllReservationLogs($db) {
    try {
        // Get pagination parameters
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = ($page - 1) * $limit;
        
        // Get filter parameters
        $reservationId = $_GET['reservation_id'] ?? null;
        $actionType = $_GET['action_type'] ?? null;
        $userType = $_GET['user_type'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;
        
        // Build WHERE clause
        $whereConditions = [];
        $params = [];
        
        if ($reservationId) {
            $whereConditions[] = "rl.reservation_id = ?";
            $params[] = $reservationId;
        }
        
        if ($actionType) {
            $whereConditions[] = "rl.action_type = ?";
            $params[] = $actionType;
        }
        
        if ($userType) {
            $whereConditions[] = "rl.user_type = ?";
            $params[] = $userType;
        }
        
        if ($dateFrom) {
            $whereConditions[] = "DATE(rl.timestamp) >= ?";
            $params[] = $dateFrom;
        }
        
        if ($dateTo) {
            $whereConditions[] = "DATE(rl.timestamp) <= ?";
            $params[] = $dateTo;
        }
        
        $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
        
        // Get total count for pagination
        $countSql = "
            SELECT COUNT(*) as total
            FROM reservation_logs rl
            {$whereClause}
        ";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalLogs = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get logs with detailed information
        $sql = "
            SELECT 
                rl.*,
                r.room_id,
                r.check_in_date,
                r.check_out_date,
                r.checkin_datetime,
                r.checkout_datetime,
                r.total_amount,
                r.reservation_status_id,
                c.first_name,
                c.last_name,
                c.email,
                c.phone_number,
                rooms.room_number,
                rooms.room_type_id,
                rt.type_name as room_type_name,
                rs.status_name as reservation_status
            FROM reservation_logs rl
            LEFT JOIN reservations r ON rl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ON r.room_id = rooms.room_id
            LEFT JOIN room_types rt ON rooms.room_type_id = rt.room_type_id
            LEFT JOIN reservation_status rs ON r.reservation_status_id = rs.reservation_status_id
            {$whereClause}
            ORDER BY rl.timestamp DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format the logs for better readability
        $formattedLogs = array_map('formatLogEntry', $logs);
        
        echo json_encode([
            'success' => true,
            'logs' => $formattedLogs,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalLogs / $limit),
                'total_logs' => (int)$totalLogs,
                'limit' => $limit
            ]
        ]);
        
    } catch (Exception $e) {
        logError("Error fetching all logs: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch reservation logs: ' . $e->getMessage(),
            'debug' => 'Check if reservation_logs table exists in database'
        ]);
    }
}

function getReservationHistory($db) {
    try {
        $reservationId = $_GET['reservation_id'] ?? null;
        
        if (!$reservationId) {
            throw new Exception('Reservation ID is required');
        }
        
        $sql = "
            SELECT 
                rl.*,
                c.first_name,
                c.last_name,
                r.room_id,
                rooms.room_number,
                rt.type_name as room_type_name
            FROM reservation_logs rl
            LEFT JOIN reservations r ON rl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ON r.room_id = rooms.room_id
            LEFT JOIN room_types rt ON rooms.room_type_id = rt.room_type_id
            WHERE rl.reservation_id = ?
            ORDER BY rl.timestamp ASC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$reservationId]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedHistory = array_map('formatLogEntry', $history);
        
        echo json_encode([
            'success' => true,
            'reservation_id' => $reservationId,
            'history' => $formattedHistory
        ]);
        
    } catch (Exception $e) {
        logError("Error fetching reservation history: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function getActivitySummary($db) {
    try {
        $dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
        $dateTo = $_GET['date_to'] ?? date('Y-m-d');
        
        // Get activity counts by action type
        $actionSql = "
            SELECT 
                action_type,
                COUNT(*) as count,
                DATE(timestamp) as activity_date
            FROM reservation_logs 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            GROUP BY action_type, DATE(timestamp)
            ORDER BY activity_date DESC, count DESC
        ";
        
        $stmt = $db->prepare($actionSql);
        $stmt->execute([$dateFrom, $dateTo]);
        $actionStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get activity counts by user type
        $userSql = "
            SELECT 
                user_type,
                COUNT(*) as count
            FROM reservation_logs 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            GROUP BY user_type
            ORDER BY count DESC
        ";
        
        $stmt = $db->prepare($userSql);
        $stmt->execute([$dateFrom, $dateTo]);
        $userStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get daily activity summary
        $dailySql = "
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as total_activities,
                COUNT(DISTINCT reservation_id) as unique_reservations
            FROM reservation_logs 
            WHERE DATE(timestamp) BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
        ";
        
        $stmt = $db->prepare($dailySql);
        $stmt->execute([$dateFrom, $dateTo]);
        $dailyStats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'date_range' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ],
            'action_statistics' => $actionStats,
            'user_statistics' => $userStats,
            'daily_statistics' => $dailyStats
        ]);
        
    } catch (Exception $e) {
        logError("Error fetching activity summary: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch activity summary'
        ]);
    }
}

function getRecentActivities($db) {
    try {
        $limit = (int)($_GET['limit'] ?? 20);
        
        $sql = "
            SELECT 
                rl.*,
                c.first_name,
                c.last_name,
                r.room_id,
                rooms.room_number,
                rt.type_name as room_type_name
            FROM reservation_logs rl
            LEFT JOIN reservations r ON rl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ON r.room_id = rooms.room_id
            LEFT JOIN room_types rt ON rooms.room_type_id = rt.room_type_id
            ORDER BY rl.timestamp DESC
            LIMIT ?
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$limit]);
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedActivities = array_map('formatLogEntry', $activities);
        
        echo json_encode([
            'success' => true,
            'recent_activities' => $formattedActivities
        ]);
        
    } catch (Exception $e) {
        logError("Error fetching recent activities: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch recent activities'
        ]);
    }
}

function getLogsByDateRange($db) {
    try {
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;
        
        if (!$dateFrom || !$dateTo) {
            throw new Exception('Both date_from and date_to are required');
        }
        
        $sql = "
            SELECT 
                rl.*,
                c.first_name,
                c.last_name,
                r.room_id,
                rooms.room_number
            FROM reservation_logs rl
            LEFT JOIN reservations r ON rl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ON r.room_id = rooms.room_id
            WHERE DATE(rl.timestamp) BETWEEN ? AND ?
            ORDER BY rl.timestamp DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$dateFrom, $dateTo]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedLogs = array_map('formatLogEntry', $logs);
        
        echo json_encode([
            'success' => true,
            'date_range' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ],
            'logs' => $formattedLogs,
            'count' => count($formattedLogs)
        ]);
        
    } catch (Exception $e) {
        logError("Error fetching logs by date range: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function getLogsByAction($db) {
    try {
        $actionType = $_GET['action_type'] ?? null;
        
        if (!$actionType) {
            // Return available action types
            $stmt = $db->prepare("SELECT DISTINCT action_type FROM reservation_logs ORDER BY action_type");
            $stmt->execute();
            $actionTypes = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            echo json_encode([
                'success' => true,
                'available_action_types' => $actionTypes
            ]);
            return;
        }
        
        $sql = "
            SELECT 
                rl.*,
                c.first_name,
                c.last_name,
                r.room_id,
                rooms.room_number
            FROM reservation_logs rl
            LEFT JOIN reservations r ON rl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ON r.room_id = rooms.room_id
            WHERE rl.action_type = ?
            ORDER BY rl.timestamp DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$actionType]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedLogs = array_map('formatLogEntry', $logs);
        
        echo json_encode([
            'success' => true,
            'action_type' => $actionType,
            'logs' => $formattedLogs,
            'count' => count($formattedLogs)
        ]);
        
    } catch (Exception $e) {
        logError("Error fetching logs by action: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch logs by action type'
        ]);
    }
}

function getLogsByUser($db) {
    try {
        $userType = $_GET['user_type'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        
        $whereConditions = [];
        $params = [];
        
        if ($userType) {
            $whereConditions[] = "rl.user_type = ?";
            $params[] = $userType;
        }
        
        if ($userId) {
            $whereConditions[] = "rl.user_id = ?";
            $params[] = $userId;
        }
        
        if (empty($whereConditions)) {
            throw new Exception('Either user_type or user_id is required');
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        
        $sql = "
            SELECT 
                rl.*,
                c.first_name,
                c.last_name,
                r.room_id,
                rooms.room_number
            FROM reservation_logs rl
            LEFT JOIN reservations r ON rl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ON r.room_id = rooms.room_id
            {$whereClause}
            ORDER BY rl.timestamp DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedLogs = array_map('formatLogEntry', $logs);
        
        echo json_encode([
            'success' => true,
            'filters' => [
                'user_type' => $userType,
                'user_id' => $userId
            ],
            'logs' => $formattedLogs,
            'count' => count($formattedLogs)
        ]);
        
    } catch (Exception $e) {
        logError("Error fetching logs by user: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function exportLogs($db) {
    try {
        $format = $_GET['format'] ?? 'json';
        $dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
        $dateTo = $_GET['date_to'] ?? date('Y-m-d');
        
        $sql = "
            SELECT 
                rl.log_id,
                rl.reservation_id,
                rl.action_type,
                rl.user_type,
                rl.user_id,
                rl.timestamp,
                rl.notes,
                rl.old_values,
                rl.new_values,
                CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                c.email as customer_email,
                r.room_id,
                rooms.room_number
            FROM reservation_logs rl
            LEFT JOIN reservations r ON rl.reservation_id = r.reservation_id
            LEFT JOIN customers c ON r.customer_id = c.customer_id
            LEFT JOIN rooms ON r.room_id = rooms.room_id
            WHERE DATE(rl.timestamp) BETWEEN ? AND ?
            ORDER BY rl.timestamp DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$dateFrom, $dateTo]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($format === 'csv') {
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="reservation_logs_' . $dateFrom . '_to_' . $dateTo . '.csv"');
            
            $output = fopen('php://output', 'w');
            
            // CSV headers
            fputcsv($output, [
                'Log ID', 'Reservation ID', 'Action Type', 'User Type', 'User ID',
                'Timestamp', 'Customer Name', 'Customer Email', 'Room Number', 'Notes'
            ]);
            
            // CSV data
            foreach ($logs as $log) {
                fputcsv($output, [
                    $log['log_id'],
                    $log['reservation_id'],
                    $log['action_type'],
                    $log['user_type'],
                    $log['user_id'],
                    $log['timestamp'],
                    $log['customer_name'],
                    $log['customer_email'],
                    $log['room_number'],
                    $log['notes']
                ]);
            }
            
            fclose($output);
        } else {
            // JSON format
            echo json_encode([
                'success' => true,
                'export_info' => [
                    'format' => $format,
                    'date_range' => ['from' => $dateFrom, 'to' => $dateTo],
                    'total_records' => count($logs)
                ],
                'logs' => $logs
            ]);
        }
        
    } catch (Exception $e) {
        logError("Error exporting logs: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to export logs'
        ]);
    }
}

function formatLogEntry($log) {
    // Parse JSON values if they exist
    $oldValues = null;
    $newValues = null;
    
    if (!empty($log['old_values'])) {
        $oldValues = json_decode($log['old_values'], true);
    }
    
    if (!empty($log['new_values'])) {
        $newValues = json_decode($log['new_values'], true);
    }
    
    // Create formatted entry
    $formatted = [
        'log_id' => (int)$log['log_id'],
        'reservation_id' => (int)$log['reservation_id'],
        'action_type' => $log['action_type'],
        'user_type' => $log['user_type'],
        'user_id' => $log['user_id'] ? (int)$log['user_id'] : null,
        'timestamp' => $log['timestamp'],
        'formatted_timestamp' => date('M j, Y g:i A', strtotime($log['timestamp'])),
        'notes' => $log['notes'],
        'old_values' => $oldValues,
        'new_values' => $newValues,
        'customer' => [
            'name' => trim(($log['first_name'] ?? '') . ' ' . ($log['last_name'] ?? '')),
            'email' => $log['email'] ?? null,
            'phone' => $log['phone_number'] ?? null
        ],
        'room' => [
            'room_id' => $log['room_id'] ?? null,
            'room_number' => $log['room_number'] ?? null,
            'room_type' => $log['room_type_name'] ?? null
        ],
        'reservation_details' => [
            'check_in_date' => $log['check_in_date'] ?? null,
            'check_out_date' => $log['check_out_date'] ?? null,
            'checkin_datetime' => $log['checkin_datetime'] ?? null,
            'checkout_datetime' => $log['checkout_datetime'] ?? null,
            'total_amount' => $log['total_amount'] ?? null,
            'status' => $log['reservation_status'] ?? null
        ]
    ];
    
    return $formatted;
}
?>