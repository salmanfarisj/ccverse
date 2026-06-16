# Phase 9 — Notifications, Payouts, NFR Hardening

> **Goal:** Wire transactional notifications end-to-end, execute T+2 Seller payouts through bank rails, and harden the platform against the NFR targets (performance, security, scalability, availability, auditability, observability). Includes disaster recovery and load testing for the v1.0 launch.

---

## 1. Demoable outcome

- Every state-changing event in the system sends a transactional email (and SMS where configured) via AWS SES, with deep links and idempotent delivery.
- Sellers are paid out on a T+2 schedule via their verified bank account, with dispute-aware holds, automated reconciliation, and end-of-day bank statements matched to the platform's payout records.
- A synthetic load of 1,000 concurrent users renders the marketplace in ≤ 2s p95; checkout completes in ≤ 5s p95; 100k-listing search returns in ≤ 1s p95; 1,000 concurrent purchase attempts on the same listing produce zero oversells.
- 99.5% monthly availability is demonstrable in staging with chaos drills (DB failover, region failover to DR).
- Penetration test produces no High or Critical findings unresolved at GA.
- A runbook and on-call rotation exist; dashboards surface SLOs and alerts.

---

## 2. Functional requirements in scope

- FR-N-001 All transactional notifications (email + SMS where supported) for: registration, KYC status, listing submitted, listing approved/rejected, purchase confirmed, certificate issued, payout sent, dispute opened/closed, account banned.
- FR-N-002 Marketing opt-in/opt-out; transactional alerts mandatory.
- FR-N-003 Deep links; idempotent delivery.
- FR-S-008 Payouts to verified bank account on T+2, subject to dispute window.
- FR-AD-006 Audit log and transaction report exports (production-grade).
- NFR §4 (Performance, Security, Scalability, Availability, Usability, Auditability) — meeting the targets in Section 4 of the FRD.

---

## 3. Non-functional requirements touched

All of NFR §4. Specifically:
- 4.1 Performance.
- 4.2 Security (pen test, encryption at rest, RBAC, MFA).
- 4.3 Scalability (horizontal scale, multi-region DR).
- 4.4 Availability (99.5% monthly, RTO 4h, RPO 15m).
- 4.5 Usability (WCAG AA, responsive).
- 4.6 Auditability (7-year retention, exportable).

---

## 4. Technical implementation

### 4.1 Notification system

