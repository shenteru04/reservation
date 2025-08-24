<?php
// api/admin/pages/rooms.php - Enhanced Rooms Management API with Amenities
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
    $logFile = __DIR__ . '/../../../logs/rooms.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[ROOMS] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
        // Get pagination parameters
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(10, intval($_GET['limit']))) : 50;
        $offset = ($page - 1) * $limit;
        
        // Get filter parameters
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status_filter = isset($_GET['status']) ? intval($_GET['status']) : 0;
        $type_filter = isset($_GET['type']) ? intval($_GET['type']) : 0;
        $floor_filter = isset($_GET['floor']) ? intval($_GET['floor']) : 0;
        
        // Build WHERE clause
        $whereConditions = [];
        $params = [];
        
        if (!empty($search)) {
            $whereConditions[] = "(r.room_number LIKE ? OR rt.type_name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        if ($status_filter > 0) {
            $whereConditions[] = "r.room_status_id = ?";
            $params[] = $status_filter;
        }
        
        if ($type_filter > 0) {
            $whereConditions[] = "r.room_type_id = ?";
            $params[] = $type_filter;
        }
        
        if ($floor_filter > 0) {
            $whereConditions[] = "r.floor_number = ?";
            $params[] = $floor_filter;
        }
        
        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        
        // Get total count
        $countSql = "
            SELECT COUNT(*) as total
            FROM rooms r
            LEFT JOIN room_types rt ON r.room_type_id = rt.room_type_id
            LEFT JOIN room_status rs ON r.room_status_id = rs.room_status_id
            $whereClause
        ";
        
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalRooms = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get rooms with pagination
        $sql = "
            SELECT 
                r.room_id,
                r.room_number,
                r.room_type_id,
                r.room_status_id,
                r.floor_number,
                rt.type_name,
                rt.description as type_description,
                rt.price_per_night,
                rt.capacity,
                rs.status_name,
                rs.description as status_description
            FROM rooms r
            LEFT JOIN room_types rt ON r.room_type_id = rt.room_type_id
            LEFT JOIN room_status rs ON r.room_status_id = rs.room_status_id
            $whereClause
            ORDER BY r.floor_number ASC, r.room_number ASC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get amenities for each room
        $roomIds = array_column($rooms, 'room_id');
        $amenitiesData = [];
        
        if (!empty($roomIds)) {
            $amenitiesStmt = $db->prepare("
                SELECT 
                    ram.room_id,
                    ra.amenity_id,
                    ra.amenity_name,
                    ra.icon
                FROM room_amenities_mapping ram
                LEFT JOIN room_amenities ra ON ram.amenity_id = ra.amenity_id
                WHERE ram.room_id IN (" . str_repeat('?,', count($roomIds) - 1) . "?)
                AND ra.is_active = 1
                ORDER BY ra.amenity_name ASC
            ");
            
            $amenitiesStmt->execute($roomIds);
            $amenitiesResult = $amenitiesStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Group amenities by room_id
            foreach ($amenitiesResult as $amenity) {
                if (!isset($amenitiesData[$amenity['room_id']])) {
                    $amenitiesData[$amenity['room_id']] = [];
                }
                $amenitiesData[$amenity['room_id']][] = [
                    'amenity_id' => (int)$amenity['amenity_id'],
                    'amenity_name' => $amenity['amenity_name'],
                    'icon' => $amenity['icon']
                ];
            }
        }
        
        // Clean up the data and add amenities
        $cleanedRooms = [];
        foreach ($rooms as $room) {
            $cleanedRooms[] = [
                'room_id' => (int)$room['room_id'],
                'room_number' => $room['room_number'],
                'room_type_id' => (int)$room['room_type_id'],
                'room_status_id' => (int)$room['room_status_id'],
                'floor_number' => (int)$room['floor_number'],
                'type_name' => $room['type_name'] ?: 'Unknown Type',
                'type_description' => $room['type_description'] ?: '',
                'price_per_night' => (float)($room['price_per_night'] ?: 0),
                'capacity' => (int)($room['capacity'] ?: 1),
                'status_name' => $room['status_name'] ?: 'Unknown Status',
                'status_description' => $room['status_description'] ?: '',
                'amenities' => $amenitiesData[$room['room_id']] ?? []
            ];
        }
        
        $totalPages = ceil($totalRooms / $limit);
        
        logError("Retrieved " . count($cleanedRooms) . " rooms (page $page of $totalPages)");
        
        echo json_encode([
            'success' => true,
            'rooms' => $cleanedRooms,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'per_page' => $limit,
                'total_items' => (int)$totalRooms,
                'has_more' => $page < $totalPages
            ]
        ]);
        
    } catch (PDOException $e) {
        logError("Error retrieving rooms: " . $e->getMessage());
        throw $e;
    }
}

