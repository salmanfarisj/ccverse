# CC Verse — Implementation Plan

**Source FRD:** v1.1 (Draft, 16 Jun 2026)
**Scope:** Minimal v1.0 MVP (Carbon Credit Marketplace, web)
**Companion design system:** `DESIGN.md` (INVERSA — dark canvas + electric-lime accent)

---

## 1. Goal

Build CC Verse incrementally, phase by phase, so that:
- Each phase ships a usable, testable increment of the product.
- A team of developers can work in parallel across non-overlapping modules.
- Every phase has clear prerequisites, deliverables, and acceptance criteria.
- All items requiring human/operator input are explicitly tagged **[USER DEPENDENCY]** so they can be tracked and resolved in advance.

---

## 2. Tech Stack (locked for MVP)

**Minimal stack — nothing else.** Just Next.js + Postgres + S3 + SES. Every other piece is a single library, a single Postgres feature, or out of scope.

Architecture (per stakeholder diagram):

```
                 Users
                   │
                   ▼
              ┌────────┐
              │ Proxy  │   TLS termination, basic rate limit
              └────┬───┘
                   ▼
              ┌────────┐
              │ Server │   Next.js (App Router) — frontend + API
              └────┬───┘
                   │
   ┌───────────────┼───────────────┐
   ▼               ▼               ▼
┌──────┐       ┌────────┐       ┌──────┐
│  DB  │       │AWS SES │       │  S3  │
│(Postgres     │ (email)│       │bucket│
│+ Prisma)     │        │       │      │
└──────┘       └────────┘       └──────┘
```

| Layer | Choice | Notes |
|---|---|---|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript + React 18 | Single deployable; route handlers for the API |
| Styling | Tailwind CSS v4 + design tokens from `DESIGN.md` | Tokens already defined; v4 `@theme` directive maps cleanly |
| Proxy | Caddy (local) / Nginx (prod) | TLS termination, basic rate limit |
| ORM | Prisma | Type-safe, migrations, fits PostgreSQL |
| Primary DB | PostgreSQL 15 | ACID, JSONB, full-text search via `tsvector` |
| Background jobs | Small `lib/jobs` module inside the Next.js process | Concurrency-limited; failed jobs land in a `failed_job` table |
| Object storage | AWS S3 | KYC docs, project docs, certificates, audit exports |
| Auth | Next.js + `iron-session` (cookie session) + `otplib` (TOTP) | Email + password; TOTP MFA for privileged roles |
| Payments — INR | Razorpay | UPI, NEFT, cards. Webhook via Next.js route. |
| Payments — USD | Stripe | Cards, ACH. Webhook via Next.js route. |
| PDF generation | `pdf-lib` + `node-signpdf` (libraries) | Pure JS, no headless browser |
| Email | AWS SES | Verified sender domain; transactional only |
| KYC | **Manual for MVP** — Admin reviews uploaded documents and approves | Migration path to a vendor noted in Phase 1. |
| Search | PostgreSQL `tsvector` + GIN | Built-in |
| Observability | Structured logs to stdout (`pino`) | A log scraper can be added later; not required for MVP |
| CI/CD | GitHub Actions | Lint, typecheck, test, build, deploy preview |
| Hosting | Single-region (Vercel / Render / Railway / AWS) | Multi-region DR is **out of scope** for MVP |

> All choices above carry **[USER DEPENDENCY]** tags in Phase 0 for vendor and account provisioning. AWS SES and AWS S3 are confirmed in the architecture; the rest of the infra picks are user decisions.

**Out of scope for MVP** (deferred to a post-MVP release):
- Multi-region / DR
- WAF / advanced edge security
- External observability stack
- SMS notifications (email only)
- External KYC provider (manual review only)
- Real-time features (websockets, etc.)
- Mobile native apps
- Crypto / tokenized settlement

---

## 3. Architecture (target end-state)

Confirmed by stakeholder diagram. See §2 for the layered view.

- **Proxy** sits in front of the server: TLS termination, basic per-IP rate limit.
- **Server** (Next.js) is the only application tier; it holds business logic, writes to the DB, calls S3 and SES, and exposes both the UI and the API.
- **Three direct dependencies**: PostgreSQL (state), AWS S3 (objects), AWS SES (transactional email).
- Background work (certificate generation, notifications, payouts) runs in-process:
  - Synchronous execution where latency allows (most notification sends).
  - A small in-process job module with bounded concurrency for the rest (PDF build, payout batch, daily reconciliation). Permanent failures land in a `failed_job` table; an Admin can retry.
- **External vendors** (payment gateways) are reached outbound from the server, never from the proxy.
- **RBAC** enforced at Next.js middleware plus row-level checks in the data layer.
- **Append-only audit log** in Postgres (WORM-style table) with periodic export to S3 for long-term retention.
- **Registry is the source of truth** — see Section 7.

---

## 4. Phase Split

The build is split into **10 phases**. Each phase is sized to roughly one sprint (1–2 weeks) and is independently demoable.

