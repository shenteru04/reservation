<?php
// api/admin/pages/menu-items.php - Enhanced Menu Items Management API
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
    $logFile = __DIR__ . '/../../../logs/menu-items.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[MENU-ITEMS] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
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
        // Get filter parameters
        $category = isset($_GET['category']) ? trim($_GET['category']) : '';
        $available_only = isset($_GET['available_only']) ? (bool)$_GET['available_only'] : false;
        
        // Build WHERE clause
        $whereConditions = [];
        $params = [];
        
        if (!empty($category)) {
            $whereConditions[] = "category = ?";
            $params[] = $category;
        }
        
        if ($available_only) {
            $whereConditions[] = "is_available = 1";
        }
        
        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        
        $stmt = $db->prepare("
            SELECT 
                mi.*,
                COUNT(ri.menu_id) as order_count
            FROM menu_items mi
            LEFT JOIN request_items ri ON mi.menu_id = ri.menu_id
            $whereClause
            GROUP BY mi.menu_id
            ORDER BY mi.category ASC, mi.item_name ASC
        ");
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $cleanedItems = [];
        foreach ($items as $item) {
            $cleanedItems[] = [
                'menu_id' => (int)$item['menu_id'],
                'item_name' => $item['item_name'],
                'description' => $item['description'] ?: '',
                'price' => (float)$item['price'],
                'category' => $item['category'] ?: 'General',
                'is_available' => (bool)$item['is_available'],
                'order_count' => (int)$item['order_count'],
                'created_at' => $item['created_at'],
                'updated_at' => $item['updated_at']
            ];
        }

        // Get categories for filter
        $categoriesStmt = $db->prepare("SELECT DISTINCT category FROM menu_items WHERE category IS NOT NULL AND category != '' ORDER BY category ASC");
        $categoriesStmt->execute();
        $categories = $categoriesStmt->fetchAll(PDO::FETCH_COLUMN);

        logError("Retrieved " . count($cleanedItems) . " menu items");

        echo json_encode([
            'success' => true,
            'menu_items' => $cleanedItems,
            'categories' => $categories,
            'total' => count($cleanedItems)
        ]);

    } catch (PDOException $e) {
        logError("Error retrieving menu items: " . $e->getMessage());
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
        $required = ['item_name', 'price'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || trim($input[$field]) === '') {
                throw new Exception("Missing required field: $field");
            }
        }
        
        // Validate price
        $price = floatval($input['price']);
        if ($price < 0) {
            throw new Exception('Price cannot be negative');
        }
        
        // Set defaults
        $description = trim($input['description'] ?? '');
        $category = trim($input['category'] ?? 'General');
        $isAvailable = isset($input['is_available']) ? (bool)$input['is_available'] : true;
        
        // Check if item name already exists in the same category
        $checkStmt = $db->prepare("SELECT menu_id FROM menu_items WHERE item_name = ? AND category = ?");
        $checkStmt->execute([trim($input['item_name']), $category]);
        if ($checkStmt->fetch()) {
            throw new Exception('Menu item with this name already exists in the same category');
        }
        
        // Insert new menu item
        $stmt = $db->prepare("
            INSERT INTO menu_items (item_name, description, price, category, is_available)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            trim($input['item_name']),
            $description,
            $price,
            $category,
            $isAvailable ? 1 : 0
        ]);
        
        $menuId = $db->lastInsertId();
        
        logError("Menu item created with ID: " . $menuId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Menu item created successfully',
            'menu_id' => $menuId
        ]);
        
    } catch (Exception $e) {
        logError("Error creating menu item: " . $e->getMessage());
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
        
        if (empty($input['menu_id'])) {
            throw new Exception('Missing menu_id');
        }
        
        $menuId = $input['menu_id'];
        
        // Build dynamic update query
        $updateFields = [];
        $updateValues = [];
        
        $allowedFields = ['item_name', 'description', 'price', 'category', 'is_available'];
        
        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                if ($field === 'price') {
                    $price = floatval($input[$field]);
                    if ($price < 0) {
                        throw new Exception('Price cannot be negative');
                    }
                    $updateFields[] = "$field = ?";
                    $updateValues[] = $price;
                } elseif ($field === 'is_available') {
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
        
        // Check if item name conflicts (if being updated)
        if (isset($input['item_name']) && isset($input['category'])) {
            $checkStmt = $db->prepare("SELECT menu_id FROM menu_items WHERE item_name = ? AND category = ? AND menu_id != ?");
            $checkStmt->execute([trim($input['item_name']), trim($input['category']), $menuId]);
            if ($checkStmt->fetch()) {
                throw new Exception('Menu item with this name already exists in the same category');
            }
        } elseif (isset($input['item_name'])) {
            // Get current category
            $currentStmt = $db->prepare("SELECT category FROM menu_items WHERE menu_id = ?");
            $currentStmt->execute([$menuId]);
            $current = $currentStmt->fetch(PDO::FETCH_ASSOC);
            if ($current) {
                $checkStmt = $db->prepare("SELECT menu_id FROM menu_items WHERE item_name = ? AND category = ? AND menu_id != ?");
                $checkStmt->execute([trim($input['item_name']), $current['category'], $menuId]);
                if ($checkStmt->fetch()) {
                    throw new Exception('Menu item with this name already exists in the same category');
                }
            }
        }
        
        // Update menu item
        $updateValues[] = $menuId;
        $sql = "UPDATE menu_items SET " . implode(', ', $updateFields) . " WHERE menu_id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($updateValues);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Menu item not found or no changes made');
        }
        
        logError("Menu item updated with ID: " . $menuId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Menu item updated successfully',
            'menu_id' => $menuId
        ]);
        
    } catch (Exception $e) {
        logError("Error updating menu item: " . $e->getMessage());
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
        
        if (!$input || empty($input['menu_id'])) {
            throw new Exception('Missing menu_id');
        }
        
        $menuId = $input['menu_id'];
        
        // Check if menu item is used in any orders
        $checkStmt = $db->prepare("SELECT COUNT(*) as count FROM request_items WHERE menu_id = ?");
        $checkStmt->execute([$menuId]);
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            throw new Exception('Cannot delete menu item that has been ordered');
        }
        
        // Delete menu item
        $stmt = $db->prepare("DELETE FROM menu_items WHERE menu_id = ?");
        $stmt->execute([$menuId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Menu item not found');
        }
        
        logError("Menu item deleted with ID: " . $menuId);
        
        echo json_encode([
            'success' => true,
            'message' => 'Menu item deleted successfully',
            'menu_id' => $menuId
        ]);
        
    } catch (Exception $e) {
        logError("Error deleting menu item: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
?>