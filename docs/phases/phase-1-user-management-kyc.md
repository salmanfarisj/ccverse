# Phase 1 — User Management, Auth & KYC (manual)

> **Goal:** End-to-end user lifecycle for Buyers and Sellers, including registration, email verification, login, password reset, MFA (mandatory for Auditor/Admin), account lockout, immutable auth-event audit log, profile management, and a **manual** KYC flow that gates Seller listings.

> **MVP simplification:** KYC is **manual for MVP** — Seller uploads KYC documents, an Admin reviews and approves/rejects. No Persona/Onfido/Sumsub integration. Migration path to a vendor is captured as a post-MVP task.

---

## 1. Demoable outcome

- A new visitor can register as a Buyer (email + password) and receive a verification email; login is blocked until the email is verified.
- A new visitor can apply to register as a Seller (entity form); the Seller uploads KYC documents; `kyc_status = pending` until an Admin reviews and sets it to `approved` / `rejected`.
- An Admin can create Auditor and Admin accounts from the Admin console; those accounts cannot log in without MFA enrollment.
- All four roles can log in, log out, reset their password, and update basic profile fields.
- Account lockout triggers after 5 failed attempts (30-minute cooldown).
- All auth events (login, logout, MFA, lockout, password change) appear in the audit log.
- A Seller cannot create a project (Phase 2) or listing (Phase 3) while `kyc_status != approved`.

---

## 2. Functional requirements in scope

- FR-U-001 Buyer registration with email verification.
- FR-U-002 Seller application with legal-entity details.
- FR-U-003 KYC required before first Seller listing. (Manual review for MVP.)
- FR-U-004 Auditor/Admin accounts created only by an existing Admin.
- FR-U-005 Email+password auth; mandatory MFA for Auditor/Admin.
- FR-U-006 Password reset by email; lockout after 5 failed attempts for 30 minutes.
- FR-U-007 Immutable auth-event audit log.
- FR-U-008 Profile view/update; verified-field changes require re-verification.

Implicit but in scope:
- A minimum KYC tier for low-value Buyers (per FRD Appendix E) — see `[USER DEPENDENCY]`. Manual review handles the threshold check for MVP.

---

## 3. Non-functional requirements touched

- 4.2 Security: TLS, Argon2id, MFA, RBAC enforcement, encrypted PII at rest.
- 4.5 Usability: registration → login in ≤ 5 steps; WCAG 2.1 AA.
- 4.6 Auditability: every auth event appended to `audit_log`.

---

## 4. Technical implementation

### 4.1 Data model (delta)

Extend `User`:

```
User {
  id            uuid pk
  email         citext unique
  password_hash text
  role          enum('buyer','seller','auditor','admin')
  status        enum('active','suspended','banned','pending_verification')
  mfa_enabled   boolean default false
  mfa_secret    text (encrypted at rest) — null until enrolled
  failed_login_count int default 0
  locked_until  timestamptz
  email_verified boolean default false
  email_verified_at timestamptz
  created_at    timestamptz default now()
  updated_at    timestamptz
  last_login_at timestamptz
  last_login_ip inet
}
```

New tables:

```
SellerProfile {
  user_id        uuid pk fk User(id)
  legal_name     text
  registration_no text
  country        text(2)        -- ISO 3166-1 alpha-2
  authorized_signatory_name text
  authorized_signatory_email citext
  kyc_status     enum('not_started','pending','approved','rejected','expired')
  kyc_method     enum('manual')   -- future: 'persona','onfido','sumsub'
  kyc_reviewed_by uuid fk User(id) nullable
  kyc_reviewed_at timestamptz
  kyc_review_notes text
  bank_account_id uuid fk BankAccount(id)
  created_at, updated_at
}

BuyerProfile {
  user_id        uuid pk fk User(id)
  legal_name     text
  country        text(2)
  kyc_status     enum('not_required','pending','approved','rejected','expired')
  kyc_method     enum('none','manual')   -- manual review if Buyer triggers KYC
  default_currency enum('INR','USD') default 'INR'
  created_at, updated_at
}

KycDocument {
  id            uuid pk
  subject_user_id uuid fk User(id)
  document_type enum('pan','gstin','passport','utility_bill','bank_statement','incorporation_cert','other')
  s3_key        text
  sha256        text
  uploaded_at   timestamptz
  uploaded_by   uuid fk User(id)
  review_status enum('pending','approved','rejected') default 'pending'
  reviewed_by   uuid fk User(id) nullable
  reviewed_at   timestamptz
  review_notes  text
}

BankAccount {
  id              uuid pk
  user_id         uuid fk User(id)
  account_holder  text
  bank_name       text
  account_no_last4 text
  routing_or_ifsc text
  verified        boolean default false
  verified_at     timestamptz
  created_at
}

EmailVerificationToken {
  token       text pk
  user_id     uuid fk
  expires_at  timestamptz
  consumed_at timestamptz
}

PasswordResetToken { token, user_id, expires_at, consumed_at, ip }

MfaEnrollment { user_id, secret_encrypted, enrolled_at, last_used_at, backup_codes_hashed[] }
```

