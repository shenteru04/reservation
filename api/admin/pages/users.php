<?php
// api/admin/pages/users.php - User Management API
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Function to log errors
function logError($message) {
    $logFile = __DIR__ . '/../../../logs/users.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    error_log("[USERS] " . date('Y-m-d H:i:s') . " - " . $message . "\n", 3, $logFile);
}

// Check authentication
if (!isset($_SESSION['user_id']) || !isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    logError("Unauthorized access attempt");
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

// Check if user is admin (role_id = 1)
if (!isset($_SESSION['role_id']) || $_SESSION['role_id'] != 1) {
    logError("Non-admin user attempted to access users management");
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Access denied. Admin privileges required.']);
    exit();
}

// Load database configuration - Updated paths for pages subdirectory
$dbPaths = [
    __DIR__ . '/../../../config/db.php',
    __DIR__ . '/../../config/db.php',
    __DIR__ . '/../config/db.php',
    dirname(dirname(dirname(__DIR__))) . '/config/db.php',
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
    if (!$db) {
        throw new Exception('Database connection failed - getDB() returned null');
    }
    logError("Database connection established for users management");
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetUsers($db);
            break;
        case 'POST':
            handleCreateUser($db);
            break;
        case 'PUT':
            handleUpdateUser($db);
            break;
        case 'DELETE':
            handleDeleteUser($db);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
            break;
    }
    
} catch (PDOException $e) {
    logError("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed',
        'message' => 'Unable to process request'
    ]);
} catch (Exception $e) {
    logError("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error occurred',
        'message' => 'Unable to process request'
    ]);
}

