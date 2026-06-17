# Phase 1 — Task Breakdown

> Granular, individually-trackable tasks derived from `docs/phases/phase-1-user-management-kyc.md`.
> Each task is scoped to a single PR-sized unit of work. Tasks are ordered for sequential execution.

**MVP simplifications applied:**
- MFA (TOTP + backup codes) deferred to post-MVP.
- Automated E2E/Playwright suite deferred; basic happy-path unit tests only.
- Advanced security hardening (pen-test checklist, rate-limit automation in code) deferred.

**Audit logging:** Auth events are wired in this phase per FR-U-007 (Phase 0 left a stub). Each task emits relevant events via `lib/audit/`.

---

## Task Tracker

> **Legend** — ⬜ pending · 🟡 in-progress · 🔴 blocked · ✅ done · ⏭ skipped

### Progress

| Metric         | Count |
| -------------- | ----- |
| ⬜ Pending     | 5     |
| **Total**      | 5     |

### Master task list

| ID      | Title                                                     | Status |
| ------- | --------------------------------------------------------- | :----: |
| T1-1    | Schema + Seed: User columns, all auth tables, test data   |   ⬜   |
| T1-2    | Buyer registration + email verification                    |   ⬜   |
| T1-3    | Login, logout, lockout, password reset                    |   ⬜   |
| T1-4    | Seller registration + KYC wizard + document upload        |   ⬜   |
| T1-5    | Admin user management + KYC review queue + Account pages  |   ⬜   |

---

## T1-1 — Schema + Seed: User columns, all auth tables, test data

### What

Extend the `User` model with Phase 1 columns, create all auth-adjacent tables, run migration, and seed test accounts for manual testing.

**New/extended Prisma columns on `User`:**
- `role` — enum: `buyer`, `seller`, `auditor`, `admin` (default `buyer`)
- `status` — enum: `active`, `suspended`, `banned`, `pending_verification` (default `pending_verification`)
- `passwordHash` — text (null until set)
- `emailVerified` — boolean (default false)
- `emailVerifiedAt` — timestamptz (null)
- `failedLoginCount` — int (default 0)
- `lockedUntil` — timestamptz (null)
- `lastLoginAt` — timestamptz (null)
- `lastLoginIp` — inet (null)

**New tables:**
- `SellerProfile` — userId pk, legalName, registrationNo, country, authorizedSignatoryName, authorizedSignatoryEmail, kycStatus (not_started|pending|approved|rejected|expired), kycMethod (manual), kycReviewedBy, kycReviewedAt, kycReviewNotes, bankAccountId fk, createdAt, updatedAt
- `BuyerProfile` — userId pk, legalName, country, kycStatus (not_required|pending|approved|rejected|expired), kycMethod (none|manual), defaultCurrency (INR|USD), createdAt, updatedAt
- `KycDocument` — id, subjectUserId fk, documentType (pan|gstin|passport|utility_bill|bank_statement|incorporation_cert|other), s3Key, sha256, uploadedAt, uploadedBy fk, reviewStatus (pending|approved|rejected), reviewedBy, reviewedAt, reviewNotes
- `BankAccount` — id, userId fk, accountHolder, bankName, accountNoLast4, routingOrIfsc, verified, verifiedAt, createdAt
- `EmailVerificationToken` — token pk (text), userId fk, expiresAt, consumedAt
- `PasswordResetToken` — token pk (text), userId fk, expiresAt, consumedAt, ip inet

**Migration:**
- `prisma migrate dev` produces a clean migration.
- Existing Phase 0 data (AuditLog, FailedJob, PlatformConfig, User rows from seed) is unaffected.

**Seed data (`prisma/seed.ts`):**
- **Test admin** — email `admin@ccverse.local`, role=admin, status=active, emailVerified=true, password set.
- **Test buyer** — email `buyer@ccverse.local`, role=buyer, status=active, emailVerified=true, BuyerProfile created.
- **Test seller** — email `seller@ccverse.local`, role=seller, status=active, emailVerified=true, SellerProfile (kycStatus=approved for easy manual testing), BankAccount created.
- Seed is idempotent (uses `upsert`); skips gracefully if accounts exist.

**Depends on:** Phase 0 T0-3-*

---

