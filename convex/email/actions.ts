"use node";

/**
 * Email actions — AWS SES v2 Node actions.
 *
 * Ported from lib/email/ses.ts (SesDriver). Dev-mock behaviour is
 * preserved 1:1: when SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY are
 * both empty/unset, a `dev-{Date.now()}-mock` messageId is returned and
 * no real SES call is made.
 *
 * The three typed KYC wrappers (kyc-submitted/approved/rejected) are
 * public actions so KYC API routes can call them as
 * `api.email.actions.sendKyc*EmailAction`.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// ---------------------------------------------------------------------------
// Env reading (Node runtime — process.env is available)
// ---------------------------------------------------------------------------

function getSesRegion(): string {
  return process.env.SES_REGION ?? "us-east-1";
}

function getSesSenderDomain(): string {
  return process.env.SES_SENDER_DOMAIN ?? "example.com";
}

function getSesConfigurationSet(): string | undefined {
  return process.env.SES_CONFIGURATION_SET;
}

function getSesAccessKeyId(): string {
  return process.env.SES_ACCESS_KEY_ID ?? "";
}

function getSesSecretAccessKey(): string {
  return process.env.SES_SECRET_ACCESS_KEY ?? "";
}

/** True when SES credentials are not configured (dev mode). */
function isSesDevMode(): boolean {
  return !getSesAccessKeyId() || !getSesSecretAccessKey();
}

// ---------------------------------------------------------------------------
// Generic sendEmail action
// ---------------------------------------------------------------------------

type SendEmailResult =
  | { success: true; messageId: string; error: null }
  | { success: false; messageId: null; error: string };

