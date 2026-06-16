# Phase 6 — Payments & Checkout

> **Goal:** A logged-in Buyer can convert a cart into one or more orders, pay in INR or USD through the integrated payment gateway, and have their CVC entries atomically transition to `Held` against the order. Refunds, dispute-aware payout freezes, and reconciliation are wired end-to-end. Certificates (Phase 7) are issued only on successful capture.

---

## 1. Demoable outcome

- A logged-in Buyer opens `/cart`, clicks "Checkout", selects INR or USD, sees the price lock notice ("Price locked for 15 minutes"), and is taken to the gateway.
- On successful payment, the Buyer's CVC entries transition `Available → Held` (per FR-AU-009, the listing was already `Held` against the listing; this phase adds the buyer-specific linkage and the order-level reservation that will feed Phase 7's certificate issuance).
- A confirmation email is sent via SES; the cart is converted to `Order` records with status `paid`.
- Failed authorization voids the order within 60 seconds and the CVC reservation is released back to `Held`-on-listing.
- A refund (full or partial) marks the order `refunded` and the corresponding certificate (Phase 7) is revoked.
- A daily reconciliation report is generated and stored in `ccverse-audit-exports` on S3.

---

## 2. Functional requirements in scope

- FR-B-006 Currency selection (INR or USD) per transaction; price locked for 15 minutes.
- FR-B-005 Final quantity revalidation at checkout.
- FR-B-007 "My Purchases" page (read-only; certificate links added in Phase 7).
- FR-P-001 Fiat only (INR or USD).
- FR-P-002 Display of platform fee, taxes, and net Seller amount before payment.
- FR-P-003 Authorize at order creation, capture on certificate issuance; failed auth voids the order within 60 seconds.
- FR-P-004 Full refund to original payment method on cancellation, certificate failure, or successful dispute within 7-day window.
- FR-P-005 T+2 payout schedule (mechanism in Phase 9; this phase creates `Payout` rows in `pending`).
- FR-P-006 Daily reconciliation report (CSV + PDF) — generated here, exported nightly.
- BR-02, BR-06, BR-08, BR-09 (fixed price; atomic decrement; certificate on capture; payout freeze on dispute).

---

## 3. Non-functional requirements touched

- 4.1 Performance: checkout end-to-end ≤ 5s p95.
- 4.2 Security: PCI scope minimized via gateway-hosted fields; no PAN storage; all gateway calls over TLS; CSRF on order endpoints.
- 4.6 Auditability: every state change logged.
- 5.3 Financial compliance: sanctions screening at order creation and payout.

---

## 4. Technical implementation

### 4.1 Data model

```
Order {
  id              uuid pk
  buyer_id        uuid fk User(id)
  status          enum('created','authorized','paid','failed','refunded',
                        'partially_refunded','disputed','cancelled')
  currency        enum('INR','USD')
  subtotal        numeric(14,4)
  platform_fee    numeric(14,4)
  tax_amount      numeric(14,4)
  total_amount    numeric(14,4)
  price_locked_until timestamptz
  created_at, updated_at
  captured_at     timestamptz
  refunded_at     timestamptz
  CHECK (total_amount = subtotal + platform_fee + tax_amount)
}

OrderItem {
  id          uuid pk
  order_id    uuid fk Order(id)
  listing_id  uuid fk Listing(id)
  quantity    int
  unit_price  numeric(12,4)
  line_total  numeric(14,4)
  CHECK (quantity > 0)
}

Payment {
  id              uuid pk
  order_id        uuid fk Order(id)
  gateway         enum('razorpay','stripe')
  gateway_ref     text          -- gateway's payment intent / charge id
  status          enum('authorized','captured','failed','refunded','partially_refunded')
  amount          numeric(14,4)
  currency        enum('INR','USD')
  authorized_at   timestamptz
  captured_at     timestamptz
  refunded_at     timestamptz
  raw_payload     jsonb         -- gateway response (sanitized; no PAN)
}

Refund {
  id              uuid pk
  payment_id      uuid fk Payment(id)
  amount          numeric(14,4)
  reason          text
  gateway_ref     text
  status          enum('pending','succeeded','failed')
  initiated_by    uuid fk User(id)
  created_at      timestamptz
}

SanctionsScreening {
  id            uuid pk
  order_id      uuid fk Order(id)
  provider      text
  provider_ref  text
  status        enum('clear','review','block')
  payload       jsonb
  screened_at   timestamptz
}

PlatformConfig { ... seeded with:
  platform_fee_bps int        -- basis points, e.g. 250 = 2.5%
  tax_rate_in     numeric     -- e.g. 0.18 (GST)
  tax_rate_us     numeric     -- e.g. 0.00 (varies; often 0 for digital services)
  price_lock_minutes int default 15
  dispute_window_days int default 7
  min_kyc_threshold numeric   -- above which Buyer must complete KYC
}

Payout {
  id              uuid pk
  seller_id       uuid fk SellerProfile(user_id)
  period_start    date
  period_end      date
  gross_amount    numeric(14,4)
  fees            numeric(14,4)
  refunds         numeric(14,4)
  net_amount      numeric(14,4)
  currency        enum('INR','USD')
  status          enum('pending','on_hold','scheduled','paid','failed')
  scheduled_for   date        -- T+2 from latest order capture
  paid_at         timestamptz
  bank_account_id uuid fk BankAccount(id)
  created_at, updated_at
}

DailyReconciliation {
  id              uuid pk
  report_date     date unique
  csv_s3_key      text
  pdf_s3_key      text
  generated_at    timestamptz
  totals_json     jsonb
}
```

