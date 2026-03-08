# Test Matrix — JustTrade

One row per feature. Nine test dimensions per row.
Cross-reference with `/docs/TEST_STRATEGY.md` (how to write each test) and `/docs/QA_ACCEPTANCE.md` (acceptance sign-off templates).

**Legend:**
| Symbol | Meaning |
|---|---|
| ✓ | Required — automated, must pass in CI before merge |
| M | Manual — human verification in staging environment |
| — | Not applicable |

**Columns:**
1. **Unit** — pure function/logic tests (Vitest, `tests/unit/`)
2. **Integration** — API route + DB interaction tests (Vitest, `tests/integration/`)
3. **E2E** — full browser flow tests (Playwright, `playwright/e2e/`)
4. **A11y** — accessibility audit (axe-core, `playwright/a11y/`)
5. **Perf** — performance timing/budget checks (Playwright timing + Lighthouse CI)
6. **Visual** — screenshot regression (Playwright, `playwright/visual/`)
7. **Negative** — invalid inputs, boundary values, error paths
8. **Auth/Perms** — 401, 403, IDOR, tier gate enforcement
9. **Mobile/Responsive** — breakpoint behavior at 375px, 768px, 1024px

---

## AUTH — Authentication & User Management

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Email sign-up** | — | ✓ Clerk webhook creates `users` row | ✓ Sign-up → dashboard | ✓ `/sign-up` zero axe violations | ✓ Sign-up page LCP < 2.5s | ✓ Sign-up page snapshot | Invalid email format; weak password; already-registered email | Duplicate `clerk_id` rejected (DB unique) | M Renders correctly at 375px; form inputs full-width |
| **Email sign-in** | — | ✓ JWT validation middleware | ✓ Sign-in → dashboard | ✓ `/sign-in` zero axe violations | ✓ Sign-in page LCP < 2.5s | ✓ Sign-in page snapshot | Wrong password; non-existent email; empty fields | Expired JWT → 401; tampered JWT → 401 | M Form usable on mobile |
| **OAuth (Google / GitHub)** | — | — | ✓ OAuth mock → session established | — | — | — | OAuth state mismatch; cancelled OAuth flow | Mismatched email domain rejected by Clerk | M OAuth button visible on mobile |
| **Profile page** | — | — | ✓ `/account` loads; name update propagates | ✓ `/account` zero axe violations | — | ✓ Account page snapshot (Free + Pro states) | Empty display name; name > 255 chars | Unauthenticated `/account` → redirect to sign-in | M Account page readable at 375px |
| **Session persistence** | — | ✓ Clerk middleware on all `/api/*` | ✓ Refresh page → session maintained | — | — | — | Deleted cookie → redirect to sign-in | All `/api/*` routes return 401 without valid session | — |
| **Sign out** | — | — | ✓ Sign out → landing; `/dashboard` → sign-in | — | — | — | Double sign-out (second call should not error) | Post-logout API call → 401 | M Logout accessible in mobile account menu |
| **Clerk webhook sync** | — | ✓ `user.created` idempotent; `user.updated` propagates email | — | — | — | — | `user.created` replayed → no duplicate row | Webhook without valid signature → 400 | — |

---

## DASHBOARD — Layout & Navigation

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Full layout render** | — | — | ✓ All 4 regions render without CLS | ✓ `/dashboard` zero axe violations | ✓ LCP < 2.5s; CLS < 0.1; TTI < 3.5s | ✓ Dashboard at 1440px, 1024px | Layout at < 768px shows mobile banner | Unauthenticated `/dashboard` → redirect | ✓ Right panel hidden at 768px; chart-only at 375px |
| **Symbol search (modal)** | — | ✓ Search API returns grouped results | ✓ Press `/` → results → select → chart updates; URL updates | ✓ Modal: zero axe violations; focus trapped; Esc restores | ✓ Results appear within 500ms of keystroke | ✓ Modal empty state + with results snapshot | Empty query; special chars (`BRK.B`, `@#$`); query with no results; network error | — | M Modal full-screen on mobile; keyboard nav works |
| **Timeframe selector** | ✓ `isTimeframeAllowed(plan, tf)` boundary values | ✓ OHLCV route returns correct data per timeframe | ✓ Click `1h` → request fires → chart data changes → URL updates | — | ✓ Timeframe switch data load < 300ms | ✓ Active timeframe button highlight | Invalid timeframe param in URL; unsupported interval string | ✓ Free user on `1m` → upgrade modal; API gate enforces tier | M Timeframe buttons scroll horizontally at 768px |
| **Keyboard shortcuts** | — | — | ✓ All shortcuts from PRODUCT_PRINCIPLES §6 fire correctly | — | — | — | Shortcuts inside text input do NOT fire; shortcuts inside modal do NOT fire | — | — |
| **Responsive layout** | — | — | ✓ Tablet toggle button shows/hides right panel | ✓ Panel toggle accessible by keyboard | — | ✓ Snapshots at 1440×900, 1024×768, 768×1024, 375×812 | Viewport < 600px shows chart-only; no horizontal scroll | — | ✓ All breakpoints from UI_UX_SPEC.md §12 verified |

