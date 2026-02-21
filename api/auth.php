<?php
require_once 'config.php';
session_start();

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if ($action === 'login') {
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    if (!$email || !$password) json_err('Email och lösenord krävs');

    $db = getDB();
    syncUsers($db);

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_err('Fel email eller lösenord', 401);
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['is_admin'] = (bool)$user['is_admin'];

    json_ok(['name' => $user['name'], 'is_admin' => (bool)$user['is_admin']]);
}

if ($action === 'logout') {
    session_destroy();
    json_ok();
}

if ($action === 'me') {
    if (empty($_SESSION['user_id'])) json_err('Ej inloggad', 401);
    json_ok(['name' => $_SESSION['user_name'], 'is_admin' => (bool)$_SESSION['is_admin']]);
}

json_err('Okänd åtgärd');

function syncUsers($db) {
    if (!file_exists(USERS_JSON)) return;
    $users = json_decode(file_get_contents(USERS_JSON), true) ?? [];

    foreach ($users as $u) {
        $email    = trim($u['email']    ?? '');
        $name     = trim($u['name']     ?? '');
        $password = trim($u['password'] ?? '');
        $is_admin = !empty($u['admin']) ? 1 : 0;

        if (!$email || !$name || !$password) continue;

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Update name, password and admin flag in case they changed
            $db->prepare("UPDATE users SET name=?, password_hash=?, is_admin=? WHERE email=?")
               ->execute([$name, $hash, $is_admin, $email]);
        } else {
            // New user - create account
            $db->prepare("INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)")
               ->execute([$name, $email, $hash, $is_admin]);
        }
    }
}
