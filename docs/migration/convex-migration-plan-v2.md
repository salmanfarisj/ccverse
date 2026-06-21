# CC Verse → Convex Migration Plan (v3)

**Author:** Claude Code (ground-truthed against codebase — 21 Jun 2026)
**Base:** `convex-migration-plan.md` v2
**Changes from v2:** Added §0 — Convex MCP server + agent skills; all agents/devs must use official methods
**Status:** Draft — ready for review
**Stack:** Next.js 14 (frontend + payment webhooks) + Convex (backend: DB, auth, storage, email, jobs, scheduling)
**Agent/Dev Tooling:** Convex MCP server + Agent Skills — all agents must use the official Convex tooling (MCP + skills) to set up and interact with the project. See §0.

---

## Overview

CC Verse migrates its entire backend (database, auth, RBAC, storage, email, background jobs, scheduling) from Next.js API routes + Prisma + PostgreSQL to Convex. The Next.js frontend remains, but all server-side business logic moves to Convex functions. Payment gateway webhooks stay on Next.js routes as external HTTP endpoints cannot call Convex directly.

**Key decisions:**
- Convex Auth (JWT/WebSocket-native) replaces `iron-session` cookie sessions
- Convex `scheduler` + `cronJobs` replaces the `jobs/` in-process runner
- Payment webhooks (Razorpay/Stripe) remain Next.js route handlers that call Convex mutations via HTTP — **these routes do not exist yet and must be created**
- TOTP MFA implemented inside Convex Node.js actions using `otplib` — `mfaSecret` field must be added (it does not exist in current User model)
- Storage: Option A (Convex built-in) or Option B (Node action → existing S3 buckets). Decision per bucket required before Phase 2.
- Playwright tests rewritten from scratch — see §5

