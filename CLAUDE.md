# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CC Verse — a verified carbon-credit marketplace. A logged-in Buyer can browse, pay for, and receive signed PDF certificates of ownership for credits held in a CC Verse registry; a Seller can register projects, list credits, and receive T+2 payouts. Source FRD v1.1; design system is "INVERSA" (dark canvas, electric-lime accent).

The product is a **single Next.js 14 monolith** deployed to a single region. There is **no** monorepo, no `pnpm`/`yarn` workspace, no `apps/*` or `packages/*` subprojects. All server code (DB, storage, email, session, RBAC, jobs, audit) lives in `lib/*` inside the same Next.js process. The proxy, Postgres, S3, and SES are the only other runtime dependencies.

## Stack (locked — do not introduce new services/libraries without a phase-doc update)

- **Next.js 14.2.18** (App Router) + **React 18.3.1** + **TypeScript 5.6.3** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`).
- **PostgreSQL 15** + **Prisma** (data layer; schema/migrations in `prisma/`).
- **AWS S3** for KYC, project docs, signed certificate PDFs, audit exports. Object storage code is behind a `StorageDriver` interface (`lib/storage/`); local dev uses a MinIO/S3rver mock.
- **AWS SES** is the only email channel; behind an `EmailDriver` interface (`lib/email/`).
- **iron-session** for cookie-based sessions; **otplib** for TOTP MFA (Phase 1+).
- **Tailwind v4** with `@theme` design tokens copied from `DESIGN.md`.
- **pino** for structured JSON logs to stdout. No external APM/tracing in MVP.
- **Vitest** (unit) + **Playwright** (E2E, chromium only).
- **GitHub Actions** (`.github/workflows/ci.yml`) — lint → typecheck → test → format:check → build.

Five RBAC roles: `public`, `buyer`, `seller`, `auditor`, `admin`. MFA mandatory for `auditor` and `admin`.

## Common commands

All commands run from the repo root. Node ≥ 20, npm ≥ 10.

```bash
# Setup
cp .env.example .env
# edit .env — set SESSION_SECRET=$(openssl rand -base64 32)
npm install

# Develop
npm run dev                # next dev on :3000
npm run build              # production build
npm start                  # serve the production build

# Quality gates
npm run lint               # next lint (next/core-web-vitals + next/typescript)
npm run typecheck          # tsc --noEmit
npm run format             # prettier --write .
npm run format:check       # prettier --check (CI runs this)

# Tests
npm test                   # vitest run (one-shot)
npm run test:watch         # vitest watch
npm run test:coverage      # vitest with V8 coverage
npm run test:e2e           # playwright (auto-starts `npm run dev` locally)
npm run test:e2e:install   # one-time: install Playwright chromium browser
```

### Running a single test

```bash
# one Vitest file
npx vitest run tests/unit/env.test.ts
# or
npx vitest run -t "env loader"               # match by test name

