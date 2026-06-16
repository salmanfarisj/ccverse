# Phase 0 — Foundation & Infrastructure

> **Goal:** Stand up the project skeleton — Next.js app, design system, proxy, DB, cache, storage, AWS SES wiring, CI/CD, observability scaffolding — so that every later phase can be implemented against a stable, deployable, observable foundation.

> **Architecture (per stakeholder diagram):** Users → **Proxy** → **Server** (Next.js) → **PostgreSQL** / **AWS S3** / **AWS SES**. Redis runs in-server for sessions and queue. No external service is reached from the proxy.

---

## 1. Demoable outcome

- `pnpm dev` (or `npm run dev`) starts a local app at `http://localhost:3000` rendering the design-system landing page (full-bleed hero, lime CTA, footer) per `DESIGN.md`.
- Local **proxy** (Caddy or Nginx in Docker Compose) sits in front of the dev server, terminates TLS (self-signed locally), forwards to the app, and serves `/health`.
- `/health` returns `{ ok: true, db: "up", redis: "up", storage: "up", ses: "up" }` with status 200, and 503 if any dependency is down.
- CI pipeline runs on every push: lint, typecheck, unit tests, build, and a smoke health check against a deployed preview environment.
- Local Postgres + Redis + MinIO are runnable with one command (Docker Compose).
- AWS SES is wired in `packages/email`; sending a test transactional email from a local script against a verified address succeeds.
- An append-only `audit_log` table exists and is used by the `/health` and `/version` endpoints.
- Secrets management pattern is in place (`.env.example` + vault-ready env-var loader).
- One skeleton route per role exists: `/`, `/seller`, `/buyer`, `/auditor`, `/admin`, each gated to its role (RBAC middleware works; routes are empty).

---

## 2. Functional requirements in scope

None directly. This phase lays the technical foundation for all FRs.

Cross-cutting constraints honored (NFR 4.2, 4.5, 4.6):
- TLS 1.2+ enforced at the load balancer / hosting layer.
- `audit_log` table created (NFR 4.6).
- WCAG 2.1 AA scaffolding: semantic HTML, focus rings, color contrast verified against design tokens.

---

## 3. Non-functional requirements touched

- 4.2 Security (baseline headers, TLS, hashing, RBAC middleware scaffold).
- 4.3 Scalability (stateless web tier, queue workers separate).
- 4.4 Availability (health checks, deploy automation).
- 4.5 Usability (design system, responsive breakpoints, accessibility).
- 4.6 Auditability (audit log table, request id propagation, structured logging).

---

## 4. Technical implementation

### 4.1 Repo layout (monorepo, single deployable)

```
ccverse/
├── apps/
│   └── web/                       # Next.js 14 app
│       ├── app/
│       │   ├── (public)/          # Marketing, listing browse (Phase 5)
│       │   ├── (auth)/            # Login, register, MFA, reset
│       │   ├── (seller)/          # Seller dashboard
│       │   ├── (buyer)/           # Buyer area
│       │   ├── (auditor)/         # Auditor console
│       │   ├── (admin)/           # Admin console
│       │   ├── api/               # Route handlers (REST/tRPC)
│       │   └── health/route.ts
│       ├── components/            # UI primitives (per DESIGN.md)
│       ├── lib/                   # Domain services (registry, payments, kyc…)
│       ├── styles/                # Tailwind v4 + design tokens
│       └── public/
├── packages/
│   ├── db/                        # Prisma schema, migrations, client
│   ├── audit/                     # Append-only audit logger
│   ├── rbac/                      # Role checks
│   ├── storage/                   # AWS S3 client wrapper
│   ├── email/                     # AWS SES client wrapper
│   ├── queue/                     # BullMQ workers (in-server)
│   └── ui/                        # Shared React components
├── infra/
│   ├── docker-compose.yml         # Postgres, Redis, MinIO, Caddy (proxy)
│   ├── proxy/
│   │   ├── Caddyfile              # local proxy config
│   │   └── nginx.conf             # production proxy config (template)
│   ├── github-actions/            # Workflows
│   └── terraform/                 # (optional) for later phases
├── docs/                          # this folder
├── DESIGN.md
├── .env.example
└── package.json                   # pnpm workspaces
```