### 4.2 Currency selection and price lock

- `POST /api/cart/checkout` (preliminary) creates a `PriceLock`:
  - Server reads each `CartItem`'s listing, captures `unit_price` and `quantity_available` at this moment.
  - Sets `Order.price_locked_until = now() + 15 minutes`.
  - Returns the order preview: subtotal, platform fee, taxes, total in the selected currency, expiry timestamp.
- If the buyer doesn't complete payment within 15 minutes, a BullMQ delayed job voids the order (status=`cancelled`, CVC reservation released) and frees the price lock.
- FX is *not* used: the listing's `currency` is the order's currency. The Buyer's selected currency must match the listing's currency (or all listings in the cart must be in the same currency). Cart that mixes currencies is rejected at checkout with a clear message.

### 4.3 Gateway integration

- `packages/payments` defines:
  ```
  interface PaymentGateway {
    createPaymentIntent({ amount, currency, orderId, buyer }): Promise<{ gatewayRef, clientSecret }>
    capturePayment(gatewayRef): Promise<{ status, gatewayRef }>
    refund({ gatewayRef, amount, reason }): Promise<{ status, gatewayRef }>
    verifyWebhook(req): Promise<{ event, payload }>
  }
  ```
- `RazorpayGateway` (INR), `StripeGateway` (USD).
- Webhook endpoints:
  - `POST /api/webhooks/razorpay`
  - `POST /api/webhooks/stripe`
- All webhooks verify HMAC signature; replay protection via `event_id` dedup.
- Webhook handler:
  - `payment.captured` → set `Order.status='paid'`, `Payment.status='captured'`, queue Phase 7 certificate job.
  - `payment.failed` → set `Order.status='failed'`, release CVC reservation, void within 60s.
  - `refund.processed` → set `Refund.status='succeeded'`, `Order.status='refunded'` (or `partially_refunded`).

### 4.4 Order creation flow

1. `POST /api/checkout` with `{ cart_id, currency }`.
2. Server validates:
   - Cart not empty.
   - All listings still `approved` with `quantity_available >= cart_item.quantity`.
   - Currency matches all listings' currency.
   - Buyer KYC tier sufficient for total amount (per `PlatformConfig.min_kyc_threshold`).
   - Sanctions screening passed (see §4.7).
3. Atomically:
   - Decrement `Listing.quantity_available` by the line item quantity (DB CHECK prevents negative).
   - Call `registry.allocateToListing` for any *additional* CVC entries (in v1.0, the listing already holds entries from Phase 4 approval; this step links those entries to the order).
   - Create `Order` + `OrderItem` rows in `created` status.
   - Create `PriceLock` row with TTL.
   - Create `Payment` row with `status='authorized'`.
   - Write `AuditLog` (`order.created`).
4. Return `clientSecret` / gateway redirect URL to the client.
5. Buyer completes payment at the gateway.
6. Webhook fires; order transitions to `paid` or `failed`.
7. On `paid`: enqueue `certificate.generate` job (Phase 7). On `failed`: release CVC reservation, decrement rollback, set order to `failed`.

### 4.5 Atomicity and concurrency

- The whole flow is wrapped in a Postgres transaction with `SERIALIZABLE` isolation for the order-creation step.
- Two concurrent orders for the same listing are serialized by `SELECT ... FOR UPDATE` on the listing row.
- If `quantity_available` would go negative, the second transaction aborts and returns 409 (FR-B-005).
- Stress test in Phase 9: 1,000 concurrent purchase attempts on a 100-unit listing → exactly 100 succeed, 900 fail with 409.

