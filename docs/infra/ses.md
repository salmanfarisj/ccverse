# SES Sender Identity & Production Access

This document covers the DNS records and AWS steps required to send email from
CC Verse's verified domain, and how to request production (no sandbox) access.

---

## 1. Sender Identity — Domain Verification

Before sending any email you must verify **ownership of the sender domain**.
AWS supports two methods: **DKIM** (preferred) and **SPF**.

### 1a. Verify the domain in AWS SES

1. Open the [SES console](https://console.aws.amazon.com/ses/).
2. Navigate to **Verified identities → Create identity**.
3. Select **Domain** and enter `ccverse.com` (or your chosen sending domain).
4. SES will display three DNS records to add to your domain registrar:

| Type  | Name                          | Value / Data                                   | TTL   |
| ----- | ----------------------------- | ---------------------------------------------- | ----- |
| TXT   | `ccverse.com`                 | `v=spf1 include:amazonses.com ~all`            | 3600  |
| MX    | `feedback._domainkey.ccverse.com` | (SES-provided DKIM record)                | 3600  |
| TXT   | `_amazonses.ccverse.com`      | (SES-provided DKIM token)                      | 3600  |

> **Note:** `feedback._domainkey.ccverse.com` is the DKIM selector. If you use
> multiple selectors, add a TXT record for each (`*._domainkey.ccverse.com`).

5. Add the records at your DNS provider and wait for propagation (up to 72 h;
   typically 5–30 min for AWSRoute53).
6. Back in the SES console, click **Verify**. The domain status shows
   _Verified_ (green) once DNS propagates.

### 1b. DKIM Setup (Recommended)

DKIM cryptographically signs every outbound email so receivers can verify it
was sent from your domain and wasn't tampered with.

- SES automatically generates DKIM tokens when you verify a domain.
- Add the `*._domainkey` and `feedback._domainkey` TXT records as instructed.
- If you use Route53, SES can create the records automatically.

### 1c. DMARC

Add a DMARC TXT record at `_dmarc.ccverse.com`:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@ccverse.com; pct=100;
```

Start with `p=quarantine` (emails that fail DMARC go to spam) rather than
`p=reject` until you are confident everything is configured correctly.

---

## 2. Sender Email Address Verification (andbox Only)

In the SES sandbox you must verify each `From:` address individually.

1. **SES Console → Verified identities → Create identity → Email address**.
2. Enter the address (e.g. `noreply@ccverse.com`).
3. AWS sends a verification email to that address — click the link.
4. The address shows _Verified_ (green) in the console.

> **Tip:** Use a real inbox you control during setup so you can receive the
> verification email.

---

## 3. Request Production (Non-Sandbox) Access

By default every new SES account is in **sandbox mode**:

- You can only send to *verified* addresses.
- The daily sending limit is 200 emails.

### How to exit the sandbox

1. Navigate to **SES Console → Account dashboard → Request production access**.
2. Fill in the use-case description:
   > "CC Verse is a verified carbon-credit marketplace. We send transactional
   > email (welcome, purchase confirmation, certificate delivery) to buyers
   > and sellers who have registered on our platform. Expected volume:
   > [X,000] emails/month."
3. AWS typically reviews within 24–48 business hours.
4. Once approved, the sandbox restriction is removed automatically.

---

## 4. Configuration Set (Event Tracking)

Create a configuration set in SES to capture bounce, complaint, and delivery
events via SNS:

1. **SES Console → Configuration Sets → Create set**.
2. Name it `ccverse-default` (matches `SES_CONFIGURATION_SET` in `.env`).
3. Under **Event destinations**, add an SNS topic:
   - Select **Bounce**, **Complaint**, **Delivery**.
   - Point to an SNS topic you create in SNS (or reuse the one the SES wizard
     creates).
4. Subscribe your email address (or the `/api/webhooks/ses` endpoint) to that
   SNS topic.

> **Important:** The SNS topic must be in the **same AWS region** as your SES
> account.

---

## 5. DNS Checklist

Before going live, confirm all four records are present:

- [ ] `TXT` — SPF: `v=spf1 include:amazonses.com ~all` at `ccverse.com`
- [ ] `TXT` — DKIM selector 1 at `*._domainkey.ccverse.com`
- [ ] `TXT` — DKIM selector 2 (feedback) at `feedback._domainkey.ccverse.com`
- [ ] `TXT` — `_amazonses.ccverse.com` (Amazon's verification token)
- [ ] `TXT` — `_dmarc.ccverse.com` (DMARC policy)

Verify propagation:

```bash
dig TXT ccverse.com +short
dig TXT _amazonses.ccverse.com +short
```

---

## 6. Testing

Send a test email via the SES console or AWS CLI:

```bash
aws ses send-email \
  --from noreply@ccverse.com \
  --destination ToAddresses=your@verified-address.com \
  --message Subject="{Data: 'CC Verse Test'},Body={Text={Data: 'Hello'}}"
```

Or use the `/api/health` endpoint which checks SES describe-account (no actual
send required).

---

## 7. Troubleshooting

| Symptom                        | Likely Cause                       | Fix                                      |
| ------------------------------ | ---------------------------------- | ---------------------------------------- |
| Email goes to spam             | SPF/DKIM not propagated or missing| Check DNS records; wait for propagation  |
| "Email address not verified"   | Sandbox mode, unverified address   | Verify address or request production access |
| Bounce events not received     | SNS topic not subscribed           | Confirm subscription in SNS console      |
| Signature verification fails   | Webhook secret mismatch            | Verify HMAC in `app/api/webhooks/ses`     |

---

*Last updated: 2026-06-17*
