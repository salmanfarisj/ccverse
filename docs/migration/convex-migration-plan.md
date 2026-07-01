# CC Verse → Convex Migration Plan

**Author:** Claude Code
**Created:** 21 Jun 2026
**Status:** Draft
**Stack:** Next.js 14 (frontend + payment webhooks) + Convex (backend: DB, auth, storage, email, jobs, scheduling)

---

## Overview

CC Verse migrates its entire backend (database, auth, RBAC, storage, email, background jobs, scheduling) from Next.js API routes + Prisma + PostgreSQL to Convex. The Next.js frontend remains, but all server-side business logic moves to Convex functions. Payment gateway webhooks stay on Next.js routes as external HTTP endpoints cannot call Convex directly.

**Key decisions:**

- Convex Auth (JWT/WebSocket-native) replaces `iron-session` cookie sessions
- Convex built-in file storage OR Node.js actions calling your existing S3 buckets (TBD per bucket — see Phase 2)
- Convex `scheduler` + `cronJobs` replaces the `jobs/` in-process runner
- Payment webhooks (Razorpay/Stripe) remain Next.js route handlers that call Convex mutations via HTTP
- TOTP MFA implemented inside Convex Node.js actions using `otplib`
- Playwright tests rewritten from scratch (not migrated) — see §6

**What is NOT migrated:**

- Frontend React components (`app/` pages, `components/`)
- Next.js configuration (`next.config.mjs`, `tsconfig.json`, `tailwind.config.*`)
- Design system (`styles/`, `DESIGN.md`)
- CI/CD workflow (`.github/workflows/ci.yml`) — updated to run Convex CLI
- `prisma/` directory — retired after migration
- `jobs/logger.ts` stub — replaced by Convex logging

---

## Phase Structure

| Phase | Name              | Focus                                                                    | Prerequisite |
| ----- | ----------------- | ------------------------------------------------------------------------ | ------------ |
| 1     | Foundation        | Convex project setup, schema, auth, RBAC, TOTP MFA                       | None         |
| 2     | Data Layer        | Storage, email, audit log migrations                                     | Phase 1      |
| 3     | Business Logic    | Registry service, KYC flows, project/listing/order/certificate mutations | Phase 2      |
| 4     | Jobs & Scheduling | Background jobs, cron, payout scheduling                                 | Phase 3      |
| 5     | Cutover & Cleanup | Payment webhook migration, old code removal, E2E test rewrite            | Phase 4      |

**Estimated total: 4–5 weeks**

---

## Phase 1 — Foundation

**Goal:** Convex project bootstrapped, schema mapped, auth + RBAC + TOTP working.

### Tasks

#### P1-1: Convex project setup

- [ ] Install Convex (`npm install convex`)
- [ ] Run `npx convex init` to create `convex/`, `convex.json`, and generated types
- [ ] Add `CONVEX_DEPLOYMENT` and `CONVEX_DEPLOY_KEY` env vars to `.env.example`
- [ ] Update `tsconfig.json` paths to include `"./convex/**/*"` for generated types
- [ ] Add `convex` to `.gitignore` (build artifacts + deployment state)
- [ ] Update `package.json` scripts: add `convex:dev` (`npx convex dev`), `convex:deploy` (`npx convex deploy`), `convex:codegen` (`npx convex codegen`)
- [ ] Verify `npx convex dev` starts the local Convex backend without errors

#### P1-2: Schema migration (`convex/schema.ts`)

- [ ] Create `convex/schema.ts` using `defineSchema` + `defineTable` from `convex/server`
- [ ] Map all Prisma enums to Convex `v.union` / `v.literal` validators:
  - `UserRole` → `v.union(v.literal("BUYER"), v.literal("SELLER"), v.literal("AUDITOR"), v.literal("ADMIN"))`
  - `UserStatus`, `KycStatus`, `ListingStatus`, `OrderStatus`, `PaymentStatus`, `CertificateStatus`, `AuditDecisionStatus`, `DisputeStatus`, `RegistryState`, `PayoutStatus`
