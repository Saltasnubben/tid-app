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

// Send monthly report to all users
if ($action === 'send_reports') {
    $year  = intval($body['year']  ?? date('Y'));
    $month = intval($body['month'] ?? date('n'));
    $schema = SCHEMA_HOURS[$month] ?? 168;

    $months_sv = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

    $stmt = $db->query("SELECT * FROM users ORDER BY name");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $sent = 0;

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
            $date = date('d/m', strtotime($r['date']));
            $note = $r['anteckning'] ? " – {$r['anteckning']}" : '';
            $lines[] = "$date: {$h}h$note";
        }

        $overtime = round($total - $schema, 2);
        $ot_str = $overtime >= 0 ? "+$overtime" : "$overtime";

        $subject = "Tidrapport {$months_sv[$month]} $year";
        $body_text = "Hej {$u['name']}!\n\nHär är din tidrapport för {$months_sv[$month]} $year:\n\n";
        $body_text .= implode("\n", $lines);
        $body_text .= "\n\nTotalt: {$total}h\nSchema: {$schema}h\nÖvertid: {$ot_str}h\n\nMvh\nTidRapport";

        $headers = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\nContent-Type: text/plain; charset=UTF-8";
        if (@mail($u['email'], $subject, $body_text, $headers)) $sent++;
    }

    json_ok(['sent' => $sent, 'total' => count($users)]);
}

json_err('Okänd åtgärd');
