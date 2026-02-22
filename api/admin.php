<?php
require_once 'config.php';
require_once 'mail.php';

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
            if (sendMail($u['email'], $u['name'], $subject, $body_text)) $sent++;
        }
    }

    if ($send_to === 'admin' && $admin_email) {
        $subject = "Tidrapporter {$months_sv[$month]} $year";
        if (sendMail($admin_email, $admin_name, $subject, $combined_body)) $sent = count($users);
    }

    json_ok(['sent' => $sent, 'total' => count($users), 'month_name' => $months_sv[$month]]);
}

// Delete user
if ($action === 'delete_user') {
    $uid = intval($body['user_id'] ?? 0);
    if (!$uid) json_err('Ogiltigt user_id');
    if ($uid === intval($_SESSION['user_id'])) json_err('Kan inte ta bort dig själv');
    $db->prepare("DELETE FROM entries WHERE user_id=?")->execute([$uid]);
    $db->prepare("DELETE FROM users WHERE id=?")->execute([$uid]);
    json_ok();
}

// Download CSV template for a given user + month
if ($action === 'csv_template') {
    $year  = intval($body['year']  ?? date('Y'));
    $month = intval($body['month'] ?? date('n'));
    $uid   = intval($body['user_id'] ?? 0);

    $user = null;
    if ($uid) {
        $s = $db->prepare("SELECT name FROM users WHERE id=?");
        $s->execute([$uid]); $user = $s->fetch(PDO::FETCH_ASSOC);
    }
    $username = $user ? $user['name'] : 'Okand';
    $days = cal_days_in_month(CAL_GREGORIAN, $month, $year);

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="tidrapport_' . $year . '_' . str_pad($month,2,'0',STR_PAD_LEFT) . '_' . preg_replace('/\s+/','_',$username) . '.csv"');
    // BOM for Excel UTF-8
    echo "\xEF\xBB\xBF";
    echo "Datum,P1 Start,P1 Slut,P2 Start,P2 Slut,Rast (min),Anteckning\n";
    for ($d = 1; $d <= $days; $d++) {
        $date = sprintf('%04d-%02d-%02d', $year, $month, $d);
        $dow  = date('N', strtotime($date)); // 6=Sat, 7=Sun
        if ($dow >= 6) continue; // Skip weekends
        echo "$date,08:00,17:00,,,60,\n";
    }
    exit;
}

// Import CSV timesheet data for a user
if ($action === 'import_csv') {
    $uid = intval($_POST['user_id'] ?? 0);
    if (!$uid) json_err('Välj en användare');
    if (empty($_FILES['file'])) json_err('Ingen fil uppladdad');

    $file = $_FILES['file']['tmp_name'];
    if (!$file || !is_readable($file)) json_err('Kunde inte läsa filen');

    $handle = fopen($file, 'r');
    if (!$handle) json_err('Kunde inte öppna filen');

    // Skip BOM if present
    $bom = fread($handle, 3);
    if ($bom !== "\xEF\xBB\xBF") rewind($handle);

    // Skip header row
    fgetcsv($handle);

    $inserted = 0; $skipped = 0; $errors = [];
    $stmt = $db->prepare("
        INSERT INTO entries (user_id, date, p1_start, p1_slut, p2_start, p2_slut, rast, note)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(user_id, date) DO UPDATE SET
            p1_start=excluded.p1_start, p1_slut=excluded.p1_slut,
            p2_start=excluded.p2_start, p2_slut=excluded.p2_slut,
            rast=excluded.rast, note=excluded.note
    ");

    while (($row = fgetcsv($handle)) !== false) {
        if (empty($row[0])) continue;
        $date = trim($row[0]);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $errors[] = "Ogiltigt datum: $date"; $skipped++; continue;
        }
        $p1s = trim($row[1] ?? ''); $p1e = trim($row[2] ?? '');
        $p2s = trim($row[3] ?? ''); $p2e = trim($row[4] ?? '');
        $rast = intval($row[5] ?? 0);
        $note = trim($row[6] ?? '');

        // Normalize time values
        $clean = function($t) { return preg_match('/^\d{2}:\d{2}$/', $t) ? $t : null; };
        $stmt->execute([$uid, $date, $clean($p1s), $clean($p1e), $clean($p2s), $clean($p2e), $rast, $note]);
        $inserted++;
    }
    fclose($handle);
    json_ok(['inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors]);
}

json_err('Okänd åtgärd');
