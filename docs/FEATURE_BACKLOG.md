# Feature Backlog — JustTrade

Status legend: `[ ]` = Todo | `[~]` = In Progress | `[x]` = Done

**Completion rule:** An epic is not done until its Validation Steps are all satisfied. See `/docs/QA_ACCEPTANCE.md` for full acceptance templates and sign-off process. See `/docs/VALIDATION_CHECKLIST.md` for gate-by-gate checklists.

**Phase alignment (from `/docs/PRD.md`):**
- **Phase 1 (MVP — launch):** Epics 1, 2, 3, 6, 9 (auth, dashboard, basic charting, watchlist, billing)
- **Phase 2 (Month 2–3):** Epics 4, 5, 7, 8 (indicators, drawings, alerts, saved layouts)
- Phase 2 epics are in this backlog and fully speced; they may be developed in parallel with Phase 1 but are not required for initial launch.

---

## Epic 1: AUTH — Authentication & User Management

**Goal:** Users can create accounts, sign in securely, and manage their profile and subscription status.

### User Stories

**AUTH-1:** As a new user, I can sign up with email and password so that I can access JustTrade.
- Acceptance: Registration form with email/password validation; Clerk account created; user row synced to `users` table; redirected to dashboard.

**AUTH-2:** As a user, I can sign in with my Google or GitHub account (OAuth) so that I can skip password management.
- Acceptance: OAuth flow via Clerk; account linked or created; session established; redirected to dashboard.

**AUTH-3:** As a signed-in user, I can view my profile (name, email, plan) and update my display name.
- Acceptance: Profile page at `/account`; displays Clerk user info + subscription plan from DB; name update propagates to Clerk.

**AUTH-4:** As a user, I can see my current subscription status (Free/Pro/Premium) and its renewal date.
- Acceptance: Subscription badge visible in account menu; data fetched from `subscriptions` table.

**AUTH-5:** As a user, I can sign out from any page.
- Acceptance: Logout option in account dropdown; Clerk session cleared; redirected to landing page.

### Validation Steps (AUTH)
- [ ] Playwright E2E: email sign-up → `users` row created → default watchlist created → redirected to dashboard
- [ ] Playwright E2E: OAuth sign-in flow (mocked) completes without error
- [ ] Playwright E2E: sign-out clears session; protected routes redirect to `/sign-in`
- [ ] Integration test: expired/tampered JWT returns 401 on all `/api/*` routes
- [ ] Integration test: Clerk `user.created` webhook is idempotent
- [ ] Manual: subscription badge shows "Free" for new user
- [ ] Manual: profile page shows correct name, email, and plan
- [ ] Accessibility: zero axe violations on `/sign-in` and `/sign-up`
- [ ] Security: all `/api/*` routes return 401 when unauthenticated (automated)
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 1 template

---

## Epic 2: DASHBOARD — Layout & Navigation

**Goal:** The main application shell loads correctly and renders all panels in the correct layout.

### User Stories

**DASH-1:** As a user, I see the full dashboard layout (header + left toolbar + chart area + right panel) on page load.
- Acceptance: All layout regions render without CLS; chart area fills available viewport; no horizontal scroll on ≥1024px viewport.

**DASH-2:** As a user, I can search for a symbol (e.g., AAPL, BTC/USD) using the search bar and have the chart update.
- Acceptance: `/` or `Ctrl+K` opens symbol search modal; debounced search calls API; results grouped by asset class; pressing Enter or clicking loads symbol; URL updates to `?symbol=AAPL`.

**DASH-3:** As a user, I can change the active timeframe via the header selector and the chart data reloads.
- Acceptance: Clicking timeframe button triggers OHLCV data fetch for selected interval; chart re-renders with correct data; URL updates with timeframe param.

**DASH-4:** As a tablet user (768–1023px), the right panel is hidden by default and can be opened via a toggle button.
- Acceptance: Right panel hidden at tablet breakpoint; visible toggle button; panel opens as overlay; closes on outside click.