## T1-2 — Buyer registration + email verification

### What

Public buyer self-registration, email verification flow, and account activation. Auth audit events emitted.

**Pages:**
- `GET/POST /register` — Buyer registration form: email, password.

**API endpoints:**
- `POST /api/auth/register/buyer` — Create User (status=pending_verification, role=buyer), create BuyerProfile (kycStatus=not_required), generate `EmailVerificationToken` (24h TTL), send verification email. Duplicate email → 409.
- `GET /api/auth/verify-email/[token]` — Validate token (not expired, not consumed), set `user.emailVerified=true`, `user.emailVerifiedAt=now`, `user.status=active`, consume token. Invalid/expired → 400. Emits `auth.register` + `auth.email_verified` to audit log.

**Lockout before verification:**
- Login (`POST /api/auth/login`, built in T1-3) must reject users where `emailVerified=false` with 403 and message "Verify your email first."

**Email template:**
- `verify-email.tsx` — React Email: verification link pointing to `/verify-email/[token]`.

**Acceptance criteria:**
- POST /api/auth/register/buyer → 201, email sent, User created with status=pending_verification.
- GET /api/auth/verify-email/valid-token → 200, user.status=active, emailVerified=true.
- GET /api/auth/verify-email/invalid-token → 400.
- Login blocked (403) until email verified.

**Depends on:** T1-1

---

## T1-3 — Login, logout, lockout, password reset

### What

Core session auth: login with account lockout, logout, and password reset. Auth audit events emitted throughout.

**Pages:**
- `GET/POST /login`
- `POST /logout` (form action or API)
- `GET/POST /forgot-password`
- `GET/POST /reset-password/[token]`

**API endpoints:**
- `POST /api/auth/login` — Verify email+password. Reject if `status!=active` (403). Reject if `lockedUntil > now()` (423 with `Retry-After` header). On bad password: increment `failedLoginCount`; if count reaches 5 set `lockedUntil=now+30min`; emit `auth.login_failed`; emit `auth.locked` when lockout triggers. On success: reset `failedLoginCount` and `lockedUntil` to 0/null, set `lastLoginAt` and `lastLoginIp`, save session. Emit `auth.login`.
- `POST /api/auth/logout` — Destroy session cookie. Emit `auth.logout`.
- `POST /api/auth/forgot-password` — Find user by email (always return 200 to prevent email enumeration), generate `PasswordResetToken` (30min TTL, single-use), send reset email. Emit `auth.password_reset_requested`.
- `POST /api/auth/reset-password` — Validate token (not expired, not consumed). Hash new password with argon2id, update `passwordHash`, consume token. Delete all existing sessions (invalidate cookie). Emit `auth.password_reset_completed`.

**Email template:**
- `password-reset.tsx` — React Email: reset link pointing to `/reset-password/[token]`.

**Lockout summary:**
- 5 wrong passwords → lockout for 30 min.
- Counter resets on successful login.
- 6th attempt while locked → 423 with `Retry-After: 1800`.

**Acceptance criteria:**
- 5 wrong logins → 6th returns 423 with `Retry-After`.
- Successful login → counter resets, session created.
- Password reset → token consumed, new password works, old sessions dead.
- All auth events (`auth.login`, `auth.logout`, `auth.login_failed`, `auth.locked`, `auth.password_reset_requested`, `auth.password_reset_completed`) written to `AuditLog`.

**Depends on:** T1-1, T1-2

---

## T1-4 — Seller registration + KYC wizard + document upload + seller dashboard

### What

Seller registration (entity form), KYC wizard, document upload to S3, and seller dashboard with KYC status gate. Emits auth + KYC audit events.

**Pages:**
- `GET/POST /register/seller` — Seller entity registration form: email, password, legalName, registrationNo, country, authorizedSignatoryName, authorizedSignatoryEmail.
- `GET /seller/kyc` — KYC wizard (4 steps). Shows current step based on completion.
- `GET /seller` — Seller dashboard with KYC status banner + CTA. If `kycStatus!=approved`, banner says "KYC required — complete verification to list credits."