**What is NOT migrated:**
- Frontend React components (`app/` pages, `components/`)
- Next.js configuration (`next.config.mjs`, `tsconfig.json`, `tailwind.config.*`)
- Design system (`styles/`, `DESIGN.md`)
- CI/CD workflow (`.github/workflows/ci.yml`) — updated to run Convex CLI
- `prisma/` directory — retired after Phase 3 (moved from v1's Phase 2)
- `jobs/logger.ts` stub — replaced by Convex logging

---

## §0 — Developer & Agent Tooling (Convex MCP + Skills)

**All agents and developers must use Convex's official MCP server and agent skills for setting up and interacting with the Convex backend.** Do not use ad-hoc scripts or manual CLI calls — use the official tooling throughout.

### Convex MCP Server

The Convex MCP server exposes structured tools that allow AI agents to query and mutate Convex deployment data directly, inspect function logs, manage environment variables, and more.

**Setup — per editor:**

| Editor | Setup Command / Link |
|--------|---------------------|
| Claude Code | See [Using Claude Code](https://docs.convex.dev/ai/using-claude-code#setup-the-convex-mcp-server) — add to your MCP servers config |
| Codex | See [Using Codex](https://docs.convex.dev/ai/using-codex.md#setup-the-convex-mcp-server) |
| Cursor | `npx -y convex@latest mcp start` or use the [quick link](https://cursor.com/en/install-mcp?name=convex&config=eyJjb21tYW5kIjoibnB4IC15IGNvbnZleEBsYXRlc3QgbWNwIHN0YXJ0In0%3D) |
| VS Code (Copilot) | See [Using GitHub Copilot](https://docs.convex.dev/ai/using-github-copilot#setup-the-convex-mcp-server) |
| Generic / CI | `npx -y convex@latest mcp start --project-dir /path/to/ccverse` |

**MCP tools available:**

| Tool | Purpose |
|------|---------|
| `status` | List deployments (dev/prod/preview) |
| `tables` | List all tables + schemas (declared + inferred) |
| `data` | Paginate through documents in a table |
| `runOneoffQuery` | Execute read-only JavaScript queries against deployment |
| `functionSpec` | Inspect all deployed functions (types, visibility, interfaces) |
| `run` | Execute deployed Convex functions with provided arguments |
| `logs` | Fetch recent function execution logs (structured, like `npx convex logs`) |
| `insights` | Health insights: OCC conflicts, resource limit issues (72h window) |
| `envList` / `envGet` / `envSet` / `envRemove` | Manage deployment environment variables |

**Key MCP configuration flags:**
- `--prod` — connect to production deployment (requires `--dangerously-enable-production-deployments`)
- `--preview-name <name>` — connect to a named preview deployment
- `--deployment-name <name>` — connect to a specific deployment by name
- `--env-file <path>` — custom env file for deployment selection
- `--disable-tools data,run,envSet` — disable specific tools to restrict permissions

**When to use MCP tools in this migration:**
- **P1-1:** Use `status` to verify `npx convex dev` is connected; use `tables` to confirm schema after codegen
- **P1-2 / P3:** Use `runOneoffQuery` to inspect live data during schema migration
- **P3-4 (Registry):** Use `run` + `logs` to test OCC behavior; use `insights` to catch OCC conflicts
- **P4-2:** Use `logs` to verify cron job executions
- **P5-5:** Use `envList` / `envGet` / `envSet` to manage production env vars; use `insights` for smoke-test verification

### Convex Agent Skills

[Agent Skills](https://agentskills.io) are portable packages of instructions that teach AI agents specialized workflows. Convex provides ready-made skills covering the full lifecycle.

**Installation:**
```bash
# Add all skills at once
npx skills add get-convex/agent-skills --all

# Or add individually
npx skills add get-convex/agent-skills
```

Skills are installed into `.agents/skills/` and auto-picked up by Cursor, Claude Code, and GitHub Copilot.

**Available skills:**

| Skill | When to Use | Phase |
|-------|-------------|-------|
| `/convex-quickstart` | Bootstrap new Convex project | P1-1 |
| `/convex-setup-auth` | Configure auth (login, register, sessions) | P1-3 |
| `/convex-migration-helper` | Plan and run data migrations | P2, P3 |
| `/convex-create-component` | Create a new Convex component (queries/mutations/actions) | P2–P3 |
| `/convex-performance-audit` | Audit queries and mutations for performance | P4–P5 |

**Manual invocation:**

| Tool | Invocation |
|------|-----------|
| Cursor | `/skill-name` |
| VS Code (Copilot) | `/skill-name` |
| Claude Code | `/skill-name` |
| Codex | `$skill-name` |

### §0 Checklist

- [ ] Convex MCP server installed and connected to local dev deployment
- [ ] Agent skills installed: `npx skills add get-convex/agent-skills --all`
- [ ] `.agents/skills/` directory committed to repo (or added to `.gitignore` if per-machine)
- [ ] Agent is using `/convex-quickstart` for project bootstrap, `/convex-setup-auth` for auth setup, `/convex-migration-helper` for schema changes

---

## Phase Structure

| Phase | Name | Focus | Prerequisite |
|-------|------|-------|--------------|
| 1 | Foundation | Convex project setup, schema (21 tables), auth, RBAC, TOTP MFA | None |
| 2 | Data Layer | Storage, email, audit log migrations | Phase 1 |
| 3 | Business Logic | Registry service, KYC flows, project/listing/order/certificate mutations + Prisma removal | Phase 2 |
| 4 | Jobs & Scheduling | Cron infrastructure, audit export job (not migrated — built), jobs/ directory removal | Phase 3 |
| 5 | Cutover & Cleanup | Payment webhook creation, old code removal, E2E test rewrite | Phase 4 |

**Estimated total: 4–5 weeks** (Phase 4 is 1–2 days, not the full week originally estimated)

---

## Phase 1 — Foundation

**Goal:** Convex project bootstrapped, schema mapped (21 tables), auth + RBAC + TOTP working.

### Tasks

#### P1-1: Convex project setup

- [ ] Install Convex (`npm install convex`)
- [ ] Run `npx convex init` to create `convex/`, `convex.json`, and generated types
- [ ] **Agent/dev setup:** Install Convex MCP server (`npx -y convex@latest mcp start --project-dir /path/to/ccverse`) and agent skills (`npx skills add get-convex/agent-skills --all`) — see §0
- [ ] Add `CONVEX_DEPLOYMENT` and `CONVEX_DEPLOY_KEY` env vars to `.env.example`
- [ ] Update `tsconfig.json` paths to include `"./convex/**/*"` for generated types
- [ ] Add `convex/` and `.agents/` to `.gitignore` (build artifacts, deployment state, local skill configs)
- [ ] Update `package.json` scripts: add `convex:dev` (`npx convex dev`), `convex:deploy` (`npx convex deploy`), `convex:codegen` (`npx convex codegen`)
- [ ] Verify `npx convex dev` starts the local Convex backend without errors
- [ ] Verify MCP server connects: use `status` tool to confirm local dev deployment is reachable

#### P1-2: Schema migration (`convex/schema.ts`)

**⚠️ CORRECTION from v1:** The schema has **21 models**, not 17. All 21 must be defined.

Create `convex/schema.ts` using `defineSchema` + `defineTable` from `convex/server`. Map all Prisma models:

**Enums (14 — same as Prisma):**
- `UserRole` → `v.union(v.literal("BUYER"), v.literal("SELLER"), v.literal("AUDITOR"), v.literal("ADMIN"))`
- `UserStatus` → `v.union(v.literal("ACTIVE"), v.literal("SUSPENDED"), v.literal("BANNED"), v.literal("PENDING_VERIFICATION"))`
- `KycStatus` → `v.union(v.literal("NOT_STARTED"), v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("EXPIRED"))`
- `KycDocumentType`, `KycDocumentReviewStatus`, `BuyerKycStatus`, `BuyerKycMethod`, `DefaultCurrency`, `ProjectStatus`, `ListingStatus`, `OrderStatus`, `PaymentStatus`, `CertificateStatus`, `AuditDecisionStatus`, `DisputeStatus`, `RegistryState`, `PayoutStatus`

**Models (21 — all of them):**

| # | Model | Indexes | Notes |
|---|-------|---------|-------|
| 1 | `User` | `tokenIdentifier` (email, unique) | Add `mfaSecret` field (v.optional(v.string())) — does not exist in Prisma |
| 2 | `SellerProfile` | `by_userId` → `userId` (unique) | |
| 3 | `BuyerProfile` | `by_userId` → `userId` (unique) | |
| 4 | `KycDocument` | `by_subjectUserId` → `subjectUserId`, `by_uploadedById` → `uploadedById` | Two named relations: `subjectUser`, `uploadedBy` |
| 5 | `BankAccount` | `by_userId` → `userId` | |
| 6 | `EmailVerificationToken` | `by_userId` → `userId` | |
| 7 | `PasswordResetToken` | `by_userId` → `userId` | |
| 8 | `Project` | none | Phase 2 adds fields |
| 9 | `ProjectRegistration` | none | Phase 2 adds fields |
| 10 | `Listing` | none | Phase 3 adds fields |
| 11 | `Order` | none | Phase 3 adds fields |
| 12 | `Payment` | none | Phase 6 adds fields |
| 13 | `Certificate` | none | Phase 7 adds fields |
| 14 | `AuditDecision` | none | Phase 4 skeleton |
| 15 | `Dispute` | none | Phase 8 skeleton |
| 16 | `RegistryEntry` | `by_cvcSerial` → `cvcSerial` (unique), `by_state` → `state` | `cvcSerial` is unique; Prisma uses `@unique` not `@index` |
| 17 | `CvcBatch` | none | |
| 18 | `AuditLog` | `by_actorId` → `actorId`, `by_action` → `action`, `by_timestamp` → `timestamp` | Append-only; no `updatedAt` |
| 19 | `Payout` | none | Phase 9 skeleton |
| 20 | `PlatformConfig` | `key` is the `@id` | Singleton pattern |
| 21 | `FailedJob` | `by_failedAt` → `failedAt` | Removed in Phase 4 |

**Special handling for `User.email`:** Prisma uses `@unique @db.Citext` (PostgreSQL `citext` extension for case-insensitive uniqueness). Convex does not have a `citext` equivalent. Recommended approach: store email as lowercase in Convex; enforce uniqueness with a validator that lowercases before insert. Alternatively, use a unique index definition if Convex supports expression indexes.

- [ ] Run `npx convex codegen` to generate `convex/_generated/dataModel.d.ts`
- [ ] Verify generated types match the Prisma schema by cross-checking field counts
- [ ] **Note:** `mfaSecret` must be added to User model — it does not currently exist in Prisma and must be included in the Convex schema as a new field

#### P1-3: Convex Auth setup

- [ ] Implement custom auth using Convex's JWT-based identity model (`ctx.auth.getUserIdentity()`)
- [ ] Create `convex/auth.ts` with:
  - Password hash verification (`argon2` via Node.js action) — already implemented in `lib/auth/hashing.ts`, port as-is
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
  export async function requireRole(ctx: QueryCtx | MutationCtx, allowed: Role[]): Promise<Id<"users">>
  ```
  - Reads `ctx.auth.getUserIdentity()` → throws `Error("Unauthorized")` if null
  - Fetches user from `users` table → throws `Error("Forbidden")` if role not in allowed list
  - Returns the user `Id` for use in subsequent queries
- [ ] Add `requireRole` calls to all Convex functions requiring auth (buyers, sellers, auditors, admins)
- [ ] Public functions (no auth check) are explicitly marked — no `requireRole` added
- [ ] Verify RBAC by testing each role against protected endpoints

#### P1-5: TOTP MFA

**⚠️ CORRECTION from v1:** `mfaSecret` does not exist in the current User model — it must be added as part of this task.

- [ ] Add `mfaSecret` (v.optional(v.string())) and `mfaEnabled` fields to the `users` table schema
- [ ] **`mfaSecret` encryption:** The TOTP shared secret is a high-value credential. It must be encrypted at rest. Options: (a) Convex field-level encryption if available, (b) encrypt with `SESSION_SECRET` before storage, (c) store in a separate `MfaSecret` table with encryption. Choose before implementing.
- [ ] Create `convex/auth/totp.ts` (Node.js action, `"use node";` directive):
  - `generateMfaSecret()` — creates new TOTP secret, returns provisioning URI + QR code data
  - `verifyMfaToken(secret, token)` — validates 6-digit OTP using `otplib`
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

- [ ] Convex MCP server installed and connected to local dev deployment (see §0)
- [ ] Agent skills installed (`npx skills add get-convex/agent-skills --all`)
- [ ] Convex project boots (`npx convex dev`)
- [ ] All 21 tables defined in `convex/schema.ts` with correct indexes
- [ ] `npx convex codegen` generates `dataModel.d.ts` without errors
- [ ] Login/logout/register mutations work with Convex Auth
- [ ] `requireRole` correctly returns 401/403 for all 5 roles (public, buyer, seller, auditor, admin)
- [ ] TOTP MFA enabled for auditor/admin roles (`mfaSecret` added, encrypted, verified)
- [ ] `middleware.ts` updated to use Convex session token
- [ ] All old auth modules (`lib/session/`, `lib/rbac/`, `lib/auth/`) removed
- [ ] CI pipeline green with Convex deploy step

### Tracker

| Task | Status | Owner | PR | Notes |
|------|--------|-------|----|-------|
| P1-1 Convex project setup | ⬜ | | | |
| P1-2 Schema migration (21 tables) | ⬜ | | | **v2 correction: 21 tables, not 17** |
| P1-3 Convex Auth setup | ⬜ | | | Risk: Convex Auth Next.js beta |
| P1-4 RBAC in Convex | ⬜ | | | |
| P1-5 TOTP MFA | ⬜ | | | **v2 correction: `mfaSecret` must be added — doesn't exist in Prisma** |
| P1-6 Env vars | ⬜ | | | |
| P1-7 CI update | ⬜ | | | |

---

## Phase 2 — Data Layer (Storage, Email, Audit)

**Goal:** File storage, email sending, and audit logging migrated to Convex.

**⚠️ PREREQUISITE DECISION before starting:** Choose Option A or B for each storage bucket (see P2-1 below). This decision gates the entire storage migration approach.

### Tasks

**Agent guidance:** Use `/convex-migration-helper` when planning storage, email, and audit migrations. Use `/convex-create-component` when scaffolding new Convex components.

#### P2-1: File storage

**⚠️ CORRECTION from v1:** The plan used `ctx.storage.generateUploadUrl()` — this does not match the existing `StorageDriver` interface which uses `presignPut` / `presignGet`. Choose the option that matches your needs.

**Decision required:** Choose Option A or B for each bucket before starting:

**Option A — Convex built-in file storage (recommended for KYC, certificates):**
- [ ] Use `ctx.storage.store()` in mutations for uploads
- [ ] Use `ctx.storage.generateUploadUrl()` for client-side presigned uploads (Convex-managed URLs)
- [ ] Delete `lib/storage/` directory after migration

**Option B — Keep existing S3 buckets via Node action (for certificates with custom S3 lifecycle):**
- [ ] Create `convex/storage/actions.ts` with `"use node";` directive
- [ ] Implement `putObject`, `getObject`, `deleteObject` using `@aws-sdk/client-s3` (already in package.json)
- [ ] For presigned URLs: use `getSignedUrl` from `@aws-sdk/s3-request-presigner` with `PutObjectCommand` / `GetObjectCommand`
- [ ] **Important:** The existing `StorageDriver` interface uses `presignPut`/`presignGet`, NOT `generateUploadUrl`. The Node action approach maps `presignPut` → S3 presigned PUT URL; `presignGet` → S3 presigned GET URL.
- [ ] Migrate certificate bucket to Convex storage (simpler path) or keep on S3 via Node action

**Per-bucket recommendation:**
| Bucket | Recommended | Rationale |
|--------|-------------|-----------|
| `ccverse-kyc` | Option A (Convex) | KYC docs are immutable, deleted rarely |
| `ccverse-projects` | Option A (Convex) | Project docs, same pattern |
| `ccverse-certificates` | Option A or B | PAdES signing may need S3; decide in Phase 7 |
| `ccverse-audit-exports` | Option B (S3 via Node action) | Audit export job writes here; keep S3 for lifecycle |

- [ ] Update all upload/download call sites in KYC and project routes to use chosen approach
- [ ] Remove `lib/storage/s3.ts`, `lib/storage/driver.ts`, `lib/storage/index.ts`

#### P2-2: Email (SES via Node action)

- [ ] Create `convex/email/actions.ts` with `"use node";` directive:
  ```ts
  "use node";
  import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
  ```
- [ ] Port `SesDriver.send()` logic: reads `SES_SENDER_DOMAIN`, `SES_CONFIGURATION_SET` from Convex env vars
- [ ] Dev mode: if `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` are empty, return mock `dev-{timestamp}-mock` message ID (preserve existing dev-mode behavior)
- [ ] Create `sendEmail` internal action wrapping the SES call
- [ ] Create `convex/email/index.ts` that exports `sendEmail` for use by other Convex functions
- [ ] Update all email send call sites (welcome email, KYC approval/rejection, certificate issued, etc.) to call the Convex `sendEmail` action
- [ ] **Note:** `lib/email/templates/welcome.tsx` exists but is never called (dead code). Either wire it up (e.g., after email verification) or delete it during cleanup.
- [ ] Remove `lib/email/ses.ts`, `lib/email/driver.ts`, `lib/email/index.ts`, `lib/email/templates/` (or selectively keep `welcome.tsx` if wiring it up)

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
      await ctx.db.insert("auditLogs", { ...args, timestamp: Date.now() });
    },
  });
  ```
- [ ] **Convention:** `auditLogs` table has no `patch` or `delete` mutations — only `writeAuditEvent`. Enforce via code review.
- [ ] Migrate all 25 existing `writeAuditEvent` call sites to use `internal.audit.writeAuditEvent`
- [ ] For periodic export to S3: create `convex/audit/export.ts` (Phase 4 task, not Phase 2 — audit export job doesn't exist yet)
- [ ] Remove `lib/audit/index.ts` after all call sites migrated

#### P2-4: Remove Prisma

**⚠️ CORRECTION from v1:** This task is moved from Phase 2 to Phase 3. Prisma cannot be removed until all API routes that use it are migrated to Convex. P2-4 becomes a gate/check in Phase 3.

- [ ] **DEFER to Phase 3** — Prisma remains in use by `lib/db` call sites until all routes are migrated
- [ ] At the end of Phase 3, confirm no remaining call sites to `lib/db`
- [ ] Then execute removal: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`, `@prisma/client` and `prisma` from `package.json`, `lib/db/index.ts`, `npm run db:*` scripts
- [ ] Remove Docker Compose Postgres service (`infra/docker-compose.yml`)

---

### Phase 2 Checklist

- [ ] Agent used `/convex-migration-helper` for migration planning
- [ ] Agent used `/convex-create-component` for scaffolding new storage/email/audit components
- [ ] Option A or B decided per bucket before starting
- [ ] All file uploads go through chosen storage approach (Convex or S3 Node action)
- [ ] All emails go through Convex Node action → AWS SES (dev mock preserved)
- [ ] Audit log writes through `writeAuditEvent` internal mutation
- [ ] No remaining imports of `lib/storage`, `lib/email`, `lib/audit`
- [ ] `welcome.tsx` dead code decision made (wire up or delete)
- [ ] `infra/docker-compose.yml` removal deferred to Phase 3 gate

### Tracker

| Task | Status | Owner | PR | Notes |
|------|--------|-------|----|-------|
| P2-1 File storage | ⬜ | | | **v2 correction: Decision A/B required per bucket; use presignPut/presignGet not generateUploadUrl** |
| P2-2 Email (SES) | ⬜ | | | Dev mock behavior must be preserved |
| P2-3 Audit log | ⬜ | | | |
| P2-4 Remove Prisma | ⬜ | | | **v2 correction: DEFERRED to Phase 3** |

---

## Phase 3 — Business Logic (Registry, KYC, Core Flows)

**Goal:** All remaining business logic moved to Convex mutations/queries/actions. Prisma removed after all routes migrated.

### Tasks

**Agent guidance:** Use `/convex-create-component` for scaffolding new Convex components (queries/mutations/actions). Use `/convex-migration-helper` for route migration sequencing. Use `insights` MCP tool to monitor OCC conflicts after deploying registry mutations.

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

**⚠️ CORRECTION from v1:** `app/api/seller/projects/route.ts` is a stub (returns 501) — it is a Phase 2 feature placeholder, not a real route to migrate. It should be implemented in Phase 2 as part of the projects feature, not migrated here.

- [ ] `app/api/seller/kyc/route.ts` → `convex/seller/kyc/queries.ts::getKycStatus`
- [ ] `app/api/seller/kyc/submit/route.ts` → `convex/seller/kyc/mutations.ts::submitKyc`
- [ ] `app/api/seller/kyc/bank-account/route.ts` → `convex/seller/kyc/mutations.ts::updateBankAccount`
- [ ] `app/api/seller/kyc/documents/route.ts` → `convex/seller/kyc/mutations.ts::uploadKycDocument`
- [ ] `app/api/seller/projects/route.ts` → **`NOTE: This is a Phase 2 stub (501), not a real route. Project creation must be implemented as part of Phase 2 (projects feature), not migrated here.`** Track separately as Phase 2 work.

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

**⚠️ CRITICAL — `lib/registry/` does not exist yet.** This task builds the registry service fresh in Convex, not migrate existing code. The Prisma `RegistryEntry` model is a Phase 0 stub with no service layer.

- [ ] Create `convex/registry/queries.ts`:
  - `getRegistryEntry(id)` — read a single entry
  - `listAvailableEntries()` — filter `state === AVAILABLE`, paginated
  - `getEntryBySerial(cvcSerial)` — unique index lookup
- [ ] Create `convex/registry/mutations.ts`:
  - `allocateToSeller(entryId, sellerId)` — `AVAILABLE → HELD` (atomic OCC retry)
  - `transferToBuyer(entryId, orderId)` — `HELD → RETIRED` (atomic OCC retry)
  - `retireEntry(entryId)` — direct retire path
  - Each mutation: checks current `state`, throws if transition is invalid, uses `ctx.db.patch()` to update
- [ ] **OCC design note:** Convex mutations are atomic per-document but do not have `SELECT … FOR UPDATE`. Model state transitions using:
  - Read current state → verify transition valid → patch new state
  - Convex's document versioning provides OCC: if two mutations race, one will fail the version check and the transaction will retry
  - Alternatively, use a `Mutex` table with a unique key on the entry ID for pessimistic locking
- [ ] Verify OCC behavior: write a test that runs two concurrent `allocateToSeller` for the same entry — only one should succeed
- [ ] **This task is the critical path of the entire migration.** Allocate sufficient time for OCC testing.

#### P3-5: Health/version/audit API routes

- [ ] `app/api/webhooks/ses/route.ts` → Convex doesn't use SES webhook for inbound — this route can be removed or replaced with a Convex HTTP action if SES bounce handling is needed. SES bounce/complaint events are received via SNS → the route verifies SNS HMAC and logs; this can be removed if SES suppression list management is not needed in MVP.

#### P3-6: Prisma removal (gate — execute after all routes migrated)

**⚠️ This is the P2-4 deferred task.** Execute only after confirming zero remaining `lib/db` imports.

- [ ] Confirm no remaining call sites to `lib/db` (run: `grep -r "lib/db" app/ lib/ jobs/` — should return nothing)
- [ ] Remove `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- [ ] Remove `@prisma/client` and `prisma` from `package.json`
- [ ] Remove `lib/db/index.ts`
- [ ] Remove `npm run db:*` scripts from `package.json`
- [ ] Remove `infra/docker-compose.yml`

#### P3-7: Cleanup old API routes

- [ ] Delete all migrated `app/api/auth/` routes
- [ ] Delete all migrated `app/api/seller/kyc/` routes
- [ ] Delete all migrated `app/api/admin/` routes
- [ ] Delete `app/api/me/` routes
- [ ] Confirm no orphaned API routes remain

---

### Phase 3 Checklist

- [ ] Agent used `/convex-create-component` for scaffolding Convex components
- [ ] Agent used `insights` MCP tool to monitor OCC conflicts during registry testing
- [ ] All auth flows (login, logout, register, verify email, forgot/reset password, change password) via Convex mutations
- [ ] All seller KYC flows (submit, upload document, bank account, check status) via Convex
- [ ] All admin KYC flows (list, approve, reject, get document URL) via Convex
- [ ] Registry state transitions are atomic with OCC retry — no double-spend possible
- [ ] Prisma removed — zero remaining `lib/db` imports
- [ ] All API routes deleted; Next.js app directory now only contains pages + static routes + webhook routes

### Tracker

| Task | Status | Owner | PR | Notes |
|------|--------|-------|----|-------|
| P3-1 Auth routes → Convex | ⬜ | | | |
| P3-2 Seller KYC → Convex | ⬜ | | | **v2 correction: projects/route.ts is Phase 2 stub, not migration** |
| P3-3 Admin KYC → Convex | ⬜ | | | |
| P3-4 Registry service | ⬜ | | | **Critical: OCC verification. lib/registry/ doesn't exist — building fresh** |
| P3-5 SES webhook handling | ⬜ | | | May be removable |
| P3-6 Prisma removal (DEFERRED from Phase 2) | ⬜ | | | **v2 correction: moved from Phase 2 — only safe after all routes migrated** |
| P3-7 Cleanup old routes | ⬜ | | | |

---

## Phase 4 — Jobs & Scheduling

**Goal:** Cron infrastructure wired, `jobs/` directory removed. No production job handlers exist to migrate.

**⚠️ CORRECTION from v1:** The `jobs/` runner is a fully scaffolded infrastructure with zero production handlers registered. This phase is primarily deletion + building the audit export and payout cron jobs that don't exist yet.

### Tasks

#### P4-1: Delete jobs/ directory

**No production job handlers exist to migrate.** The `jobs/handlers` Map is empty in production; only `test.noop` is registered in the runner's self-test.

- [ ] Confirm no remaining imports of `jobs/` module (run: `grep -r "jobs/" app/ lib/ convex/` — should return nothing)
- [ ] Delete `jobs/enqueue.ts`, `jobs/runner.ts`, `jobs/registry.ts`, `jobs/types.ts`, `jobs/retry.ts`, `jobs/scheduler.ts`, `jobs/logger.ts`, `jobs/index.ts`

**Agent guidance:** Use `/convex-performance-audit` after deploying cron jobs to verify query performance. Use `logs` MCP tool to confirm job executions.

#### P4-2: Cron jobs infrastructure

**⚠️ CORRECTION from v1:** The `audit.export` job does not exist — it must be built, not migrated. Same for payout batch processing.

- [ ] Create `convex/crons.ts` using `cronJobs()` from `convex/server`:
  ```ts
  crons.daily("audit-export", { hourUTC: 2, minuteUTC: 0 }, internal.audit.export, {});
  crons.daily("payout-process", { hourUTC: 3, minuteUTC: 0 }, internal.payouts.processBatch, {});
  crons.monthly("kyc-expiry-check", { day: 1, hourUTC: 1 }, internal.kyc.checkExpiry, {});
  ```
- [ ] **Build** `internal.audit.export` handler:
  - Reads all `auditLogs` rows since last export (track last export timestamp in `PlatformConfig`)
  - Writes JSON file to Convex storage
  - Schedules a Node action to upload to `ccverse-audit-exports` S3 bucket
  - **This job does not exist yet — build it here**
- [ ] **Build** `internal.payouts.processBatch` handler (Phase 9 scope; may be stubbed here)
- [ ] **Build** `internal.kyc.checkExpiry` handler (checks KYC expiry dates, sends reminders)

#### P4-3: One-time scheduled actions

- [ ] Migrate `scheduler.runAfter()` calls from existing job enqueue patterns to Convex `ctx.scheduler.runAfter()`
- [ ] For actions that need `ctx.runMutation` (write to DB) + external API call (e.g., Razorpay):
  ```ts
  ctx.scheduler.runAfter(0, internal.payouts.sendPayoutReminder, { orderId, sellerId });
  ```
- [ ] **Note:** No `enqueue()` call sites exist in production code. Any future `ctx.scheduler.runAfter()` usage will be introduced when those features are built in their owning phases.

#### P4-4: Remove FailedJob table

- [ ] Confirm `FailedJob` table is no longer needed (Convex handles retries internally)
- [ ] Remove `FailedJob` from `convex/schema.ts`
- [ ] Verify no remaining imports of `FailedJob` in `jobs/` (which is now deleted)

---

### Phase 4 Checklist

- [ ] Agent used `/convex-performance-audit` to audit cron job queries
- [ ] Agent used `logs` MCP tool to verify cron job executions
- [ ] `jobs/` directory deleted — no orphaned job code
- [ ] All cron jobs defined in `convex/crons.ts`
- [ ] `audit.export` job built and registered
- [ ] `ctx.scheduler.runAfter()` replaces all `enqueue()` calls (none exist to migrate)
- [ ] `FailedJob` table removed from schema

### Tracker

| Task | Status | Owner | PR | Notes |
|------|--------|-------|----|-------|
| P4-1 Delete jobs/ directory | ⬜ | | | **v2 correction: No handlers to migrate — pure deletion** |
| P4-2 Cron jobs + audit.export | ⬜ | | | **v2 correction: audit.export must be BUILT, not migrated** |
| P4-3 One-time scheduled actions | ⬜ | | | No enqueue sites to migrate |
| P4-4 Remove FailedJob table | ⬜ | | | |

---

## Phase 5 — Cutover & Cleanup

**Goal:** Payment webhooks created, old code removed, E2E tests written, production ready.

**⚠️ CORRECTION from v1:** `app/api/webhooks/razorpay/route.ts` and `app/api/webhooks/stripe/route.ts` **do not exist** — they must be created, not "kept".

### Tasks

**Agent guidance:** Use `/convex-performance-audit` before final production deployment. Use `insights` MCP tool to verify no OCC conflicts or resource limit issues after live traffic. Use `envList`/`envGet`/`envSet` via MCP for production env var verification.

#### P5-1: Payment webhooks (Next.js routes — create, don't keep)

- [ ] **Create** `app/api/webhooks/razorpay/route.ts` (does not exist):
  ```ts
  // Verifies Razorpay signature, then calls Convex mutation
  import { internal } from "convex/_generated/api";
  const result = await fetch(`https://${process.env.CONVEX_DEPLOYMENT}.convex.site/api/mutations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "internal.payments.handleRazorpayWebhook", args: { event } }),
  });
  ```
- [ ] **Create** `app/api/webhooks/stripe/route.ts` (does not exist) — same pattern
- [ ] Create `convex/payments/webhookHandlers.ts`:
  - `handleRazorpayWebhook` — internal mutation; parses event, updates Order/Payment status
  - `handleStripeWebhook` — internal mutation; same pattern
- [ ] **Note:** Webhook secret verification stays in the Next.js route (not movable to Convex — external service must call your HTTPS endpoint)
- [ ] **Add `CONVEX_DEPLOYMENT_URL` to env vars** — webhook routes need it to call Convex mutations

#### P5-2: Final old-code removal

- [ ] Confirm no remaining imports of `lib/` subdirectories (except `lib/env.ts` for Razorpay/Stripe/SES/S3 env vars needed by webhook routes)
- [ ] Delete `lib/auth/failed-login.ts` (exists — was not in v1 deletion list)
- [ ] Delete `lib/rbac/seller.ts` (exists — remove conditional)
- [ ] Verify `lib/storage/`, `lib/email/`, `lib/audit/`, `lib/session/`, `lib/auth/` fully removed
- [ ] Verify `jobs/` fully removed (from P4-1)

#### P5-3: Env var cleanup

- [ ] Remove `DATABASE_URL`, `SESSION_SECRET` from all env configs
- [ ] Keep `RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `SES_*`, `S3_*` in `lib/env.ts`
- [ ] Add `CONVEX_DEPLOYMENT_URL` to env (for webhook routes to call Convex mutations)

#### P5-4: E2E test rewrite

**⚠️ NOTE:** All Playwright specs must be rewritten targeting Convex-backed flows. The current test suite uses Prisma + iron-session; the migrated suite uses Convex queries/mutations.

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

- [ ] Agent used `/convex-performance-audit` before production deployment
- [ ] Agent used `insights` MCP tool to verify no OCC conflicts or resource limit issues
- [ ] Agent used `envList`/`envGet`/`envSet` via MCP to verify production env vars
- [ ] Payment webhook routes created (not "kept" — created new)
- [ ] Payment webhooks call Convex mutations and update Order/Payment status correctly
- [ ] All old `lib/` modules removed
- [ ] Only `lib/env.ts` remains (with gateway/SES/S3 vars for webhook routes)
- [ ] Playwright E2E suite rewritten and passing
- [ ] `npm run build` succeeds
- [ ] Production deployment live

### Tracker

| Task | Status | Owner | PR | Notes |
|------|--------|-------|----|-------|
| P5-1 Payment webhooks | ⬜ | | | **v2 correction: CREATE these routes — they don't exist** |
| P5-2 Final old-code removal | ⬜ | | | **v2 correction: added lib/auth/failed-login.ts and lib/rbac/seller.ts explicitly** |
| P5-3 Env var cleanup | ⬜ | | | |
| P5-4 E2E test rewrite | ⬜ | | | Full rewrite |
| P5-5 Production verification | ⬜ | | | |

---

## Master Migration Tracker

### Summary

| Phase | Name | Tasks | Done | In Progress | Pending |
|-------|------|-------|------|-------------|---------|
| 1 | Foundation | 7 | 0 | 0 | 7 |
| 2 | Data Layer | 3 (+ 1 deferred) | 0 | 0 | 4 |
| 3 | Business Logic | 7 | 0 | 0 | 7 |
| 4 | Jobs & Scheduling | 4 | 0 | 0 | 4 |
| 5 | Cutover & Cleanup | 5 | 0 | 0 | 5 |
| **Total** | | **26** | **0** | **0** | **26** |

### All Tasks

| ID | Task | Phase | Status | Notes |
|----|------|-------|--------|-------|
| P1-1 | Convex project setup | 1 | ⬜ | |
| P1-2 | Schema migration (21 tables) | 1 | ⬜ | v2: 21 tables, not 17 |
| P1-3 | Convex Auth setup | 1 | ⬜ | Risk: Convex Auth Next.js beta |
| P1-4 | RBAC in Convex | 1 | ⬜ | |
| P1-5 | TOTP MFA | 1 | ⬜ | v2: mfaSecret must be added |
| P1-6 | Env vars | 1 | ⬜ | |
| P1-7 | CI update | 1 | ⬜ | |
| P2-1 | File storage | 2 | ⬜ | v2: Option A/B decision required; presignPut/presignGet |
| P2-2 | Email (SES) | 2 | ⬜ | |
| P2-3 | Audit log | 2 | ⬜ | |
| P2-4 | Remove Prisma | 2→3 | ⬜ | v2: DEFERRED to Phase 3 |
| P3-1 | Auth routes → Convex | 3 | ⬜ | |
| P3-2 | Seller KYC → Convex | 3 | ⬜ | v2: projects/route.ts is Phase 2 stub |
| P3-3 | Admin KYC → Convex | 3 | ⬜ | |
| P3-4 | Registry service | 3 | ⬜ | Critical: OCC verification; lib/registry/ doesn't exist |
| P3-5 | SES webhook handling | 3 | ⬜ | |
| P3-6 | Prisma removal (execute) | 3 | ⬜ | v2: moved from Phase 2 |
| P3-7 | Cleanup old routes | 3 | ⬜ | |
| P4-1 | Delete jobs/ directory | 4 | ⬜ | v2: no handlers to migrate |
| P4-2 | Cron jobs + audit.export | 4 | ⬜ | v2: audit.export must be built |
| P4-3 | One-time scheduled actions | 4 | ⬜ | No enqueue sites to migrate |
| P4-4 | Remove FailedJob table | 4 | ⬜ | |
| P5-1 | Payment webhooks | 5 | ⬜ | v2: CREATE (don't exist) |
| P5-2 | Final old-code removal | 5 | ⬜ | v2: added failed-login.ts, seller.ts |
| P5-3 | Env var cleanup | 5 | ⬜ | |
| P5-4 | E2E test rewrite | 5 | ⬜ | Full rewrite |
| P5-5 | Production verification | 5 | ⬜ | |

---

## Files to Delete (by phase)

### Phase 1
- `lib/session/index.ts`
- `lib/rbac/index.ts`
- `lib/rbac/seller.ts` ← **v2: unconditionally (exists)**

### Phase 2
- `lib/storage/index.ts`
- `lib/storage/s3.ts`
- `lib/storage/driver.ts`
- `lib/email/index.ts`
- `lib/email/ses.ts`
- `lib/email/driver.ts`
- `lib/email/templates/` (or selectively — see P2-2 note on `welcome.tsx`)
- `lib/audit/index.ts`

### Phase 3
- `app/api/auth/` (all routes)
- `app/api/seller/kyc/` (all routes)
- `app/api/admin/kyc/` (all routes)
- `app/api/admin/users/` (all routes)
- `app/api/me/` (all routes)
- `prisma/schema.prisma`
- `prisma/migrations/` (directory)
- `prisma/seed.ts`
- `infra/docker-compose.yml`
- `lib/db/index.ts`

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
- `lib/auth/failed-login.ts` ← **v2: added (exists)**
- `lib/auth/totp.ts`
- `lib/auth/hashing.ts`
- `lib/auth/index.ts`

---

## Risk Register

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|------------|--------|------------|
| Convex Auth Next.js support not stable by migration time | 1 | Medium | High | Fall back to custom JWT in httpOnly cookie — same security properties |
| TOTP MFA: `mfaSecret` must be added (doesn't exist in User model) | 1 | High (if not planned) | Medium | Already in v2 plan — add field, encrypt at rest |
| Prisma removed before all routes migrated | 2→3 | Medium | Critical | v2: Prisma removal moved to Phase 3 gate |
| OCC retry storms under high concurrency on registry | 3 | Low | High | Convex caps mutation runtime at 1s; test with 10 concurrent `allocateToSeller` calls |
| Convex file storage insufficient for certificate S3 lifecycle | 2 | Low | Low | Use Option B (Node action → S3) for certificates; decide per bucket |
| Self-hosting needed for data residency | 1 | Low | Medium | Open-source Convex backend supports PostgreSQL backend — can self-host |
| `audit.export` job needs to be built (not migrated) | 4 | High | Medium | v2: explicitly listed as "build" not "migrate" |
| Payment webhook routes don't exist (razorpay/stripe) | 5 | High | Medium | v2: explicitly listed as "create" not "keep" |
| Agent uses non-official methods (ad-hoc scripts, manual CLI instead of MCP/skills) | All | Medium | Medium | v3: §0 enforces official tooling; MCP + skills must be used throughout |

---

## v1 → v2 Delta Log (all changes from rigorous codebase audit)

| # | Issue | Severity | v1 Location | v1 Said | v2 Fix |
|---|-------|----------|-------------|---------|--------|
| 1 | Phase ordering | 🔴 Critical | P2-4 | Remove Prisma in Phase 2 | Moved to Phase 3 — Prisma removal is a gate after all routes migrated |
| 2 | Table count | 🔴 Critical | P1-2 | "17 tables" | Corrected to 21 tables with full list |
| 3 | Storage API name | 🔴 Critical | P2-1 | `ctx.storage.generateUploadUrl()` | Removed; use `presignPut`/`presignGet` or Convex's actual API |
| 4 | Phase 4 scope | 🔴 Critical | P4 overview | "Migrate job handlers" | Rewritten: no production handlers exist; pure deletion + build audit.export |
| 5 | audit.export job | 🟡 Moderate | P4-2 | Assumed job exists | Explicitly noted must be built (doesn't exist) |
| 6 | Webhook routes | 🟡 Moderate | P5-1 | "Keep razorpay/stripe routes" | Changed to "Create" — routes don't exist |
| 7 | mfaSecret field | 🟡 Moderate | P1-5 | Assumed field exists | Added note: field must be added; must be encrypted at rest |
| 8 | seller/projects stub | 🟡 Moderate | P3-2 | Treated as real route to migrate | Clarified: Phase 2 stub (501), implement in Phase 2 |
| 9 | Deletion list gaps | 🟡 Moderate | Files to Delete | `lib/rbac/seller.ts (if exists)`, missing `lib/auth/failed-login.ts` | Listed unconditionally; added `lib/auth/failed-login.ts` |
| 10 | email citext handling | 🟢 Minor | P1-2 | Unclear | Added note about `citext` → Convex lowercase validator |
| 11 | Agent tooling missing | 🟡 Moderate | N/A (new) | N/A | v3: Added §0 — Convex MCP server + agent skills; all agents must use official methods |

---

## What the Plan Gets Right (unchanged from v1)

✅ Phase structure (P1 → P2 → P3 → P4 → P5) — correct dependency order  
✅ Payment webhooks stay in Next.js (external HTTPS callers can't reach Convex directly)  
✅ TOTP via otplib in `"use node";` action — correct  
✅ SES webhook marked "remove or replace" — correct  
✅ `requireRole` pattern via `ctx.auth.getUserIdentity()` — correct Convex idiom  
✅ All 24 existing API routes covered — no orphaned routes  
✅ Registry service marked "Critical: OCC verification" — correct  
✅ FailedJob table for removal — correct  
✅ Docker Compose Postgres removal — correct  
✅ CI update to `npx convex deploy` — correct  
✅ All agents use official Convex MCP server + agent skills (§0) — official methods only, no ad-hoc scripts  

---

*End of plan — 580 lines → v2 expands to ~900 lines with corrections applied*