- [ ] Map all Prisma models to Convex tables with equivalent fields and indexes:
  - `User` — `@index("by_email", ["email"])` for case-insensitive login lookup
  - `SellerProfile`, `BuyerProfile` — `@index("by_userId", ["userId"])`
  - `KycDocument`, `BankAccount`, `EmailVerificationToken`, `PasswordResetToken`
  - `Project`, `ProjectRegistration`, `Listing`, `Order`, `Payment`, `Certificate`
  - `AuditDecision`, `Dispute`, `RegistryEntry` — `@index("by_cvcSerial", ["cvcSerial"])`, `@index("by_state", ["state"])`
  - `CvcBatch`, `Payout`, `PlatformConfig`, `FailedJob`
- [ ] Run `npx convex codegen` to generate `convex/_generated/dataModel.d.ts`
- [ ] Verify generated types match the Prisma schema by cross-checking field counts

#### P1-3: Convex Auth setup

- [ ] Implement custom auth using Convex's JWT-based identity model (`ctx.auth.getUserIdentity()`)
- [ ] Create `convex/auth.ts` with:
  - Password hash verification (`argon2` via Node.js action)
  - `login` mutation: verifies credentials, returns a signed JWT (or uses Convex Auth's built-in token mechanism)
  - `registerBuyer` / `registerSeller` mutations
  - `logout` mutation
- [ ] Store users in Convex `users` table with `tokenIdentifier` index (email)
- [ ] Wire `useConvexAuth` in `app/layout.tsx` (replace `iron-session` cookie reads)
- [ ] Update `middleware.ts` to use Convex session token instead of `iron-session` cookie:
  - Read `convexSession` token from cookies
  - Validate via `ctx.auth.getUserIdentity()` for protected routes
- [ ] Remove `lib/session/index.ts` and `lib/rbac/index.ts` after verification
- [ ] **Risk note:** Convex Auth's native Next.js integration is experimental. If it does not work in your timeframe, fall back to custom JWT stored in an `httpOnly` cookie — same security properties as `iron-session` but with Convex-compatible tokens.

#### P1-4: RBAC in Convex functions

- [ ] Create `convex/lib/rbac.ts` helper:
  ```ts
  export async function requireRole(
    ctx: QueryCtx | MutationCtx,
    allowed: Role[],
  ): Promise<Id<'users'>>;
  ```
  - Reads `ctx.auth.getUserIdentity()` → throws `Error("Unauthorized")` if null
  - Fetches user from `users` table → throws `Error("Forbidden")` if role not in allowed list
  - Returns the user `Id` for use in subsequent queries
- [ ] Add `requireRole` calls to all Convex functions requiring auth (buyers, sellers, auditors, admins)
- [ ] Public functions (no auth check) are explicitly marked — no `requireRole` added
- [ ] Verify RBAC by testing each role against protected endpoints

#### P1-5: TOTP MFA

- [ ] Add `mfaSecret` and `mfaEnabled` fields to the `users` table schema
- [ ] Create `convex/auth/totp.ts` (Node.js action, `"use node";` directive):
  - `generateMfaSecret()` — creates new TOTP secret, returns provisioning URI + QR code data
  - `verifyMfaToken(secret, token)` — validates 6-digit OTP
  - `enableMfa()` — mutation that stores encrypted `mfaSecret` on the user document
- [ ] Add `mfaVerified` flag to session/token payload
- [ ] For `AUDITOR` and `ADMIN` roles: `requireRole` checks `mfaVerified === true`; returns 403 with `{ code: "MFA_REQUIRED" }` if not verified
- [ ] Remove `lib/auth/totp.ts` and `lib/auth/hashing.ts` after verification

#### P1-6: Env vars

- [ ] Update `lib/env.ts` to remove Prisma/Session/Postgres vars (move to Convex dashboard)
- [ ] Add Convex-specific vars to `.env.example`: `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`
- [ ] Keep Razorpay/Stripe/SES/S3 vars in `lib/env.ts` (needed by Next.js webhook routes)
- [ ] Remove `SESSION_SECRET`, `DATABASE_URL`, `iron-session` cookie options from env schema

#### P1-7: CI update

- [ ] Update `.github/workflows/ci.yml`: replace `prisma migrate deploy` step with `npx convex deploy --prod`
- [ ] Add `npx convex codegen` to the typecheck step (generates types before `tsc --noEmit`)
- [ ] Remove Vitest unit tests for `lib/db/`, `lib/session/`, `lib/rbac/` (these modules are replaced)

---

### Phase 1 Checklist

- [ ] Convex project boots (`npx convex dev`)
- [ ] All 17 tables defined in `convex/schema.ts` with correct indexes
- [ ] `npx convex codegen` generates `dataModel.d.ts` without errors
- [ ] Login/logout/register mutations work with Convex Auth
- [ ] `requireRole` correctly returns 401/403 for all 5 roles (public, buyer, seller, auditor, admin)
- [ ] TOTP MFA enabled for auditor/admin roles
- [ ] `middleware.ts` updated to use Convex session token
- [ ] All old auth modules (`lib/session/`, `lib/rbac/`, `lib/auth/`) removed
- [ ] CI pipeline green with Convex deploy step

### Tracker

| Task                      | Status | Owner | PR  | Notes                          |
| ------------------------- | ------ | ----- | --- | ------------------------------ |
| P1-1 Convex project setup | ⬜     |       |     |                                |
| P1-2 Schema migration     | ⬜     |       |     |                                |
| P1-3 Convex Auth setup    | ⬜     |       |     | Risk: Convex Auth Next.js beta |
| P1-4 RBAC in Convex       | ⬜     |       |     |                                |
| P1-5 TOTP MFA             | ⬜     |       |     |                                |
| P1-6 Env vars             | ⬜     |       |     |                                |
| P1-7 CI update            | ⬜     |       |     |                                |

---

## Phase 2 — Data Layer (Storage, Email, Audit)

**Goal:** File storage, email sending, and audit logging migrated to Convex.

### Tasks

#### P2-1: File storage

- [ ] **Decision point:** Choose A or B for each bucket:

  **Option A — Convex built-in file storage (recommended for KYC, certificates):**
  - [ ] Use `ctx.storage.store()` in mutations for uploads
  - [ ] Use `ctx.storage.generateUploadUrl()` for client-side presigned uploads
  - [ ] Delete `lib/storage/` directory after migration

  **Option B — Keep existing S3 buckets (for certificates that need your own S3 lifecycle):**
  - [ ] Create `convex/storage/actions.ts` with `"use node";` directive
  - [ ] Implement `putObject`, `getObject`, `deleteObject` using `@aws-sdk/client-s3`
  - [ ] Migrate certificate bucket to Convex storage (simpler path)
  - [ ] Keep KYC and project docs on your S3 via Node action (avoids re-upload during transition)

- [ ] Update all upload/download call sites in KYC and project routes to use Convex storage APIs
- [ ] Remove `lib/storage/s3.ts`, `lib/storage/driver.ts`, `lib/storage/index.ts`

#### P2-2: Email (SES via Node action)

- [ ] Create `convex/email/actions.ts` with `"use node";` directive:
  ```ts
  'use node';
  import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
  ```
- [ ] Port `SesDriver.send()` logic: reads `SES_SENDER_DOMAIN`, `SES_CONFIGURATION_SET` from Convex env vars
- [ ] Create `sendEmail` internal action wrapping the SES call
- [ ] Create `convex/email/index.ts` that exports `sendEmail` for use by other Convex functions
- [ ] Update all email send call sites (welcome email, KYC approval/rejection, certificate issued, etc.) to call the Convex `sendEmail` action instead of `lib/email/`
- [ ] Remove `lib/email/ses.ts`, `lib/email/driver.ts`, `lib/email/index.ts`

#### P2-3: Audit log

- [ ] Create `convex/audit.ts`:
  ```ts
  export const writeAuditEvent = internalMutation({
    args: {
      actorId: v.optional(v.string()),
      actorRole: v.optional(v.string()),
      action: v.string(),
      targetType: v.optional(v.string()),
      targetId: v.optional(v.string()),
      ip: v.optional(v.string()),
      payload: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
      await ctx.db.insert('auditLogs', { ...args, timestamp: Date.now() });
    },
  });
  ```
- [ ] **Convention:** `auditLogs` table has no `patch` or `delete` mutations — only `writeAuditEvent`. Enforce via code review.
- [ ] For periodic export to S3: create a scheduled Convex action (Phase 4) that reads all `auditLogs` rows since last export, writes a JSON file to Convex storage, then schedules a Node action to upload to your `ccverse-audit-exports` S3 bucket
- [ ] Remove `lib/audit/index.ts` after all call sites migrated

#### P2-4: Remove Prisma

- [ ] Confirm no remaining call sites to `lib/db` (should be none after P2-1 through P2-3)
- [ ] Remove `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- [ ] Remove `@prisma/client` and `prisma` from `package.json`
- [ ] Remove `lib/db/index.ts`
- [ ] Remove `npm run db:*` scripts from `package.json`
- [ ] Remove Docker Compose Postgres service (`infra/docker-compose.yml`) — no longer needed

---

### Phase 2 Checklist

- [ ] All file uploads go through Convex storage (Option A or B per bucket)
- [ ] All emails go through Convex Node action → AWS SES
- [ ] Audit log writes through `writeAuditEvent` internal mutation
- [ ] No remaining imports of `lib/db`, `lib/storage`, `lib/email`, `lib/audit`
- [ ] Prisma and PostgreSQL removed from `package.json`, `prisma/` deleted
- [ ] `infra/docker-compose.yml` removed

### Tracker

| Task               | Status | Owner | PR  | Notes                                      |
| ------------------ | ------ | ----- | --- | ------------------------------------------ |
| P2-1 File storage  | ⬜     |       |     | Decision: Convex storage vs S3 Node action |
| P2-2 Email (SES)   | ⬜     |       |     |                                            |
| P2-3 Audit log     | ⬜     |       |     |                                            |
| P2-4 Remove Prisma | ⬜     |       |     |                                            |

---

## Phase 3 — Business Logic (Registry, KYC, Core Flows)

**Goal:** All remaining business logic moved to Convex mutations/queries/actions.

### Tasks

#### P3-1: Auth routes → Convex mutations

Migrate each `app/api/auth/` route to a Convex mutation:

- [ ] `app/api/auth/login/route.ts` → `convex/auth/mutations.ts::login`
- [ ] `app/api/auth/logout/route.ts` → `convex/auth/mutations.ts::logout`
- [ ] `app/api/auth/register/buyer/route.ts` → `convex/auth/mutations.ts::registerBuyer`
- [ ] `app/api/auth/register/seller/route.ts` → `convex/auth/mutations.ts::registerSeller`
- [ ] `app/api/auth/verify-email/[token]/route.ts` → `convex/auth/mutations.ts::verifyEmail`
- [ ] `app/api/auth/forgot-password/route.ts` → `convex/auth/mutations.ts::forgotPassword`
- [ ] `app/api/auth/reset-password/route.ts` → `convex/auth/mutations.ts::resetPassword`
- [ ] `app/api/me/route.ts` → `convex/users/queries.ts::me`
- [ ] `app/api/me/change-password/route.ts` → `convex/auth/mutations.ts::changePassword`

#### P3-2: Seller KYC routes → Convex

- [ ] `app/api/seller/kyc/route.ts` → `convex/seller/kyc/queries.ts::getKycStatus`
- [ ] `app/api/seller/kyc/submit/route.ts` → `convex/seller/kyc/mutations.ts::submitKyc`
- [ ] `app/api/seller/kyc/bank-account/route.ts` → `convex/seller/kyc/mutations.ts::updateBankAccount`
- [ ] `app/api/seller/kyc/documents/route.ts` → `convex/seller/kyc/mutations.ts::uploadKycDocument`
- [ ] `app/api/seller/projects/route.ts` → `convex/projects/queries.ts::listProjects` + `convex/projects/mutations.ts::createProject`

#### P3-3: Admin KYC routes → Convex

- [ ] `app/api/admin/kyc/route.ts` → `convex/admin/kyc/queries.ts::listPendingKyc`
- [ ] `app/api/admin/kyc/[userId]/route.ts` → `convex/admin/kyc/queries.ts::getKycDetail`
- [ ] `app/api/admin/kyc/[userId]/approve/route.ts` → `convex/admin/kyc/mutations.ts::approveKyc`
- [ ] `app/api/admin/kyc/[userId]/reject/route.ts` → `convex/admin/kyc/mutations.ts::rejectKyc`
- [ ] `app/api/admin/kyc/[userId]/documents/[docId]/url/route.ts` → `convex/admin/kyc/queries.ts::getDocumentUrl`
- [ ] `app/api/admin/users/route.ts` → `convex/admin/users/queries.ts::listUsers`
- [ ] `app/api/admin/users/[id]/route.ts` → `convex/admin/users/queries.ts::getUser`
- [ ] `app/api/admin/users/[id]/ban/route.ts` → `convex/admin/users/mutations.ts::banUser`
- [ ] `app/api/admin/users/[id]/suspend/route.ts` → `convex/admin/users/mutations.ts::suspendUser`

#### P3-4: Registry service

- [ ] Create `convex/registry/queries.ts`:
  - `getRegistryEntry(id)` — read a single entry
  - `listAvailableEntries()` — filter `state === AVAILABLE`, paginated
  - `getEntryBySerial(cvcSerial)` — unique index lookup
- [ ] Create `convex/registry/mutations.ts`:
  - `allocateToSeller(entryId, sellerId)` — `AVAILABLE → HELD` (atomic OCC retry)
  - `transferToBuyer(entryId, orderId)` — `HELD → RETIRED` (atomic OCC retry)
  - `retireEntry(entryId)` — direct retire path
  - Each mutation: checks current `state`, throws if transition is invalid, uses `ctx.db.patch()` to update
- [ ] Verify OCC behavior: write a test that runs two concurrent `allocateToSeller` for the same entry — only one should succeed
- [ ] Delete `lib/registry/` (Phase 2 placeholder)

#### P3-5: Health/version/audit API routes

- [ ] `app/api/webhooks/ses/route.ts` → Convex handles bounce/complaint events differently (Convex doesn't use SES webhook for inbound — this route can be removed or replaced with a Convex HTTP action if SES bounce handling is needed)

#### P3-6: Cleanup old API routes

- [ ] Delete all migrated `app/api/auth/` routes
- [ ] Delete all migrated `app/api/seller/kyc/` routes
- [ ] Delete all migrated `app/api/admin/` routes
- [ ] Delete `app/api/me/` routes
- [ ] Confirm no orphaned API routes remain

---

### Phase 3 Checklist

- [ ] All auth flows (login, logout, register, verify email, forgot/reset password, change password) via Convex mutations
- [ ] All seller KYC flows (submit, upload document, bank account, check status) via Convex
- [ ] All admin KYC flows (list, approve, reject, get document URL) via Convex
- [ ] Registry state transitions are atomic with OCC retry — no double-spend possible
- [ ] All API routes deleted; Next.js app directory now only contains pages + static routes

### Tracker

| Task                      | Status | Owner | PR  | Notes                      |
| ------------------------- | ------ | ----- | --- | -------------------------- |
| P3-1 Auth routes → Convex | ⬜     |       |     |                            |
| P3-2 Seller KYC → Convex  | ⬜     |       |     |                            |
| P3-3 Admin KYC → Convex   | ⬜     |       |     |                            |
| P3-4 Registry service     | ⬜     |       |     | Critical: OCC verification |
| P3-5 SES webhook handling | ⬜     |       |     |                            |
| P3-6 Cleanup old routes   | ⬜     |       |     |                            |

---

## Phase 4 — Jobs & Scheduling

**Goal:** In-process job runner replaced by Convex scheduler + cron jobs.

### Tasks

#### P4-1: Migrate job handlers to Convex scheduled actions

For each job type registered in `jobs/registry.ts`, create a Convex internal action:

- [ ] Identify all job types from `registerJobType` calls across the codebase
- [ ] Create `convex/jobs/scheduled.ts` with `"use node";` directive for each handler
- [ ] Common patterns to port:
  - Certificate generation → `convex/certificates/actions.ts::generateCertificate`
  - Email notifications → reuse `sendEmail` action from Phase 2
  - Payout batch processing → `convex/payouts/actions.ts::processPayoutBatch`
- [ ] Register each as `internalAction` (not exposed to client)

#### P4-2: Cron jobs

- [ ] Create `convex/crons.ts` using `cronJobs()` from `convex/server`:
  ```ts
  crons.daily('audit-export', { hourUTC: 2, minuteUTC: 0 }, internal.audit.export, {});
  crons.daily('payout-process', { hourUTC: 3, minuteUTC: 0 }, internal.payouts.processBatch, {});
  crons.monthly('kyc-expiry-check', { day: 1, hourUTC: 1 }, internal.kyc.checkExpiry, {});
  ```
- [ ] Remove `jobs/` directory (runner, scheduler, enqueue, registry, types, retry, logger)
- [ ] Remove `lib/jobs/` exports (none exist — `jobs/` is already at repo root)

#### P4-3: One-time scheduled actions

- [ ] Migrate `scheduler.runAfter()` calls from existing job enqueue patterns to Convex `ctx.scheduler.runAfter()`
- [ ] For actions that need `ctx.runMutation` (write to DB) + external API call (e.g., Razorpay):
  ```ts
  ctx.scheduler.runAfter(0, internal.payouts.sendPayoutReminder, { orderId, sellerId });
  ```
- [ ] Verify `FailedJob` table is no longer used — Convex handles retries via `scheduler.runAfter` with its own retry logic

#### P4-4: Remove jobs/ directory

- [ ] Confirm no remaining imports of `jobs/` module
- [ ] Delete `jobs/enqueue.ts`, `jobs/runner.ts`, `jobs/registry.ts`, `jobs/types.ts`, `jobs/retry.ts`, `jobs/scheduler.ts`, `jobs/logger.ts`
- [ ] Delete `jobs/index.ts`

---

### Phase 4 Checklist

- [ ] All job handlers migrated to Convex scheduled actions
- [ ] All cron jobs defined in `convex/crons.ts`
- [ ] `ctx.scheduler.runAfter()` replaces all `enqueue()` calls
- [ ] `jobs/` directory deleted — no orphaned job code
- [ ] FailedJob table removed from schema (Convex handles retries internally)

### Tracker

| Task                            | Status | Owner | PR  | Notes |
| ------------------------------- | ------ | ----- | --- | ----- |
| P4-1 Migrate job handlers       | ⬜     |       |     |       |
| P4-2 Cron jobs                  | ⬜     |       |     |       |
| P4-3 One-time scheduled actions | ⬜     |       |     |       |
| P4-4 Remove jobs/ directory     | ⬜     |       |     |       |

---

## Phase 5 — Cutover & Cleanup

**Goal:** Payment webhooks live, old code removed, E2E tests written, production ready.

### Tasks

#### P5-1: Payment webhooks (Next.js routes stay)

- [ ] Keep `app/api/webhooks/razorpay/route.ts` (create if doesn't exist):
  ```ts
  // Verifies Razorpay signature, then calls Convex mutation
  import { internal } from 'convex/_generated/api';
  const result = await fetch(
    `https://${process.env.CONVEX_DEPLOYMENT}.convex.site/api/mutations/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'internal.payments.handleRazorpayWebhook', args: { event } }),
    },
  );
  ```
- [ ] Keep `app/api/webhooks/stripe/route.ts` similarly
- [ ] Create `convex/payments/webhookHandlers.ts`:
  - `handleRazorpayWebhook` — internal mutation; parses event, updates Order/Payment status
  - `handleStripeWebhook` — internal mutation; same pattern
- [ ] **Note:** Webhook secret verification stays in the Next.js route (not movable to Convex — external service must call your HTTPS endpoint)

#### P5-2: Final old-code removal

- [ ] Confirm no remaining imports of `lib/` subdirectories (except `lib/env.ts` for Razorpay/Stripe/SES/S3 env vars needed by webhook routes)
- [ ] Delete `lib/auth/failed-login.ts`
- [ ] Delete `lib/rbac/seller.ts` (if exists and separate)
- [ ] Verify `lib/storage/`, `lib/email/`, `lib/audit/`, `lib/session/`, `lib/auth/` are fully removed
- [ ] Verify `jobs/` is fully removed

#### P5-3: Env var cleanup

- [ ] Remove `DATABASE_URL`, `SESSION_SECRET` from all env configs
- [ ] Keep `RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `SES_*`, `S3_*` in `lib/env.ts`
- [ ] Add `CONVEX_DEPLOYMENT_URL` to env (for webhook routes to call Convex mutations)

#### P5-4: E2E test rewrite

- [ ] Rewrite all Playwright specs in `tests/e2e/` from scratch targeting Convex-backed flows
- [ ] Test auth flows: register buyer, register seller, login, logout, email verification
- [ ] Test KYC flow: seller uploads documents, admin approves
- [ ] Test registry flow: allocate CVC, transfer to buyer
- [ ] Test payment webhook: mock Razorpay/Stripe event → verify order status updates
- [ ] Run `npm run test:e2e` — all tests must pass
- [ ] Update CI to run full Playwright suite

#### P5-5: Production verification

- [ ] Run `npm run typecheck && npm run lint && npm run build` — must pass with zero errors
- [ ] Deploy Convex backend: `npx convex deploy`
- [ ] Deploy Next.js frontend to Vercel/Railway (no Prisma, no Postgres dependency)
- [ ] Verify payment webhooks fire correctly against production
- [ ] Verify audit log entries appear in Convex dashboard
- [ ] Smoke-test login + KYC submit + admin approval end-to-end

---

### Phase 5 Checklist

- [ ] Payment webhooks call Convex mutations and update Order/Payment status correctly
- [ ] All old `lib/` modules removed
- [ ] Only `lib/env.ts` remains (with gateway/SES/S3 vars for webhook routes)
- [ ] Playwright E2E suite rewritten and passing
- [ ] `npm run build` succeeds
- [ ] Production deployment live

### Tracker

| Task                         | Status | Owner | PR  | Notes               |
| ---------------------------- | ------ | ----- | --- | ------------------- |
| P5-1 Payment webhooks        | ⬜     |       |     | Next.js routes stay |
| P5-2 Final old-code removal  | ⬜     |       |     |                     |
| P5-3 Env var cleanup         | ⬜     |       |     |                     |
| P5-4 E2E test rewrite        | ⬜     |       |     | Full rewrite        |
| P5-5 Production verification | ⬜     |       |     |                     |

---

## Master Migration Tracker

### Summary

| Phase     | Name              | Tasks  | Done  | In Progress | Pending |
| --------- | ----------------- | ------ | ----- | ----------- | ------- |
| 1         | Foundation        | 7      | 0     | 0           | 7       |
| 2         | Data Layer        | 4      | 0     | 0           | 4       |
| 3         | Business Logic    | 6      | 0     | 0           | 6       |
| 4         | Jobs & Scheduling | 4      | 0     | 0           | 4       |
| 5         | Cutover & Cleanup | 5      | 0     | 0           | 5       |
| **Total** |                   | **26** | **0** | **0**       | **26**  |

### All Tasks

| ID   | Task                       | Phase | Status | Owner | PR  | Notes                                      |
| ---- | -------------------------- | ----- | ------ | ----- | --- | ------------------------------------------ |
| P1-1 | Convex project setup       | 1     | ⬜     |       |     |                                            |
| P1-2 | Schema migration           | 1     | ⬜     |       |     |                                            |
| P1-3 | Convex Auth setup          | 1     | ⬜     |       |     | Risk: Convex Auth Next.js beta             |
| P1-4 | RBAC in Convex             | 1     | ⬜     |       |     |                                            |
| P1-5 | TOTP MFA                   | 1     | ⬜     |       |     |                                            |
| P1-6 | Env vars                   | 1     | ⬜     |       |     |                                            |
| P1-7 | CI update                  | 1     | ⬜     |       |     |                                            |
| P2-1 | File storage               | 2     | ⬜     |       |     | Decision: Convex storage vs S3 Node action |
| P2-2 | Email (SES)                | 2     | ⬜     |       |     |                                            |
| P2-3 | Audit log                  | 2     | ⬜     |       |     |                                            |
| P2-4 | Remove Prisma              | 2     | ⬜     |       |     |                                            |
| P3-1 | Auth routes → Convex       | 3     | ⬜     |       |     |                                            |
| P3-2 | Seller KYC → Convex        | 3     | ⬜     |       |     |                                            |
| P3-3 | Admin KYC → Convex         | 3     | ⬜     |       |     |                                            |
| P3-4 | Registry service           | 3     | ⬜     |       |     | Critical: OCC verification                 |
| P3-5 | SES webhook handling       | 3     | ⬜     |       |     |                                            |
| P3-6 | Cleanup old routes         | 3     | ⬜     |       |     |                                            |
| P4-1 | Migrate job handlers       | 4     | ⬜     |       |     |                                            |
| P4-2 | Cron jobs                  | 4     | ⬜     |       |     |                                            |
| P4-3 | One-time scheduled actions | 4     | ⬜     |       |     |                                            |
| P4-4 | Remove jobs/ directory     | 4     | ⬜     |       |     |                                            |
| P5-1 | Payment webhooks           | 5     | ⬜     |       |     | Next.js routes stay                        |
| P5-2 | Final old-code removal     | 5     | ⬜     |       |     |                                            |
| P5-3 | Env var cleanup            | 5     | ⬜     |       |     |                                            |
| P5-4 | E2E test rewrite           | 5     | ⬜     |       |     | Full rewrite                               |
| P5-5 | Production verification    | 5     | ⬜     |       |     |                                            |

---

## Files to Delete (by phase)

### Phase 1

- `lib/session/index.ts`
- `lib/rbac/index.ts`
- `lib/rbac/seller.ts` (if exists)

### Phase 2

- `lib/storage/index.ts`
- `lib/storage/s3.ts`
- `lib/storage/driver.ts`
- `lib/email/index.ts`
- `lib/email/ses.ts`
- `lib/email/driver.ts`
- `lib/audit/index.ts`

### Phase 3

- `app/api/auth/` (all routes)
- `app/api/seller/kyc/` (all routes)
- `app/api/admin/kyc/` (all routes)
- `app/api/admin/users/` (all routes)
- `app/api/me/` (all routes)

### Phase 4

- `jobs/enqueue.ts`
- `jobs/runner.ts`
- `jobs/index.ts`
- `jobs/registry.ts`
- `jobs/types.ts`
- `jobs/retry.ts`
- `jobs/scheduler.ts`
- `jobs/logger.ts`

### Phase 5

- `prisma/schema.prisma`
- `prisma/migrations/` (directory)
- `prisma/seed.ts`
- `infra/docker-compose.yml`

---

## Risk Register

| Risk                                                          | Phase | Likelihood | Impact | Mitigation                                                                         |
| ------------------------------------------------------------- | ----- | ---------- | ------ | ---------------------------------------------------------------------------------- |
| Convex Auth Next.js support not stable by migration time      | 1     | Medium     | High   | Fall back to custom JWT in httpOnly cookie — same security properties              |
| TOTP MFA implementation complexity                            | 1     | Low        | Medium | `otplib` works in Node actions; only ~40 lines of code                             |
| Payment webhook dual-write during cutover                     | 5     | Low        | High   | Phased cutover: webhooks write to Next.js route first, then call Convex            |
| OCC retry storms under high concurrency on registry           | 3     | Low        | High   | Convex caps mutation runtime at 1s; test with 10 concurrent allocateToSeller calls |
| Convex file storage insufficient for certificate S3 lifecycle | 2     | Low        | Low    | Use Node action → your existing S3 bucket for certificates                         |
| Self-hosting needed for data residency                        | 1     | Low        | Medium | Open-source Convex backend supports PostgreSQL backend — can self-host             |
