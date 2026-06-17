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
- **TLS 1.2+**, **HSTS** (2y preload), **CSP** locked down in `next.config.mjs**, `httpOnly` + `sameSite=strict` on the session cookie. In production `secure` is also set (HTTPS only). Do not use the `__Host-` prefix — it requires HTTPS and breaks same-origin HTTP deployments. `noUncheckedIndexedAccess` and friends are on; don't weaken the tsconfig.
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
- The Next.js process is the _only_ worker. Cron-like work (daily reconciliation, payout job, audit export) uses a per-instance `setInterval` with a startup sweep. Job idempotency keys live in the payload; dedupe at the DB level via the `failed_job` table.
- **Tailwind utilities silently lose to the browser's `a:-webkit-any-link` rule on `<a>` elements.** Any component that renders as Next's `<Link>` (i.e. produces an `<a>`) gets `color: -webkit-link` and `text-decoration: underline` from the user-agent stylesheet at specificity (0,0,1,1) — higher than a single utility class at (0,0,1,0). Symptom: the button text shows the wrong color (inherits from `<body>`) and gains a stray underline. **Fix:** prefix the affected utility with `!` in the component's base class string — e.g. `!text-obsidian-loam`, `!no-underline`. The `!` adds `!important` and beats the UA rule. This is the reason `LimeButton`, `GhostButton`, and the `TopNav` brand wordmark all use `!`-prefixed color/underline utilities. Same treatment is needed for any future `<Link>`-rendered component or any plain `<a>` that opts out of the design system's default link look.
- **AWS SDK v3 SSE enum must be cast.** `ServerSideEncryption: 'AES256'` gives a TS2322 error because the SDK types it as the enum `ServerSideEncryption` (a union of literal strings). Cast with `as 'AES256'`.
- **`aws-sdk-client-mock` is `aws-sdk-client-mock` on npm, not `@aws-sdk/client-s3-mock`.** The scoped package does not exist.
- **`mockClient` is imported from `aws-sdk-client-mock`.** Import the factory, not the mock instances.
- **`commandCalls()` returns `SinonSpyCall[]` — the command is at `.args[0]`.** `.input` is not a direct property; the resolved input is on the command instance itself: `(call.args[0] as Command).input`. Do not use `.input` directly on the spy call.
- **`S3Client` `GetObjectCommand` body is a stream (`SdkStreamMixin`), not `Buffer`.** When testing `get()`, cast the mock's `Body` response through `as any` — the real SDK returns a stream-like object that is harder to construct in a test. Your `S3Driver.get()` code should also handle both `Buffer` (what the mock returns) and async iterable (what the real SDK returns): `if (Buffer.isBuffer(val)) { body = val } else { for await (const chunk of val) { ... } }`.
- **Create a fresh `S3Driver` (or re-mock) per Vitest test.** The S3Client is built at `new S3Driver()` construction time, so sharing a driver across tests with different mocks causes cross-test pollution. Instantiate inside `beforeEach`.
- **Do not import from `lib/logger` before T0-9.** Use `jobs/logger` as a temporary stub — it already exists and provides the same `debug/info/warn/error` interface. `lib/logger` is wired up in T0-9-1.

## Implementation learnings (T1-2 / T1-3)

Lessons learned from Phase 1 auth implementation — do not repeat these.

### Cookie name must be consistent everywhere
`iron-session` cookie name must be defined in **exactly one place** and imported everywhere it's used. Three locations were involved:

- `lib/session/index.ts` — `COOKIE_NAME` used by `getIronSession` in route handlers
- `lib/rbac/index.ts` — `COOKIE_NAME` used by `requireRole` and `getSessionFromRequest`
- `middleware.ts` — calls `getSessionFromRequest` from `lib/rbac`

All three must agree on the same name. If any one is wrong, the session silently fails
(cookie set but unreadable → every request appears unauthenticated → redirects to login).

### `__Host-` cookie prefix requires HTTPS
The `__Host-` prefix enforces `Secure=true` (HTTPS only). In local dev over HTTP, the
browser silently rejects the cookie. Either:
- Remove the `__Host-` prefix for same-origin deployments (simple, safe for single-region)
- Or ensure dev runs over HTTPS (e.g. via a local TLS proxy)

### iron-session cookie value is encrypted binary, not JSON — do not parse it directly
`getSessionFromRequest` in `lib/rbac` runs on the Edge (no Node APIs). The raw cookie
value is an iron-session seal (encrypted binary). `JSON.parse(cookie.value)` will always
throw, returning `{}` and breaking all middleware auth checks.

**Fix:** Use iron-session's own `unsealData()` from `iron-session` (Edge-compatible) to
decrypt the cookie value:

```ts
import { unsealData } from 'iron-session';
const data = await unsealData<SessionData>(cookie.value, { password: env.SESSION_SECRET });
```

### `middleware.ts` must be `async` if it calls any `async` function
`export function middleware` must be `export async function middleware` when it `await`s
anything. A non-async function returning a `Promise<NextResponse>` causes the promise to
be ignored and the middleware to pass through without waiting — the auth check never runs.

### Always `await router.push()` in Next.js App Router
`router.push()` returns a `Promise<void>`. If you `await` it, errors (including
navigation being blocked by middleware) surface as caught exceptions. Without `await`,
navigation failures are silent and the UI stays on the wrong page with no error visible.

### Remove debug `console.log` before committing
Dev-time logging added for debugging (e.g. `console.log('[login] API ok, role:', role)`)
must be removed before committing. Use Playwright to trace issues instead.

### When editing a file, read the current state first
The Edit tool requires reading the file in the current conversation turn before editing.
If you skip this and the file was last modified in an earlier turn, the edit will fail.
Always `Read` first when targeting a file you haven't read recently.

### Always run `typecheck`, `lint`, and `build` after implementing a feature
Unit tests do not catch navigation/redirect failures, cookie rejections, or
middleware mismatches. Always verify with:
```bash
npm run typecheck && npm run lint && npm run build
```
For auth flows specifically, use Playwright to trace the full browser redirect chain
(`POST /api/auth/login` → cookie set → `GET /protected` → 307 redirect? → final URL).

## E2E verification requirement (UI tasks)

**Every task that introduces UI pages must be verified with Playwright E2E tests before considering the task done.** Unit tests alone are insufficient — they cannot catch:
- Page loads returning 500 instead of 200
- Redirect chains breaking (auth redirects, form submissions)
- Cookie rejection / session not persisting
- Form validation not triggering, or wrong error messages
- Server Components throwing 403/500 at render time

**Required verification workflow for UI tasks:**
1. Write the feature (pages + API routes)
2. Run `npm run typecheck && npm run lint && npm run build` — fix all errors
3. Run `npm run test:e2e` — all tests must pass
4. If tests fail, debug with Playwright's trace viewer (`npx playwright show-trace`)
5. Commit only after step 3 is green

**Writing E2E tests** (`tests/e2e/`):
- One `.spec.ts` file per feature/phase
- Use `request.post(... , { data: ... })` for API calls that don't need a browser cookie
- Use `page.goto()` + `page.getByLabel()` for browser-based flows
- Clean up test data in `beforeEach` or `afterAll` via `PrismaClient` directly — don't rely on DB reset between tests
- Use `uniqueEmail()` with a `+e2e-` infix so cleanup `deleteMany({ where: { email: { contains: '+e2e-' } } })` only removes test rows
- Tests that need a session should log in via the UI (`page.goto('/login')` + form fill) or use the cookie from a prior page context
- Target full happy-path flows end-to-end; sad paths can be API-level

**Running tests:**
```bash
npm run test:e2e:install   # one-time
npm run test:e2e           # runs dev server + all specs
npx playwright test tests/e2e/seller-kyc.spec.ts  # one file
npx playwright test -g "seller registration"       # one test name
```