### 4.6 Refund flow

- Triggered by:
  - Admin cancellation (Phase 8).
  - Successful dispute within the 7-day window (Phase 8).
  - Certificate generation failure (Phase 7 — fallback path).
- `POST /api/admin/orders/:id/refund` or `POST /api/buyer/orders/:id/dispute` (the latter only opens a dispute; Admin resolves it).
- Refund calls `PaymentGateway.refund` with the original `gateway_ref`. Refunded amount is full by default; partial refunds supported.
- On `succeeded`:
  - `Order.status='refunded'` or `partially_refunded`.
  - `Listing.quantity_available` is NOT auto-incremented (CVC entries were `Held` for this order; they remain `Held` until certificate revocation in Phase 7).
  - Phase 7's revocation moves the entries to `Retired`; if a refund happens, entries are released back to `Available` (this coordination is finalized in Phase 7).

### 4.7 Sanctions screening

- `POST /api/orders` calls `sanctionsScreen({ buyer, total, country })` before order creation.
- Default provider: pluggable interface; v1.0 ships with one provider (see `[USER DEPENDENCY]`).
- Result:
  - `clear` → order proceeds.
  - `review` → order proceeds but flagged for manual review (Admin queue).
  - `block` → order rejected with 403; Admin notified.
- Screening re-runs at payout time (Phase 9 wires the payout job).

### 4.8 Payout rows (scheduling in Phase 9)

- On each `Order` capture, a `Payout` row in `pending` is created or aggregated into the Seller's next payout period.
- `Payout.scheduled_for` = `Order.captured_at + 2 business days`.
- If a `Dispute` is opened on any underlying order, the related `Payout` is set to `on_hold` (BR-09).
- Phase 9 wires the actual bank-rail payout execution; this phase only models and persists.

### 4.9 Daily reconciliation

- BullMQ cron job at 02:00 UTC daily.
- Aggregates `Payment`, `Refund`, `Payout` for the prior day.
- Writes:
  - `ccverse-audit-exports/reconciliation/{date}.csv`
  - `ccverse-audit-exports/reconciliation/{date}.pdf`
- Inserts a `DailyReconciliation` row with totals.
- Phase 8's Admin console surfaces the latest report; Phase 9 alerts on missing days.

### 4.10 "My Purchases" page (read-only in this phase)

- `/buyer/purchases` lists orders with status, project, vintage, quantity, total, certificate link (added in Phase 7).
- Download invoice PDF (signed by server) — invoice is distinct from certificate.

### 4.11 UI surfaces

- `/cart` — already in Phase 5; add "Checkout" CTA.
- `/checkout` — order summary, currency confirmation, "Pay" button (lime), gateway redirect/iframe.
- `/checkout/success` — confirmation with order id and "View purchase" link.
- `/checkout/cancel` — explicit cancel flow.
- `/buyer/purchases` — list.
- `/buyer/purchases/[id]` — detail with payment info, refund/dispute entry points (Dispute UI is in Phase 8).

### 4.12 Tax handling

- `PlatformConfig.tax_rate_in` (GST) applied to INR orders.
- `PlatformConfig.tax_rate_us` applied to USD orders.
- Tax line shown separately to the Buyer pre-payment.
- Invoice PDF includes GSTIN placeholder and tax breakdown (Admin fills the real GSTIN via `PlatformConfig` per `[USER DEPENDENCY]`).
- Phase 6 does not integrate with a tax engine (e.g., Avalara); tax is computed in-app and stored.

---

## 5. Data model changes

All tables in §4.1 are new.

---

## 6. API surface (new in Phase 6)

```
POST /api/cart/checkout-preview        -- returns price-locked preview
POST /api/checkout                    -- creates order, calls gateway
GET  /api/buyer/orders
GET  /api/buyer/orders/:id
GET  /api/buyer/orders/:id/invoice
POST /api/admin/orders/:id/refund
POST /api/admin/orders/:id/cancel

POST /api/webhooks/razorpay
POST /api/webhooks/stripe
```

---

## 7. Cross-cutting concerns

- **Security:**
  - PCI scope minimized: gateway-hosted fields; no PAN, no CVV in our DB.
  - Webhook signatures verified.
  - CSRF tokens on `POST /api/checkout` and `/api/admin/orders/:id/refund`.
  - Idempotency-Key on order creation; replays return the same order.
- **Auditability:** every payment, capture, refund, and payout row in `AuditLog`.
- **RBAC:** Buyer can only see own orders; Admin can see all.
- **Observability:** payment failure rate, gateway latency, refund rate, sanctions block rate — all Phase 9 metrics.

---

