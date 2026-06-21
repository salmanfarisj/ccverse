# Phase 2 — Project Registration & CVC Registry

> **Goal:** Make CC Verse the registry of record. A Seller can register a project; on Auditor approval, the system assigns a CC Verse project ID (CCV-######) and the project becomes eligible to be referenced by listings. CC Verse issues CVC batches in the registry, tracks state transitions atomically, and exposes a queryable registry.

---

## 1. Demoable outcome

- A KYC-approved Seller can register a new project with name, country, project type, methodology (from a CC Verse-recognised public standard and version), source URL, and a PDF project design document.
- The project enters `Pending Auditor Review` and is visible only to the Seller and Auditors.
- An Auditor approves it; the system assigns `CCV-000123` and the project becomes `Active`.
- An Admin (or a back-office tool) can issue one or more CVC batches to that project, each with a serial range `CVC-YYYY-#######`. Batches are allocated to a specific Seller.
- Each CVC exists in exactly one of `Available`, `Held`, `Retired` in the registry; transitions are atomic and audit-logged.
- A Seller dashboard shows registered projects, batch allocations, and aggregate available vs held vs retired quantities.

---

## 2. Functional requirements in scope

- FR-S-009 (project registration with CC Verse project ID, methodology, public standard, version).
- FR-AU-008 partial (validate methodology against current public-standard list, validate CVC batch range against the registry).
- Section 5.1 (CC Verse Certification & Registry Alignment) — except the listing-time enforcement which lands in Phase 3/4.
- BR-13, BR-14, BR-15 (project must be registered; methodology must be on the published list; CVC state machine).

---

## 3. Non-functional requirements touched

- 4.2 Security: only the owning Seller, Auditors, and Admins can read project details; KYC docs encrypted in S3.
- 4.5 Usability: project registration ≤ 5 steps.
- 4.6 Auditability: every state change logged.

---

## 4. Technical implementation

### 4.1 Data model

New / finalized tables:

```
Project {
  id                  uuid pk
  ccverse_project_id  text unique not null  -- 'CCV-000123'
  name                text
  country             text(2)
  project_type        text
  methodology         text                   -- 'VM0007', 'GS-TPDDTEC', 'CAR-Forest', etc.
  methodology_standard text                  -- 'verra' | 'gold_standard' | 'car' | successor
  methodology_version text                   -- e.g. 'v4.0'
  methodology_source_url text
  vintage_year        int                    -- check (vintage_year <= extract(year from now()))
  description         text
  registered_at       timestamptz
  status              enum('pending_auditor_review','active','rejected','suspended','retired')
  rejection_reason    text
  registered_by_seller_id uuid fk SellerProfile(user_id)
  approved_by_auditor_id   uuid fk User(id)
  approved_at              timestamptz
  created_at, updated_at
}

ProjectDocument {
  id           uuid pk
  project_id   uuid fk Project(id)
  document_type enum('pdd','monitoring_report','verification_statement','other')
  s3_key       text
  sha256       text
  uploaded_at  timestamptz
  uploaded_by  uuid fk User(id)
}

ProjectRegistrationAudit {
  id           uuid pk
  project_id   uuid fk
  actor_id     uuid fk User(id)
  event        text   -- 'submitted','approved','rejected','reopened','updated'
  comments     text
  policy_references text[]  -- CC Verse policy refs OR public-standard clause + version
  payload      jsonb
  created_at   timestamptz
}

CvcBatch {
  id              uuid pk
  cvc_prefix      text       -- 'CVC-2024'
  serial_start    bigint     -- inclusive
  serial_end      bigint     -- inclusive
  total_quantity  int        -- (serial_end - serial_start + 1)
  project_id      uuid fk Project(id)
  allocated_to_seller_id uuid fk SellerProfile(user_id)
  state           enum('draft','active','fully_listed','fully_retired','closed')
  issued_at       timestamptz
  issued_by       uuid fk User(id)
  source_document_id uuid fk ProjectDocument(id) nullable
  notes           text
}

RegistryEntry {
  id              uuid pk
  cvc_serial      text unique not null   -- 'CVC-2024-000001'
  cvc_batch_id    uuid fk CvcBatch(id)
  project_id      uuid fk Project(id)
  current_holder_seller_id uuid fk SellerProfile(user_id)
  state           enum('Available','Held','Retired') not null
  held_by_listing_id  uuid fk Listing(id) nullable   -- set when Held
  retired_at      timestamptz
  retirement_reason text
  last_actor_id   uuid fk User(id)
  last_state_change_at timestamptz
  created_at      timestamptz default now()
}

RegistryTransition {  -- append-only history; do not delete rows
  id              uuid pk
  registry_entry_id uuid fk RegistryEntry(id)
  from_state      text
  to_state        text
  reason          text
  actor_id        uuid fk User(id)
  related_listing_id uuid fk Listing(id) nullable
  related_order_id   uuid fk Order(id) nullable
  created_at      timestamptz default now()
}
```

Constraints:

- `UNIQUE (cvc_serial)` on `RegistryEntry` — prevents duplicates.
- `CHECK (vintage_year <= extract(year from now()))` on `Project`.
- `CHECK (serial_end >= serial_start)` and `CHECK (total_quantity = serial_end - serial_start + 1)` on `CvcBatch`.

### 4.2 CC Verse project ID assignment

- Format: `CCV-######` (6 digits, zero-padded).
- Counter in `PlatformConfig` (`next_project_seq`) with a DB transaction to allocate atomically.
- Reserved range: `CCV-000000` to `CCV-000099` reserved for internal/test (per `[USER DEPENDENCY]`).
- The allocation sequence is itself audit-logged.

### 4.3 CVC serial assignment

- Format: `CVC-YYYY-#######` (7 digits, zero-padded) — year refers to issuance year, not vintage year.
- Issued in contiguous ranges per batch. The registry service exposes:
  ```
  issueBatch({ projectId, sellerId, quantity, vintageYear, documentId }):
    returns { batchId, serialStart, serialEnd }
  ```
- Implementation:
  - Lock the `next_serial` counter for the year (single in-process transaction; safe for MVP single-region).
  - Insert N `RegistryEntry` rows in a single transaction.
  - Insert one `RegistryTransition` row per entry (`null → Available`) via the same transaction.
  - On any failure, the entire transaction rolls back — no partial batches.

### 4.4 Methodology validation

- `lib/methodology/` keeps a list of recognised methodologies, sourced from a static config file committed to the repo. The list is loaded at process start.
- Source: configured list per `CC Verse Methodology Recognition Policy v1.0` (internal document).
- v1.0 ships with the static, curated list for Verra, Gold Standard, and CAR (see `[USER DEPENDENCY]` to confirm the list source-of-truth and refresh cadence).
- API: `methodology.isRecognised({ standard, code, version }) → { recognised, currentVersion, sourceUrl }`.
- Auditor UI surfaces `currentVersion` and the `methodology_source_url` so the Auditor can confirm before approving.

### 4.5 Project registration flow

- API: `POST /api/seller/projects` (multipart: metadata JSON + PDD PDF).
- Server-side validation:
  - Required fields per FR-S-009.
  - `vintage_year <= current_year`.
  - `methodology` must be `isRecognised(...)` true.
  - PDF: MIME check, size cap (e.g., 50 MB), SHA-256 computed and stored.
  - File uploaded to S3 (`s3://{S3_BUCKET}/projects/{projectId}/pdd-{uuid}.pdf`).
- Status starts at `pending_auditor_review`.
- On Auditor approval (Phase 4 wires the UI, but the underlying service lives here):
  - Allocate `CCV-######`.
  - Set `Project.status = 'active'`.
  - Audit log entry.
- On Auditor rejection: status `rejected`, reason recorded, Seller notified via AWS SES.

### 4.6 Batch issuance flow (back-office / Admin)

- API: `POST /api/admin/projects/:id/batches` with `{ quantity, vintage_year, source_document_id }`.
- Pre-flight: project must be `active`; quantity > 0; user must have Admin or Auditor role.
- Allocates the batch to a Seller; if no Seller specified, allocated to the project owner.
- Idempotency: client supplies an `Idempotency-Key` header; replays return the same response.

### 4.7 Registry service API (in `lib/registry/`)

```
allocateToListing({ batchId, listingId, quantity, actorId })
  → moves N entries from Available to Held; ties to listing

releaseFromListing({ listingId, reason, actorId })
  → moves N entries from Held back to Available (listing rejected/withdrawn)

transferOnOrderCapture({ orderId, listingId, quantity, actorId })
  → moves N entries from Held to (still Held) for the buyer; in v1.0, "transfer" is
    represented as Held entries being associated with the order; in v1.1 retirement
    flips Held to Retired.

retire({ orderId, cvcSerials[], reason, actorId })
  → moves entries from Held to Retired (used in v1.1; service exists now, gated).
```

- All operations:
  - Run inside a single Postgres transaction with `SELECT ... FOR UPDATE` on the affected `RegistryEntry` rows.
  - Append a `RegistryTransition` row per state change.
  - Write one `AuditLog` row per logical operation (one batch transition = one audit row, but N transition rows for forensic detail).
  - Idempotent on `related_listing_id` / `related_order_id`.

### 4.8 Concurrency guarantees

- Use Postgres advisory locks keyed on `cvc_batch_id` to serialize allocations on the same batch.
- Listings in Phase 3 and orders in Phase 6 must call into `registry.allocateToListing` and `registry.transferOnOrderCapture` — they never write `RegistryEntry` directly.
- Stress test (Phase 9): concurrent allocations to the same batch must never oversell.

### 4.9 UI surfaces

- `/seller/projects` — list, status, CCV ID, methodology badge.
- `/seller/projects/new` — 4-step wizard: details → methodology → documents → review.
- `/seller/projects/[id]` — detail, documents, batch allocations.
- `/admin/projects` — same list, all statuses; action menu: allocate batch, suspend, retire.
- `/auditor/projects` — review queue (full UI lands in Phase 4, but the route exists and the API is in place).
- All pages follow `DESIGN.md`. Methodology field is a JetBrains Mono tag with a copy-to-clipboard `DataTag` for the CCV ID.

---

## 5. Data model changes

All tables in §4.1 are new in Phase 2. Phase 0's placeholder columns for `Project`, `ProjectRegistration`, `RegistryEntry`, `CvcBatch` are upgraded to the schemas above via a migration.

---

## 6. API surface (new in Phase 2)

```
POST   /api/seller/projects                  -- create
GET    /api/seller/projects                  -- list mine
GET    /api/seller/projects/:id              -- detail
PATCH  /api/seller/projects/:id              -- edit (only while pending_auditor_review)
POST   /api/seller/projects/:id/documents    -- upload supporting doc

POST   /api/auditor/projects/:id/approve
POST   /api/auditor/projects/:id/reject
GET    /api/auditor/projects                 -- review queue (full UI in Phase 4)

POST   /api/admin/projects/:id/batches       -- issue CVC batch
GET    /api/admin/projects/:id/registry      -- inspect registry entries

GET    /api/methodologies                    -- list recognised (loaded from static config)
```

---

## 7. Cross-cutting concerns

- **Security:** all project documents in S3 are server-side encrypted; presigned GETs only. Public listing detail pages (Phase 5) read from a sanitized projection that excludes `pdd` PDF links.
- **Auditability:** every transition produces a `RegistryTransition` and an `AuditLog` row.
- **RBAC:** Seller can only see own projects; Auditor sees pending; Admin sees all.
- **Idempotency:** all `POST` admin endpoints honor an `Idempotency-Key` header.

---

## 8. Test plan

- **Unit:**
  - Project ID allocator never duplicates, even under concurrent calls (test with parallel workers).
  - CVC serial range generator never overlaps.
  - Methodology recogniser returns correct results for known/unknown/old versions.
- **Integration:**
  - Register project → approve → CCV ID assigned.
  - Register project → reject → status updated → Seller notified (mock SES).
  - Issue batch of 10,000 → 10,000 `RegistryEntry` rows; verify uniqueness; verify a transition log per row.
  - Concurrent `issueBatch` calls for the same year do not overlap serial ranges.
  - Vintage year in the future is rejected.
- **E2E:** Seller registration happy path end-to-end.
- **Compliance:** 100% of approved projects traceable to a methodology on the recognised list at the cited version.

---

## 9. Acceptance criteria

- [ ] A KYC-approved Seller can submit a project with PDD; the PDF is in S3 with a SHA-256 recorded.
- [ ] On Auditor approval, the project receives `CCV-######` and becomes `active`.
- [ ] Admin can issue a CVC batch; the registry entries are unique, contiguous, and `Available`.
- [ ] Methodology must be on the recognised list at the cited version; otherwise registration is rejected at the API.
- [ ] Vintage year in the future is rejected.
- [ ] All state transitions are atomic and audit-logged; no partial states possible.
- [ ] Concurrent batch issuance never produces overlapping or duplicate serials.
- [ ] `/seller/projects/new` wizard meets the 5-step budget.
- [ ] WCAG 2.1 AA on every new page.

---

## 10. Dependencies on other phases

- Phase 0 (proxy, app shell, S3, SES, audit log, RBAC).
- Phase 1 (KYC-approved Seller accounts; BankAccount encryption envelope available).

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Methodology Recognition Policy v1.0 content** — the authoritative list of methodologies, codes, versions, and source URLs for Verra, Gold Standard, and CAR. This is the source of truth for the `methodology.isRecognised` check.
- **[USER DEPENDENCY] Source-of-truth for the methodology list** — is the canonical list a static file committed to the repo (curated), or fetched periodically from the public-standard websites? For MVP, the curated static file is the default. Periodic sync is out of scope for MVP.
- **[USER DEPENDENCY] Reserved CCV ID range** — confirm reserved range for internal/test (default suggestion: `CCV-000000`–`CCV-000099`).
- **[USER DEPENDENCY] CVC serial prefix policy** — confirm `CVC-YYYY-#######` format; confirm whether YYYY is issuance year or vintage year (proposal: issuance year, since vintage year is on the project).
- **[USER DEPENDENCY] Vintage year on CVC** — vintage is per project (not per CVC); confirm.
- **[USER DEPENDENCY] Minimum project documents for first-time vs repeat Seller** — FRD §5.1 says "supporting documents... are mandatory for first-time Sellers and reusable for repeat Sellers of the same project." Confirm the policy: which document types are mandatory, and what "reusable" means in the system.
- **[USER DEPENDENCY] Batch issuance authority** — is batch issuance restricted to Admin only, or can Auditors also issue? FRD is silent. Proposal: Admin only; Auditor can recommend.
- **[USER DEPENDENCY] Maximum batch size** — any upper limit per batch (e.g., 1,000,000 CVCs) for performance?
- **[USER DEPENDENCY] S3 bucket for project documents** — confirm bucket name and KMS key for `ccverse-projects`.
- **[USER DEPENDENCY] Country list for project types** — confirm the full project-type enum (e.g., `forestry`, `renewable_energy`, `methane_capture`, `blue_carbon`, etc.) or allow free-text for v1.0.
- **[USER DEPENDENCY] Auditor project-review UI scope in this phase** — Phase 4 owns the full UI. Confirm whether a minimal approval endpoint is acceptable in Phase 2 for end-to-end testing, with the UI deferred to Phase 4.
