<?php
require_once 'config.php';

requireAdmin();
$db = getDB();
$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// List all users
if ($action === 'users') {
    $stmt = $db->query("SELECT id, name, email, is_admin FROM users ORDER BY name");
    json_ok($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Get users.json content
if ($action === 'get_users_json') {
    if (!file_exists(USERS_JSON)) json_ok([]);
    $users = json_decode(file_get_contents(USERS_JSON), true) ?? [];
    json_ok($users);
}

// Save users.json content
if ($action === 'save_users_json') {
    $users = $body['users'] ?? [];
    if (!is_array($users)) json_err('Ogiltigt format');

    // Validate each user
    foreach ($users as $u) {
        if (empty($u['name']) || empty($u['email']) || empty($u['password'])) {
            json_err('Namn, email och lösenord krävs för alla användare');
        }
    }

    file_put_contents(USERS_JSON, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    json_ok(['count' => count($users)]);
}

// Get one user's month data
if ($action === 'user_month') {
    $target_uid = intval($_GET['user_id']);
    $year  = intval($_GET['year']  ?? date('Y'));
    $month = intval($_GET['month'] ?? date('n'));

    $stmt = $db->prepare("SELECT * FROM entries WHERE user_id=? AND date LIKE ? ORDER BY date");
    $stmt->execute([$target_uid, sprintf('%04d-%02d-%%', $year, $month)]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $entries = [];
    $total = 0;
    foreach ($rows as $r) {
        $h = calcHours($r['p1_start'],$r['p1_slut'],$r['p1_rast'])
           + calcHours($r['p2_start'],$r['p2_slut'],$r['p2_rast']);
        $r['timmar'] = $h;
        $entries[$r['date']] = $r;
        $total += $h;
    }

    $schema = SCHEMA_HOURS[$month] ?? 168;
    json_ok(['entries' => $entries, 'schema' => $schema, 'worked' => round($total,2), 'overtime' => round($total-$schema,2)]);
}

// Send monthly report for selected users to admin's email
if ($action === 'send_reports') {
    $year       = intval($body['year']       ?? date('Y'));
    $month      = intval($body['month']      ?? date('n'));
    $user_ids   = $body['user_ids']          ?? [];   // empty = all users
    $send_to    = $body['send_to']           ?? 'users'; // 'admin' | 'users'
    $schema     = SCHEMA_HOURS[$month]       ?? 168;

    $months_sv = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

    // Fetch target users
    if (!empty($user_ids)) {
        $placeholders = implode(',', array_fill(0, count($user_ids), '?'));
        $stmt = $db->prepare("SELECT * FROM users WHERE id IN ($placeholders) ORDER BY name");
        $stmt->execute($user_ids);
    } else {
        $stmt = $db->query("SELECT * FROM users ORDER BY name");
    }
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $sent = 0;

    // Admin email (send_to=admin → all reports in one mail to admin)
    $admin_email = $_SESSION['user_email'] ?? '';
    $admin_name  = $_SESSION['user_name']  ?? 'Admin';
    $combined_body = "Tidrapporter för {$months_sv[$month]} $year\n";
    $combined_body .= str_repeat('=', 40) . "\n\n";

    foreach ($users as $u) {
        $stmt2 = $db->prepare("SELECT * FROM entries WHERE user_id=? AND date LIKE ? ORDER BY date");
        $stmt2->execute([$u['id'], sprintf('%04d-%02d-%%', $year, $month)]);
        $rows = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        $total = 0;
        $lines = [];
        foreach ($rows as $r) {
            $h = calcHours($r['p1_start'],$r['p1_slut'],$r['p1_rast'])
               + calcHours($r['p2_start'],$r['p2_slut'],$r['p2_rast']);
            $total += $h;
            if ($h > 0) {
                $d    = date('d/m D', strtotime($r['date']));
                $note = $r['anteckning'] ? " – {$r['anteckning']}" : '';
                $lines[] = "  $d: {$h}h$note";
            }
        }

        $overtime = round($total - $schema, 2);
        $ot_str   = $overtime >= 0 ? "+$overtime" : "$overtime";

        if ($send_to === 'admin') {
            $combined_body .= "{$u['name']}\n" . str_repeat('-', 30) . "\n";
            $combined_body .= implode("\n", $lines ?: ['  (inga registrerade tider)']);
            $combined_body .= "\n  Totalt: {$total}h | Schema: {$schema}h | Övertid: {$ot_str}h\n\n";
        } else {
            $subject   = "Tidrapport {$months_sv[$month]} $year";
            $body_text = "Hej {$u['name']}!\n\nDin tidrapport för {$months_sv[$month]} $year:\n\n";
            $body_text .= implode("\n", $lines ?: ['(inga registrerade tider)']);
            $body_text .= "\n\nTotalt: {$total}h\nSchema: {$schema}h\nÖvertid: {$ot_str}h\n\nMvh\nTidRapport";
            $headers = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\nContent-Type: text/plain; charset=UTF-8";
            if (@mail($u['email'], $subject, $body_text, $headers)) $sent++;
        }
    }

    if ($send_to === 'admin' && $admin_email) {
        $subject = "Tidrapporter {$months_sv[$month]} $year";
        $headers = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\nContent-Type: text/plain; charset=UTF-8";
        if (@mail($admin_email, $subject, $combined_body, $headers)) $sent = count($users);
    }

    json_ok(['sent' => $sent, 'total' => count($users), 'month_name' => $months_sv[$month]]);
}

json_err('Okänd åtgärd');