---

## CHARTING — Core Chart Functionality

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Candlestick chart render** | — | ✓ OHLCV API returns correct bar shape | ✓ AAPL 1D loads; OHLCV legend populated | — | ✓ First candlestick render < 100ms after data available | ✓ Chart snapshot: correct up/down colors (`#26A69A`/`#EF5350`) | Unknown symbol → empty state in chart; no data for range → gap display | ✓ Unauthenticated `/api/ohlcv` → 401 | ✓ Chart fills full width at all supported breakpoints; no clipping |
| **Chart types (line, bar)** | — | — | ✓ Switch Candlestick → Line → Bar; series updates without reload | — | ✓ Type switch < 50ms | ✓ Snapshot per chart type | Switching while data loads; rapid repeated switching | — | — |
| **Crosshair + OHLCV legend** | — | — | — | — | ✓ Legend DOM update < 16ms (single frame) | — | Crosshair at chart edges; crosshair over gap bar | — | M Crosshair usable at tablet viewport |
| **Zoom + pan** | — | — | ✓ Scroll changes visible range; drag shifts x-axis | — | — | — | Over-scroll past data start; pinch on non-chart element (no interference) | — | M Pinch-to-zoom on touch device |
| **Real-time WebSocket** | ✓ `parseTick` valid/invalid/missing-fields; `isPriceStale` boundary values | ✓ WS service: subscribe/unsubscribe/receive tick | ✓ Tick → last candle updates in real-time | — | ✓ WS tick → DOM update < 50ms | ✓ Staleness indicator state snapshot | Malformed tick JSON; tick for unsubscribed symbol; tick with future timestamp | ✓ WS connection with invalid JWT → close code 4001 before data sent | — |
| **Staleness indicator** | ✓ `isPriceStale(ts, 5000)` at exact boundary | — | ✓ Disconnect → 5s → staleness shown; reconnect → clears | — | — | ✓ Staleness indicator snapshot | Disconnect and reconnect within 5s (no indicator shown) | — | M Staleness indicator visible at 375px |
| **Free-tier intraday gate** | ✓ `isTimeframeAllowed('free', '1h')` returns false | ✓ `/api/ohlcv?timeframe=1h` with Free session → 403 | ✓ Free user clicks `1h` → lock icon → upgrade modal | ✓ Upgrade modal: zero axe violations | — | ✓ Lock icon + upgrade modal snapshot | Free user direct URL with intraday timeframe → API blocks + UI shows gate | ✓ 403 returned even if client bypasses UI gate | M Gate visible at all breakpoints |
| **Data gaps (weekends/holidays)** | — | — | M Verify 1D chart shows visual gaps for weekends | — | — | M Gaps visible as empty space, not zero-value bars | Empty symbol returns zero bars gracefully | — | — |
| **History depth enforcement (CHART-7)** | ✓ `getOhlcvHistoryDepth(plan)` returns correct depth for Free/Pro/Premium | ✓ Free user `from` param outside 1-month window → server trims to limit; `X-Data-Trimmed: true` header present; Pro user outside 1-year window → trimmed; Premium → full range | — | — | — | — | Client sends `from` in future; client sends `from` before market existed; client omits `from` (server uses default for plan) | ✓ Depth enforcement uses DB plan, not JWT claim; 403 not returned (trimmed silently with header) | — |

---

