<?php
/**
 * Handyman Dashboard API
 * Handles all CRUD operations for handyman maintenance tasks
 */

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
$servername = "127.0.0.1";
$username = "root";
$password = "";
$dbname = "hotel_management";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]));
}

// Get current handyman ID (in a real app, this would come from session/JWT)
session_start();
$handyman_id = $_SESSION['employee_id'] ?? 5; // Default to handyman with ID 5 for testing

// Handle different actions
$action = $_GET['action'] ?? $_POST['action'] ?? '';

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
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

$conn->close();

/**
 * Get current handyman user information
 */
function getUserInfo($conn, $handyman_id) {
    $sql = "SELECT e.employee_id, e.first_name, e.last_name, e.email, r.role_name 
            FROM employees e 
            JOIN user_roles r ON e.role_id = r.role_id 
            WHERE e.employee_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $handyman_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
}

/**
 * Get dashboard statistics
 */
function getStats($conn, $handyman_id) {
    $stats = [];
    
    // Pending tasks (Scheduled)
    $sql = "SELECT COUNT(*) as count FROM room_maintenance_log 
            WHERE employee_id = ? AND maintenance_status_id = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $handyman_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats['pending'] = $result->fetch_assoc()['count'];
    
    // In Progress tasks
    $sql = "SELECT COUNT(*) as count FROM room_maintenance_log 
            WHERE employee_id = ? AND maintenance_status_id = 2";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $handyman_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats['in_progress'] = $result->fetch_assoc()['count'];
    
    // Completed today
    $sql = "SELECT COUNT(*) as count FROM room_maintenance_log 
            WHERE employee_id = ? AND maintenance_status_id = 3 
            AND DATE(completed_at) = CURDATE()";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $handyman_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats['completed_today'] = $result->fetch_assoc()['count'];
    
    // Urgent repairs (Out of Order rooms)
    $sql = "SELECT COUNT(*) as count FROM rooms 
            WHERE room_status_id = 4"; // Out of Order
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    $stats['urgent'] = $result->fetch_assoc()['count'];
    
    echo json_encode(['success' => true, 'stats' => $stats]);
}

/**
 * Get active maintenance tasks for the handyman
 */
function getTasks($conn, $handyman_id) {
    $sql = "SELECT 
                rml.maintenance_id,
                rml.room_id,
                rml.maintenance_status_id,
                rml.scheduled_date,
                rml.started_at,
                rml.completed_at,
                rml.cost,
                rml.notes,
                r.room_number,
                r.floor_number,
                rt.type_name,
                ms.status_name,
                rs.status_name as room_status_name
            FROM room_maintenance_log rml
            JOIN rooms r ON rml.room_id = r.room_id
            JOIN room_types rt ON r.room_type_id = rt.room_type_id
            JOIN maintenance_status ms ON rml.maintenance_status_id = ms.maintenance_status_id
            JOIN room_status rs ON r.room_status_id = rs.room_status_id
            WHERE rml.employee_id = ? 
            AND rml.maintenance_status_id IN (1, 2) -- Scheduled or In Progress
            ORDER BY 
                CASE 
                    WHEN rs.status_name = 'Out of Order' THEN 1
                    WHEN rml.maintenance_status_id = 2 THEN 2 -- In Progress
                    ELSE 3
                END,
                rml.scheduled_date ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $handyman_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    
    echo json_encode(['success' => true, 'tasks' => $tasks]);
}

/**
 * Get rooms that need maintenance attention
 */
function getRoomsNeedingMaintenance($conn) {
    $sql = "SELECT 
                r.room_id,
                r.room_number,
                r.floor_number,
                rt.type_name,
                rs.status_name
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.room_type_id
            JOIN room_status rs ON r.room_status_id = rs.room_status_id
            WHERE r.room_status_id IN (4, 5) -- Out of Order or Under Maintenance
            ORDER BY 
                CASE 
                    WHEN r.room_status_id = 4 THEN 1 -- Out of Order first
                    ELSE 2
                END,
                r.room_number ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $rooms = [];
    while ($row = $result->fetch_assoc()) {
        $rooms[] = $row;
    }
    
    echo json_encode(['success' => true, 'rooms' => $rooms]);
}

/**
 * Update a maintenance task
 */
