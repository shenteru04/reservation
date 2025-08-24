<?php
// api/admin/pages/utilities/hotel-services.php - Fixed Hotel Services Management API
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

// Check authentication
if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    logError("Unauthorized access attempt");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

// Database connection paths
$dbPaths = [
    dirname(dirname(dirname(dirname(dirname(__DIR__))))) . '/config/db.php',
    dirname(dirname(dirname(dirname(__DIR__)))) . '/config/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/reservation/api/config/db.php'
];

$dbLoaded = false;
foreach ($dbPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $dbLoaded = true;
        logError("Database config loaded from: " . $path);
        break;
    }
}

if (!$dbLoaded) {
    logError("Database configuration file not found in paths: " . implode(', ', $dbPaths));
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database configuration not found']);
    exit();
}

try {
    $db = getDB();
    
    // Create hotel_services table if it doesn't exist
    $createTableSQL = "
        CREATE TABLE IF NOT EXISTS hotel_services (
            service_id INT AUTO_INCREMENT PRIMARY KEY,
            service_name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            price DECIMAL(10,2) DEFAULT 0.00,
            is_complimentary BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ";
    $db->exec($createTableSQL);
    
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
        // First check if request_items table exists
        $checkTableSQL = "SHOW TABLES LIKE 'request_items'";
        $tableExists = $db->query($checkTableSQL)->rowCount() > 0;
        
        if ($tableExists) {
            $stmt = $db->prepare("
                SELECT 
                    hs.*,
                    COALESCE(COUNT(ri.service_id), 0) as usage_count
                FROM hotel_services hs
                LEFT JOIN request_items ri ON hs.service_id = ri.service_id
                GROUP BY hs.service_id
                ORDER BY hs.is_complimentary DESC, hs.service_name ASC
            ");
        } else {
            // If request_items table doesn't exist, just get services without usage count
            $stmt = $db->prepare("
                SELECT 
                    *,
                    0 as usage_count
                FROM hotel_services
                ORDER BY is_complimentary DESC, service_name ASC
            ");
        }
        
        $stmt->execute();
        $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cleanedServices = [];
        foreach ($services as $service) {
            $cleanedServices[] = [
                'service_id' => (int)$service['service_id'],
                'service_name' => $service['service_name'],
                'description' => $service['description'] ?: '',
                'price' => (float)$service['price'],
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
        // Get raw input and decode
        $inputData = file_get_contents('php://input');
        logError("Raw POST input: " . $inputData);
        
        $input = json_decode($inputData, true);
        
        if (!$input) {
            logError("JSON decode error: " . json_last_error_msg());
            throw new Exception('Invalid JSON input: ' . json_last_error_msg());
        }
        
        logError("Decoded POST data: " . print_r($input, true));
        
        // Validate required fields
        if (!isset($input['service_name']) || trim($input['service_name']) === '') {
            throw new Exception("Missing required field: service_name");
        }
        
        $serviceName = trim($input['service_name']);
        $description = isset($input['description']) ? trim($input['description']) : '';
        $isComplimentary = isset($input['is_complimentary']) ? (bool)$input['is_complimentary'] : false;
        
        // Handle price logic
        $price = 0.00;
        if (!$isComplimentary) {
            if (isset($input['price'])) {
                $price = floatval($input['price']);
                if ($price < 0) {
                    throw new Exception('Price cannot be negative');
                }
            }
        }
        
        logError("Processing service: Name='$serviceName', Description='$description', Price=$price, Complimentary=" . ($isComplimentary ? 'true' : 'false'));
        
        // Check if service name already exists
        $checkStmt = $db->prepare("SELECT service_id FROM hotel_services WHERE service_name = ?");
        $checkStmt->execute([$serviceName]);
        if ($checkStmt->fetch()) {
            throw new Exception('Service name already exists');
        }
        
        // Insert new service
        $stmt = $db->prepare("
            INSERT INTO hotel_services (service_name, description, price, is_complimentary)
            VALUES (?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $serviceName,
            $description,
            $price,
            $isComplimentary ? 1 : 0
        ]);
        
        if (!$result) {
            logError("Insert failed: " . print_r($stmt->errorInfo(), true));
            throw new Exception('Failed to insert service');
        }
        
        $serviceId = $db->lastInsertId();
        
        logError("Hotel service created successfully with ID: " . $serviceId);
        
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
        $inputData = file_get_contents('php://input');
        logError("Raw PUT input: " . $inputData);
        
        $input = json_decode($inputData, true);
        
        if (!$input) {
            logError("JSON decode error: " . json_last_error_msg());
            throw new Exception('Invalid JSON input: ' . json_last_error_msg());
        }
        
        if (empty($input['service_id'])) {
            throw new Exception('Missing service_id');
        }
        
        $serviceId = $input['service_id'];
        
        // Get current service data
        $currentStmt = $db->prepare("SELECT * FROM hotel_services WHERE service_id = ?");
        $currentStmt->execute([$serviceId]);
        $currentService = $currentStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$currentService) {
            throw new Exception('Service not found');
        }
        
        // Build dynamic update query
        $updateFields = [];
        $updateValues = [];
        
        // Handle service name update
        if (isset($input['service_name']) && trim($input['service_name']) !== '') {
            $serviceName = trim($input['service_name']);
            // Check if service name conflicts
            $checkStmt = $db->prepare("SELECT service_id FROM hotel_services WHERE service_name = ? AND service_id != ?");
            $checkStmt->execute([$serviceName, $serviceId]);
            if ($checkStmt->fetch()) {
                throw new Exception('Service name already exists');
            }
            $updateFields[] = "service_name = ?";
            $updateValues[] = $serviceName;
        }
        
        // Handle description update
        if (isset($input['description'])) {
            $updateFields[] = "description = ?";
            $updateValues[] = trim($input['description']);
        }
        
        // Handle complimentary status and price logic
        $newIsComplimentary = isset($input['is_complimentary']) ? (bool)$input['is_complimentary'] : (bool)$currentService['is_complimentary'];
        
        if (isset($input['is_complimentary'])) {
            $updateFields[] = "is_complimentary = ?";
            $updateValues[] = $newIsComplimentary ? 1 : 0;
            
            if ($newIsComplimentary) {
                // If marking as complimentary, set price to 0
                $updateFields[] = "price = ?";
                $updateValues[] = 0.00;
            } else {
                // If marking as not complimentary, use provided price or keep current if > 0
                if (isset($input['price'])) {
                    $newPrice = floatval($input['price']);
                    if ($newPrice < 0) {
                        throw new Exception('Price cannot be negative');
                    }
                    $updateFields[] = "price = ?";
                    $updateValues[] = $newPrice;
                } elseif ($currentService['price'] == 0) {
                    throw new Exception('Price is required for non-complimentary services');
                }
            }
        } elseif (isset($input['price'])) {
            // Only updating price, not complimentary status
            if ($newIsComplimentary) {
                throw new Exception('Cannot set price for complimentary services');
            }
            $newPrice = floatval($input['price']);
            if ($newPrice < 0) {
                throw new Exception('Price cannot be negative');
            }
            $updateFields[] = "price = ?";
            $updateValues[] = $newPrice;
        }
        
        if (empty($updateFields)) {
            throw new Exception('No fields to update');
        }
        
        // Update service
        $updateValues[] = $serviceId;
        $sql = "UPDATE hotel_services SET " . implode(', ', $updateFields) . " WHERE service_id = ?";
        
        logError("Update SQL: " . $sql . " with values: " . print_r($updateValues, true));
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($updateValues);
        
        if (!$result) {
            logError("Update failed: " . print_r($stmt->errorInfo(), true));
            throw new Exception('Failed to update service');
        }
        
        if ($stmt->rowCount() === 0) {
            logError("No rows affected by update");
        }
        
        logError("Hotel service updated successfully with ID: " . $serviceId);
        
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
        $inputData = file_get_contents('php://input');
        $input = json_decode($inputData, true);
        
        if (!$input || empty($input['service_id'])) {
            throw new Exception('Missing service_id');
        }
        
        $serviceId = $input['service_id'];
        
        // Check if request_items table exists before checking usage
        $checkTableSQL = "SHOW TABLES LIKE 'request_items'";
        $tableExists = $db->query($checkTableSQL)->rowCount() > 0;
        
        if ($tableExists) {
            // Check if service is used in any requests
            $checkStmt = $db->prepare("SELECT COUNT(*) as count FROM request_items WHERE service_id = ?");
            $checkStmt->execute([$serviceId]);
            $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                throw new Exception('Cannot delete service that has been used in requests');
            }
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