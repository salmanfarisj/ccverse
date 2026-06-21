# Phase 7 — Certificate Generation & Verification

> **Goal:** On successful payment capture, the system generates a tamper-evident, signed Certificate of Ownership as a PDF, stores it durably, exposes it to the Buyer via "My Purchases" and a public verification URL, and revokes it on refund.

> **MVP simplification:** PDF generation runs in the in-process job runner (≤ 30s job per certificate). KMS holds the signing key.

---

## 1. Demoable outcome

- After a successful payment capture (Phase 6), a signed PDF certificate is generated within 5 seconds and emailed to the Buyer.
- The certificate contains: certificate ID (UUID), serial number (`CVC-YYYY-#######`), Buyer name and country, Seller name and country, project name and CC Verse project ID, methodology and vintage, quantity (tCO2e), unit price, total, currency, issuance date, SHA-256 hash of the canonical body, and a public verification URL.
- The Buyer can download the PDF from "My Purchases" or open the public verification URL.
- The verification URL returns a public read-only page showing `Valid` / `Revoked` and core fields (project, vintage, quantity, certificate ID, issuance date). No PII.
- If the underlying order is refunded, the certificate transitions to `Revoked` and the verification page reflects this within 5 minutes.
- Certificates are retained for at least 10 years from issuance in `ccverse-certificates` (S3 with versioning + Object Lock).

---

## 2. Functional requirements in scope

- FR-C-001 Generate signed PDF with all required fields and SHA-256 of the canonical body.
- FR-C-002 Unique serial number and public verification URL.
- FR-C-003 Signed PDF, downloadable from "My Purchases".
- FR-C-004 Public verification URL returns read-only Valid/Revoked status and core fields, no PII.
- FR-C-005 Refund revokes the certificate; verification page reflects within 5 minutes.
- FR-C-006 Retain certificates for at least 10 years.

Cross-ref:

- FR-B-007 "My Purchases" with certificate download links.
- FR-B-008 Dispute window (7 days) — used to gate the revocation.

---

## 3. Non-functional requirements touched

