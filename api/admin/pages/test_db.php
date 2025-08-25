<?php
// test-db.php - Simple database connection test
header('Content-Type: application/json');

try {
    echo "Testing database connection...\n";
    
    // Test require_once with different paths
    $config_paths = [
        '../config/db.php',
        '../../config/db.php',
        '../../../config/db.php'
    ];
    
    foreach ($config_paths as $path) {
        if (file_exists($path)) {
            echo "Found config at: $path\n";
            require_once $path;
            break;
        }
    }
    
    if (function_exists('getDB')) {
        $db = getDB();
        echo "Database connected successfully!\n";
        
        // Test query
        $stmt = $db->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo json_encode([
            'success' => true,
            'tables' => $tables,
            'message' => 'Database test successful'
        ]);
    } else {
        throw new Exception('getDB function not found');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>