## INDICATORS — Technical Indicators

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **SMA** | ✓ Correct values; period > data length; empty input | ✓ `indicators` row saved with correct `params_json` | ✓ Add SMA(20) → overlay renders on chart | — | ✓ Indicator appears < 100ms after add | ✓ SMA overlay snapshot | Period = 0; period = negative; source field not in OHLCV | — | — |
| **EMA** | ✓ First value = SMA; recursive formula; smoothing variants | ✓ `indicators` row saved | ✓ Add EMA(9) → overlay renders | — | ✓ EMA appears < 100ms | ✓ EMA overlay snapshot | Period = 1 (valid edge); period > data length | — | — |
| **MACD** | ✓ Histogram = MACD − signal; correct output length; fast ≥ slow edge | ✓ `indicators` row saved; `panel = 'sub'` | ✓ Add MACD → sub-panel renders below main chart | — | ✓ Panel appears < 150ms | ✓ MACD panel snapshot | fast = slow → degenerate case; signal > slow | — | M Panel visible at 1024px; collapsed on tablet |
| **RSI** | ✓ Always 0–100; 14 up-days ≈ 100; 14 down-days ≈ 0; alternating ≈ 50 | ✓ `indicators` row saved; `panel = 'sub'` | ✓ Add RSI(14) → panel with 70/30 lines renders | — | ✓ Panel appears < 150ms | ✓ RSI panel with overbought/oversold lines snapshot | Period = 1; RSI on flat price series | — | M Panel visible at 1024px |
| **Bollinger Bands** | ✓ Upper/lower symmetric around SMA; flat data → narrow bands | ✓ `indicators` row saved; `panel = 'main'` | — | — | — | ✓ BB overlay snapshot | stdDev = 0; period > data length | — | — |
| **Indicator picker modal** | — | — | ✓ Search filters list; category tabs work; add via picker | ✓ Modal: zero axe violations; focus trapped | — | ✓ Picker modal snapshot (empty search + with results) | Search query with no results; add duplicate indicator type | — | M Modal scrollable at 375px |
| **Indicator settings** | — | — | ✓ Edit period → chart updates in real-time | ✓ Settings panel accessible by keyboard | — | — | Invalid period (0, negative, non-integer) | — | — |
| **Toggle visibility / remove** | — | — | ✓ Hide toggle → indicator hidden; remove → gone from chart and tab | — | ✓ Remove reflected < 50ms | — | Remove last indicator → Indicators tab shows empty state | — | — |
| **Tier limits** | ✓ `canAddIndicator(plan, count)` at limit−1, limit, limit+1 | ✓ Free: 3rd indicator → 403; Pro: 11th → 403 | ✓ Free user 3rd attempt → upgrade modal | ✓ Upgrade modal: zero axe violations | — | ✓ Upgrade modal snapshot | Direct API call bypassing UI gate → 403 | ✓ 403 with `plan_limit_exceeded` code even without UI | M Upgrade modal fits 375px screen |

---

## DRAWING TOOLS — Chart Annotations

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Trend line** | — | ✓ `chart_drawings` row created with correct `points_json` | ✓ Two-click sequence renders line; cursor changes to crosshair during tool use | — | ✓ Line renders < 30ms after second click | ✓ Trend line snapshot | Single click without completing second point (cancel via Esc); line on same x-coordinate (vertical) | — | — |
| **Fibonacci retracement** | — | ✓ `chart_drawings` row with `drawing_type = 'fibonacci'` | — | — | — | ✓ All 6 Fibonacci levels visible with labels | Drag with no price distance (zero height); inverted drag (low → high) | — | — |
| **Rectangle** | — | ✓ `chart_drawings` row with correct bounds in `points_json` | — | — | — | ✓ Rectangle with semi-transparent fill + accent border | Zero-size rectangle (same click point for both corners) | — | — |
| **Text label** | — | ✓ `chart_drawings` row with text content in `style_json` | ✓ Click → type text → Enter → label renders | — | — | ✓ Text label snapshot | Empty text submission; text > reasonable max length | — | — |
| **Select + delete** | — | ✓ DELETE route removes `chart_drawings` row | ✓ Click line → handles appear; `Delete` key removes from chart | — | ✓ Delete reflected < 50ms | — | Delete key with no drawing selected (no error); delete already-deleted drawing (404 handled) | ✓ User A cannot delete User B's drawing | — |
| **Eraser tool** | — | ✓ Removes `chart_drawings` row | ✓ Eraser click on drawing removes it | — | — | — | Eraser click on empty area (no error) | — | — |
| **Drawing persistence (save/load)** | — | ✓ Load layout returns drawings; `points_json` round-trip exact | ✓ Save layout with trend line → reload → line at same coordinates | — | ✓ Layout load including drawings < 300ms | — | Load layout with 0 drawings → chart clears previous drawings | ✓ IDOR: User A cannot read User B's `chart_drawings` | — |

