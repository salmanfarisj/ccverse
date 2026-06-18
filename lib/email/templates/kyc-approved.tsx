/**
 * KYC-approved email template.
 *
 * Notifies a seller that their KYC application has been approved.
 */

export interface KycApprovedProps {
  email: string;
  legalName: string;
  loginUrl: string;
}

const brandColor = '#caf825';
const surface = '#0c0c0c';
const textPrimary = '#f5f5f5';
const textMuted = '#a3a3a3';
const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

export function renderKycApprovedHtml(props: KycApprovedProps): string {
  const { email, legalName, loginUrl } = props;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your KYC has been approved — CC Verse</title>
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
                KYC Application Approved
              </h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Dear ${legalName},
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Great news — your KYC application has been approved. You can now list carbon credits on CC Verse and receive payouts.
              </p>
              <a href="${loginUrl}"
                 style="display:inline-block;background:${brandColor};color:#0c0c0c;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.3px;">
                Go to your dashboard
              </a>
              <p style="margin:32px 0 0 0;font-size:14px;line-height:1.6;color:${textMuted};">
                If you have any questions, please contact our support team.
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

export function renderKycApprovedText(props: KycApprovedProps): string {
  const { email, legalName, loginUrl } = props;

  return `KYC Application Approved — CC Verse

Dear ${legalName},

Great news — your KYC application has been approved. You can now list carbon credits on CC Verse and receive payouts.

Go to your dashboard: ${loginUrl}

If you have any questions, please contact our support team.

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${email}`;
}