function handlePost($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        // Handle bulk room creation
        if (isset($input['bulk_create']) && $input['bulk_create']) {
            return handleBulkCreate($db, $input);
        }
        
        // Validate required fields
        $required = ['room_number', 'room_type_id', 'room_status_id', 'floor_number'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Check if room number already exists
        $checkStmt = $db->prepare("SELECT room_id FROM rooms WHERE room_number = ?");
        $checkStmt->execute([$input['room_number']]);
        if ($checkStmt->fetch()) {
            throw new Exception('Room number already exists');
        }
        
        // Validate foreign keys
        if (!validateRoomType($db, $input['room_type_id'])) {
            throw new Exception('Invalid room type');
        }
        
        // Start transaction
        $db->beginTransaction();
        
        // Insert new room
        $stmt = $db->prepare("
            INSERT INTO rooms (room_number, room_type_id, room_status_id, floor_number)
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['room_number'],
            $input['room_type_id'],
            $input['room_status_id'],
            $input['floor_number']
        ]);
        
        $roomId = $db->lastInsertId();
        
        // Handle amenities if provided
        if (isset($input['amenities']) && is_array($input['amenities']) && !empty($input['amenities'])) {
            $amenitiesStmt = $db->prepare("
                INSERT INTO room_amenities_mapping (room_id, amenity_id) VALUES (?, ?)
            ");
            
            foreach ($input['amenities'] as $amenityId) {
                if (validateAmenity($db, $amenityId)) {
                    $amenitiesStmt->execute([$roomId, $amenityId]);
                }
            }
        }
        
        $db->commit();
        
        logError("Room created with ID: " . $roomId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Room created successfully',
            'room_id' => $roomId
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollback();
        }
        logError("Error creating room: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function handleBulkCreate($db, $input) {
    try {
        if (empty($input['rooms']) || !is_array($input['rooms'])) {
            throw new Exception('No rooms data provided for bulk creation');
        }
        
        $db->beginTransaction();
        
        $stmt = $db->prepare("
            INSERT INTO rooms (room_number, room_type_id, room_status_id, floor_number)
            VALUES (?, ?, ?, ?)
        ");
        
        $created = 0;
        $errors = [];
        
        foreach ($input['rooms'] as $index => $room) {
            try {
                // Validate required fields
                if (empty($room['room_number']) || empty($room['room_type_id']) || 
                    empty($room['room_status_id']) || empty($room['floor_number'])) {
                    throw new Exception("Missing required fields");
                }
                
                // Check if room number already exists
                $checkStmt = $db->prepare("SELECT room_id FROM rooms WHERE room_number = ?");
                $checkStmt->execute([$room['room_number']]);
                if ($checkStmt->fetch()) {
                    throw new Exception("Room number already exists");
                }
                
                $stmt->execute([
                    $room['room_number'],
                    $room['room_type_id'],
                    $room['room_status_id'],
                    $room['floor_number']
                ]);
                
                // Handle amenities for bulk creation if provided
                if (isset($room['amenities']) && is_array($room['amenities']) && !empty($room['amenities'])) {
                    $roomId = $db->lastInsertId();
                    $amenitiesStmt = $db->prepare("
                        INSERT INTO room_amenities_mapping (room_id, amenity_id) VALUES (?, ?)
                    ");
                    
                    foreach ($room['amenities'] as $amenityId) {
                        if (validateAmenity($db, $amenityId)) {
                            $amenitiesStmt->execute([$roomId, $amenityId]);
                        }
                    }
                }
                
                $created++;
                
            } catch (Exception $e) {
                $errors[] = "Room " . ($room['room_number'] ?? $index) . ": " . $e->getMessage();
            }
        }
        
        if ($created > 0) {
            $db->commit();
            logError("Bulk created $created rooms");
        } else {
            $db->rollback();
        }
        
        echo json_encode([
            'success' => $created > 0,
            'message' => "$created rooms created successfully",
            'created_count' => $created,
            'errors' => $errors
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

function handlePut($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    if (empty($input['room_id'])) {
        throw new Exception('Missing room_id');
    }

    $roomId = $input['room_id'];
    
    // Verify room exists
    $checkStmt = $db->prepare("SELECT * FROM rooms WHERE room_id = ?");
    $checkStmt->execute([$roomId]);
    $existingRoom = $checkStmt->fetch();
    
    if (!$existingRoom) {
        throw new Exception('Room not found');
    }

    // Build update query
    $updateFields = [];
    $updateValues = [];
    $allowedFields = ['room_number', 'room_type_id', 'room_status_id', 'floor_number'];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            // Validate field values
            if ($input[$field] === '') {
                throw new Exception("Field $field cannot be empty");
            }
            $updateFields[] = "$field = ?";
            $updateValues[] = $input[$field];
        }
    }

    if (empty($updateFields)) {
        throw new Exception('No changes provided');
    }

    $db->beginTransaction();

    try {
        // Update room
        $updateValues[] = $roomId;
        $sql = "UPDATE rooms SET " . implode(', ', $updateFields) . " WHERE room_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);

        // Update amenities if provided
        if (isset($input['amenities'])) {
            // Delete existing mappings
            $deleteStmt = $db->prepare("DELETE FROM room_amenities_mapping WHERE room_id = ?");
            $deleteStmt->execute([$roomId]);
            
            // Insert new mappings
            if (!empty($input['amenities'])) {
                $amenityStmt = $db->prepare("INSERT INTO room_amenities_mapping (room_id, amenity_id) VALUES (?, ?)");
                foreach ($input['amenities'] as $amenityId) {
                    if (!is_numeric($amenityId)) {
                        throw new Exception("Invalid amenity ID");
                    }
                    $amenityStmt->execute([$roomId, $amenityId]);
                }
            }
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Room updated successfully',
            'room_id' => $roomId,
            'changes' => $updateFields
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleDelete($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['room_id'])) {
            throw new Exception('Missing room_id');
        }
        
        $roomId = $input['room_id'];
        
        // Check if room has active reservations
        $checkStmt = $db->prepare("
            SELECT COUNT(*) as count 
            FROM reservations 
            WHERE room_id = ? 
            AND reservation_status_id IN (1, 2, 3)
        ");
        $checkStmt->execute([$roomId]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete room with active reservations');
        }
        
        // Start transaction
        $db->beginTransaction();
        
        // Delete room amenities mapping (handled by CASCADE, but explicit is better)
        $deleteAmenitiesStmt = $db->prepare("DELETE FROM room_amenities_mapping WHERE room_id = ?");
        $deleteAmenitiesStmt->execute([$roomId]);
        
        // Delete room
        $stmt = $db->prepare("DELETE FROM rooms WHERE room_id = ?");
        $stmt->execute([$roomId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Room not found');
        }
        
        $db->commit();
        
        logError("Room deleted with ID: " . $roomId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Room deleted successfully',
            'room_id' => $roomId
        ]);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollback();
        }
        logError("Error deleting room: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function validateRoomType($db, $roomTypeId) {
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM room_types WHERE room_type_id = ?");
    $stmt->execute([$roomTypeId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result['count'] > 0;
}

function validateAmenity($db, $amenityId) {
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM room_amenities WHERE amenity_id = ? AND is_active = 1");
    $stmt->execute([$amenityId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result['count'] > 0;
}
?>