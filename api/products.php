<?php
/**
 * AL FAKHAMA - Products REST API Endpoint (Hostinger PHP / LiteSpeed / Apache)
 * Supports GET (fetching catalog) and POST (updating products & images from Admin)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database';
$productsFile = $dbDir . DIRECTORY_SEPARATOR . 'products.json';

// Ensure database folder exists
if (!is_dir($dbDir)) {
    @mkdir($dbDir, 0755, true);
}

// ── 1. GET: Return Products ─────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($productsFile)) {
        $content = file_get_contents($productsFile);
        $data = json_decode($content, true);
        if (is_array($data)) {
            echo json_encode(['success' => true, 'products' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
    echo json_encode(['success' => true, 'products' => []]);
    exit;
}

// ── 2. POST: Save Products ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Empty request body']);
        exit;
    }

    $decoded = json_decode($rawInput, true);
    if ($decoded === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON payload']);
        exit;
    }

    $products = isset($decoded['products']) && is_array($decoded['products']) 
        ? $decoded['products'] 
        : (is_array($decoded) && isset($decoded[0]['name']) ? $decoded : null);

    if (!is_array($products)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Products payload must be an array']);
        exit;
    }

    // Write to database/products.json
    $jsonOutput = json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $bytesWritten = @file_put_contents($productsFile, $jsonOutput, LOCK_EX);

    if ($bytesWritten === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server permission error: Unable to write to database/products.json']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Products successfully saved and updated on server.',
        'count' => count($products),
        'timestamp' => time()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
