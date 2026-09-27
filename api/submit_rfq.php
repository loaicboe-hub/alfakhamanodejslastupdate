<?php
/**
 * AL FAKHAMA - RFQ Quote Submission Endpoint (PHP fallback / native Hostinger)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!$data) {
    $data = $_POST;
}

$fullName = trim($data['full_name'] ?? $data['name'] ?? '');
$companyName = trim($data['company_name'] ?? $data['company'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone_whatsapp'] ?? $data['phone'] ?? '');
$country = trim($data['country_destination'] ?? $data['country'] ?? '');
$productCut = trim($data['product_cut'] ?? $data['cut'] ?? 'Par-Fried Frozen Fries');
$volume = trim($data['estimated_volume'] ?? $data['quantity'] ?? 'Commercial Volume');
$message = trim($data['message'] ?? $data['notes'] ?? '');

$errors = [];
if (empty($fullName)) $errors[] = 'Full Name is required.';
if (empty($companyName)) $errors[] = 'Company Name is required.';
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'A valid Business Email is required.';
if (empty($phone)) $errors[] = 'Phone / WhatsApp number is required.';
if (empty($country)) $errors[] = 'Country / Destination Port is required.';

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Validation error.', 'errors' => $errors]);
    exit;
}

$ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
$userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

// Try MySQL connection
$dbHost = 'localhost';
$dbUser = 'u128613351_dbadmin';
$dbPass = 'Alfakhama@2027';
$dbName = 'u128613351_alfakhama';

$inquiryId = time();
$savedToDb = false;

try {
    $mysqli = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if (!$mysqli->connect_errno) {
        $mysqli->set_charset("utf8mb4");
        $stmt = $mysqli->prepare("INSERT INTO `rfq_inquiries` (`full_name`, `company_name`, `email`, `phone_whatsapp`, `country_destination`, `product_cut`, `estimated_volume`, `message`, `ip_address`, `user_agent`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')");
        if ($stmt) {
            $stmt->bind_param("ssssssssss", $fullName, $companyName, $email, $phone, $country, $productCut, $volume, $message, $ipAddress, $userAgent);
            $stmt->execute();
            $inquiryId = $stmt->insert_id;
            $savedToDb = true;
            $stmt->close();
        }
        $mysqli->close();
    }
} catch (Exception $e) {}

// Fallback JSON log if MySQL is not reachable
if (!$savedToDb) {
    $dbDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database';
    if (!is_dir($dbDir)) @mkdir($dbDir, 0755, true);
    $inquiriesLog = $dbDir . DIRECTORY_SEPARATOR . 'inquiries.json';
    $existing = file_exists($inquiriesLog) ? json_decode(file_get_contents($inquiriesLog), true) : [];
    if (!is_array($existing)) $existing = [];
    array_unshift($existing, [
        'id' => $inquiryId,
        'full_name' => $fullName,
        'company_name' => $companyName,
        'email' => $email,
        'phone_whatsapp' => $phone,
        'country_destination' => $country,
        'product_cut' => $productCut,
        'estimated_volume' => $volume,
        'message' => $message,
        'status' => 'new',
        'created_at' => date('Y-m-d H:i:s')
    ]);
    @file_put_contents($inquiriesLog, json_encode(array_slice($existing, 0, 500), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

echo json_encode([
    'success' => true,
    'message' => 'Thank you! Your quote request has been saved and forwarded to our export commercial team.',
    'inquiry_id' => $inquiryId
]);
