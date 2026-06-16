# Phase 9 — Notifications, Payouts, NFR Hardening

> **Goal:** Wire transactional notifications end-to-end via AWS SES, execute T+2 Seller payouts through bank rails, and harden the platform against the NFR targets (performance, security, auditability). For MVP: no SMS, no third-party observability, no multi-region DR — single-region deployment with a runbook and structured logs.

> **MVP simplification:** All background work runs in the in-process job runner (bounded concurrency, single Node.js process). All notifications are email (no SMS). Observability is structured logs to stdout.

---

## 1. Demoable outcome

- Every state-changing event in the system sends a transactional email via AWS SES, with deep links and idempotent delivery.
- Sellers are paid out on a T+2 schedule via their verified bank account, with dispute-aware holds and end-of-day bank statements matched to the platform's payout records.
- A synthetic load of 1,000 concurrent users renders the marketplace in ≤ 2s p95; checkout completes in ≤ 5s p95; 100k-listing search returns in ≤ 1s p95; 1,000 concurrent purchase attempts on the same listing produce zero oversells.
- Penetration test produces no High or Critical findings unresolved at GA.
- A runbook exists; on-call rotation is in place; failed jobs surface in the Admin console.

---

## 2. Functional requirements in scope

- FR-N-001 All transactional email notifications for: registration, KYC status, listing submitted, listing approved/rejected, purchase confirmed, certificate issued, payout sent, dispute opened/closed, account banned. (**Email only; SMS is out of scope for MVP.**)
- FR-N-002 Marketing opt-in/opt-out; transactional alerts mandatory.
- FR-N-003 Deep links; idempotent delivery.
- FR-S-008 Payouts to verified bank account on T+2, subject to dispute window.
- FR-AD-006 Audit log and transaction report exports (production-grade).
- NFR §4 (Performance, Security, Auditability) — meeting the targets in Section 4 of the FRD. **Multi-region DR, WAF, and external observability are out of scope for MVP.**

---

## 3. Non-functional requirements touched

- 4.1 Performance.
- 4.2 Security (pen test, encryption at rest, RBAC, MFA).
- 4.5 Usability (WCAG AA, responsive).
- 4.6 Auditability (7-year retention, exportable).
- 4.3 Scalability and 4.4 Availability are met in single-region form for MVP; multi-region and 99.5% SLO with regional failover are deferred.

---

## 4. Technical implementation

### 4.1 Notification system (email only)

