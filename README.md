# CC Verse

Verified carbon credits, end to end. Next.js 14 frontend with a Convex backend.

See `DESIGN.md` for the design system and `docs/README.md` for architecture and
environment setup.

## Requirements

- Node.js ≥ 20
- npm ≥ 10

## Local setup

```bash
cp .env.example .env
# Edit .env: SESSION_SECRET=$(openssl rand -base64 32)

npm install
npm run dev          # Convex + Next.js on http://localhost:3000
```

Seed a local admin (once per deployment):

```bash
npx convex run seed:seedAdminAction '{"email":"admin@ccverse.local","password":"your-32-char-password-here-min"}'
```

## Scripts

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Start Convex + Next.js dev servers         |
| `npm run build`        | Production build                           |
| `npm start`            | Run the production build                   |
| `npm run lint`         | ESLint                                     |
| `npm run typecheck`    | `tsc --noEmit`                             |
| `npm run format`       | Prettier write                             |
| `npm run format:check` | Prettier check (runs in CI)                |
| `npm run convex:dev`   | Convex dev only                            |
| `npm run convex:deploy`| Deploy Convex functions to production      |

## Layout

```
ccverse/
├── app/                  # Next.js App Router
├── components/           # UI primitives (DESIGN.md)
├── convex/               # Convex backend (schema, functions)
├── lib/                  # Next.js helpers (env, session, rbac, convex client)
├── jobs/                 # Minimal logger stub (SES webhook)
├── styles/               # Design tokens
├── public/               # Static assets
├── docs/                 # Architecture notes
├── .github/workflows/    # CI
├── DESIGN.md
├── .env.example
└── package.json
```

## Environment

Next.js validates `APP_ORIGIN`, `SESSION_SECRET`, and Convex client vars at boot
via `lib/env.ts`. See `.env.example` for the full list. Email and object-storage
vars are optional Convex deployment settings — dev mocks apply when unset.
