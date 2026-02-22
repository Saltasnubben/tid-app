<?php
define('FPDF_FONTPATH', __DIR__ . '/lib/font/');
require_once __DIR__ . '/lib/fpdf.php';

$MONTHS_SV = ['','Januari','Februari','Mars','April','Maj','Juni',
               'Juli','Augusti','September','Oktober','November','December'];
$DAYS_SV   = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];

function sv($str) {
    return iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $str);
}

function calcH($s, $e, $r) {
    if (!$s || !$e) return 0;
    $start = strtotime("2000-01-01 $s");
    $end   = strtotime("2000-01-01 $e");
    if ($end <= $start) return 0;
    return round(($end - $start) / 3600 - $r / 60, 2);
}

function generateTimesheetPDF($name, $year, $month, $entries) {
    global $MONTHS_SV, $DAYS_SV;

    $schema_h = [1=>160,2=>160,3=>184,4=>152,5=>168,6=>160,
                 7=>168,8=>184,9=>176,10=>168,11=>176,12=>168];
    $schema   = $schema_h[$month] ?? 168;
    $days     = cal_days_in_month(CAL_GREGORIAN, $month, $year);

    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->SetMargins(12, 14, 12);
    $pdf->AddPage();
    $pdf->SetAutoPageBreak(true, 16);

    // Header
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->SetTextColor(30, 64, 175);
    $pdf->Cell(0, 8, sv('TidRapport'), 0, 1, 'C');

    $pdf->SetFont('Arial', '', 11);
    $pdf->SetTextColor(60, 60, 60);
    $pdf->Cell(0, 6, sv("$name - {$MONTHS_SV[$month]} $year"), 0, 1, 'C');
    $pdf->Ln(4);

    // Table header
    $cols = [
        ['Datum',       28],
        ['Dag',         10],
        ['P1 Start',    20],
        ['P1 Slut',     20],
        ['P2 Start',    20],
        ['P2 Slut',     20],
        ['Timmar',      18],
        ['Anteckning',  50],
    ];

    $pdf->SetFont('Arial', 'B', 8);
    $pdf->SetFillColor(30, 64, 175);
    $pdf->SetTextColor(255, 255, 255);
    foreach ($cols as [$label, $w]) {
        $pdf->Cell($w, 7, sv($label), 1, 0, 'C', true);
    }
    $pdf->Ln();

    // Rows
    $pdf->SetFont('Arial', '', 8);
    $total = 0;
    $fill  = false;

    for ($d = 1; $d <= $days; $d++) {
        $date  = sprintf('%04d-%02d-%02d', $year, $month, $d);
        $dow   = (int)date('w', strtotime($date));
        $isWe  = ($dow === 0 || $dow === 6);
        $e     = $entries[$date] ?? null;

        if ($isWe) {
            $pdf->SetTextColor(160, 160, 160);
            $pdf->SetFillColor(245, 245, 245);
        } else {
            $pdf->SetTextColor(40, 40, 40);
            $pdf->SetFillColor($fill ? 240 : 255, $fill ? 244 : 255, $fill ? 255 : 255);
        }

        $dayType = $e['day_type'] ?? 'work';
        $h = 0;
        if ($e && $dayType === 'work') {
            $h = calcH($e['p1_start']??'', $e['p1_slut']??'', $e['p1_rast']??0)
               + calcH($e['p2_start']??'', $e['p2_slut']??'', $e['p2_rast']??0);
        } elseif ($e && $dayType !== 'work') {
            $h = 8; // Absence days count as 8h
        }

        $typeLabels = ['semester'=>'Semester','sjuk'=>'Sjukdag','vab'=>'VAB','tjanst'=>'Tjl'];

        $total += $h;
        $h_str = $h > 0 ? number_format($h, 2, '.', '') : '';

        $p1s = $e['p1_start'] ?? '';
        $p1e = $e['p1_slut']  ?? '';
        $p2s = $e['p2_start'] ?? '';
        $p2e = $e['p2_slut']  ?? '';
        $ant = '';
        if ($dayType !== 'work') $ant = $typeLabels[$dayType] ?? $dayType;
        elseif ($e) $ant = $e['anteckning'] ?? '';

        $row = [
            [$date,                         28, 'C'],
            [sv($DAYS_SV[$dow]),            10, 'C'],
            [$p1s,                          20, 'C'],
            [$p1e,                          20, 'C'],
            [$p2s,                          20, 'C'],
            [$p2e,                          20, 'C'],
            [$h_str,                        18, 'C'],
            [sv(mb_substr($ant, 0, 35)),    50, 'L'],
        ];

        foreach ($row as [$val, $w, $align]) {
            $pdf->Cell($w, 6, $val, 1, 0, $align, true);
        }
        $pdf->Ln();
        if (!$isWe) $fill = !$fill;
    }

    // Summary footer
    $pdf->Ln(4);
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->SetTextColor(30, 30, 30);
    $ot = round($total - $schema, 2);
    $otStr = ($ot >= 0 ? '+' : '') . number_format($ot, 2, '.', '');

    $pdf->SetFillColor(230, 238, 255);
    $pdf->Cell(60, 7, sv("Arbetat: {$total}h"), 1, 0, 'C', true);
    $pdf->Cell(60, 7, sv("Schema: {$schema}h"), 1, 0, 'C', true);
    $pdf->Cell(60, 7, sv("Övertid: {$otStr}h"), 1, 0, 'C', true);
    $pdf->Ln();

    // Generated timestamp
    $pdf->Ln(3);
    $pdf->SetFont('Arial', 'I', 7);
    $pdf->SetTextColor(150, 150, 150);
    $pdf->Cell(0, 5, sv('Genererad ' . date('Y-m-d H:i')), 0, 1, 'R');

    return $pdf->Output('S'); // Return as string
}
