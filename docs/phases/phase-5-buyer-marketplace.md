# Phase 5 — Buyer Marketplace (Browse & Cart)

> **Goal:** A Buyer (logged-in or guest) can discover approved listings through search, filters, and listing detail pages; add listings to a cart; and have a clean, fast, accessible experience that meets NFR 4.1 and 4.5. No payment in this phase — that lands in Phase 6.

---

## 1. Demoable outcome

- A guest can browse the public marketplace at `/marketplace` and view any approved listing detail page without logging in.
- A registered, logged-in Buyer can filter by project type, country, vintage year, price range, and public standard; full-text search by project name returns results in ≤ 1 second for the v1.0 dataset (up to 100,000 active listings per NFR 4.1).
- A Buyer can add a listing to a cart, see live quantity remaining, and adjust quantity before checkout (checkout itself is wired in Phase 6).
- The listing detail page displays project description, methodology, vintage, available quantity, unit price, Seller name (for verified Sellers), and supporting documents.
- Only `approved` (and not-yet-`sold_out` / `removed`) listings are visible; the marketplace view reads from a materialized view refreshed on Auditor approval.

---

## 2. Functional requirements in scope

- FR-B-001 Guest browsing is read-only.
- FR-B-002 Filters (project type, country, vintage, price range, public standard) and full-text search.
- FR-B-003 Listing detail page with all required fields.
- FR-B-004 Add to cart; multi-listing cart; single checkout.
- FR-B-005 Quantity revalidated at checkout (revalidation runs in this phase at cart-add time and on cart view; final revalidation at order creation is in Phase 6).

---

## 3. Non-functional requirements touched

- 4.1 Performance: browsing ≤ 2s p95; search ≤ 1s p95 for ≤ 100k listings.
- 4.5 Usability: WCAG 2.1 AA; responsive from 360px; market browsing is the main user journey so it must be exceptionally fast and clean.
- 4.6 Auditability: search/view events are not logged individually; add-to-cart and listing-view-by-id are audit-logged for fraud signals.

---

## 4. Technical implementation

### 4.1 Data model

No new tables. New views and indexes:

```
mv_active_listings    -- materialized view, refreshed concurrently on commit
columns: listing_id, project_id, project_name, methodology, methodology_standard,
         methodology_version, country, vintage_year, project_type, public_standard,
         unit_price, currency, quantity_available, seller_id, seller_name_public,
         approved_at, search_tsv

CREATE INDEX idx_mv_active_listings_tsv ON mv_active_listings USING gin(search_tsv);
CREATE INDEX idx_mv_active_listings_filters ON mv_active_listings
  (methodology_standard, country, vintage_year, project_type, currency, unit_price);
```

`Cart` and `CartItem` (new):

```
Cart {
  id          uuid pk
  buyer_id    uuid fk User(id)   -- null for guest
  guest_token text unique        -- cookie-bound token for guest carts
  status      enum('open','converted','abandoned','expired')
  expires_at  timestamptz        -- auto-cleanup after 7 days
  created_at, updated_at
}

CartItem {
  id          uuid pk
  cart_id     uuid fk Cart(id)
  listing_id  uuid fk Listing(id)
  quantity    int
  unit_price_snapshot numeric(12,4)   -- captured at add time
  currency_snapshot enum('INR','USD')
  created_at, updated_at
  UNIQUE (cart_id, listing_id)
  CHECK (quantity > 0)
}
```

`Cart` is merged on login (guest cart → user cart) — implementation in `cartService.attachToUser`.

### 4.2 Public catalog page

- Route: `/marketplace` (server component, ISR or revalidated on commit).
- Query against `mv_active_listings` with optional filters:
  - `methodology_standard` (enum: verra, gold_standard, car).
  - `country` (ISO 3166-1 alpha-2).
  - `vintage_year` (range or single).
  - `project_type` (enum).
  - `currency` (INR or USD).
  - `unit_price` (range).
  - `q` (full-text via `search_tsv @@ plainto_tsquery('simple', $1)`).
- Default sort: `approved_at DESC`. Optional sort: `unit_price ASC`, `vintage_year DESC`, `quantity_available DESC`.
- Pagination: 24 per page; cursor-based (`?after=<listing_id>`) for stability.
- Each card shows: project name, country flag emoji or code, vintage tag, quantity tag, methodology tag, unit price, currency tag, "View" CTA in lime.

### 4.3 Listing detail page