### 4.2 Design system integration

- Copy the `:root` tokens from `DESIGN.md` (lines 200–268) into `apps/web/styles/tokens.css`.
- Configure Tailwind v4 with `@theme` tokens from `DESIGN.md` (lines 273–315) in `apps/web/styles/globals.css`.
- Build the components listed in `DESIGN.md`:
  - `Hero`, `LimeButton`, `GhostButton`, `DataTag`, `TopNav`, `FullBleedImage`, `Footer`, `Input`, `Section`.
- Provide a `ThemeProvider` if SSR hydration requires it (Tailwind v4 with CSS variables should not need one).
- Storybook (or Ladle) for visual review is optional but recommended.

### 4.3 Database (PostgreSQL + Prisma)

- `apps/web` uses a Postgres connection.
- `packages/db` contains:
  - `schema.prisma` (initial — all tables from FRD §6 created in this phase, even if unused yet; this avoids migration churn later)
  - `migrations/0000_init/`
  - `seed.ts` (admin account, default platform config)

Initial Prisma models (deferred-detail, full set later in Phase 2 / 3):

```
User, SellerProfile, BuyerProfile, Project, ProjectRegistration,
Listing, Order, Payment, Certificate, AuditDecision, Dispute,
RegistryEntry, CvcBatch, AuditLog, Payout, PlatformConfig
```

(See Phase 2 for the full schema of RegistryEntry/CvcBatch; Phase 0 creates the tables with minimal columns so subsequent phases can `prisma migrate` to add details.)

### 4.4 Cache & queue

- Redis 7 in Docker Compose.
- BullMQ worker entrypoint in `apps/web/worker.ts` (separate process) — empty in Phase 0, registered in Phase 9.

### 4.5 Object storage (AWS S3)

- `packages/storage` exposes a single `StorageDriver` interface; concrete `S3Driver` targets AWS S3.
- Local dev uses **MinIO** via Docker Compose (S3-compatible); same driver code path with a different endpoint.
- Buckets:
  - `ccverse-kyc` (KYC documents, bank statements) — Phase 1+
  - `ccverse-projects` (PDDs, monitoring reports, verification statements) — Phase 2+
  - `ccverse-certificates` (signed PDFs) — Phase 7+
  - `ccverse-audit-exports` (long-term audit log exports) — Phase 9
- All objects server-side-encrypted (SSE-S3 or SSE-KMS). KMS key managed centrally; bucket policies deny unencrypted uploads.
- Access pattern: presigned PUT (upload) and presigned GET (download) with short TTLs; access logged to `audit_log` server-side.
- CORS configured to allow only the app's origin.

### 4.5b Transactional email (AWS SES)

- `packages/email` exposes `EmailDriver` interface with `SesDriver` as the sole production implementation.
- SES is the **only** outbound email channel; no third-party SMTP relays.
- Verified sender domain (`ccverse.<tld>`) with DKIM, SPF, and DMARC records. Dedicated `noreply@`, `accounts@`, `audit@` identities.
- Configuration set captures bounce/complaint/delivery events; webhook handler updates suppression list and audit log.
- Templates in `packages/email/templates/` (React Email, rendered to HTML + plain text). Brand voice per `DESIGN.md`.
- Local dev: SES sandbox with verified recipient addresses; in CI, SES is mocked at the `EmailDriver` boundary.
- Rate limit and bounce thresholds monitored; SES account suspension alarms wired to PagerDuty/Opsgenie.

### 4.6 Auth scaffolding (no flows yet)

