# Phase 8 — Admin & Compliance

> **Goal:** Admins can manage user accounts (suspend / ban / remove), moderate the marketplace (edit / remove listings with reasons), configure platform parameters, run dispute resolution, and export audit logs and transaction reports for compliance and reconciliation.

---

## 1. Demoable outcome

- An Admin can search and view any user (Seller, Buyer, Auditor) and take actions: suspend, ban, remove.
- An Admin can edit or remove any listing (public or pending) with a mandatory reason recorded in the audit log.
- An Admin can view the global marketplace across all states and intervene on pricing anomalies or fraudulent content.
- An Admin can configure platform parameters: supported currencies, platform fee percentage, dispute window, listing quantity min/max, KYC threshold, tax rates, etc.
- An Admin can resolve disputes, issuing full or partial refunds, which revoke the certificate (Phase 7).
- An Admin can export audit logs and transaction reports (CSV/PDF) for a date range, with totals reconciliation.
- All Admin actions are recorded with actor, target, timestamp, IP, and reason.
- Admin role can be granted/revoked only by an existing Admin (FR-AD-003 already wired in Phase 4 for Auditor; full role-management UI lands here).

---

## 2. Functional requirements in scope

- FR-AD-001 List, search, view, suspend, ban, remove any user account.
- FR-AD-002 Edit or remove any listing, public or pending, with mandatory reason.
- FR-AD-003 Assign/revoke Auditor role (Admin only).
- FR-AD-004 View global marketplace (all states); intervene on anomalies or fraud.
- FR-AD-005 Configure platform parameters: supported currencies, platform fee %, dispute window, listing quantity min/max.
- FR-AD-006 Export audit logs and transaction reports (CSV/PDF).
- FR-AD-007 All Admin actions recorded with actor, target, timestamp, reason.
- FR-B-008 Buyer dispute flow (7-day window; freezes Seller payout).
- BR-10, BR-12 (Admins may remove/edit any listing; only Admins may ban/suspend/remove).

---

## 3. Non-functional requirements touched

- 4.2 Security: privileged operations require fresh MFA step-up (re-auth within last 5 min).
- 4.6 Auditability: every Admin action logged with full context.
- 4.5 Usability: Admin actions reachable in ≤ 3 clicks from a dashboard.

---

## 4. Technical implementation

### 4.1 Data model

Add to `PlatformConfig`:

```
PlatformConfig {
  key text pk
  value jsonb
  updated_by uuid fk User(id)
  updated_at timestamptz
}
```

Keys (initial set; extensible):

- `supported_currencies` (array of 'INR','USD')
- `platform_fee_bps` (int)
- `tax_rate_in` (numeric)
- `tax_rate_us` (numeric)
- `dispute_window_days` (int, default 7)
- `min_kyc_threshold` (numeric)
- `min_listing_quantity` (int)
- `max_listing_quantity` (int)
- `review_sla_hours` (int)
- `sanctions_blocklist` (jsonb)
- `certificate_job_concurrency` (int, default 4)

`Dispute` is finalized (already in schema from Phase 0/2):

```
Dispute {
  id            uuid pk
  order_id      uuid fk Order(id)
  raised_by     uuid fk User(id)
  reason        text
  status        enum('open','under_review','resolved_buyer','resolved_seller','withdrawn')
  opened_at     timestamptz default now()
  resolved_at   timestamptz
  resolved_by   uuid fk User(id)
  resolution_notes text
  refund_id     uuid fk Refund(id) nullable
}

DisputeMessage {                -- threaded conversation
  id          uuid pk
  dispute_id  uuid fk Dispute(id)
  sender_id   uuid fk User(id)
  body        text
  attachments jsonb              -- list of S3 keys (evidence)
  created_at  timestamptz
}
```

`AdminAction` (audit log on steroids; if we want a dedicated view):

```
AdminAction {
  id          uuid pk
  actor_id    uuid fk User(id)
  action      text             -- 'user.suspend','user.ban','listing.remove','platform_config.update', ...
  target_type text
  target_id   uuid
  reason      text
  payload     jsonb
  ip          inet
  created_at  timestamptz
}
```

This complements `AuditLog`; the audit_log writer is the single chokepoint, but `AdminAction` is a denormalized view for fast Admin UI.

### 4.2 User lifecycle