- Route: `/listing/[id]` (server component, ISR + on-demand revalidation when listing changes).
- Sections:
  1. **Hero:** project name (display heading 58px), methodology badge, vintage tag, country tag, project type tag.
  2. **Seller block:** Seller legal name (if `disclose_publicly` flag is true; default true per `[USER DEPENDENCY]`), Seller country.
  3. **Description:** markdown rendered.
  4. **Methodology:** code, standard, version, source URL, "View methodology" external link.
  5. **Documents:** list of supporting docs with title, type, and a "Download" button (presigned GET). For each download, an `AuditLog` row is written (`action='listing.document.download'`).
  6. **Quantity & price:** `quantity_available` (live), `unit_price`, total preview.
  7. **CTA:** "Add to cart" button (`LimeButton`); for guests, a tooltip "Sign in to purchase" but the action is allowed for guests (cart is cookie-bound).
- Quantity selector: stepper in JetBrains Mono. Constrained to `[1, quantity_available]`. If `quantity_available = 0`, show "Sold out" and disable the CTA.

### 4.4 Search

- PostgreSQL full-text with `simple` configuration (no stemming required for project names / methodology codes).
- `tsvector` column on `mv_active_listings`:
  ```
  search_tsv := setweight(to_tsvector('simple', coalesce(project_name,'')), 'A') ||
               setweight(to_tsvector('simple', coalesce(methodology,'')), 'B') ||
               setweight(to_tsvector('simple', coalesce(country,'')), 'C') ||
               setweight(to_tsvector('simple', coalesce(seller_name_public,'')), 'D')
  ```
- GIN index on `tsvector`.
- Query plan: `EXPLAIN ANALYZE` benchmarked against a 100k-listing seed (Phase 9 perf test).
- Optional: trigram index on `project_name` for substring matches not caught by FTS.

### 4.5 Cart

- Routes: `/cart`.
- API:
  - `POST /api/cart/items` (add) — body: `{ listing_id, quantity }`.
  - `PATCH /api/cart/items/:id` (update quantity).
  - `DELETE /api/cart/items/:id` (remove).
  - `GET /api/cart` (current cart with line items, totals).
- For guests: cart identified by `ccv_cart` httpOnly cookie carrying `guest_token` (UUID v4).
- For logged-in users: cart identified by `buyer_id`. On login, the guest cart is merged: if a `Cart` exists for the user and the same listing is in both, quantities are summed (capped at `quantity_available`).
- Quantity revalidation:
  - On add-to-cart: read `Listing.quantity_available` (live, no cache).
  - On cart view: re-check each item.
  - On quantity update: re-check.
  - If requested > available, return 409 with `available` in the response; UI shows the live available.
- "Reserve" semantics: Phase 5 does **not** reserve CVCs at add-to-cart. Reservation is implicit at order creation in Phase 6. This means a high-demand listing may be added to many carts simultaneously, with last-write-wins at order capture. To reduce the chance of bad UX, the cart UI surfaces a "live: 3 left" indicator that polls every 10 seconds.

### 4.6 Filters and URL state

- All filters are URL-encoded so the catalog state is shareable and SSR-friendly.
- Server component reads `searchParams` and queries `mv_active_listings` directly. No client-side state for filter values.
- Filter chips appear below the search bar; "Clear all" resets to `/marketplace`.

### 4.7 Mobile / responsive

- Marketplace: 1 column < 600px; 2 columns 600–960px; 3 columns 960–1200px; 4 columns ≥ 1200px (capped at 4 for readability).
- Listing detail: stacks vertically on mobile; methodology and documents are accordions below 600px.
- Cart: single-column layout with the summary card sticky on desktop, inline on mobile.

### 4.8 Empty / loading / error states

- Empty marketplace (no approved listings): "No listings match your filters" with a "Clear filters" lime button.
- Empty cart: "Your cart is empty" with a "Browse marketplace" link.
- Loading: skeleton cards (gray-bone rectangle, 3.6px radius, no shimmer to keep aesthetic).
- Error: subtle message in `#84837b` (Drift Ash) — error tokens per `[USER DEPENDENCY]`.

### 4.9 SEO & share

- Listing detail page emits Open Graph and Twitter card meta with project name, vintage, country, and a generic CC Verse banner image.
- `sitemap.xml` lists all approved listings; regenerated on commit via background job.
- `robots.txt` disallows `/buyer/*`, `/seller/*`, `/auditor/*`, `/admin/*`.

---

## 5. Data model changes

- `mv_active_listings` (materialized view) created.
- `Cart`, `CartItem` (new tables).
- Indexes: GIN on `search_tsv`; btree on filter columns.

---

## 6. API surface (new in Phase 5)

```
GET  /api/marketplace/listings        -- filters, search, sort, cursor
GET  /api/marketplace/listings/:id    -- detail
POST /api/marketplace/listings/:id/track-view  -- audit log entry (fire-and-forget)

GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:id
DELETE /api/cart/items/:id
```

---

## 7. Cross-cutting concerns