---

## WATCHLIST — Symbol Watchlists

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Default watchlist on signup** | — | ✓ Clerk `user.created` → `watchlists` row with `is_default = true` | ✓ New user sees default watchlist in right panel | — | — | ✓ Empty watchlist state snapshot | Two `user.created` webhooks (idempotent; only one watchlist created) | — | M Watchlist visible at 768px via toggle |
| **Add symbol** | ✓ `canAddWatchlistItem(plan, count)` at Free/Pro/Premium limits | ✓ `watchlist_items` row created; duplicate → 409 | ✓ Add TSLA → appears in list with price + change% | ✓ Watchlist panel: inputs accessible | — | ✓ Watchlist populated state snapshot | Duplicate symbol; unknown symbol; symbol > 30 chars; empty symbol | ✓ Unauthenticated add → 401; Free tier 11th symbol → 403 `plan_limit_exceeded` | M Add button reachable at 375px |
| **Live prices** | ✓ `parseTick` correct parsing; `isPriceStale` boundary | ✓ WS service broadcasts tick to subscribed clients | ✓ Price cell updates live; color flash on change | — | ✓ Price cell flash animation < 300ms ease-out | ✓ Price flash state; staleness indicator state | Tick for symbol not in watchlist (ignored); stale price after disconnect > 5s | ✓ WS auth required; Free plan ticks marked `delayed: true` | M Live price cells readable at 375px |
| **Remove symbol** | — | ✓ `watchlist_items` row deleted; subsequent add re-creates | ✓ Right-click → "Remove" → symbol gone from list | — | — | ✓ Empty watchlist state after removal | Remove already-removed symbol (idempotent 404 handled gracefully) | ✓ User A cannot remove symbol from User B's watchlist → 404 | M Right-click context menu accessible at 768px (long-press) |
| **Multiple watchlists (Pro)** | ✓ `canCreateWatchlist('free', 1)` → false; `('pro', 3)` → false; `('pro', 2)` → true | ✓ Free: 2nd watchlist → 403; Pro: 4th → 403 | ✓ Create 3 watchlists; switch between them via tab selector | ✓ Tab selector accessible by keyboard | — | — | Name collision (same name allowed); name = empty string → 400 | ✓ Free user → 403; Pro user at limit → 403 | M Watchlist tab selector scrollable at 375px |
| **Click to navigate** | — | — | ✓ Click TSLA row → chart symbol changes to TSLA | — | ✓ Symbol change + chart load < 500ms | — | Click while chart is loading (queued, not double-loaded) | — | M Tap on symbol row navigates on mobile |
| **`display_order`** | — | ✓ `display_order` correct after add and remove | — | — | — | — | Add, remove, re-add same symbol → order consistent | — | — |

---

