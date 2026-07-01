# UI/UX Fix Plan — CC Verse

> Actionable fix plan derived from the live browser audit (Jul 2026).
> Source: browser walkthrough of all public/auth/buyer/seller/marketplace flows + `DESIGN.md` compliance check.
>
> **Goal:** Move the product from “raw terminal UI” to the INVERSA editorial system — NB International for narrative type, JetBrains Mono for labels/tags only, consistent navigation, and polished forms/empty states.

## Conventions

- **Status**: `pending` → `in_progress` → `done` (or `blocked` / `skipped`). Update the **Task Tracker** section below.
- **ID format**: `UX-<phase>-<n>` (e.g. `UX-A-3` = Phase A, task 3)
- **PR scope**: one task = one PR unless noted. Batch only when changes are tightly coupled (e.g. typography tokens + one page).
- **DoD**: acceptance criteria checked, `npm run typecheck && npm run lint && npm run build` green, manually verified in the browser, reviewer approved. (Automated E2E/unit tests are handled manually by the owner — not part of this plan.)
- **Design reference**: `DESIGN.md` (INVERSA tokens). Do not introduce new colors/fonts without a phase-doc update.

---

## Task Tracker

> **How to update**: change the `Status` cell, add `Owner` (handle) when claimed, `PR` (#number) when opened, and `Notes` for blockers / deferrals.
>
> **Legend** — ⬜ pending · 🟡 in-progress · 🔴 blocked · ⏭ skipped · ✅ done

### Progress

| Metric         | Count  |
| -------------- | ------ |
| ✅ Done        | 0      |
| 🟡 In progress | 0      |
| 🔴 Blocked     | 0      |
| ⏭ Skipped     | 0      |
| ⬜ Pending     | 34     |
| **Total**      | **34** |
| **Completion** | **0 %** |

### By phase

| Group   | Phase        | Focus                         | Total | ✅ | 🟡 | 🔴 | ⏭ | ⬜ |
| ------- | ------------ | ----------------------------- | ----: | -: | -: | -: | -: | -: |
| UX-A    | Phase A      | Quick wins (1–2 days)         |     6 |  0 |  0 |  0 |  0 |  6 |
| UX-B    | Phase B      | Layout & components (3–5 d)   |     7 |  0 |  0 |  0 |  0 |  7 |
| UX-C    | Phase C      | Polish (≈1 week)              |     6 |  0 |  0 |  0 |  0 |  6 |
| UX-D    | Phase D      | Feedback & robustness         |     5 |  0 |  0 |  0 |  0 |  5 |
| UX-A11Y | Accessibility | WCAG / keyboard / motion     |     3 |  0 |  0 |  0 |  0 |  3 |
| UX-BUG  | Bugs         | Functional / copy bugs        |     7 |  0 |  0 |  0 |  0 |  7 |

### Master task list

| ID      | Title                                              | Status | Owner | PR  | Notes |
| ------- | -------------------------------------------------- | :----: | ----- | --- | ----- |
| UX-A-1  | Typography pass — NB for headings/body             |   ⬜   |       |     |       |
| UX-A-2  | Fix listing detail stale “Log in as buyer” copy    |   ⬜   |       |     |       |
| UX-A-3  | Login — single sign-in + role-based redirect       |   ⬜   |       |     |       |
| UX-A-4  | Input placeholders & remove duplicate hints        |   ⬜   |       |     |       |
| UX-A-5  | Demote Sign out; add active nav state              |   ⬜   |       |     |       |
| UX-A-6  | Skeleton loaders for account / KYC                 |   ⬜   |       |     |       |
| UX-B-1  | Rebuild marketplace listing cards                  |   ⬜   |       |     |       |
| UX-B-2  | Unify empty states (single CTA)                    |   ⬜   |       |     |       |
| UX-B-3  | Certificate page layout + Print button             |   ⬜   |       |     |       |
| UX-B-4  | Registry stats row + serial table                  |   ⬜   |       |     |       |
| UX-B-5  | Public nav — inline desktop links                  |   ⬜   |       |     |       |
| UX-B-6  | Auth form buttons — no wrap, consistent components |   ⬜   |       |     |       |
| UX-B-7  | Shared `PageHeader` component (tag + title + intro) |   ⬜   |       |     |       |
| UX-C-1  | Seller register multi-step form                    |   ⬜   |       |     |       |
| UX-C-2  | KYC approved success screen                          |   ⬜   |       |     |       |
| UX-C-3  | Error semantic color (non-lime)                    |   ⬜   |       |     |       |
| UX-C-4  | Surface tokens instead of `#141414`                |   ⬜   |       |     |       |
| UX-C-5  | Mobile responsive audit (375 / 768)                  |   ⬜   |       |     |       |
| UX-C-6  | Hide dev footer tag in production                    |   ⬜   |       |     |       |
| UX-D-1  | Branded error / loading / not-found route boundaries |   ⬜   |       |     |       |
| UX-D-2  | Toast notification system + action feedback          |   ⬜   |       |     |       |
| UX-D-3  | Purchase confirmation + success UX                   |   ⬜   |       |     |       |
| UX-D-4  | Shared currency / date / number formatting utility   |   ⬜   |       |     |       |
| UX-D-5  | Favicon, per-page metadata & social/OG images        |   ⬜   |       |     |       |
| UX-A11Y-1 | Focus-visible rings + keyboard navigation          |   ⬜   |       |     |       |
| UX-A11Y-2 | Contrast audit for muted text (drift-ash small)    |   ⬜   |       |     |       |
| UX-A11Y-3 | prefers-reduced-motion + route-change focus mgmt   |   ⬜   |       |     |       |
| UX-BUG-1 | Marketplace card navigation click                  |   ⬜   |       |     |       |
| UX-BUG-2 | Admin / auditor UI login path                      |   ⬜   |       |     |       |
| UX-BUG-3 | Register success copy vs Phase 1 verify skip       |   ⬜   |       |     |       |
| UX-BUG-4 | Fixed header `pt-[80px]` vs computed nav height    |   ⬜   |       |     |       |
| UX-BUG-5 | Listing quantity input — use shared `Input`        |   ⬜   |       |     |       |
| UX-BUG-6 | Listing buy button — use `LimeButton` not inline   |   ⬜   |       |     |       |
| UX-BUG-7 | `SiteNav` transparent ternary is dead code         |   ⬜   |       |     |       |

---

## Audit summary (context)

| Area | Finding |
| ---- | ------- |
| Typography | JetBrains Mono used for headings/body everywhere; DESIGN.md specifies NB International for display/body |
| Navigation | Public links hidden behind “Menu”; no active state; Sign out visually dominates; admin/auditor excluded from login UI |
| Forms | Underline-only inputs, weak affordance; password placeholder missing on login; redundant 8-char hints on register |
| States | Plain “Loading…” text; sparse empty states; duplicate CTAs on buyer dashboard |
| Components | `LimeButton`/`GhostButton` exist but listing buy uses inline classes; hardcoded `bg-[#141414]` surfaces |
| Bugs | Stale “Log in as buyer” when authenticated; marketplace card click unreliable in browser test |

**Flows verified working:** register → login → marketplace → buy (demo) → certificate → buyer dashboard with purchase.

---

## Phase A — Quick wins (1–2 days)

### UX-A-1 — Typography pass — NB for headings/body

**Problem:** Page titles, body copy, and certificates use `font-jetbrains-mono` at 13–36px. Reads as a dev tool, not INVERSA editorial.

**Scope:**

- Apply `font-nb-international-pro` + design tokens to all `h1`/`h2` and paragraph copy on:
  - `app/(buyer)/buyer/page.tsx`
  - `app/(seller)/seller/page.tsx`
  - `app/marketplace/page.tsx`, `app/marketplace/[listingId]/*`
  - `app/registry/page.tsx`
  - `app/certificate/[certId]/page.tsx`
  - `app/account/page.tsx`, `app/account/security/page.tsx`
  - `app/(admin)/admin/*`, `app/(auditor)/auditor/page.tsx`
  - `components/legal/LegalPage.tsx`
- Page titles: `--text-heading` (58px) or `text-[length:var(--text-heading)]`
- Body: `--text-body` (18px, lh 1.62)
- Keep `font-jetbrains-mono` for: nav, form labels, `DataTag`, buttons, captions
- Auth pages (`login`, `register`, `register/success`, `forgot-password`, `reset-password/[token]`, `verify-email/[token]`): logo/title in NB International, not mono `text-2xl`
- Do not miss the deep/staff pages: `app/seller/listings/new`, `app/seller/projects/new`, `app/(admin)/admin/kyc/*` — they are currently the most "raw terminal" of all

**Acceptance criteria:**

- [ ] No page-level `h1`/`h2`/body paragraph uses JetBrains Mono (labels/tags/buttons excepted)
- [ ] Hero on `/` unchanged (already NB International)
- [ ] Visual check on buyer, seller, marketplace, certificate pages
- [ ] `npm run build` passes

**Files (primary):** dashboard pages above, `app/(auth)/*/page.tsx`, `components/ui/Section.tsx` if shared heading styles added

---

### UX-A-2 — Fix listing detail stale “Log in as buyer” copy

**Problem:** `ListingDetailClient` always renders “Log in as buyer to purchase” even when the buyer is signed in. Purchase works; copy is misleading.

**Scope:**

- Pass `isAuthenticated` and `userRole` from server component parent, or fetch `/api/me` in client on mount
- When authenticated as `BUYER`: hide the login link line; optional “Signed in — demo payment only”
- When unauthenticated: keep current CTA
- When authenticated as non-buyer: show role-appropriate message

**Acceptance criteria:**

- [ ] Logged-in buyer does not see “Log in as buyer”
- [ ] Logged-out visitor still sees login CTA
- [ ] Manual: buy flow still works

**Files:** `app/marketplace/[listingId]/ListingDetailClient.tsx`, `app/marketplace/[listingId]/page.tsx`

---

### UX-A-3 — Login — single sign-in + role-based redirect

**Problem:** Dual “Sign in as buyer” / “Sign in as seller” buttons wrap awkwardly; admin/auditor cannot sign in from UI.

**Scope:**

- Replace two role buttons with one **Sign in** `LimeButton`
- On success, redirect via `getDashboardPath(role)` (`lib/rbac/dashboard.ts`)
- Remove client-side role mismatch check that logs out if role ≠ clicked button (or replace with server-trusted redirect)
- Optional: keep demo auto-fill for empty fields in dev only (document in `.env.example`)

**Acceptance criteria:**

- [ ] Single primary CTA on login page
- [ ] Buyer → `/buyer`, Seller → `/seller`, Admin → `/admin`, Auditor → `/auditor`
- [ ] Invalid credentials show error; no button text wrap on 320px width

**Files:** `app/(auth)/login/page.tsx`

---

### UX-A-4 — Input placeholders & remove duplicate hints

**Problem:** Login password has no placeholder; register shows both placeholder and hint for 8-char rule; listing quantity uses raw `<input>`.

**Scope:**

- `Input` on login: add `placeholder="Your password"` (or similar)
- Register buyer/seller: remove redundant hint **or** placeholder, not both
- Listing detail quantity: use `Input` component or match its focus/border styles

**Acceptance criteria:**

- [ ] Login email + password both have placeholders
- [ ] Register password field has exactly one 8-char guidance element
- [ ] Quantity field matches design system focus state (lime underline)

**Files:** `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/register/seller/page.tsx`, `ListingDetailClient.tsx`, `components/ui/Input.tsx`

---

### UX-A-5 — Demote Sign out; add active nav state

**Problem:** Sign out reads as the primary header action. No indicator for current route.

**Scope:**

- `navSignOutClass`: remove uppercase or use `text-drift-ash` default; lime only on hover
- Add `aria-current="page"` and `!text-bone-vellum` (or lime underline) for active link in `AuthNav`
- Consider moving Sign out into Account page only (stretch — discuss with team)

**Acceptance criteria:**

- [ ] Sign out visually equal or lower weight than Marketplace / Registry / Account
- [ ] Active route distinguishable on marketplace, registry, account pages
- [ ] Keyboard nav and screen reader get `aria-current`

**Files:** `components/nav/navStyles.ts`, `components/nav/AuthNav.tsx`

---

### UX-A-6 — Skeleton loaders for account / KYC

**Problem:** `/account` and `/seller/kyc` show plain “Loading…” before client hydration.

**Scope:**

- Add `components/ui/Skeleton.tsx` (simple pulse bars matching INVERSA — no new accent colors)
- Account: skeleton profile rows (email, role, status)
- KYC: skeleton step header + 3–4 field lines

**Acceptance criteria:**

- [ ] No bare “Loading…” text on account or KYC pages
- [ ] Skeleton layout matches final content structure
- [ ] WCAG: `aria-busy` on loading container

**Files:** `app/account/page.tsx` (or client wrapper), `app/seller/kyc/page.tsx`, new `Skeleton.tsx`

---

## Phase B — Layout & components (3–5 days)

### UX-B-1 — Rebuild marketplace listing cards

**Problem:** Cards have dead space; unclear clickability; click navigation failed in browser audit.

**Scope:**

- Card structure: title → project name → meta line → price + availability → ghost “View listing →”
- Entire card wrapped in `<Link>` with `hover:border-lime-surveyor`
- Verify `pointer-events` and z-index — no nested interactive elements blocking navigation
- Grid: `gap-6`, padding `p-[var(--spacing-21)]`

**Acceptance criteria:**

- [ ] Click anywhere on card navigates to listing detail
- [ ] Hover state visible

**Files:** `app/marketplace/page.tsx`, related card component if extracted

---

### UX-B-2 — Unify empty states (single CTA)

**Problem:** Buyer dashboard duplicates “Browse marketplace” link and button; marketplace empty state is one grey line.

**Scope:**

- Shared `EmptyState` component: title, description, single primary CTA (`LimeButton`)
- Apply to: buyer dashboard (no purchases), marketplace (no listings), seller (no projects) where applicable

**Acceptance criteria:**

- [ ] Each empty state has exactly one primary CTA
- [ ] Copy explains next step in one sentence
- [ ] Uses NB International for description, mono for optional label

**Files:** new `components/ui/EmptyState.tsx`, buyer/marketplace/seller pages

---

### UX-B-3 — Certificate page layout + Print button

**Problem:** Print action looks like plain text; certificate content sparse; mono-heavy.

**Scope:**

- `LimeButton` for Print; `GhostButton` or text link for back navigation
- Metadata grid: cert number, date, project, serials (dl layout like listing detail)
- `@media print` rules: hide `AuthNav`, footer, print button

**Acceptance criteria:**

- [ ] Print is clearly a button
- [ ] Certificate readable in NB body font
- [ ] Print preview hides chrome

**Files:** `app/certificate/[certId]/page.tsx`, `PrintButton.tsx`, `CertificateBackLink.tsx`

---

### UX-B-4 — Registry stats row + serial table

**Problem:** Three tall narrow stat cards with wasted vertical space; no browseable serial list.

**Scope:**

- Horizontal stat row on `md+` breakpoints
- Paginated table of registry entries (serial, state, project) using existing `registry/queries`
- Retired count uses muted styling (already partially done)

**Acceptance criteria:**

- [ ] Stats readable in one row on desktop
- [ ] Table shows at least serial + state + project id
- [ ] Pagination or “load more” for large datasets

**Files:** `app/registry/page.tsx`, possibly new client table component

---

### UX-B-5 — Public nav — inline desktop links

**Problem:** Landing page hides Sign in / Marketplace / Registry behind Menu dropdown.

**Scope:**

- Desktop (`md+`): show Marketplace, Registry, Sign in inline; Register as ghost or link
- Mobile: keep Menu drawer
- Add Register to menu items

**Acceptance criteria:**

- [ ] ≥3 nav targets visible without opening menu on desktop
- [ ] Menu still works on mobile; Escape closes
- [ ] Transparent hero header variant still works on `/`

**Files:** `components/nav/PublicNav.tsx`

---

### UX-B-6 — Auth form buttons — no wrap, consistent components

**Problem:** Register page still has dual role buttons; inconsistent with UX-A-3 if login simplified.

**Scope:**

- Register buyer: single “Create account” button
- Register seller: single “Register as seller” (role implied by route)
- Remove “Register as buyer” from seller page footer or demote to text link
- Ensure `whitespace-nowrap` and adequate min-width on auth buttons

**Acceptance criteria:**

- [ ] No two-line button labels at 375px width
- [ ] All auth actions use `LimeButton` / `GhostButton`

**Files:** `app/(auth)/register/page.tsx`, `app/register/seller/page.tsx`

---

### UX-B-7 — Shared `PageHeader` component

**Problem:** Every inner page hand-rolls the same block — `<DataTag>` + `<h1>` + intro `<p>` — with slightly different sizes, spacing, and (per UX-A-1) the wrong font. That inconsistency is exactly what reads as "unfinished." Marketplace, listing detail, registry, buyer, seller, account, and admin pages all repeat it.

**Scope:**

- New `components/ui/PageHeader.tsx`: `eyebrow` (DataTag, mono), `title` (NB International, `--text-heading`), optional `description` (NB body), optional `actions` slot (right-aligned button, e.g. buyer's "Browse marketplace")
- Replace the ad-hoc header blocks on the pages above with `PageHeader`
- Encapsulates the UX-A-1 typography decision in one place so future pages inherit it for free

**Acceptance criteria:**

- [ ] `PageHeader` used on ≥5 inner pages
- [ ] Title/eyebrow/description fonts match DESIGN.md roles
- [ ] `actions` slot renders buyer dashboard CTA without duplicate-CTA regression (see UX-B-2)

**Files:** new `components/ui/PageHeader.tsx`; buyer/seller/marketplace/registry/account pages

---

## Phase C — Polish (≈1 week)

### UX-C-1 — Seller register multi-step form

**Problem:** Seven fields in one long scroll; no progress indicator.

**Scope:**

- Steps: (1) Account, (2) Entity, (3) Review & submit
- Step indicator component (mono labels, lime active step)
- Persist form state between steps client-side

**Acceptance criteria:**

- [ ] User sees progress (Step 1 of 3)
- [ ] Back navigation preserves entered data

**Files:** `app/register/seller/page.tsx`, possible step components

---

### UX-C-2 — KYC approved success screen

**Problem:** Approved sellers see disabled readonly fields; unclear next action.

**Scope:**

- When `kycStatus === APPROVED`: replace form with success summary + CTAs “Go to dashboard”, “Create listing”
- Keep entity summary read-only in collapsed section if needed

**Acceptance criteria:**

- [ ] Approved state does not show disabled input fields as primary UI
- [ ] Primary CTA visible above fold

**Files:** `app/seller/kyc/page.tsx` (+ client components)

---

### UX-C-3 — Error semantic color (non-lime)

**Problem:** Errors use `text-lime-surveyor` — accent color, not semantic error.

**Scope:**

- Add `--color-error` or reuse `bone-vellum` + `border-lime-surveyor` for focus only
- Update `Input` error text, login/register alerts
- Ensure WCAG contrast on error messages

**Acceptance criteria:**

- [ ] Error text is not lime-surveyor
- [ ] Focus ring remains lime per DESIGN.md
- [ ] Document token in `styles/tokens.css` if new

**Files:** `components/ui/Input.tsx`, auth pages, `styles/tokens.css`

---

### UX-C-4 — Surface tokens instead of `#141414`

**Problem:** Panels use hardcoded `bg-[#141414]` instead of design tokens.

**Scope:**

- Add `--color-surface-raised` (or use obsidian-loam + border) to tokens
- Replace `#141414` in auth forms, listing sidebar, admin cards, KYC containers

**Acceptance criteria:**

- [ ] No `bg-[#141414]` in `app/` or `components/` (grep clean)
- [ ] Visual parity with current UI

**Files:** `styles/tokens.css`, `app/globals.css`, affected pages

---

### UX-C-5 — Mobile responsive audit (375 / 768)

**Problem:** Audit was desktop-focused; auth buttons, nav, and cards may break on small screens.

**Scope:**

- Test all routes at 375px and 768px
- Fix: header overflow, card grid, certificate border margins, seller form scroll
- Document breakpoints in PR

**Acceptance criteria:**

- [ ] No horizontal scroll on 375px for main flows
- [ ] Touch targets ≥44px for primary actions

**Files:** various; list in PR description

---

### UX-C-6 — Hide dev footer tag in production

**Problem:** Footer shows “Build: dev” on every page.

**Scope:**

- Show build env only when `NODE_ENV !== 'production'` or `APP_ENV=dev`
- Keep in footer for local/staging if useful

**Acceptance criteria:**

- [ ] Production build footer does not show “dev”
- [ ] Local dev still shows build metadata

**Files:** `components/landing/Footer.tsx`, `lib/env.ts` if needed

---

## Phase D — Feedback & robustness

> These are the "feels professional" pieces the original audit didn't cover: what the app does when something loads, fails, succeeds, or is typed as a number. Missing these is the single biggest gap between "works" and "polished."

### UX-D-1 — Branded error / loading / not-found route boundaries

**Problem:** There are **no** `error.tsx`, `loading.tsx`, `not-found.tsx`, or `global-error.tsx` files anywhere in `app/`. A thrown server error (e.g. Convex unreachable) or a bad URL (`/marketplace/does-not-exist`) shows the unstyled Next.js default — the most unprofessional state a user can hit.

**Scope:**

- `app/not-found.tsx` — branded 404 (INVERSA canvas, NB heading, mono caption, `LimeButton` back to home / marketplace)
- `app/error.tsx` (client) — friendly "Something went wrong" with a Try again (`reset()`) action; log the digest, never expose stack traces
- `app/global-error.tsx` — minimal fallback for root-layout failures
- Route-level `loading.tsx` for data-fetching segments: `marketplace`, `marketplace/[listingId]`, `registry`, `(buyer)/buyer`, `(seller)/seller`, `certificate/[certId]` — reuse the `Skeleton` from UX-A-6
- Call `notFound()` in the listing/certificate server components when the record is missing (instead of rendering an empty page)

**Acceptance criteria:**

- [ ] Bad listing/certificate URL renders branded 404, HTTP 404
- [ ] A forced server throw renders branded error page, not the Next default
- [ ] Each listed route shows a skeleton (not a blank flash) on slow navigation
- [ ] No raw stack trace visible in production

**Files:** new `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, per-segment `loading.tsx`; `marketplace/[listingId]/page.tsx`, `certificate/[certId]/page.tsx`

---

### UX-D-2 — Toast notification system + action feedback

**Problem:** State-changing actions give little or no confirmation. Sign out just navigates. KYC/project/listing submit and buyer purchase either redirect silently or only surface inline text on error. Users are left unsure whether an action worked.

**Scope:**

- Lightweight toast provider (mount in `app/layout.tsx`), INVERSA-styled: obsidian surface, lime accent for success, semantic error color from UX-C-3, mono copy, no shadow, 3.6px radius, auto-dismiss + manual close
- Accessible: `role="status"` / `aria-live="polite"` region (assertive for errors)
- Wire success/error toasts to: login failure, sign out, listing create, project create, KYC submit, purchase (see UX-D-3), password reset request
- Respect `prefers-reduced-motion` (UX-A11Y-3) for enter/exit

**Acceptance criteria:**

- [ ] Each wired action shows a toast on success and on error
- [ ] Toasts announced to screen readers via live region
- [ ] Toasts do not shift layout; dismiss on click and after timeout

**Files:** new `components/ui/Toast.tsx` + provider/hook, `app/layout.tsx`, the mutation callers above

---

### UX-D-3 — Purchase confirmation + success UX

**Problem:** `ListingDetailClient.handleBuy` posts and immediately `router.push`es to the certificate. There is no review step, no "you're buying N credits for X" confirmation, and the trigger is an inline-styled "Buy (demo pay)" button. For a money flow (even demo), this feels unfinished and error-prone.

**Scope:**

- Confirmation step before submit: summary of quantity, unit price, computed total, project + serial count (accessible modal or an inline confirm panel)
- On success: brief success toast (UX-D-2) then navigate to certificate; keep the button in a `loading`/disabled state to prevent double-submit
- Uses formatting from UX-D-4 for price/total
- Folds in UX-BUG-6 (buy button → `LimeButton`)

**Acceptance criteria:**

- [ ] User confirms quantity + total before the order is created
- [ ] Double-click cannot create two orders
- [ ] Success feedback shown before/with the certificate redirect

**Files:** `app/marketplace/[listingId]/ListingDetailClient.tsx`, possible `components/ui/Modal.tsx`

---

### UX-D-4 — Shared currency / date / number formatting utility

**Problem:** Values are rendered raw: `{listing.currency} {listing.unitPrice}`, `totalAmount`, quantities, and `new Date(order.createdAt).toLocaleDateString()`. No thousands separators, inconsistent currency placement, locale-dependent dates. Small thing, big "professional" signal.

**Scope:**

- `lib/format/index.ts`: `formatCurrency(amount, currency)` (Intl.NumberFormat), `formatNumber(n)`, `formatDate(ts)` / `formatDateTime(ts)` — fixed `en-*` locale per the English-only invariant
- Replace raw interpolations across marketplace, listing detail, buyer dashboard, certificate, seller/admin

**Acceptance criteria:**

- [ ] Prices and totals use grouped digits + consistent currency formatting
- [ ] Dates render via one helper, deterministic locale (no server/client mismatch)
- [ ] `grep` shows no remaining raw `currency} {`/`toLocaleDateString()` in page components

**Files:** new `lib/format/index.ts`, the pages above

---

### UX-D-5 — Favicon, per-page metadata & social/OG images

**Problem:** `public/` is empty (no favicon, no OG image) and most inner pages export no `metadata`, so browser tabs and shared links look unbranded. Only the root layout + marketplace set titles.

**Scope:**

- Add `app/icon.svg` / favicon + `apple-icon` (INVERSA lime-on-obsidian mark)
- Add `app/opengraph-image.tsx` (or static) using brand type/colors; default OG for shared links
- Add `export const metadata` (title + description) to public/inner pages missing it: registry, listing detail (dynamic `generateMetadata` with listing title), certificate, account, legal pages, auth pages
- Keep `robots`/`metadataBase` as-is (already correct in `app/layout.tsx`)

**Acceptance criteria:**

- [ ] Favicon shows in the browser tab
- [ ] Each primary route has a distinct `<title>` and description
- [ ] Listing detail title reflects the listing name
- [ ] Sharing a URL yields a branded OG preview

**Files:** `app/icon.svg`, `app/opengraph-image.tsx`, `metadata`/`generateMetadata` in the pages above

---

## Accessibility (WCAG 2.1 AA)

> CLAUDE.md makes WCAG 2.1 AA a Phase-0 architectural invariant. The audit only spot-checked it; these tasks make it real and testable.

### UX-A11Y-1 — Focus-visible rings + keyboard navigation

**Problem:** Inputs get `focus:outline-none focus:border-lime-surveyor`, but buttons and links have no consistent visible focus indicator, and `focus:outline-none` without a replacement is a keyboard-a11y regression. DESIGN.md calls for focus rings.

**Scope:**

- Global `:focus-visible` treatment (lime ring / underline) in `app/globals.css` — never remove focus outline without an equivalent visible state
- Apply to `LimeButton`, `GhostButton`, nav links, card links, `PublicNav` menu
- `PublicNav` menu: focus first item on open, return focus to trigger on close/Escape (Escape already wired)
- Verify tab order matches visual order on login, marketplace, listing detail

**Acceptance criteria:**

- [ ] Every interactive element has a visible focus state (keyboard only)
- [ ] Menu is operable and focus-managed via keyboard

**Files:** `app/globals.css`, `components/ui/*Button.tsx`, `components/nav/*`

---

### UX-A11Y-2 — Contrast audit for muted text (drift-ash on obsidian)

**Problem:** `drift-ash (#84837b)` on `obsidian-loam (#13140e)` is ≈3.6:1 — **below the 4.5:1 AA minimum for normal text** — yet it carries most secondary copy at 11–13px (marketplace meta, dashboard sublines, "Demo mode" note, captions). DESIGN.md reserves drift-ash for placeholder/low-emphasis, not body-adjacent text.

**Scope:**

- Audit every `text-drift-ash` at <18px used for meaningful (non-placeholder) content
- Where it fails AA, promote to `bone-vellum` or introduce a compliant muted token (document in `styles/tokens.css`; do **not** add a new hue)
- Keep drift-ash only for true placeholders / disabled / decorative labels
- Verify error text (post UX-C-3) and lime-on-obsidian both pass

**Acceptance criteria:**

- [ ] No informational text <18px fails 4.5:1 (spot-check the top offenders with a contrast tool)
- [ ] Placeholder/disabled states may remain drift-ash (exempt)
- [ ] Token change (if any) documented; no second accent introduced

**Files:** `styles/tokens.css`, marketplace/buyer/seller/listing-detail/account pages

---

### UX-A11Y-3 — prefers-reduced-motion + route-change focus management

**Problem:** No `prefers-reduced-motion` handling for hover/toast transitions; on client navigation focus is not moved to the new page's heading/`#main`, so screen-reader/keyboard users lose their place.

**Scope:**

- Global `@media (prefers-reduced-motion: reduce)` to disable non-essential transitions
- On route change, move focus to `#main` or the page `<h1>` (small client helper in layouts that use `AuthNav`)
- Ensure the existing "Skip to main content" link lands on a focusable `#main`

**Acceptance criteria:**

- [ ] Reduced-motion users get no animated transitions
- [ ] After navigation, focus is on the new page's main region/heading
- [ ] Skip link works on every layout

**Files:** `app/globals.css`, layout/nav components

---

## Bugs — functional / copy

### UX-BUG-1 — Marketplace card navigation click

**Problem:** Browser audit: card click did not navigate (may be link/pointer-events issue).

**Scope:** Debug and fix in same PR as UX-B-1 or separately if root cause found earlier.

**Acceptance criteria:**

- [ ] Manual: click listing card → detail URL

---

### UX-BUG-2 — Admin / auditor UI login path

**Problem:** No UI path for staff roles (blocked until UX-A-3 unless separate staff login added).

**Scope:**

- Covered by UX-A-3 single sign-in redirect
- If MFA required for admin/auditor, ensure redirect to MFA challenge (future)

**Acceptance criteria:**

- [ ] `admin@ccverse.local` can reach `/admin` after UI login
- [ ] Document seed admin in README or `.env.example`

---

### UX-BUG-3 — Register success copy vs Phase 1 verify skip

**Problem:** Success page says “check your email” but Phase 1 creates active users without email challenge.

**Scope:**

- Align copy with actual behavior OR wire verification token + email (Phase 2)
- Short-term: “Account created — you can sign in now” with link to login

**Acceptance criteria:**

- [ ] Copy matches what user can actually do next

**Files:** `app/(auth)/register/success/page.tsx`

---

### UX-BUG-4 — Fixed header offset

**Problem:** Pages use `pt-[80px]`; header height may not match computed nav height.

**Scope:**

- Measure header (logo + `py-[spacing-21]` + border)
- Use CSS variable `--header-height` set on header or layout

**Acceptance criteria:**

- [ ] No content hidden under fixed nav
- [ ] Consistent offset across all `AuthNav` pages

**Files:** `components/nav/AuthNav.tsx`, page layouts using `pt-[80px]`

---

### UX-BUG-5 — Listing quantity input — shared Input

**Problem:** Raw `<input>` on listing detail bypasses design system.

**Scope:** Fold into UX-A-4 or separate small PR.

**Acceptance criteria:**

- [ ] Quantity uses `Input` or shared input class string exported from `Input.tsx`

---

### UX-BUG-6 — Listing buy button — use `LimeButton` not inline classes

**Problem:** The purchase button on `ListingDetailClient` is a raw `<button>` with `bg-lime-surveyor … hover:bg-marsh-olive` inline classes and reads "Buy (demo pay)". It bypasses the design system and diverges from `LimeButton` states.

**Scope:** Replace with `LimeButton` (fold into UX-D-3). Keep demo-mode note as a caption below.

**Acceptance criteria:**

- [ ] Buy action uses `LimeButton` with consistent loading/disabled states

---

### UX-BUG-7 — `SiteNav` / `PublicNav` transparent ternary is dead code

**Problem:** In `PublicNav`, `const textClass = transparent ? 'text-bone-vellum' : 'text-bone-vellum'` — both branches are identical, so the transparent hero variant renders the same as the solid one (no intended contrast difference over imagery).

**Scope:** Either remove the dead ternary or implement the real transparent-over-hero treatment. Decide with UX-B-5.

**Acceptance criteria:**

- [ ] No identical-branch ternary remains
- [ ] Hero nav legibility verified over the (future) hero background

**Files:** `components/nav/PublicNav.tsx`

---

## Manual verification

> Automated E2E (Playwright) and unit tests are **out of scope for this plan** — the owner verifies flows manually. For each task, before marking it done: run `npm run typecheck && npm run lint && npm run build`, then walk the affected flow in the browser at desktop and 375px width. Suggested smoke paths after UI changes:

- Marketplace list → card → listing detail
- Buyer purchase → confirm → certificate
- Public nav links + legal pages load (200)
- Login single button → role-based redirect
- Bad URL → branded 404; forced throw → branded error page
- Keyboard-only pass: tab reaches all CTAs with a visible focus state

---

## Recommended execution order

1. **UX-A-1** (typography) — highest visual impact; do first so later PRs don’t conflict
2. **UX-D-1** (error/loading/404) — do early; it de-risks every other flow and stops the worst unprofessional states
3. **UX-A-3** + **UX-BUG-2** (login) — unblocks staff testing
4. **UX-A-2**, **UX-A-4**, **UX-A-5**, **UX-A-6** — parallelizable
5. **UX-D-4** (formatting) + **UX-B-7** (PageHeader) — shared primitives later PRs reuse
6. **UX-B-1** + **UX-BUG-1** (marketplace)
7. **UX-D-2** (toasts) → **UX-D-3** (purchase confirm) — feedback layer
8. **UX-B-2**, **UX-B-3**, **UX-B-4**, **UX-B-5**, **UX-B-6**, **UX-D-5**
9. **UX-A11Y-1/2/3** — verify after layout settles
10. Phase C + remaining bugs

**Dependency notes:** UX-A11Y-1 pairs with UX-B-5 (menu focus); UX-C-3 (error color) should land before UX-D-2 (toasts) so error toasts use the semantic color; UX-A-6 (Skeleton) is a prerequisite for UX-D-1 loading states.

---

## Out of scope (this plan)

- Real brand photography on hero (`FullBleedImage` asset — USER DEPENDENCY in phase docs). **Note:** `public/` currently has no imagery at all, so the INVERSA "full-bleed satellite" aesthetic is entirely absent. Sourcing/licensing the hero + section imagery is a blocking USER DEPENDENCY; until then pages sit on the flat obsidian canvas. Flag this to stakeholders — it's the largest single "does not look like the design" gap and cannot be closed by code alone.
- Full legal copy for Terms/Privacy/Cookie pages
- Payment gateway UI (Phase 6+)
- MFA UI polish for admin/auditor (Phase 1+ TOTP flows)

---

## References

- `DESIGN.md` — INVERSA tokens, typography roles, button specs
- `components/ui/LimeButton.tsx`, `GhostButton.tsx`, `Input.tsx`, `DataTag.tsx`
- `components/nav/PublicNav.tsx`, `AuthNav.tsx`, `navStyles.ts`
- Browser audit screenshots: `audit-01-landing.png` … `audit-06-seller-dashboard.png` (Jul 2026 session)