function handleGetUsers($db) {
    try {
        logError("Fetching all users");
        
        $stmt = $db->prepare("
            SELECT 
                e.employee_id,
                e.first_name,
                e.last_name,
                e.email,
                e.phone_num,
                e.role_id,
                e.is_active,
                e.created_at,
                e.last_login,
                ur.role_name
            FROM employees e
            LEFT JOIN user_roles ur ON e.role_id = ur.role_id
            ORDER BY e.created_at DESC
        ");
        
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        logError("Retrieved " . count($users) . " users");
        
        echo json_encode([
            'success' => true,
            'users' => $users,
            'count' => count($users)
        ]);
        
    } catch (PDOException $e) {
        logError("Error fetching users: " . $e->getMessage());
        throw $e;
    }
}

function handleCreateUser($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        logError("Creating user with data: " . json_encode($input));
        
        // Validate required fields
        $requiredFields = ['first_name', 'last_name', 'email', 'role_id', 'password'];
        foreach ($requiredFields as $field) {
            if (empty($input[$field])) {
                throw new Exception("Field '$field' is required");
            }
        }
        
        // Validate email format
        if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }
        
        // Check if email already exists
        $stmt = $db->prepare("SELECT employee_id FROM employees WHERE email = ?");
        $stmt->execute([$input['email']]);
        if ($stmt->fetch()) {
            throw new Exception('Email already exists');
        }
        
        // Validate role_id
        $stmt = $db->prepare("SELECT role_id FROM user_roles WHERE role_id = ?");
        $stmt->execute([$input['role_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Invalid role ID');
        }
        
        // Hash password
        $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
        
        // Insert new user
        $stmt = $db->prepare("
            INSERT INTO employees (
                first_name, 
                last_name, 
                email, 
                phone_num, 
                password, 
                role_id, 
                is_active, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $result = $stmt->execute([
            trim($input['first_name']),
            trim($input['last_name']),
            trim($input['email']),
            trim($input['phone_num'] ?? ''),
            $hashedPassword,
            $input['role_id'],
            isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1
        ]);
        
        if (!$result) {
            throw new Exception('Failed to insert user into database');
        }
        
        $newUserId = $db->lastInsertId();
        
        logError("New user created with ID: " . $newUserId);
        
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'user_id' => $newUserId
        ]);
        
    } catch (PDOException $e) {
        logError("Error creating user: " . $e->getMessage());
        if ($e->getCode() == 23000) { // Duplicate entry
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email already exists']);
        } else {
            throw $e;
        }
    } catch (Exception $e) {
        logError("Error creating user: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function handleUpdateUser($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }
        
        logError("Updating user with data: " . json_encode($input));
        
        // Validate required fields
        if (empty($input['employee_id'])) {
            throw new Exception('Employee ID is required');
        }
        
        $employeeId = $input['employee_id'];
        
        // Check if user exists
        $stmt = $db->prepare("SELECT employee_id FROM employees WHERE employee_id = ?");
        $stmt->execute([$employeeId]);
        if (!$stmt->fetch()) {
            throw new Exception('User not found');
        }
        
        // Prevent admin from deactivating themselves
        if ($employeeId == $_SESSION['user_id'] && isset($input['is_active']) && !$input['is_active']) {
            throw new Exception('You cannot deactivate your own account');
        }
        
        // Build update query dynamically
        $updateFields = [];
        $updateValues = [];
        
        if (!empty($input['first_name'])) {
            $updateFields[] = 'first_name = ?';
            $updateValues[] = trim($input['first_name']);
        }
        
        if (!empty($input['last_name'])) {
            $updateFields[] = 'last_name = ?';
            $updateValues[] = trim($input['last_name']);
        }
        
        if (!empty($input['email'])) {
            // Validate email format
            if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Invalid email format');
            }
            
            // Check if email already exists for another user
            $stmt = $db->prepare("SELECT employee_id FROM employees WHERE email = ? AND employee_id != ?");
            $stmt->execute([$input['email'], $employeeId]);
            if ($stmt->fetch()) {
                throw new Exception('Email already exists');
            }
            
            $updateFields[] = 'email = ?';
            $updateValues[] = trim($input['email']);
        }
        
        if (isset($input['phone_num'])) {
            $updateFields[] = 'phone_num = ?';
            $updateValues[] = trim($input['phone_num']);
        }
        
        if (!empty($input['role_id'])) {
            // Validate role_id
            $stmt = $db->prepare("SELECT role_id FROM user_roles WHERE role_id = ?");
            $stmt->execute([$input['role_id']]);
            if (!$stmt->fetch()) {
                throw new Exception('Invalid role ID');
            }
            
            // Prevent admin from changing their own role
            if ($employeeId == $_SESSION['user_id'] && $input['role_id'] != $_SESSION['role_id']) {
                throw new Exception('You cannot change your own role');
            }
            
            $updateFields[] = 'role_id = ?';
            $updateValues[] = $input['role_id'];
        }
        
        if (isset($input['is_active'])) {
            $updateFields[] = 'is_active = ?';
            $updateValues[] = $input['is_active'] ? 1 : 0;
        }
        
        // Handle password update
        if (!empty($input['password'])) {
            $updateFields[] = 'password = ?';
            $updateValues[] = password_hash($input['password'], PASSWORD_DEFAULT);
        }
        
        if (empty($updateFields)) {
            throw new Exception('No valid fields to update');
        }
        
        // Add updated_at timestamp if column exists
        // First check if updated_at column exists
        $stmt = $db->prepare("SHOW COLUMNS FROM employees LIKE 'updated_at'");
        $stmt->execute();
        if ($stmt->fetch()) {
            $updateFields[] = 'updated_at = NOW()';
        }
        
        // Execute update
        $sql = "UPDATE employees SET " . implode(', ', $updateFields) . " WHERE employee_id = ?";
        $updateValues[] = $employeeId;
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute($updateValues);
        
        if (!$result) {
            throw new Exception('Failed to update user in database');
        }
        
        logError("User updated: " . $employeeId);
        
        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully'
        ]);
        
    } catch (PDOException $e) {
        logError("Error updating user: " . $e->getMessage());
        if ($e->getCode() == 23000) { // Duplicate entry
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email already exists']);
        } else {
            throw $e;
        }
    } catch (Exception $e) {
        logError("Error updating user: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function handleDeleteUser($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || empty($input['employee_id'])) {
            throw new Exception('Employee ID is required');
        }
        
        $employeeId = $input['employee_id'];
        
        logError("Attempting to delete user: " . $employeeId);
        
        // Prevent admin from deleting themselves
        if ($employeeId == $_SESSION['user_id']) {
            throw new Exception('You cannot delete your own account');
        }
        
        // Check if user exists
        $stmt = $db->prepare("SELECT employee_id FROM employees WHERE employee_id = ?");
        $stmt->execute([$employeeId]);
        if (!$stmt->fetch()) {
            throw new Exception('User not found');
        }
        
        // Check if user has any related records (reservations, billing, etc.)
        $hasRecords = false;
        
        // Check billing records if table exists
        try {
            $stmt = $db->prepare("SELECT COUNT(*) FROM billing WHERE employee_id = ?");
            $stmt->execute([$employeeId]);
            if ($stmt->fetchColumn() > 0) {
                $hasRecords = true;
            }
        } catch (PDOException $e) {
            // Table might not exist, continue
            logError("Billing table check failed: " . $e->getMessage());
        }
        
        // Check service requests if table exists
        try {
            $stmt = $db->prepare("SELECT COUNT(*) FROM service_requests WHERE assigned_to = ?");
            $stmt->execute([$employeeId]);
            if ($stmt->fetchColumn() > 0) {
                $hasRecords = true;
            }
        } catch (PDOException $e) {
            // Table might not exist, continue
            logError("Service requests table check failed: " . $e->getMessage());
        }
        
        // Check maintenance records if table exists
        try {
            $stmt = $db->prepare("SELECT COUNT(*) FROM room_maintenance_log WHERE employee_id = ?");
            $stmt->execute([$employeeId]);
            if ($stmt->fetchColumn() > 0) {
                $hasRecords = true;
            }
        } catch (PDOException $e) {
            // Table might not exist, continue
            logError("Maintenance log table check failed: " . $e->getMessage());
        }
        
        if ($hasRecords) {
            // Instead of hard delete, deactivate the user
            $stmt = $db->prepare("UPDATE employees SET is_active = 0 WHERE employee_id = ?");
            $result = $stmt->execute([$employeeId]);
            
            if (!$result) {
                throw new Exception('Failed to deactivate user');
            }
            
            logError("User deactivated instead of deleted (has related records): " . $employeeId);
            
            echo json_encode([
                'success' => true,
                'message' => 'User has related records and has been deactivated instead of deleted'
            ]);
        } else {
            // Safe to delete
            $stmt = $db->prepare("DELETE FROM employees WHERE employee_id = ?");
            $result = $stmt->execute([$employeeId]);
            
            if (!$result) {
                throw new Exception('Failed to delete user');
            }
            
            logError("User deleted: " . $employeeId);
            
            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        }
        
    } catch (PDOException $e) {
        logError("Error deleting user: " . $e->getMessage());
        throw $e;
    } catch (Exception $e) {
        logError("Error deleting user: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>