<?php
// api/frontdesk/reports.php - Fixed Front Desk Report Submission API
session_start();

// Enhanced logging and error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers early
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Enhanced logging
function logDebug($message, $data = null) {
    $logFile = __DIR__ . '/../../logs/frontdesk_reports.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data) {
        $logMessage .= " | Data: " . print_r($data, true);
    }
    $logMessage .= "\n";
    
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
}

logDebug("=== REPORT SUBMISSION START ===");
logDebug("Request Method", $_SERVER['REQUEST_METHOD']);
logDebug("Session Data", $_SESSION);
logDebug("Headers", getallheaders());

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    logDebug("Handling OPTIONS request");
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logDebug("Invalid method", $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    // Enhanced authentication check
    logDebug("Checking authentication");
    
    if (!isset($_SESSION['user_id'])) {
        logDebug("No user_id in session");
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated - no user ID']);
        exit();
    }
    
    if (!isset($_SESSION['role'])) {
        logDebug("No role in session");
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Not authenticated - no role']);
        exit();
    }

    // FIXED: More flexible role checking that handles spaces and variations
    $userRole = strtolower(trim($_SESSION['role']));
    
    // Normalize role by removing/replacing spaces and special characters
    $normalizedRole = str_replace([' ', '-', '_'], '', $userRole);
    
    $allowedRoles = [
        // Original formats
        'frontdesk', 'front_desk', 'front-desk', 'reception', 'receptionist',
        'admin', 'administrator', 'staff', 'manager',
        // ADDED: Handle "front desk" with space
        'front desk',
        // Normalized versions (without spaces/special chars)
        'frontdesk' => 'frontdesk' // This will match "front desk", "front_desk", "front-desk"
    ];
    
    // Check both original role and normalized role
    $isAuthorized = in_array($userRole, $allowedRoles) || 
                   in_array($normalizedRole, ['frontdesk', 'reception', 'receptionist', 'admin', 'administrator', 'staff', 'manager']);
    
    logDebug("Authorization check", [
        'original_role' => $_SESSION['role'],
        'normalized_role' => $userRole,
        'clean_role' => $normalizedRole,
        'is_authorized' => $isAuthorized,
        'allowed_roles' => $allowedRoles
    ]);
    
    if (!$isAuthorized) {
        logDebug("Permission denied", ['user_role' => $userRole, 'normalized' => $normalizedRole]);
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'error' => 'Insufficient permissions',
            'debug' => [
                'user_role' => $userRole, 
                'normalized_role' => $normalizedRole,
                'required_roles' => $allowedRoles
            ]
        ]);
        exit();
    }

    logDebug("Authentication successful", ['user_id' => $_SESSION['user_id'], 'role' => $userRole]);

    // Load database configuration with multiple paths
    $dbPaths = [
        __DIR__ . '/../../config/db.php',
        __DIR__ . '/../config/db.php',
        dirname(dirname(__DIR__)) . '/config/db.php',
        $_SERVER['DOCUMENT_ROOT'] . '/reservation/config/db.php',
        dirname(dirname(dirname(__FILE__))) . '/config/db.php'
    ];

    $dbLoaded = false;
    foreach ($dbPaths as $path) {
        logDebug("Trying DB path", $path);
        if (file_exists($path)) {
            require_once $path;
            $dbLoaded = true;
            logDebug("DB config loaded from", $path);
            break;
        }
    }

    if (!$dbLoaded) {
        throw new Exception('Database configuration file not found in any expected location');
    }

    // Get database connection
    if (!function_exists('getDB')) {
        throw new Exception('Database connection function not available');
    }
    
    $db = getDB();
    if (!$db) {
        throw new Exception('Failed to connect to database');
    }
    
    logDebug("Database connection successful");

    // Get and validate input
    $rawInput = file_get_contents('php://input');
    logDebug("Raw input received", substr($rawInput, 0, 500) . '...');
    
    if (empty($rawInput)) {
        throw new Exception('No input data received');
    }
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input: ' . json_last_error_msg());
    }

    logDebug("Input parsed successfully", $input);

    // Validate required fields
    if (empty($input['summary'])) {
        throw new Exception('Missing required field: summary');
    }

    // Prepare data with better structure
    $summary = trim($input['summary']);
    $details = $input['details'] ?? [];
    
    // Ensure details is properly structured
    if (!is_array($details)) {
        $details = ['notes' => (string)$details];
    }
    
    // Add metadata
    $details['submitted_by'] = $_SESSION['user_id'];
    $details['submission_timestamp'] = date('c');
    $details['ip_address'] = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    logDebug("Report data prepared", [
        'summary_length' => strlen($summary),
        'details_keys' => array_keys($details),
        'staff_id' => $_SESSION['user_id']
    ]);

    // Create/update table with better structure
    $createTableSQL = "
        CREATE TABLE IF NOT EXISTS frontdesk_reports (
            front_reports_id INT AUTO_INCREMENT PRIMARY KEY,
            staff_id INT NOT NULL,
            report_date DATE NOT NULL,
            summary TEXT NOT NULL,
            details JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_staff_date (staff_id, report_date),
            INDEX idx_report_date (report_date),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $db->exec($createTableSQL);
    logDebug("Table created/verified");

    // Check if report already exists for today (optional - prevent duplicates)
    $checkStmt = $db->prepare("
        SELECT front_reports_id FROM frontdesk_reports 
        WHERE staff_id = :staff_id AND report_date = CURDATE()
    ");
    $checkStmt->execute([':staff_id' => $_SESSION['user_id']]);
    
    if ($checkStmt->fetch()) {
        // Update existing report
        logDebug("Updating existing report");
        
        $updateStmt = $db->prepare("
            UPDATE frontdesk_reports 
            SET summary = :summary, details = :details, updated_at = CURRENT_TIMESTAMP
            WHERE staff_id = :staff_id AND report_date = CURDATE()
        ");
        
        $success = $updateStmt->execute([
            ':staff_id' => $_SESSION['user_id'],
            ':summary' => $summary,
            ':details' => json_encode($details)
        ]);
        
        if (!$success) {
            $errorInfo = $updateStmt->errorInfo();
            throw new Exception('Failed to update report: ' . $errorInfo[2]);
        }
        
        $reportId = $checkStmt->fetchColumn();
        $action = 'updated';
        
    } else {
        // Insert new report
        logDebug("Inserting new report");
        
        $insertStmt = $db->prepare("
            INSERT INTO frontdesk_reports 
            (staff_id, report_date, summary, details) 
            VALUES (:staff_id, CURDATE(), :summary, :details)
        ");

        $success = $insertStmt->execute([
            ':staff_id' => $_SESSION['user_id'],
            ':summary' => $summary,
            ':details' => json_encode($details)
        ]);

        if (!$success) {
            $errorInfo = $insertStmt->errorInfo();
            throw new Exception('Failed to insert report: ' . $errorInfo[2]);
        }

        $reportId = $db->lastInsertId();
        $action = 'created';
    }

    logDebug("Report $action successfully", ['report_id' => $reportId]);

    // Create notifications table and notify admins
    try {
        $createNotificationTableSQL = "
            CREATE TABLE IF NOT EXISTS report_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id INT NOT NULL,
                recipient_id INT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_recipient (recipient_id),
                INDEX idx_report (report_id),
                INDEX idx_unread (recipient_id, is_read)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $db->exec($createNotificationTableSQL);
        logDebug("Notification table created/verified");

        // First, clean up existing notifications for this report (if updating)
        $cleanupStmt = $db->prepare("DELETE FROM report_notifications WHERE report_id = :report_id");
        $cleanupStmt->execute([':report_id' => $reportId]);

        // Create notifications for admin users
        $adminStmt = $db->prepare("
            INSERT INTO report_notifications (report_id, recipient_id) 
            SELECT :report_id, user_id 
            FROM users 
            WHERE LOWER(TRIM(role)) IN ('admin', 'manager', 'administrator')
        ");
        
        $adminStmt->execute([':report_id' => $reportId]);
        
        $notificationCount = $adminStmt->rowCount();
        logDebug("Created notifications", ['count' => $notificationCount, 'report_id' => $reportId]);
        
    } catch (Exception $e) {
        // Log notification error but don't fail the report submission
        logDebug("Notification creation failed", $e->getMessage());
    }

    // Success response
    $response = [
        'success' => true,
        'report_id' => (int)$reportId,
        'action' => $action,
        'message' => 'Report ' . $action . ' successfully',
        'data' => [
            'report_date' => date('Y-m-d'),
            'summary' => $summary,
            'staff_id' => $_SESSION['user_id'],
            'created_at' => date('Y-m-d H:i:s')
        ]
    ];
    
    logDebug("SUCCESS - Report submission complete", $response);
    echo json_encode($response);

} catch (PDOException $e) {
    $errorMsg = "Database error: " . $e->getMessage();
    logDebug("PDO ERROR", $errorMsg);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred',
        'message' => 'Failed to submit report due to database issue',
        'debug' => $e->getMessage()
    ]);
    
} catch (Exception $e) {
    $errorMsg = "General error: " . $e->getMessage();
    logDebug("GENERAL ERROR", $errorMsg);
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Failed to submit report'
    ]);
}

logDebug("=== REPORT SUBMISSION END ===");
?>