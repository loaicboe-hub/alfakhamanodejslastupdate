<?php
/**
 * AL FAKHAMA - Website Content (CMS) REST API Endpoint (Hostinger PHP / LiteSpeed / Apache)
 * Supports GET (fetching CMS content) and POST (updating CMS text from Admin)
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
$contentFile = $dbDir . DIRECTORY_SEPARATOR . 'content.json';

// Ensure database folder exists
if (!is_dir($dbDir)) {
    @mkdir($dbDir, 0755, true);
}

// ── 1. GET: Return Content ──────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($contentFile)) {
        $data = json_decode(file_get_contents($contentFile), true);
        if (is_array($data)) {
            echo json_encode(['success' => true, 'content' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
    echo json_encode(['success' => true, 'content' => ['en' => (object)[], 'ar' => (object)[]]]);
    exit;
}

// ── 2. POST: Save Content ───────────────────────────────────────────────────
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

    $content = isset($decoded['content']) && is_array($decoded['content']) 
        ? $decoded['content'] 
        : $decoded;

    // Write to database/content.json
    $jsonOutput = json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $bytesWritten = @file_put_contents($contentFile, $jsonOutput, LOCK_EX);

    if ($bytesWritten === false) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Server permission error: Unable to write to database/content.json']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Website content successfully saved and updated on server.',
        'timestamp' => time()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