### Validation Steps (DASHBOARD)
- [ ] Playwright E2E: full layout renders without CLS at 1440px, 1024px, 768px
- [ ] Playwright: symbol search opens on `/` and `Ctrl+K`; keyboard navigation works; URL updates
- [ ] Playwright: timeframe selector fires OHLCV request; URL updates; active button styled correctly
- [ ] Playwright viewport test: right panel hidden at 768px; toggle works
- [ ] Visual regression: dashboard baseline snapshot at all 4 tested viewport widths
- [ ] Accessibility: zero axe violations on `/dashboard`
- [ ] Manual: no console errors on initial dashboard load
- [ ] Manual: all keyboard shortcuts from `/docs/PRODUCT_PRINCIPLES.md` Section 6 work
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 2 template

---

## Epic 3: CHARTING — Core Chart Functionality

**Goal:** Users can view accurate, interactive candlestick charts with standard chart interactions.

### User Stories

**CHART-1:** As a user, I see a candlestick chart for the active symbol with OHLCV data loaded from the API.
- Acceptance: Chart renders within 100ms of data load; candlesticks color-coded (up: `#26A69A`, down: `#EF5350`); correct OHLCV values displayed.

**CHART-2:** As a user, I can switch between chart types: Candlestick, Bar, and Line.
- Acceptance: Chart type selector in UI; lightweight-charts series type switches dynamically without page reload.

**CHART-3:** As a user, I can zoom in/out on the chart using scroll/pinch and pan left/right by clicking and dragging.
- Acceptance: Native lightweight-charts scroll + drag behavior enabled; chart does not interfere with page scroll outside chart bounds.

**CHART-4:** As a user, I see a crosshair that follows my cursor showing the exact price and timestamp.
- Acceptance: Crosshair visible on hover; OHLCV legend in top-left updates in real-time as crosshair moves; values in monospace font.

**CHART-5:** As a Pro/Premium user, I see real-time price updates on the active chart symbol.
- Acceptance: WebSocket connected on mount; latest candle updates in real-time; stale connection shows staleness indicator.

**CHART-6:** As a Free user, I only see 1D and 1W timeframes; other timeframes are gated with an upgrade prompt.
- Acceptance: Intraday timeframes (1m–4h) show lock icon; clicking opens upgrade modal with plan comparison.

**CHART-7:** As a user, I only see chart history appropriate to my subscription tier.
- Acceptance: Free users see at most 1 year of historical OHLCV bars; Pro users see at most 5 years; Premium users see full available history. Enforcement is server-side: the `/api/ohlcv` route calculates `from` date based on `subscriptions.plan` before calling the market data provider. The client never controls the history depth — only timeframe and symbol. A Free user requesting `from=2018-01-01` receives data starting from `now() - 1 year` instead, with a response header `X-Data-Trimmed: true`.

### Validation Steps (CHARTING)
- [ ] Playwright timing: chart renders within 100ms of data available (measured via `performance.now()`)
- [ ] Visual regression: candlestick colors correct (`#26A69A` up, `#EF5350` down)
- [ ] Playwright: crosshair visible on hover; OHLCV legend updates on mouse move
- [ ] Playwright: scroll zoom changes visible range; click-drag pans chart; no page scroll interference
- [ ] Playwright: real-time tick updates last candle without full re-render
- [ ] Playwright: WebSocket disconnect → staleness indicator after 5s; reconnect clears it
- [ ] Playwright: Free user clicking intraday timeframe shows upgrade modal
- [ ] Data integrity: weekend/holiday bars appear as gaps (manual verification with 1D chart)
- [ ] Unit tests: all indicator calculations pass (SMA, EMA, MACD, RSI, BB) with edge cases
- [ ] Performance: OHLCV API p95 < 50ms cache hit, < 300ms cache miss (verified in staging)
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 3 template

