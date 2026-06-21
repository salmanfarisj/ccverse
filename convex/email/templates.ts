/**
 * Email templates — plain TypeScript HTML/text string builders.
 *
 * Ported from lib/email/templates/*.tsx (which had no React JSX,
 * just template literal HTML strings). Kept in sync with originals;
 * any changes must be reflected in both locations until the lib/ files
 * are deleted in a separate task.
 */

// ---------------------------------------------------------------------------
// Shared design tokens (INVERSA dark-theme brand palette)
// ---------------------------------------------------------------------------

const brandColor = "#caf825";
const surface = "#0c0c0c";
const textPrimary = "#f5f5f5";
const textMuted = "#a3a3a3";
const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

// ---------------------------------------------------------------------------
// KYC Submitted
// ---------------------------------------------------------------------------

export interface KycSubmittedProps {
  email: string;
  legalName?: string;
}

export function renderKycSubmittedHtml(props: KycSubmittedProps): string {
  const { email, legalName } = props;
  const displayName = legalName ?? "Seller";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KYC submitted — CC Verse</title>
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
                KYC application received
              </h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Hello ${displayName},
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                We have received your KYC application and it is now under review by our compliance team.
                You will receive an email once a decision has been made.
              </p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${textMuted};">
                Typically, KYC reviews are completed within 2–3 business days. If you have any questions,
                please contact our support team.
              </p>
              <p style="margin:32px 0 0 0;font-size:14px;line-height:1.6;color:${textMuted};">
                You can monitor your KYC status at any time by visiting your seller dashboard.
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

export function renderKycSubmittedText(props: KycSubmittedProps): string {
  const { email, legalName } = props;
  const displayName = legalName ?? "Seller";

  return `KYC application received — CC Verse

Hello ${displayName},

We have received your KYC application and it is now under review by our compliance team.
You will receive an email once a decision has been made.

Typically, KYC reviews are completed within 2–3 business days. If you have any questions,
please contact our support team.

You can monitor your KYC status at any time by visiting your seller dashboard.

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${email}`;
}

// ---------------------------------------------------------------------------
// KYC Approved
// ---------------------------------------------------------------------------

export interface KycApprovedProps {
  email: string;
  legalName: string;
  loginUrl: string;
}

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

// ---------------------------------------------------------------------------
// KYC Rejected
// ---------------------------------------------------------------------------

export interface KycRejectedProps {
  email: string;
  legalName: string;
  reason: string;
  supportUrl: string;
}

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
