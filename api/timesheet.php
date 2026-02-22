<?php
require_once 'config.php';

$uid = requireAuth();
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $body['action'] ?? '';
$db = getDB();

// GET month data
if ($action === 'month') {
    $year  = intval($_GET['year']  ?? date('Y'));
    $month = intval($_GET['month'] ?? date('n'));

    $stmt = $db->prepare("SELECT * FROM entries WHERE user_id=? AND date LIKE ? ORDER BY date");
    $stmt->execute([$uid, sprintf('%04d-%02d-%%', $year, $month)]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $entries = [];
    foreach ($rows as $r) {
        $h = calcHours($r['p1_start'], $r['p1_slut'], $r['p1_rast'])
           + calcHours($r['p2_start'], $r['p2_slut'], $r['p2_rast']);
        $r['timmar'] = $h;
        $entries[$r['date']] = $r;
    }

    $schema = SCHEMA_HOURS[$month] ?? 168;
    $worked = array_sum(array_column($entries, 'timmar'));
    $overtime = round($worked - $schema, 2);

    json_ok(['entries' => $entries, 'schema' => $schema, 'worked' => round($worked,2), 'overtime' => $overtime]);
}

// SAVE entry
if ($action === 'save') {
    $date = $body['date'] ?? '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) json_err('Ogiltigt datum');

    $p1s  = $body['p1_start']  ?? null;
    $p1e  = $body['p1_slut']   ?? null;
    $p1r  = intval($body['p1_rast']  ?? 0);
    $p2s  = $body['p2_start']  ?? null;
    $p2e  = $body['p2_slut']   ?? null;
    $p2r  = intval($body['p2_rast']  ?? 0);
    $ant  = $body['anteckning'] ?? null;
    $type = in_array($body['day_type'] ?? '', ['work','semester','sjuk','vab','tjanst'])
            ? $body['day_type'] : 'work';

    $db->prepare("
        INSERT INTO entries (user_id,date,p1_start,p1_slut,p1_rast,p2_start,p2_slut,p2_rast,anteckning,day_type)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(user_id,date) DO UPDATE SET
            p1_start=excluded.p1_start, p1_slut=excluded.p1_slut, p1_rast=excluded.p1_rast,
            p2_start=excluded.p2_start, p2_slut=excluded.p2_slut, p2_rast=excluded.p2_rast,
            anteckning=excluded.anteckning, day_type=excluded.day_type
    ")->execute([$uid, $date, $p1s, $p1e, $p1r, $p2s, $p2e, $p2r, $ant, $type]);

    $h = calcHours($p1s,$p1e,$p1r) + calcHours($p2s,$p2e,$p2r);
    json_ok(['timmar' => $h, 'day_type' => $type]);
}

// GET year summary
if ($action === 'summary') {
    $year = intval($_GET['year'] ?? date('Y'));
    $summary = [];
    for ($m = 1; $m <= 12; $m++) {
        $stmt = $db->prepare("SELECT p1_start,p1_slut,p1_rast,p2_start,p2_slut,p2_rast FROM entries WHERE user_id=? AND date LIKE ?");
        $stmt->execute([$uid, sprintf('%04d-%02d-%%', $year, $m)]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $worked = 0;
        foreach ($rows as $r) {
            $worked += calcHours($r['p1_start'],$r['p1_slut'],$r['p1_rast'])
                     + calcHours($r['p2_start'],$r['p2_slut'],$r['p2_rast']);
        }
        $schema = SCHEMA_HOURS[$m] ?? 168;
        $summary[$m] = ['schema' => $schema, 'worked' => round($worked,2), 'overtime' => round($worked-$schema,2)];
    }
    json_ok($summary);
}

json_err('Okänd åtgärd');
