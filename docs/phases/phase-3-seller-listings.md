# Phase 3 — Seller Listings

> **Goal:** Sellers can create, edit, view, and delist carbon credit listings against their registered projects and allocated CVC batches. Listings have a full state machine, support partial-quantity sales, and reference the CVC registry for batch integrity.

---

## 1. Demoable outcome

- A KYC-approved Seller with at least one `active` project and a CVC batch in `Available` state can create a listing.
- The listing references the CVC batch, vintage year, quantity, unit price, and currency, and accepts supporting documents.
- On submission, the listing enters `Pending Auditor Review` and is not visible to Buyers.
- The Seller can view the listing's status, edit it while `Pending` or `Rejected`, and view sales history once `Approved`.
- Approved listings show on the Seller's dashboard with live `quantity_available` decrementing as orders are captured (Phase 6 wires the actual order flow; the listing model and dashboard counters work in this phase).
- A listing auto-closes when `quantity_available` reaches 0.

---

## 2. Functional requirements in scope

- FR-S-001 Create listing from a registered project, providing vintage, batch range, quantity, price, currency, supporting docs.
- FR-S-002 Reference a CVC batch allocated to the Seller; batch integrity verified against the registry.
- FR-S-003 `Pending Auditor Review` on submission; not visible to Buyers.
- FR-S-004 View status (Pending / Approved / Rejected / Sold Out / Removed) with rejection comments.
- FR-S-005 Edit only while `Pending` or `Rejected`; delist on `Approved`.
- FR-S-006 Partial-quantity sales; auto-close at zero.
- FR-S-007 View sales history, buyer count, gross revenue, platform fees, net payout (figures populated in Phase 6; counters in this phase).
- BR-02, BR-04, BR-05, BR-06 (fixed price; vintage ≤ current year; batch size limit; atomic decrement).

---

## 3. Non-functional requirements touched

- 4.1 Performance: listing detail page ≤ 2s p95.
- 4.5 Usability: create-listing flow ≤ 5 steps.
- 4.6 Auditability: every listing state change logged.

---

## 4. Technical implementation

### 4.1 Data model

```
Listing {
  id                  uuid pk
  seller_id           uuid fk SellerProfile(user_id)
  project_id          uuid fk Project(id)
  cvc_batch_id        uuid fk CvcBatch(id)
  cvc_serial_start    bigint
  cvc_serial_end      bigint
  vintage_year        int
  quantity_total      int
  quantity_available  int
  unit_price          numeric(12,4)
  currency            enum('INR','USD')
  status              enum('draft','pending_auditor_review','approved','rejected',
                           'sold_out','removed_by_seller','removed_by_admin','closed')
  rejection_comments  text
  policy_references   text[]
  approved_at         timestamptz
  approved_by_auditor_id uuid fk User(id)
  removed_at          timestamptz
  removed_by          uuid fk User(id)
  created_at, updated_at
  CHECK (quantity_available >= 0 AND quantity_available <= quantity_total)
  CHECK (vintage_year <= extract(year from now()))
  CHECK (currency in ('INR','USD'))
}

ListingDocument {
  id          uuid pk
  listing_id  uuid fk Listing(id)
  document_type enum('monitoring_report','verification_statement','other')
  s3_key      text
  sha256      text
  uploaded_at timestamptz
  uploaded_by uuid fk User(id)
}

ListingStateTransition {  -- append-only
  id          uuid pk
  listing_id  uuid fk
  from_status text
  to_status   text
  actor_id    uuid fk User(id)
  reason      text
  created_at  timestamptz
}
```

### 4.2 Listing state machine

```
draft
  └─ submit ─→ pending_auditor_review
                  ├─ approve ─→ approved
                  │              ├─ sell (qty=0) ─→ sold_out
                  │              ├─ seller_remove ─→ removed_by_seller
                  │              └─ admin_remove ─→ removed_by_admin
                  └─ reject ─→ rejected
                                  └─ edit+resubmit ─→ pending_auditor_review
```

- `sold_out` and `closed` are terminal.
- All transitions are explicit in `ListingStateTransition`; no in-place status updates.
- `quantity_available` is decremented atomically by Phase 6's order-capture handler; this phase only enforces the constraint and provides a service method.

