# Phase 0 — Foundation & Infrastructure

> **Goal:** Stand up the project skeleton — Next.js app, design system, proxy, Postgres, S3, AWS SES, CI/CD — so that every later phase can be implemented against a stable, deployable foundation.

> **Architecture (per stakeholder diagram, minimal MVP):** Users → **Proxy** → **Server** (Next.js) → **PostgreSQL** / **AWS S3** / **AWS SES**. Single Node.js process, single Postgres, single S3 bucket namespace, single SES identity.

---

## 1. Demoable outcome

- `npm run dev` starts a local app at `http://localhost:3000` rendering the design-system landing page (full-bleed hero, lime CTA, footer) per `DESIGN.md`.
- Local **proxy** (Caddy in Docker Compose) sits in front of the dev server, terminates TLS, forwards to the app, and serves `/health`.
- `/health` returns `{ ok: true, db: "up", storage: "up", ses: "up" }` with status 200, and 503 if any dependency is down.
- CI pipeline runs on every push: lint, typecheck, unit tests, build, and a smoke health check against a deployed preview environment.
- Local Postgres (and an S3 mock) is runnable with one command (Docker Compose).
- AWS SES is wired in `lib/email`; sending a test transactional email from a local script against a verified address succeeds.
- An append-only `audit_log` table exists and is used by the `/health` and `/version` endpoints.
- Secrets management pattern is in place (`.env.example` + typed env loader).
- One skeleton route per role exists: `/`, `/seller`, `/buyer`, `/auditor`, `/admin`, each gated to its role (RBAC middleware works; routes are empty).

---

## 2. Functional requirements in scope

None directly. This phase lays the technical foundation for all FRs.

Cross-cutting constraints honored (NFR 4.2, 4.5, 4.6):

- TLS 1.2+ enforced at the proxy.
- `audit_log` table created (NFR 4.6).
- WCAG 2.1 AA scaffolding: semantic HTML, focus rings, color contrast verified against design tokens.

---

## 3. Non-functional requirements touched

- 4.2 Security (baseline headers, TLS, hashing, RBAC middleware scaffold).
- 4.3 Scalability (stateless web tier, can run multiple instances behind the proxy; **multi-region DR is out of scope for MVP**).
- 4.4 Availability (health checks, deploy automation).
- 4.5 Usability (design system, responsive breakpoints, accessibility).
- 4.6 Auditability (audit log table, request id propagation, structured logging).

---

## 4. Technical implementation

### 4.1 Repo layout (single Next.js monolith)

> **Architectural change (16 Jun 2026):** dropped the `pnpm` workspace /
> `apps/` + `packages/` monorepo. The entire app is a **single Next.js 14
> project at the repo root**. All "package" code lives under `lib/*` inside
> the same app. There is **one** `package.json`, **one** `tsconfig.json`,
> **one** build, **one** deployable. GitHub Actions workflows live under
> `.github/workflows/`. The previous "monorepo" plan was over-engineered for
> a single-deployable MVP; this layout reduces ceremony and keeps every
> surface one IDE jump away.