- `GET /api/admin/users` — list, filter by role, status, country, KYC status, search by email/name.
- `GET /api/admin/users/:id` — detail (profile, KYC, listings, purchases, payouts, audit).
- `POST /api/admin/users/:id/suspend` — body `{ reason, until? }`. Effect:
  - `User.status='suspended'`.
  - All active sessions invalidated (session table delete).
  - Active listings set to `removed_by_admin` (or `suspended`?). **Decision needed** (see `[USER DEPENDENCY]`).
  - Audit log row.
  - Email user (template: `account-suspended.tsx`).
- `POST /api/admin/users/:id/ban` — same as suspend but permanent (`User.status='banned'`, all sessions invalidated, listings removed).
- `POST /api/admin/users/:id/unsuspend` — reverses suspension.
- `POST /api/admin/users/:id/remove` — soft delete (`User.status='banned'` + PII redacted). True deletion deferred to v1.1.

### 4.3 Listing moderation

- `GET /api/admin/listings` — list across all states.
- `POST /api/admin/listings/:id/edit` — body `{ fields, reason }`. Edits any field, including price and quantity. Listing retains `approved` status unless the edit would invalidate the approval (e.g., changing the methodology).
- `POST /api/admin/listings/:id/remove` — body `{ reason }`. Effect:
  - `Listing.status='removed_by_admin'`.
  - Held CVC entries → `Available` (via `registry.releaseFromListing`).
  - In-flight orders are allowed to complete; new orders rejected.
  - Buyer-facing detail page returns 410.
  - Audit log + email Seller.
- `POST /api/admin/listings/:id/feature` — optional curated-featured flag (proposal: defer to v1.1).

### 4.4 Platform configuration

- `GET /api/admin/config` — returns all `PlatformConfig` rows.
- `PATCH /api/admin/config/:key` — body `{ value }`. Each update writes a `PlatformConfig` row (with `updated_by`, `updated_at`); a `ConfigChange` history is available via `GET /api/admin/config/:key/history`.
- Sensitive keys (e.g., `platform_fee_bps`) require an MFA step-up; the response header is set to `Cache-Control: no-store`.
- `AdminAction` row for every change.

### 4.5 Dispute flow

- Buyer opens a dispute from `My Purchases` (link visible if `Order.captured_at + 7 days >= now()`).
- `POST /api/buyer/orders/:id/disputes` with `{ reason, evidence[] }`.
- Effect:
  - `Dispute` row in `open` status.
  - Related `Payout` rows set to `on_hold` (BR-09).
  - Admin notified.
  - SES to Seller notifying of the dispute.
- Admin views disputes at `/admin/disputes`:
  - `GET /api/admin/disputes?status=open&page=N`.
  - `GET /api/admin/disputes/:id` with full timeline.
  - `POST /api/admin/disputes/:id/messages` to add internal/Buyer/Seller messages.
- Resolution:
  - `POST /api/admin/disputes/:id/resolve` with `{ outcome: 'refund_full' | 'refund_partial' | 'reject', amount?, notes }`.
  - `refund_full` / `refund_partial` → create `Refund`, mark order refunded, mark `Payout` updated, certificate revoked.
  - `reject` → dispute closed without refund, payout unfrozen.
  - Email both parties.

### 4.6 Audit log export

- `POST /api/admin/exports/audit` with `{ from, to, format: 'csv' | 'pdf' }`. Async job.
- Worker pulls `AuditLog` rows in the range, writes CSV to `ccverse-audit-exports/audit/{from}-{to}.csv` and a PDF summary. Sends email with a presigned download link (7-day expiry).
- For very large ranges, the worker streams in chunks and aggregates.
- `POST /api/admin/exports/transactions` for transaction reports (orders, payments, refunds, payouts).
- `POST /api/admin/exports/disputes` for dispute reports.

### 4.7 Anomaly detection (lightweight in v1.0)

- Out-of-the-box rule: a Seller listing at unit_price > 5× the trailing 30-day median for that methodology triggers a flag in the Admin queue.
- Out-of-the-box rule: a Buyer with >3 disputes in 90 days is flagged.
- Out-of-the-box rule: a KYC-approved Seller with rapid listing creation (>10 in 24h) is flagged.
- These are surfaced in `/admin/anomalies`; a full ML-driven fraud model is out of scope for v1.0.