### 4.3 Listing creation flow

UI wizard (≤ 5 steps):

1. **Select project** — dropdown of `active` projects owned by the Seller.
2. **Select CVC batch & quantity** — Seller picks a batch with `state='active'` and `quantity_total - sum(open listings) >= requested`. UI shows available per batch.
3. **Pricing** — unit price, currency (INR or USD). Server validates price > 0 and within platform min/max.
4. **Documents** — upload 1–5 PDFs (per Appendix B), each ≤ 50 MB, MIME-checked, SHA-256 stored.
5. **Review & submit** — full preview, then submit.

Server:

- `POST /api/seller/listings` with multipart payload.
- Validates:
  - Seller is KYC-approved.
  - Project is `active` and owned by the Seller.
  - Batch is allocated to the Seller and `state='active'`.
  - Quantity ≤ `CvcBatch.total_quantity - sum(quantity_total of open listings on the batch)`.
  - Vintage year ≤ current year.
  - Price within platform min/max (from `PlatformConfig`).
  - Currency is INR or USD.
- On success: create `Listing` with `status='pending_auditor_review'`, return id. Send SES notification to Seller.

### 4.4 Batch-integrity check

- `listingService.create({ sellerId, batchId, quantity })`:
  1. `SELECT ... FOR UPDATE` on the `CvcBatch` row.
  2. Compute `available = batch.total_quantity - sum(quantity_total of listings where batch_id = X and status in (pending, approved))`.
  3. If `quantity > available`, return 409.
  4. Insert the `Listing` row in the same transaction.
  5. Insert a `ListingStateTransition` row (`null → pending_auditor_review`).
  6. Write `AuditLog` row.

This guarantees no listing can claim more than the batch has uncommitted. The actual CVC entry → `Held` transition is deferred to Phase 4 (Auditor approval) per FR-AU-009.

### 4.5 Editing a listing

- Allowed only when `status in ('pending_auditor_review', 'rejected')`.
- Editable fields: `unit_price`, `quantity_total` (down only, never up — to preserve already-allocated Held entries), `documents` (add/remove).
- Changing `quantity_total` down recalculates `quantity_available` proportionally; down-sizing never voids CVCs already `Held` against the listing.
- Re-submitting a previously rejected listing clears `rejection_comments`, transitions back to `pending_auditor_review`, and notifies the Auditor queue.

### 4.6 Delisting (Seller)

- Allowed only when `status='approved'`.
- Endpoint: `POST /api/seller/listings/:id/delist` with reason.
- Effect:
  - Listing → `removed_by_seller`.
  - Held CVC entries → `Available` (via `registry.releaseFromListing`).
  - In-flight orders (created but not captured) for this listing are allowed to complete (Phase 6 handles the timing); new orders rejected.
  - Buyer-facing detail page returns 410 Gone with a "no longer available" message (per BR-10).

### 4.7 Sales history & counters

- `GET /api/seller/listings/:id/sales` returns:
  - `units_sold`, `gross_revenue`, `platform_fees`, `taxes`, `net_payout` (per Phase 6 these are computed from `Order` + `Payment`; this phase scaffolds the endpoint with zeros and the correct shape).
- `GET /api/seller/dashboard` aggregates by listing.

### 4.8 UI surfaces

- `/seller/listings` — table: status tag, project tag (DataTag), vintage, qty (avail/total), unit price, currency tag, last-updated. Filters: status, project, currency.
- `/seller/listings/new` — 5-step wizard.
- `/seller/listings/[id]` — detail with timeline (state transitions), documents, sales history, action bar (Edit, Resubmit, Delist).
- `/seller/dashboard` — summary cards: active listings, total available CVCs, gross sold this month, pending payout.

### 4.9 Document upload

- Multipart upload to S3 with server-side encryption (SSE-KMS).
- Server computes SHA-256 and stores in `ListingDocument.sha256`.
- On replace/delete: old S3 key archived to `s3://ccverse-projects/archived/{listingId}/{docId}/...` for 10 years (NFR record-keeping).

---

## 5. Data model changes

- New `Listing`, `ListingDocument`, `ListingStateTransition` tables.
- `CvcBatch` gets new derived view `v_cvc_batch_open_listings` (materialized or computed in-query).

---