- 4.1 Performance: certificate generation ≤ 5s p95.
- 4.2 Security: signed PDFs (PKCS#7 detached or PAdES); private key in KMS; verification page emits no PII.
- 4.6 Auditability: every certificate state change logged.

---

## 4. Technical implementation

### 4.1 Data model

```
Certificate {
  id              uuid pk
  order_id        uuid fk Order(id)
  serial_no       text unique not null  -- 'CVC-2024-0001234'
  buyer_name      text                  -- snapshot at issuance
  buyer_country   text(2)
  seller_name     text
  seller_country  text(2)
  project_id      uuid fk Project(id)
  ccverse_project_id text               -- snapshot
  project_name    text                  -- snapshot
  methodology     text                  -- snapshot
  methodology_standard text             -- snapshot
  methodology_version text              -- snapshot
  vintage         int                   -- snapshot
  quantity        int                   -- tCO2e
  unit_price      numeric(12,4)
  total           numeric(14,4)
  currency        enum('INR','USD')
  issued_at       timestamptz
  status          enum('valid','revoked')
  revoked_at      timestamptz
  revocation_reason text
  sha256          text                  -- hash of canonical body
  pdf_s3_key      text
  signature       text                  -- base64 PAdES signature
  signing_cert_id text                  -- KMS key alias / cert id
  verification_token text unique        -- long random; embedded in URL
  created_at, updated_at
  CHECK (quantity > 0)
}
```

`CertificateStateTransition` (append-only):

```
CertificateStateTransition {
  id              uuid pk
  certificate_id  uuid fk Certificate(id)
  from_status     text
  to_status       text
  reason          text
  actor_id        uuid fk User(id) nullable
  created_at      timestamptz
}
```

### 4.2 Certificate generation flow

Triggered by the in-process `certificate.generate` job enqueued by Phase 6 on `payment.captured`. The job runs in the Next.js server process; concurrency is bounded (default 4) by the job runner from Phase 0.

1. Load `Order` + `OrderItem` + `Project` + `Buyer` + `Seller`.
2. For each `OrderItem`, generate one Certificate row with snapshots.
3. For each certificate, build the PDF (see §4.3).
4. Compute SHA-256 of the canonical body (a deterministic JSON with all snapshot fields, sorted keys).
5. Sign the PDF with PAdES (PDF Advanced Electronic Signatures) using a private key in AWS KMS. The signature is stored in `Certificate.signature`; the signing certificate chain in `Certificate.signing_cert_id`.
6. Upload the signed PDF to `s3://{S3_BUCKET}/certificates/{year}/{serial_no}.pdf` with S3 Object Lock (`Compliance` mode, 10-year retention).
7. Update `Certificate.pdf_s3_key`, `sha256`, `signature`, `status='valid'`, `issued_at`.
8. Insert `CertificateStateTransition` (null → valid).
9. Write `AuditLog` (`certificate.issued`).
10. Send SES to Buyer with download link + verification URL.
11. Send SES to Seller with the issuance summary.

Job retries: 3 with exponential backoff. After 3 failures, the order is flagged for Admin intervention and the Buyer is notified of a delay. Permanent failures appear in `failed_job`.

### 4.3 PDF generation

- `pdf-lib` for content composition (pure JS; no headless browser).
- Layout per Appendix C:
  - Top: CC Verse wordmark in NB International Pro 18px.
  - Certificate ID and serial number in JetBrains Mono 13px as a `DataTag`.
  - "Certificate of Ownership" in display 58px.
  - Body: project, vintage, quantity, methodology, parties, totals in NB International Pro 18px.
  - Footer: verification URL, SHA-256 hash, issuance date, "Independent verification: <url>".
- Page A4 portrait; one certificate per PDF.
- Embedded PAdES signature using `node-signpdf` with the KMS-provided key.

### 4.4 Serial number

- `CVC-YYYY-#######` where YYYY is the issuance year.
- 7-digit zero-padded sequence.
- Counter in `PlatformConfig.next_certificate_serial_{year}`; advisory-locked.
- Reserved: `CVC-{year}-0000000` for internal test.

### 4.5 Public verification page

- Route: `/verify/[verification_token]`.
- Server component, ISR, refreshed every 60 seconds via `revalidate`.
- Returns:
  - `Valid` (green — use `--color-lime-surveyor` for "Valid", a defined status tag) or `Revoked` (red — confirm shade with design).
  - Project name, CC Verse project ID, methodology, vintage, quantity, certificate ID, issuance date.
  - **No** Buyer name, Buyer country, Seller name, Seller country, price, or any PII.
- The page is a thin public surface; no auth, no tracking pixels, no third-party requests. CSP is `default-src 'self'` plus the S3 bucket for the embedded project logo (optional).
- A revocation event updates the cached page within 5 minutes via on-demand revalidation triggered by the refund handler.

### 4.6 Revocation flow

- Triggered by:
  - Refund of the underlying order (Phase 6's refund webhook or Admin-initiated refund).
  - Admin manual revocation (Phase 8).
- Service `certificateService.revoke({ orderId, reason, actorId })`:
  1. In a transaction:
     - Load `Certificate` by `order_id`.
     - Update `Certificate.status='revoked'`, `revoked_at=now()`, `revocation_reason`.
     - Insert `CertificateStateTransition`.
     - Update `Order.status='refunded'` (idempotent).
     - **Move CVC entries from `Held` to `Retired` if the order is captured and the certificate is being revoked, OR release them back to `Available` if the order is being canceled before capture.** Coordination with the registry service: the canonical rule is _retire on capture+revoke_; _release on pre-capture cancel_. This is enforced by the registry service's `transferOnOrderCapture` and `retire` / `releaseFromOrder` calls.
  2. After commit:
     - On-demand revalidate `/verify/[verification_token]`.
     - Generate a new "revocation" PDF (with a watermark "REVOKED") and overwrite the S3 object (or write a separate object and update `pdf_s3_key`).
     - Write `AuditLog` (`certificate.revoked`).
     - Send SES to Buyer.
- 5-minute SLA (FR-C-005): on-demand revalidation + PDF overwrite completes well under 5 minutes; the page is also ISR-refreshed as a safety net.

### 4.7 Retention and immutability

- S3 Object Lock (`Compliance` mode) on `ccverse-certificates` bucket, 10-year default retention per object.
- Bucket versioning enabled; lifecycle policy retains noncurrent versions for the 10-year window.
- A bucket policy denies `s3:DeleteObject` and `s3:PutObjectLegalHold=false` from any non-KMS-admin principal.
- Database row is logically immutable once `status='valid'`; only `status` and `revocation_reason` may transition.

### 4.8 KMS / signing infrastructure

- `lib/signing/` exposes a `PdfSigner` interface; `KmsPdfSigner` is the production impl.
- Private key never leaves KMS; signing is done by `KMS.Sign` with a P-256 (or RSA-2048) customer master key.
- Public certificate (X.509) is published at `/.well-known/ccverse-signing.crt` for verifiers.
- Verification libraries used by the PDF: standard PAdES validators (e.g., Adobe Reader, `pdf-sign`).

### 4.9 UI surfaces

- `/buyer/purchases` — already in Phase 6; add "Download certificate" link per row.
- `/buyer/purchases/[id]` — detail with embedded certificate preview (iframe to signed PDF).
- `/verify/[token]` — public read-only page (no app shell; minimal layout per `DESIGN.md`).

### 4.10 Performance

- 5s p95 target: PDF build + KMS sign + S3 upload + DB write — achievable with `pdf-lib` and KMS p256.
- Job concurrency default 4; tunable via `PlatformConfig.certificate_job_concurrency`.

---

## 5. Data model changes

- `Certificate`, `CertificateStateTransition` (new).
- `PlatformConfig.next_certificate_serial_{year}` seeded lazily.

---

## 6. API surface (new in Phase 7)

```
GET  /api/buyer/certificates
GET  /api/buyer/certificates/:id
GET  /api/buyer/certificates/:id/download   -- 302 to presigned S3 GET
POST /api/admin/certificates/:id/revoke     -- manual Admin revocation
GET  /verify/[token]                        -- public; no auth
```

---

## 7. Cross-cutting concerns

- **Security:**
  - Private signing key in KMS only; no human ever sees it.
  - Verification page emits no PII.
  - Presigned GETs are short-lived (5 min).
  - SHA-256 covers a canonical-JSON body so a re-render with the same inputs produces the same hash; auditors can recompute and compare.
- **Auditability:** issuance, download, and revocation all in `AuditLog`.
- **RBAC:** Buyer sees own; Admin sees all; public sees only the verification page (no PII).
- **Compliance:** certificates and their revocation list constitute an authoritative, immutable record of every credit transfer.

---

## 8. Test plan

- **Unit:**
  - Canonical JSON serialization is stable across key orderings.
  - SHA-256 matches the canonical body.
  - Serial number allocator never duplicates.
  - Verification page returns no PII (snapshot test of HTML).
- **Integration:**
  - Successful payment → certificate generated within 5s; PDF in S3; email sent; download link works; verification page shows `Valid`.
  - Refund → certificate revoked; verification page shows `Revoked` within 5 minutes; CVC entries move to `Retired`.
  - 10-year retention: Object Lock applied to a freshly uploaded object.
  - KMS sign succeeds with the configured key.
  - Public verify URL with bad token returns 404, not 200.
- **E2E:** Buy a credit → download the certificate → open the verify URL.
- **Compliance:** 100% of paid orders have a corresponding `Certificate` row with `status='valid'` or `revoked`; zero orphan certificates.

---

## 9. Acceptance criteria

- [ ] Successful payment generates a signed PDF certificate within 5s (p95).
- [ ] Certificate serial number is `CVC-YYYY-#######`, globally unique.
- [ ] SHA-256 of the canonical body is in the certificate and on the verification page.
- [ ] Public verification URL exposes no PII and shows `Valid` / `Revoked`.
- [ ] Refund revokes the certificate and updates the verification page within 5 minutes.
- [ ] CVC entries transition correctly (`Held → Retired` on revoke; `Held → Available` on pre-capture cancel).
- [ ] S3 Object Lock is applied (10-year Compliance mode) to every certificate object.
- [ ] Private signing key never leaves KMS.
- [ ] WCAG 2.1 AA on the verification page and certificate download UI.
- [ ] Certificate generation is retryable with exponential backoff and surfaces permanent failures to Admin via `failed_job`.

---

## 10. Dependencies on other phases

- Phase 0 (S3 with Object Lock, KMS, SES, audit, RBAC, in-process job runner).
- Phase 1 (auth, KYC).
- Phase 2 (Project, RegistryEntry, registry service).
- Phase 3 (Listing).
- Phase 4 (Auditor approval, listing `Held`).
- Phase 5 (Buyer purchase flow leading to "My Purchases").
- Phase 6 (Order captured triggers certificate job; refund triggers revocation).

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Signing key custody** — confirm AWS KMS as the signing key store, and the key alias/ARN. Confirm whether an HSM (CloudHSM) is required for compliance.
- **[USER DEPENDENCY] Certificate template** — sign-off on the PDF layout, fonts, branding, and footer copy (legal, contact, "independent verification" wording).
- **[USER DEPENDENCY] Public verification page content** — confirm which fields are shown publicly. FRD Appendix C lists name and country, but FR-C-004 explicitly says "without exposing PII"; confirm the resolution (proposal: drop Buyer and Seller name; show "—" or "Verified Buyer" / "Verified Seller" with country).
- **[USER DEPENDENCY] Whether to retire CVCs on certificate issuance or on retirement** — proposal: retire on revocation/refund (or on explicit retirement in v1.1). Confirm.
- **[USER DEPENDENCY] Serial-number prefix year** — issuance year (proposal) vs vintage year. Confirm.
- **[USER DEPENDENCY] Certificate language localization** — English only in v1.0; confirm.
- **[USER DEPENDENCY] Revocation watermark and final PDF** — confirm the revocation watermark text and whether the original PDF is replaced or a new "revoked" PDF is created.
- **[USER DEPENDENCY] Long-term retention beyond 10 years** — confirm 10-year minimum (FRD says "at least 10 years"); confirm any longer requirement (e.g., 30 years for some carbon registries).
- **[USER DEPENDENCY] Embedded logo / imagery** — supply a CC Verse logo file for the PDF.
- **[USER DEPENDENCY] Certificate ID format** — UUID (proposal) or sequential; UUID is recommended for non-guessability.
- **[USER DEPENDENCY] Verification token entropy** — proposal: 256-bit random, base64url; confirm.
- **[USER DEPENDENCY] Public revocation feed** — should CC Verse publish a daily-signed JSON of all revocations (for third-party verifiers)? Proposal: yes; defer UI to v1.1.