### 4.8 UI surfaces

- `/admin` — dashboard with cards: open disputes, sanctions `review` queue, anomaly flags, latest reconciliation report, recent Admin actions.
- `/admin/users` — search + list.
- `/admin/users/[id]` — detail with action panel (Suspend / Ban / Remove).
- `/admin/listings` — global marketplace across states.
- `/admin/listings/[id]` — detail with edit and remove.
- `/admin/disputes` — list, status tabs.
- `/admin/disputes/[id]` — detail with message thread, resolution panel.
- `/admin/config` — key/value editor with diff history.
- `/admin/exports` — list of past exports; "New export" form.
- `/admin/audit` — read-only audit log viewer with filters.
- `/admin/anomalies` — flagged items.
- `/admin/failed-jobs` — list of permanently failed background jobs.
- All Admin actions require MFA step-up (re-auth ≤ 5 min) for sensitive operations (config changes, user bans, dispute refunds).

### 4.9 MFA step-up

- Privileged actions (config update, ban, dispute refund, listing remove) require a fresh TOTP challenge.
- Implementation: middleware checks `session.mfa_verified_at >= now() - 5 minutes`; if not, returns 401 with `MFA-StepUp-Required: true` and the client opens a TOTP challenge modal.
- Audit-logged: `mfa.step_up.succeeded`, `mfa.step_up.failed`.

---

## 5. Data model changes

- `PlatformConfig` (new with versioned history).
- `Dispute`, `DisputeMessage` (finalized).
- `AdminAction` (new).
- `User.status` extended: add `suspended` and `banned` semantics (already in schema).

---

## 6. API surface (new in Phase 8)

```
GET    /api/admin/users
GET    /api/admin/users/:id
POST   /api/admin/users/:id/suspend
POST   /api/admin/users/:id/unsuspend
POST   /api/admin/users/:id/ban
POST   /api/admin/users/:id/remove
GET    /api/admin/listings
PATCH  /api/admin/listings/:id
POST   /api/admin/listings/:id/remove

GET    /api/admin/config
GET    /api/admin/config/:key/history
PATCH  /api/admin/config/:key

GET    /api/admin/disputes
GET    /api/admin/disputes/:id
POST   /api/admin/disputes/:id/messages
POST   /api/admin/disputes/:id/resolve

POST   /api/buyer/orders/:id/disputes
GET    /api/buyer/orders/:id/disputes
POST   /api/buyer/disputes/:id/messages
POST   /api/buyer/disputes/:id/withdraw

POST   /api/admin/exports/audit
POST   /api/admin/exports/transactions
POST   /api/admin/exports/disputes
GET    /api/admin/exports
GET    /api/admin/exports/:id/download

GET    /api/admin/anomalies
POST   /api/admin/anomalies/:id/dismiss

GET    /api/admin/failed-jobs
POST   /api/admin/failed-jobs/:id/retry
```

---

## 7. Cross-cutting concerns

- **Security:** every privileged endpoint requires MFA step-up. Every state change is audit-logged with `ip`, `actor_id`, `reason`, `payload`.
- **RBAC:** strict; Admin-only on all `/api/admin/*`.
- **Auditability:** `AdminAction` and `AuditLog`; the audit log writer is a chokepoint that captures every state change including failed/blocked actions.
- **Idempotency:** all `POST /api/admin/*` honor `Idempotency-Key`.

---

## 8. Test plan

- **Unit:**
  - Suspend invalidates all sessions for that user.
  - Ban prevents login.
  - Config update is versioned and the history is queryable.
  - Dispute resolution triggers refund and certificate revocation.
  - MFA step-up: missing step-up → 401; fresh step-up → 200.
- **Integration:**
  - Suspended Seller cannot list or log in.
  - Banned Buyer's existing orders are not affected (only future activity blocked).
  - Listing removal by Admin releases CVC entries back to `Available`.
  - Dispute open → Payout moves to `on_hold`; resolve → Payout unfrozen (or refund issued).
  - Audit log export CSV contains all rows in the range with correct columns.
  - Anomaly rule fires on a synthetic 5x-priced listing.
  - Failed job retry re-enqueues a job and the second attempt succeeds.
- **E2E:** Buyer raises dispute → Admin resolves with full refund → certificate revoked → verification page shows `Revoked` within 5 min.