## 6. API surface (new in Phase 3)

```
POST   /api/seller/listings
GET    /api/seller/listings
GET    /api/seller/listings/:id
PATCH  /api/seller/listings/:id
POST   /api/seller/listings/:id/submit
POST   /api/seller/listings/:id/resubmit
POST   /api/seller/listings/:id/delist
POST   /api/seller/listings/:id/documents
DELETE /api/seller/listings/:id/documents/:docId
GET    /api/seller/listings/:id/sales
GET    /api/seller/dashboard
```

---

## 7. Cross-cutting concerns

- **Concurrency:** `SELECT ... FOR UPDATE` on `CvcBatch` serializes batch-integrity checks; combined with Phase 2's advisory lock on `cvc_batch_id`, no double-allocate is possible.
- **RBAC:** Seller can only act on their own listings. The `seller_id` is always derived from the session; never trusted from the body.
- **Auditability:** every state change → `ListingStateTransition` + `AuditLog`.
- **Security:** documents in S3 with server-side encryption; presigned GETs only for the Seller and Auditors.

---

## 8. Test plan

- **Unit:**
  - State machine rejects illegal transitions.
  - Quantity decrement never goes below 0.
  - Vintage year in the future rejected.
  - Price outside platform min/max rejected.
- **Integration:**
  - Create listing happy path → status `pending_auditor_review`.
  - Reject → edit → resubmit → re-pending.
  - Approve (via the minimal admin endpoint from Phase 2) → status `approved`, CVC entries → `Held`.
  - Seller delists approved listing → CVC entries back to `Available`.
  - Two parallel listing creations against the same batch where combined quantity > batch total → exactly one succeeds (the other gets 409).
- **E2E:** complete wizard in the UI; verify it closes in ≤ 5 steps.
- **Compliance:** vintage year ≤ current year for 100% of listings in test data.

---

## 9. Acceptance criteria

- [ ] A KYC-approved Seller can create a listing from a registered project and a CVC batch.
- [ ] Submission puts the listing in `pending_auditor_review`; it is not visible to Buyers (Phase 5 enforces the public-side filter, this phase enforces server-side).
- [ ] Edit is allowed only in `pending_auditor_review` or `rejected`; delist is allowed only in `approved`.
- [ ] Quantity total can be reduced but not increased after submission.
- [ ] All state transitions are recorded in `ListingStateTransition` and `AuditLog`.
- [ ] Concurrent listing creation on the same batch never oversubscribes.
- [ ] Wizard completes in ≤ 5 steps and is WCAG 2.1 AA compliant.
- [ ] Documents are stored encrypted in S3 (SSE-KMS) with SHA-256 integrity.

---

## 10. Dependencies on other phases

- Phase 0 (proxy, S3, SES, audit, RBAC).
- Phase 1 (KYC-approved Seller; BankAccount).
- Phase 2 (Project registration, CVC registry, batch issuance).

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Platform min/max listing price** — minimum and maximum unit price for INR and USD (from `PlatformConfig`).
- **[USER DEPENDENCY] Maximum number of supporting documents per listing** — FRD Appendix B says "PDF (1–5)"; confirm.
- **[USER DEPENDENCY] Whether quantity can be increased after approval** — proposal: never (down-only, to protect Held entries). Confirm.
- **[USER DEPENDENCY] Seller "name publicly disclosed for verified Sellers"** — FR-B-003 says the Seller name is publicly displayed once verified. Confirm the disclosure rules (e.g., legal name vs trade name) and that the Seller may opt out via a public profile setting.
- **[USER DEPENDENCY] Sales-history visibility** — should `units_sold` and `buyer_count` be visible on the public listing page, or Seller-only? FRD says "view sales history" only for Seller; confirm public visibility.
- **[USER DEPENDENCY] Delist vs Remove distinction for Buyers** — FRD says listings show as "no longer available" with no seller disclosure (BR-10). Confirm the Buyer-side copy and whether a generic "this listing is no longer available" is shown vs a specific reason.
- **[USER DEPENDENCY] Country / vintage display format** — confirm the Buyer-facing listing page shows vintage year only, or also quarter/month.
- **[USER DEPENDENCY] Document retention on delist** — confirm 10-year retention policy for `ListingDocument` after delist/remove.