**API endpoints:**
- `POST /api/auth/register/seller` — Create User (status=pending_verification, role=seller), create SellerProfile (kycStatus=not_started), generate EmailVerificationToken, send verification email. Duplicate email → 409. Emit `auth.register`.
- `GET /api/seller/kyc` — Return full KYC state: seller profile fields, documents list, bank account status, current step.
- `PATCH /api/seller/kyc` — Update entity details on SellerProfile (legalName, registrationNo, country, authorizedSignatoryName, authorizedSignatoryEmail).
- `POST /api/seller/kyc/documents` — Accept `documentType` and file. Compute SHA256. Upload to S3 at `kyc/{userId}/{documentType}/{uuid}` with SSE-KMS. Create KycDocument row (reviewStatus=pending). Return document id.
- `POST /api/seller/kyc/bank-account` — Create BankAccount row.
- `POST /api/seller/kyc/submit` — Validate at least one document uploaded. Set `kycStatus=pending`. Send `kyc-submitted` email. Emit `kyc.submitted`.

**Seller gate (Phase 2 forward-reference):**
- `middleware.ts` (or route-level guard) blocks access to `/seller/projects/new` and `POST /api/seller/projects` if `kycStatus!=approved` — returns 403 with message.
- UI hides the "New Project" CTA when KYC is not approved.

**Email template:**
- `kyc-submitted.tsx` — React Email: acknowledgment that KYC is under review.

**S3 integration:**
- Documents stored in `ccverse-kyc` bucket at `kyc/{userId}/{documentType}/{docId}`.
- SSE-KMS enforced on all PUTs.

**Acceptance criteria:**
- POST /api/auth/register/seller → 201, email verified, but kycStatus=not_started.
- Seller can complete all 4 wizard steps and submit → kycStatus=pending.
- Document uploads land in S3 with correct namespacing and SHA256 stored.
- Hitting `/seller/projects/new` (Phase 2 route) with unapproved KYC → 403.
- `kyc.submitted` audit event emitted on submit.

**Depends on:** T1-1, T1-2, T0-5-4

---

## T1-5 — Admin user management + KYC review queue + Account pages

### What

Admin user CRUD + ban/suspend; KYC review queue with approve/reject; authenticated account/profile pages and password change. Emits user + KYC audit events.

**Pages:**
- `GET /admin/users` — User list with search.
- `GET/POST /admin/users/new-staff` — Create Auditor or Admin account (no MFA in MVP).
- `GET /admin/users/[id]` — User detail + edit role / force reset.
- `GET /admin/kyc` — Pending KYC applications queue.
- `GET /admin/kyc/[userId]` — KYC review detail: entity info, document viewer (presigned URLs), decision panel.
- `GET /account` — Profile view (fields vary by role).
- `GET /account/security` — Change password form.

**API endpoints — Admin users:**
- `GET /api/admin/users` — List all users; search by email.
- `POST /api/admin/users` — Create Auditor or Admin. Sends set-password email (or sets temp password). Emit `user.role_changed`.
- `PATCH /api/admin/users/:id` — Update role or status.
- `POST /api/admin/users/:id/ban` — Set status=banned. Emit `user.banned`.
- `POST /api/admin/users/:id/suspend` — Set status=suspended. Emit `user.suspended`.

**API endpoints — Admin KYC:**
- `GET /api/admin/kyc` — Pending queue: userId, sellerName, country, submittedAt, documentCount.
- `GET /api/admin/kyc/:userId` — Full detail: entity details, all KycDocument rows with S3 keys.
- `GET /api/admin/kyc/:userId/documents/:docId/url` — Generate 5-min presigned GET URL for S3 document.
- `POST /api/admin/kyc/:userId/approve` — Set kycStatus=approved, all KycDocument reviewStatus=approved, set kycReviewedBy/At. Send `kyc-approved` email. Emit `kyc.approved`.
- `POST /api/admin/kyc/:userId/reject` — Set kycStatus=rejected, all KycDocument reviewStatus=rejected, require reviewNotes. Send `kyc-rejected` email with reason. Emit `kyc.rejected`.

**API endpoints — Account/profile:**
- `GET /api/me` — Current user profile (shape varies by role).
- `PATCH /api/me` — Update allowed fields. Seller changing `legalName` → set `kycStatus=expired` (triggers re-verification flow). Emit `user.updated`.
- `POST /api/me/change-password` — Verify current password, argon2id hash new password, invalidate all sessions. Emit `auth.password_changed`.