---

## Epic 4: INDICATORS — Technical Indicators

**Goal:** Users can add overlay and panel indicators to the chart and configure their parameters.

**Tier gate:** Pro users get 10 indicators; Free users get 2; Premium is unlimited.

### User Stories

**IND-1:** As a user, I can open the indicator picker and add an SMA (Simple Moving Average) to the chart.
- Acceptance: Indicator picker modal lists available indicators; SMA selected → params input (period, source); added as overlay series on chart; appears in Indicators tab.

**IND-2:** As a user, I can add the following overlay indicators: SMA, EMA, Bollinger Bands.
- Acceptance: Each renders as a correct line/band overlay; colors differentiated; legend updated.

**IND-3:** As a user, I can add the following panel indicators: MACD, RSI.
- Acceptance: Panel indicators render in a separate pane below the main chart; MACD has histogram + signal/MACD lines; RSI has overbought/oversold levels at 70/30.

**IND-4:** As a user, I can click an indicator in the Indicators tab to edit its parameters (period, color).
- Acceptance: Settings panel/modal opens with current values; changes apply to chart in real-time.

**IND-5:** As a user, I can toggle an indicator's visibility or remove it.
- Acceptance: Eye icon toggles visibility; trash icon removes; indicator removed from chart immediately.

### Validation Steps (INDICATORS)
- [ ] Unit tests: SMA, EMA, MACD, RSI, Bollinger Bands — all calculations pass with edge cases (period > data length, empty input, alternating up/down for RSI)
- [ ] Unit tests: `canAddIndicator(plan, count)` — boundary values for Free (2), Pro (10), Premium (unlimited)
- [ ] Playwright: SMA(20) overlay renders on chart after adding via picker
- [ ] Playwright: RSI panel renders below main chart with 70/30 reference lines
- [ ] Playwright: indicator removed from chart immediately after clicking remove
- [ ] Integration test: Free user adding 3rd indicator → API returns 403 `plan_limit_exceeded`
- [ ] Integration test: Pro user adding 11th indicator → 403
- [ ] Manual: each indicator type renders visually correct with expected shape/values
- [ ] Manual: indicator settings persist after parameter change (color, period)
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 4 template

---

## Epic 5: DRAWING TOOLS — Chart Annotations

**Goal:** Users can draw annotations on the chart that persist to the database with their saved layout.

### User Stories

**DRAW-1:** As a user, I can select the Trend Line tool and draw a line between two price points.
- Acceptance: Click to set point 1; click to set point 2; line renders on chart; deselects back to cursor tool.

**DRAW-2:** As a user, I can draw a Fibonacci Retracement between two price extremes.
- Acceptance: Fibonacci levels (0%, 23.6%, 38.2%, 50%, 61.8%, 100%) render as horizontal lines with labels; colors follow design tokens.

**DRAW-3:** As a user, I can draw a Rectangle on the chart to highlight a price range.
- Acceptance: Click-drag to define rectangle bounds; semi-transparent fill; border in accent color.

**DRAW-4:** As a user, I can add a Text Label at a specific price/time location.
- Acceptance: Click location; text input appears; label renders on chart; styled with readable background.

**DRAW-5:** As a user, I can delete a drawing by selecting it and pressing `Delete` or using the eraser tool.
- Acceptance: Click to select drawing (handles appear); Delete key or eraser removes it; change persisted to DB.

**DRAW-6:** As a user, my drawings are saved to my layout and reload when I return to the same symbol/layout.
- Acceptance: Drawings stored as `chart_drawings` rows; fetched and re-rendered on chart load; associated with the currently active `saved_layout`. "Active layout" is defined as: (1) the layout explicitly selected by the user in the layout picker, or (2) the layout with `is_default = true` for the current symbol if no explicit selection was made, or (3) no layout (drawings not persisted) if no default exists and no layout has been selected. When no layout is active, drawings are ephemeral — they exist only in memory and are discarded on symbol change or page reload. An ephemeral drawing session prompts the user to save a layout when attempting to navigate away.

