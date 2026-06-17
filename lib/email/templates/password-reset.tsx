/**
 * Password reset email template.
 *
 * Sends a one-time reset link to the user's registered email.
 */

export interface PasswordResetProps {
  email: string;
  resetUrl: string;
}

const brandColor = '#caf825';
const surface = '#0c0c0c';
const textPrimary = '#f5f5f5';
const textMuted = '#a3a3a3';
const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

export function renderPasswordResetHtml(props: PasswordResetProps): string {
  const { email, resetUrl } = props;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your CC Verse password</title>
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
                Reset your password
              </h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Hello,
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                We received a request to reset the password for your CC Verse account.
                Click the button below to set a new password. This link expires in 30 minutes
                and can only be used once.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:${brandColor};color:#0c0c0c;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.3px;">
                Reset password
              </a>
              <p style="margin:32px 0 0 0;font-size:14px;line-height:1.6;color:${textMuted};">
                If you did not request a password reset, you can safely ignore this email.
                Your password has not been changed.
              </p>
              <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:#525252;">
                The reset link: ${resetUrl}
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

export function renderPasswordResetText(props: PasswordResetProps): string {
  const { email, resetUrl } = props;

  return `Reset your CC Verse password

Hello,

We received a request to reset your password. Click the link below to set a new password.
This link expires in 30 minutes and can only be used once.

${resetUrl}

If you did not request a password reset, you can safely ignore this email.
Your password has not been changed.

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${email}`;
}