## 8. Test plan

- **Unit:**
  - Price-lock expiry releases the CVC reservation.
  - Tax computation correct for known amounts and rates.
  - Sanctions provider response mapping (clear/review/block).
  - Idempotent order creation returns same `order_id` for same `Idempotency-Key`.
- **Integration:**
  - Full INR happy path via Razorpay sandbox.
  - Full USD happy path via Stripe test mode.
  - Failed auth voids within 60 seconds.
  - Refund (full and partial) updates order and reverses CVC reservation when applicable.
  - Concurrent purchase attempts on a 100-unit listing → 100 succeed, 900 fail.
  - Sanctions block rejects the order.
- **E2E:**
  - Cart → checkout → gateway → success page → "My Purchases" shows the order.
  - Cart → checkout → cancel → cart still intact.
- **Reconciliation:**
  - Daily job produces a CSV with totals matching the `Payment` + `Refund` aggregates.

---

## 9. Acceptance criteria

- [ ] Buyer can check out a cart in INR or USD; price is locked for 15 minutes.
- [ ] Mixed-currency carts are rejected with a clear message.
- [ ] Successful capture transitions the order to `paid`, creates a `Payout` row in `pending`, and enqueues a certificate job (consumed by Phase 7).
- [ ] Failed authorization voids the order within 60 seconds and releases the CVC reservation.
- [ ] Refunds issue to the original payment method; full and partial supported.
- [ ] Concurrent purchase attempts on the same listing never oversell (verified by load test).
- [ ] Sanctions screening is called at order creation and at payout time.
- [ ] Daily reconciliation CSV and PDF are generated and stored in S3.
- [ ] 5-second p95 end-to-end checkout under nominal load.
- [ ] All payment and order state changes are recorded in the audit log.
- [ ] No PAN or CVV is ever stored on our side; webhook payloads are sanitized.

---

## 10. Dependencies on other phases

- Phase 0 (proxy, S3, SES, audit, RBAC, BullMQ).
- Phase 1 (auth, KYC, MFA).
- Phase 2 (registry, batch integrity).
- Phase 3 (listing, quantity_available).
- Phase 4 (Auditor approval; CVC entries are `Held` against the listing at this point).
- Phase 5 (cart).

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Payment gateways** — confirm Razorpay (INR) and Stripe (USD) and provide sandbox credentials, webhook signing secrets, and allowed redirect URIs. Also confirm go-live plan for production credentials.
- **[USER DEPENDENCY] Platform fee %** — basis points; seed `PlatformConfig.platform_fee_bps` and confirm whether it varies by Seller / volume tier.
- **[USER DEPENDENCY] Tax rates** — `tax_rate_in` (GST) and `tax_rate_us`. Confirm whether tax is inclusive or exclusive of the displayed price. Confirm any reverse-charge / B2B tax handling.
- **[USER DEPENDENCY] GSTIN & business entity details** — for invoice PDFs; legal name, address, GSTIN, PAN, registered state.
- **[USER DEPENDENCY] Sanctions screening provider** — provider name, API key, screening scope (OFAC, UN, EU, India MHA, etc.), threshold for `review` vs `block`.
- **[USER DEPENDENCY] Minimum KYC threshold for Buyers** — drives `PlatformConfig.min_kyc_threshold` and `BuyerProfile.kyc_tier` enforcement at checkout.
- **[USER DEPENDENCY] Currency display rule for Buyers in mixed markets** — India-resident Buyers default to INR; US-resident default to USD; confirm any auto-switch or always-show-both.
- **[USER DEPENDENCY] Invoice branding** — sign-off on invoice PDF template (legal copy, branding, footer text).
- **[USER DEPENDENCY] Refund SLA** — confirm "refund initiated immediately" vs "refund initiated within 1 business day" copy.
- **[USER DEPENDENCY] Dispute window and refund-on-dispute policy** — confirm 7-day window; confirm whether a dispute auto-refunds or always goes to Admin review.
- **[USER DEPENDENCY] Payout currency** — is a Seller paid in the currency of the orders, in their bank's currency, or in INR/USD based on bank location? FRD says INR or USD; confirm per-Seller currency.
- **[USER DEPENDENCY] T+2 calendar definition** — T+2 *business* days, or T+2 calendar days? FRD says "T+2 schedule post-purchase"; confirm.
- **[USER DEPENDENCY] Webhook replay protection window** — for both Razorpay and Stripe.
- **[USER DEPENDENCY] PCI scope confirmation** — sign-off that gateway-hosted fields and no-PAN storage meet PCI-DSS SAQ A or SAQ A-EP requirements.