### Validation Steps (DRAWING TOOLS)
- [ ] Playwright: trend line renders after two-click sequence; cursor changes to crosshair during tool use
- [ ] Playwright: Fibonacci levels (all 6) render after click-drag with correct labels
- [ ] Playwright: rectangle renders with correct fill and border
- [ ] Playwright: text label renders at clicked location with typed text
- [ ] Playwright: selected drawing deleted via `Delete` key — removed from chart immediately
- [ ] Integration test: `chart_drawings` row created with correct `points_json` after save
- [ ] E2E test: save layout with trend line → reload layout → trend line re-renders at exact coordinates
- [ ] Database: delete layout cascades to `chart_drawings` (no orphaned rows)
- [ ] Manual: all drawing types render visually correct in dark mode at all zoom levels
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 5 template

---

## Epic 6: WATCHLIST — Symbol Watchlists

**Goal:** Users can organize symbols into watchlists and see live prices at a glance.

### User Stories

**WATCH-1:** As a user, I have a default watchlist created on account setup.
- Acceptance: `watchlists` row with `is_default = true` created on first login; visible in right panel.

**WATCH-2:** As a user, I can search for a symbol and add it to my watchlist.
- Acceptance: "+" button in Watchlist tab opens search; selecting a symbol adds `watchlist_items` row; appears in list.

**WATCH-3:** As a user, I can see each watchlist item's current price, daily change amount, and daily change percentage.
- Acceptance: Prices sourced from WebSocket or Redis cache; change calculated from previous close; positive changes in `#26A69A`, negative in `#EF5350`. For crypto symbols (which trade 24/7 with no exchange-defined "previous close"), use the price 24 hours ago as the baseline. The WebSocket tick includes a `change` and `changePercent` field pre-calculated by the market data provider — use those values directly rather than calculating client-side.

**WATCH-4:** As a Pro user, I can create up to 3 named watchlists.
- Acceptance: "New Watchlist" button; name input; `watchlists` row created; tab-style selector between lists.

**WATCH-5:** As a user, I can remove a symbol from a watchlist via right-click context menu.
- Acceptance: Context menu shows "Remove from watchlist"; confirmation not required; item removed from DB and list.

**WATCH-6:** As a user, clicking a watchlist item changes the main chart to that symbol.
- Acceptance: Click on symbol row → active symbol changes → chart data fetches for new symbol.

### Validation Steps (WATCHLIST)
- [ ] Unit tests: `canCreateWatchlist` and `canAddWatchlistItem` — boundary values for all tiers
- [ ] Integration test: `POST /api/watchlists/items` returns 409 on duplicate symbol
- [ ] Integration test: Free user adding 11th item → 403 `plan_limit_exceeded`
- [ ] Integration test: User A cannot access User B's watchlist (returns 404)
- [ ] E2E test: add symbol → appears in list with correct price and change%
- [ ] E2E test: click watchlist row → chart symbol changes
- [ ] E2E test: remove symbol via right-click → removed from list and DB
- [ ] Playwright: price cell flashes correct color on live update
- [ ] Playwright: staleness indicator appears after 5s WebSocket disconnect
- [ ] Manual: symbols with special characters (`BRK.B`, `BTC/USD`) display correctly
- [ ] Manual: `display_order` maintained after remove and re-add
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 6 template

---

## Epic 7: ALERTS — Price & Indicator Alerts

**Goal:** Pro/Premium users can create alerts on price conditions and receive notifications.

**Tier gate:** Pro = 5 active alerts; Premium = unlimited.

### User Stories

**ALERT-1:** As a Pro user, I can create a price alert: "Notify me when AAPL crosses above $185."
- Acceptance: Alert creation modal; symbol (pre-filled), condition (above/below), threshold input; alert saved to `alerts` table.

