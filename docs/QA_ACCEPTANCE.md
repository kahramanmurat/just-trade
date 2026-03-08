# QA Acceptance Criteria — JustTrade

This document provides acceptance test templates for each feature area. A feature is **not releasable** until all applicable acceptance criteria in this document are verified — either by automated test (referenced in `/docs/TEST_STRATEGY.md`) or explicit manual verification noted here.

QA Agent owns this document and the release gate. See `/AGENTS.md` for agent responsibilities.

---

## How to Use This Document

1. Find the epic/feature area being released
2. Run the listed automated tests first
3. Complete the manual verification steps in a staging environment
4. Mark each item `[x]` when verified
5. Sign off: "QA Agent sign-off: [feature] — [date] — all acceptance criteria met"

**Definition of Done for any feature:**
- All automated tests listed in the relevant section pass in CI
- All manual checks marked `[x]`
- Visual regression baseline updated (if UI changed)
- Accessibility audit passes for any new or modified pages/modals
- No open P0 or P1 bugs against this feature
- QA Agent sign-off recorded in the PR description

---

## Bug Severity Matrix

Used to classify bugs found during QA. "No open P0 or P1 bugs" is required before any feature merges to `main`.

| Severity | Definition | Examples | Required action |
|---|---|---|---|
| **P0 — Critical** | Production is broken; data loss or security breach possible; no workaround | Auth bypass, IDOR data leak, payment processing failure, DB corruption | Block merge immediately; hotfix required before any release |
| **P1 — High** | Core feature is broken for all users; no reasonable workaround | Chart fails to load, watchlist prices not updating, subscription upgrade broken, alert never fires | Block feature merge; fix required in current sprint |
| **P2 — Medium** | Feature works with a workaround; affects some users or non-critical paths | Keyboard shortcut doesn't work, visual regression in secondary screen, minor tier enforcement gap | Do not block merge; file GitHub issue; fix in next sprint |
| **P3 — Low** | Cosmetic issue, edge-case UI glitch, documentation discrepancy | Typo in error message, slight layout shift at rare viewport, hover tooltip text wrong | Do not block merge; file GitHub issue; fix when convenient |

**Escalation rule:** Any P0 found in production triggers immediate rollback investigation. P1 in production requires fix within 24 hours. QA Agent files P0/P1 bugs with repro steps and notifies the owning agent directly.

---

## Epic 1: AUTH — Authentication Acceptance

**Automated tests:** `playwright/e2e/auth/` | `tests/integration/webhooks/clerk.test.ts`

### Automated test coverage required
- [ ] AUTH-E2E-1: Email sign-up creates user + default watchlist (Playwright)
- [ ] AUTH-E2E-2: OAuth sign-in establishes session (Playwright, mocked)
- [ ] AUTH-E2E-3: Sign out clears session (Playwright)
- [ ] Protected route redirect when unauthenticated (Playwright)
- [ ] Expired JWT returns 401 on API routes (integration test)
- [ ] Clerk webhook `user.created` idempotent (integration test)

### Manual verification (staging)

**Sign-up flow:**
- [ ] Registration page loads at `/sign-up` without console errors
- [ ] Form validation: empty email → field error shown (not page crash)
- [ ] Form validation: invalid email format → field error shown
- [ ] Form validation: password too short → Clerk validation error shown
- [ ] Successful sign-up → redirected to `/dashboard`
- [ ] `users` table row created with correct `clerk_id` and `email`
- [ ] Default watchlist created (`is_default = true`) for new user
- [ ] Subscription badge shows "Free" on first login

**OAuth flow:**
- [ ] "Continue with Google" button renders and initiates OAuth flow
- [ ] "Continue with GitHub" button renders and initiates OAuth flow
- [ ] After OAuth: session established; user row synced to DB

**Profile:**
- [ ] `/account` page shows correct name, email, and plan
- [ ] Updating display name propagates to Clerk user profile
- [ ] Subscription section shows renewal date for Pro/Premium users

**Sign-out:**
- [ ] Account dropdown shows "Sign Out" option
- [ ] Clicking Sign Out redirects to landing page
- [ ] After sign-out: navigating to `/dashboard` redirects to `/sign-in`
- [ ] After sign-out: direct API call returns 401

---

## Epic 2: DASHBOARD — Layout & Navigation Acceptance

**Automated tests:** `playwright/e2e/dashboard/` | `playwright/a11y/dashboard.test.ts`

### Automated test coverage required
- [ ] Dashboard renders all layout regions without CLS (Playwright)
- [ ] Symbol search opens on `/` hotkey (Playwright)
- [ ] Timeframe change triggers OHLCV request (Playwright network intercept)
- [ ] Tablet right panel hidden at 768px (Playwright viewport test)
- [ ] Accessibility audit: zero critical/serious violations (axe-core)

