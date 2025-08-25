<?php
/**
 * Handyman Dashboard API - CONSOLIDATED VERSION
 * Handles all CRUD operations for handyman maintenance tasks and room maintenance logs
 * File: api/handyman/handydashboard.php
 */

// Turn off error display to prevent HTML in JSON response
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Set JSON headers FIRST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = "localhost";
$username = "root";
$password = "";
$dbname = "hotel_management";

// Create connection
$conn = new mysqli($localhost, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    error_log("Database connection failed: " . $conn->connect_error);
    exit();
}

// Get current handyman ID
session_start();
$handyman_id = $_SESSION['employee_id'] ?? 5;

// Handle different actions
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'user_info':
            getUserInfo($conn, $handyman_id);
            break;
        case 'stats':
            getStats($conn, $handyman_id);
            break;
        case 'tasks':
            getTasks($conn, $handyman_id);
            break;
        case 'rooms':
            getRoomsNeedingMaintenance($conn);
            break;
        case 'maintenance_types':
            getMaintenanceTypes($conn);
            break;
        case 'update_task':
            updateTask($conn, $handyman_id);
            break;
        case 'start_task':
            startTask($conn, $handyman_id);
            break;
        case 'complete_task':
            completeTask($conn, $handyman_id);
            break;
        case 'create_task':
            createTask($conn, $handyman_id);
            break;
        // Room Maintenance Log actions
        case 'get_maintenance_logs':
            getMaintenanceLogs($conn);
            break;
        case 'create_maintenance_log':
            createMaintenanceLog($conn);
            break;
        case 'update_maintenance_log':
            updateMaintenanceLog($conn);
            break;
        case 'delete_maintenance_log':
            deleteMaintenanceLog($conn);
            break;
        case 'get_maintenance_statuses':
            getMaintenanceStatuses($conn);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal server error']);
} finally {
    $conn->close();
}

/**
 * Get current handyman user information
 */
function getUserInfo($conn, $handyman_id) {
    try {
        $sql = "SELECT e.employee_id, e.first_name, e.last_name, e.email, r.role_name
                FROM employees e
                JOIN user_roles r ON e.role_id = r.role_id
                WHERE e.employee_id = ?";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare user info query');
        }
        
        $stmt->bind_param("i", $handyman_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($user = $result->fetch_assoc()) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            echo json_encode(['success' => false, 'message' => 'User not found']);
        }
        $stmt->close();
    } catch (Exception $e) {
        error_log("getUserInfo error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to get user info']);
    }
}

/**
 * Get dashboard statistics
 */