**ALERT-2:** As a Pro user, I can create a percentage change alert: "Notify me when BTC/USD moves more than 5% in a day."
- Acceptance: Condition type = `percent_change`; `alert_rules` row stores field + operator + value.

**ALERT-3:** As a user, I can view all my active and triggered alerts in the Alerts tab.
- Acceptance: List shows symbol, condition summary, threshold, status badge (Active / Triggered / Disabled); triggered alerts shown with timestamp.

**ALERT-4:** As a user, I receive an email when an alert triggers.
- Acceptance: Alert evaluation service (cron or webhook from market data) calls `/api/alerts/trigger`; email sent via Resend/SendGrid; `triggered_at` set in DB.

**ALERT-5:** As a user, I can enable/disable or delete an alert.
- Acceptance: Toggle in Alerts tab sets `is_active`; delete removes row; changes persist.

**ALERT-6:** As a system, alerts are evaluated automatically against live prices and trigger notifications.
- Acceptance: The alert evaluation worker (`src/worker/alertEvaluator.ts`) runs on a 60-second cron. For each active alert, it fetches the latest price from Redis (`tick:{symbol}`). If the condition is met: calls `POST /api/alerts/trigger` (authenticated with `ALERT_WORKER_SECRET`), which sets `triggered_at`, sends email via Resend, and attempts browser push if `notification_push = true`. Evaluation is idempotent — an alert with `triggered_at` set is skipped. Free-tier alerts use delayed prices (15 min lag). Worker uses a Redis lock (`alert_lock:{alertId}`, 55s TTL) to prevent duplicate evaluation in multi-instance deployments.

**ALERT-7:** As a Pro/Premium user with browser push enabled, I receive a browser push notification when an alert triggers.
- Acceptance: User can opt in to browser push on the Alert Creation modal. Opting in triggers the browser's Push API permission request. On grant, the push subscription is stored server-side (new table: `push_subscriptions`). When an alert triggers, the server sends a Web Push notification via the `web-push` npm package. Notification includes symbol, condition, and deep link to chart. Note: browser push requires HTTPS and a `service-worker.js` registered at the root.

### Validation Steps (ALERTS)
- [ ] Unit tests: `canCreateAlert` — boundary values for all tiers (Free: 0, Pro: 5, Premium: unlimited)
- [ ] Integration test: Free user `POST /api/alerts` → 403
- [ ] Integration test: Pro user at limit (5) → 403
- [ ] Integration test: delete alert cascades `alert_rules` rows
- [ ] Integration test: User A cannot access User B's alerts
- [ ] E2E test: create price alert → appears in Alerts tab with "Active" badge → DB row correct
- [ ] E2E test: toggle alert → `is_active` flips → badge changes
- [ ] E2E test: delete alert → removed from tab and DB
- [ ] Manual: triggered alert shows timestamp; idempotent (re-trigger does not reset `triggered_at`)
- [ ] Manual: disabled alert excluded from evaluation (verify via trigger API call)
- [ ] Security: alert trigger endpoint validates ownership before processing
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 7 template

---

## Epic 8: SAVED LAYOUTS — Chart State Persistence

**Goal:** Pro/Premium users can save and restore named chart configurations including indicators and drawings.

**Tier gate:** Pro = 5 layouts; Free = 0; Premium = unlimited.

### User Stories

**LAYOUT-1:** As a Pro user, I can save my current chart (symbol + timeframe + indicators + drawings) as a named layout.
- Acceptance: "Save Layout" button in header → name input modal → `saved_layouts` row created with current symbol/timeframe; associated `indicators` and `chart_drawings` rows saved.

**LAYOUT-2:** As a Pro user, I can load a saved layout and have the chart restore exactly.
- Acceptance: Layout picker lists saved layouts; selecting one → chart switches symbol + timeframe + re-renders indicators and drawings.