### Manual verification (staging)

**Layout:**
- [ ] Header: 48px tall, logo visible, symbol display, timeframe selector, account avatar
- [ ] Left toolbar: 40px wide, all 8 tool icons visible, tooltips appear after 400ms hover
- [ ] Chart area: fills remaining viewport without overflow; no horizontal scrollbar at 1440px
- [ ] Right panel: 280px wide, 3 tabs visible (Watchlist, Alerts, Indicators)
- [ ] No layout shift (CLS) after fonts and data load

**Symbol search:**
- [ ] Press `/` → modal opens immediately
- [ ] Press `Ctrl+K` → modal opens immediately
- [ ] Typing "AAPL" → results appear within 500ms, grouped by asset class
- [ ] Keyboard navigation: ↑↓ arrows move selection; Enter loads symbol
- [ ] Press `Esc` → modal closes; focus returns to trigger
- [ ] URL updates to `?symbol=AAPL` after symbol selected

**Timeframe selector:**
- [ ] All timeframe buttons visible: `1m 5m 15m 1h 4h 1D 1W 1M`
- [ ] Free user: `1m 5m 15m 1h 4h` show lock icon; clicking opens upgrade modal
- [ ] Active timeframe button has `--color-accent` background styling
- [ ] Clicking timeframe → OHLCV request fires; chart data changes; URL updates

**Keyboard shortcuts:**
- [ ] All shortcuts from `/docs/PRODUCT_PRINCIPLES.md` Section 6 work correctly
- [ ] Shortcuts do not fire when focus is inside a text input or modal

---

## Epic 3: CHARTING — Chart Functionality Acceptance

**Automated tests:** `playwright/chart/` | `playwright/e2e/chart/`

### Automated test coverage required
- [ ] Candlestick chart renders within 100ms of data available (Playwright timing)
- [ ] Up candles use `#26A69A`, down candles use `#EF5350` (visual regression)
- [ ] Symbol switch clears previous data (Playwright series check)
- [ ] Crosshair OHLCV legend updates on mouse move (Playwright DOM assertion)
- [ ] Weekend/holiday gaps appear as gaps not zeros (data integrity test)
- [ ] Free plan: intraday timeframes gated with upgrade prompt (integration test)

### Manual verification (staging)

**Chart rendering:**
- [ ] Chart loads for AAPL 1D with correct data (bars for weekdays only)
- [ ] Candlestick bars visually correct: higher close = green body, lower close = red body
- [ ] Chart fills entire chart area (no extra whitespace, no clipping)
- [ ] Price scale on right: values visible and correctly decimal-formatted
- [ ] Time scale on bottom: dates/times visible and correctly formatted for selected timeframe
- [ ] Symbol watermark visible at 30% opacity in chart center

**Interactions:**
- [ ] Mouse hover → crosshair appears (thin 1px cross in `--color-text-secondary`)
- [ ] OHLCV legend updates on crosshair move (monospace font, correct O/H/L/C/Vol values)
- [ ] Scroll to zoom: pinching or scroll wheel changes visible bar count
- [ ] Click-drag pans chart into history or forward
- [ ] Chart scroll does not interfere with page scroll outside chart bounds

**Real-time (Pro/Premium users):**
- [ ] WebSocket connects on chart load; connection status = "connected" in Zustand
- [ ] Last candlestick updates in real-time as ticks arrive (no full chart re-render)
- [ ] WebSocket disconnect → after 5 seconds: staleness indicator visible near price
- [ ] WebSocket reconnects automatically; staleness clears on reconnect

**Chart types:**
- [ ] Switching to Line chart: renders correctly; no data loss
- [ ] Switching to Bar chart: renders correctly
- [ ] Switching back to Candlestick: renders correctly

---

## Epic 4: INDICATORS — Technical Indicators Acceptance

**Automated tests:** `playwright/chart/indicators.test.ts` | `tests/unit/lib/chart/indicators.test.ts`

### Automated test coverage required
- [ ] SMA calculation unit tests pass (all edge cases)
- [ ] EMA calculation unit tests pass
- [ ] MACD calculation unit tests pass (histogram = MACD − signal)
- [ ] RSI unit tests pass (always 0–100)
- [ ] Bollinger Bands unit tests pass
- [ ] SMA overlay renders on chart after add (Playwright visual)
- [ ] RSI panel renders below main chart (Playwright DOM check)
- [ ] Free user: adding 3rd indicator blocked server-side (integration test)

### Manual verification (staging)

