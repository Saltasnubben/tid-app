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
        $email = trim($u['email'] ?? '');
        $name = trim($u['name'] ?? '');
        $is_admin = !empty($u['admin']) ? 1 : 0;
        if (!$email || !$name) continue;

        $stmt = $db->prepare("SELECT id, welcomed FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            // New user - generate temp password and send welcome email
            $temp_pass = substr(str_shuffle('abcdefghijkmnpqrstuvwxyz23456789'), 0, 8);
            $hash = password_hash($temp_pass, PASSWORD_DEFAULT);
            $db->prepare("INSERT INTO users (name, email, password_hash, is_admin, welcomed) VALUES (?, ?, ?, ?, 0)")
               ->execute([$name, $email, $hash, $is_admin]);
            sendWelcomeEmail($email, $name, $temp_pass);
            $db->prepare("UPDATE users SET welcomed=1 WHERE email=?")->execute([$email]);
        }
    }
}

function sendWelcomeEmail($email, $name, $password) {
    $subject = "Välkommen till TidRapport!";
    $body = "Hej $name!\n\nDu har fått ett konto på TidRapport.\n\nEmail: $email\nLösenord: $password\n\nLogga in på: https://astronauten.se/tid\n\nMvh\nTidRapport";
    $headers = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\nContent-Type: text/plain; charset=UTF-8";
    @mail($email, $subject, $body, $headers);
}
