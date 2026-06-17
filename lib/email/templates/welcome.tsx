/**
 * Welcome email template.
 *
 * Renders to HTML + plain text using a plain JSX-free function.
 * Brand voice: professional, clear, no fluff (per DESIGN.md).
 */

export interface WelcomeEmailProps {
  name?: string;
  email: string;
  role: string;
  loginUrl: string;
}

const brandColor = '#caf825'; // lime-4 from design tokens
const surface = '#0c0c0c';
const textPrimary = '#f5f5f5';
const textMuted = '#a3a3a3';
const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

/**
 * Render the welcome email as HTML.
 */
export function renderWelcomeEmailHtml(props: WelcomeEmailProps): string {
  const { name, email, role, loginUrl } = props;
  const displayName = name ?? email.split('@')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CC Verse</title>
</head>
<body style="margin:0;padding:0;background:${surface};font-family:${fontFamily};color:${textPrimary};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${surface};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:${brandColor};letter-spacing:-0.5px;">
                CC Verse
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#141414;border-radius:8px;padding:40px;">
              <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:${textPrimary};">
                Welcome${displayName ? `, ${displayName}` : ''}
              </h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Your CC Verse account has been created. You are registered as a <strong style="color:${textPrimary};">${role}</strong>.
              </p>
              <p style="margin:0 0 32px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                To get started, log in to your dashboard:
              </p>
              <a href="${loginUrl}"
                 style="display:inline-block;background:${brandColor};color:#0c0c0c;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.3px;">
                Log in to CC Verse
              </a>
              <p style="margin:32px 0 0 0;font-size:14px;line-height:1.6;color:${textMuted};">
                If you did not create this account, please ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;">
              <hr style="border:none;border-top:1px solid #262626;margin:0 0 24px 0;">
              <p style="margin:0;font-size:12px;color:${textMuted};">
                CC Verse &mdash; Verified Carbon Credit Marketplace<br>
                <span style="color:#525252;">This email was sent to ${email}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Render the welcome email as plain text.
 */
export function renderWelcomeEmailText(props: WelcomeEmailProps): string {
  const { name, email, role, loginUrl } = props;
  const displayName = name ?? email.split('@')[0];

  return `Welcome to CC Verse

Hello${displayName ? `, ${displayName}` : ''},

Your CC Verse account has been created.

Role: ${role}
Email: ${email}

Log in: ${loginUrl}

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${email}`;
}