**Adding indicators:**
- [ ] "Add Indicator" button opens indicator picker modal
- [ ] Picker shows categories: Trend, Momentum, Volatility (search works)
- [ ] Add SMA(20) → overlay line appears on chart; added to Indicators tab
- [ ] Add EMA(9) → second overlay line appears in different color
- [ ] Add RSI(14) → panel appears below main chart with 70/30 reference lines
- [ ] Add MACD(12,26,9) → panel with histogram + signal/MACD lines appears
- [ ] Add Bollinger Bands(20,2) → upper/lower bands + middle line appear on chart

**Configuring indicators:**
- [ ] Click gear icon on SMA in Indicators tab → settings panel opens with period field pre-filled
- [ ] Change period → chart updates in real-time
- [ ] Change color → chart series color updates immediately
- [ ] Close settings → chart retains new settings

**Removing indicators:**
- [ ] Click visibility toggle → indicator hidden on chart; toggle state changes
- [ ] Click trash/remove → indicator removed from chart and Indicators tab immediately
- [ ] Removed indicator is gone after page refresh (not persisted)

**Tier limits:**
- [ ] Free user: first 2 indicators added successfully
- [ ] Free user: adding 3rd indicator → upgrade modal (API also returns 403)
- [ ] Pro user: 10 indicators allowed; 11th blocked
- [ ] Premium user: no indicator limit enforced

---

## Epic 5: DRAWING TOOLS — Chart Annotations Acceptance

**Automated tests:** `playwright/chart/drawings.test.ts` | `tests/integration/api/layouts.test.ts`

### Automated test coverage required
- [ ] Trend line renders after two-click sequence (Playwright)
- [ ] Drawing persists in DB (`chart_drawings` row created) (integration test)
- [ ] Drawing reloads on layout load (E2E test: save layout → reload → drawing present)
- [ ] Delete drawing removes from DB (integration test cascade)

### Manual verification (staging)

**Trend Line:**
- [ ] Select Trend Line tool (`Alt+T`): cursor changes to crosshair; tool icon highlighted in toolbar
- [ ] First click: anchor set (visual handle visible)
- [ ] Second click: line rendered between anchor and new point
- [ ] Switch back to cursor: line remains on chart
- [ ] Click line: selection handles appear
- [ ] Press `Delete` with line selected: line removed from chart immediately

**Fibonacci Retracement:**
- [ ] Select Fibonacci tool (`Alt+F`)
- [ ] Click-drag from high to low: all 6 Fibonacci levels rendered (0%, 23.6%, 38.2%, 50%, 61.8%, 100%)
- [ ] Labels visible next to each level line
- [ ] Level colors follow design tokens

**Rectangle:**
- [ ] Select Rectangle tool (`Alt+R`)
- [ ] Click-drag: rectangle rendered with semi-transparent fill and `--color-accent` border
- [ ] Rectangle handles visible when selected; drag to resize

**Text Label:**
- [ ] Select Text tool (`Alt+L`)
- [ ] Click on chart: text input appears at click location
- [ ] Type text → press Enter: label renders on chart with readable background
- [ ] Click label to select; Delete to remove

**Persistence:**
- [ ] After drawing a trend line: save layout → navigate away → reload layout → trend line re-rendered at exact price/time coordinates
- [ ] After deleting a drawing: save layout → reload layout → drawing not present
- [ ] Drawings associated with layout; switching to different layout switches to that layout's drawings

---

## Epic 6: WATCHLIST — Symbol Watchlists Acceptance

**Automated tests:** `playwright/e2e/watchlist/` | `tests/integration/api/watchlists.test.ts`

### Automated test coverage required
- [ ] Default watchlist created on first login (E2E test)
- [ ] Add symbol adds `watchlist_items` row (integration test)
- [ ] Duplicate symbol in same list returns 409 (integration test)
- [ ] Free tier limit of 10 items enforced server-side (integration test)
- [ ] Remove symbol deletes DB row (integration test)
- [ ] Click watchlist item changes active chart symbol (Playwright E2E)

### Manual verification (staging)

**Default watchlist:**
- [ ] New user sees Watchlist tab with one empty default watchlist
- [ ] Watchlist name displayed as "My Watchlist" (or similar default)

**Adding symbols:**
- [ ] Click "+" button in Watchlist tab → symbol search appears
- [ ] Search "AAPL" → AAPL appears in results
- [ ] Select AAPL → added to list with price, change amount, change percentage
- [ ] Positive change% shown in `#26A69A` with "+" prefix; negative in `#EF5350` with "-" prefix
- [ ] Price value in monospace font