export const sendEmailAction = action({
  args: {
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    html: v.string(),
    text: v.string(),
    tags: v.optional(v.array(v.string())),
    from: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SendEmailResult> => {
    const toAddresses = Array.isArray(args.to) ? args.to : [args.to];
    const senderDomain = getSesSenderDomain();
    const configurationSet = getSesConfigurationSet();
    const devMode = isSesDevMode();

    // Dev mode: log and return a fake ID — do not call SES.
    if (devMode) {
      console.warn("[email] Dev mode — email not sent", {
        to: toAddresses,
        subject: args.subject,
        tags: args.tags,
      });
      return { success: true, messageId: `dev-${Date.now()}-mock`, error: null };
    }

    const client = new SESv2Client({
      region: getSesRegion(),
      credentials: {
        accessKeyId: getSesAccessKeyId(),
        secretAccessKey: getSesSecretAccessKey(),
      },
    });

    const command = new SendEmailCommand({
      FromEmailAddress: args.from ?? `noreply@${senderDomain}`,
      Destination: {
        ToAddresses: toAddresses,
      },
      Content: {
        Simple: {
          Subject: {
            Data: args.subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: args.html,
              Charset: "UTF-8",
            },
            Text: {
              Data: args.text,
              Charset: "UTF-8",
            },
          },
        },
      },
      ConfigurationSetName: configurationSet,
      EmailTags: (args.tags ?? []).map((tag) => ({ Name: "template", Value: tag })),
    });

    try {
      const result = await client.send(command);
      const messageId = result.MessageId ?? "unknown";
      console.info("[email] Sent", { messageId, to: toAddresses, subject: args.subject, tags: args.tags });
      return { success: true, messageId, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error("[email] Send failed", { error, to: toAddresses, subject: args.subject });
      return { success: false, messageId: null, error };
    }
  },
});

// ---------------------------------------------------------------------------
// Typed KYC wrappers
// ---------------------------------------------------------------------------

type KycEmailResult =
  | { success: true; messageId: string; error: null }
  | { success: false; messageId: null; error: string };

export const sendKycSubmittedEmailAction = action({
  args: {
    userId: v.id("users"),
    legalName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<KycEmailResult> => {
    // Look up the user's email
    const user = await ctx.runQuery(internal.users.queries.getUserByIdQuery, {
      userId: args.userId,
    });
    if (!user?.email) {
      return { success: false, messageId: null, error: "User not found or has no email" };
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KYC submitted — CC Verse</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:'Geist', 'Helvetica Neue', Arial, sans-serif;color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 32px 0;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#caf825;letter-spacing:-0.5px;">CC Verse</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#141414;border-radius:8px;padding:40px;">
              <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#f5f5f5;">KYC application received</h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">Hello ${args.legalName ?? user.legalName ?? "Seller"},</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">We have received your KYC application and it is now under review by our compliance team. You will receive an email once a decision has been made.</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">Typically, KYC reviews are completed within 2–3 business days. If you have any questions, please contact our support team.</p>
              <p style="margin:32px 0 0 0;font-size:14px;line-height:1.6;color:#a3a3a3;">You can monitor your KYC status at any time by visiting your seller dashboard.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0 0;">
              <hr style="border:none;border-top:1px solid #262626;margin:0 0 24px 0;">
              <p style="margin:0;font-size:12px;color:#a3a3a3;">CC Verse &mdash; Verified Carbon Credit Marketplace<br><span style="color:#525252;">This email was sent to ${user.email}</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `KYC application received — CC Verse

Hello ${args.legalName ?? user.legalName ?? "Seller"},

We have received your KYC application and it is now under review by our compliance team.
You will receive an email once a decision has been made.

Typically, KYC reviews are completed within 2–3 business days. If you have any questions,
please contact our support team.

You can monitor your KYC status at any time by visiting your seller dashboard.

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${user.email}`;

    return ctx.runAction(api.email.actions.sendEmailAction, {
      to: user.email,
      subject: "KYC application received — CC Verse",
      html,
      text,
      tags: ["kyc-submitted"],
    });
  },
});

export const sendKycApprovedEmailAction = action({
  args: {
    userId: v.id("users"),
    legalName: v.string(),
    loginUrl: v.string(),
  },
  handler: async (ctx, args): Promise<KycEmailResult> => {
    const user = await ctx.runQuery(internal.users.queries.getUserByIdQuery, {
      userId: args.userId,
    });
    if (!user?.email) {
      return { success: false, messageId: null, error: "User not found or has no email" };
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your KYC has been approved — CC Verse</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:'Geist', 'Helvetica Neue', Arial, sans-serif;color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 32px 0;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#caf825;letter-spacing:-0.5px;">CC Verse</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#141414;border-radius:8px;padding:40px;">
              <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#f5f5f5;">KYC Application Approved</h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">Dear ${args.legalName},</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">Great news — your KYC application has been approved. You can now list carbon credits on CC Verse and receive payouts.</p>
              <a href="${args.loginUrl}" style="display:inline-block;background:#caf825;color:#0c0c0c;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.3px;">Go to your dashboard</a>
              <p style="margin:32px 0 0 0;font-size:14px;line-height:1.6;color:#a3a3a3;">If you have any questions, please contact our support team.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0 0;">
              <hr style="border:none;border-top:1px solid #262626;margin:0 0 24px 0;">
              <p style="margin:0;font-size:12px;color:#a3a3a3;">CC Verse &mdash; Verified Carbon Credit Marketplace<br><span style="color:#525252;">This email was sent to ${user.email}</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `KYC Application Approved — CC Verse

Dear ${args.legalName},

Great news — your KYC application has been approved. You can now list carbon credits on CC Verse and receive payouts.

Go to your dashboard: ${args.loginUrl}

If you have any questions, please contact our support team.

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${user.email}`;

    return ctx.runAction(api.email.actions.sendEmailAction, {
      to: user.email,
      subject: "KYC Application Approved — CC Verse",
      html,
      text,
      tags: ["kyc-approved"],
    });
  },
});

export const sendKycRejectedEmailAction = action({
  args: {
    userId: v.id("users"),
    legalName: v.string(),
    reason: v.string(),
    supportUrl: v.string(),
  },
  handler: async (ctx, args): Promise<KycEmailResult> => {
    const user = await ctx.runQuery(internal.users.queries.getUserByIdQuery, {
      userId: args.userId,
    });
    if (!user?.email) {
      return { success: false, messageId: null, error: "User not found or has no email" };
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your KYC application was not approved — CC Verse</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:'Geist', 'Helvetica Neue', Arial, sans-serif;color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 32px 0;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#caf825;letter-spacing:-0.5px;">CC Verse</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#141414;border-radius:8px;padding:40px;">
              <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#f5f5f5;">KYC Application Not Approved</h2>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">Dear ${args.legalName},</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">Thank you for submitting your KYC application. After review, we are unable to approve it at this time.</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;"><strong style="color:#f5f5f5;">Reason:</strong> ${args.reason}</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#a3a3a3;">You may resubmit your application with updated information. If you believe this decision was made in error or have questions, please contact our support team.</p>
              <a href="${args.supportUrl}" style="display:inline-block;background:#caf825;color:#0c0c0c;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:0.3px;">Contact support</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0 0;">
              <hr style="border:none;border-top:1px solid #262626;margin:0 0 24px 0;">
              <p style="margin:0;font-size:12px;color:#a3a3a3;">CC Verse &mdash; Verified Carbon Credit Marketplace<br><span style="color:#525252;">This email was sent to ${user.email}</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `KYC Application Not Approved — CC Verse

Dear ${args.legalName},

Thank you for submitting your KYC application. After review, we are unable to approve it at this time.

Reason: ${args.reason}

You may resubmit your application with updated information. If you believe this decision was made in error or have questions, please contact our support team: ${args.supportUrl}

--
CC Verse — Verified Carbon Credit Marketplace
This email was sent to ${user.email}`;

    return ctx.runAction(api.email.actions.sendEmailAction, {
      to: user.email,
      subject: "KYC Application Not Approved — CC Verse",
      html,
      text,
      tags: ["kyc-rejected"],
    });
  },
});