function updateTask($conn, $handyman_id) {
    $task_id = $_POST['task_id'] ?? '';
    $status = $_POST['status'] ?? '';
    $cost = $_POST['cost'] ?? null;
    $notes = $_POST['notes'] ?? '';
    
    if (empty($task_id) || empty($status)) {
        echo json_encode(['success' => false, 'message' => 'Task ID and status are required']);
        return;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Update maintenance log
        $sql = "UPDATE room_maintenance_log 
                SET maintenance_status_id = ?, cost = ?, notes = ?, updated_at = NOW()";
        
        $params = [$status];
        $types = "i";
        
        if ($cost !== null && $cost !== '') {
            $sql .= ", cost = ?";
            $params[] = $cost;
            $types .= "d";
        }
        
        if (!empty($notes)) {
            $sql .= ", notes = ?";
            $params[] = $notes;
            $types .= "s";
        }
        
        // If completing the task, set completed_at
        if ($status == 3) { // Completed
            $sql .= ", completed_at = NOW()";
        }
        
        $sql .= " WHERE maintenance_id = ? AND employee_id = ?";
        $params[] = $task_id;
        $params[] = $handyman_id;
        $types .= "ii";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Task not found or not authorized');
        }
        
        // If task is completed, update room status to Available
        if ($status == 3) {
            $room_sql = "UPDATE rooms r 
                        JOIN room_maintenance_log rml ON r.room_id = rml.room_id 
                        SET r.room_status_id = 1 
                        WHERE rml.maintenance_id = ?";
            $room_stmt = $conn->prepare($room_sql);
            $room_stmt->bind_param("i", $task_id);
            $room_stmt->execute();
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Task updated successfully']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * Start a maintenance task
 */
function startTask($conn, $handyman_id) {
    $task_id = $_POST['task_id'] ?? '';
    
    if (empty($task_id)) {
        echo json_encode(['success' => false, 'message' => 'Task ID is required']);
        return;
    }
    
    $sql = "UPDATE room_maintenance_log 
            SET maintenance_status_id = 2, started_at = NOW(), updated_at = NOW()
            WHERE maintenance_id = ? AND employee_id = ? AND maintenance_status_id = 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $task_id, $handyman_id);
    $stmt->execute();
    
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Task started successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Task not found or cannot be started']);
    }
}

/**
 * Complete a maintenance task
 */
function completeTask($conn, $handyman_id) {
    $task_id = $_POST['task_id'] ?? '';
    
    if (empty($task_id)) {
        echo json_encode(['success' => false, 'message' => 'Task ID is required']);
        return;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Update maintenance log
        $sql = "UPDATE room_maintenance_log 
                SET maintenance_status_id = 3, completed_at = NOW(), updated_at = NOW()
                WHERE maintenance_id = ? AND employee_id = ? AND maintenance_status_id = 2";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $task_id, $handyman_id);
        $stmt->execute();
        
        if ($stmt->affected_rows === 0) {
            throw new Exception('Task not found or not in progress');
        }
        
        // Update room status to Available
        $room_sql = "UPDATE rooms r 
                    JOIN room_maintenance_log rml ON r.room_id = rml.room_id 
                    SET r.room_status_id = 1 
                    WHERE rml.maintenance_id = ?";
        $room_stmt = $conn->prepare($room_sql);
        $room_stmt->bind_param("i", $task_id);
        $room_stmt->execute();
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Task completed successfully']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * Create a new maintenance task
 */
function createTask($conn, $handyman_id) {
    $room_id = $_POST['room_id'] ?? '';
    $description = $_POST['description'] ?? '';
    
    if (empty($room_id) || empty($description)) {
        echo json_encode(['success' => false, 'message' => 'Room ID and description are required']);
        return;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Create maintenance task
        $sql = "INSERT INTO room_maintenance_log 
                (room_id, maintenance_status_id, scheduled_date, notes, employee_id, created_at, updated_at) 
                VALUES (?, 1, CURDATE(), ?, ?, NOW(), NOW())";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isi", $room_id, $description, $handyman_id);
        $stmt->execute();
        
        // Update room status to Under Maintenance
        $room_sql = "UPDATE rooms SET room_status_id = 5 WHERE room_id = ?";
        $room_stmt = $conn->prepare($room_sql);
        $room_stmt->bind_param("i", $room_id);
        $room_stmt->execute();
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Maintenance task created successfully']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * Utility function to log errors
 */
function logError($message) {
    error_log(date('[Y-m-d H:i:s] ') . "Handyman API Error: " . $message . PHP_EOL, 3, "api_errors.log");
}
?>