## ALERTS — Price & Indicator Alerts

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Create price alert** | ✓ `canCreateAlert(plan, count)` at Free/Pro/Premium limits | ✓ `alerts` + `alert_rules` rows created; correct `condition_type` + `threshold` | ✓ "New Alert" → modal → fill → Save → appears in Alerts tab | ✓ Alert modal: zero axe violations; focus trapped | — | ✓ Alert creation modal snapshot; Alerts tab populated snapshot | Threshold = 0 for `price_above`; negative threshold; missing symbol; unknown condition type; threshold not a number | ✓ Free user → 403; Pro at limit (5) → 403; unauthenticated → 401 | M Modal full-screen on mobile; inputs accessible |
| **% change alert** | — | ✓ `condition_type = 'percent_change'`; `alert_rules` row with correct operator | — | — | — | — | Percent value > 100; percent = 0; negative percent for "up" condition | ✓ Free user → 403 | — |
| **View alerts list** | — | ✓ GET returns correct shape with `rules` | ✓ Alerts tab shows all user alerts with correct badges | ✓ Alerts tab axe clean | — | ✓ Alerts tab: empty state, active, triggered state snapshots | 0 alerts → empty state shown; more than page-size of alerts (pagination or scroll) | ✓ Only requesting user's alerts returned | M List readable at 375px |
| **Toggle active / disable** | — | ✓ PATCH flips `is_active`; DB updated | ✓ Toggle → badge changes immediately without page reload | — | ✓ Toggle response < 200ms | ✓ Active vs inactive badge snapshot | Toggle disabled alert to active; toggle non-existent alert ID → 404 | ✓ User A cannot toggle User B's alert → 404 | — |
| **Delete alert** | — | ✓ DELETE removes `alerts` row; `alert_rules` cascade | ✓ Delete → removed from tab immediately | — | ✓ Remove reflected < 200ms | — | Delete already-deleted alert → 404 handled; delete with cascade rules | ✓ User A cannot delete User B's alert → 404 | — |
| **Alert triggering** | — | ✓ `/api/alerts/trigger`: sets `triggered_at`; idempotent (re-trigger does not reset); disabled alert skipped | M Trigger API call → email delivered in staging | — | — | — | Trigger with non-existent alert ID → 404; trigger for wrong user's alert → 404 | ✓ Trigger endpoint validates ownership | — |
| **Notification delivery** | — | M Email arrives with correct symbol/condition/time | — | — | — | — | Email to invalid address (Resend handles gracefully) | — | M Email readable on mobile client |
| **Tier limits** | ✓ `canCreateAlert` boundary for all tiers | ✓ Free: 1st alert → 403; Pro: 6th → 403 | ✓ Pro at limit → upgrade modal | ✓ Upgrade modal axe clean | — | ✓ Upgrade modal snapshot | Client-side gate bypassed via direct API call → 403 still enforced | ✓ 403 `plan_limit_exceeded` from server regardless of UI state | M Upgrade modal fits 375px |
| **Alert evaluation worker (ALERT-6)** | — | ✓ Alert condition met + no Redis lock → `triggered_at` set + trigger endpoint called; Redis lock prevents double-trigger; `is_active = false` → skipped; already-`triggered_at` → skipped; Free user uses delayed price | — | — | ✓ Worker completes full evaluation cycle in < 60s | — | No Redis tick for symbol → worker logs warn and skips; Resend failure → `triggered_at` still set | ✓ Trigger endpoint validates `ALERT_WORKER_SECRET`; rejects if secret missing or wrong | — |
| **Browser push (ALERT-7)** | — | ✓ `POST /api/push-subscriptions` creates row; duplicate endpoint upserted; 410 Gone from web-push → row deleted | M Enable push in staging browser; trigger alert → push notification received | — | — | — | Subscription object missing required fields → 400; web-push 5xx → error logged, subscription not deleted | ✓ Push subscription scoped to authenticated user; User A cannot create push sub for User B | M Permission prompt visible and usable on mobile Chrome/Safari |

---

