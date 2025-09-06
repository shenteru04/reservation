<?php
// Enhanced forgot-password.php with better error handling and debugging
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
    error_log("[FORGOT PASSWORD API] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // Include database config
    require_once __DIR__ . '/../config/db.php';
    
    // Check if mailer file exists
    $mailerPath = __DIR__ . '/../mailer.php';
    if (!file_exists($mailerPath)) {
        logError("Mailer file not found at: " . $mailerPath);
        sendResponse(['success' => false, 'error' => 'Email service not available'], 500);
    }

    // Get database connection
    try {
        $db = getDB();
        if (!$db) {
            throw new Exception('Database connection returned null');
        }
        logError("Database connection successful");
    } catch (Exception $e) {
        logError("Database connection failed: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database connection failed'], 500);
    }

    // Get input data
    $json = file_get_contents('php://input');
    if ($json === false) {
        logError("Failed to read request body");
        sendResponse(['success' => false, 'error' => 'Failed to read request'], 400);
    }

    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logError("JSON decode error: " . json_last_error_msg());
        sendResponse(['success' => false, 'error' => 'Invalid JSON: ' . json_last_error_msg()], 400);
    }

    // Validate email
    if (empty($data['email'])) {
        logError("Email parameter missing");
        sendResponse(['success' => false, 'error' => 'Email is required'], 400);
    }

    $email = trim(strtolower($data['email']));
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        logError("Invalid email format: " . $email);
        sendResponse(['success' => false, 'error' => 'Invalid email format'], 400);
    }

    logError("Password reset requested for: " . $email);

    // Check if user exists
    try {
        $stmt = $db->prepare("
            SELECT employee_id, first_name, last_name, email, is_active 
            FROM employees 
            WHERE LOWER(email) = ? 
            LIMIT 1
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        logError("User lookup result: " . ($user ? "Found user ID: " . $user['employee_id'] : "No user found"));
    } catch (PDOException $e) {
        logError("Database query error: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database error'], 500);
    }

    if (!$user) {
        // For security, don't reveal if email exists or not
        logError("Password reset attempted for non-existent email: " . $email);
        sendResponse([
            'success' => true,
            'message' => 'If the email exists in our system, a password reset link has been sent.'
        ]);
    }

    if (!$user['is_active']) {
        logError("Password reset attempted for inactive user: " . $email);
        sendResponse([
            'success' => true,
            'message' => 'If the email exists in our system, a password reset link has been sent.'
        ]);
    }

    // Check if password_resets table exists, create if not
    try {
        $tableCheckStmt = $db->prepare("SHOW TABLES LIKE 'password_resets'");
        $tableCheckStmt->execute();
        $tableExists = $tableCheckStmt->fetch();
        
        if (!$tableExists) {
            logError("Creating password_resets table");
            $createTableSQL = "
                CREATE TABLE password_resets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id VARCHAR(50) NOT NULL,
                    reset_token VARCHAR(128) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_employee_id (employee_id),
                    INDEX idx_token (reset_token),
                    INDEX idx_expires (expires_at)
                )
            ";
            $db->exec($createTableSQL);
            logError("password_resets table created successfully");
        }
    } catch (Exception $e) {
        logError("Error checking/creating password_resets table: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Database setup error'], 500);
    }

    // Generate reset token
    try {
        $resetToken = bin2hex(random_bytes(32));
        $expiryTime = date('Y-m-d H:i:s', time() + 3600); // 1 hour from now
        logError("Generated reset token (first 8 chars): " . substr($resetToken, 0, 8) . "...");
    } catch (Exception $e) {
        logError("Failed to generate reset token: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Token generation failed'], 500);
    }

    // Store reset token in database
    try {
        // Start transaction
        $db->beginTransaction();
        
        // First, clean up any existing reset tokens for this user
        $cleanupStmt = $db->prepare("DELETE FROM password_resets WHERE employee_id = ?");
        $cleanupResult = $cleanupStmt->execute([$user['employee_id']]);
        logError("Cleaned up existing tokens for user: " . $user['employee_id'] . " (affected rows: " . $cleanupStmt->rowCount() . ")");

        // Insert new reset token
        $insertStmt = $db->prepare("
            INSERT INTO password_resets (employee_id, reset_token, expires_at, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $insertResult = $insertStmt->execute([$user['employee_id'], $resetToken, $expiryTime]);
        
        if (!$insertResult) {
            throw new Exception("Failed to insert reset token");
        }
        
        $insertId = $db->lastInsertId();
        logError("Reset token stored successfully with ID: " . $insertId);
        
        // Commit transaction
        $db->commit();
        
    } catch (PDOException $e) {
        $db->rollBack();
        logError("Failed to store reset token: " . $e->getMessage());
        logError("PDO Error Info: " . print_r($e->errorInfo, true));
        sendResponse(['success' => false, 'error' => 'Failed to generate reset token'], 500);
    } catch (Exception $e) {
        $db->rollBack();
        logError("General error storing reset token: " . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'Failed to generate reset token'], 500);
    }

    // Send reset email
    try {
        logError("Attempting to load EmailService from: " . $mailerPath);
        require_once $mailerPath;
        
        // Check if EmailService class exists
        if (!class_exists('EmailService')) {
            throw new Exception('EmailService class not found in mailer.php');
        }
        
        logError("EmailService class loaded successfully");
        $emailService = new EmailService();
        logError("EmailService instance created");
        
        $employeeName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
        if (empty(trim($employeeName))) {
            $employeeName = 'Employee';
        }
        
        logError("Sending password reset email to: " . $email . " for: " . $employeeName);
        $emailResult = $emailService->sendPasswordResetEmail($email, $resetToken, $employeeName);
        logError("Email service result: " . json_encode($emailResult));
        
        if ($emailResult['success']) {
            logError("Password reset email sent successfully to: " . $email);
            sendResponse([
                'success' => true,
                'message' => 'A password reset link has been sent to your email address.'
            ]);
        } else {
            logError("Failed to send password reset email: " . ($emailResult['error'] ?? 'Unknown error'));
            
            // Clean up the token since email failed
            try {
                $cleanupStmt = $db->prepare("DELETE FROM password_resets WHERE reset_token = ?");
                $cleanupStmt->execute([$resetToken]);
                logError("Cleaned up failed token");
            } catch (Exception $cleanupError) {
                logError("Failed to cleanup token: " . $cleanupError->getMessage());
            }
            
            sendResponse([
                'success' => false, 
                'error' => 'Failed to send reset email: ' . ($emailResult['error'] ?? 'Email service error')
            ], 500);
        }
    } catch (Exception $e) {
        logError("Email service error: " . $e->getMessage());
        logError("Stack trace: " . $e->getTraceAsString());
        
        // Clean up the token since email failed
        try {
            $cleanupStmt = $db->prepare("DELETE FROM password_resets WHERE reset_token = ?");
            $cleanupStmt->execute([$resetToken]);
            logError("Cleaned up failed token after email error");
        } catch (Exception $cleanupError) {
            logError("Failed to cleanup token after email error: " . $cleanupError->getMessage());
        }
        
        sendResponse([
            'success' => false, 
            'error' => 'Email service error: ' . $e->getMessage()
        ], 500);
    }

} catch (Exception $e) {
    logError("Unexpected error: " . $e->getMessage());
    logError("Stack trace: " . $e->getTraceAsString());
    sendResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
?>