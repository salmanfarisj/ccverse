# Phase 4 — Auditor Console

> **Goal:** Auditors can review project registrations and listing submissions against the CC Verse Methodology Recognition Policy and the cited public-standard methodology. Decisions (Approve / Reject) are recorded immutably, with policy references and versioned clauses, and trigger the registry state transitions that make approved listings publicly visible.

---

## 1. Demoable outcome

- An Auditor logs in with MFA and lands on a review queue of pending items (oldest first by default), with both projects and listings interleaved.
- Selecting a project shows the full registration: project metadata, PDD, methodology (code, standard, version, source URL), the live status of that methodology on the recognised list, the Seller's KYC, and a checklist aligned to the Methodology Recognition Policy.
- The Auditor can Approve (CCV-###### is assigned; project becomes `active`) or Reject (with mandatory comments and at least one policy reference).
- Selecting a listing shows the listing, the referenced project's methodology, the CVC batch range, batch integrity against the registry, Seller KYC, and a checklist. Approve atomically transitions the CVC batch range from `Available` to `Held` and the listing becomes visible on the marketplace within 60 seconds. Reject requires a cited policy reference or a specific clause + version.
- Decisions are immutable. Corrections require a new decision record referencing the prior.
- An Auditor cannot approve/reject an item tied to their own user account (system-enforced).

---

## 2. Functional requirements in scope

- FR-AU-001 Prioritised review queue, oldest first by default.
- FR-AU-002 Detail view with full listing, Seller KYC, supporting documents, project methodology, public standard, version, and a checklist aligned to the Methodology Recognition Policy and the cited public-standard validation criteria.
- FR-AU-003 Approve / Reject with mandatory comments; rejections require a CC Verse policy reference or a specific clause (with version) of the cited public-standard methodology.
- FR-AU-004 On approval, listing becomes visible within 60 seconds.
- FR-AU-005 On rejection, Seller is notified.
- FR-AU-006 Auditor cannot approve/reject their own activity.
- FR-AU-007 All decisions and comments are immutable; corrections are new records.
- FR-AU-008 Validate methodology is on the current published list at the cited version; validate CVC batch range against the registry and reject any listing that references a batch not allocated to the Seller or not `Available`.
- FR-AU-009 On approval, atomically transition CVC batch range from `Available` to `Held` in the registry within 60 seconds; audit-logged; this is the moment the listing becomes visible.
- FR-AD-003 Assign / revoke Auditor role (Admin only).
- (Cross-ref) FR-S-009 approval flow; FR-S-001/002 listing approval flow.

---

## 3. Non-functional requirements touched

- 4.1 Performance: queue load ≤ 1s p95; detail page ≤ 2s p95.
- 4.2 Security: RBAC enforced; Auditor-only routes; sensitive PII hidden.
- 4.5 Usability: review-to-decision in ≤ 4 clicks.
- 4.6 Auditability: every decision is an append-only row with comments, policy references, actor, timestamp, and prior decision id when correcting.

---

## 4. Technical implementation

### 4.1 Data model

Add to `AuditDecision` (already in schema from Phase 0/2):

```
AuditDecision {
  id              uuid pk
  decision_type   enum('project_registration','listing')
  target_id       uuid   -- Project.id or Listing.id
  auditor_id      uuid fk User(id)
  decision        enum('approve','reject')
  comments        text
  policy_references text[]   -- array; at least one required for reject
  prior_decision_id uuid fk AuditDecision(id) nullable
  created_at      timestamptz default now()
  CHECK (decision='reject' AND array_length(policy_references,1) >= 1)
}
```

`Listing` gains a partial unique index to enforce one open approval per listing (DB-level, in addition to the application state machine):

```
CREATE UNIQUE INDEX uq_listing_approved ON Listing(id) WHERE status IN ('approved','sold_out');
```

### 4.2 Decision immutability

- `AuditDecision` has no `UPDATE` or `DELETE` path in the application.
- A correction is a _new_ `AuditDecision` row with `decision='approve' or 'reject'`, `prior_decision_id` set, and an internal flag (computed view) that surfaces only the latest.
- DB-level safeguard: revoke `UPDATE`, `DELETE` on `AuditDecision` for the application role; only `INSERT` is granted. (Postgres `GRANT` model.)

### 4.3 Approval: project registration

- Endpoint: `POST /api/auditor/projects/:id/approve` (and `/reject`).
- Service `projectService.approve({ projectId, auditorId, comments, policyReferences })`:
  1. Verify Auditor is not the project owner.
  2. Allocate `CCV-######` (atomic, advisory-locked counter).
  3. Update `Project.status = 'active'`, set `approved_at`, `approved_by_auditor_id`.
  4. Insert `AuditDecision` (decision_type='project_registration', decision='approve', comments, policy_references).
  5. Insert `ProjectRegistrationAudit` event.
  6. Write `AuditLog`.
  7. Send SES to Seller (approval email).
- Reject mirrors steps 1, 3 (status='rejected'), 4 (decision='reject', policyReferences required), 5, 6, 7.

### 4.4 Approval: listing

- Endpoint: `POST /api/auditor/listings/:id/approve`.
- Service `listingService.approve({ listingId, auditorId, comments, policyReferences })`:
  1. Re-validate everything FR-AU-008 mandates (methodology, batch ownership, batch state). The listing may have changed between submission and review.
  2. Verify Auditor is not the listing's seller.
  3. Inside a single transaction:
     - `SELECT ... FOR UPDATE` on the `CvcBatch` row.
     - Insert `AuditDecision` (decision_type='listing', decision='approve').
     - Insert `ListingStateTransition` (pending_auditor_review → approved).
     - Set `Listing.status='approved'`, `approved_at`, `approved_by_auditor_id`.
     - Call `registry.allocateToListing({ batchId, listingId, quantity=quantity_total, actorId=auditorId })` → N entries `Available → Held`.
     - Write `AuditLog`.
  4. After commit: enqueue a background job to push the listing to the public catalog (search index update, ISR revalidation for Next.js). This must complete within 60 seconds (FR-AU-004).
  5. Send SES to Seller.
- Reject:
  1. Validate the Auditor is not the seller.
  2. Insert `AuditDecision` (decision='reject', policyReferences required).
  3. Update `Listing.status='rejected'`, `rejection_comments=comments`, append `ListingStateTransition`.
  4. Write `AuditLog`.
  5. Send SES to Seller with comments (FR-AU-005).

### 4.5 Separation of duties

- `decisionService.create({ ... })` rejects calls where `actorId === sellerId` (or project-owner) with HTTP 403.
- Test fixture: an Auditor who is also a Seller cannot approve their own listings; the API returns 403 even with a valid session.
- Audit log row records the attempted-but-blocked action for forensic visibility (action='auditor.self_approval.blocked').

### 4.6 Review queue

- Queue: union of `Project WHERE status='pending_auditor_review'` and `Listing WHERE status='pending_auditor_review'`, oldest first, paginated.
- Optional filters: `decision_type` (project / listing), date range, auditor self-filter (default: hide my own items).
- Per-item SLA timer visible (e.g., age in hours, SLA target from `[USER DEPENDENCY]`).
- Optimistic UI: refresh on decision submit; no full reload.

### 4.7 Checklist engine

- A registry of checklist templates keyed by `(methodology_standard, methodology_code)`.
- Phase 4 ships the framework with one template (Verra VM0007 REDD+ Modular); full coverage is out of scope for v1.0 (see `[USER DEPENDENCY]`).
- Checklist items render as JetBrains Mono data tags in `pending` state; flipping one to `pass`/`fail` is local state — submitted alongside the decision comments.
- The AuditDecision row stores the checklist as `payload jsonb` for forensic record.

### 4.8 Public visibility (FR-AU-004)

- Approved listings become visible on the marketplace within 60 seconds. Mechanism:
  - On `commit` of the approval transaction, enqueue an in-process job `catalog.refresh_listing` with `listingId`.
  - Job revalidates the Next.js page (`/listing/[id]`) and updates the search index (Postgres FTS in v1.0; the index is a `tsvector` column refreshed in the same transaction).
  - Public listing browse (Phase 5) filters on `status='approved' AND approved_at <= now()` and reads from a materialized view `mv_active_listings` refreshed concurrently on commit.
- 60-second SLA monitored; breaches surface in logs and the Admin console.

### 4.9 UI surfaces

- `/auditor` — review queue with tabs (Projects / Listings / Mine / All).
- `/auditor/projects/[id]` — project detail with embedded PDD viewer (iframe rendering from presigned S3 URL, no PII), checklist, decision panel.
- `/auditor/listings/[id]` — listing detail with project card, batch integrity card, decision panel.
- Decision panel:
  - **Approve** (comments optional, policy references optional).
  - **Reject** (comments required, at least one policy reference required).
  - "Cite policy reference" combobox populated from `PlatformConfig.policies` (curated list of CC Verse policy IDs and clauses) and from the cited public-standard methodology's clause list (loaded by `methodology.getClauses(code, version)`).
- All decisions and corrections on one page; each correction has a "supersedes #dec_1234" badge.

### 4.10 Admin: assign/revoke Auditor role

- Endpoint: `POST /api/admin/users/:id/grant-auditor` and `/revoke-auditor`.
- Forces MFA reset and re-enrollment on grant.
- Audit log + email to the user.

---

## 5. Data model changes

- `AuditDecision` finalized; `prior_decision_id` FK added.
- `Listing` partial unique index added.
- Postgres `GRANT` model for `AuditDecision` to enforce immutability at the DB level.
- `PlatformConfig.policies` populated with CC Verse policy IDs/clauses.

---

## 6. API surface (new in Phase 4)

```
GET    /api/auditor/queue
GET    /api/auditor/projects/:id
GET    /api/auditor/listings/:id
POST   /api/auditor/projects/:id/approve
POST   /api/auditor/projects/:id/reject
POST   /api/auditor/listings/:id/approve
POST   /api/auditor/listings/:id/reject
GET    /api/auditor/decisions
GET    /api/auditor/decisions/:id
GET    /api/methodologies/:code/clauses?version=
POST   /api/admin/users/:id/grant-auditor
POST   /api/admin/users/:id/revoke-auditor
```

---

## 7. Cross-cutting concerns

- **RBAC:** Auditor-only on `/api/auditor/*`; Admin on role-grant endpoints.
- **Auditability:** `AuditDecision` is insert-only; corrections reference prior; `AuditLog` captures every action including blocked self-approval attempts.
- **Security:** presigned S3 URLs for documents are short-lived (5 min) and bound to the Auditor's session.
- **Performance:** the queue query is a single index scan on `status`; details use prepared statements; checklist rendering is server-side.
- **Idempotency:** `POST` decision endpoints honor `Idempotency-Key`.

---

## 8. Test plan

- **Unit:**
  - Self-approval blocked at service level.
  - Decision without `policy_references` rejected at DB level (CHECK constraint).
  - Correction links to prior via `prior_decision_id`.
- **Integration:**
  - Approve a project → CCV-###### assigned, status=active, email sent.
  - Approve a listing → CVC entries `Available→Held`, listing visible in `mv_active_listings` within 60s, search index updated.
  - Reject a listing without policy reference → 400.
  - Reject a listing with policy reference → status=rejected, email sent with comments.
  - Auditor role grant/revoke; user cannot reach `/auditor` after revoke.
- **E2E:** Auditor login with MFA → review queue → approve a listing → check marketplace visibility.
- **Compliance:** 100% of approved listings have an `AuditDecision` row with `decision='approve'` and an Auditor that is not the Seller.

---

## 9. Acceptance criteria

- [ ] Auditor can log in with MFA, see the review queue, and decide on each item.
- [ ] Approving a project assigns a unique `CCV-######` and notifies the Seller via SES.
- [ ] Approving a listing atomically moves CVC entries from `Available` to `Held` and makes the listing visible within 60 seconds.
- [ ] Rejecting a listing requires at least one policy reference and comments; Seller is notified.
- [ ] An Auditor cannot approve or reject their own listings or projects (403 with audit-logged block).
- [ ] Decisions are immutable; corrections are new rows with `prior_decision_id`.
- [ ] DB-level immutability: `UPDATE`/`DELETE` on `AuditDecision` is denied to the app role.
- [ ] The 60-second visibility SLA is met under nominal load.

---

## 10. Dependencies on other phases

- Phase 0 (proxy, audit log, RBAC, SES).
- Phase 1 (KYC; Auditor accounts with MFA).
- Phase 2 (Project, RegistryEntry, registry service).
- Phase 3 (Listing, ListingStateTransition, batch-integrity check).

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Review SLA target** — e.g., "decision within 1 business day" for the queue timer display. Drives the badge color thresholds.
- **[USER DEPENDENCY] CC Verse Methodology Recognition Policy v1.0 content** — the policy IDs / clauses to seed `PlatformConfig.policies` and the Auditor checklist templates. Without this, the rejection combobox is empty and the audit log entries will have no policy references to validate against.
- **[USER DEPENDENCY] Public-standard methodology clause lists** — for each cited methodology (Verra / Gold Standard / CAR), the list of clauses that the Auditor may cite. v1.0 may use a curated subset.
- **[USER DEPENDENCY] Checklist templates** — confirm scope: ship framework only, or include at least one full template (e.g., VM0007)?
- **[USER DEPENDENCY] Auditor self-exclusion default** — should the queue _hide_ an Auditor's own items by default, or _block_ them only on attempt? FRD is silent; FR-AU-006 is "cannot approve/reject their own account activity," so blocking is mandatory; hiding is a UX preference.
- **[USER DEPENDENCY] Email templates for Auditor decisions** — sign-off on the approval / rejection / correction copy.
- **[USER DEPENDENCY] Whether decisions are visible to the Seller in real time** — confirm Seller dashboard polls vs receives email only.
- **[USER DEPENDENCY] Listing visibility policy on rejection** — after rejection, can a Seller re-list the same batch + quantity, or must they change something? Proposal: re-listing is allowed after edit.
- **[USER DEPENDENCY] Audit log access for Auditors** — should Auditors be able to query historical decisions directly, or only via Admin exports? Proposal: Auditors see their own decisions and any decision on items they reviewed; full log access is Admin-only.
