<?php
// api/user/room-types-public.php - Public Room Types API
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
    $logFile = __DIR__ . '/../logs/room-types-public.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[ROOM_TYPES_PUBLIC] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        handlePost($db);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
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
    $stmt = $db->prepare("SELECT room_type_id, type_name, description, price_per_night, capacity FROM room_types ORDER BY type_name ASC");
    $stmt->execute();
    $roomTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($roomTypes === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to fetch room types']);
        return; 
}

    $cleanedRoomTypes = [];
    foreach ($roomTypes as $type) {
        $cleanedRoomTypes[] = [
            'room_type_id' => (int)$type['room_type_id'],
            'type_name' => $type['type_name'],
            'description' => $type['description'] ?: '',
            'price_per_night' => (float)$type['price_per_night'],
            'capacity' => (int)$type['capacity']
        ];
    }

    echo json_encode([
        'success' => true,
        'roomTypes' => $cleanedRoomTypes,
        'total' => count($cleanedRoomTypes)
    ]);
}
?>