function getStats($conn, $handyman_id) {
    try {
        $stats = [];

        // Pending tasks (Scheduled)
        $sql = "SELECT COUNT(*) as count FROM room_maintenance_log
                WHERE employee_id = ? AND maintenance_status_id = 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare pending stats query');
        $stmt->bind_param("i", $handyman_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats['pending'] = $result->fetch_assoc()['count'];
        $stmt->close();

        // In Progress tasks
        $sql = "SELECT COUNT(*) as count FROM room_maintenance_log
                WHERE employee_id = ? AND maintenance_status_id = 2";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare progress stats query');
        $stmt->bind_param("i", $handyman_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats['in_progress'] = $result->fetch_assoc()['count'];
        $stmt->close();

        // Completed today
        $sql = "SELECT COUNT(*) as count FROM room_maintenance_log
                WHERE employee_id = ? AND maintenance_status_id = 3
                AND DATE(completed_at) = CURDATE()";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare completed stats query');
        $stmt->bind_param("i", $handyman_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats['completed_today'] = $result->fetch_assoc()['count'];
        $stmt->close();

        // Urgent repairs (Out of Order rooms)
        $sql = "SELECT COUNT(*) as count FROM rooms WHERE room_status_id = 4";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare urgent stats query');
        $stmt->execute();
        $result = $stmt->get_result();
        $stats['urgent'] = $result->fetch_assoc()['count'];
        $stmt->close();

        echo json_encode(['success' => true, 'stats' => $stats]);
    } catch (Exception $e) {
        error_log("getStats error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to get stats']);
    }
}

/**
 * Get active maintenance tasks for the handyman
 */
function getTasks($conn, $handyman_id) {
    try {
        $sql = "SELECT
                    rml.maintenance_id,
                    rml.room_id,
                    rml.maintenance_status_id,
                    rml.maintenance_type_id,
                    rml.scheduled_date,
                    rml.started_at,
                    rml.completed_at,
                    rml.cost,
                    rml.notes,
                    r.room_number,
                    r.floor_number,
                    rt.type_name,
                    ms.status_name,
                    rs.status_name as room_status_name,
                    rmt.type_name as maintenance_type_name
                FROM room_maintenance_log rml
                JOIN rooms r ON rml.room_id = r.room_id
                JOIN room_types rt ON r.room_type_id = rt.room_type_id
                JOIN maintenance_status ms ON rml.maintenance_status_id = ms.maintenance_status_id
                JOIN room_status rs ON r.room_status_id = rs.room_status_id
                LEFT JOIN room_maintenance_type rmt ON rml.maintenance_type_id = rmt.maintenance_type_id
                WHERE rml.employee_id = ?
                AND rml.maintenance_status_id IN (1, 2)
                ORDER BY
                    CASE
                        WHEN rs.status_name = 'Out of Order' THEN 1
                        WHEN rml.maintenance_status_id = 2 THEN 2
                        ELSE 3
                    END,
                    rml.scheduled_date ASC";

        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare tasks query');
        $stmt->bind_param("i", $handyman_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $tasks = [];
        while ($row = $result->fetch_assoc()) {
            $tasks[] = $row;
        }
        $stmt->close();

        echo json_encode(['success' => true, 'tasks' => $tasks]);
    } catch (Exception $e) {
        error_log("getTasks error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to get tasks']);
    }
}

/**
 * Get rooms that need maintenance attention
 */
function getRoomsNeedingMaintenance($conn) {
    try {
        $sql = "SELECT
                    r.room_id,
                    r.room_number,
                    r.floor_number,
                    rt.type_name,
                    rs.status_name
                FROM rooms r
                JOIN room_types rt ON r.room_type_id = rt.room_type_id
                JOIN room_status rs ON r.room_status_id = rs.room_status_id
                WHERE r.room_status_id IN (4, 5)
                ORDER BY
                    CASE
                        WHEN r.room_status_id = 4 THEN 1
                        ELSE 2
                    END,
                    r.room_number ASC";

        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare rooms query');
        $stmt->execute();
        $result = $stmt->get_result();

        $rooms = [];
        while ($row = $result->fetch_assoc()) {
            $rooms[] = $row;
        }
        $stmt->close();

        echo json_encode(['success' => true, 'rooms' => $rooms]);
    } catch (Exception $e) {
        error_log("getRooms error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to get rooms']);
    }
}

/**
 * Get all active maintenance types
 */
function getMaintenanceTypes($conn) {
    try {
        $sql = "SELECT maintenance_type_id, type_name 
                FROM room_maintenance_type 
                WHERE is_active = 1 
                ORDER BY type_name ASC";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare maintenance types query');
        $stmt->execute();
        $result = $stmt->get_result();

        $types = [];
        while ($row = $result->fetch_assoc()) {
            $types[] = $row;
        }
        $stmt->close();

        echo json_encode(['success' => true, 'maintenance_types' => $types]);
    } catch (Exception $e) {
        error_log("getMaintenanceTypes error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to get maintenance types']);
    }
}

/**
 * Update a maintenance task
 */
function updateTask($conn, $handyman_id) {
    try {
        $task_id = $_POST['task_id'] ?? '';
        $status = $_POST['status'] ?? '';
        $cost = $_POST['cost'] ?? null;
        $notes = $_POST['notes'] ?? '';

        if (empty($task_id) || empty($status)) {
            echo json_encode(['success' => false, 'message' => 'Task ID and status are required']);
            return;
        }

        if (!is_numeric($status) || $status < 1 || $status > 5) {
            echo json_encode(['success' => false, 'message' => 'Invalid status']);
            return;
        }

        $conn->begin_transaction();

        $sql = "UPDATE room_maintenance_log
                SET maintenance_status_id = ?, updated_at = NOW()";
        $params = [$status];
        $types = "i";

        if ($cost !== null && $cost !== '' && is_numeric($cost)) {
            $sql .= ", cost = ?";
            $params[] = $cost;
            $types .= "d";
        }

        if (!empty($notes)) {
            $sql .= ", notes = ?";
            $params[] = $notes;
            $types .= "s";
        }

        if ($status == 3) {
            $sql .= ", completed_at = NOW()";
        }

        $sql .= " WHERE maintenance_id = ? AND employee_id = ?";
        $params[] = $task_id;
        $params[] = $handyman_id;
        $types .= "ii";

        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare task update query');
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            throw new Exception('Task not found or not authorized');
        }
        $stmt->close();

        if ($status == 3) {
            $room_sql = "UPDATE rooms r
                        JOIN room_maintenance_log rml ON r.room_id = rml.room_id
                        SET r.room_status_id = 1
                        WHERE rml.maintenance_id = ?";
            $room_stmt = $conn->prepare($room_sql);
            if (!$room_stmt) throw new Exception('Failed to prepare room update query');
            $room_stmt->bind_param("i", $task_id);
            $room_stmt->execute();
            $room_stmt->close();
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Task updated successfully']);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("updateTask error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * Start a maintenance task
 */
function startTask($conn, $handyman_id) {
    try {
        $task_id = $_POST['task_id'] ?? '';

        if (empty($task_id)) {
            echo json_encode(['success' => false, 'message' => 'Task ID is required']);
            return;
        }

        $sql = "UPDATE room_maintenance_log
                SET maintenance_status_id = 2, started_at = NOW(), updated_at = NOW()
                WHERE maintenance_id = ? AND employee_id = ? AND maintenance_status_id = 1";

        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare start task query');
        $stmt->bind_param("ii", $task_id, $handyman_id);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            echo json_encode(['success' => true, 'message' => 'Task started successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Task not found or cannot be started']);
        }
        $stmt->close();
    } catch (Exception $e) {
        error_log("startTask error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to start task']);
    }
}

/**
 * Complete a maintenance task
 */
function completeTask($conn, $handyman_id) {
    try {
        $task_id = $_POST['task_id'] ?? '';

        if (empty($task_id)) {
            echo json_encode(['success' => false, 'message' => 'Task ID is required']);
            return;
        }

        $conn->begin_transaction();

        $sql = "UPDATE room_maintenance_log
                SET maintenance_status_id = 3, completed_at = NOW(), updated_at = NOW()
                WHERE maintenance_id = ? AND employee_id = ? AND maintenance_status_id = 2";

        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare complete task query');
        $stmt->bind_param("ii", $task_id, $handyman_id);
        $stmt->execute();

        if ($stmt->affected_rows === 0) {
            throw new Exception('Task not found or not in progress');
        }
        $stmt->close();

        $room_sql = "UPDATE rooms r
                    JOIN room_maintenance_log rml ON r.room_id = rml.room_id
                    SET r.room_status_id = 1
                    WHERE rml.maintenance_id = ?";
        $room_stmt = $conn->prepare($room_sql);
        if (!$room_stmt) throw new Exception('Failed to prepare room update query');
        $room_stmt->bind_param("i", $task_id);
        $room_stmt->execute();
        $room_stmt->close();

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Task completed successfully']);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("completeTask error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * Create a new maintenance task
 */
function createTask($conn, $handyman_id) {
    try {
        $room_id = $_POST['room_id'] ?? '';
        $description = $_POST['description'] ?? '';
        $maintenance_type_id = $_POST['maintenance_type_id'] ?? null;

        if (empty($room_id) || empty($description)) {
            echo json_encode(['success' => false, 'message' => 'Room ID and description are required']);
            return;
        }

        if (!is_numeric($room_id)) {
            echo json_encode(['success' => false, 'message' => 'Invalid Room ID']);
            return;
        }

        if ($maintenance_type_id !== null && $maintenance_type_id !== '' && !is_numeric($maintenance_type_id)) {
            echo json_encode(['success' => false, 'message' => 'Invalid Maintenance Type ID']);
            return;
        }

        $conn->begin_transaction();

        if ($maintenance_type_id && !empty($maintenance_type_id)) {
            $sql = "INSERT INTO room_maintenance_log
                    (room_id, maintenance_status_id, maintenance_type_id, scheduled_date, notes, employee_id, created_at, updated_at)
                    VALUES (?, 1, ?, CURDATE(), ?, ?, NOW(), NOW())";
            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception('Failed to prepare create task query');
            $stmt->bind_param("iisi", $room_id, $maintenance_type_id, $description, $handyman_id);
        } else {
            $sql = "INSERT INTO room_maintenance_log
                    (room_id, maintenance_status_id, scheduled_date, notes, employee_id, created_at, updated_at)
                    VALUES (?, 1, CURDATE(), ?, ?, NOW(), NOW())";
            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception('Failed to prepare create task query');
            $stmt->bind_param("isi", $room_id, $description, $handyman_id);
        }
        
        $stmt->execute();
        $new_task_id = $conn->insert_id;
        $stmt->close();

        $room_sql = "UPDATE rooms SET room_status_id = 5 WHERE room_id = ?";
        $room_stmt = $conn->prepare($room_sql);
        if (!$room_stmt) throw new Exception('Failed to prepare room status update query');
        $room_stmt->bind_param("i", $room_id);
        $room_stmt->execute();
        $room_stmt->close();

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Maintenance task created successfully']);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("createTask error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ===== ROOM MAINTENANCE LOG FUNCTIONS =====

/**
 * Get maintenance logs with pagination and filters
 */
function getMaintenanceLogs($conn) {
    try {
        // Get pagination parameters
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(10, intval($_GET['limit']))) : 50;
        $offset = ($page - 1) * $limit;
        
        // Get filter parameters
        $room_id = isset($_GET['room_id']) ? intval($_GET['room_id']) : 0;
        $status_id = isset($_GET['status_id']) ? intval($_GET['status_id']) : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        
        // Build WHERE clause
        $whereConditions = [];
        $whereParams = '';
        $params = [];
        
        if ($room_id > 0) {
            $whereConditions[] = "r.room_id = ?";
            $params[] = $room_id;
            $whereParams .= 'i';
        }
        
        if ($status_id > 0) {
            $whereConditions[] = "rml.maintenance_status_id = ?";
            $params[] = $status_id;
            $whereParams .= 'i';
        }
        
        if (!empty($search)) {
            $whereConditions[] = "(r.room_number LIKE ? OR ms.status_name LIKE ? OR rml.notes LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $whereParams .= 'sss';
        }
        
        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        
        // Get total count
        $countSql = "
            SELECT COUNT(*) as total
            FROM room_maintenance_log rml
            LEFT JOIN rooms r ON rml.room_id = r.room_id
            LEFT JOIN maintenance_status ms ON rml.maintenance_status_id = ms.maintenance_status_id
            $whereClause
        ";
        
        $countStmt = $conn->prepare($countSql);
        if (!empty($params)) {
            $countStmt->bind_param($whereParams, ...$params);
        }
        $countStmt->execute();
        $result = $countStmt->get_result();
        $totalRecords = $result->fetch_assoc()['total'];
        $countStmt->close();
        
        // Get maintenance records with pagination
        $sql = "
            SELECT 
                rml.maintenance_id as log_id,
                rml.room_id,
                r.room_number,
                rml.maintenance_status_id,
                ms.status_name,
                rml.notes as description,
                CONCAT(e.first_name, ' ', e.last_name) as assigned_to,
                'medium' as priority,
                rml.scheduled_date as estimated_completion,
                rml.created_at,
                rml.updated_at,
                rml.completed_at as completion_date,
                rml.notes
            FROM room_maintenance_log rml
            LEFT JOIN rooms r ON rml.room_id = r.room_id
            LEFT JOIN maintenance_status ms ON rml.maintenance_status_id = ms.maintenance_status_id
            LEFT JOIN employees e ON rml.employee_id = e.employee_id
            $whereClause
            ORDER BY rml.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;
        $whereParams .= 'ii';
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($whereParams, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $records = [];
        while ($row = $result->fetch_assoc()) {
            $records[] = [
                'log_id' => (int)$row['log_id'],
                'room_id' => (int)$row['room_id'],
                'room_number' => $row['room_number'],
                'maintenance_status_id' => (int)$row['maintenance_status_id'],
                'status_name' => $row['status_name'] ?: 'Unknown Status',
                'description' => $row['description'] ?: '',
                'assigned_to' => $row['assigned_to'] ?: '',
                'priority' => $row['priority'] ?: 'medium',
                'estimated_completion' => $row['estimated_completion'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
                'completion_date' => $row['completion_date'],
                'notes' => $row['notes'] ?: ''
            ];
        }
        $stmt->close();
        
        $totalPages = ceil($totalRecords / $limit);
        
        echo json_encode([
            'success' => true,
            'records' => $records,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'per_page' => $limit,
                'total_items' => (int)$totalRecords,
                'has_more' => $page < $totalPages
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("getMaintenanceLogs error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to get maintenance logs']);
    }
}

/**
 * Create a new maintenance log entry
 */
function createMaintenanceLog($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $input = $_POST; // Fallback to POST data
        }
        
        // Validate required fields
        $required = ['room_id', 'maintenance_status_id', 'description'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Check if room exists
        $checkRoomStmt = $conn->prepare("SELECT room_id FROM rooms WHERE room_id = ?");
        $checkRoomStmt->bind_param("i", $input['room_id']);
        $checkRoomStmt->execute();
        $result = $checkRoomStmt->get_result();
        if (!$result->fetch_assoc()) {
            throw new Exception('Invalid room ID');
        }
        $checkRoomStmt->close();
        
        // Validate maintenance status
        $checkStatusStmt = $conn->prepare("SELECT maintenance_status_id FROM maintenance_status WHERE maintenance_status_id = ?");
        $checkStatusStmt->bind_param("i", $input['maintenance_status_id']);
        $checkStatusStmt->execute();
        $result = $checkStatusStmt->get_result();
        if (!$result->fetch_assoc()) {
            throw new Exception('Invalid maintenance status');
        }
        $checkStatusStmt->close();
        
        // Start transaction
        $conn->begin_transaction();
        
        // Get current handyman ID from session
        $handyman_id = $_SESSION['employee_id'] ?? 5;
        
        // Insert new maintenance record
        $stmt = $conn->prepare("
            INSERT INTO room_maintenance_log 
            (room_id, maintenance_status_id, notes, employee_id, scheduled_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, CURDATE(), NOW(), NOW())
        ");
        
        $stmt->bind_param("iisi", 
            $input['room_id'],
            $input['maintenance_status_id'],
            $input['description'],
            $handyman_id
        );
        
        $stmt->execute();
        $logId = $conn->insert_id;
        $stmt->close();
        
        // Update room status if needed
        $updateRoomStatus = false;
        if ($input['maintenance_status_id'] == 2) { // In Progress
            $updateRoomStatus = true;
            $newRoomStatusId = 4; // Out of Order
        } elseif ($input['maintenance_status_id'] == 3) { // Completed
            $updateRoomStatus = true;
            $newRoomStatusId = 1; // Available
        } elseif ($input['maintenance_status_id'] == 1) { // Pending
            $updateRoomStatus = true;
            $newRoomStatusId = 5; // Under Maintenance
        }
        
        if ($updateRoomStatus) {
            $roomStmt = $conn->prepare("UPDATE rooms SET room_status_id = ? WHERE room_id = ?");
            $roomStmt->bind_param("ii", $newRoomStatusId, $input['room_id']);
            $roomStmt->execute();
            $roomStmt->close();
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Maintenance record created successfully',
            'log_id' => $logId
        ]);
        
    } catch (Exception $e) {
        if ($conn->more_results()) {
            $conn->next_result();
        }
        $conn->rollback();
        error_log("createMaintenanceLog error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

/**
 * Update an existing maintenance log entry
 */
function updateMaintenanceLog($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $input = $_POST; // Fallback to POST data
        }

        if (empty($input['log_id'])) {
            throw new Exception('Missing log_id');
        }

        $logId = $input['log_id'];
        
        // Verify record exists
        $checkStmt = $conn->prepare("SELECT room_id FROM room_maintenance_log WHERE maintenance_id = ?");
        $checkStmt->bind_param("i", $logId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $existingRecord = $result->fetch_assoc();
        $checkStmt->close();
        
        if (!$existingRecord) {
            throw new Exception('Maintenance record not found');
        }

        // Build update query
        $updateFields = [];
        $updateValues = [];
        $updateTypes = '';
        $allowedFields = ['maintenance_status_id', 'notes', 'scheduled_date'];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field]) && $input[$field] !== '') {
                $updateFields[] = "$field = ?";
                $updateValues[] = $input[$field];
                $updateTypes .= ($field === 'maintenance_status_id') ? 'i' : 's';
            }
        }

        if (empty($updateFields)) {
            throw new Exception('No changes provided');
        }

        $conn->begin_transaction();

        // Update maintenance record
        $updateValues[] = $logId;
        $updateTypes .= 'i';
        $sql = "UPDATE room_maintenance_log SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE maintenance_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($updateTypes, ...$updateValues);
        $stmt->execute();
        $stmt->close();

        // Update room status if maintenance status changed
        if (isset($input['maintenance_status_id'])) {
            $newRoomStatusId = null;
            if ($input['maintenance_status_id'] == 2) { // In Progress
                $newRoomStatusId = 4; // Out of Order
            } elseif ($input['maintenance_status_id'] == 3) { // Completed
                $newRoomStatusId = 1; // Available
            } elseif ($input['maintenance_status_id'] == 1) { // Pending
                $newRoomStatusId = 5; // Under Maintenance
            }
            
            if ($newRoomStatusId !== null) {
                $roomStmt = $conn->prepare("UPDATE rooms SET room_status_id = ? WHERE room_id = ?");
                $roomStmt->bind_param("ii", $newRoomStatusId, $existingRecord['room_id']);
                $roomStmt->execute();
                $roomStmt->close();
            }
        }

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Maintenance record updated successfully',
            'log_id' => $logId
        ]);

    } catch (Exception $e) {
        if ($conn->more_results()) {
            $conn->next_result();
        }
        $conn->rollback();
        error_log("updateMaintenanceLog error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

/**
 * Delete a maintenance log entry
 */
function deleteMaintenanceLog($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $input = $_POST; // Fallback to POST data
        }
        
        if (!$input || empty($input['log_id'])) {
            throw new Exception('Missing log_id');
        }
        
        $logId = $input['log_id'];
        
        // Get room ID before deleting
        $getRoomStmt = $conn->prepare("SELECT room_id FROM room_maintenance_log WHERE maintenance_id = ?");
        $getRoomStmt->bind_param("i", $logId);
        $getRoomStmt->execute();
        $result = $getRoomStmt->get_result();
        $roomData = $result->fetch_assoc();
        $getRoomStmt->close();
        
        if (!$roomData) {
            throw new Exception('Maintenance record not found');
        }
        
        $roomId = $roomData['room_id'];
        
        $conn->begin_transaction();
        
        // Delete the maintenance record
        $stmt = $conn->prepare("DELETE FROM room_maintenance_log WHERE maintenance_id = ?");
        $stmt->bind_param("i", $logId);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Maintenance record not found');
        }
        $stmt->close();
        
        // Reset room status to Available if no other active maintenance records
        $checkOtherStmt = $conn->prepare("SELECT COUNT(*) as count FROM room_maintenance_log WHERE room_id = ? AND maintenance_status_id IN (1,2)");
        $checkOtherStmt->bind_param("i", $roomId);
        $checkOtherStmt->execute();
        $result = $checkOtherStmt->get_result();
        $otherCount = $result->fetch_assoc()['count'];
        $checkOtherStmt->close();
        
        if ($otherCount == 0) {
            $roomStmt = $conn->prepare("UPDATE rooms SET room_status_id = 1 WHERE room_id = ?");
            $roomStmt->bind_param("i", $roomId);
            $roomStmt->execute();
            $roomStmt->close();
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Maintenance record deleted successfully',
            'log_id' => $logId
        ]);
        
    } catch (Exception $e) {
        if ($conn->more_results()) {
            $conn->next_result();
        }
        $conn->rollback();
        error_log("deleteMaintenanceLog error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

/**
 * Get all maintenance statuses
 */
function getMaintenanceStatuses($conn) {
    try {
        $sql = "SELECT maintenance_status_id, status_name FROM maintenance_status ORDER BY status_name";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Failed to prepare maintenance statuses query');
        $stmt->execute();
        $result = $stmt->get_result();

        $statuses = [];
        while ($row = $result->fetch_assoc()) {
            $statuses[] = $row;
        }
        $stmt->close();

        echo json_encode(['success' => true, 'statuses' => $statuses]);
    } catch (Exception $e) {
        error_log("getMaintenanceStatuses error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to get maintenance statuses']);
    }
}

?>