- `packages/notifications` exposes a `NotificationService` with one channel:
  - `email` (AWS SES — the architecture's email vendor).
- Each channel has a `Driver` interface; `SesEmailDriver` is the production implementation.
- All notifications are enqueued through the in-process job runner (Phase 0) so retries are uniform.
- Idempotency: every notification carries a `dedupe_key` (e.g., `order.paid.{orderId}`). Re-sends on retry do not duplicate; SES suppression list is honored.
- Template registry: per-event React Email templates with subject, body, deep link. Templates live in `packages/notifications/templates/`.

Event coverage:

| Event | Email | Deep link |
|---|---|---|
| `user.registered` | ✓ | `/verify-email` |
| `user.email_verified` | ✓ | `/login` |
| `user.password_reset_requested` | ✓ | `/reset-password/{token}` |
| `user.password_reset_completed` | ✓ | `/account/security` |
| `user.mfa_enrolled` | ✓ | `/account/security` |
| `user.banned` | ✓ | — |
| `kyc.started` | ✓ | `/seller` (KYC widget) |
| `kyc.approved` | ✓ | `/seller` |
| `kyc.rejected` | ✓ | `/seller` |
| `project.submitted` | ✓ (Seller) | `/seller/projects/{id}` |
| `project.approved` | ✓ (Seller) | `/seller/projects/{id}` |
| `project.rejected` | ✓ (Seller) | `/seller/projects/{id}` |
| `listing.submitted` | ✓ (Seller) | `/seller/listings/{id}` |
| `listing.approved` | ✓ (Seller) | `/seller/listings/{id}` |
| `listing.rejected` | ✓ (Seller) | `/seller/listings/{id}` |
| `order.paid` | ✓ (Buyer) | `/buyer/purchases/{id}` |
| `order.failed` | ✓ (Buyer) | `/cart` |
| `certificate.issued` | ✓ (Buyer) | `/buyer/purchases/{id}` |
| `payout.scheduled` | ✓ (Seller) | `/seller/payouts` |
| `payout.sent` | ✓ (Seller) | `/seller/payouts` |
| `payout.failed` | ✓ (Seller) | `/seller/payouts` |
| `dispute.opened` | ✓ (Buyer + Seller + Admin) | dispute detail |
| `dispute.resolved` | ✓ (Buyer + Seller) | dispute detail |
| `certificate.revoked` | ✓ (Buyer) | `/verify/{token}` |

### 4.2 Payout execution

Two channels:
- **INR:** Razorpay Payouts.
- **USD:** Stripe Connect (Custom accounts) or direct ACH via a partner (e.g., Modern Treasury, or a sponsor bank).

For MVP, the payout system:

1. A per-instance `setInterval` triggers the payout job at 02:00 UTC daily (and a startup sweep covers any missed runs after a restart).
2. Selects all `Payout` rows with `status='pending'`, `scheduled_for <= today`, and no open dispute.
3. Aggregates by `seller_id`, computes `gross`, `fees`, `refunds`, `net` per currency.
4. Re-runs sanctions screening for the Seller.
5. Initiates a single bank transfer per (seller, currency, period).
6. Updates `Payout.status='paid'` on gateway success; `'failed'` on error.
7. Sends notification (`payout.sent` or `payout.failed`).
8. Writes `AuditLog` and an entry to the daily reconciliation.

Disputes hold payouts:
- A `Payout` with `status='on_hold'` is skipped by the nightly job.
- When the dispute resolves, the payout is recomputed and re-scheduled.

**Manual / exception payouts:**
- Admin can trigger an ad-hoc payout via `POST /api/admin/sellers/:id/payouts` with `{ amount, reason }`. MFA step-up required.

**Payout history UI:**
- `/seller/payouts` — table of payouts by period, status, gross, fees, net; download a CSV statement.

### 4.3 Performance

Targets (NFR 4.1):
- Marketplace browse ≤ 2s p95.
- Search ≤ 1s p95 for ≤ 100k active listings.
- Checkout ≤ 5s p95.

Implementation:
- **Reads:** Postgres handles all reads. `mv_active_listings` (materialized view) backs the marketplace browse; only the listing detail page reads the live `Listing` table on a hot path. GIN index on `search_tsv` keeps search under 1s.
- **Static assets:** `/_next/static/*` cached for 1 year, immutable, served by the proxy.
- **Writes:** `Order` creation and `RegistryEntry` transitions use `SERIALIZABLE` isolation. `SELECT ... FOR UPDATE` on listing / batch / registry rows prevents oversell.
- **Pagination:** cursor-based to avoid `OFFSET` costs.
- **Compression:** the proxy serves Brotli / gzip.

**Load test (autocannon or k6):**
- 1,000 concurrent users browsing the marketplace (read-heavy).
- 100 concurrent checkouts (write-heavy).
- 1,000 concurrent purchase attempts on a 100-unit listing (concurrency test).
- 100k-listing seed for search benchmark.
- Targets: p95 ≤ targets; zero oversells; error rate < 0.1%.

### 4.4 Security hardening

- **Penetration test** with an external vendor prior to GA; remediation of all High and Critical findings; a written report attached to the GA checklist.
- **Proxy security:** basic per-IP rate limit, TLS 1.2+, HSTS, deny path.
- **Secrets** in AWS Secrets Manager (no static creds in env files).
- **KMS** for all envelope encryption; rotation policy (annual).
- **CSP** locked down: `default-src 'self'`, `script-src 'self' 'nonce-...'`, `frame-ancestors 'none'`, `object-src 'none'`.
- **Cookie hardening:** `__Host-` prefix, `httpOnly`, `secure`, `sameSite=strict` for the session cookie.
- **Subresource Integrity** for any third-party scripts (none planned; if added, SRI required).
- **Dependency scanning** in CI: `pnpm audit` with a fail threshold of High.

### 4.5 Scalability

- **Horizontal scaling:** web tier behind the proxy; stateless app instances. The in-process job runner must be safe to run on multiple instances — job idempotency keys (carried in the payload) and the `failed_job` table dedupe at the DB level.
- **DB:** a single Postgres for MVP. Read replicas are out of scope.
- **Multi-region DR is out of scope for MVP.**

### 4.6 Availability

- 99.5% monthly (NFR 4.4) interpreted in single-region form: a single VM/container group behind a single proxy. Target measured monthly, excluding scheduled maintenance windows announced 72 hours in advance.
- **Health check:** `/health` checks DB, S3, SES, job runner. Used by the proxy / load balancer to take unhealthy instances out of rotation.
- **Graceful shutdown:** SIGTERM → finish in-flight requests (up to 30s) → drain job runner (re-deliver pending jobs to other instances via DB-level dedup).
- **Scheduled maintenance:** 72-hour advance notice (per FRD 4.4); executed in low-traffic windows.

### 4.7 Auditability (production-grade)

- Append-only `AuditLog` with `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `ip`, `timestamp`, `payload`.
- **Daily export to S3:** an in-process job copies the prior day's `AuditLog` rows to `s3://ccverse-audit-exports/audit/{YYYY-MM-DD}.jsonl.gz`.
- **7-year retention:** S3 Object Lock `Compliance` mode, 7 years; lifecycle transitions to Glacier Deep Archive after 1 year for cost.
- **Tamper-evidence:** daily export is hashed (SHA-256) and the hash is published in a daily-signed JSON (same mechanism as certificates) for third-party verifiers.
- **DB-side immutability:** revoke `UPDATE`, `DELETE` on `AuditLog` for the app role (same pattern as `AuditDecision`).

### 4.8 Observability (built-in only)

- **Logs:** structured JSON via `pino`; shipped to stdout. Every log line has `request_id`, `user_id` (if any), `actor_role`.
- **Failed-job table** (`failed_job`) is the operational source of truth for background work. Admin can list and retry from the Admin console (Phase 8).
- No external APM, no traces, no metrics service in MVP. A log scraper can be added later if needed.
- A simple `/api/health` deep-check is the only synthetic monitor.

### 4.9 Runbook & on-call

- Runbook covering: DB failover (within single region), payment-gateway outage, SES bounce spike, sanctions block spike, certificate generation backlog, payout failure, dispute auto-resolve.
- On-call rotation (proposal: business hours primary, after-hours escalation to a Compliance lead; confirm in `[USER DEPENDENCY]`).
- Incident postmortem template; all Sev-1 and Sev-2 incidents have a written postmortem within 5 business days.

---

## 5. Data model changes

- `notification_dispatch` table for idempotency (one row per (event, recipient); duplicate inserts are no-ops).
- `PlatformConfig.payout_bank_rail_in`, `payout_bank_rail_us` (provider config).
- `AuditLog` access reduced to `INSERT` for the app role.
- `failed_job` already exists from Phase 0; this phase wires admin retry.

---

## 6. API surface (new in Phase 9)

```
POST /api/admin/exports/audit          -- already in Phase 8; productionized
POST /api/admin/sellers/:id/payouts    -- manual payout trigger
GET  /api/seller/payouts
GET  /api/seller/payouts/:id

GET  /api/health
GET  /api/version
```

---

## 7. Cross-cutting concerns

- **Security:** pen test, CSP, dependency scanning, KMS rotation, secret rotation.
- **Auditability:** daily signed exports to S3 with Object Lock 7 years; DB-level immutability.
- **Observability:** structured logs and `failed_job` table only.
- **Compliance:** all NFRs and the FRD Section 5.2/5.3 controls are demonstrable in single-region form.

---

## 8. Test plan

- **Unit:**
  - Notification dedupe: re-send does not duplicate.
  - Payout aggregator: dispute hold excludes the right rows.
- **Integration:**
  - Every event in §4.1 triggers a notification (mocked SES assert).
  - T+2 payout: orders captured today are scheduled; tomorrow's job pays them; disputes held until resolution.
  - Manual payout requires MFA step-up.
  - Sanctions re-screening at payout catches a newly-listed Seller.
- **Load:**
  - 1,000 concurrent users browse at ≤ 2s p95.
  - 100 concurrent checkouts at ≤ 5s p95.
  - 1,000 concurrent purchase attempts on a 100-unit listing: exactly 100 succeed, zero oversell.
  - 100k-listing search at ≤ 1s p95.
- **Security:**
  - Pen test report shows no High / Critical unresolved.
  - CSP blocks inline scripts without nonce.
- **Accessibility:** final WCAG 2.1 AA scan across all pages.
- **Reliability:** 72-hour soak test in staging with no SLO breaches.

---

## 9. Acceptance criteria

- [ ] All FR-N-001 events trigger an email within 60 seconds.
- [ ] Notifications are idempotent: retries do not duplicate.
- [ ] T+2 payouts execute to the verified bank account; dispute-held payouts are skipped.
- [ ] Manual payout requires Admin MFA step-up.
- [ ] Sanctions screening re-runs at payout time.
- [ ] Daily audit-log export to S3 is signed and timestamped; Object Lock applied for 7 years.
- [ ] All NFR targets (Section 4) are met under the documented load profile, in single-region form.
- [ ] Pen test: zero unresolved High or Critical findings at GA.
- [ ] On-call rotation is staffed; runbooks are written.
- [ ] WCAG 2.1 AA verified across the entire app.
- [ ] All Admin actions and payouts are recorded in `AuditLog`.
- [ ] Failed jobs surface in the Admin console and can be retried.

---

## 10. Dependencies on other phases

- Every prior phase.

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Payout bank rail** — confirm Razorpay Payouts (INR) and Stripe Connect or partner (USD); provide production credentials and KYC of the platform entity (required by the rail providers).
- **[USER DEPENDENCY] T+2 business-day vs calendar-day definition** — confirm. Proposal: T+2 *business* days, excluding Indian and US banking holidays.
- **[USER DEPENDENCY] Payout currency per Seller** — confirm Seller picks INR or USD at profile setup and cannot change without Admin re-verification.
- **[USER DEPENDENCY] Payout minimum amount** — confirm whether tiny payouts are batched, held, or sent. Proposal: hold until cumulative net ≥ ₹500 / $10; release monthly.
- **[USER DEPENDENCY] Payout statement CSV/PDF** — sign-off on Seller-facing statement template.
- **[USER DEPENDENCY] SMS provider** — **N/A for MVP**; SMS is out of scope.
- **[USER DEPENDENCY] SMS trigger set** — **N/A for MVP.**
- **[USER DEPENDENCY] Notification language** — English only in v1.0; confirm. (Hindi for India deferred to v1.1.)
- **[USER DEPENDENCY] Email "from" identity per event** — confirm `noreply@`, `accounts@`, `kyc@`, `audit@`, `payouts@` etc.
- **[USER DEPENDENCY] Maintenance-window policy** — confirm 72-hour advance notice and the low-traffic window (proposal: Sundays 02:00–06:00 IST).
- **[USER DEPENDENCY] Pen test vendor** — confirm vendor; budget approval.
- **[USER DEPENDENCY] On-call staffing** — confirm business-hours-only with after-hours escalation to a Compliance lead.
- **[USER DEPENDENCY] SLO targets** — confirm the 99.5% availability, 2s p95 browse, 1s p95 search, 5s p95 checkout targets are acceptable in single-region form.
- **[USER DEPENDENCY] Data residency** — India DPDP and any US state laws; confirm any per-market data-residency rules.
- **[USER DEPENDENCY] Log retention beyond 7 years** — confirm 7 years is the minimum; confirm any longer requirement (financial regulators sometimes require 10 years for transaction data).
- **[USER DEPENDENCY] Third-party verifier feed** — confirm whether the daily-signed audit-log export is published to a public, well-known URL for third-party verifiers.
- **[USER DEPENDENCY] Marketing opt-in copy** — sign-off on the opt-in/out copy and the global preference center.
- **[USER DEPENDENCY] Post-MVP roadmap sign-off** — confirm that the following are explicitly deferred: multi-region DR, external observability stack, WAF, SMS notifications, external KYC vendor, mobile native apps. Anything not listed here is in scope for MVP.
