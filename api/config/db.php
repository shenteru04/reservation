<?php
// config/db.php - Fixed Database Configuration

class Database {
    private static $instance = null;
    private $connection;
    
    // Database configuration
    private $host = 'localhost';
    private $dbname = 'hotel_management';
    private $username = 'root';  // Default XAMPP username
    private $password = '';      // Default XAMPP password (empty)
    
    private function __construct() {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            
            // Test the connection
            $this->connection->query("SELECT 1");
            
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection error: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance->connection;
    }
    
    // Prevent cloning of the instance
    private function __clone() {}
    
    // Prevent unserializing of the instance
    public function __wakeup() {}
}

// Helper function for easy database access
function getDB() {
    return Database::getInstance();
}

// API Response helper function
function apiResponse($status, $message, $data = null) {
    $response = [
        'success' => $status === 'success',
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if ($status === 'error') {
        $response['error'] = $message;
    }
    
    return $response;
}

// Test connection and log result
try {
    $db = getDB();
    error_log("Database connection successful at " . date('Y-m-d H:i:s'));
} catch (Exception $e) {
    error_log("Database connection failed at " . date('Y-m-d H:i:s') . ": " . $e->getMessage());
}
?>