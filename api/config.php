<?php
define('DB_PATH', __DIR__ . '/data/tidrapport.db');
define('USERS_JSON', __DIR__ . '/../users.json');
define('FROM_EMAIL', 'tidrapport@astronauten.se');
define('FROM_NAME',  'TidRapport');
define('SMTP_USER',  'tidrapport@astronauten.se');
define('SMTP_PASS',  'Q_xUW9jU');

// Schema hours per month
define('SCHEMA_HOURS', [
    1 => 160, 2 => 160, 3 => 184, 4 => 152,
    5 => 168, 6 => 160, 7 => 168, 8 => 184,
    9 => 176, 10 => 168, 11 => 176, 12 => 168
]);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function getDB() {
    static $db = null;
    if ($db === null) {
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->exec("PRAGMA journal_mode=WAL");
        initDB($db);
    }
    return $db;
}

function initDB($db) {
    $db->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            welcomed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            p1_start TEXT,
            p1_slut TEXT,
            p1_rast INTEGER DEFAULT 0,
            p2_start TEXT,
            p2_slut TEXT,
            p2_rast INTEGER DEFAULT 0,
            anteckning TEXT,
            UNIQUE(user_id, date),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    ");
}

function json_ok($data = []) {
    echo json_encode(['ok' => true, 'data' => $data]);
    exit;
}

function json_err($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

function requireAuth() {
    session_start();
    if (empty($_SESSION['user_id'])) {
        json_err('Ej inloggad', 401);
    }
    return $_SESSION['user_id'];
}

function requireAdmin() {
    $uid = requireAuth();
    if (empty($_SESSION['is_admin'])) {
        json_err('Ej admin', 403);
    }
    return $uid;
}

function calcHours($start, $slut, $rast_min) {
    if (!$start || !$slut) return 0;
    $s = strtotime("2000-01-01 $start");
    $e = strtotime("2000-01-01 $slut");
    if ($e <= $s) return 0;
    return round(($e - $s) / 3600 - $rast_min / 60, 2);
}
