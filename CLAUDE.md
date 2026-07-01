# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

CC Verse — a verified carbon-credit marketplace. Buyers browse, pay for, and receive certificates for credits in the CC Verse registry; sellers register projects, list credits, and receive payouts. Design system: **INVERSA** (dark canvas, electric-lime accent). Source FRD v1.1.

**Next.js 14** (App Router) is the UI and thin API layer. **Convex** is the backend: database, auth helpers, storage actions, email actions, audit log, and scheduling. There is no Postgres, Prisma, or local Docker infra.

## Stack

- **Next.js 14.2.18** + **React 18.3.1** + **TypeScript 5.6.3** (`strict`, `noUncheckedIndexedAccess`, …)
- **Convex** — schema and all business logic in `convex/`
- **iron-session** — cookie sessions in Next.js API routes and middleware
- **otplib** — TOTP MFA (Convex Node actions)
- **Tailwind v4** — tokens from `DESIGN.md`
- **Vitest** / **Playwright** — not wired in `package.json` currently; add back when tests are restored

RBAC roles: `public`, `buyer`, `seller`, `auditor`, `admin`. MFA mandatory for `auditor` and `admin`.

Email and S3 are **optional Convex deployment env vars**. When credentials are unset, Convex actions mock sends/uploads in dev.

## Common commands

```bash
cp .env.example .env
# SESSION_SECRET=$(openssl rand -base64 32)

npm install
npm run dev              # convex dev + next dev
npm run build
npm start

npm run lint
npm run typecheck
npm run format
npm run format:check

npx convex run seed:seedAdminAction '{"email":"admin@ccverse.local","password":"..."}'
npx convex env set KEY value   # optional SES/S3 on deployment
```

## Directory layout

```
ccverse/
├── app/                 # Routes, layouts, API bridge to Convex
├── components/          # UI primitives
├── convex/              # Backend: schema, queries, mutations, actions
│   ├── auth/            # Login, MFA, email verification
│   ├── admin/           # KYC review
│   ├── audit/           # Append-only audit log
│   ├── email/           # SES actions (mocked when no credentials)
│   ├── storage/         # S3 actions (no-op mock when no credentials)
│   └── ...
├── lib/
│   ├── env.ts           # Next.js env only (app, session, convex client)
│   ├── convex/client.ts # Server-side Convex HTTP client
│   ├── session/         # iron-session
│   └── rbac/            # requireRole, middleware session read
├── jobs/logger.ts       # Minimal logger for SES webhook route
├── docs/README.md       # Architecture and env notes
├── DESIGN.md
└── package.json
```

Path alias: `@/*` → repo root.

## Architectural invariants

- **Convex is the source of truth** for all application data. API routes call Convex; do not reintroduce Prisma or direct SQL.
- **Registry integrity** — CVC serials and states (`Available`, `Held`, `Retired`) live in Convex; use registry mutations, not ad-hoc patches.
- **Append-only audit log** — every state-changing action logs actor, action, target, ip, timestamp, payload.
- **Atomic state transitions** — use Convex transactions / single mutations for credit movement and listing quantity changes.
- **Security** — TLS 1.2+, HSTS and CSP in `next.config.mjs`, `httpOnly` + `sameSite=strict` session cookie. No `__Host-` prefix (breaks HTTP dev).
- **PII minimization** on public verification surfaces.
- **English only** in v1.0 UI and certificates.
- **WCAG 2.1 AA** from day one.

## Env loader (`lib/env.ts`)

Validates **Next.js-only** vars: `APP_ORIGIN`, `PROXY_ORIGIN`, `NODE_ENV`, `SESSION_SECRET`, `CONVEX_*`, `GIT_SHA`, `BUILT_AT`.

Does **not** require S3 or SES — those are read inside Convex Node actions from the deployment environment and default to dev mocks.

`middleware.ts` is Edge: read only `process.env.APP_ORIGIN` / `PROXY_ORIGIN` there; do not import `lib/env`.

## Auth gotchas (iron-session)

- **Cookie name** must match in `lib/session/index.ts`, `lib/rbac/index.ts`, and `middleware.ts`.
- **Do not parse the cookie as JSON** — use `unsealData()` from `iron-session` in Edge middleware.
- **`middleware` must be `async`** when awaiting session checks.
- **`await router.push()`** in client navigations so redirect failures surface.

## Tailwind + `<Link>` gotcha

UA `a:-webkit-any-link` beats single utility classes. Prefix color/underline utilities with `!` on Link-rendered components (`!text-obsidian-loam`, `!no-underline`).

## Convex patterns

- Queries/mutations in regular `.ts` files; Node.js APIs (SES, S3, argon2) in `"use node"` action files.
- Schedule **internal** functions only, never public `api.*` from `ctx.scheduler`.
- Use indexes, not `.filter()` on large tables.
- Do not use `Date.now()` inside queries.

## Verification after changes

```bash
npm run typecheck && npm run lint && npm run build
```

For auth/UI flows, exercise login → protected route in the browser when Playwright is restored.

## Out of scope (MVP)

Multi-region DR, WAF, external APM, SMS, external KYC vendor, websockets, native mobile, crypto settlement.