- `packages/auth` exposes:
  - `getSession()` — reads httpOnly cookie, validates JWT.
  - `requireRole(role[])` — used in route handlers / server actions.
  - TOTP MFA — **scaffolded but disabled**; full flow in Phase 1.
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

### 4.8 Observability

- `pino` logger with `requestId` in every log line.
- OpenTelemetry SDK: OTLP exporter → collector (later phases wire traces; Phase 0 ships the SDK and a `OTEL_EXPORTER_OTLP_ENDPOINT` env var).
- Health endpoint checks DB, Redis, storage. Returns 503 if any dependency is down.

### 4.9 CI/CD (GitHub Actions)

- `ci.yml`:
  - Install (pnpm), lint (eslint), typecheck (tsc), test (vitest), build (next build).
  - Run Prisma generate.
  - Cache pnpm store.
- `preview.yml`:
  - On PR: deploy preview environment with a per-PR Postgres (Neon branch) + Redis.
  - Smoke test `/health` and root page.
- `deploy.yml` (deferred to staging in Phase 9): production deploy gated on `main`.

### 4.10 Proxy layer

The proxy sits in front of the server (per architecture diagram). Two configurations:

**Local dev (Caddy in Docker Compose):**
- Auto-TLS via Caddy's internal CA.
- Forwards `localhost:8443` → `web:3000`.
- Adds `X-Forwarded-Proto`, `X-Forwarded-For`, `X-Real-IP`.
- Logs to stdout (collected by docker-compose).

**Production (Nginx or AWS ALB + CloudFront):**
- TLS 1.2+ only; HSTS with `max-age=63072000; includeSubDomains; preload`.
- Web Application Firewall (CloudFront WAF or AWS WAF) with managed rule sets: SQLi, XSS, bad bots, known-bad IPs.
- Edge rate limit on `/api/auth/*` (token bucket, 10 req/s per IP).
- Static asset cache for `/_next/static/*` (1 year, immutable).
- Deny path: `/.env`, `/.git`, `/wp-admin`, anything not in the allowlist.
- Allowed inbound: `/`, `/api/*`, `/_next/*`, `/verify/*`, `/health`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`.
- All other paths return 404 at the edge (no server hit).

The proxy **must not** be reachable from the server side; all outbound calls (SES, S3, KYC, payments, SMS) originate from the server, not the proxy.

### 4.11 Environment & secrets

- `.env.example` lists every required variable with comments.
- All secrets read via `process.env` with a typed loader (`zod`-validated) at boot. Missing/ malformed envs crash the process at startup.
- AWS credentials loaded via IAM role (no static keys on the server).
- `.env.example` must include:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `S3_BUCKET_KYC`, `S3_BUCKET_PROJECTS`, `S3_BUCKET_CERTIFICATES`, `S3_BUCKET_AUDIT_EXPORTS`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (dev only)
  - `SES_REGION`, `SES_SENDER_DOMAIN`, `SES_CONFIGURATION_SET`
  - `SESSION_SECRET`, `JWT_SIGNING_KEY`
  - `KMS_KEY_ID` (envelope encryption)
  - `PROXY_ORIGIN`, `APP_ORIGIN`

---

## 5. Data model changes (delta in Phase 0)

Minimum columns for tables required by RBAC and audit log:

| Table | Columns added in Phase 0 |
|---|---|
| `User` | `id (uuid)`, `email (citext unique)`, `password_hash`, `role (enum)`, `status (enum)`, `mfa_enabled`, `created_at`, `last_login_at` |
| `AuditLog` | `id`, `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `ip`, `timestamp`, `payload (jsonb)` |
| `PlatformConfig` | `key`, `value`, `updated_at` (singleton row seeded with defaults) |

Other tables created with placeholder columns; finalized in their owning phase.

---

## 6. API surface (new in Phase 0)

- `GET /health` → `{ ok, db, redis, storage, version }`
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
- **Integration:**
  - `/health` returns 200 with all subsystems up in docker-compose.
  - Docker Compose boots Postgres, Redis, MinIO.
