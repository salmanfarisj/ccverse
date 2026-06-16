# CC Verse

Verified carbon credits, end to end. Single Next.js 14 monolith.

> See `DESIGN.md` for the design system and `docs/plan.md` for the phased
> implementation plan. Phase 0 lives in `docs/phases/phase-0-foundation.md`
> and the per-task breakdown in `tasks/phase-0-tasks.md`.

## Requirements

- Node.js ≥ 20
- npm ≥ 10

## Local setup

```bash
cp .env.example .env
# Edit .env: set SESSION_SECRET to a 32+ char random string.
#   openssl rand -base64 32

npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command                 | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Start the Next.js dev server               |
| `npm run build`         | Production build                           |
| `npm start`             | Run the production build                   |
| `npm run lint`          | ESLint (next/core-web-vitals + typescript) |
| `npm run typecheck`     | `tsc --noEmit`                             |
| `npm test`              | Unit tests (Vitest)                        |
| `npm run test:watch`    | Vitest watch mode                          |
| `npm run test:coverage` | Vitest with V8 coverage                    |
| `npm run test:e2e`      | Playwright end-to-end tests                |
| `npm run format`        | Prettier write                             |
| `npm run format:check`  | Prettier check (runs in CI)                |

## Layout

```
ccverse/
├── app/                  # Next.js App Router (routes, layout, globals)
├── components/           # UI primitives (added in T0-2)
├── lib/                  # Domain services (env, session, storage, …)
├── jobs/                 # In-process job runner (T0-4)
├── styles/               # Design tokens (added in T0-2)
├── public/               # Static assets
├── tests/
│   ├── unit/             # Vitest
│   └── e2e/              # Playwright
├── infra/                # Docker Compose, proxy configs (T0-3+, T0-11+)
├── docs/                 # Phase docs and plan
├── tasks/                # Per-phase task breakdowns
├── .github/workflows/    # CI
├── DESIGN.md
├── .env.example
└── package.json
```

## Environment

All env vars are validated at boot by `lib/env.ts` (zod). See
`.env.example` for the full list with comments. The process crashes if any
required variable is missing or malformed — this is by design (see
`docs/phases/phase-0-foundation.md` §4.11).
