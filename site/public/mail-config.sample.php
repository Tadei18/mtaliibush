<?php
/**
 * SMTP configuration for send-enquiry.php — SAMPLE / TEMPLATE.
 *
 * DO NOT put real credentials in this file. On the server, copy it to
 * mail-config.php (which is gitignored) and fill in the real mailbox
 * password, then chmod it 600 so it is not world-readable:
 *
 *     cp mail-config.sample.php mail-config.php
 *     nano mail-config.php        # set SMTP_PASS to the mailbox password
 *     chmod 600 mail-config.php
 *
 * The mailbox (SMTP_USER) must exist in cPanel → Email Accounts.
 */

return [
    // Outgoing mail server — usually mail.<yourdomain>.
    'SMTP_HOST'   => 'mail.mtaliibushcamps.com',

    // 465 = implicit SSL. If the host blocks 465, use the fallback below.
    'SMTP_PORT'   => 465,

    // 'ssl' for port 465. Fallback: use 'tls' with SMTP_PORT 587 if 465/ssl
    // is blocked by the host or times out.
    'SMTP_SECURE' => 'ssl',

    // Authenticated mailbox — the real account we log in as to send.
    // This does NOT have to match MAIL_TO; it only has to exist in cPanel and
    // match SMTP_PASS. Point it at whichever mailbox you authenticate as.
    'SMTP_USER'   => 'info@mtaliibushcamps.com',

    // The mailbox password. Set this only in the real mail-config.php on the
    // server — never commit it to git.
    'SMTP_PASS'   => 'CHANGE_ME',

    // Where enquiry notifications are delivered. This mailbox must exist in
    // cPanel → Email Accounts before the form will deliver anything.
    'MAIL_TO'     => 'reservations@mtaliibushcamps.com',

    // From address — MUST be the authenticated mailbox so SPF/DKIM pass.
    // Do NOT set this to the visitor's address (that would be spoofing).
    'MAIL_FROM'   => 'info@mtaliibushcamps.com',
];
