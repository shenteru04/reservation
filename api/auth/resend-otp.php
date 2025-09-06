<?php
// api/auth/resend-otp.php - Endpoint to resend OTP
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
    error_log("[RESEND OTP API] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    // Include required files
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../services/OTPService.php';

    $db = getDB();
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (empty($data['employee_id'])) {
        sendResponse(['success' => false, 'error' => 'Employee ID is required'], 400);
    }

    $employeeId = $data['employee_id'];
    $purpose = $data['purpose'] ?? 'login';
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

    logError("Resending OTP for employee: $employeeId");

    $otpService = new OTPService($db);
    $result = $otpService->generateAndSendOTP($employeeId, $purpose, $ipAddress, $userAgent);

    if ($result['success']) {
        logError("OTP resent successfully for employee: $employeeId");
        sendResponse([
            'success' => true,
            'message' => 'New verification code sent successfully',
            'expires_in' => $result['expires_in'] ?? 300
        ]);
    } else {
        logError("Failed to resend OTP for employee: $employeeId - " . $result['error']);
        sendResponse(['success' => false, 'error' => $result['error']], 400);
    }

} catch (Exception $e) {
    logError("Error: " . $e->getMessage());
    sendResponse(['success' => false, 'error' => 'Internal server error'], 500);
}
?>