**LAYOUT-3:** As a user, I can set a layout as the default for a symbol (loads automatically when symbol is selected).
- Acceptance: Checkbox "Set as default for [symbol]" in layout modal; `is_default = true` on `saved_layouts` row.

**LAYOUT-4:** As a user, I can rename or delete a saved layout.
- Acceptance: Options in layout picker; rename updates `name`; delete removes layout + cascades to drawings/indicators.

### Validation Steps (SAVED LAYOUTS)
- [ ] Unit tests: `canSaveLayout` — boundary values for all tiers (Free: 0, Pro: 5, Premium: unlimited)
- [ ] Integration test: Free user `POST /api/layouts` → 403
- [ ] Integration test: Pro user creates layout → `saved_layouts` + `indicators` + `chart_drawings` created in single transaction
- [ ] Integration test: delete layout cascades to `indicators` and `chart_drawings` (no orphaned rows)
- [ ] Integration test: `GET /api/layouts/:id` returns 404 for another user's layout (IDOR check)
- [ ] Contract test: `GET /api/layouts/:id` response matches `SavedLayoutDetail` type
- [ ] E2E test: save layout with SMA(20) + trend line → reload → both re-render at exact coordinates
- [ ] E2E test: default layout auto-loads when symbol selected
- [ ] Database test: `points_json` round-trips correctly (save → retrieve → render coordinates unchanged)
- [ ] Manual: rename layout reflects immediately in picker
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 8 template

---

## Epic 9: BILLING — Subscription Management

**Goal:** Users can subscribe to Pro or Premium plans, manage their subscription, and the app enforces tier limits.

### User Stories

**BILL-1:** As a Free user, I can click "Upgrade to Pro" and be taken to Stripe Checkout to subscribe.
- Acceptance: Checkout session created via `/api/billing/checkout`; redirect to Stripe Checkout; on success, Stripe webhook updates `subscriptions` table; user sees Pro plan.

**BILL-2:** As a subscriber, I can manage my plan (upgrade, downgrade, cancel) via the Stripe Customer Portal.
- Acceptance: "Manage Subscription" link opens Stripe Portal session; changes reflected via Stripe webhooks within 30 seconds.

**BILL-3:** As a user hitting a tier limit (e.g., max watchlist items), I see a clear upgrade prompt.
- Acceptance: Adding 11th item to Free watchlist shows modal: "Free plan limit reached — upgrade to Pro for up to 50 symbols per list."

**BILL-4:** As an admin, tier enforcement is done server-side (not just client-side).
- Acceptance: API routes for watchlist, alert, layout creation check `subscriptions` table plan before creating rows; return 403 with `{ error: "plan_limit_exceeded" }` if exceeded.

### Validation Steps (BILLING)
- [ ] Integration test: Stripe webhook `customer.subscription.updated` → `subscriptions.plan` and `status` updated correctly
- [ ] Integration test: Stripe webhook `customer.subscription.deleted` → `status = 'canceled'`
- [ ] Integration test: Stripe webhook `invoice.payment_failed` → `status = 'past_due'`
- [ ] Integration test: webhook replay is idempotent (no duplicate DB writes)
- [ ] Integration test: webhook with missing/invalid signature → 400
- [ ] Integration test: Free user API calls blocked at limit with 403 `plan_limit_exceeded`
- [ ] E2E test: Free → Pro upgrade via Stripe test checkout → plan badge updates → locked features unlocked
- [ ] E2E test: Pro plan downgrade → limits re-enforced; excess data preserved (not deleted)
- [ ] Manual: `past_due` user sees "Update payment method" banner; retains access within grace period
- [ ] Manual: Stripe Customer Portal accessible from account menu
- [ ] Security: Stripe webhook signature verified on every request
- [ ] QA Agent sign-off per `/docs/QA_ACCEPTANCE.md` Epic 9 template
