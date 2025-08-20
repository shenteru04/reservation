<?php
// api/admin/pages/room-types.php - Room Types Management API
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function logError($message) {
    $logFile = __DIR__ . '/../../../logs/room-types.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[ROOM-TYPES] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    logError("Unauthorized access attempt");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

$dbPaths = [
    __DIR__ . '/../../../config/db.php',
    __DIR__ . '/../../config/db.php',
    dirname(dirname(dirname(__DIR__))) . '/config/db.php',
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
        $stmt = $db->prepare("
            SELECT 
                rt.*,
                COUNT(r.room_id) as room_count
            FROM room_types rt
            LEFT JOIN rooms r ON rt.room_type_id = r.room_type_id
            GROUP BY rt.room_type_id
            ORDER BY rt.type_name ASC
        ");
        $stmt->execute();
        $roomTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cleanedRoomTypes = [];
        foreach ($roomTypes as $type) {
            $cleanedRoomTypes[] = [
                'room_type_id' => (int)$type['room_type_id'],
                'type_name' => $type['type_name'],
                'description' => $type['description'] ?: '',
                'price_per_night' => (float)$type['price_per_night'],
                'capacity' => (int)$type['capacity'],
                'room_count' => (int)$type['room_count']
            ];
        }

        logError("Retrieved " . count($cleanedRoomTypes) . " room types");

        echo json_encode([
            'success' => true,
            'roomTypes' => $cleanedRoomTypes,
            'total' => count($cleanedRoomTypes)
        ]);

    } catch (PDOException $e) {
        logError("Error retrieving room types: " . $e->getMessage());
        throw $e;
    }
}

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        // Validate required fields
        $required = ['type_name', 'price_per_night', 'capacity'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || $input[$field] === '') {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Validate data types
        if (!is_numeric($input['price_per_night']) || $input['price_per_night'] < 0) {
            throw new Exception('Price per night must be a positive number');
        }
        
        if (!is_numeric($input['capacity']) || $input['capacity'] < 1) {
            throw new Exception('Capacity must be at least 1');
        }
        
        // Check if type name already exists
        $checkStmt = $db->prepare("SELECT room_type_id FROM room_types WHERE type_name = ?");
        $checkStmt->execute([$input['type_name']]);
        if ($checkStmt->fetch()) {
            throw new Exception('Room type name already exists');
        }
        
        // Insert new room type
        $stmt = $db->prepare("
            INSERT INTO room_types (type_name, description, price_per_night, capacity)
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['type_name'],
            $input['description'] ?? '',
            $input['price_per_night'],
            $input['capacity']
        ]);
        
        $roomTypeId = $db->lastInsertId();
        
        logError("Room type created with ID: " . $roomTypeId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Room type created successfully',
            'room_type_id' => $roomTypeId
        ]);
        
    } catch (Exception $e) {
        logError("Error creating room type: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function handlePut($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        if (empty($input['room_type_id'])) {
            throw new Exception('Missing room_type_id');
        }
        
        $roomTypeId = $input['room_type_id'];
        
        // Build dynamic update query
        $updateFields = [];
        $updateValues = [];
        
        $allowedFields = ['type_name', 'description', 'price_per_night', 'capacity'];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updateFields[] = "$field = ?";
                $updateValues[] = $input[$field];
            }
        }
        
        if (empty($updateFields)) {
            throw new Exception('No fields to update');
        }
        
        // Validate data if provided
        if (isset($input['price_per_night'])) {
            if (!is_numeric($input['price_per_night']) || $input['price_per_night'] < 0) {
                throw new Exception('Price per night must be a positive number');
            }
        }
        
        if (isset($input['capacity'])) {
            if (!is_numeric($input['capacity']) || $input['capacity'] < 1) {
                throw new Exception('Capacity must be at least 1');
            }
        }
        
        // Check if type name conflicts (if being updated)
        if (isset($input['type_name'])) {
            $checkStmt = $db->prepare("SELECT room_type_id FROM room_types WHERE type_name = ? AND room_type_id != ?");
            $checkStmt->execute([$input['type_name'], $roomTypeId]);
            if ($checkStmt->fetch()) {
                throw new Exception('Room type name already exists');
            }
        }
        
        // Update room type
        $updateValues[] = $roomTypeId;
        $sql = "UPDATE room_types SET " . implode(', ', $updateFields) . " WHERE room_type_id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Room type not found or no changes made');
        }
        
        logError("Room type updated with ID: " . $roomTypeId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Room type updated successfully',
            'room_type_id' => $roomTypeId
        ]);
        
    } catch (Exception $e) {
        logError("Error updating room type: " . $e->getMessage());
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
        
        if (!$input || empty($input['room_type_id'])) {
            throw new Exception('Missing room_type_id');
        }
        
        $roomTypeId = $input['room_type_id'];
        
        // Check if room type is used by any rooms
        $checkStmt = $db->prepare("SELECT COUNT(*) as count FROM rooms WHERE room_type_id = ?");
        $checkStmt->execute([$roomTypeId]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete room type that is being used by existing rooms');
        }
        
        // Delete room type
        $stmt = $db->prepare("DELETE FROM room_types WHERE room_type_id = ?");
        $stmt->execute([$roomTypeId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Room type not found');
        }
        
        logError("Room type deleted with ID: " . $roomTypeId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Room type deleted successfully',
            'room_type_id' => $roomTypeId
        ]);
        
    } catch (Exception $e) {
        logError("Error deleting room type: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
?>