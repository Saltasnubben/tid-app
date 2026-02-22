<?php
require_once __DIR__ . '/lib/PHPMailer.php';
require_once __DIR__ . '/lib/SMTP.php';
require_once __DIR__ . '/lib/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendMail($to_email, $to_name, $subject, $body, $attachments = []) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = 'send.one.com';
        $mail->Port       = 465;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom(SMTP_USER, FROM_NAME);
        $mail->addAddress($to_email, $to_name);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->isHTML(false);
        // Add PDF attachments: [['data' => '...', 'filename' => 'report.pdf'], ...]
        foreach ($attachments as $att) {
            $mail->addStringAttachment($att['data'], $att['filename'], 'base64', 'application/pdf');
        }
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("TidRapport mail error: " . $e->getMessage());
        return false;
    }
}