- **E2E (Playwright):**
  - `/` renders, lime CTA visible, footer visible.
  - `/admin` redirects to login for unauthenticated user.
- **Accessibility:**
  - axe-core run on `/` in CI; zero serious/critical issues.
- **CI smoke:**
  - Preview deploy smoke test passes.

---

## 10. Acceptance criteria

- [ ] `pnpm dev` boots the app and `/` renders per `DESIGN.md`.
- [ ] `/health` returns 200 with `db: up, redis: up, storage: up` in local.
- [ ] Lint, typecheck, tests, build all green in CI.
- [ ] Preview deploy from a PR is reachable and shows `/` correctly.
- [ ] One seed admin account exists; logging in as it lands on `/admin` shell.
- [ ] All five role-route shells exist and are gated.
- [ ] Audit log table populated by at least one startup event.
- [ ] `.env.example` is complete and validated by a zod schema.
- [ ] No console errors or 404s on `/`.

---

## 11. Dependencies on other phases

- None. This is the first phase.

---

## 12. USER DEPENDENCY

These must be resolved before Phase 0 can be considered complete:

- **[USER DEPENDENCY] Cloud / hosting provider choice** — Vercel vs Render vs Railway vs AWS. Drives env var, region, and CI shape. Decision needed by Day 1 of Phase 0. (Architecture diagram shows AWS S3 + AWS SES, strongly implying AWS; confirm whether compute also runs on AWS or elsewhere.)
- **[USER DEPENDENCY] Proxy choice** — local Caddy confirmed for dev. For production: Nginx on EC2/ECS vs AWS ALB + CloudFront vs Cloudflare. Drives TLS cert, WAF, and rate-limit setup.
- **[USER DEPENDENCY] AWS account & region** — required for S3 and SES provisioning. Decision on region(s) for DR posture.
- **[USER DEPENDENCY] S3 bucket names & KMS key** — confirm the four buckets listed in §4.5 and the KMS key ARN.
- **[USER DEPENDENCY] SES sender domain & DNS access** — `ccverse.<tld>` verified with DKIM/SPF/DMARC; required to send any production email.
- **[USER DEPENDENCY] SES production access** — SES starts in sandbox; production access (unrestricted recipients) must be requested from AWS.
- **[USER DEPENDENCY] Postgres host** — managed (Neon/Supabase/RDS) or self-hosted. Decision needed for connection-string format and CI preview DB.
- **[USER DEPENDENCY] Redis host** — managed (Upstash/Redis Cloud/ElastiCache) or self-hosted. Same constraints.
- **[USER DEPENDENCY] Domain name(s)** — apex + subdomains for app, API, certificate verification URL.
- **[USER DEPENDENCY] TLS certificates** — provisioning approach (ACM, Let's Encrypt, host-managed).
- **[USER DEPENDENCY] GitHub org & repo** — for CI/CD. Permission for secrets in Actions.
- **[USER DEPENDENCY] Brand assets** — confirmation that `DESIGN.md` is the final design system; if NB International Pro is licensed, font files must be supplied.
- **[USER DEPENDENCY] Repository creation** — confirm monorepo (pnpm workspaces) vs polyrepo decision.
- **[USER DEPENDENCY] Compliance/security review** — initial sign-off on header policy, CSP, password hashing parameters, audit log retention duration (default 7 years per NFR 4.6).
- **[USER DEPENDENCY] IAM roles & policies** — for the server, define the least-privilege IAM role granting S3 + SES access; AWS access keys must not be embedded.

---

## 13. Out of scope for Phase 0

- Real auth flows (login, register, MFA enrollment) → Phase 1.
- Any domain logic (projects, listings, payments, certificates) → later phases.
- Production-grade DR / multi-region → Phase 9.
- Real KYC integration → Phase 1.

---

## 14. Estimated effort

- 1 week, 2–3 engineers.
