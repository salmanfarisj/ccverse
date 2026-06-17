/**
 * Verify-email email template.
 *
 * Sends a one-time verification link to activate a new account.
 */

export interface VerifyEmailProps {
  email: string;
  verifyUrl: string;
}

const brandColor = '#caf825';
const surface = '#0c0c0c';
const textPrimary = '#f5f5f5';
const textMuted = '#a3a3a3';
const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

export function renderVerifyEmailHtml(props: VerifyEmailProps): string {
  const { email, verifyUrl } = props;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your CC Verse account</title>
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
                Verify your email address
              </h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Hello,
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Click the button below to verify your email and activate your CC Verse account.
                This link expires in 24 hours.
              </p>
              <a href="${verifyUrl}"
                 style="display:inline-block;background:${brandColor};color:#0c0c0c;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.3px;">
                Verify email address
              </a>
              <p style="margin:32px 0 0 0;font-size:14px;line-height:1.6;color:${textMuted};">
                If you did not create a CC Verse account, please ignore this email — no changes will be made.
              </p>
              <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:#525252;">
                The verification link: ${verifyUrl}
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

export function renderVerifyEmailText(props: VerifyEmailProps): string {
  const { email, verifyUrl } = props;

  return `Verify your CC Verse account

Hello,

Click the link below to verify your email and activate your account.
This link expires in 24 hours.

${verifyUrl}

If you did not create a CC Verse account, please ignore this email.

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${email}`;
}