- `packages/notifications` exposes a `NotificationService` with these channels:
  - `email` (AWS SES — the architecture's email vendor).
  - `sms` (Twilio for international; MSG91 for India). Optional in v1.0; required for dispute and payout alerts.
  - `in_app` (an `in_app_notification` table for a future in-app inbox — schema is added now, UI is v1.1).
- Each channel has a `Driver` interface; concrete drivers implement send + status webhook.
- All notifications originate from the BullMQ workers (not from request handlers) so retries and idempotency are uniform.
- Idempotency: every notification carries a `dedupe_key` (e.g., `order.paid.{orderId}`). Re-sends on retry do not duplicate; SES suppression list is honored.
- Template registry: per-event React Email templates with subject, body, deep link. Templates live in `packages/notifications/templates/`.

Event coverage:

| Event | Email | SMS | Deep link |
|---|---|---|---|
| `user.registered` | ✓ | — | `/verify-email` |
| `user.email_verified` | ✓ | — | `/login` |
| `user.password_reset_requested` | ✓ | — | `/reset-password/{token}` |
| `user.password_reset_completed` | ✓ | — | `/account/security` |
| `user.mfa_enrolled` | ✓ | — | `/account/security` |
| `user.banned` | ✓ | — | — |
| `kyc.started` | ✓ | — | `/seller` (KYC widget) |
| `kyc.approved` | ✓ | — | `/seller` |
| `kyc.rejected` | ✓ | — | `/seller` |
| `project.submitted` | ✓ (Seller) | — | `/seller/projects/{id}` |
| `project.approved` | ✓ (Seller) | — | `/seller/projects/{id}` |
| `project.rejected` | ✓ (Seller) | — | `/seller/projects/{id}` |
| `listing.submitted` | ✓ (Seller) | — | `/seller/listings/{id}` |
| `listing.approved` | ✓ (Seller) | — | `/seller/listings/{id}` |
| `listing.rejected` | ✓ (Seller) | — | `/seller/listings/{id}` |
| `order.paid` | ✓ (Buyer) | ✓ | `/buyer/purchases/{id}` |
| `order.failed` | ✓ (Buyer) | — | `/cart` |
| `certificate.issued` | ✓ (Buyer) | — | `/buyer/purchases/{id}` |
| `payout.scheduled` | ✓ (Seller) | — | `/seller/payouts` |
| `payout.sent` | ✓ (Seller) | ✓ | `/seller/payouts` |
| `payout.failed` | ✓ (Seller) | ✓ | `/seller/payouts` |
| `dispute.opened` | ✓ (Buyer + Seller + Admin) | — | dispute detail |
| `dispute.resolved` | ✓ (Buyer + Seller) | — | dispute detail |
| `certificate.revoked` | ✓ (Buyer) | — | `/verify/{token}` |

### 4.2 Payout execution

Two channels:
- **INR:** Razorpay Route (or Razorpay Payouts / direct bank rail / partner IMPS) — proposal: Razorpay Payouts.
- **USD:** Stripe Connect (Custom accounts) or direct ACH via a partner (e.g., Modern Treasury, or a sponsor bank).

For v1.0, the payout system:

1. Nightly job (BullMQ cron, 02:00 UTC) selects all `Payout` rows with `status='pending'`, `scheduled_for <= today`, and no open dispute.
2. Aggregates by `seller_id`, computes `gross`, `fees`, `refunds`, `net` per currency.
3. Re-runs sanctions screening for the Seller.
4. Initiates a single bank transfer per (seller, currency, period).
5. Updates `Payout.status='paid'` on gateway success; `'failed'` on error.
6. Sends notification (`payout.sent` or `payout.failed`).
7. Writes `AuditLog` and an entry to the daily reconciliation.

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
- **Caching:** Redis cache for:
  - `mv_active_listings` (5-minute TTL; refreshed on commit anyway).
  - Project detail by `id` (10-minute TTL).
  - Methodology list (1-hour TTL).
  - User session lookup (sub-ms).
- **Static assets:** `/_next/static/*` cached for 1 year, immutable, served by the proxy.
- **DB connection pool:** 50 connections per app instance; PgBouncer in transaction-pooling mode in front of Postgres.
- **Reads:** all listing browse reads use the materialized view; only the listing detail page reads the live table on a hot path.
- **Writes:** `Order` creation and `RegistryEntry` transitions use `SERIALIZABLE` isolation; PgBouncer is in transaction mode only.
- **Pagination:** cursor-based to avoid `OFFSET` costs.
- **Compression:** the proxy serves Brotli / gzip.

**Load test (k6):**
- 1,000 concurrent users browsing the marketplace (read-heavy).
- 100 concurrent checkouts (write-heavy).
- 1,000 concurrent purchase attempts on a 100-unit listing (concurrency test).
- 100k-listing seed for search benchmark.
- Targets: p95 ≤ targets; zero oversells; error rate < 0.1%.

### 4.4 Security hardening

- **Penetration test** with an external vendor prior to GA; remediation of all High and Critical findings; a written report attached to the GA checklist.
- **WAF rules** (CloudFront / AWS WAF):
  - SQLi, XSS, LFI, RFI managed rule sets.
  - Rate limit at edge: 60 req/s per IP for `/api/marketplace/*`, 10 req/s per IP for `/api/auth/*`, 30 req/s per IP for everything else.
  - Geo-block (per sanctions list).
- **Secrets** in AWS Secrets Manager (no static creds).
- **KMS** for all envelope encryption; rotation policy (annual).
- **CSP** locked down: `default-src 'self'`, `script-src 'self' 'nonce-...'`, `frame-ancestors 'none'`, `object-src 'none'`.
- **Cookie hardening:** `__Host-` prefix, `httpOnly`, `secure`, `sameSite=strict` for the session cookie.
- **Subresource Integrity** for any third-party scripts (none planned; if added, SRI required).
- **Dependency scanning** in CI: `npm audit` (or `pnpm audit`) with a fail threshold of High.
- **Container scanning** (if applicable) on every build.

### 4.5 Scalability

- **Horizontal scaling:** web tier behind the proxy; stateless app instances; auto-scale on CPU > 60% or request queue depth.
- **Workers:** BullMQ workers on a separate ASG / Deployment, scaled on queue lag.
- **DB:** vertical scaling for v1.0 (RDS / Cloud SQL); read replicas for browse reads. Connection pooling via PgBouncer.
- **Multi-region DR (active-passive, NFR 4.3):**
  - Primary: `ap-south-1` (Mumbai) — closest to the primary market.
  - DR: `ap-southeast-1` (Singapore) — warm standby.
  - Postgres: cross-region read replica with a 15-minute RPO target (RDS cross-region replication).
  - S3: cross-region replication for all buckets.
  - Route 53 / DNS failover with health checks.
  - RTO 4h, RPO 15m (NFR 4.4).
- **Chaos drills** in staging: kill a web instance, kill the DB primary, fail over to DR.

### 4.6 Availability

- 99.5% monthly (NFR 4.4): ~3.6h of downtime allowed per month.
- **Health check:** `/health` checks DB, Redis, S3, SES, BullMQ. Used by the proxy / load balancer to take unhealthy instances out of rotation.
- **Graceful shutdown:** SIGTERM → finish in-flight requests (up to 30s) → drain BullMQ workers (re-deliver to other workers).
- **Scheduled maintenance:** 72-hour advance notice (per FRD 4.4); executed in low-traffic windows.

### 4.7 Auditability (production-grade)

- Append-only `AuditLog` with `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `ip`, `timestamp`, `payload`.
- **Daily export to S3:** a worker copies the prior day's `AuditLog` rows to `s3://ccverse-audit-exports/audit/{YYYY-MM-DD}.jsonl.gz`. Signed and timestamped.
- **7-year retention:** S3 Object Lock `Compliance` mode, 7 years; lifecycle transitions to Glacier Deep Archive after 1 year for cost.
- **Tamper-evidence:** daily export is hashed (SHA-256) and the hash is published in a daily-signed JSON (same mechanism as certificates) for third-party verifiers.
- **DB-side immutability:** revoke `UPDATE`, `DELETE` on `AuditLog` for the app role (same pattern as `AuditDecision`).

### 4.8 Observability

- **Logs:** structured JSON via `pino`; shipped to a centralized log store (Loki or CloudWatch Logs). Every log line has `request_id`, `trace_id`, `user_id` (if any), `actor_role`.
- **Metrics:** Prometheus format; scraped and stored in Prometheus (or vendor equivalent). Key metrics:
  - HTTP: request count, latency p50/p95/p99, error rate, by route and method.
  - DB: query latency, active connections, replication lag.
  - BullMQ: queue depth, job success/failure rate, retry count, age of oldest pending job.
  - SES: send rate, bounce rate, complaint rate.
  - Stripe/Razorpay: latency, error rate, webhook lag.
  - Domain: listings approved, orders paid, certificates issued, payouts sent, disputes open, sanctions blocks.
- **Traces:** OpenTelemetry; sampled at 10% for reads, 100% for writes; visualized in Tempo / Jaeger / vendor equivalent.
- **Alerts:** paging on SLO breaches (error rate, latency, payout failure rate, certificate generation lag, sanctions block spike). Runbook links in alert messages.
- **Dashboards:** one per SLO; one for ops overview; one for business KPIs (orders/day, GMV, payout volume).

### 4.9 Runbook & on-call

- Runbook covering: DB failover, gateway outage, SES bounce spike, sanctions block spike, certificate generation backlog, payout failure, dispute auto-resolve.
- On-call rotation (24/7 for v1.0 with at least 4 engineers), escalation policy, comms templates.
- Incident postmortem template; all Sev-1 and Sev-2 incidents have a written postmortem within 5 business days.

### 4.10 Localization & i18n (deferred, scaffolded)

- All UI strings in `apps/web/messages/en.json` (and ready for additional locales).
- v1.0 ships English only; v1.1 adds Hindi (India) and English-US (US) per `[USER DEPENDENCY]`.
- Certificate template localized in v1.1.

---

## 5. Data model changes

- `in_app_notification` (new; not exposed in v1.0 UI but available for v1.1).
- `notification_dedupe` (Redis) for idempotency.
- `PlatformConfig.payout_bank_rail_in`, `payout_bank_rail_us` (provider config).
- `AuditLog` access reduced to `INSERT` for the app role.

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

- **Security:** pen test, WAF, CSP, dependency scanning, KMS rotation, secret rotation.
- **Scalability:** auto-scaling, PgBouncer, read replicas, cross-region DR.
- **Availability:** health checks, graceful shutdown, scheduled maintenance, chaos drills.
- **Auditability:** daily signed exports to S3 with Object Lock 7 years; DB-level immutability.
- **Observability:** metrics, traces, logs, alerts, dashboards, runbooks.
- **Compliance:** all NFRs and the FRD Section 5.2/5.3 controls are demonstrable.

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
- **DR:**
  - DB primary kill → replica promoted in < 4h RTO; 15m RPO.
  - Region failover DNS propagates and app resumes serving.
- **Security:**
  - Pen test report shows no High / Critical unresolved.
  - WAF blocks a sample SQLi payload.
  - CSP blocks inline scripts without nonce.
- **Accessibility:** final WCAG 2.1 AA scan across all pages.
- **Reliability:** 72-hour soak test in staging with no SLO breaches.

---

## 9. Acceptance criteria

- [ ] All FR-N-001 events trigger an email (and SMS where configured) within 60 seconds.
- [ ] Notifications are idempotent: retries do not duplicate.
- [ ] T+2 payouts execute to the verified bank account; dispute-held payouts are skipped.
- [ ] Manual payout requires Admin MFA step-up.
- [ ] Sanctions screening re-runs at payout time.
- [ ] Daily audit-log export to S3 is signed and timestamped; Object Lock applied for 7 years.
- [ ] All NFR targets (Section 4) are met under the documented load profile.
- [ ] Cross-region DR is exercised; RTO ≤ 4h, RPO ≤ 15m.
- [ ] 99.5% monthly availability is achievable in the staging soak test.
- [ ] Pen test: zero unresolved High or Critical findings at GA.
- [ ] On-call rotation is staffed; runbooks are written; dashboards and alerts are live.
- [ ] WCAG 2.1 AA verified across the entire app.
- [ ] All Admin actions and payouts are recorded in `AuditLog`.

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
- **[USER DEPENDENCY] SMS provider** — Twilio vs MSG91 for India; provide credentials.
- **[USER DEPENDENCY] SMS trigger set** — confirm which events get SMS in v1.0 (proposal: only `order.paid`, `payout.sent`, `payout.failed`, `dispute.opened`).
- **[USER DEPENDENCY] Notification language** — English only in v1.0; confirm. (Hindi for India deferred to v1.1.)
- **[USER DEPENDENCY] Email "from" identity per event** — confirm `noreply@`, `accounts@`, `kyc@`, `audit@`, `payouts@` etc.
- **[USER DEPENDENCY] Maintenance-window policy** — confirm 72-hour advance notice and the low-traffic window (proposal: Sundays 02:00–06:00 IST).
- **[USER DEPENDENCY] DR region** — confirm primary (Mumbai) and DR (Singapore) regions.
- **[USER DEPENDENCY] Chaos drill cadence** — proposal: monthly in staging; quarterly game-day in production with low-risk exercises.
- **[USER DEPENDENCY] Pen test vendor** — confirm vendor; budget approval.
- **[USER DEPENDENCY] On-call staffing** — confirm 24/7 rotation or business-hours-only with after-hours escalation to a Compliance lead.
- **[USER DEPENDENCY] SLO targets** — confirm the 99.5% availability, 2s p95 browse, 1s p95 search, 5s p95 checkout targets are acceptable.
- **[USER DEPENDENCY] Data residency** — India DPDP and any US state laws; confirm any per-market data-residency rules.
- **[USER DEPENDENCY] Log retention beyond 7 years** — confirm 7 years is the minimum; confirm any longer requirement (financial regulators sometimes require 10 years for transaction data).
- **[USER DEPENDENCY] Third-party verifier feed** — confirm whether the daily-signed audit-log export is published to a public, well-known URL for third-party verifiers.
- **[USER DEPENDENCY] Disaster-recovery game-day acceptance** — confirm an executive sponsor for the first production game-day drill.
- **[USER DEPENDENCY] Marketing opt-in copy** — sign-off on the opt-in/out copy and the global preference center.