---

## 9. Acceptance criteria

- [ ] Admin can search, view, suspend, ban, and remove any user; all actions audit-logged.
- [ ] Admin can edit or remove any listing with a mandatory reason; removals release CVC entries.
- [ ] Admin can update platform configuration; changes are versioned and MFA step-up enforced.
- [ ] Buyer can open a dispute within 7 days; related payout is frozen.
- [ ] Admin can resolve a dispute (refund full / partial / reject); refunds revoke certificates.
- [ ] Admin can export audit logs and transaction reports (CSV/PDF) for any date range.
- [ ] All Admin actions appear in `AuditLog` with `actor`, `target`, `ip`, `timestamp`, `reason`.
- [ ] MFA step-up blocks any privileged action taken more than 5 minutes after the last MFA verification.
- [ ] Anomaly queue surfaces flagged listings, users, and disputes.
- [ ] Failed-jobs console lists permanently failed background jobs and supports retry.
- [ ] WCAG 2.1 AA on every Admin screen.

---

## 10. Dependencies on other phases

- Phase 0 (proxy, RBAC, S3, SES, audit, in-process job runner).
- Phase 1 (auth, MFA, KYC, sessions).
- Phase 2 (registry, project).
- Phase 3 (listing).
- Phase 4 (Auditor approval; listing states).
- Phase 5 (Buyer "My Purchases" and dispute link).
- Phase 6 (orders, payments, refunds, payouts).
- Phase 7 (certificates, revocation on refund).

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Suspended vs banned distinction** — confirm suspension is time-bounded (default 30 days) and ban is permanent. Confirm whether suspended users can browse.
- **[USER DEPENDENCY] Effect of suspension on listings** — proposal: suspended Seller's active listings move to `removed_by_admin` (or a new `suspended` state). Banned listings are always removed. Confirm.
- **[USER DEPENDENCY] Account removal semantics** — soft-ban with PII redaction vs hard delete. FRD §2.5 doesn't address; v1.0 proposal: soft-ban; deletion deferred to v1.1.
- **[USER DEPENDENCY] Dispute resolution SLA & escalation path** — FRD Appendix E explicitly lists this as an open question. Confirm: e.g., Admin must respond within 3 business days; escalation to a Compliance lead if unresolved; auto-refund at day 7 if no Admin action. Proposal: auto-resolve as `resolved_buyer` (refund) at day 7 if no Admin action; configurable.
- **[USER DEPENDENCY] Refund-on-dispute policy** — confirm: opening a dispute does NOT auto-refund; resolution always requires Admin action. (Auto-refund at SLA breach is the only exception per the SLA item above.)
- **[USER DEPENDENCY] Anomaly thresholds** — confirm the 5x, 3-disputes, 10-listings rules-of-thumb in §4.7, or supply specific values.
- **[USER DEPENDENCY] Sanctions review queue threshold** — when should a sanctions `review` result be escalated to a manual queue (vs. auto-approved with a flag)? Proposal: any `review` result is queued.
- **[USER DEPENDENCY] Audit log retention extension** — 7 years per NFR 4.6; confirm export S3 lifecycle (e.g., move to Glacier after 1 year, retain 7 years).
- **[USER DEPENDENCY] Admin role assignment for first Admin** — bootstrap the first Admin via env var or CLI tool (proposal: a one-time `pnpm admin:bootstrap` script that takes an email and creates the first Admin with MFA forced on first login).
- **[USER DEPENDENCY] Admin email templates** — sign-off on suspend/ban/ban-reason/dispute-opened/dispute-resolved copy.
- **[USER DEPENDENCY] Config-change approval workflow** — does any config change (e.g., platform_fee_bps) require a second Admin approval, or is one sufficient? Proposal: one Admin sufficient; audit log captures actor and rationale.
- **[USER DEPENDENCY] Anonymization policy for removed users** — when a user is removed, when is PII scrubbed from messages and dispute threads? FRD §5.2 says "Buyers may request export or deletion of their personal data; transactional records required for tax/legal compliance are retained per applicable law." Confirm the rule for v1.0.
- **[USER DEPENDENCY] Country-specific compliance overlays** — India DPDP, US state laws, GDPR-equivalents; confirm any per-market behaviour (e.g., data residency) that this phase must respect.