## SAVED LAYOUTS — Chart State Persistence

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Save layout** | ✓ `canSaveLayout(plan, count)` at Free/Pro/Premium limits | ✓ `saved_layouts` + `indicators` + `chart_drawings` created in single transaction; any partial failure → full rollback | ✓ `Ctrl+S` → name modal → Save → appears in picker | ✓ Name modal axe clean | ✓ Save completes < 500ms including drawings | ✓ Layout save modal snapshot | Empty name → 400; name > 100 chars → 400; save with 0 indicators and 0 drawings (valid) | ✓ Free user → 403; Pro at limit (5) → 403; unauthenticated → 401 | M Save button accessible at all breakpoints |
| **Load / restore layout** | — | ✓ GET `/api/layouts/:id` returns full shape: layout + drawings + indicators | ✓ Select layout → chart symbol + timeframe change + indicators render + drawings render at exact coordinates | — | ✓ Layout load < 300ms | — | Load layout for deleted symbol → chart handles gracefully; load layout with 0 drawings (no ghost drawings from previous) | ✓ User A cannot load User B's layout → 404 | — |
| **Default layout for symbol** | — | ✓ `is_default = true` on one layout per symbol; partial unique index enforced | ✓ Set default → select symbol from watchlist → layout auto-loads | — | — | — | Set two layouts as default for same symbol (second overwrites first) | ✓ Default lookup scoped to `userId` | — |
| **Rename layout** | — | ✓ PATCH updates `name` | ✓ Rename → picker shows updated name immediately | — | ✓ Rename < 200ms | — | Rename to empty string → 400; rename to name > 100 chars → 400; rename non-existent layout → 404 | ✓ User A cannot rename User B's layout → 404 | — |
| **Delete layout** | — | ✓ DELETE cascades to `chart_drawings` and `indicators`; no orphaned rows | ✓ Delete → removed from picker; deleted layout's drawings no longer loadable | — | ✓ Delete < 200ms | — | Delete default layout → symbol selection loads no layout; delete non-existent → 404 | ✓ User A cannot delete User B's layout → 404 | — |
| **`points_json` round-trip** | — | ✓ Coordinates saved = coordinates returned (no floating point drift) | ✓ Trend line saved at time T → reloaded at exact time T and price P | — | — | — | `points_json` with extreme coordinate values (very high/low price) | — | — |
| **Tier limits** | ✓ `canSaveLayout` boundary for all tiers | ✓ Free: 1st save → 403; Pro: 6th → 403 | ✓ Pro at limit → upgrade modal | ✓ Upgrade modal axe clean | — | ✓ Upgrade modal snapshot | Client-side UI bypassed → API still returns 403 | ✓ 403 regardless of UI state | M Upgrade modal fits 375px |

---

## BILLING — Subscription Management

| Feature | Unit | Integration | E2E | A11y | Perf | Visual | Negative | Auth/Perms | Mobile/Responsive |
|---|---|---|---|---|---|---|---|---|---|
| **Free → Pro upgrade** | — | ✓ Stripe webhook `customer.subscription.updated` → `subscriptions.plan = 'pro'`, `status = 'active'` | ✓ Stripe test checkout → webhook → badge shows "Pro" → locked features unlocked | ✓ Upgrade prompt modal axe clean | ✓ Checkout redirect < 2s | ✓ Pro badge; unlocked Alerts tab; unlocked multiple watchlists | Checkout abandoned → plan stays Free; webhook arrives twice → idempotent | ✓ Webhook signature required; checkout session tied to authenticated user | M Upgrade CTA visible on mobile |
| **Pro → Premium upgrade** | — | ✓ Webhook updates plan to `premium`; new limits apply immediately | M Stripe Portal upgrade → Premium limits enforced | — | — | ✓ Premium badge snapshot | — | ✓ Webhook signature verification | — |
| **Stripe webhooks** | — | ✓ All 4 event types handled correctly; each is idempotent | — | — | — | — | Missing `stripe-signature` → 400; invalid signature → 400; unknown event type → 200 (ignored safely) | ✓ Webhook signature verified via `STRIPE_WEBHOOK_SECRET` | — |
| **Cancellation / downgrade** | — | ✓ `customer.subscription.deleted` → `status = 'canceled'`; user retains access until `current_period_end` | ✓ Cancel → user retains Pro until period end → at period end, Free limits enforced | — | — | ✓ Canceled state banner snapshot | Cancel while `past_due`; cancel already-canceled subscription (idempotent) | ✓ Cancellation only processed via Stripe webhook, not directly callable | M Cancellation confirmation visible at 375px |
| **Payment failure / past_due** | — | ✓ `invoice.payment_failed` → `status = 'past_due'`; 24-hour grace period retained | ✓ `past_due` user sees "Update payment method" banner; retains access in grace period | ✓ Past_due banner axe clean | — | ✓ `past_due` banner snapshot | Webhook for failed payment on already-canceled subscription | — | M Banner readable on mobile |
| **Customer Portal** | — | ✓ Portal session created successfully via Stripe API | M Open portal → manage plan → return to app | — | ✓ Portal redirect < 2s | — | Portal session creation failure → error message shown (not broken redirect) | ✓ Portal session requires authenticated session | — |
| **Tier enforcement (server-side)** | ✓ `canCreateWatchlist`, `canCreateAlert`, `canSaveLayout`, `canAddIndicator` for all plans at boundaries | ✓ All resource creation routes check `subscriptions.plan` before writing | ✓ Downgraded user's next action blocked at limit | — | — | — | Plan field tampered in JWT → server re-checks DB | ✓ Plan checked from DB on every request, never trusted from client | — |
| **Upgrade prompt (contextual)** | — | — | ✓ Hitting limit → correct upgrade modal with plan comparison | ✓ Upgrade modal axe clean | — | ✓ Upgrade modal snapshot (Free hitting watchlist, alert, layout limits) | Upgrade modal dismiss → user stays on current page; no action taken | — | M Modal fits 375px; CTA button tappable |