### 4.2 Routes & screens

Public/auth:
- `/register` — Buyer self-registration.
- `/register/seller` — Seller entity application + KYC document upload.
- `/login`
- `/forgot-password`, `/reset-password/[token]`
- `/verify-email/[token]`
- `/mfa/enroll`, `/mfa/verify`

Authenticated (any role):
- `/account` — profile view/edit; verified fields re-prompt verification on change.
- `/account/security` — change password, MFA manage (where applicable).

Admin (gated by `admin` role):
- `/admin/users` — list, search, view, suspend, ban, remove.
- `/admin/users/new-staff` — create Auditor/Admin (forces MFA enrollment on first login).
- `/admin/users/[id]` — view, edit role, force MFA reset, ban.
- `/admin/kyc` — pending KYC applications; review queue with document viewer.

Seller area (gated; banner if KYC not approved):
- `/seller` dashboard with KYC status widget and "Upload KYC documents" CTA.

Buyer area (gated):
- `/buyer` dashboard.

### 4.3 API surface (new)

```
POST /api/auth/register/buyer
POST /api/auth/register/seller
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/verify-email
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/mfa/enroll
POST /api/auth/mfa/verify
GET  /api/me
PATCH /api/me
POST /api/me/change-password

POST /api/seller/kyc/documents              -- upload a KYC document
GET  /api/seller/kyc                        -- current KYC status + documents

POST /api/admin/kyc/:userId/approve         -- manual KYC approval
POST /api/admin/kyc/:userId/reject          -- manual KYC rejection
GET  /api/admin/kyc                         -- pending review queue

GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
POST   /api/admin/users/:id/ban
POST   /api/admin/users/:id/suspend
POST   /api/admin/users/:id/reset-mfa
```

### 4.4 Auth flow details

- **Password hashing:** Argon2id (`memoryCost: 19456, timeCost: 2, parallelism: 1`, tunable) — matches OWASP guidance.
- **Session:** `iron-session` cookie, sealed with `SESSION_SECRET`, 24-hour absolute lifetime, sliding refresh.
- **MFA:** TOTP (RFC 6238) via `otplib`, 30-second window, 1-step skew. 10 single-use backup codes stored as Argon2id hashes.
- **Lockout:** DB-backed counter (single source of truth, works across replicas). Threshold = 5; cooldown = 30 min. Counter resets on successful login.
- **Email verification:** single-use token, 24-hour TTL, also consumed at first login if still valid.
- **Password reset:** single-use token, 30-minute TTL; invalidates all existing sessions on success.
- **Re-verification trigger:** changing `legal_name` on a verified Seller sets `SellerProfile.kyc_status='expired'` and routes through manual review again.

### 4.5 Manual KYC (MVP)

- **Seller side:**
  - After registration, Seller is sent to a KYC wizard.
  - Steps: (1) entity details, (2) document upload (one or more of: PAN, GSTIN, incorporation certificate, bank statement, authorized signatory ID, utility bill), (3) bank account details, (4) review and submit.
  - On submit: `kyc_status = 'pending'`, `KycDocument` rows created in `pending` review state. SES email to the Seller confirming receipt.
