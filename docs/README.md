# CC Verse — documentation

## Architecture

CC Verse is a **Next.js 14 frontend + API shell** backed by **Convex** for all
application state, auth, storage, email, and background work.

```
Users → Next.js (App Router, API routes, iron-session cookies)
              ↓ Convex HTTP client
        Convex (database, mutations, queries, actions, scheduler)
              ↓ optional (dev-mocked when unset)
        AWS S3 / SES — only when credentials are configured on the deployment
```

| Layer | Location | Role |
| ----- | -------- | ---- |
| UI | `app/`, `components/` | Pages, layouts, client components |
| API bridge | `app/api/**` | Thin route handlers; call Convex via `lib/convex/client.ts` |
| Session / RBAC | `lib/session/`, `lib/rbac/`, `middleware.ts` | Cookie sessions; role-gated routes |
| Backend | `convex/` | Schema, business logic, audit log, KYC, registry, listings |
| Design system | `DESIGN.md`, `styles/` | INVERSA tokens and components |

## Local development

```bash
cp .env.example .env
# Set SESSION_SECRET=$(openssl rand -base64 32)

npm install
npm run dev    # starts Convex + Next.js
```

`convex dev` writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. Seed an admin:

```bash
npx convex run seed:seedAdminAction '{"email":"admin@ccverse.local","password":"your-32-char-password-here-min"}'
```

## Environment variables

**Next.js** (`.env`, validated by `lib/env.ts`):

- `APP_ORIGIN`, `PROXY_ORIGIN`, `NODE_ENV`
- `SESSION_SECRET` (32+ chars)
- `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`, `CONVEX_DEPLOYMENT_URL`
- `NEXT_PUBLIC_CONVEX_URL` (usually in `.env.local`)

**Convex deployment** (dashboard or `npx convex env set`) — all optional in dev:

- Email: `SES_*` — when access keys are empty, sends are mocked
- Storage: `S3_*` — when credentials/endpoint are empty, uploads are no-ops

## Cross-cutting rules

- **Registry is source of truth** — CVC serials and state transitions live in Convex tables; mutate via `convex/registry/` and related mutations only.
- **Append-only audit log** — state-changing actions call `convex/audit/`.
- **RBAC** — `buyer`, `seller`, `auditor`, `admin`; MFA required for auditor and admin.
- **PII minimization** on public verification surfaces.
- **English only** in v1.0 UI and certificates.
- **WCAG 2.1 AA** — semantic HTML, focus rings, contrast per `DESIGN.md`.

## Out of scope (MVP)

Multi-region DR, WAF, external APM, SMS, external KYC vendor, websockets,
native mobile apps, crypto settlement.