**Email templates:**
- `kyc-approved.tsx` — "Your KYC has been approved — you can now list credits."
- `kyc-rejected.tsx` — "Your KYC has been rejected" with reason field.

**Acceptance criteria:**
- Admin can list, create, ban, and suspend users.
- Admin can view KYC queue; can open a submission and see all documents via presigned URLs.
- Admin approve → seller kycStatus=approved; seller can now reach Phase 2 routes.
- Admin reject → seller email contains the rejection reason.
- Buyer can view and update their profile.
- Seller changing legalName → kycStatus becomes `expired`.
- Password change requires current password and invalidates all sessions.
- All user and KYC audit events written to AuditLog.

**Depends on:** T1-1, T1-2, T1-3, T1-4

---

## Out of scope for Phase 1 (deferred to post-MVP)

- MFA enrollment + TOTP login (Auditor/Admin login with password only in MVP)
- E2E/Playwright test suite
- Admin delete-user flow
- Rate-limit enforcement in application code (handled at proxy level)
- Pen-test security checklist
- Account deletion flow
- External KYC vendor integration (Persona/Onfido/Sumsub)
- axe-core CI enforcement on new pages

### What

Extend the `User` model with Phase 1 columns and create all auth-adjacent tables.

**New/extended Prisma columns on `User`:**
- `role` — enum: `buyer`, `seller`, `auditor`, `admin` (default `buyer`)
- `status` — enum: `active`, `suspended`, `banned`, `pending_verification` (default `pending_verification`)
- `passwordHash` — text (null until set)
- `emailVerified` — boolean (default false)
- `emailVerifiedAt` — timestamptz (null)
- `failedLoginCount` — int (default 0)
- `lockedUntil` — timestamptz (null)
- `lastLoginAt` — timestamptz (null)
- `lastLoginIp` — inet (null)

**New tables:**
- `SellerProfile` — userId pk, legalName, registrationNo, country, authorizedSignatoryName, authorizedSignatoryEmail, kycStatus (not_started|pending|approved|rejected|expired), kycMethod (manual), kycReviewedBy, kycReviewedAt, kycReviewNotes, bankAccountId fk, createdAt, updatedAt
- `BuyerProfile` — userId pk, legalName, country, kycStatus (not_required|pending|approved|rejected|expired), kycMethod (none|manual), defaultCurrency (INR|USD), createdAt, updatedAt
- `KycDocument` — id, subjectUserId fk, documentType (pan|gstin|passport|utility_bill|bank_statement|incorporation_cert|other), s3Key, sha256, uploadedAt, uploadedBy fk, reviewStatus (pending|approved|rejected), reviewedBy, reviewedAt, reviewNotes
- `BankAccount` — id, userId fk, accountHolder, bankName, accountNoLast4, routingOrIfsc, verified, verifiedAt, createdAt
- `EmailVerificationToken` — token pk (text), userId fk, expiresAt, consumedAt
- `PasswordResetToken` — token pk (text), userId fk, expiresAt, consumedAt, ip inet

**Acceptance criteria:**
- `prisma migrate dev` produces a clean migration with all new tables and columns.
- Existing Phase 0 data (AuditLog, FailedJob, PlatformConfig, User) is unaffected.
- Enum types generated by Prisma are used consistently.

**Depends on:** Phase 0 T0-3-*

---

## T1-2 — Buyer & Seller registration + email verification

### What

Public registration flows and email verification.

**Routes:**
- `GET/POST /register` — Buyer self-registration: email, password.
- `GET/POST /register/seller` — Seller entity application: email, password, legalName, registrationNo, country, authorizedSignatoryName, authorizedSignatoryEmail.
- `GET /verify-email/[token]` — Consume `EmailVerificationToken`, set `emailVerified=true`, `status=active`.

**API endpoints:**
- `POST /api/auth/register/buyer` — Create User (status=pending_verification), create BuyerProfile, generate EmailVerificationToken (24h TTL), send verification email via `SesDriver`.
- `POST /api/auth/register/seller` — Create User (status=pending_verification), create SellerProfile (kycStatus=not_started), generate EmailVerificationToken, send verification email.

