<?php
// api/user/hotel-services-public.php - Public Hotel Services API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

function logError($message) {
    $logFile = __DIR__ . '/../../logs/hotel-services-public.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[HOTEL_SERVICES_PUBLIC] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

// Load database configuration
$dbPaths = [
    dirname(dirname(dirname(dirname(__DIR__)))) . '/config/db.php',
    dirname(dirname(dirname(__DIR__))) . '/config/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/reservation/api/config/db.php',
    $_SERVER['DOCUMENT_ROOT'] . '/reservation/config/db.php'
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
    logError("Database connection established");
    
    // Create hotel_services table if it doesn't exist
    $createTableSQL = "
        CREATE TABLE IF NOT EXISTS hotel_services (
            service_id INT AUTO_INCREMENT PRIMARY KEY,
            service_name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            price DECIMAL(10,2) DEFAULT 0.00,
            is_complimentary BOOLEAN DEFAULT FALSE
        )
    ";
    $db->exec($createTableSQL);
    logError("Ensured hotel_services table exists");
    
    // Check if table is accessible
    $checkTableSQL = "SHOW TABLES LIKE 'hotel_services'";
    $tableExists = $db->query($checkTableSQL)->rowCount() > 0;
    if (!$tableExists) {
        logError("hotel_services table not found after creation attempt");
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Table creation failed']);
        exit();
    }
    
    $stmt = $db->prepare("
        SELECT 
            service_id,
            service_name,
            description,
            price,
            is_complimentary
        FROM hotel_services
        WHERE is_complimentary = 1 OR price > 0
        ORDER BY is_complimentary DESC, service_name ASC
    ");
    $stmt->execute();
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $cleanedServices = [];
    foreach ($services as $service) {
        $cleanedServices[] = [
            'service_id' => (int)$service['service_id'],
            'service_name' => $service['service_name'],
            'description' => $service['description'] ?: '',
            'price' => (float)$service['price'],
            'is_complimentary' => (bool)$service['is_complimentary']
        ];
    }
    
    logError("Retrieved " . count($cleanedServices) . " hotel services");
    
    echo json_encode([
        'success' => true,
        'services' => $cleanedServices,
        'total' => count($cleanedServices)
    ]);
    
} catch (PDOException $e) {
    logError("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred',
        'debug' => $e->getMessage()
    ]);
} catch (Exception $e) {
    logError("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error occurred',
        'debug' => $e->getMessage()
    ]);
}
?>