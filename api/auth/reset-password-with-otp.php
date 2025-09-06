<?php
// api/auth/reset-password-with-otp.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

function logError($message) {
    error_log("[RESET PASSWORD WITH OTP API] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // Configure session settings
    ini_set('session.cookie_secure', '0'); // Set to 1 for HTTPS
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');

    // Start session to check OTP verification
    if (session_status() === PHP_SESSION_NONE) {
        session_start([
            'cookie_lifetime' => 3600, // 1 hour
            'cookie_secure' => false, // Set to true for HTTPS
            'cookie_httponly' => true,
            'use_strict_mode' => true
        ]);
    }

    // Check if db.php exists before requiring
    $dbConfigPath = __DIR__ . '/../config/db.php';
    if (!file_exists($dbConfigPath)) {
        logError("Database config file not found at: " . $dbConfigPath);
        sendResponse(['success' => false, 'error' => 'Database configuration not found'], 500);
    }

    // Include database config
    require_once $dbConfigPath;

    // Check if getDB function exists
    if (!function_exists('getDB')) {
        logError("getDB function not found in database config");
        sendResponse(['success' => false, 'error' => 'Database configuration error'], 500);
    }

    // Get database connection
    try {
        $db = getDB();
        if (!$db) {
            throw new Exception("Database connection returned null");
        }
    } catch (Exception $e) {
        logError("Database connection failed: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()], 500);
    }

    // Get input data
    $json = file_get_contents('php://input');
    if ($json === false) {
        logError("Failed to read request input");
        sendResponse(['success' => false, 'error' => 'Failed to read request'], 400);
    }

    logError("Received JSON: " . $json); // Debug log

    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logError("JSON decode error: " . json_last_error_msg());
        sendResponse(['success' => false, 'error' => 'Invalid JSON: ' . json_last_error_msg()], 400);
    }

    // Validate input
    if (empty($data['employee_id']) || empty($data['new_password'])) {
        logError("Missing required fields. Employee ID: " . (!empty($data['employee_id']) ? 'provided' : 'missing') . ", Password: " . (!empty($data['new_password']) ? 'provided' : 'missing'));
        sendResponse(['success' => false, 'error' => 'Employee ID and new password are required'], 400);
    }

    $employeeId = trim($data['employee_id']);
    $newPassword = $data['new_password'];
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    // Validate password strength
    if (strlen($newPassword) < 8) {
        sendResponse(['success' => false, 'error' => 'Password must be at least 8 characters long'], 400);
    }

    logError("Password reset attempt with OTP for employee: " . $employeeId);
    logError("Session data: " . print_r($_SESSION, true)); // Debug session

    // Verify that OTP was previously verified in this session
    if (empty($_SESSION['temp_password_reset'])) {
        logError("No OTP verification session found for password reset");
        sendResponse(['success' => false, 'error' => 'OTP verification required. Please verify your code first.'], 401);
    }

    $resetSession = $_SESSION['temp_password_reset'];
    
    // Check if session is for the same employee
    if ($resetSession['employee_id'] !== $employeeId) {
        logError("Employee ID mismatch in reset session. Expected: " . $resetSession['employee_id'] . ", Got: " . $employeeId);
        unset($_SESSION['temp_password_reset']);
        sendResponse(['success' => false, 'error' => 'Invalid reset session. Please restart the process.'], 401);
    }

    // Check if session has expired (30 minutes)
    if (time() > $resetSession['expires_at']) {
        logError("Reset session expired for employee: " . $employeeId);
        unset($_SESSION['temp_password_reset']);
        sendResponse(['success' => false, 'error' => 'Reset session expired. Please restart the process.'], 401);
    }

    // Check IP consistency (optional security measure)
    if ($resetSession['ip_address'] !== $ipAddress) {
        logError("IP address mismatch. Session IP: " . $resetSession['ip_address'] . ", Current IP: " . $ipAddress);
        // Log but don't block - IP can change legitimately
    }

    // Check if required tables exist
    try {
        $stmt = $db->prepare("SHOW TABLES LIKE 'employees'");
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            throw new Exception("Employees table does not exist");
        }

        $stmt = $db->prepare("SHOW TABLES LIKE 'email_otp'");
        $stmt->execute();
        $hasEmailOtpTable = $stmt->rowCount() > 0;
        logError("Email OTP table exists: " . ($hasEmailOtpTable ? 'yes' : 'no'));

    } catch (PDOException $e) {
        logError("Error checking tables: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }

    // Find employee and verify account status
    try {
        // Check if searching by email or employee_id (since employee_id is INT AUTO_INCREMENT)
        if (is_numeric($employeeId)) {
            // Search by employee_id (integer)
            $stmt = $db->prepare("
                SELECT employee_id, email, first_name, last_name, is_active
                FROM employees 
                WHERE employee_id = ? 
                LIMIT 1
            ");
            $stmt->execute([(int)$employeeId]);
        } else {
            // Search by email (since the reset process likely starts with email)
            $stmt = $db->prepare("
                SELECT employee_id, email, first_name, last_name, is_active
                FROM employees 
                WHERE email = ? 
                LIMIT 1
            ");
            $stmt->execute([$employeeId]);
        }
        
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        logError("Employee query result: " . print_r($employee, true)); // Debug log
        
    } catch (PDOException $e) {
        logError("Database query error: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }

    if (!$employee) {
        logError("Employee not found during password reset: " . $employeeId);
        unset($_SESSION['temp_password_reset']);
        sendResponse(['success' => false, 'error' => 'Employee not found'], 404);
    }

    // Check if user is still active
    if (!$employee['is_active']) {
        logError("Password reset attempted for inactive employee: " . $employeeId);
        unset($_SESSION['temp_password_reset']);
        sendResponse(['success' => false, 'error' => 'Account is not active'], 403);
    }

    // Update password
    try {
        $db->beginTransaction();
        logError("Transaction started");

        // Hash new password
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        if (!$hashedPassword) {
            throw new Exception("Failed to hash password");
        }
        
        logError("Password hashed successfully");

        // Your table has different columns, so let's check what's available
        try {
            $checkLastLoginStmt = $db->prepare("SHOW COLUMNS FROM employees LIKE 'last_login'");
            $checkLastLoginStmt->execute();
            $hasLastLoginColumn = $checkLastLoginStmt->rowCount() > 0;
        } catch (PDOException $e) {
            logError("Error checking columns: " . $e->getMessage());
            $hasLastLoginColumn = false;
        }

        // Update employee password and reset failed attempts
        $updateQuery = "UPDATE employees SET password = ?, failed_attempts = 0, locked_until = NULL";
        $updateParams = [$hashedPassword];

        // Add last_login update if column exists (optional)
        if ($hasLastLoginColumn) {
            $updateQuery .= ", last_login = NOW()";
        }
        
        // Use employee_id (which is INT in your table)
        $updateQuery .= " WHERE employee_id = ?";
        $updateParams[] = (int)$employee['employee_id']; // Use the actual employee_id from query result

        $updateStmt = $db->prepare($updateQuery);
        $updateResult = $updateStmt->execute($updateParams);
        
        logError("Update query: " . $updateQuery);
        logError("Update query executed. Result: " . ($updateResult ? 'success' : 'failed'));
        logError("Rows affected: " . $updateStmt->rowCount());

        if (!$updateResult || $updateStmt->rowCount() === 0) {
            throw new Exception("Failed to update password - no rows affected");
        }

        // Log the password reset activity (if activity_logs table exists)
        try {
            $checkTableStmt = $db->prepare("SHOW TABLES LIKE 'activity_logs'");
            $checkTableStmt->execute();
            if ($checkTableStmt->rowCount() > 0) {
                $logStmt = $db->prepare("
                    INSERT INTO activity_logs (employee_id, action, details, ip_address, created_at) 
                    VALUES (?, 'password_reset', 'Password reset via OTP verification', ?, NOW())
                ");
                $logStmt->execute([$employee['employee_id'], $ipAddress]);
                logError("Activity logged successfully");
            } else {
                logError("Activity logs table does not exist - skipping activity log");
            }
        } catch (PDOException $logError) {
            // Log error but don't fail the password reset
            logError("Failed to log activity: " . $logError->getMessage());
        }

        // Clean up any existing OTP codes for this employee using your email_otp table
        if ($hasEmailOtpTable) {
            try {
                // Check if verified_at column is used to mark as used, or if there's another way
                $checkOtpColumnsStmt = $db->prepare("SHOW COLUMNS FROM email_otp");
                $checkOtpColumnsStmt->execute();
                $otpColumns = $checkOtpColumnsStmt->fetchAll(PDO::FETCH_COLUMN);
                
                logError("Email OTP table columns: " . implode(', ', $otpColumns));

                // Mark OTP as used by setting verified_at if it's not already set
                // Use the actual employee_id (INT) from the employee record
                $cleanupStmt = $db->prepare("
                    UPDATE email_otp 
                    SET verified_at = COALESCE(verified_at, NOW())
                    WHERE employee_id = ? AND purpose = 'password_reset' AND expires_at > NOW()
                ");
                $cleanupStmt->execute([$employee['employee_id']]);
                logError("OTP codes cleaned up successfully. Rows affected: " . $cleanupStmt->rowCount());
            } catch (PDOException $cleanupError) {
                logError("Failed to cleanup OTP codes: " . $cleanupError->getMessage());
            }
        }

        $db->commit();
        logError("Transaction committed successfully");

        // Clear the temporary session
        unset($_SESSION['temp_password_reset']);

        logError("Password reset successful for employee: " . $employeeId);
        
        sendResponse([
            'success' => true,
            'message' => 'Password has been reset successfully. You can now login with your new password.'
        ]);

    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
            logError("Transaction rolled back");
        }
        logError("Password reset failed: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Failed to reset password: ' . $e->getMessage()], 500);
    }

} catch (Exception $e) {
    logError("Unexpected error: " . $e->getMessage());
    logError("Stack trace: " . $e->getTraceAsString());
    sendResponse(['success' => false, 'error' => 'Internal server error: ' . $e->getMessage()], 500);
}
?>