<?php
// api/user/menu-items-public.php - Public Menu Items API
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
    $logFile = __DIR__ . '/../logs/menu-items-public.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[MENU_ITEMS_PUBLIC] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
    
    // Get filter parameters
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    $available_only = isset($_GET['available_only']) ? (bool)$_GET['available_only'] : true;
    
    // Build WHERE clause
    $whereConditions = ['is_available = 1']; // Default to available items only
    $params = [];
    
    if (!empty($category)) {
        $whereConditions[] = "category = ?";
        $params[] = $category;
    }
    
    $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
    
    $stmt = $db->prepare("
        SELECT 
            menu_id,
            item_name,
            description,
            price,
            category,
            is_available,
            created_at,
            updated_at
        FROM menu_items
        $whereClause
        ORDER BY category ASC, item_name ASC
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($items === false) {
        logError("Failed to fetch menu items");
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to fetch menu items']);
        exit();
    }
    
    $cleanedItems = [];
    foreach ($items as $item) {
        $cleanedItems[] = [
            'menu_id' => (int)$item['menu_id'],
            'item_name' => $item['item_name'],
            'description' => $item['description'] ?: '',
            'price' => (float)$item['price'],
            'category' => $item['category'] ?: 'General',
            'is_available' => (bool)$item['is_available'],
            'created_at' => $item['created_at'],
            'updated_at' => $item['updated_at']
        ];
    }
    
    // Get categories for filter
    $categoriesStmt = $db->prepare("SELECT DISTINCT category FROM menu_items WHERE category IS NOT NULL AND category != '' AND is_available = 1 ORDER BY category ASC");
    $categoriesStmt->execute();
    $categories = $categoriesStmt->fetchAll(PDO::FETCH_COLUMN);
    
    logError("Retrieved " . count($cleanedItems) . " menu items");
    
    echo json_encode([
        'success' => true,
        'menu_items' => $cleanedItems,
        'categories' => $categories,
        'total' => count($cleanedItems)
    ]);
    
} catch (Exception $e) {
    logError("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred',
        'debug' => $e->getMessage()
    ]);
}
?>