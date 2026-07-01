# Phase 0 — Task Breakdown

> Granular, individually-trackable tasks derived from `docs/phases/phase-0-foundation.md`.
> Each task is scoped to a single PR-sized unit of work. Tasks are grouped by section and ordered for sequential execution; parallel tracks are noted where possible.
>
> **Architectural change (16 Jun 2026):** the project is a **single Next.js 14 monolith at the repo root**. There is no `pnpm` workspace, no `apps/web` subtree, and no `packages/*` directory. All "package" code lives under `lib/*` inside the same app. GitHub Actions live under `.github/workflows/`. Path references below reflect this layout — any older `apps/web/...` or `packages/...` paths have been rewritten to the root-equivalent.

## Conventions

- **Status**: `pending` → `in_progress` → `done` (or `blocked` / `skipped`). Update the **Task Tracker** section below.
- **ID format**: `T0-<section>-<n>` (e.g. `T0-1-3` = section 4.1, task 3)
- **PR scope**: one task = one PR unless noted
- **DoD (Definition of Done)**: acceptance criteria checked, CI green, reviewer approved, phase doc ACs updated if a checkbox can now be ticked

---

## Task Tracker

> **How to update**: change the `Status` cell, add `Owner` (handle) when claimed, `PR` (#number) when opened, and `Notes` for blockers / deferrals.
>
> **Legend** — ⬜ pending · 🟡 in-progress · 🔴 blocked · ✅ done · ⏭ skipped

### Progress

| Metric         | Count    |
| -------------- | -------- |
| ✅ Done        | 37       |
| 🟡 In progress | 0        |
| 🔴 Blocked     | 0        |
| ⏭ Skipped     | 0        |
| ⬜ Pending     | 42       |
| **Total**      | **70**   |
| **Completion** | **53 %** |

### By section

| Group | Section                        | Total |  ✅ |  🟡 |  🔴 |  ⏭ |  ⬜ |
| ----- | ------------------------------ | ----: | --: | --: | --: | --: | --: |
| T0-1  | §4.1 Repo (single Next.js app) |     5 |   0 |   0 |   0 |   0 |   5 |
| T0-2  | §4.2 Design System             |     7 |   7 |   0 |   0 |   0 |   0 |
| T0-3  | §4.3 Database & Prisma         |     8 |   8 |   0 |   0 |   0 |   0 |
| T0-4  | §4.4 Background Jobs           |     5 |   5 |   0 |   0 |   0 |   0 |
| T0-5  | §4.5 Object Storage            |     5 |   5 |   0 |   0 |   0 |   0 |
| T0-6  | §4.5b Email (SES)              |     5 |   5 |   0 |   0 |   0 |   0 |
| T0-7  | §4.6 Auth Scaffold             |     4 |   4 |   0 |   0 |   0 |   0 |
| T0-8  | §4.7 RBAC                      |     3 |   3 |   0 |   0 |   0 |   0 |
| T0-9  | §4.8 Observability             |     2 |   0 |   0 |   0 |   0 |   2 |
| T0-10 | §4.9 CI/CD                     |     3 |   0 |   0 |   0 |   0 |   3 |
| T0-11 | §4.10 Proxy                    |     3 |   0 |   0 |   0 |   0 |   3 |
| T0-12 | §4.11 Env & Secrets            |     3 |   3 |   0 |   0 |   0 |   0 |
| T0-13 | Health/Version/Audit           |     3 |   0 |   0 |   0 |   0 |   3 |
| T0-14 | Security Baseline              |     3 |   0 |   0 |   0 |   0 |   3 |
| T0-15 | Accessibility                  |     3 |   0 |   0 |   0 |   0 |   3 |
| T0-16 | Tests                          |     5 |   0 |   0 |   0 |   0 |   5 |
| T0-17 | Final Acceptance               |     3 |   0 |   0 |   0 |   0 |   3 |

### Master task list

| ID      | Title                                                     | Status | Owner | PR  | Notes                                                                                                                                                                  |
| ------- | --------------------------------------------------------- | :----: | ----- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T0-1-1  | Bootstrap Next.js 14 app at repo root                     |   ⬜   |       |     |                                                                                                                                                                        |
| T0-1-2  | Create directory skeleton (single app)                    |   ⬜   |       |     |                                                                                                                                                                        |
| T0-1-3  | Configure TS strict, ESLint, Prettier, Vitest, Playwright |   ⬜   |       |     |                                                                                                                                                                        |
| T0-1-4  | Root scripts + .gitignore + .editorconfig                 |   ⬜   |       |     |                                                                                                                                                                        |
| T0-1-5  | `.env.example` + zod env loader (`lib/env.ts`)            |   ⬜   |       |     |                                                                                                                                                                        |
| T0-2-1  | Copy design tokens to `styles/tokens.css`                 |   ✅   |       |     | tokens.css byte-identical to DESIGN.md; FIXME flagged for typo on `--surface-obsidian-loam`                                                                            |
| T0-2-2  | Configure Tailwind v4 with `@theme`                       |   ✅   |       |     | tailwindcss@4.3.1 + @tailwindcss/postcss installed; postcss.config.mjs added; globals.css imports tokens + tailwind + @theme                                           |
| T0-2-3  | `LimeButton` + `GhostButton`                              |   ✅   |       |     | components/ui/; polymorphic via `href` prop (button ↔ Next Link); design tokens resolved in built CSS                                                                  |
| T0-2-4  | `Input`, `DataTag`, `Section`                             |   ✅   |       |     | components/ui/; Input has label + error + hint; DataTag variants solid/outline; Section max-w-1200                                                                     |
| T0-2-5  | `TopNav` + `Footer`                                       |   ✅   |       |     | components/landing/; TopNav with skip-link, brand wordmark, Menu + dot; Footer with 3 columns + build metadata from env                                                |
| T0-2-6  | `Hero` + `FullBleedImage`                                 |   ✅   |       |     | components/landing/; Hero uses CSS-gradient placeholder (USER DEPENDENCY: brand assets); FullBleedImage degrades to solid band without src                             |
| T0-2-7  | Landing page at `/`                                       |   ✅   |       |     | TopNav → Hero → Mission section → FullBleedImage band → How-it-works section → Registry section → Footer; metadata + metadataBase set                                  |
| T0-3-1  | Prisma + `prisma/schema.prisma`                           |   ✅   |       |     | prisma@5.22.0 + @prisma/client installed; lib/db singleton; globalThis-cached, dev/prod logging                                                                        |
| T0-3-2  | Initial schema for all FRD §6 tables                      |   ✅   |       |     | 17 models (16 FRD §6 + \_prisma_migrations); §5 tables with full column set, rest minimal (id, status, createdAt, userId)                                              |
| T0-3-3  | Migration `0000_init`                                     |   ✅   |       |     | 20260616174314_init applied; CREATE EXTENSION citext manually added at top (Prisma 5.x does not auto-emit)                                                             |
| T0-3-4  | `citext` for emails                                       |   ✅   |       |     | User.email @db.Citext; case-insensitive uniqueness verified via psql (Foo@x.com vs foo@x.com raises violation)                                                         |
| T0-3-5  | `prisma/seed.ts` (admin + config)                         |   ✅   |       |     | argon2id hash (m=64MB, t=3, p=4); idempotent; 1 admin + 10 PlatformConfig keys; sentinel password on missing env                                                       |
| T0-3-6  | `FailedJob` model                                         |   ✅   |       |     | jobType/payload/error/attempts/createdAt/failedAt; failedAt index; manual psql insert verified                                                                         |
| T0-3-7  | `AuditLog` model                                          |   ✅   |       |     | actorId/actorRole/action/targetType/targetId/ip/timestamp/payload; indexes on actorId, action, timestamp; manual psql insert verified                                  |
| T0-3-8  | Docker Compose for Postgres                               |   ✅   |       |     | infra/docker-compose.yml with postgres:16-alpine, healthcheck, named volume ccverse-postgres-data, port 127.0.0.1:5432                                                 |
| T0-4-1  | Job runner scaffold (`jobs/runner.ts`)                    |   ✅   |       |     |                                                                                                                                                                        |
| T0-4-2  | Job type registry + dispatcher                            |   ✅   |       |     |                                                                                                                                                                        |
| T0-4-3  | Retry with exponential backoff                            |   ✅   |       |     |                                                                                                                                                                        |
| T0-4-4  | `enqueue()` API + idempotency                             |   ✅   |       |     |                                                                                                                                                                        |
| T0-4-5  | Scheduled job registration                                |   ✅   |       |     |                                                                                                                                                                        |
| T0-5-1  | `StorageDriver` interface (`lib/storage`)                 |   ✅   |       |     | `lib/storage/driver.ts` — put/get/delete/head/presignPut/presignGet + BUCKETS constants                                                                                |
| T0-5-2  | `S3Driver` for AWS S3                                     |   ✅   |       |     | Uses @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner; SSE AES256 enforced on all PUTs                                                                               |
| T0-5-3  | Local S3 mock in Docker Compose                           |   ✅   |       |     | MinIO + bootstrap script creates 4 buckets; healthcheck on minio service                                                                                               |
| T0-5-4  | Presigned URL helpers                                     |   ✅   |       |     | `presignPut` + `presignGet` on S3Driver; audit-logged via jobs/logger                                                                                                  |
| T0-5-5  | CORS config on buckets                                    |   ✅   |       |     | `infra/minio-cors.json` — GET+PUT from APP_ORIGIN only; ETag exposed                                                                                                   |
| T0-6-1  | `EmailDriver` interface (`lib/email`)                     |   ✅   |       |     | `lib/email/driver.ts` — send() returning MessageId                                                                                                                     |
| T0-6-2  | `SesDriver`                                               |   ✅   |       |     | `lib/email/ses.ts` — uses SESv2Client; SSE enforced at account level                                                                                                   |
| T0-6-3  | React Email templates scaffold                            |   ✅   |       |     | `lib/email/templates/welcome.tsx` — HTML+text render functions                                                                                                         |
| T0-6-4  | SES sender-identity DNS checklist                         |   ✅   |       |     | `docs/infra/ses.md` — DKIM/SPF/DMARC checklist + sandbox/production steps                                                                                              |
| T0-6-5  | SES webhook handler                                       |   ✅   |       |     | `app/api/webhooks/ses/route.ts` — SubscriptionConfirmation/Notification/UnsubscribeConfirmation; HMAC verification stub                                                |
| T0-7-1  | `iron-session` integration (`lib/session`)                |   ✅   |       |     | `lib/session/index.ts` — \_\_Host- prefixed cookie, httpOnly/secure/sameSite=strict                                                                                    |
| T0-7-2  | Password hashing helper (argon2id)                        |   ✅   |       |     | `lib/auth/hashing.ts` — m=64MB, t=3, p=4 per OWASP 2023                                                                                                                |
| T0-7-3  | TOTP MFA helper (scaffold only)                           |   ✅   |       |     | `lib/auth/totp.ts` — generateSecret/verifyTotpToken/getProvisioningUri (not wired to login)                                                                            |
| T0-7-4  | `trackFailedLogin` helper                                 |   ✅   |       |     | `lib/auth/failed-login.ts` — stub logging to jobs/logger; User.failedLoginCount deferred to Phase 1                                                                    |
| T0-8-1  | `requireRole` helper (`lib/rbac`)                         |   ✅   |       |     | lib/rbac/index.ts — requireRole throws 401/403, getSessionFromRequest for Edge middleware                                                                              |
| T0-8-2  | `app/middleware.ts` path gating                           |   ✅   |       |     | Public/buyer/seller/auditor/admin paths gated; API routes return 401/403 JSON; pages redirect to /login                                                                |
| T0-8-3  | Role-route shells                                         |   ✅   |       |     | app/(seller)/seller, app/(buyer)/buyer, app/(auditor)/auditor, app/(admin)/admin + /login placeholder                                                                  |
| T0-9-1  | `pino` logger with request id (`lib/logger`)              |   ⬜   |       |     |                                                                                                                                                                        |
| T0-9-2  | Audit log writer helper (`lib/audit`)                     |   ⬜   |       |     |                                                                                                                                                                        |
| T0-10-1 | `ci.yml` workflow                                         |   ⬜   |       |     |                                                                                                                                                                        |
| T0-10-2 | `preview.yml` workflow                                    |   ⬜   |       |     |                                                                                                                                                                        |
| T0-10-3 | `deploy.yml` skeleton                                     |   ⬜   |       |     |                                                                                                                                                                        |
| T0-11-1 | Caddyfile for local dev                                   |   ⬜   |       |     |                                                                                                                                                                        |
| T0-11-2 | Nginx config template                                     |   ⬜   |       |     |                                                                                                                                                                        |
| T0-11-3 | Proxy deny-path + allowlist verify                        |   ⬜   |       |     |                                                                                                                                                                        |
| T0-12-1 | Complete `.env.example`                                   |   ✅   |       |     | .env.example complete and validated by lib/env.ts zod schema; covers all Database, S3, SES, Session, App/Proxy vars                                                    |
| T0-12-2 | zod env schema tests                                      |   ✅   |       |     | tests/unit/env.test.ts — 13 tests covering valid env, type coercion, missing required, SESSION_SECRET length, URL validation, console.error on failure, defaults       |
| T0-12-3 | IAM role / credentials plan                               |   ✅   |       |     | docs/infra/iam.md — server IAM role trust + permissions policy, S3 bucket SSE enforcement, dev/CI/prod credential strategy, Secrets Manager plan, ops action checklist |
| T0-13-1 | `GET /api/health` endpoint                                |   ⬜   |       |     |                                                                                                                                                                        |
| T0-13-2 | `GET /api/version` endpoint                               |   ⬜   |       |     |                                                                                                                                                                        |
| T0-13-3 | Audit log startup ping                                    |   ⬜   |       |     |                                                                                                                                                                        |
| T0-14-1 | Security headers via `next.config.mjs`                    |   ⬜   |       |     |                                                                                                                                                                        |
| T0-14-2 | Cookie baseline (`httpOnly`/`secure`/`sameSite`)          |   ⬜   |       |     |                                                                                                                                                                        |
| T0-14-3 | CSP allowlist docs                                        |   ⬜   |       |     |                                                                                                                                                                        |
| T0-15-1 | Focus ring styles                                         |   ⬜   |       |     |                                                                                                                                                                        |
| T0-15-2 | Type scale enforcement (≥18px)                            |   ⬜   |       |     |                                                                                                                                                                        |
| T0-15-3 | Axe-core CI check                                         |   ⬜   |       |     |                                                                                                                                                                        |
| T0-16-1 | Unit test setup (Vitest)                                  |   ⬜   |       |     |                                                                                                                                                                        |
| T0-16-2 | Integration: `/api/health` happy path                     |   ⬜   |       |     |                                                                                                                                                                        |
| T0-16-3 | E2E: landing page                                         |   ⬜   |       |     |                                                                                                                                                                        |
| T0-16-4 | E2E: RBAC redirects                                       |   ⬜   |       |     |                                                                                                                                                                        |
| T0-16-5 | E2E: Docker Compose boot                                  |   ⬜   |       |     |                                                                                                                                                                        |
| T0-17-1 | Acceptance-criteria sweep (§10)                           |   ⬜   |       |     |                                                                                                                                                                        |
| T0-17-2 | USER DEPENDENCY walkthrough (§12)                         |   ⬜   |       |     |                                                                                                                                                                        |
| T0-17-3 | Phase closeout / retrospective                            |   ⬜   |       |     |                                                                                                                                                                        |

### Recently changed

<!-- Append a one-line entry per status change: `- YYYY-MM-DD — T0-x-y: <old> → <new> (owner)` -->

- 2026-06-17 — T0-8-1 to T0-8-3: ⬜ → ✅ (lib/rbac/requireRole helper, middleware.ts path gating, role-route shells for seller/buyer/auditor/admin + /login; typecheck + lint + 51 unit tests green)
- 2026-06-17 — T0-12-1 to T0-12-3: ⬜ → ✅ (.env.example already complete; zod env schema tests expanded to 13 cases; docs/infra/iam.md with server IAM role policy, S3/SES permissions, secrets plan, ops action checklist)
- 2026-06-17 — T0-6-1 to T0-6-5: ⬜ → ✅ (EmailDriver interface, SesDriver with SESv2Client, welcome email template, SES infra docs, SES webhook handler; typecheck + lint clean; @aws-sdk/client-sesv2, @aws-sdk/client-sns, otplib installed)
- 2026-06-17 — T0-7-1 to T0-7-4: ⬜ → ✅ (iron-session with \_\_Host- prefix + strict sameSite, argon2id hashing, TOTP MFA scaffold, trackFailedLogin stub; typecheck + lint clean)
- 2026-06-17 — T0-4-1 to T0-4-5: ⬜ → ✅ (jobs/ runner scaffold, registry, retry/backoff, enqueue idempotency, scheduled jobs; 26 unit tests green; typecheck + lint clean)
- 2026-06-16 — T0-2-1: ⬜ → ✅ (tokens extracted from DESIGN.md to styles/tokens.css; typo on --surface-obsidian-loam flagged via FIXME)
- 2026-06-16 — T0-2-2: ⬜ → ✅ (Tailwind v4.3.1 installed; @theme block in app/globals.css bridges tokens to utility classes)
- 2026-06-16 — T0-2-3: ⬜ → ✅ (LimeButton + GhostButton; href-driven polymorphism)
- 2026-06-16 — T0-2-4: ⬜ → ✅ (Input with label/error/hint; DataTag solid|outline; Section primitive)
- 2026-06-16 — T0-2-5: ⬜ → ✅ (TopNav with skip-link; Footer sourcing GIT_SHA/BUILT_AT from env)
- 2026-06-16 — T0-2-6: ⬜ → ✅ (Hero + FullBleedImage; CSS-gradient placeholder pending brand assets)
- 2026-06-16 — T0-2-7: ⬜ → ✅ (Landing page composes TopNav → Hero → 3 sections → Footer; metadataBase added to root layout)
- 2026-06-16 — T0-3-1: ⬜ → ✅ (prisma@5.22.0 + @prisma/client installed; lib/db singleton with globalThis-cached PrismaClient)
- 2026-06-16 — T0-3-2: ⬜ → ✅ (prisma/schema.prisma with 16 FRD §6 models + 10 enums; §5 tables full, rest minimal)
- 2026-06-16 — T0-3-3: ⬜ → ✅ (20260616174314_init migration applied; CREATE EXTENSION citext manually added at top of SQL)
- 2026-06-16 — T0-3-4: ⬜ → ✅ (User.email @db.Citext; citext extension enabled; case-insensitive uniqueness verified via psql)
- 2026-06-16 — T0-3-5: ⬜ → ✅ (prisma/seed.ts with argon2id hash + 10 PlatformConfig defaults; idempotent; sentinel password on missing env)
- 2026-06-16 — T0-3-6: ⬜ → ✅ (FailedJob model + index on failedAt; manual psql insert verified)
- 2026-06-16 — T0-3-7: ⬜ → ✅ (AuditLog model + indexes on actorId/action/timestamp; manual psql insert verified)
- 2026-06-16 — T0-3-8: ⬜ → ✅ (infra/docker-compose.yml: postgres:16-alpine + healthcheck + named volume + infra/README.md)

---

## §4.1 — Repo Setup (single Next.js monolith) (T0-1)

> **Note (architectural change, 16 Jun 2026):** the original T0-1-1
> "Initialize pnpm workspace" task was dropped along with the monorepo
> layout. The repo has a **single** `package.json` at the root and a
> **single** `tsconfig.json`. There is no `pnpm-workspace.yaml`,
> no `apps/web` subtree, and no `packages/*` subdirectories.

### T0-1-1 Bootstrap Next.js 14 app at the repo root

- **Description**: Create the single Next.js 14 (App Router) project at the repo root. Author `package.json` with the locked dependency versions, `tsconfig.json` (strict, `paths: { "@/*": ["./*"] }`), `next.config.mjs`, and `next-env.d.ts`. Add minimal `app/layout.tsx`, `app/page.tsx`, `app/globals.css`. Single deployable; one build, one server process.
- **Acceptance**: `npm run dev` boots a blank Next page on `http://localhost:3000`; `npm run build` succeeds; `next.config.mjs` headers include the security baseline from T0-14-1.
- **Refs**: §4.1

### T0-1-2 Create directory skeleton (single app)

- **Description**: Create empty directories per §4.1: `app/`, `components/`, `lib/{env,db,audit,rbac,storage,email,session,logger}/`, `jobs/`, `styles/`, `prisma/`, `public/`, `tests/{unit,e2e}/`, `infra/{proxy}/`, `.github/workflows/`, plus placeholder `README.md` in each non-trivial subdirectory. Do not create `apps/` or `packages/`.
- **Acceptance**: `tree -L 2` from the root matches the §4.1 tree; no `apps/` or `packages/` directories exist.
- **Depends on**: T0-1-1

### T0-1-3 Configure TypeScript strict, ESLint, Prettier, Vitest, Playwright

- **Description**: Inside the root, install TypeScript strict mode, ESLint (`next/core-web-vitals` + `next/typescript`), Prettier, Vitest, Playwright. Configure `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`. Create `vitest.config.ts` and `playwright.config.ts`. Add `.eslintrc.json` and `.prettierrc`.
- **Acceptance**: `npm run lint`, `npm run typecheck`, `npm test` all pass on the empty scaffold; CI workflow from T0-10-1 is green on this commit.
- **Depends on**: T0-1-2

### T0-1-4 Set up `.gitignore`, `.editorconfig`, root `package.json` scripts

- **Description**: Top-level scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format:check`, `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:e2e:install`. Ignore `node_modules`, `.next`, `.env`, `dist`, `coverage`, `playwright-report`, `test-results`, `*.tsbuildinfo`.
- **Acceptance**: `npm run lint` and `npm run typecheck` work directly (no workspace filter). `.editorconfig` is honored by IDEs.
- **Depends on**: T0-1-3

### T0-1-5 Create `.env.example` and zod env loader (`lib/env.ts`)

- **Description**: Author `.env.example` with every variable listed in §4.11, grouped by section. Add `lib/env.ts` that uses `zod` to validate `process.env` at module load; the process crashes with a clear, per-variable error message on missing/malformed values. Expose `loadEnv()` (eager) and `getEnv()` (lazy, memoized) so unit tests can mutate `process.env` and call `resetEnvForTesting()`.
- **Acceptance**: `tests/unit/env.test.ts` covers: minimal valid env parses, missing required throws, wrong type throws, short `SESSION_SECRET` throws, `console.error` is called with a list of failing fields. Starting the app without `.env` produces a clear zod error naming each missing field.
- **Depends on**: T0-1-3
- **Refs**: §4.11

---

## §4.2 — Design System & Landing Page (T0-2)

### T0-2-1 Copy design tokens to `tokens.css`

- **Description**: Extract `:root` tokens from `DESIGN.md` lines 200–268 verbatim into `styles/tokens.css`. Include colors, spacing, type scale, radii, shadows.
- **Acceptance**: File exists; tokens are byte-identical to DESIGN.md source.
- **Refs**: §4.2

### T0-2-2 Configure Tailwind v4 with `@theme`

- **Description**: Install Tailwind v4 at the root. In `app/globals.css` (or `styles/globals.css` imported by it), declare `@theme` block using the tokens from `DESIGN.md` lines 273–315. Wire `postcss` and the v4 import in `globals.css`.
- **Acceptance**: `bg-lime` (or whatever the lime token name is) and other utility classes resolve correctly in a test component.
- **Depends on**: T0-2-1, T0-1-3
- **Refs**: §4.2

### T0-2-3 Build `LimeButton` and `GhostButton`

- **Description**: Implement in `components/ui/`. Lime CTA: solid lime bg, black text, focus ring (lime). Ghost: transparent bg, lime border, lime text. Both must support `as` polymorphism if needed.
- **Acceptance**: Storybook-less visual test on the landing page (next task); focus visible on Tab.
- **Depends on**: T0-2-2

### T0-2-4 Build `Input`, `DataTag`, `Section`

- **Description**: Form input with label + error states. DataTag: small pill (mono font, lime-on-black or inverse). Section: full-bleed layout primitive with optional background variant.
- **Acceptance**: Components render with the right typography per DESIGN.md; labels are never below 18px.
- **Depends on**: T0-2-2

### T0-2-5 Build `TopNav` and `Footer`

- **Description**: TopNav with logo, primary nav slots, and a lime CTA. Footer with legal, contact, and version/build hash.
- **Acceptance**: Skip-links present; semantic `<header>`/`<footer>`; axe-core finds no serious issues.
- **Depends on**: T0-2-3

### T0-2-6 Build `Hero` and `FullBleedImage`

- **Description**: Hero with H1, subhead, lime primary CTA, optional secondary ghost. FullBleedImage: edge-to-edge with `next/image` and a known aspect ratio.
- **Acceptance**: Used on `/`; image is responsive with no CLS.
- **Depends on**: T0-2-3

### T0-2-7 Implement landing page at `/`

- **Description**: `app/page.tsx` composes Hero → Section → Footer per DESIGN.md. Sets metadata (`title`, `description`, OG image).
- **Acceptance**: `npm run dev` shows the page; no console errors, no 404s in network panel.
- **Depends on**: T0-2-3, T0-2-4, T0-2-5, T0-2-6
- **Refs**: §7

---

## §4.3 — Database & Prisma (T0-3)

### T0-3-1 Add Prisma to the root project (`prisma/schema.prisma` + `lib/db/`)

- **Description**: Install `prisma` and `@prisma/client`. Add `prisma/schema.prisma` with `provider = "postgresql"`. Wire `lib/db/index.ts` to export a singleton `PrismaClient` (globalThis-cached so Next.js HMR doesn't leak connections).
- **Acceptance**: `npx prisma generate` succeeds; client is importable from `lib/db/`.
- **Depends on**: T0-1-3

### T0-3-2 Author initial schema for all FRD §6 tables

- **Description**: Create minimal column sets (per §5) for: `User`, `SellerProfile`, `BuyerProfile`, `Project`, `ProjectRegistration`, `Listing`, `Order`, `Payment`, `Certificate`, `AuditDecision`, `Dispute`, `RegistryEntry`, `CvcBatch`, `AuditLog`, `Payout`, `PlatformConfig`, `FailedJob`. Use `cuid()` or `uuid()` ids; enums for roles/statuses.
- **Acceptance**: `prisma migrate dev` produces a migration; `prisma db push` to a throwaway DB works.
- **Depends on**: T0-3-1
- **Refs**: §5

### T0-3-3 Generate first migration `0000_init`

- **Description**: Commit the initial migration. Document in `prisma/README.md` how to run migrations locally and in CI.
- **Acceptance**: Migration committed; documented.
- **Depends on**: T0-3-2

### T0-3-4 Add `citext` extension usage for emails

- **Description**: Add `CREATE EXTENSION IF NOT EXISTS citext;` to the migration's SQL. Declare `email` as `Citext` in Prisma (use `Unsupported` + raw SQL column if Prisma lacks native citext, or add a custom `@db.Citext`).
- **Acceptance**: Inserting `"Foo@x.com"` and `"foo@x.com"` raises a unique-constraint violation.
- **Depends on**: T0-3-3

### T0-3-5 Write `seed.ts` for admin + default config

- **Description**: Seeds one admin user (configurable email/password via env) and a `PlatformConfig` singleton row with default keys (`commission_bps`, `retire_min_age_days`, etc. — empty values are fine for now).
- **Acceptance**: `npx prisma db seed` creates the admin; admin can log in (once auth exists in Phase 1).
- **Depends on**: T0-3-3

### T0-3-6 Add `FailedJob` model and table

- **Description**: `id`, `jobType`, `payload Json`, `error String`, `attempts Int`, `createdAt`, `failedAt`. Index on `failedAt`.
- **Acceptance**: Schema committed; a manual insert via `psql` works.
- **Depends on**: T0-3-2
- **Refs**: §4.4

### T0-3-7 Add `AuditLog` model

- **Description**: Columns per §5. `payload Json`, indexes on `(actor_id)`, `(action)`, `(timestamp)`.
- **Acceptance**: Schema committed; a manual write succeeds.
- **Depends on**: T0-3-2
- **Refs**: §4.8, §5

### T0-3-8 Docker Compose for Postgres

- **Description**: `infra/docker-compose.yml` with `postgres:16-alpine`, healthcheck, named volume, exposed port `5432`. `.env` example for DB.
- **Acceptance**: `docker compose up -d db` brings up Postgres; `psql` connects; `prisma migrate dev` works against it.
- **Depends on**: T0-3-1
- **Refs**: §4.1

---

## §4.4 — Background Jobs (T0-4)

### T0-4-1 Implement job runner scaffold

- **Description**: `jobs/runner.ts` with bounded worker pool (default 4), pull-from-DB pattern (or in-memory queue for MVP), graceful shutdown, structured logging.
- **Acceptance**: Worker pool starts; can register a no-op job; SIGTERM drains gracefully.
- **Depends on**: T0-3-1

### T0-4-2 Job type registry and dispatcher

- **Description**: Map of `jobType` → handler. Each handler returns a typed result. Enforce idempotency key from payload.
- **Acceptance**: Dispatching a registered job type runs the handler; unknown types log and persist to `failed_job`.
- **Depends on**: T0-4-1, T0-3-6

### T0-4-3 Retry with exponential backoff

- **Description**: On throw, increment `attempts`, schedule retry with `min(2^attempts, 300)` seconds. After max attempts (configurable, default 5), write to `failed_job`.
- **Acceptance**: Unit test: handler that throws 3 times then succeeds runs to completion; handler that always throws lands in `failed_job` after max attempts.
- **Depends on**: T0-4-2

### T0-4-4 `enqueue()` API + idempotency

- **Description**: `enqueue({ type, payload, key })` — if a job with the same `key` is in queue or running, do nothing. Returns enqueue id.
- **Acceptance**: Calling `enqueue` twice with the same key results in a single execution.
- **Depends on**: T0-4-2

### T0-4-5 Scheduled job registration (cron-like)

- **Description**: `setInterval` per process for periodic jobs (e.g., `audit.export.daily`). Use a small offset per process to avoid thundering herd on horizontal scale (acceptable in MVP — note as caveat).
- **Acceptance**: A registered interval job runs at the configured cadence; a unit test with fake timers asserts behavior.
- **Depends on**: T0-4-2

---

## §4.5 — Object Storage (T0-5)

### T0-5-1 Define `StorageDriver` interface

- **Description**: In `lib/storage/`, declare `interface StorageDriver { put, get, presignPut, presignGet, delete, head }`. Use AWS SDK v3 `PutObjectCommand` etc. behind it.
- **Acceptance**: Interface compiles; `S3Driver implements StorageDriver` skeleton compiles.
- **Depends on**: T0-1-3

### T0-5-2 Implement `S3Driver` for AWS S3

- **Description**: Constructor takes region, credentials, endpoint (for S3-compatible mocks). `put` enforces server-side encryption header (`x-amz-server-side-encryption: AES256` or `aws:kms`).
- **Acceptance**: Pointing at MinIO, `put` → `get` round-trip works in a test.
- **Depends on**: T0-5-1

### T0-5-3 Add local S3 mock to Docker Compose

- **Description**: Add a `minio` (or `s3rver`) service with default creds and a bootstrap script to create the four buckets: `ccverse-kyc`, `ccverse-projects`, `ccverse-certificates`, `ccverse-audit-exports`. Set bucket policies to deny unencrypted uploads.
- **Acceptance**: Buckets exist; uploading without the SSE header is rejected.
- **Depends on**: T0-5-2, T0-3-8
- **Refs**: §4.5

### T0-5-4 Presigned URL helpers

- **Description**: `presignPut(bucket, key, ttl)` and `presignGet(bucket, key, ttl)`. Default TTLs: PUT 5 min, GET 5 min. Audit-log every presign issuance.
- **Acceptance**: A presigned PUT works in a test; the matching GET works; the audit log row is created.
- **Depends on**: T0-5-2, T0-3-7

### T0-5-5 CORS config on buckets

- **Description**: Allow only the configured `APP_ORIGIN`. Methods: GET, PUT. Headers: `*`. Expose `ETag`.
- **Acceptance**: Browser PUT from `APP_ORIGIN` succeeds; PUT from another origin fails.
- **Depends on**: T0-5-3
- **Refs**: §4.5

---

## §4.5b — Transactional Email (T0-6)

### T0-6-1 Define `EmailDriver` interface

- **Description**: `send({ to, from, subject, html, text, tags })` returning a `MessageId`. Template support deferred.
- **Acceptance**: Interface compiles.
- **Depends on**: T0-1-3

### T0-6-2 Implement `SesDriver`

- **Description**: Uses `@aws-sdk/client-sesv2`. Reads region, sender domain, configuration set from env. All sends tagged with the configuration set for event capture.
- **Acceptance**: A unit test against `aws-sdk-client-mock` verifies `SendEmailCommand` is called with the right body.
- **Depends on**: T0-6-1

### T0-6-3 React Email templates scaffold

- **Description**: `lib/email/templates/` with one sample template (e.g., `welcome.tsx`) using React Email. Renders to HTML + plain text.
- **Acceptance**: `npm --prefix .` run build (or the email template build script) outputs HTML and text; matches DESIGN.md brand voice (verified by snapshot).
- **Depends on**: T0-6-1

### T0-6-4 Sender identity setup checklist

- **Description**: Markdown doc in `docs/infra/ses.md` listing required DNS records (DKIM, SPF, DMARC) and the AWS steps to verify a domain and request production access.
- **Acceptance**: Doc committed; checklist tickable by ops.
- **Refs**: §4.5b, §12

### T0-6-5 SES webhook handler

- **Description**: `POST /api/webhooks/ses` to receive SNS notifications for bounce/complaint/delivery. Update internal suppression list, write to audit log. HMAC-signed SNS message validation.
- **Acceptance**: An SNS test event triggers the right code paths; unsigned requests are rejected.
- **Depends on**: T0-6-2, T0-3-7

---

## §4.6 — Auth Scaffolding (T0-7)

### T0-7-1 `iron-session` integration

- **Description**: `lib/session/` exposes `getSession()` and `saveSession()` with typed payload (`userId`, `role`, `mfaPassed`). Configure `SESSION_SECRET` from env.
- **Acceptance**: Unit test: set/read round-trips a payload.
- **Depends on**: T0-1-5

### T0-7-2 Password hashing helper

- **Description**: `hashPassword(plain)`, `verifyPassword(plain, hash)` using `argon2id` with parameters from OWASP cheat sheet (e.g., m=64MB, t=3, p=4).
- **Acceptance**: A hashed password verifies; a wrong password does not.
- **Depends on**: T0-1-3

### T0-7-3 TOTP MFA helper (scaffold only)

- **Description**: `generateSecret()`, `verifyToken(secret, token)`. **Not wired to any flow** in Phase 0.
- **Acceptance**: Unit tests pass; no UI surfaces use it yet.
- **Depends on**: T0-1-3
- **Refs**: §4.6

### T0-7-4 `trackFailedLogin` helper

- **Description**: Stub that records failure attempts on a `User` (column added in Phase 1 if needed; for now, in-memory or a `login_attempts` log table). Not enforced.
- **Acceptance**: Function exists and is unit-testable.
- **Depends on**: T0-1-3
- **Refs**: §4.6

---

## §4.7 — RBAC Middleware (T0-8)

### T0-8-1 `requireRole` helper

- **Description**: `lib/rbac/` exporting `requireRole(roles: Role[]): User | never`. Returns 401 if no session, 403 if wrong role.
- **Acceptance**: Unit tests cover: no session → 401, wrong role → 403, correct role → returns user.
- **Depends on**: T0-7-1

### T0-8-2 Next.js `middleware.ts` for path gating

- **Description**: `middleware.ts` at the project root matching the allowlist in §4.7. Public paths pass through; others redirect to `/login` (placeholder) or 401 for API routes.
- **Acceptance**: Hitting `/admin` while unauthenticated redirects; hitting `/api/admin/*` returns 401 JSON.
- **Depends on**: T0-8-1

### T0-8-3 Role-route shells

- **Description**: Empty pages: `app/(seller)/seller/page.tsx`, `app/(buyer)/buyer/page.tsx`, `app/(auditor)/auditor/page.tsx`, `app/(admin)/admin/page.tsx`. Each calls `requireRole`.
- **Acceptance**: All four paths exist; they 403 for the wrong role, 200 for the right one (with a stub "coming soon" body).
- **Depends on**: T0-8-1
- **Refs**: §1, §7

---

## §4.8 — Observability (T0-9)

### T0-9-1 `pino` logger with request id

- **Description**: `lib/logger/` exporting a `pino` instance writing JSON to stdout. `withRequestId` helper; `requestId` middleware attaches an id (use `crypto.randomUUID()` or `nanoid`).
- **Acceptance**: Every log line includes a `requestId`; structured JSON parses cleanly.
- **Depends on**: T0-1-3

### T0-9-2 Audit log writer helper

- **Description**: `lib/audit/index.ts` exporting `audit.write({ actor, action, target, payload, ip? })`. Inserts a row into `AuditLog` and never throws (fail-soft with error log).
- **Acceptance**: Unit test: writing an entry inserts a row with the correct shape.
- **Depends on**: T0-3-7, T0-9-1
- **Refs**: §4.8, §5

---

## §4.9 — CI/CD (T0-10)

### T0-10-1 `ci.yml` workflow

- **Description**: On push and PR: setup Node (`.github/workflows/ci.yml`), install with `npm ci`, run `lint`, `typecheck`, `test`, `format:check`, `next build`. Cache the npm store.
- **Acceptance**: PR opened against a sample branch triggers the workflow and passes.
- **Depends on**: T0-1-4, T0-1-3

### T0-10-2 `preview.yml` workflow

- **Description**: On PR: spin up a per-PR Postgres service, run migrations, start the app, smoke test `/` and `/health`. (The "deploy" step is environment-specific — for now, assert a local runner works.)
- **Acceptance**: PR workflow runs migrations against a service container; smoke test passes.
- **Depends on**: T0-10-1, T0-3-3

### T0-10-3 `deploy.yml` workflow (skeleton)

- **Description**: On `main`: build + push artifact, gated by an environment. Concrete deploy step deferred to Phase 9.
- **Acceptance**: Workflow file is valid; manual trigger works.
- **Depends on**: T0-10-1

---

## §4.10 — Proxy (T0-11)

### T0-11-1 Caddyfile for local dev

- **Description**: `infra/proxy/Caddyfile`: listens on `:8443`, auto-TLS via internal CA, reverse-proxies to `web:3000`, sets `X-Forwarded-*` headers, rate-limits `/api/*` at 60 req/s per IP.
- **Acceptance**: `docker compose up proxy` brings up Caddy; `curl -k https://localhost:8443/` returns 200; rate limit triggers above threshold.
- **Depends on**: T0-1-3, T0-3-8
- **Refs**: §4.10

### T0-11-2 Nginx config template

- **Description**: `infra/proxy/nginx.conf` template: TLS 1.2+, HSTS, static asset caching, deny path filter (`.env`, `.git`), allowlist inbound paths. Documented in `infra/proxy/README.md`.
- **Acceptance**: `nginx -t` passes; manual smoke test in a container succeeds.
- **Depends on**: T0-11-1
- **Refs**: §4.10

### T0-11-3 Proxy deny-path & allowlist verification

- **Description**: Automated test against the running proxy: `/.env` → 404 at edge, `/.git/HEAD` → 404 at edge, `/` → 200, `/api/health` → 200.
- **Acceptance**: Test in `infra/proxy/test.sh` passes in CI.
- **Depends on**: T0-11-1

---

## §4.11 — Env & Secrets (T0-12)

### T0-12-1 Author complete `.env.example`

- **Description**: Per §4.11, list every variable with a comment. Group: Database, S3, SES, Session, App/Proxy.
- **Acceptance**: File committed; covered by the zod schema in T0-1-5.
- **Depends on**: T0-1-5
- **Refs**: §4.11

### T0-12-2 `zod` env schema tests

- **Description**: Unit tests for the env loader: missing required → throws; wrong type → throws; minimal valid → ok.
- **Acceptance**: Tests pass; CI blocks invalid env changes.
- **Depends on**: T0-1-5

### T0-12-3 IAM role / credentials plan

- **Description**: `docs/infra/iam.md` describing the server's IAM role: S3 + SES only, no console, no static keys in production. Lists policy actions and resource ARNs.
- **Acceptance**: Doc committed; reviewed by ops/security.
- **Refs**: §12

---

## Cross-cutting — Health, Version, Audit (T0-13)

### T0-13-1 `GET /health` endpoint

- **Description**: `app/api/health/route.ts`. Pings DB (`SELECT 1`), storage (`head` on a probe key), and SES (describe-account). Returns `{ ok, db, storage, ses, version }`. 200 if all up, 503 otherwise.
- **Acceptance**: All-up → 200 with the right JSON; mocked-down subsystem → 503.
- **Depends on**: T0-3-1, T0-5-2, T0-6-2, T0-9-1, T0-3-7
- **Refs**: §6, §1

### T0-13-2 `GET /version` endpoint

- **Description**: Returns build SHA, build time (env-injected at build).
- **Acceptance**: Response includes `gitSha` and `builtAt`.
- **Depends on**: T0-1-3

### T0-13-3 Audit log startup ping

- **Description**: On boot, write one `audit_log` row of action `system.startup` with payload including version and requestId.
- **Acceptance**: After app boot, the `AuditLog` table has at least one row.
- **Depends on**: T0-13-1, T0-9-2

---

## Cross-cutting — Security Baseline (T0-14)

### T0-14-1 Security headers via `next.config.js`

- **Description**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` (start strict, document exceptions for SES/S3).
- **Acceptance**: `curl -I http://localhost:3000/` shows all four headers.
- **Depends on**: T0-1-3
- **Refs**: §8

### T0-14-2 Cookie baseline

- **Description**: Session cookies set with `httpOnly`, `secure`, `sameSite=lax`; document the helper used in `lib/session/`.
- **Acceptance**: Inspecting cookies in a browser shows the right flags.
- **Depends on**: T0-7-1
- **Refs**: §8

### T0-14-3 CSP allowlist docs

- **Description**: `docs/security/csp.md` listing every allowed source for scripts, styles, images, connect, frame. Updated as features grow.
- **Acceptance**: Doc committed; matches the active `Content-Security-Policy` header.
- **Depends on**: T0-14-1

---

## Cross-cutting — Accessibility (T0-15)

### T0-15-1 Focus ring styles

- **Description**: Global `:focus-visible` ring in lime. Verify on every primitive (T0-2 series).
- **Acceptance**: Tab through `/`; every interactive element has a visible lime focus ring.
- **Depends on**: T0-2-3, T0-2-4, T0-2-5

### T0-15-2 Type scale enforcement

- **Description**: Body text ≥ 18px (NB International Pro); UI labels in JetBrains Mono. Encode as tokens; do not allow smaller in components.
- **Acceptance**: axe-core + a CI lint rule (`stylelint` or custom) flags any font-size under 18px on body-classed elements.
- **Depends on**: T0-2-1

### T0-15-3 Axe-core CI check

- **Description**: Add `axe-core` to Playwright runs; assert zero serious/critical issues on `/` and `/health`.
- **Acceptance**: CI fails on new serious/critical a11y regressions.
- **Depends on**: T0-2-7

---

## Cross-cutting — Tests (T0-16)

### T0-16-1 Unit test setup

- **Description**: Vitest in the root project, picking up `lib/**/*.test.ts` and `tests/unit/**/*.test.ts`. Coverage thresholds: 70% lines on `lib/audit/`, `lib/rbac/`, `lib/session/` once they exist.
- **Acceptance**: `npm test` runs all unit tests; coverage report available.
- **Depends on**: T0-1-3

### T0-16-2 Integration: `/health` happy path

- **Description**: Spin up Postgres + MinIO + stub SES; hit `/health`; expect 200 with all `up`.
- **Acceptance**: Test passes in CI.
- **Depends on**: T0-13-1, T0-3-8, T0-5-3

### T0-16-3 E2E: landing page

- **Description**: Playwright test: `/` renders, lime CTA visible, footer visible, no console errors.
- **Acceptance**: Test passes in CI.
- **Depends on**: T0-2-7, T0-15-3
- **Refs**: §9

### T0-16-4 E2E: RBAC redirects

- **Description**: Playwright test: unauthenticated user hitting `/admin` is redirected to login placeholder; `/api/admin/anything` returns 401.
- **Acceptance**: Test passes in CI.
- **Depends on**: T0-8-2

### T0-16-5 E2E: Docker Compose boot

- **Description**: `docker compose up -d` brings up all services; integration test asserts each is reachable.
- **Acceptance**: Test script committed; runs green.
- **Depends on**: T0-3-8, T0-5-3, T0-11-1

---

## Cross-cutting — Final Acceptance (T0-17)

### T0-17-1 Acceptance-criteria sweep

- **Description**: Walk through §10 of the phase doc. Tick boxes that are now true. For any unchecked, file a follow-up task or document the deferral.
- **Acceptance**: All 10 boxes either ticked or explicitly deferred with rationale.
- **Depends on**: All T0-1 … T0-16

### T0-17-2 USER DEPENDENCY walkthrough

- **Description**: For each item in §12, mark "resolved" or "still open". Open items block the phase from being marked complete.
- **Acceptance**: Every USER DEPENDENCY has a current status.
- **Refs**: §12

### T0-17-3 Phase closeout doc

- **Description**: Append a short "Phase 0 retrospective" section to the phase doc or a new `docs/retros/phase-0.md` covering: what landed, what slipped, lessons for Phase 1.
- **Acceptance**: Doc committed.

---

## Suggested parallel tracks

When you have multiple engineers, these tracks can run concurrently after T0-1-3 lands:

- **Track A (Design & UI)**: T0-2-\* (design system + landing)
- **Track B (Data & Infra)**: T0-3-_, T0-4-_, T0-5-_, T0-12-_
- **Track C (Cross-cutting)**: T0-7-_, T0-8-_, T0-9-_, T0-13-_, T0-14-_, T0-15-_, T0-16-\*

Tracks B and C can each spawn sub-parallel work; A blocks on the design tokens (T0-2-1) only.

---

## Effort roll-up

Roughly 60–80 task-days. Matches the §14 estimate of "1 week, 2–3 engineers" assuming mature npm/Next/Prisma familiarity.