**Behaviors:**
- Duplicate email → 409 with helpful message.
- Password hashed with argon2id (already in lib/auth/hashing.ts from T0-7-2).
- After email verification, user can log in (status becomes active).
- First login also consumes a valid EmailVerificationToken if one exists.

**Email templates needed:**
- `verify-email.tsx` — React Email template with verification link.

**Acceptance criteria:**
- Register buyer → email sent with valid link → clicking link activates account → login succeeds.
- Register seller → email verified but KYC status is `not_started`; seller cannot list until KYC approved.
- Duplicate email registration returns 409.

**Depends on:** T1-1

---

## T1-3 — Login, logout, password reset, account lockout

### What

Core auth flows: login with lockout, logout, and password reset.

**Routes:**
- `GET/POST /login` — Email + password login.
- `POST /logout` — Destroy session.
- `GET/POST /forgot-password` — Request password reset email.
- `GET/POST /reset-password/[token]` — Set new password with valid token.

**API endpoints:**
- `POST /api/auth/login` — Verify email+password; check `status=active`; check `lockedUntil`; increment `failedLoginCount` on bad password; on 5 failures set `lockedUntil=now+30min`; on success reset failed count, set `lastLoginAt`, `lastLoginIp`, save session.
- `POST /api/auth/logout` — Destroy session cookie.
- `POST /api/auth/forgot-password` — Generate `PasswordResetToken` (30min TTL), send reset email.
- `POST /api/auth/reset-password` — Validate token, hash new password, update `passwordHash`, consume token, invalidate all existing sessions (delete session cookie).

**Lockout behavior:**
- 5 failed attempts → `lockedUntil = now() + 30 minutes`.
- 6th attempt with wrong password → 423 with `Retry-After` header.
- Successful login resets `failedLoginCount` and clears `lockedUntil`.

**Email templates needed:**
- `password-reset.tsx` — React Email template with reset link.

**Acceptance criteria:**
- 5 wrong passwords → 6th returns 423 with `Retry-After`.
- Successful login resets lockout counter.
- Password reset link expires after 30 min.
- Password reset invalidates existing sessions.
- `POST /api/auth/logout` returns 200 and clears the session cookie.

**Depends on:** T1-1, T1-2

---

## T1-4 — KYC document upload + S3 storage

### What

KYC document upload to S3 with presigned URLs; presign helpers on `StorageDriver`.

**API endpoints:**
- `POST /api/seller/kyc/documents` — Accepts `documentType` + `file` (multipart). Generates `s3Key = kyc/{userId}/{documentType}/{uuid}`, calculates SHA256, uploads to S3 via presigned PUT, creates `KycDocument` row (reviewStatus=pending). Returns document id.
- `GET /api/seller/kyc` — Returns current KYC status + list of uploaded documents.

**S3 changes:**
- `StorageDriver` needs `presignPut(bucket, key, ttl)` already added in T0-5-4 — verify it exists and works.
- KYC documents use bucket `ccverse-kyc` with SSE-KMS enforced.

**Acceptance criteria:**
- Seller can upload a PDF/image document via presigned URL flow.
- `sha256` of uploaded file is stored in `KycDocument`.
- Document appears in `GET /api/seller/kyc`.
- Documents are namespaced under `kyc/{userId}/`.

**Depends on:** T1-1, T0-5-4

---

## T1-5 — Seller KYC wizard (entity form + bank account + submit)

### What

Full seller KYC wizard: entity details → document upload → bank account → review & submit.

**Route:** `/seller/kyc` — Multi-step wizard (GET shows current step, POST advances).

**Steps:**
1. **Entity details** — legalName, registrationNo, country, authorizedSignatoryName, authorizedSignatoryEmail (pre-filled from registration). PATCH `SellerProfile`.
2. **Document upload** — Upload 1+ KYC documents via T1-4.
3. **Bank account** — accountHolder, bankName, accountNoLast4, routingOrIfsc. Creates `BankAccount` row.
4. **Review & submit** — Summary of all entered data; on submit → `kycStatus=pending`, SES email to seller confirming receipt.