---

## Negative Case Reference

Consolidated list of all negative test scenarios, organized by category.

### Input validation
| Scenario | Expected response | Test location |
|---|---|---|
| Watchlist name empty string | 400 `name: required` | `tests/integration/watchlists.test.ts` |
| Watchlist name > 100 chars | 400 `name: too_long` | `tests/integration/watchlists.test.ts` |
| Alert threshold NaN | 400 `threshold: invalid` | `tests/integration/alerts.test.ts` |
| Alert threshold negative (price condition) | 400 `threshold: must be positive` | `tests/integration/alerts.test.ts` |
| Alert `condition_type` not in enum | 400 `condition_type: invalid_enum_value` | `tests/integration/alerts.test.ts` |
| Symbol empty or > 30 chars | 400 `symbol: invalid` | `tests/integration/watchlists.test.ts` |
| Timeframe not in allowed list | 400 `timeframe: invalid_enum_value` | `tests/integration/ohlcv.test.ts` |
| Layout name empty | 400 `name: required` | `tests/integration/layouts.test.ts` |
| Layout name > 100 chars | 400 `name: too_long` | `tests/integration/layouts.test.ts` |
| `layoutId` not a UUID | 400 `id: invalid_uuid` | `tests/integration/layouts.test.ts` |
| Watchlist item: duplicate symbol | 409 `symbol: duplicate` | `tests/integration/watchlists.test.ts` |

### Boundary conditions
| Scenario | Expected behavior | Test location |
|---|---|---|
| SMA period = 0 | Error or empty output (not NaN/crash) | `tests/unit/lib/chart/indicators.test.ts` |
| SMA period > data length | Returns empty or partial array | `tests/unit/lib/chart/indicators.test.ts` |
| RSI on flat price series (all same close) | RSI = 50 or 0 (not crash/NaN) | `tests/unit/lib/chart/indicators.test.ts` |
| `isPriceStale` exactly at 5000ms | Not stale (boundary is exclusive) | `tests/unit/lib/websocket/parseMessage.test.ts` |
| Free user at limit − 1 | Action succeeds | `tests/unit/lib/api/limits.test.ts` |
| Free user at limit | Action blocked (403) | `tests/unit/lib/api/limits.test.ts` |
| Free user at limit + 1 | Action blocked (403) | `tests/unit/lib/api/limits.test.ts` |

### UI edge cases
| Scenario | Expected behavior | Verified by |
|---|---|---|
| Symbol search with no results | "No results for '[query]'" message; no blank dropdown | Playwright E2E |
| Chart load for unknown symbol | Inline error message; retry button | Playwright E2E |
| Sign up with already-registered email | Field error from Clerk; no crash | Playwright E2E |
| WebSocket disconnect mid-price-update | In-flight tick discarded; staleness shown after 5s | Playwright chart test |
| Delete drawing with no drawing selected | No error; no crash | Playwright chart test |
| Rapid timeframe switching | Only last request's data shown; no flickering with stale data | Playwright E2E |
| Load empty layout (0 drawings, 0 indicators) | Chart clears previous drawings/indicators | Playwright E2E |

---

## Auth / Permission Case Reference

Consolidated list of all auth and permission test scenarios.

