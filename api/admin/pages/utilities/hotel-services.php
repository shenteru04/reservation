<?php
// api/admin/pages/hotel-services.php - Enhanced Hotel Services Management API
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
    $logFile = __DIR__ . '/../../../logs/hotel-services.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[HOTEL-SERVICES] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
                hs.*,
                COUNT(ri.service_id) as usage_count
            FROM hotel_services hs
            LEFT JOIN request_items ri ON hs.service_id = ri.service_id
            GROUP BY hs.service_id
            ORDER BY hs.is_complimentary DESC, hs.service_name ASC
        ");
        $stmt->execute();
        $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cleanedServices = [];
        foreach ($services as $service) {
            $cleanedServices[] = [
                'service_id' => (int)$service['service_id'],
                'service_name' => $service['service_name'],
                'description' => $service['description'] ?: '',
                'fee' => (float)$service['fee'],
                'is_complimentary' => (bool)$service['is_complimentary'],
                'usage_count' => (int)$service['usage_count']
            ];
        }

        logError("Retrieved " . count($cleanedServices) . " hotel services");

        echo json_encode([
            'success' => true,
            'services' => $cleanedServices,
            'total' => count($cleanedServices)
        ]);

    } catch (PDOException $e) {
        logError("Error retrieving hotel services: " . $e->getMessage());
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
        $required = ['service_name'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || trim($input[$field]) === '') {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Set defaults
        $fee = isset($input['fee']) ? floatval($input['fee']) : 0.00;
        $isComplimentary = isset($input['is_complimentary']) ? (bool)$input['is_complimentary'] : false;
        
        // Validate fee
        if ($fee < 0) {
            throw new Exception('Fee cannot be negative');
        }
        
        // If service is complimentary, fee should be 0
        if ($isComplimentary && $fee > 0) {
            $fee = 0.00;
        }
        
        // Check if service name already exists
        $checkStmt = $db->prepare("SELECT service_id FROM hotel_services WHERE service_name = ?");
        $checkStmt->execute([trim($input['service_name'])]);
        if ($checkStmt->fetch()) {
            throw new Exception('Service name already exists');
        }
        
        // Insert new service
        $stmt = $db->prepare("
            INSERT INTO hotel_services (service_name, description, fee, is_complimentary)
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            trim($input['service_name']),
            trim($input['description'] ?? ''),
            $fee,
            $isComplimentary ? 1 : 0
        ]);
        
        $serviceId = $db->lastInsertId();
        
        logError("Hotel service created with ID: " . $serviceId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Hotel service created successfully',
            'service_id' => $serviceId
        ]);
        
    } catch (Exception $e) {
        logError("Error creating hotel service: " . $e->getMessage());
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
        
        if (empty($input['service_id'])) {
            throw new Exception('Missing service_id');
        }
        
        $serviceId = $input['service_id'];
        
        // Build dynamic update query
        $updateFields = [];
        $updateValues = [];
        
        $allowedFields = ['service_name', 'description', 'fee', 'is_complimentary'];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                if ($field === 'fee') {
                    $fee = floatval($input[$field]);
                    if ($fee < 0) {
                        throw new Exception('Fee cannot be negative');
                    }
                    $updateFields[] = "$field = ?";
                    $updateValues[] = $fee;
                } elseif ($field === 'is_complimentary') {
                    $updateFields[] = "$field = ?";
                    $updateValues[] = (bool)$input[$field] ? 1 : 0;
                } else {
                    $updateFields[] = "$field = ?";
                    $updateValues[] = trim($input[$field]);
                }
            }
        }
        
        if (empty($updateFields)) {
            throw new Exception('No fields to update');
        }
        
        // If service is being set to complimentary, set fee to 0
        if (isset($input['is_complimentary']) && $input['is_complimentary'] && !isset($input['fee'])) {
            $updateFields[] = "fee = ?";
            $updateValues[] = 0.00;
        }
        
        // Check if service name conflicts (if being updated)
        if (isset($input['service_name'])) {
            $checkStmt = $db->prepare("SELECT service_id FROM hotel_services WHERE service_name = ? AND service_id != ?");
            $checkStmt->execute([trim($input['service_name']), $serviceId]);
            if ($checkStmt->fetch()) {
                throw new Exception('Service name already exists');
            }
        }
        
        // Update service
        $updateValues[] = $serviceId;
        $sql = "UPDATE hotel_services SET " . implode(', ', $updateFields) . " WHERE service_id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Service not found or no changes made');
        }
        
        logError("Hotel service updated with ID: " . $serviceId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Hotel service updated successfully',
            'service_id' => $serviceId
        ]);
        
    } catch (Exception $e) {
        logError("Error updating hotel service: " . $e->getMessage());
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
        
        if (!$input || empty($input['service_id'])) {
            throw new Exception('Missing service_id');
        }
        
        $serviceId = $input['service_id'];
        
        // Check if service is used in any requests
        $checkStmt = $db->prepare("SELECT COUNT(*) as count FROM request_items WHERE service_id = ?");
        $checkStmt->execute([$serviceId]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete service that has been used in requests');
        }
        
        // Delete service
        $stmt = $db->prepare("DELETE FROM hotel_services WHERE service_id = ?");
        $stmt->execute([$serviceId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Service not found');
        }
        
        logError("Hotel service deleted with ID: " . $serviceId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Hotel service deleted successfully',
            'service_id' => $serviceId
        ]);
        
    } catch (Exception $e) {
        logError("Error deleting hotel service: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
?>