- **Performance:** server components + ISR; no client-side data fetching for the catalog. The cart uses client-side polling for the "live: N left" indicator; debounced to 1 req/10s per listing.
- **Security:** rate limit on `POST /api/cart/items` (30/min/user) to prevent scrapers. The marketplace is a public endpoint and is not rate-limited per-user; only per-IP at the proxy (60 req/s).
- **Auditability:** listing document downloads and views of approved listings by ID are audit-logged; bulk list views are not.
- **RBAC:** public. Cart requires no auth; guest carts are cookie-bound; login merges.

---

## 8. Test plan

- **Unit:**
  - Cart quantity sum capped at `quantity_available`.
  - Cart merge on login (same listing summed, no dupes).
  - Filter URL round-trip (encode/decode).
- **Integration:**
  - 100k-listing seed → `EXPLAIN ANALYZE` shows GIN index scan, ≤ 50ms.
  - Add-to-cart → cart returns the correct line items.
  - Quantity update when listing's `quantity_available` drops below requested → 409 with live number.
  - Guest cart → login → user cart has all items.
- **E2E:**
  - Guest browses → adds to cart → sees cart.
  - Buyer filters by country + vintage year → URL updates → results match.
  - Buyer adds a listing, listing's `quantity_available` drops to 0 (manually) → cart shows "Sold out" on next view.
  - WCAG 2.1 AA scan on `/marketplace` and `/listing/[id]` passes.

---

## 9. Acceptance criteria

- [ ] Guest can browse the marketplace and view listing details without logging in.
- [ ] Filters and search work; URL is shareable and SSR-rendered.
- [ ] Add to cart and quantity updates work for guests and logged-in users; carts merge on login.
- [ ] Listing detail page shows all FR-B-003 fields and downloads supporting docs via presigned S3 URLs.
- [ ] 100k-listing perf test: search p95 ≤ 1s, page p95 ≤ 2s.
- [ ] WCAG 2.1 AA on every new page.
- [ ] Sold-out listings show the correct state and disable the CTA.
- [ ] No N+1 queries: a single listing-detail page render issues ≤ 3 SQL statements (catalog query, project, batch).

---

## 10. Dependencies on other phases

- Phase 0 (proxy, RBAC, S3, SES, audit, design system).
- Phase 1 (auth, MFA, KYC).
- Phase 2 (Project, CvcBatch, registry).
- Phase 3 (Listing, batch integrity).
- Phase 4 (Auditor approval, `mv_active_listings` refresh).

---

## 11. USER DEPENDENCY

- **[USER DEPENDENCY] Public Seller name disclosure rules** — FRD §2.3.2 says "Seller name (publicly disclosed for verified Sellers)"; confirm the rule (verified = KYC approved; confirm whether Sellers may opt out via a public-profile setting).
- **[USER DEPENDENCY] Currency switcher on the marketplace** — does the public catalog show both INR and USD listings side-by-side, or filter by currency? Proposal: side-by-side, with a currency toggle on the price tag (live FX rate per `[USER DEPENDENCY]`).
- **[USER DEPENDENCY] Live FX rate source** — for any cross-currency display in v1.0. (FRD says the price is locked in the selected currency for 15 minutes at order creation — so FX display is purely for browsing.)
- **[USER DEPENDENCY] Vintage display format** — year only, or year-quarter?
- **[USER DEPENDENCY] Whether to show "X people viewing" / "X sold this month"** — Phase 5 default: no; deferred to v1.1.
- **[USER DEPENDENCY] Map view** — FRD is silent; proposal: defer to v1.1.
- **[USER DEPENDENCY] Featured / curated listings on the landing page** — confirm whether the public landing (`/`) lists curated listings or only marketing copy. Proposal: marketing only in v1.0; curated listings deferred.
- **[USER DEPENDENCY] Open Graph image** — supply a default banner image for OG cards on listing pages.
- **[USER DEPENDENCY] Cart expiry** — confirm 7-day auto-expiry; confirm whether abandoned-cart emails are sent (proposal: out of scope for v1.0).
- **[USER DEPENDENCY] Error / warning color tokens** — confirm exact shades for empty/error states.
- **[USER DEPENDENCY] Cart UI on a KYC-gated checkout** — Phase 6 will introduce KYC gating for high-value Buyers; confirm UX (banner in cart, or hard block at checkout).
- **[USER DEPENDENCY] Guest checkout** — FR-B-004 says "add a listing to a cart and purchase one or more listings in a single checkout" with no explicit guest checkout constraint. FRD §7 UC-04 lists "guest checkout, if enabled in future" as the precondition. Proposal: guest cart allowed, but checkout requires login + KYC (per FRD §7). Confirm.
