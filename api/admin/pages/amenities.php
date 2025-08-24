<?php
// api/admin/pages/amenities.php - Room Amenities Management API
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
    $logFile = __DIR__ . '/../../../logs/amenities.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[AMENITIES] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
        // Get amenities with optional filters
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $active_only = isset($_GET['active_only']) ? filter_var($_GET['active_only'], FILTER_VALIDATE_BOOLEAN) : true;
        
        $whereConditions = [];
        $params = [];
        
        if (!empty($search)) {
            $whereConditions[] = "amenity_name LIKE ?";
            $params[] = "%$search%";
        }
        
        if ($active_only) {
            $whereConditions[] = "is_active = 1";
        }
        
        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        
        $sql = "
            SELECT 
                amenity_id,
                amenity_name,
                description,
                icon,
                is_active,
                created_at,
                updated_at
            FROM room_amenities
            $whereClause
            ORDER BY amenity_name ASC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $amenities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Clean up the data
        $cleanedAmenities = [];
        foreach ($amenities as $amenity) {
            $cleanedAmenities[] = [
                'amenity_id' => (int)$amenity['amenity_id'],
                'amenity_name' => $amenity['amenity_name'],
                'description' => $amenity['description'],
                'icon' => $amenity['icon'],
                'is_active' => (bool)$amenity['is_active'],
                'created_at' => $amenity['created_at'],
                'updated_at' => $amenity['updated_at']
            ];
        }
        
        logError("Retrieved " . count($cleanedAmenities) . " amenities");
        
        echo json_encode([
            'success' => true,
            'amenities' => $cleanedAmenities
        ]);
        
    } catch (PDOException $e) {
        logError("Error retrieving amenities: " . $e->getMessage());
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
        if (empty($input['amenity_name'])) {
            throw new Exception('Amenity name is required');
        }
        
        // Check if amenity name already exists
        $checkStmt = $db->prepare("SELECT amenity_id FROM room_amenities WHERE amenity_name = ?");
        $checkStmt->execute([$input['amenity_name']]);
        if ($checkStmt->fetch()) {
            throw new Exception('Amenity name already exists');
        }
        
        // Insert new amenity
        $stmt = $db->prepare("
            INSERT INTO room_amenities (amenity_name, description, icon, is_active)
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['amenity_name'],
            $input['description'] ?? null,
            $input['icon'] ?? 'fas fa-star',
            isset($input['is_active']) ? (bool)$input['is_active'] : true
        ]);
        
        $amenityId = $db->lastInsertId();
        
        logError("Amenity created with ID: " . $amenityId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Amenity created successfully',
            'amenity_id' => $amenityId
        ]);
        
    } catch (Exception $e) {
        logError("Error creating amenity: " . $e->getMessage());
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
        
        if (empty($input['amenity_id'])) {
            throw new Exception('Missing amenity_id');
        }
        
        $amenityId = $input['amenity_id'];
        
        // Build dynamic update query
        $updateFields = [];
        $updateValues = [];
        
        $allowedFields = ['amenity_name', 'description', 'icon', 'is_active'];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $updateFields[] = "$field = ?";
                if ($field === 'is_active') {
                    $updateValues[] = (bool)$input[$field];
                } else {
                    $updateValues[] = $input[$field];
                }
            }
        }
        
        if (empty($updateFields)) {
            throw new Exception('No fields to update');
        }
        
        // Check if amenity name conflicts (if being updated)
        if (isset($input['amenity_name'])) {
            $checkStmt = $db->prepare("SELECT amenity_id FROM room_amenities WHERE amenity_name = ? AND amenity_id != ?");
            $checkStmt->execute([$input['amenity_name'], $amenityId]);
            if ($checkStmt->fetch()) {
                throw new Exception('Amenity name already exists');
            }
        }
        
        // Update amenity
        $updateValues[] = $amenityId;
        $sql = "UPDATE room_amenities SET " . implode(', ', $updateFields) . " WHERE amenity_id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Amenity not found or no changes made');
        }
        
        logError("Amenity updated with ID: " . $amenityId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Amenity updated successfully',
            'amenity_id' => $amenityId
        ]);
        
    } catch (Exception $e) {
        logError("Error updating amenity: " . $e->getMessage());
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
        
        if (!$input || empty($input['amenity_id'])) {
            throw new Exception('Missing amenity_id');
        }
        
        $amenityId = $input['amenity_id'];
        
        // Check if amenity is being used by rooms
        $checkStmt = $db->prepare("
            SELECT COUNT(*) as count 
            FROM room_amenities_mapping 
            WHERE amenity_id = ?
        ");
        $checkStmt->execute([$amenityId]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            // Instead of deleting, deactivate the amenity
            $updateStmt = $db->prepare("UPDATE room_amenities SET is_active = 0 WHERE amenity_id = ?");
            $updateStmt->execute([$amenityId]);
            
            if ($updateStmt->rowCount() === 0) {
                throw new Exception('Amenity not found');
            }
            
            logError("Amenity deactivated (in use) with ID: " . $amenityId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Amenity deactivated (cannot delete - in use by rooms)',
                'amenity_id' => $amenityId
            ]);
            
        } else {
            // Safe to delete - not being used
            $stmt = $db->prepare("DELETE FROM room_amenities WHERE amenity_id = ?");
            $stmt->execute([$amenityId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('Amenity not found');
            }
            
            logError("Amenity deleted with ID: " . $amenityId);
            
            echo json_encode([
                'success' => true,
                'message' => 'Amenity deleted successfully',
                'amenity_id' => $amenityId
            ]);
        }
        
    } catch (Exception $e) {
        logError("Error deleting amenity: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
?>