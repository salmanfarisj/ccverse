/**
 * KYC-rejected email template.
 *
 * Notifies a seller that their KYC application has been rejected, with a reason.
 */

export interface KycRejectedProps {
  email: string;
  legalName: string;
  reason: string;
  supportUrl: string;
}

const brandColor = '#caf825';
const surface = '#0c0c0c';
const textPrimary = '#f5f5f5';
const textMuted = '#a3a3a3';
const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

export function renderKycRejectedHtml(props: KycRejectedProps): string {
  const { email, legalName, reason, supportUrl } = props;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your KYC application was not approved — CC Verse</title>
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
                KYC Application Not Approved
              </h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Dear ${legalName},
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Thank you for submitting your KYC application. After review, we are unable to approve it at this time.
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                <strong style="color:${textPrimary};">Reason:</strong> ${reason}
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                You may resubmit your application with updated information. If you believe this decision was made in error or have questions, please contact our support team.
              </p>
              <a href="${supportUrl}"
                 style="display:inline-block;background:${brandColor};color:#0c0c0c;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.3px;">
                Contact support
              </a>
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

export function renderKycRejectedText(props: KycRejectedProps): string {
  const { email, legalName, reason, supportUrl } = props;

  return `KYC Application Not Approved — CC Verse

Dear ${legalName},

Thank you for submitting your KYC application. After review, we are unable to approve it at this time.

Reason: ${reason}

You may resubmit your application with updated information. If you believe this decision was made in error or have questions, please contact our support team: ${supportUrl}

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${email}`;
}