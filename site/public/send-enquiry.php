<?php
/**
 * Enquiry form handler for Mtalii Bush Camps.
 *
 * Receives a POST from the enquiry form, validates it, and emails the
 * submission to MAIL_TO via authenticated SMTP (PHPMailer). Vendored
 * PHPMailer lives in vendor/phpmailer so this works on shared cPanel
 * hosting without Composer.
 *
 * Responds with JSON: { "success": true } or
 * { "success": false, "error": "..." }.
 */

declare(strict_types=1);

// ---- PHPMailer (vendored, no Composer) ------------------------------------
require __DIR__ . '/vendor/phpmailer/Exception.php';
require __DIR__ . '/vendor/phpmailer/PHPMailer.php';
require __DIR__ . '/vendor/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Send a JSON response and stop.
 */
function respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

/**
 * Trim + strip control characters from a single-line value.
 */
function clean_line(string $value): string
{
    $value = trim($value);
    // Remove CR/LF (header-injection guard) and other control chars.
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value);
    return trim((string) $value);
}

// ---- Only accept POST ------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Method not allowed.']);
}

// ---- Honeypot: silently accept & drop bots ---------------------------------
if (isset($_POST['bot-field']) && trim((string) $_POST['bot-field']) !== '') {
    respond(200, ['success' => true]);
}

// ---- Collect + sanitise ----------------------------------------------------
$name     = clean_line((string) ($_POST['name'] ?? ''));
$email    = clean_line((string) ($_POST['email'] ?? ''));
$phone    = clean_line((string) ($_POST['phone'] ?? ''));
$checkIn  = clean_line((string) ($_POST['check-in'] ?? ''));
$checkOut = clean_line((string) ($_POST['check-out'] ?? ''));
$guests   = clean_line((string) ($_POST['guests'] ?? ''));
$interest = clean_line((string) ($_POST['interest'] ?? ''));
// Message may be multi-line — keep newlines, just trim and drop control chars.
$message  = trim((string) ($_POST['message'] ?? ''));
$message  = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $message);

// ---- Validate required fields ----------------------------------------------
$errors = [];
if ($name === '') {
    $errors[] = 'name';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'email';
}
if ($message === '') {
    $errors[] = 'message';
}
if ($errors) {
    respond(422, [
        'success' => false,
        'error'   => 'Please provide your name, a valid email address, and a message.',
    ]);
}

// ---- Load SMTP config (never committed) ------------------------------------
$configPath = __DIR__ . '/mail-config.php';
if (!is_file($configPath)) {
    error_log('send-enquiry.php: mail-config.php is missing.');
    respond(500, [
        'success' => false,
        'error'   => 'The server is not configured to send mail yet. Please email us directly.',
    ]);
}
$config = require $configPath;

// ---- Build the email -------------------------------------------------------
$fields = [
    'Name'      => $name,
    'Email'     => $email,
    'Phone'     => $phone !== '' ? $phone : '—',
    'Check-in'  => $checkIn !== '' ? $checkIn : '—',
    'Check-out' => $checkOut !== '' ? $checkOut : '—',
    'Guests'    => $guests !== '' ? $guests : '—',
    'Interest'  => $interest !== '' ? $interest : '—',
];

// Plain-text alternative.
$textLines = [];
foreach ($fields as $label => $value) {
    $textLines[] = $label . ': ' . $value;
}
$textLines[] = '';
$textLines[] = 'Message:';
$textLines[] = $message;
$textBody = implode("\n", $textLines);

// HTML body.
$rows = '';
foreach ($fields as $label => $value) {
    $rows .= '<tr>'
        . '<td style="padding:8px 16px 8px 0;color:#7A4E1B;font:600 12px/1.4 Arial,sans-serif;'
        . 'text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;white-space:nowrap;">'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
        . '</td>'
        . '<td style="padding:8px 0;color:#241C12;font:15px/1.5 Arial,sans-serif;">'
        . htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
        . '</td>'
        . '</tr>';
}
$messageHtml = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

$htmlBody = '<div style="background:#F6F1E7;padding:24px;">'
    . '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;'
    . 'padding:28px 32px;font-family:Arial,sans-serif;">'
    . '<h1 style="margin:0 0 4px;color:#186030;font:600 20px/1.3 Georgia,serif;">New enquiry</h1>'
    . '<p style="margin:0 0 20px;color:#7A4E1B;font:13px/1.4 Arial,sans-serif;">Mtalii Bush Camps</p>'
    . '<table style="border-collapse:collapse;width:100%;">' . $rows . '</table>'
    . '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #E7DEC9;">'
    . '<div style="color:#7A4E1B;font:600 12px/1.4 Arial,sans-serif;text-transform:uppercase;'
    . 'letter-spacing:0.08em;margin-bottom:8px;">Message</div>'
    . '<div style="color:#241C12;font:15px/1.6 Arial,sans-serif;">' . $messageHtml . '</div>'
    . '</div></div></div>';

// ---- Send ------------------------------------------------------------------
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = (string) $config['SMTP_HOST'];
    $mail->SMTPAuth   = true;
    $mail->Username   = (string) $config['SMTP_USER'];
    $mail->Password   = (string) $config['SMTP_PASS'];
    $mail->SMTPSecure = (string) $config['SMTP_SECURE']; // 'ssl' or 'tls'
    $mail->Port       = (int) $config['SMTP_PORT'];
    $mail->CharSet    = 'UTF-8';

    // From the authenticated mailbox (SPF/DKIM-safe); reply goes to the visitor.
    $mail->setFrom((string) $config['MAIL_FROM'], 'Mtalii Bush Camps Website');
    $mail->addAddress((string) $config['MAIL_TO']);
    $mail->addReplyTo($email, $name !== '' ? $name : $email);

    $mail->isHTML(true);
    $mail->Subject = 'New enquiry from ' . $name . ' — Mtalii Bush Camps';
    $mail->Body    = $htmlBody;
    $mail->AltBody = $textBody;

    $mail->send();
    respond(200, ['success' => true]);
} catch (PHPMailerException $e) {
    // Log the real reason server-side; never leak SMTP details to the client.
    error_log('send-enquiry.php mail error: ' . $mail->ErrorInfo);
    respond(500, [
        'success' => false,
        'error'   => 'Sorry, we could not send your enquiry right now. Please try again or contact us directly.',
    ]);
}