**Live prices:**
- [ ] Prices update in real-time (WebSocket); price cell flashes green/red on update
- [ ] After WebSocket disconnect: prices show staleness indicator after 5 seconds

**Right-click context menu:**
- [ ] Right-click symbol row → context menu appears with options: "Remove from watchlist", "Set alert", "Go to chart"
- [ ] "Remove from watchlist" → item removed from list and DB; no confirmation dialog
- [ ] "Go to chart" → chart changes to that symbol

**Multiple watchlists (Pro user):**
- [ ] "New Watchlist" button appears for Pro users
- [ ] Create new list → named watchlist created; tab selector appears
- [ ] Switch between watchlists via tab selector
- [ ] Pro user at limit (3 lists): "New Watchlist" button → shows limit message
- [ ] Free user: only 1 watchlist allowed; "New Watchlist" → upgrade modal

**Tier limits (server-side):**
- [ ] Free user: 11th item triggers upgrade modal; API returns 403 `plan_limit_exceeded`
- [ ] Pro user: 51st item in a list → 403 from API

---

## Epic 7: ALERTS — Price Alerts Acceptance

**Automated tests:** `playwright/e2e/alerts/` | `tests/integration/api/alerts.test.ts`

### Automated test coverage required
- [ ] Free user: POST /api/alerts returns 403 (integration test)
- [ ] Pro user: create alert with valid body → `alerts` + `alert_rules` rows created (integration test)
- [ ] Pro user at limit (5): returns 403 (integration test)
- [ ] Toggle `is_active` updates DB (integration test)
- [ ] Delete alert cascades `alert_rules` (integration test)
- [ ] Create price alert E2E flow passes (Playwright)

### Manual verification (staging)

**Alert creation:**
- [ ] Click "New Alert" → Alert Creation Modal opens
- [ ] Symbol field pre-filled with active chart symbol (editable)
- [ ] Condition options: "Price above", "Price below", "% change up", "% change down"
- [ ] Threshold input: numeric only; negative not accepted for price conditions
- [ ] Notification method: Email (default on), Browser Push (default off)
- [ ] Save → alert appears in Alerts tab with "Active" badge
- [ ] DB row verified: correct `symbol`, `condition_type`, `threshold`, `is_active = true`

**Alerts tab:**
- [ ] Each row shows: symbol, condition summary, threshold, status badge
- [ ] Triggered alerts show trigger timestamp
- [ ] Status badges: "Active" (blue), "Triggered" (green), "Inactive" (gray)

**Manage alerts:**
- [ ] Toggle switch → `is_active` flips; badge changes; no page reload
- [ ] Delete button → alert removed from tab and DB
- [ ] Alert rules also deleted (cascade verified)

**Tier gates:**
- [ ] Free user: "New Alert" → upgrade modal (button grayed out or gated)
- [ ] Free user: direct API call → 403
- [ ] Pro user: 6th alert attempt → upgrade modal + 403 from API
- [ ] Premium user: no alert limit

**Alert triggering (staging simulation):**
- [ ] Manually call `/api/alerts/trigger` with alert ID → `triggered_at` set; email sent
- [ ] Trigger same alert twice → idempotent; `triggered_at` not reset on second trigger
- [ ] Disabled alert not triggered when `/api/alerts/trigger` called

---

## Epic 8: SAVED LAYOUTS — Layout Persistence Acceptance

**Automated tests:** `playwright/e2e/layouts/` | `tests/integration/api/layouts.test.ts`

### Automated test coverage required
- [ ] Free user: POST /api/layouts returns 403 (integration test)
- [ ] Pro user: create layout creates `saved_layouts` + `indicators` + `chart_drawings` in transaction (integration test)
- [ ] Pro user at limit (5): returns 403 (integration test)
- [ ] GET /api/layouts/:id returns full layout with drawings and indicators (integration test + contract test)
- [ ] DELETE /api/layouts/:id cascades to drawings and indicators (integration test)
- [ ] Save + load layout E2E test passes (Playwright)

### Manual verification (staging)

**Saving a layout:**
- [ ] Add SMA(20) to AAPL 1D chart
- [ ] Draw a trend line
- [ ] Press `Ctrl+S` → Layout Save Modal opens
- [ ] Enter name "My AAPL Analysis" → Save
- [ ] Layout appears in picker immediately
- [ ] DB: `saved_layouts` row with correct symbol/timeframe; `indicators` row for SMA(20); `chart_drawings` row for trend line

**Loading a layout:**
- [ ] Switch active chart to TSLA
- [ ] Open layout picker → select "My AAPL Analysis"
- [ ] Chart switches to AAPL 1D
- [ ] SMA(20) re-rendered as overlay
- [ ] Trend line re-rendered at exact original price/time coordinates