```
ccverse/                              # repo root = Next.js app root
├── app/                              # Next.js 14 App Router
│   ├── (public)/                     # Marketing, listing browse (Phase 5)
│   ├── (auth)/                       # Login, register, MFA, reset
│   ├── (seller)/                     # Seller dashboard
│   ├── (buyer)/                      # Buyer area
│   ├── (auditor)/                    # Auditor console
│   ├── (admin)/                      # Admin console
│   ├── api/                          # Route handlers (REST)
│   │   ├── health/route.ts           # T0-13-1
│   │   └── version/route.ts          # T0-13-2
│   ├── layout.tsx
│   ├── page.tsx                      # Landing (T0-2-7)
│   └── globals.css
├── components/                       # UI primitives (T0-2-*)
├── lib/                              # Domain services (replaces `packages/*`)
│   ├── env.ts                        # zod env loader (T0-1-5)
│   ├── db/                           # Prisma client + schema (T0-3)
│   ├── audit/                        # Append-only audit writer (T0-9-2)
│   ├── rbac/                         # requireRole helper (T0-8-1)
│   ├── storage/                      # StorageDriver + S3Driver (T0-5)
│   ├── email/                        # EmailDriver + SesDriver (T0-6)
│   ├── session/                      # iron-session helpers (T0-7)
│   └── logger/                       # pino logger (T0-9-1)
├── jobs/                             # In-process job runner (T0-4)
├── styles/                           # Design tokens + Tailwind v4 (T0-2-1/2)
├── prisma/                           # Prisma schema + migrations (T0-3)
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/                           # Static assets
├── tests/
│   ├── unit/                         # Vitest
│   └── e2e/                          # Playwright
├── infra/                            # Local-only infra (NOT a monorepo package)
│   ├── docker-compose.yml            # Postgres + MinIO + Caddy (T0-3-8, T0-5-3, T0-11-1)
│   └── proxy/
│       ├── Caddyfile                 # local dev proxy (T0-11-1)
│       └── nginx.conf                # production proxy template (T0-11-2)
├── docs/                             # Phase docs, plan, retros
├── tasks/                            # Per-phase task breakdowns
├── .github/
│   └── workflows/                    # GitHub Actions (T0-10-*)
├── DESIGN.md
├── .env.example
├── package.json                      # single root package
├── tsconfig.json
├── next.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── .eslintrc.json
├── .prettierrc
└── .editorconfig
```

**Path-aliased imports** (root `tsconfig.json`):

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
  },
}
```

Use `@/lib/env`, `@/app/api/health/route`, etc. There are **no** separate
package entrypoints to wire up; everything resolves from the root.

**Why no `packages/*`:** at MVP scale, the monorepo cost (workspace config,
separate `tsconfig` per package, build orchestration, type-only exports
between apps) outweighs any benefit. The original `packages/{db,audit,rbac,
storage,email,session,ui}` plan is collapsed into `lib/{db,audit,rbac,
storage,email,session,ui}` and a flat `components/` directory. If and when a
second consumer appears (e.g., a CLI or a worker process) the boundary can
be re-introduced by extracting one `lib/*` directory into a workspace.

### 4.2 Design system integration

- Copy the `:root` tokens from `DESIGN.md` (lines 200–268) into `styles/tokens.css`.
- Configure Tailwind v4 with `@theme` tokens from `DESIGN.md` (lines 273–315) in `app/globals.css` (or a `styles/globals.css` imported by it).
- Build the components listed in `DESIGN.md`:
  - `Hero`, `LimeButton`, `GhostButton`, `DataTag`, `TopNav`, `FullBleedImage`, `Footer`, `Input`, `Section`.
- Provide a `ThemeProvider` if SSR hydration requires it (Tailwind v4 with CSS variables should not need one).
- Storybook is **out of scope** for MVP; rely on the landing page as a visual smoke test.

### 4.3 Database (PostgreSQL + Prisma)

- The Next.js app uses a Postgres connection.
- `prisma/` (root) contains:
  - `schema.prisma` (initial — all tables from FRD §6 created in this phase, even if unused yet; this avoids migration churn later)
  - `migrations/0000_init/`
  - `seed.ts` (admin account, default platform config)
- `lib/db/` exposes a singleton Prisma client (re-export of `@prisma/client`
  pointed at the schema in `prisma/schema.prisma`).

Initial Prisma models (deferred-detail, full set later in Phase 2 / 3):

```
User, SellerProfile, BuyerProfile, Project, ProjectRegistration,
Listing, Order, Payment, Certificate, AuditDecision, Dispute,
RegistryEntry, CvcBatch, AuditLog, Payout, PlatformConfig
```

(See Phase 2 for the full schema of RegistryEntry/CvcBatch; Phase 0 creates the tables with minimal columns so subsequent phases can `prisma migrate` to add details.)

### 4.4 Background jobs (in-process)

- Postgres handles all reads.
- A small `jobs/runner.ts` module handles async work:
  - In-process worker pool with bounded concurrency (default 4 workers).
  - Job types: `email.send`, `certificate.generate`, `payout.run`, `audit.export.daily`, `listing.publication` (catalog refresh).
  - Each job is short-running (≤ 30s) or split into steps.
  - Retries with exponential backoff and a max-attempt cap. Failed jobs land in a `failed_job` table visible in the Admin console.
  - Triggered either by direct `enqueue()` from a route handler or by a per-instance `setInterval` (e.g., daily audit export at 02:00 UTC).
- Idempotency is enforced at the job level (a job's payload carries a key; a second enqueue with the same key is a no-op).

### 4.5 Object storage (AWS S3)

- `lib/storage` exposes a `StorageDriver` interface; concrete `S3Driver` targets AWS S3.
- Local dev uses **a local S3 mock** (`@aws-sdk/client-s3` pointed at a MinIO or `s3rver` instance via Docker Compose) with the same driver code path.
- Single bucket (`S3_BUCKET`) with logical path prefixes:
  - `kyc/` — KYC documents, bank statements — Phase 1+
  - `projects/` — PDDs, monitoring reports, verification statements — Phase 2+
  - `certificates/` — signed PDFs — Phase 7+
  - `audit-exports/` — long-term audit log exports — Phase 9
- All objects server-side-encrypted (SSE-S3 or SSE-KMS). Bucket policies deny unencrypted uploads.
- Access pattern: presigned PUT (upload) and presigned GET (download) with short TTLs; access logged to `audit_log` server-side.
- CORS configured to allow only the app's origin.

### 4.5b Transactional email (AWS SES)

- `lib/email` exposes `EmailDriver` interface with `SesDriver` as the sole production implementation.
- SES is the **only** outbound email channel; no third-party SMTP relays.
- Verified sender domain (`ccverse.<tld>`) with DKIM, SPF, and DMARC records. Dedicated `noreply@`, `accounts@`, `audit@` identities.
- Configuration set captures bounce/complaint/delivery events; webhook handler updates suppression list and audit log.
- Templates in `lib/email/templates/` (React Email, rendered to HTML + plain text). Brand voice per `DESIGN.md`.
- Local dev: SES sandbox with verified recipient addresses; in CI, SES is mocked at the `EmailDriver` boundary.
- Rate limit and bounce thresholds monitored; SES account suspension alarms surface in the structured logs and in the Admin console.

### 4.6 Auth scaffolding (no flows yet)

- `lib/session` exposes:
  - `getSession()` — reads httpOnly cookie via `iron-session`, returns session payload.
  - `requireRole(role[])` — lives in `lib/rbac/`, used in route handlers / server actions.
  - TOTP MFA helper via `otplib` — **scaffolded but disabled**; full flow in Phase 1.
- Password hashing helper: `argon2id` (parameters from OWASP cheat sheet).
- Account lockout helper: `trackFailedLogin(userId)` — implemented but not enforced yet.

### 4.7 RBAC middleware

```
public   → /, /listing/[id], /verify/[serial], /health
buyer    → /buyer, /api/buyer/*
seller   → /seller, /api/seller/*
auditor  → /auditor, /api/auditor/*
admin    → /admin, /api/admin/*
```

- `middleware.ts` reads session, blocks/redirects.
- All API handlers call `requireRole([...])`.

### 4.8 Observability (built-in only)

- `pino` logger with `requestId` in every log line; JSON to stdout.
- Log scraping is the user's problem (vendor TBD). The structured format is stable so any later scraper works.
- No external APM, no traces, no metrics service in MVP. `/health` is the only synthetic check.
- Failed-job table is the operational source of truth for background work.

### 4.9 CI/CD (GitHub Actions)

- `ci.yml`:
  - Install (npm ci), lint (eslint), typecheck (tsc), test (vitest), format check (prettier), build (next build).
  - Run Prisma generate.
  - Cache npm store.
- `preview.yml`:
  - On PR: deploy preview environment with a per-PR Postgres.
  - Smoke test `/health` and root page.
- `deploy.yml` (deferred to staging in Phase 9): production deploy gated on `main`.

All workflows live under `.github/workflows/` at the repo root (not under
`infra/`).

### 4.10 Proxy layer

The proxy sits in front of the server (per architecture diagram). Two configurations:

**Local dev (Caddy in Docker Compose):**

- Auto-TLS via Caddy's internal CA.
- Forwards `localhost:8443` → `web:3000`.
- Adds `X-Forwarded-Proto`, `X-Forwarded-For`, `X-Real-IP`.
- Basic per-IP rate limit on `/api/*` (e.g., 60 req/s).
- Logs to stdout (collected by docker-compose).

**Production (Nginx on a single VM or container):**

- TLS 1.2+ only; HSTS with `max-age=63072000; includeSubDomains; preload`.
- Basic per-IP rate limit on `/api/*`.
- Static asset cache for `/_next/static/*` (1 year, immutable).
- Deny path: `/.env`, `/.git`, anything not in the allowlist.
- Allowed inbound: `/`, `/api/*`, `/_next/*`, `/verify/*`, `/health`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`.
- All other paths return 404 at the edge (no server hit).

The proxy **must not** be reachable from the server side; all outbound calls (SES, S3, payment gateways) originate from the server, not the proxy.

### 4.11 Environment & secrets

- `.env.example` lists every required variable with comments.
- All secrets read via `process.env` with a typed loader (`zod`-validated) at boot. Missing/ malformed envs crash the process at startup.
- AWS credentials loaded via IAM role in production (no static keys on the server).
- `.env.example` must include:
  - `DATABASE_URL`
  - `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (dev only)
  - `SES_REGION`, `SES_SENDER_DOMAIN`, `SES_CONFIGURATION_SET`
  - `SESSION_SECRET`
  - `APP_ORIGIN`, `PROXY_ORIGIN`

---

## 5. Data model changes (delta in Phase 0)

Minimum columns for tables required by RBAC and audit log:

| Table            | Columns added in Phase 0                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `User`           | `id (uuid)`, `email (citext unique)`, `password_hash`, `role (enum)`, `status (enum)`, `mfa_enabled`, `created_at`, `last_login_at` |
| `AuditLog`       | `id`, `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `ip`, `timestamp`, `payload (jsonb)`                          |
| `PlatformConfig` | `key`, `value`, `updated_at` (singleton row seeded with defaults)                                                                   |
| `FailedJob`      | `id`, `job_type`, `payload jsonb`, `error`, `attempts`, `created_at`, `failed_at`                                                   |

Other tables created with placeholder columns; finalized in their owning phase.

---

## 6. API surface (new in Phase 0)

- `GET /health` → `{ ok, db, storage, ses, version }`
- `GET /version` → build SHA, build time
- `GET /` (public landing per design system)

No business APIs yet.

---

## 7. UI surfaces (new in Phase 0)

- `/` — landing page implementing `DESIGN.md` (hero, lime CTA, footer).
- Role-route shells: `/seller`, `/buyer`, `/auditor`, `/admin` — empty, gated.
- A reusable `components/ui/` library: `Button`, `Input`, `Tag`, `TopNav`, `Footer`, `Section`.

---

## 8. Cross-cutting concerns

- **Security baseline** (NFR 4.2):
  - Helmet-equivalent headers via `next.config.js` (`X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Content-Security-Policy`).
  - Cookies: `httpOnly`, `secure`, `sameSite=lax` baseline.
- **Accessibility** (NFR 4.5):
  - Focus rings (lime) verified on every primitive.
  - Body text in NB International Pro is never rendered below 18px; UI labels in JetBrains Mono.
- **Audit log** (NFR 4.6):
  - Helper `audit.write({ actor, action, target, payload })` used by `/health` (to record startup ping) and `/version`.
- **RBAC**: middleware + `requireRole` helper. Tested with dummy sessions.

---

## 9. Test plan

- **Unit:**
  - Token validation (color, spacing) snapshot.
  - `requireRole` returns 403 for wrong role.
  - Audit log writer inserts row with correct shape.
  - Job runner retries on failure up to max attempts and writes to `failed_job`.
- **Integration:**
  - `/health` returns 200 with all subsystems up in docker-compose.
  - Docker Compose boots Postgres + local S3 mock + Caddy.
- **E2E (Playwright):**
  - `/` renders, lime CTA visible, footer visible.
  - `/admin` redirects to login for unauthenticated user.
- **Accessibility:**
  - axe-core run on `/` in CI; zero serious/critical issues.
- **CI smoke:**
  - Preview deploy smoke test passes.

---

## 10. Acceptance criteria

- [ ] `npm run dev` boots the app and `/` renders per `DESIGN.md`.
- [ ] `/health` returns 200 with `db: up, storage: up, ses: up` in local.
- [ ] Lint, typecheck, tests, build all green in CI.
- [ ] Preview deploy from a PR is reachable and shows `/` correctly.
- [ ] One seed admin account exists; logging in as it lands on `/admin` shell.
- [ ] All five role-route shells exist and are gated.
- [ ] Audit log table populated by at least one startup event.
- [ ] `.env.example` is complete and validated by a zod schema.
- [ ] No console errors or 404s on `/`.
- [ ] Job runner executes, retries, and persists failures to `failed_job`.

---

## 11. Dependencies on other phases

- None. This is the first phase.

---

## 12. USER DEPENDENCY

These must be resolved before Phase 0 can be considered complete:

- **[USER DEPENDENCY] Cloud / hosting provider choice** — Vercel vs Render vs Railway vs AWS. Drives env var, region, and CI shape. Decision needed by Day 1 of Phase 0. (Architecture diagram shows AWS S3 + AWS SES, strongly implying AWS; confirm whether compute also runs on AWS or elsewhere.)
- **[USER DEPENDENCY] Proxy choice** — local Caddy confirmed for dev. For production: Nginx on a single VM/container (no load balancer / WAF for MVP). Confirm.
- **[USER DEPENDENCY] AWS account & region** — required for S3 and SES provisioning. Single region for MVP.
- **[USER DEPENDENCY] S3 bucket names & KMS key** — confirm the four buckets listed in §4.5 and the KMS key ARN (or confirm SSE-S3 is sufficient for MVP).
- **[USER DEPENDENCY] SES sender domain & DNS access** — `ccverse.<tld>` verified with DKIM/SPF/DMARC; required to send any production email.
- **[USER DEPENDENCY] SES production access** — SES starts in sandbox; production access (unrestricted recipients) must be requested from AWS.
- **[USER DEPENDENCY] Postgres host** — managed (Neon/Supabase/RDS) or self-hosted. Decision needed for connection-string format and CI preview DB.
- **[USER DEPENDENCY] Domain name(s)** — apex + subdomains for app, API, certificate verification URL.
- **[USER DEPENDENCY] TLS certificates** — provisioning approach (managed by host vs Let's Encrypt).
- **[USER DEPENDENCY] GitHub org & repo** — for CI/CD. Permission for secrets in Actions.
- **[USER DEPENDENCY] Brand assets** — confirmation that `DESIGN.md` is the final design system; if NB International Pro is licensed, font files must be supplied.
- **[USER DEPENDENCY] Repository creation** — **resolved (16 Jun 2026)**: single Next.js monolith at the repo root. No `pnpm` workspaces, no `apps/*` or `packages/*` sub-trees. `lib/*` replaces the previous `packages/*` layout.
- **[USER DEPENDENCY] Compliance/security review** — initial sign-off on header policy, CSP, password hashing parameters, audit log retention duration (default 7 years per NFR 4.6).
- **[USER DEPENDENCY] IAM roles & policies** — for the server, define the least-privilege IAM role granting S3 + SES access; AWS access keys must not be embedded.

---

## 13. Out of scope for Phase 0

- Real auth flows (login, register, MFA enrollment) → Phase 1.
- Any domain logic (projects, listings, payments, certificates) → later phases.
- Multi-region / DR → out of scope for MVP (carried over from §2 of plan.md).
- External WAF, CDN, advanced edge security → out of scope for MVP.
- Real KYC integration → Phase 1 (manual review).
- External observability stack → out of scope for MVP.

---

## 14. Estimated effort

- 1 week, 2–3 engineers.