**API endpoints:**
- `GET /api/seller/kyc` — Already exists from T1-4; extend to return full wizard state (entity details, documents, bank account status).
- `PATCH /api/seller/kyc` — Update entity details on `SellerProfile`.
- `POST /api/seller/kyc/submit` — Transition `kycStatus=pending`, mark all pending `KycDocument` rows as reviewed_by admin.

**Seller gate:**
- After submit, `SellerProfile.kycStatus=pending` — seller can see dashboard but cannot proceed to `/seller/projects/new` (Phase 2).
- Banner on `/seller` dashboard shows KYC status.

**Email template needed:**
- `kyc-submitted.tsx` — Confirmation email to seller.

**Acceptance criteria:**
- Wizard step 4 submit sets `kycStatus=pending` and sends email.
- Seller cannot navigate to project creation (Phase 2) while KYC is not `approved`.
- Re-submitting after rejection resets to `pending` and clears previous decision notes.

**Depends on:** T1-1, T1-4

---

## T1-6 — Admin KYC review queue + approve/reject

### What

Admin interface to review and approve/reject KYC applications.

**Routes:**
- `GET /admin/kyc` — List all pending KYC applications (newest first). Shows: seller name, country, submission date, document count.
- `GET /admin/kyc/[userId]` — Detail view: entity details, all documents (presigned S3 URLs, 5-min TTL), bank account summary, decision panel.
- `POST /api/admin/kyc/:userId/approve` — Set `kycStatus=approved`, set all `KycDocument` rows to `approved`, set `kycReviewedBy/At`. Send `kyc-approved` email.
- `POST /api/admin/kyc/:userId/reject` — Set `kycStatus=rejected`, set all `KycDocument` rows to `rejected`, require `reviewNotes`. Send `kyc-rejected` email with reason.

**Presigned URL for document viewer:**
- `GET /api/admin/kyc/[userId]/documents/[docId]/url` — Generate a 5-minute presigned GET URL for the document's S3 key; return to admin UI for iframe rendering.

**API endpoints:**
- `GET /api/admin/kyc` — List pending: userId, sellerName, country, submittedAt, documentCount.
- `GET /api/admin/kyc/:userId` — Full detail.
- `POST /api/admin/kyc/:userId/approve` — Approve action.
- `POST /api/admin/kyc/:userId/reject` — Reject action (body: `{ reason: string }`).

**Email templates needed:**
- `kyc-approved.tsx` — Approval email to seller.
- `kyc-rejected.tsx` — Rejection email with reason.

**Acceptance criteria:**
- Admin can view list of pending KYC applications.
- Admin can view all documents via presigned S3 URLs.
- Approving sets `kycStatus=approved` and seller can now create projects.
- Rejecting requires a reason; seller receives email with rejection reason.
- Previously rejected applications can be re-opened.

**Depends on:** T1-5

---

## T1-7 — Account/profile pages + password change

### What

Profile view/edit and password change for all authenticated roles.

**Routes:**
- `GET /account` — View profile (fields vary by role).
- `PATCH /account` — Update profile fields (legalName triggers re-verification flow for sellers).
- `GET /account/security` — Change password form.
- `POST /api/me/change-password` — Verify current password, update to new password, invalidate all sessions.

**API endpoints:**
- `GET /api/me` — Return current user profile (role-specific shape).
- `PATCH /api/me` — Update allowed fields; changing `legalName` on a seller sets `kycStatus=expired`.
- `POST /api/me/change-password` — Current password check, argon2id hash, session invalidation.

**Profile fields by role:**
- **Buyer:** legalName, country
- **Seller:** all Buyer fields + kycStatus (read-only), bankAccount summary (masked)

**Acceptance criteria:**
- Buyer can view and update their profile.
- Seller changing `legalName` sees their KYC status change to `expired`.
- Password change requires current password and invalidates existing sessions.
- Unauthenticated requests to `/account` redirect to `/login`.

**Depends on:** T1-2, T1-3

---

## Out of scope for Phase 1 (deferred to post-MVP)

- MFA enrollment + TOTP login flow
- Full audit logging (auth events)
- E2E/Playwright test suite
- Admin user management UI (create/edit auditor/admin)
- Rate-limit automation (handled manually at proxy config level)
- Pen-test security checklist
- Account deletion flow
- External KYC vendor integration (Persona/Onfido/Sumsub)
- axe-core CI enforcement on new pages
