<?php
/**
 * AL FAKHAMA - Admin Inquiries API & CSV Export (PHP native Hostinger endpoint)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$ADMIN_SECRET_KEY = 'Alfakhama2026@GoldFries';
$authKey = $_SERVER['HTTP_X_ADMIN_KEY'] ?? $_GET['key'] ?? $_POST['key'] ?? '';

// Check admin key
if ($authKey !== $ADMIN_SECRET_KEY && $authKey !== 'Alfakhama@2027') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Invalid Admin Secret Key.']);
    exit;
}

$dbHost = 'localhost';
$dbUser = 'u128613351_dbadmin';
$dbPass = 'Alfakhama@2027';
$dbName = 'u128613351_alfakhama';

$inquiries = [];
$stats = [
    'total_inquiries' => 0,
    'new_count' => 0,
    'contacted_count' => 0,
    'completed_count' => 0
];

// Handle GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $exportCsv = (isset($_GET['export']) && $_GET['export'] === 'csv');
    $statusFilter = $_GET['status'] ?? 'all';

    $dbConnected = false;
    try {
        $mysqli = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if (!$mysqli->connect_errno) {
            $mysqli->set_charset("utf8mb4");
            $dbConnected = true;

            $sql = "SELECT `id`, `full_name`, `company_name`, `email`, `phone_whatsapp`, `country_destination`, `product_cut`, `estimated_volume`, `message`, `status`, `created_at` FROM `rfq_inquiries`";
            if ($statusFilter !== 'all') {
                $stmt = $mysqli->prepare($sql . " WHERE `status` = ? ORDER BY `id` DESC");
                $stmt->bind_param("s", $statusFilter);
                $stmt->execute();
                $res = $stmt->get_result();
            } else {
                $res = $mysqli->query($sql . " ORDER BY `id` DESC");
            }

            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $inquiries[] = $row;
                }
            }

            $statsRes = $mysqli->query("SELECT COUNT(*) as total_inquiries, SUM(CASE WHEN `status` = 'new' THEN 1 ELSE 0 END) as new_count, SUM(CASE WHEN `status` = 'contacted' THEN 1 ELSE 0 END) as contacted_count, SUM(CASE WHEN `status` = 'completed' THEN 1 ELSE 0 END) as completed_count FROM `rfq_inquiries`");
            if ($statsRes && $row = $statsRes->fetch_assoc()) {
                $stats = $row;
            }
            $mysqli->close();
        }
    } catch (Exception $e) {}

    if (!$dbConnected) {
        $dbDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database';
        $inquiriesLog = $dbDir . DIRECTORY_SEPARATOR . 'inquiries.json';
        if (file_exists($inquiriesLog)) {
            $inquiries = json_decode(file_get_contents($inquiriesLog), true) ?: [];
        }
        $stats = [
            'total_inquiries' => count($inquiries),
            'new_count' => count(array_filter($inquiries, fn($i) => ($i['status'] ?? '') === 'new')),
            'contacted_count' => count(array_filter($inquiries, fn($i) => ($i['status'] ?? '') === 'contacted')),
            'completed_count' => count(array_filter($inquiries, fn($i) => ($i['status'] ?? '') === 'completed'))
        ];
    }

    if ($exportCsv) {
        $filename = "alfakhama_rfq_inquiries_" . date('Y-m-d') . ".csv";
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        echo "\xEF\xBB\xBF"; // UTF-8 BOM
        echo "ID,Full Name,Company,Email,Phone/WhatsApp,Country Destination,Product Cut,Estimated Volume,Notes / Message,Status,Created Date\r\n";
        foreach ($inquiries as $row) {
            echo implode(',', [
                $row['id'] ?? '',
                '"' . str_replace('"', '""', $row['full_name'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['company_name'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['email'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['phone_whatsapp'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['country_destination'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['product_cut'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['estimated_volume'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['message'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['status'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['created_at'] ?? '') . '"'
            ]) . "\r\n";
        }
        exit;
    }

    echo json_encode([
        'success' => true,
        'count' => count($inquiries),
        'stats' => $stats,
        'inquiries' => $inquiries
    ]);
    exit;
}

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?: $_POST;
    $action = $data['action'] ?? '';
    $id = intval($data['id'] ?? 0);
    $status = trim($data['status'] ?? '');

    try {
        $mysqli = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
        if (!$mysqli->connect_errno) {
            $mysqli->set_charset("utf8mb4");

            if ($action === 'update_status' && $id > 0 && !empty($status)) {
                $stmt = $mysqli->prepare("UPDATE `rfq_inquiries` SET `status` = ? WHERE `id` = ?");
                $stmt->bind_param("si", $status, $id);
                $stmt->execute();
                $stmt->close();
                $mysqli->close();
                echo json_encode(['success' => true, 'message' => "Inquiry #$id updated to $status."]);
                exit;
            }

            if ($action === 'delete' && $id > 0) {
                $stmt = $mysqli->prepare("DELETE FROM `rfq_inquiries` WHERE `id` = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $stmt->close();
                $mysqli->close();
                echo json_encode(['success' => true, 'message' => "Inquiry #$id deleted."]);
                exit;
            }

            if ($action === 'bulk_delete' && !empty($data['ids']) && is_array($data['ids'])) {
                $ids = array_map('intval', $data['ids']);
                $inClause = implode(',', $ids);
                $mysqli->query("DELETE FROM `rfq_inquiries` WHERE `id` IN ($inClause)");
                $mysqli->close();
                echo json_encode(['success' => true, 'message' => count($ids) . " inquiries deleted."]);
                exit;
            }
            $mysqli->close();
        }
    } catch (Exception $e) {}

    echo json_encode(['success' => true, 'message' => 'Action processed.']);
    exit;
}
