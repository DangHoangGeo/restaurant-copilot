// Email delivery service
//
// Sends transactional emails via the Resend API (https://resend.com).
// Requires the RESEND_API_KEY environment variable.
// If the key is absent the function logs a warning and returns without error —
// the invite token is still available for manual distribution.
//
// App base URL is read from NEXT_PUBLIC_APP_URL (e.g. https://app.coorder.io).

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'CoOrder <noreply@coorder.io>';

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
}

// ─── Branded email templates ──────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CoOrder</title>
  <style>
    body { margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { background: #18181b; padding: 24px 32px; }
    .header span { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .body { padding: 32px; color: #374151; line-height: 1.6; }
    .body h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 16px; }
    .body p { margin: 0 0 16px; font-size: 15px; }
    .cta { display: inline-block; margin: 8px 0 24px; padding: 12px 24px; background: #18181b; color: #ffffff !important; font-weight: 600; font-size: 15px; border-radius: 8px; text-decoration: none; }
    .token-box { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 13px; word-break: break-all; color: #374151; margin-bottom: 24px; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><span>CoOrder</span></div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} CoOrder. This email was sent automatically — please do not reply.</div>
  </div>
</body>
</html>`;
}

function inviteEmailHtml(orgName: string, inviteToken: string, acceptUrl: string): string {
  return baseTemplate(`
    <h1>You've been invited to join ${escapeHtml(orgName)}</h1>
    <p>A team member has invited you to join <strong>${escapeHtml(orgName)}</strong> on CoOrder.</p>
    <p>Click the button below to accept the invitation and set up your account:</p>
    <a href="${escapeHtml(acceptUrl)}" class="cta">Accept Invitation</a>
    <p>Or copy this link into your browser:</p>
    <div class="token-box">${escapeHtml(acceptUrl)}</div>
    <p style="font-size:13px;color:#9ca3af;">This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
  `);
}

function resendInviteEmailHtml(orgName: string, inviteToken: string, acceptUrl: string): string {
  return baseTemplate(`
    <h1>Your invitation to ${escapeHtml(orgName)} was resent</h1>
    <p>A fresh invitation link has been generated for <strong>${escapeHtml(orgName)}</strong> on CoOrder.</p>
    <p>Click the button below to accept the invitation:</p>
    <a href="${escapeHtml(acceptUrl)}" class="cta">Accept Invitation</a>
    <p>Or copy this link into your browser:</p>
    <div class="token-box">${escapeHtml(acceptUrl)}</div>
    <p style="font-size:13px;color:#9ca3af;">This invitation expires in 7 days. Previous invite links are no longer valid.</p>
  `);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send to', payload.to);
    return;
  }

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[email] Resend API error', response.status, text);
    // Non-fatal — the invite token is already created; email failure is logged only
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a branded invite email when a new pending invite is created.
 * Falls back gracefully (logs) if RESEND_API_KEY is absent.
 */
export async function sendInviteEmail(
  to: string,
  orgName: string,
  inviteToken: string
): Promise<void> {
  const appUrl = getAppUrl();
  const acceptUrl = `${appUrl}/en/accept-invite?token=${inviteToken}`;
  await sendEmail({
    to,
    subject: `You've been invited to join ${orgName} on CoOrder`,
    html: inviteEmailHtml(orgName, inviteToken, acceptUrl),
  });
}

/**
 * Send a branded email when an invite is resent with a fresh token.
 * Falls back gracefully (logs) if RESEND_API_KEY is absent.
 */
export async function sendResendInviteEmail(
  to: string,
  orgName: string,
  inviteToken: string
): Promise<void> {
  const appUrl = getAppUrl();
  const acceptUrl = `${appUrl}/en/accept-invite?token=${inviteToken}`;
  await sendEmail({
    to,
    subject: `Your invitation to ${orgName} on CoOrder has been resent`,
    html: resendInviteEmailHtml(orgName, inviteToken, acceptUrl),
  });
}