- **Admin side:**
  - `/admin/kyc` lists pending applications with the Seller name, country, submission time, document count, and a "Review" CTA.
  - Detail view shows the Seller's entity details, all uploaded documents (rendered in an iframe from a presigned S3 URL with a 5-minute TTL), and a panel:
    - **Approve** (notes optional) — sets `kyc_status='approved'`, marks all `KycDocument` rows `approved`, audit log row, SES email to Seller.
    - **Reject** (notes required) — sets `kyc_status='rejected'`, marks documents `rejected`, audit log row, SES email to Seller with reason.
  - Admins can re-open a closed application; the previous decision is preserved as a `kyc_review_notes` history (full immutability deferred to Phase 4's `AuditDecision` model).

### 4.6 Email service (AWS SES)

- `packages/email` exposes an `EmailDriver` interface; `SesDriver` is the production implementation. SES is the only outbound email channel.
- Verified sender domain (`ccverse.<tld>`) with DKIM, SPF, DMARC. Dedicated identities: `noreply@`, `accounts@`, `audit@`, `kyc@`.
- Configuration set captures bounce / complaint / delivery events; webhook handler updates the SES suppression list and writes to `audit_log`.
- Templates in `packages/email/templates/` (React Email → HTML + plain text):
  - `verify-email.tsx`
  - `password-reset.tsx`
  - `mfa-enrolled.tsx`
  - `kyc-submitted.tsx`
  - `kyc-approved.tsx`, `kyc-rejected.tsx`
  - `account-banned.tsx`
- All templates carry an unsubscribe header for marketing (none in v1.0; mandatory transactional alerts are not unsubscribe-able per FR-N-002).
- Brand voice per `DESIGN.md` (JetBrains Mono labels, NB International Pro body).
- Local dev uses SES sandbox with verified test addresses; CI mocks the driver.

### 4.7 Audit log

- Centralized `audit.write({ actor, action, target, payload })` in `packages/audit`.
- Auth events emitted:
  - `auth.register`, `auth.email_verified`, `auth.login`, `auth.logout`, `auth.login_failed`, `auth.locked`, `auth.unlocked`, `auth.mfa_enrolled`, `auth.mfa_verified`, `auth.password_changed`, `auth.password_reset_requested`, `auth.password_reset_completed`, `user.updated`, `user.banned`, `user.suspended`, `user.role_changed`, `kyc.submitted`, `kyc.approved`, `kyc.rejected`.
- Each row includes `ip` and `user_agent`.

### 4.8 Security

- `helmet` headers, CSP (allow self + S3 assets), `Permissions-Policy` disabling unused features.
- Rate limit on `/api/auth/*` at the proxy: login 5/min/IP, register 3/hour/IP, password reset 3/hour/email, MFA verify 5/min/user.
- Bank account details and KYC documents: SSE-KMS encryption at rest, access logged.

### 4.9 Migration path to external KYC

- The `SellerProfile.kyc_method` column is enum-typed but only `manual` is supported in MVP.
- When a vendor (Persona/Onfido/Sumsub) is selected, add a new enum value, build a `KycProvider` interface, and route the existing `/api/seller/kyc/start` and webhook endpoints through it. No schema change to `KycDocument`.
- The Admin review queue continues to be the source of truth for compliance — vendor checks are inputs to it, not a replacement.

---

## 5. Data model changes

- Adds `User` columns listed above.
- Adds `SellerProfile`, `BuyerProfile`, `KycDocument`, `BankAccount`, `EmailVerificationToken`, `PasswordResetToken`, `MfaEnrollment`.
- `AuditLog` already exists from Phase 0; this phase wires it.

---

## 6. API surface (new)

See §4.3.

---

## 7. UI surfaces (new)

See §4.2. All forms follow `DESIGN.md`:
- Inputs: transparent background, bottom border only, JetBrains Mono placeholder.
- Buttons: `LimeButton` for primary, `GhostButton` for secondary.
- Errors: red `#cc4444` inline (token added to `tokens.css` — `[USER DEPENDENCY]` to confirm exact shade with design).

---

## 8. Cross-cutting concerns

- **RBAC:** `requireRole` enforced on all admin endpoints.
- **Auditability:** every state change logged.
- **MFA enforcement:** Auditor/Admin login flow forces `/mfa/enroll` on first authenticated session before any privileged page is reachable.
- **PII handling:** KYC documents stored in S3 with object key namespacing `kyc/{userId}/{documentType}`; access via presigned URLs only.

---

## 9. Test plan

- **Unit:**
  - Password hashing rejects weak passwords.
  - Lockout counter increments and resets correctly.
  - TOTP verification with valid/invalid codes.
  - Email token expiry / consumption.
- **Integration:**
  - Register → verify email → login works.
  - Register seller → upload KYC docs → Admin approves → `kyc_status=approved`.
  - Register seller → Admin rejects → Seller cannot reach `/seller/projects/new` (UI hidden + API returns 403).
  - 5 failed logins → 6th returns 423 with `Retry-After`.
  - Forgot password → reset link → password changed → old sessions invalidated.
  - Admin creates Auditor → first login forces MFA enrollment → role-gated route accessible.
- **E2E (Playwright):**
  - Full happy paths: buyer self-register, seller application + KYC, admin KYC approval, admin staff creation.
  - MFA login flow.
- **Security:**
  - Pen-test checklist: rate limits, IDOR on `/api/admin/users/:id` returns 403, CSRF protections on cookie-authed POSTs.
- **Accessibility:** axe-core on every new page.

---

## 10. Acceptance criteria

- [ ] Buyer can register, verify email, and log in.
- [ ] Seller can submit a KYC application; status updates only via Admin action.
- [ ] Seller cannot reach `/seller/projects/new` (UI hidden + API returns 403) unless `kyc_status='approved'`.
- [ ] Auditor/Admin cannot log in to privileged pages without MFA.
- [ ] 5 failed logins lock the account for 30 minutes; counter resets on success.
- [ ] Password reset invalidates existing sessions.
- [ ] All auth events appear in `audit_log` with `ip` and `user_agent`.
- [ ] KYC documents and bank account details are encrypted at rest (SSE-KMS).
- [ ] WCAG 2.1 AA: zero serious/critical axe issues on all new screens.
- [ ] Rate-limit tests pass (login 5/min, register 3/hour, etc.).
- [ ] KYC rejection includes a reason in the email to the Seller.

---

## 11. Dependencies on other phases

- Requires Phase 0 (app shell, design system, audit log, RBAC, env loader, email service, S3).

---

## 12. USER DEPENDENCY

- **[USER DEPENDENCY] Minimum KYC tier for low-value Buyers** — threshold amount, currency, and whether KYC is required for ALL buyers or only above-threshold. For MVP, manual review is the only path; the threshold defines when a Buyer is *required* to submit KYC (otherwise the field can be "not required" forever). Drives `BuyerProfile.kyc_status` policy and `FR-B` checkout gating in Phase 6.
- **[USER DEPENDENCY] AWS SES production access** — SES must be moved out of sandbox before any buyer can receive a real verification email.
- **[USER DEPENDENCY] Sender domain & DNS** — confirm `ccverse.<tld>` and provide DNS access for DKIM/SPF/DMARC records.
- **[USER DEPENDENCY] Brand voice & email copy** — sign-off on transactional email templates.
- **[USER DEPENDENCY] Data retention policy for KYC docs** — confirm 7-year minimum (NFR 4.6) or specific jurisdictional minimums.
- **[USER DEPENDENCY] Error/warning color tokens** — confirm exact shade to add to `DESIGN.md` (current design system has no red defined).
- **[USER DEPENDENCY] Legal copy** — Terms of Service, Privacy Policy, KYC consent text.
- **[USER DEPENDENCY] Backup-code regeneration policy** — confirm whether users may regenerate, and how many codes are issued.
- **[USER DEPENDENCY] Account deletion vs soft-ban** — confirm soft-ban (status change) is sufficient for v1.0; deletion deferred to v1.1.
- **[USER DEPENDENCY] Approved country list** — list of ISO 3166-1 alpha-2 country codes that may register as Sellers/Buyers (sanctions/AML).
- **[USER DEPENDENCY] KYC review SLA** — confirm how quickly an Admin must review a KYC submission (proposal: 1 business day; queue timer shows SLA).
- **[USER DEPENDENCY] Document types accepted for manual KYC** — confirm the list (proposal: PAN, GSTIN, passport, incorporation certificate, bank statement, utility bill, authorized signatory ID).

---

## 13. Out of scope for Phase 1

- Project registration (CCV-######) → Phase 2.
- Listings → Phase 3.
- Payments → Phase 6.
- Certificate issuance → Phase 7.
- Mobile number MFA (SMS) — TOTP only in v1.0.
- Social login (Google/Apple) — deferred to v1.1.
- Account deletion flow — deferred to v1.1.
- External KYC vendor integration — deferred to post-MVP.

---

## 14. Estimated effort

- 2 weeks, 2–3 engineers.
