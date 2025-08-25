<?php
// api/admin/pages/room-maintenance.php - Room Maintenance Management API

error_reporting(E_ALL);
ini_set('display_errors', 0);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Log errors
function logMaintenanceError($message) {
    $logFile = __DIR__ . '/../../../logs/room-maintenance.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[ROOM-MAINTENANCE] " . date('Y-m-d H:i:s') . " - " . $message, 3, $logFile);
}

// Auth check
if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    logMaintenanceError("Unauthorized access attempt");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

// Load database config
$config_paths = [
    '../config/db.php',
    '../../config/db.php',
    '../../../config/db.php',
    __DIR__ . '/../config/db.php',
    __DIR__ . '/../../config/db.php',
    __DIR__ . '/../../../config/db.php'
];

$config_found = false;
foreach ($config_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $config_found = true;
        break;
    }
}

if (!$config_found) {
    logMaintenanceError("Database config file not found");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Configuration error']);
    exit();
}

if (!function_exists('getDB')) {
    logMaintenanceError("getDB function not found");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Configuration error']);
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
            exit();
    }
} catch (Exception $e) {
    logMaintenanceError("Unhandled error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}

// --- API Handlers ---

function handleGet($db) {
    try {
        $params = [];
        $whereConditions = [];
        $limit = 20;
        $page = 1;

        // Check if getting all logs
        $getAll = isset($_GET['all']) && $_GET['all'] == '1';

        if (!$getAll) {
            $page = max(1, (int)$_GET['page'] ?? 1);
            $limit = min(100, max(5, (int)$_GET['limit'] ?? 20));
        }

        $offset = ($page - 1) * $limit;

        // Filters
        if (isset($_GET['room_id'])) {
            $whereConditions[] = "rml.room_id = ?";
            $params[] = $_GET['room_id'];
        }
        if (isset($_GET['status_id'])) {
            $whereConditions[] = "rml.maintenance_status_id = ?";
            $params[] = $_GET['status_id'];
        }
        if (isset($_GET['search'])) {
            $search = $_GET['search'];
            $whereConditions[] = "(r.room_number LIKE ? OR ms.status_name LIKE ? OR rml.notes LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

        // Total count
        $countSql = "SELECT COUNT(*) as total FROM room_maintenance_log rml
                     LEFT JOIN rooms r ON rml.room_id = r.room_id
                     LEFT JOIN maintenance_status ms ON rml.maintenance_status_id = ms.maintenance_status_id
                     $whereClause";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];

        // Main query with employee name
        $sql = "SELECT 
                    rml.maintenance_id as log_id,
                    rml.room_id,
                    r.room_number,
                    rml.maintenance_status_id,
                    ms.status_name,
                    rml.maintenance_type_id,
                    rml.scheduled_date,
                    rml.started_at,
                    rml.completed_at,
                    rml.cost,
                    rml.notes,
                    rml.employee_id,
                    rml.created_at,
                    rml.updated_at,
                    COALESCE(rml.notes, 'No description') as description,
                    CONCAT(e.first_name, ' ', e.last_name) AS assigned_to_name
                FROM room_maintenance_log rml
                LEFT JOIN rooms r ON rml.room_id = r.room_id
                LEFT JOIN maintenance_status ms ON rml.maintenance_status_id = ms.maintenance_status_id
                LEFT JOIN employees e ON rml.employee_id = e.employee_id
                $whereClause
                ORDER BY rml.created_at DESC";

        if (!$getAll) {
            $sql .= " LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'success' => true,
            'records' => $records
        ];

        if (!$getAll) {
            $response['pagination'] = [
                'current_page' => $page,
                'total_pages' => ceil($total / $limit),
                'total_records' => $total,
                'per_page' => $limit
            ];
        } else {
            $response['total_records'] = $total;
        }

        echo json_encode($response);
    } catch (Exception $e) {
        logMaintenanceError("Error fetching logs: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) throw new Exception('Invalid JSON input');

        $required = ['room_id', 'maintenance_status_id'];
        foreach ($required as $field) {
            if (!isset($input[$field])) throw new Exception("Missing required field: $field");
        }

        // Validate room
        $checkRoom = $db->prepare("SELECT room_id FROM rooms WHERE room_id = ?");
        $checkRoom->execute([$input['room_id']]);
        if (!$checkRoom->fetch()) throw new Exception('Invalid room ID');

        // Validate status
        $checkStatus = $db->prepare("SELECT maintenance_status_id FROM maintenance_status WHERE maintenance_status_id = ?");
        $checkStatus->execute([$input['maintenance_status_id']]);
        if (!$checkStatus->fetch()) throw new Exception('Invalid maintenance status');

        $db->beginTransaction();

        $stmt = $db->prepare("INSERT INTO room_maintenance_log 
            (room_id, maintenance_status_id, maintenance_type_id, scheduled_date, cost, notes, employee_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['room_id'],
            $input['maintenance_status_id'],
            $input['maintenance_type_id'] ?? null,
            $input['scheduled_date'] ?? null,
            $input['cost'] ?? null,
            $input['notes'] ?? '',
            $_SESSION['user_id'] // ✅ Assign to logged-in employee
        ]);

        $logId = $db->lastInsertId();

        // Update room status
        $newRoomStatus = null;
        if ($input['maintenance_status_id'] == 2) $newRoomStatus = 5; // In Progress → Under Maintenance
        elseif ($input['maintenance_status_id'] == 3) $newRoomStatus = 1; // Completed → Available

        if ($newRoomStatus !== null) {
            $roomStmt = $db->prepare("UPDATE rooms SET room_status_id = ? WHERE room_id = ?");
            $roomStmt->execute([$newRoomStatus, $input['room_id']]);
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Task created successfully',
            'log_id' => $logId
        ]);
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollback();
        logMaintenanceError("Create error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Keep handlePut and handleDelete as-is (they're correct)

function handlePut($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['maintenance_id'])) throw new Exception('Missing maintenance_id');

        $id = $input['maintenance_id'];
        $check = $db->prepare("SELECT * FROM room_maintenance_log WHERE maintenance_id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) throw new Exception('Record not found');

        $allowed = ['maintenance_status_id', 'maintenance_type_id', 'scheduled_date', 'cost', 'notes'];
        $fields = [];
        $values = [];

        foreach ($allowed as $field) {
            if (isset($input[$field])) {
                $fields[] = "$field = ?";
                $values[] = $input[$field];
            }
        }

        if (empty($fields)) throw new Exception('No changes provided');

        $values[] = $id;
        $sql = "UPDATE room_maintenance_log SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE maintenance_id = ?";
        
        $db->beginTransaction();
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        // Update room status if needed
        if (isset($input['maintenance_status_id'])) {
            $newStatus = null;
            if ($input['maintenance_status_id'] == 2) $newStatus = 5;
            elseif ($input['maintenance_status_id'] == 3) $newStatus = 1;
            elseif ($input['maintenance_status_id'] == 1) $newStatus = 5;

            if ($newStatus !== null) {
                $roomStmt = $db->prepare("UPDATE rooms SET room_status_id = ? WHERE room_id = (SELECT room_id FROM room_maintenance_log WHERE maintenance_id = ?)");
                $roomStmt->execute([$newStatus, $id]);
            }
        }

        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Updated successfully', 'log_id' => $id]);
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollback();
        logMaintenanceError("Update error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function handleDelete($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['maintenance_id'])) throw new Exception('Missing maintenance_id');

        $id = $input['maintenance_id'];
        $getRoom = $db->prepare("SELECT room_id FROM room_maintenance_log WHERE maintenance_id = ?");
        $getRoom->execute([$id]);
        $row = $getRoom->fetch();

        if (!$row) throw new Exception('Record not found');

        $roomId = $row['room_id'];

        $db->beginTransaction();
        $stmt = $db->prepare("DELETE FROM room_maintenance_log WHERE maintenance_id = ?");
        $stmt->execute([$id]);

        // Reset room status if no active maintenance
        $check = $db->prepare("SELECT COUNT(*) as c FROM room_maintenance_log WHERE room_id = ? AND maintenance_status_id IN (1,2)");
        $check->execute([$roomId]);
        if ($check->fetch()['c'] == 0) {
            $db->prepare("UPDATE rooms SET room_status_id = 1 WHERE room_id = ?")->execute([$roomId]);
        }

        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Deleted successfully', 'log_id' => $id]);
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollback();
        logMaintenanceError("Delete error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}