| Route / Feature | 401 (unauth) | 403 (tier gate) | 404 (IDOR) | Webhook sig | Test location |
|---|---|---|---|---|---|
| `GET /api/watchlists` | ✓ | — | ✓ other user's list | — | `tests/security/` |
| `POST /api/watchlists` | ✓ | ✓ Free creates 2nd list | — | — | `tests/security/` |
| `POST /api/watchlists/:id/items` | ✓ | ✓ Free creates 11th item | ✓ other user's watchlist | — | `tests/security/` |
| `DELETE /api/watchlists/:id/items/:itemId` | ✓ | — | ✓ other user's item | — | `tests/security/` |
| `POST /api/alerts` | ✓ | ✓ Free creates 1st alert | — | — | `tests/security/` |
| `PATCH /api/alerts/:id` | ✓ | — | ✓ other user's alert | — | `tests/security/` |
| `DELETE /api/alerts/:id` | ✓ | — | ✓ other user's alert | — | `tests/security/` |
| `POST /api/layouts` | ✓ | ✓ Free creates 1st layout | — | — | `tests/security/` |
| `GET /api/layouts/:id` | ✓ | — | ✓ other user's layout | — | `tests/security/` |
| `DELETE /api/layouts/:id` | ✓ | — | ✓ other user's layout | — | `tests/security/` |
| `GET /api/ohlcv` (intraday) | ✓ | ✓ Free tier on `1h` | — | — | `tests/security/` |
| `POST /api/billing/checkout` | ✓ | — | — | — | `tests/security/` |
| `POST /api/webhooks/stripe` | — | — | — | ✓ missing + invalid sig | `tests/integration/` |
| `POST /api/webhooks/clerk` | — | — | — | ✓ missing + invalid sig | `tests/integration/` |
| WebSocket connect | ✓ invalid JWT → close 4001 | ✓ Free → delayed ticks | — | — | `tests/integration/` |

---

## Mobile / Responsive Reference

Behavior at each breakpoint for every major UI surface.

| Feature / Component | 1440px (Desktop) | 1024px (Desktop sm) | 768px (Tablet) | 375px (Mobile) |
|---|---|---|---|---|
| Full dashboard layout | Header + toolbar + chart + right panel | Same as 1440px | Right panel hidden; toggle button shown | Chart only; "Use desktop" banner |
| Left toolbar | 40px, visible | 40px, visible | 40px, visible | Hidden |
| Right panel | 280px, always visible | 280px, always visible | Hidden by default; overlay on toggle | Hidden |
| Chart area | Fills remaining width | Fills remaining width | Fills remaining width | 100% width |
| Symbol search modal | Centered 600px wide | Centered 600px wide | Centered, full-width on tablet | Full-screen |
| Alert creation modal | Centered 480px | Centered 480px | Centered, full-width | Full-screen |
| Layout save modal | Centered 400px | Centered 400px | Centered | Full-screen |
| Indicator picker modal | Centered 560px | Centered 560px | Centered | Full-screen |
| Timeframe selector | All buttons inline | All buttons inline | Scrollable row | Hidden (collapsed) |
| Watchlist item row | Full: symbol + name + price + change% | Full | Full | Truncated: symbol + price |
| Drawing tools | All available | All available | All available | Hidden (read-only) |
| Header | Logo + search + timeframe + account | Same | Same (compressed) | Logo + account only |
| Account dropdown | Full menu | Full menu | Full menu | Bottom sheet |

**Visual regression snapshots required:** `1440×900`, `1024×768`, `768×1024`, `375×812`
All snapshot tests in `playwright/visual/responsive/`

---

## Coverage Gaps Tracker

| Gap | Feature | Priority | Owner | Resolution |
|---|---|---|---|---|
| Alert end-to-end: market event → trigger → email delivered | ALERTS | P1 | QA + Backend API | Requires staging market data hook |
| WebSocket load test: 1,000 concurrent connections | CHARTING | P2 | Backend API | k6 script not yet written |
| Stripe Customer Portal manual test script | BILLING | P1 | QA | Manual test run pre-release |
| Safari WebSocket reconnect timing | CHARTING | P2 | QA | Safari browser farm access required |
| OAuth account merging (Google + email same address) | AUTH | P1 | QA + Backend API | Requires Clerk test setup |
| `display_order` after drag-to-reorder (if implemented) | WATCHLIST | P2 | QA | Feature not yet built |
| Lighthouse CI integration in GitHub Actions | ALL | P1 | QA | Config file `lighthouserc.js` not yet created |
| MACD/RSI on < 26 bars of data (degenerate input) | INDICATORS | P2 | QA | Unit test gap |
| Concurrent watchlist item insert race condition | WATCHLIST | P2 | QA + Database | DB unique constraint test with parallel inserts |
| Free-tier 15-min delay badge in chart header | CHARTING | P1 | QA + Frontend UI | Visual spec defined; test not yet written |