| # | Phase | Demoable artifact | Primary FR coverage | Depends on |
|---|---|---|---|---|
| 0 | Foundation & Infrastructure | Empty app shell with design system, CI, DB, deploy, SES wired | NFR 4.2 (scaffolding), DESIGN.md | — |
| 1 | User Management, Auth & KYC (manual) | Register, login, MFA, password reset, manual KYC gating | FR-U-001…008 | P0 |
| 2 | Project Registration & CVC Registry | Seller registers project → CCV-######; CVC batches issued & tracked | FR-S-009, BR-13/14/15, Section 5.1 | P1 |
| 3 | Seller Listings | Seller creates/edits listing, status flow, supporting docs | FR-S-001…008 | P1, P2 |
| 4 | Auditor Console | Review queue, approve/reject with policy references | FR-AU-001…009, FR-AD-003 | P1, P2, P3 |
| 5 | Buyer Marketplace (browse) | Public catalog, filters, search, listing detail, cart (no checkout) | FR-B-001…005 | P3, P4 |
| 6 | Payments & Checkout | Order creation, gateway auth/capture, refunds, currency lock | FR-B-006, FR-P-001…006 | P5 |
| 7 | Certificate Generation & Verification | Signed PDF, SHA-256, public verification URL, revocation | FR-C-001…006, FR-B-007 | P6 |
| 8 | Admin & Compliance | User mgmt, listing moderation, dispute flow, reports | FR-AD-001…007, FR-B-008 | P1, P6, P7 |
| 9 | Notifications, Payouts, NFR Hardening | SES for all events, T+2 payouts, perf, security, observability | FR-N-001…003, FR-S-008, NFR §4, FR-AD-006 | P0–P8 |

Each phase document is in `docs/phases/`:
- `phase-0-foundation.md`
- `phase-1-user-management-kyc.md`
- `phase-2-projects-registry.md`
- `phase-3-seller-listings.md`
- `phase-4-auditor-console.md`
- `phase-5-buyer-marketplace.md`
- `phase-6-payments-checkout.md`
- `phase-7-certificates.md`
- `phase-8-admin-compliance.md`
- `phase-9-notifications-payouts-nfr.md`

Each phase doc follows the same template:
1. Goal & demoable outcome
2. Functional requirements in scope (FR-IDs)
3. Non-functional requirements touched
4. Technical implementation (architecture, files, APIs, schema, UI)
5. Data model changes (delta only)
6. API surface (new endpoints)
7. UI surfaces (new screens/components)
8. Cross-cutting concerns (security, audit, RBAC)
9. Test plan
10. Acceptance criteria
11. Dependencies on other phases
12. **[USER DEPENDENCY]** — explicit list of things the team needs from the user before/during the phase
13. Out of scope for the phase
14. Estimated effort

---

## 5. How to use these docs

- **Engineering:** start at Phase 0, do not skip. Each phase must close with passing acceptance criteria before the next begins (or the next is limited to mockable interfaces).
- **Product / PM:** treat `[USER DEPENDENCY]` lists as the **single source of decisions owed by stakeholders**. Nothing in the dependent phase can ship "complete" until those items are resolved.
- **QA:** derive test plans from the "Acceptance criteria" and "Test plan" sections of each phase doc.
- **Compliance / Legal:** review Phase 2, 4, 7, and 8 first; those define the CC Verse certification and registry integrity controls.

---

## 6. Critical cross-cutting requirements (apply to all phases)

These are not optional and must be observable from Phase 0 onward:

- **Append-only audit log** (FR-U-007, NFR 4.6): every state-changing action logs `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `ip`, `timestamp`, `payload`. 7-year retention.
- **RBAC**: Next.js middleware + DB-level checks. Five roles: `buyer`, `seller`, `auditor`, `admin`, `public`.
- **MFA mandatory** for `auditor` and `admin` (FR-U-005).
- **Immutable decisions** (FR-AU-007): corrections are new records that reference the prior.
- **Atomic state transitions** (BR-06, BR-15): no double-spend, no oversell. Use DB transactions and row-level locks on registry entries and listing quantities.
- **TLS 1.2+** everywhere (NFR 4.2).
- **Argon2id or bcrypt (cost ≥ 12)** for passwords (NFR 4.2).
- **Encryption at rest** for PII/KYC docs (S3 SSE-KMS) — NFR 4.2.
- **PII minimization** on public surfaces (FR-C-004): certificate verification URL exposes no PII.
- **English-only** UI and certificates in v1.0 (Section 2.5).
- **WCAG 2.1 AA** from Phase 0 (NFR 4.5).

---

## 7. CC Verse Registry — design principle

The CC Verse registry is the **single source of truth** for credit existence, ownership, and retirement in v1.0. This is enforced by:
- A `registry_entry` row per CVC serial with state ∈ {`Available`, `Held`, `Retired`}.
- A `state_transition` append-only log per entry.
- DB-enforced unique constraint on `(cvc_serial)` to prevent duplicates.
- A `cvc_batch` allocation table linking batches to a Seller and project.
- **No external registry is read or written in v1.0** (Section 2.5, BR-01).

The registry is bootstrapped in **Phase 2** and is the only place where CVCs are created. Every later phase that touches credit movement must go through the registry service, never direct DB writes.

---

## 8. Open items (carried from FRD §Appendix E)

These block specific phases and are tracked in every relevant phase doc as `[USER DEPENDENCY]`:
- Platform fee % and tax treatment per market (India/US) — **Phase 6**.
- Dispute resolution SLA & escalation path — **Phase 8**.
- Minimum KYC tier for low-value Buyers — **Phase 1** (manual review handles this for MVP).
- Vendor selections (payment gateways, hosting, S3, SES) — **Phase 0 / 6 / 9**.

---

## 9. Delivery cadence (target)

Assuming 1–2 weeks per phase with 2–4 engineers:
- Phase 0 → 1 week
- Phase 1 → 2 weeks
- Phase 2 → 2 weeks
- Phase 3 → 1.5 weeks
- Phase 4 → 1.5 weeks
- Phase 5 → 1.5 weeks
- Phase 6 → 2 weeks (gated on payment-gateway sandbox)
- Phase 7 → 1.5 weeks
- Phase 8 → 2 weeks
- Phase 9 → 2 weeks (perf + observability)

**Total: ~16–18 weeks** to v1.0 MVP-ready, assuming all `[USER DEPENDENCY]` items land on time.