**Default layout:**
- [ ] Check "Set as default for AAPL" when saving
- [ ] Navigate to TSLA, then select AAPL from watchlist
- [ ] Default layout auto-loads (correct indicators and drawings appear)

**Rename and delete:**
- [ ] Open layout picker → rename "My AAPL Analysis" → "Primary Setup"
- [ ] Picker shows updated name
- [ ] Delete "Primary Setup" → removed from picker
- [ ] DB: `saved_layouts` row gone; `indicators` and `chart_drawings` rows also gone (cascade)

**Tier gates:**
- [ ] Free user: "Save Layout" button → upgrade modal
- [ ] Free user: direct API call → 403
- [ ] Pro user: 6th layout → 403 from API + upgrade modal
- [ ] Premium user: no layout limit

---

## Epic 9: BILLING — Subscription Acceptance

**Automated tests:** `playwright/e2e/billing/` | `tests/integration/api/webhooks.stripe.test.ts`

### Automated test coverage required
- [ ] Stripe webhook `customer.subscription.created` sets initial paid plan (integration test)
- [ ] Stripe webhook `customer.subscription.updated` updates `subscriptions.plan` (integration test)
- [ ] Stripe webhook `customer.subscription.deleted` sets `status = 'canceled'` (integration test)
- [ ] Stripe webhook `invoice.payment_failed` sets `status = 'past_due'` (integration test)
- [ ] Webhook replay is idempotent (integration test)
- [ ] Free → Pro upgrade E2E flow passes in Stripe test mode (Playwright)
- [ ] Tier enforcement: Free user API calls blocked at limit (integration test)

### Manual verification (staging, Stripe test mode)

**Upgrade flow:**
- [ ] Free user hits watchlist limit → upgrade modal appears with plan comparison
- [ ] Click "Upgrade to Pro" → Stripe Checkout opens in test mode
- [ ] Complete checkout with Stripe test card `4242 4242 4242 4242`
- [ ] Webhook received and processed: `subscriptions.plan = 'pro'`, `status = 'active'`
- [ ] UI refreshes: subscription badge shows "Pro"
- [ ] Previously locked features now accessible (alerts tab, multiple watchlists)
- [ ] Stripe Customer Portal accessible via "Manage Subscription"

**Plan management:**
- [ ] Pro → Premium upgrade via Stripe Portal: plan changes; new limits apply immediately
- [ ] Pro → Free cancellation via Stripe Portal: `status = 'canceled'`; user retains Pro access until `current_period_end`
- [ ] After `current_period_end` passes: subscription check returns `free`; limits re-enforced

**Payment failure:**
- [ ] `invoice.payment_failed` webhook: `status = 'past_due'`; user retains access (24-hour grace)
- [ ] After grace period: plan treated as `free`; limits enforced
- [ ] Banner shown to `past_due` users: "Update payment method to restore full access"

**Server-side enforcement:**
- [ ] Free user: `POST /api/watchlists` returns 403 when at limit (1 watchlist)
- [ ] Free user: `POST /api/alerts` returns 403
- [ ] Free user: `POST /api/layouts` returns 403
- [ ] Pro user at limits: returns 403 with `plan_limit_exceeded` code
- [ ] Downgraded user: limits re-enforced without requiring re-login

**Webhook security:**
- [ ] Request without `stripe-signature` → 400
- [ ] Request with invalid signature → 400
- [ ] Test with Stripe CLI: `stripe trigger customer.subscription.updated` → processed correctly

---

## Release Sign-Off Template

Copy this into the PR description before merging a feature to `main`:

```markdown
## QA Acceptance Sign-Off

**Feature:** [Epic name and number]
**Tested on:** Staging environment
**Date:** [YYYY-MM-DD]
**QA Agent:** [Agent or reviewer name]

### Automated Tests
- [ ] All Vitest unit tests pass
- [ ] All Vitest integration tests pass
- [ ] All Playwright E2E tests pass
- [ ] Visual regression: no unexpected diffs
- [ ] Accessibility audit: zero critical/serious violations
- [ ] Security tests pass
- [ ] Coverage thresholds met

### Manual Verification
- [ ] All acceptance criteria in `/docs/QA_ACCEPTANCE.md` for [Epic] verified
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested at 1440px, 1024px, 768px viewports
- [ ] No console errors on happy path flows
- [ ] No console errors on error state flows
- [ ] Empty / loading / error states verified

### Known Issues
[List any non-blocking issues deferred to follow-up tickets, or "None"]

**Sign-off:** Implementation meets all acceptance criteria. Ready to merge.
```
