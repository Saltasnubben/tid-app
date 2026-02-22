<?php
require_once __DIR__ . '/lib/PHPMailer.php';
require_once __DIR__ . '/lib/SMTP.php';
require_once __DIR__ . '/lib/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

function sendMail($to_email, $to_name, $subject, $body) {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'send.one.com';
        $mail->Port       = 465;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->CharSet    = 'UTF-8';

        // Try without auth first (relay), fall back to auth
        $mail->SMTPAuth   = defined('SMTP_PASS') && SMTP_PASS !== '';
        if ($mail->SMTPAuth) {
            $mail->Username = SMTP_USER;
            $mail->Password = SMTP_PASS;
        }

        $mail->setFrom(SMTP_USER, FROM_NAME);
        $mail->addAddress($to_email, $to_name);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->isHTML(false);

        $mail->send();
        return true;
    } catch (Exception $e) {
        // If no-auth failed, retry with password
        if (!$mail->SMTPAuth && defined('SMTP_PASS') && SMTP_PASS !== '') {
            try {
                $mail2 = new PHPMailer(true);
                $mail2->isSMTP();
                $mail2->Host       = 'send.one.com';
                $mail2->Port       = 465;
                $mail2->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                $mail2->CharSet    = 'UTF-8';
                $mail2->SMTPAuth   = true;
                $mail2->Username   = SMTP_USER;
                $mail2->Password   = SMTP_PASS;
                $mail2->setFrom(SMTP_USER, FROM_NAME);
                $mail2->addAddress($to_email, $to_name);
                $mail2->Subject = $subject;
                $mail2->Body    = $body;
                $mail2->isHTML(false);
                $mail2->send();
                return true;
            } catch (Exception $e2) {
                error_log("Mail failed: " . $e2->getMessage());
                return false;
            }
        }
        error_log("Mail failed: " . $e->getMessage());
        return false;
    }
}