# one Playwright spec
npx playwright test tests/e2e/path/to/foo.spec.ts
npx playwright test -g "test name"           # match by test name
```

## Directory layout (high level)

```
ccverse/                       # Next.js app root
├── app/                       # App Router (routes, layouts, globals)
├── components/                # UI primitives (T0-2; built from DESIGN.md)
├── lib/                       # Domain services — replaces the old packages/*
│   ├── env.ts                 # zod-validated env loader (fail-fast at boot)
│   ├── db/                    # Prisma client singleton
│   ├── audit/                 # Append-only audit writer
│   ├── rbac/                  # requireRole helper
│   ├── storage/               # StorageDriver + S3Driver
│   ├── email/                 # EmailDriver + SesDriver
│   ├── session/               # iron-session helpers
│   ├── logger/                # pino logger
│   ├── jobs/                  # in-process job registry (T0-4)
│   ├── methodology/           # methodology recogniser (Phase 2)
│   ├── registry/              # CVC registry service — the source of truth (Phase 2)
│   ├── payments/              # Razorpay + Stripe gateways (Phase 6)
│   ├── signing/               # PAdES / KMS PDF signer (Phase 7)
│   └── notifications/         # SES event notifications (Phase 9)
├── jobs/                      # in-process job runner (worker pool)
├── styles/                    # design tokens (T0-2)
├── prisma/                    # schema + migrations + seed
├── public/                    # static assets
├── tests/{unit,e2e}/
├── infra/                     # local-only: docker-compose, Caddyfile, nginx.conf
├── docs/
│   ├── plan.md                # top-level plan: 10 phases, stack, out-of-scope
│   └── phases/                # phase-0-foundation.md … phase-9-…md
├── tasks/phase-0-tasks.md     # PR-sized tasks for Phase 0
├── .github/workflows/ci.yml
├── DESIGN.md                  # the design system (INVERSA)
├── .env.example
├── next.config.mjs            # security headers (CSP, HSTS, X-Frame-Options, …)
├── tsconfig.json              # paths: { "@/*": ["./*"] }
├── vitest.config.ts
├── playwright.config.ts
└── package.json               # single root package — no workspaces
```

**Path alias:** `@/*` → `./*` (repo root). Use `@/lib/env`, `@/app/api/health/route`, etc. There are no separate package entrypoints to wire up.

## Architectural invariants (do not break)

These come from `docs/plan.md` §6 and `docs/phases/phase-0-foundation.md` §4.1, 4.11, 4.7. They are not optional.

- **Single Next.js process.** The job runner, route handlers, API, and server components all run in one Node process. Background work is short-running (≤ 30s) or split into steps.
- **Registry is the source of truth.** A `registry_entry` row per CVC serial with state ∈ {`Available`, `Held`, `Retired`}. No phase writes `RegistryEntry` directly — it goes through `lib/registry/`. Unique constraint on `cvc_serial`.
- **Append-only audit log.** Every state-changing action logs `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `ip`, `timestamp`, `payload`. 7-year retention.
- **Atomic state transitions.** Use DB transactions + `SELECT … FOR UPDATE` on registry entries and listing quantities. No double-spend, no oversell.
- **TLS 1.2+**, **HSTS** (2y preload), **CSP** locked down in `next.config.mjs`, **`__Host-` cookie prefix**, `httpOnly` + `secure` + `sameSite=strict` on the session cookie. `noUncheckedIndexedAccess` and friends are on; don't weaken the tsconfig.
- **PII minimization** on public surfaces: `/verify/[token]` shows no buyer/seller name or country.
- **English only** in v1.0 UI and certificates.
- **WCAG 2.1 AA** from Phase 0 (semantic HTML, focus rings, contrast verified against `DESIGN.md` tokens).
- **No PAN/CVV** in our DB. Payment flows are gateway-hosted fields only (PCI SAQ A / A-EP).
- **English email is the only notification channel in MVP.** No SMS.

## Env loader contract (`lib/env.ts`)

- Single source of env truth. `loadEnv()` runs at boot; `getEnv()` is memoized and reads from the cache.
- The schema is the union of sub-schemas: `app + database + s3 + ses + session + build`. See `.env.example` for the full list with comments.
- **Fail-fast at boot:** if anything is missing or malformed, the process crashes with a message that lists every offending field. Tests rely on this (`tests/unit/env.test.ts`).
- Edge runtime: `middleware.ts` runs on Edge and may read only `process.env.APP_ORIGIN` / `process.env.PROXY_ORIGIN` directly; do not import `lib/env` from middleware.
- Production uses an IAM role for S3/SES; static `S3_ACCESS_KEY_ID` / `SES_ACCESS_KEY_ID` are dev-only and may be empty strings in prod.

## How phases are tracked

- Top-level plan: `docs/plan.md` (10 phases, sprint-sized).
- Per-phase doc: `docs/phases/phase-N-*.md` (Goal, FRs, NFRs, technical impl, schema, API, UI, cross-cutting, test plan, acceptance criteria, dependencies, USER DEPENDENCY list).
- Per-phase tasks: `tasks/phase-N-tasks.md` (PR-sized; track via the embedded tracker table).
- **Update the relevant phase doc when you change scope** — those docs are the single source of truth for what the product is.

Each phase doc follows the same template (Goal → FRs → NFRs → Tech impl → Schema → API → UI → Cross-cutting → Test plan → Acceptance criteria → Dependencies → **USER DEPENDENCY** → Out of scope → Effort). USER DEPENDENCY lists are blocking items the team owes stakeholders — do not declare a phase "complete" with any open.

## Out of scope for MVP (do not propose / build these)

- Multi-region DR
- WAF / advanced edge security
- External observability stack (no APM vendor, no distributed tracing)
- SMS notifications
- External KYC provider (manual review only)
- Real-time / websockets
- Mobile native apps
- Crypto / tokenized settlement

## Common gotchas

- The earlier plan had a `pnpm` monorepo with `apps/web` + `packages/*`. That was dropped on 16 Jun 2026. **Do not reintroduce workspace config or sub-packages.** If you find a doc that still mentions `apps/web` or `packages/*`, that's a stale doc — fix it.
- The env loader is **memoized** at the module level. Vitest resets it via `resetEnvForTesting()` between tests; new tests that touch `process.env` should call this.
- `next.config.mjs` sets `experimental.typedRoutes`. New routes are picked up on dev rebuild; `next build` will error on broken `<Link href>` references — use the typed route string.
- `npm run format:check` runs in CI. Pre-commit: `npm run format` on changed files.
- `tsconfig.json` has `noUncheckedIndexedAccess: true`. Array/record index access returns `T | undefined` — handle the undefined case (the existing code does this consistently).
- The Next.js process is the *only* worker. Cron-like work (daily reconciliation, payout job, audit export) uses a per-instance `setInterval` with a startup sweep. Job idempotency keys live in the payload; dedupe at the DB level via the `failed_job` table.
