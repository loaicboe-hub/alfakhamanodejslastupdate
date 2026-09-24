<?php
/**
 * AL FAKHAMA (HARV FRIES) - Database Connection Configuration (Hostinger MySQL)
 */

// Prevent direct script access outside API
defined('ALFAKHAMA_APP') or define('ALFAKHAMA_APP', true);

// ============================================================================
// HOSTINGER DATABASE CREDENTIALS
// Update these values with the details from your Hostinger hPanel -> Databases
// ============================================================================
define('DB_HOST', 'localhost');          // Hostinger default is 'localhost'
define('DB_NAME', 'u128613351_alfakhama');
define('DB_USER', 'u128613351_dbadmin');
define('DB_PASS', 'Alfakhama@2027');
define('DB_CHARSET', 'utf8mb4');

// Admin Dashboard Secret Key (Change this to any secure password for dashboard access)
define('ADMIN_SECRET_KEY', 'Alfakhama2026@GoldFries');

// Optional Email Notification Recipient
define('NOTIFICATION_EMAIL', 'info@alfakhamafactory.com');

/**
 * Get PDO Database Connection instance
 * @return PDO
 */
function getDbConnection() {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Return clean JSON error response without exposing sensitive server paths
            http_response_code(500);
            header('Content-Type: application/json; charset=UTF-8');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed. Please check Hostinger MySQL credentials in api/config.php.',
                'error_code' => 'DB_CONNECTION_ERROR'
            ]);
            exit;
        }
    }

    return $pdo;
}
