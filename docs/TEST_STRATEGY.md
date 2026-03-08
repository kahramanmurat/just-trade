# Test Strategy — JustTrade

## Overview

JustTrade is a financial SaaS product where data accuracy, performance, and security failures have direct monetary consequences for users. The test strategy reflects this: every layer of the stack has explicit test requirements, and no feature ships without its corresponding tests passing.

**Testing libraries:**
- **Vitest** — unit and integration tests
- **Playwright** — E2E, visual regression, and accessibility audits
- **@axe-core/playwright** — automated accessibility validation
- **Zod** — API contract validation (runtime schema enforcement)
- **Prisma** test client + Neon branch — database and migration tests

**Test environments:**

| Environment | Purpose | Database |
|---|---|---|
| `local` | Developer machine | Neon dev branch (ephemeral) |
| `ci` | GitHub Actions per-PR | Neon branch created/destroyed per run |
| `staging` | Pre-release smoke tests | Neon staging branch, mirrors prod schema |

---

## 1. Unit Tests

**Tool:** Vitest
**Location:** `tests/unit/` (mirrors `src/` structure exactly)
**Coverage target:** ≥ 80% statement coverage for `src/lib/`

### 1.1 Price & Financial Calculations (`src/lib/chart/`)

| Function | Test cases |
|---|---|
| `formatPrice(value, decimals)` | Correct decimal places; negative values; zero; very large values (>1M); NaN input |
| `calculateChange(current, previous)` | Correct absolute + percentage; previous = 0 (division guard); negative current |
| `calculateSMA(data, period)` | Correct rolling average; fewer bars than period returns partial; empty input returns [] |
| `calculateEMA(data, period, smoothing)` | First value equals SMA; subsequent values use recursive formula; smoothing factor variants |
| `calculateMACD(data, fast, slow, signal)` | Histogram = MACD − signal; output length = data length − slow period; edge: fast ≥ slow |
| `calculateRSI(data, period)` | Always 0–100; 14 up-days in a row = ~100; 14 down-days = ~0; alternating = ~50 |
| `calculateBollingerBands(data, period, stdDev)` | Upper/lower symmetric around SMA; stdDev=2 default; narrow bands on flat data |
| `snapToOHLC(price, candle)` | Snaps to nearest of O/H/L/C; tie-breaking consistent |

### 1.2 Validation Schemas (`src/lib/api/schemas.ts`)

- Watchlist name: rejects empty string, rejects > 100 chars, accepts Unicode
- Alert threshold: rejects non-numeric, rejects negative, accepts zero for `percent_change`
- Symbol format: rejects empty, rejects > 30 chars, accepts `BRK.B`, `BTC/USD`, `EUR/USD`
- Timeframe: rejects values not in `['1m','5m','15m','1h','4h','1D','1W','1M']`
- UUID params: rejects non-UUID strings in path parameters
- All schemas tested with: valid input (pass), borderline input (edge), and invalid input (fail with descriptive error)

### 1.3 Plan Tier Limit Enforcement (`src/lib/api/limits.ts`)

All functions tested at boundary values: `limit − 1` (allow), `limit` (deny), `limit + 1` (deny).

| Function | Free | Pro | Premium |
|---|---|---|---|
| `canCreateWatchlist(plan, count)` | max 1 | max 3 | unlimited |
| `canAddWatchlistItem(plan, count)` | max 10 | max 50 | unlimited |
| `canCreateAlert(plan, count)` | 0 | max 5 | unlimited |
| `canSaveLayout(plan, count)` | 0 | max 5 | unlimited |
| `canAddIndicator(plan, count)` | max 2 | max 10 | unlimited |
| `getOhlcvHistoryDepth(plan)` | 1 month | 1 year | full history | (CHART-7)

### 1.4 Cache Utilities (`src/lib/cache/`)

- `getCachedOhlcv(symbol, timeframe)` — returns parsed data on hit; returns `null` on miss
- `setCachedOhlcv(symbol, timeframe, data, ttl)` — correct TTL per timeframe: `1m`→60s, `1D`→3600s
- `getRateLimitCount(userId)` — correct Redis key `rl:{userId}`; returns 0 on miss
- `incrementRateLimit(userId)` — increments counter; sets TTL on first increment; does not reset TTL on subsequent calls

### 1.5 WebSocket Message Utilities (`src/lib/websocket/`)

- `parseTick(raw)` — parses valid JSON; rejects malformed JSON; rejects messages missing required fields (`symbol`, `price`, `timestamp`)
- `buildSubscribeMessage(symbols)` — produces `{ type: "subscribe", symbols }` JSON
- `isPriceStale(timestamp, thresholdMs)` — returns `true` when `Date.now() - timestamp > thresholdMs`; boundary: exactly at threshold = not stale

### 1.6 Test File Structure

```
tests/unit/
├── lib/
│   ├── chart/
│   │   ├── formatPrice.test.ts
│   │   ├── calculateChange.test.ts
│   │   ├── indicators.test.ts       # SMA, EMA, MACD, RSI, BB
│   │   └── snapToOHLC.test.ts
│   ├── api/
│   │   ├── schemas.test.ts
│   │   └── limits.test.ts
│   ├── cache/
│   │   └── ohlcvCache.test.ts
│   └── websocket/
│       └── parseMessage.test.ts
```

---

## 2. Integration Tests

**Tool:** Vitest with direct Next.js route handler invocation
**Location:** `tests/integration/`
**Database:** Ephemeral Neon branch, seeded with fixture data per test suite

Each route is tested for: auth enforcement, input validation, correct DB write, correct response shape, error handling.

### 2.1 Watchlists API

| Route | Test cases |
|---|---|
| `GET /api/watchlists` | 401 unauthenticated; returns only requesting user's lists; empty array when none; includes `items` |
| `POST /api/watchlists` | 401 unauth; creates with valid body; 400 on empty name; 400 on name > 100 chars; 403 `plan_limit_exceeded` for Free user trying second list; 403 for Pro user at limit (3) |
| `DELETE /api/watchlists/:id` | 404 for another user's watchlist; cascades items; 404 on nonexistent ID |
| `POST /api/watchlists/:id/items` | 404 for wrong user's watchlist; 409 duplicate symbol; 403 Free tier limit (10 items); sets `display_order` |
| `DELETE /api/watchlists/:id/items/:itemId` | 404 for item not in user's watchlist; removes row; 200 on success |

### 2.2 Alerts API

| Route | Test cases |
|---|---|
| `GET /api/alerts` | 401 unauth; returns only user's alerts; includes `rules` |
| `POST /api/alerts` | 403 for Free users; creates with valid body; 400 invalid condition_type; 400 non-numeric threshold; 403 Pro user at limit (5) |
| `PATCH /api/alerts/:id` | Toggles `is_active`; 404 for another user's alert |
| `DELETE /api/alerts/:id` | Cascades `alert_rules`; 404 for wrong user |

### 2.3 Layouts API

| Route | Test cases |
|---|---|
| `POST /api/layouts` | 403 Free user; creates layout + indicators + drawings in transaction; 403 Pro at limit (5) |
| `GET /api/layouts` | Returns user's layouts; includes indicator and drawing counts |
| `GET /api/layouts/:id` | Returns full layout with drawings and indicators; 404 for wrong user |
| `DELETE /api/layouts/:id` | Cascades drawings and indicators; 404 for wrong user |

### 2.3b OHLCV History Depth Enforcement (CHART-7)

| Test case | Expected behavior |
|---|---|
| Free user requests `?symbol=AAPL&timeframe=1D&from=<2 years ago>` | API calculates `from = now − 1 month`; ignores client `from`; response includes `X-Data-Trimmed: true` header |
| Pro user requests same | API uses `from = now − 1 year` |
| Premium user requests same | API passes full requested range |
| `X-Data-Trimmed` header absent | Only when no trimming occurred (client request within allowed range) |
| Free user fetches intraday `1m` with long `from` | Trimmed to 1 month back; `X-Data-Trimmed: true` |

### 2.4 Stripe Webhook (`POST /api/webhooks/stripe`)

- 400 without `stripe-signature` header
- 400 with invalid signature (tampered payload)
- `customer.subscription.updated` → updates `subscriptions.plan` and `status` correctly
- `customer.subscription.deleted` → sets `status = 'canceled'`, clears `stripe_subscription_id`
- `invoice.payment_failed` → sets `status = 'past_due'`
- Idempotent: replaying same event does not create duplicate DB entries

### 2.5 Clerk Webhook (`POST /api/webhooks/clerk`)

- `user.created` → creates `users` row with correct `clerk_id`, `email`
- `user.created` replayed → idempotent (upsert, no duplicate)
- `user.updated` → updates `users.email` and `users.name`
- `user.deleted` → cascades or soft-deletes user data

### 2.5b Alert Evaluation Worker (ALERT-6)

**Location:** `tests/integration/worker/alertEvaluator.test.ts`

| Test case | Expected behavior |
|---|---|
| Active alert, condition met, no Redis lock | `triggered_at` set; `POST /api/alerts/trigger` called; Redis lock set with 55s TTL |
| Active alert, condition met, Redis lock present | Worker skips evaluation (idempotent); `triggered_at` not changed |
| Alert with `triggered_at` already set | Worker skips (already triggered); no re-evaluation |
| Alert with `is_active = false` | Worker skips |
| Free user alert, delayed price not yet crossed threshold | Alert not triggered (uses delayed tick, not real-time) |
| Free user alert, delayed price crosses threshold | Alert triggered using delayed tick value |
| Redis key `tick:{symbol}` missing (no price) | Alert skipped; logged as `warn: no_tick_available` |
| Resend email delivery fails | `triggered_at` still set; failure logged; no retry |

### 2.5c Browser Push Notification (ALERT-7)

**Location:** `tests/integration/api/pushSubscriptions.test.ts`

| Test case | Expected behavior |
|---|---|
| `POST /api/push-subscriptions` with valid subscription object | Row created in `push_subscriptions`; 201 response |
| `POST /api/push-subscriptions` duplicate endpoint | Row upserted (no 409) |
| `DELETE /api/push-subscriptions` | Row deleted for requesting user's endpoint |
| Push delivery: web-push returns 410 Gone | Row deleted from `push_subscriptions`; not retried |
| Push delivery: web-push returns 5xx | Error logged; subscription not deleted |
| User deletes account | All `push_subscriptions` rows for that user deleted in cascade |

### 2.6 WebSocket Service Integration

- Client connects with valid Clerk JWT → handshake accepted
- Client connects with expired JWT → connection rejected with close code 4001
- Client subscribes to `AAPL` → receives tick updates
- Client unsubscribes from `AAPL` → stops receiving ticks for that symbol
- Free plan client → tick messages include `delayed: true` flag
- Disconnect → server removes client from subscription map

---

## 3. End-to-End Tests

**Tool:** Playwright
**Location:** `playwright/e2e/`
**Environment:** Staging or local dev server with market data mocked via MSW

### 3.1 Authentication

| Test | Steps | Pass condition |
|---|---|---|
| Email sign-up | Navigate `/sign-up` → fill email+password → submit | Redirected to `/dashboard`; default watchlist visible; subscription badge = "Free" |
| OAuth sign-in | Click "Continue with Google" → complete mock OAuth | Session established; dashboard loads |
| Sign out | Click avatar → Sign Out | Redirected to landing; `/dashboard` redirects to sign-in |
| Protected route | Navigate `/dashboard` without session | Redirected to `/sign-in` |

### 3.2 Charting

| Test | Steps | Pass condition |
|---|---|---|
| Symbol search + chart load | Press `/` → type "AAPL" → Enter | Chart renders; URL = `?symbol=AAPL`; OHLCV legend populated; render < 100ms |
| Timeframe change | Click "1h" timeframe button | OHLCV request fires; chart data updates; URL includes `timeframe=1h` |
| Crosshair | Hover over chart | Crosshair visible; OHLCV legend values update on move |
| Zoom | Scroll on chart | X-axis range changes; no page scroll interference |
| Pan | Click-drag on chart | X-axis range shifts in drag direction |
| Chart type switch | Click "Line" chart type | Series switches to line without page reload |

### 3.3 Watchlist

| Test | Steps | Pass condition |
|---|---|---|
| Add symbol | Click "+" → search "TSLA" → select | TSLA appears with price and change% |
| Click to navigate | Click TSLA row in watchlist | Chart symbol changes to TSLA |
| Remove symbol | Right-click TSLA → "Remove from watchlist" | TSLA removed from list; DB row deleted |
| Free tier limit | Add 11th symbol | Upgrade modal appears; 11th symbol NOT in DB |

### 3.4 Alerts

| Test | Steps | Pass condition |
|---|---|---|
| Create price alert | Click "New Alert" → AAPL, above, 200 → Save | Alert in Alerts tab with "Active" badge; DB row correct |
| Disable alert | Click toggle on alert | Badge changes to "Inactive"; `is_active = false` in DB |
| Delete alert | Click delete icon | Alert removed from tab; DB row deleted |
| Free user gate | Free user clicks "New Alert" | Upgrade prompt modal shown |

### 3.5 Saved Layouts

| Test | Steps | Pass condition |
|---|---|---|
| Save layout | Add SMA(20) + draw trend line → `Ctrl+S` → name "Test Layout" | Layout appears in picker; DB rows created |
| Load layout | Switch symbol; open picker → select "Test Layout" | SMA and trend line re-render at correct coordinates |
| Delete layout | Delete "Test Layout" from picker | Removed from picker; DB cascades drawings/indicators |

### 3.6 Billing

| Test | Steps | Pass condition |
|---|---|---|
| Free → Pro upgrade | Hit watchlist limit → click upgrade → complete Stripe test checkout | `subscriptions.plan = 'pro'`; UI shows "Pro" badge; locked features unlocked |
| Manage subscription | Click "Manage Subscription" | Stripe Customer Portal opens |
| Downgrade enforcement | Simulate Pro → Free webhook | Limits re-enforced immediately; excess data not deleted (preserved) |

---

## 4. Visual Regression Tests

**Tool:** Playwright built-in screenshot comparison
**Location:** `playwright/visual/`
**Threshold:** 0.1% pixel difference (tight — catch real regressions only)
**Mode:** Dark theme only; after `networkidle` state

### Required baseline snapshots:

- Dashboard full layout at `1440×900`, `1024×768`, `768×1024`, `375×812`
- Symbol search modal: empty state, with results
- Alert creation modal: empty form, with validation errors
- Layout save modal
- Indicator picker modal
- Watchlist panel: empty state, populated (5 items), with live price flash active
- Alerts tab: empty state, 3 active alerts, 1 triggered alert
- Upgrade prompt modal (Free plan limit hit)
- Chart: candlestick only, candlestick + SMA + RSI panel, with drawings (trend line + Fibonacci + rectangle)
- Account dropdown: Free plan, Pro plan
- Staleness indicator (WebSocket disconnected state)

### Rules:
- Snapshot comparison runs on every PR targeting `main`
- New snapshots must be explicitly approved and committed by the QA Agent
- Snapshots stored in `playwright/visual/__snapshots__/`

---

## 5. Accessibility Tests

**Tool:** `@axe-core/playwright`
**Location:** `playwright/a11y/`
**Standard:** WCAG 2.1 Level AA

### Pages audited:

| Page / State | axe violations allowed |
|---|---|
| `/sign-in` | 0 critical, 0 serious |
| `/sign-up` | 0 critical, 0 serious |
| `/dashboard` (loaded) | 0 critical, 0 serious |
| Symbol search modal (open) | 0 critical, 0 serious |
| Alert creation modal (open) | 0 critical, 0 serious |
| Layout save modal (open) | 0 critical, 0 serious |
| `/account` | 0 critical, 0 serious |

### Additional manual checks per page:
- All interactive elements reachable via Tab in logical order
- All icon-only buttons have `aria-label`
- All form inputs have associated `<label>` or `aria-labelledby`
- Modals trap focus on open; Esc closes; focus returns to trigger element
- Price values include +/- sign and directional icon (not color alone)
- Contrast ratio ≥ 4.5:1 for all body text (verified via axe color-contrast rule)

---

## 6. API Contract Tests

**Tool:** Zod runtime validation in dedicated test suite
**Location:** `tests/contracts/`

### Endpoints with enforced contracts:

| Endpoint | Response type |
|---|---|
| `GET /api/watchlists` | `Watchlist[]` with `items: WatchlistItem[]` |
| `GET /api/alerts` | `Alert[]` with `rules: AlertRule[]` |
| `GET /api/layouts` | `SavedLayout[]` |
| `GET /api/layouts/:id` | `SavedLayoutDetail` with `drawings` + `indicators` |
| `GET /api/billing/status` | `{ plan, status, currentPeriodEnd }` |
| `GET /api/ohlcv` | `{ data: OHLCVBar[], asOf: string, dataProvider: string }` |
| WebSocket tick | `{ type: 'tick', symbol, price, change, changePercent, timestamp, delayed? }` |

### Rules:
- All response types exported from `src/lib/api/types.ts`
- Contract tests fail CI if any required field is missing or wrong type
- Frontend consumes these same types — single source of truth

---

## 7. Database Tests

**Tool:** Vitest + Prisma test client on ephemeral Neon branch
**Location:** `tests/db/`

### Constraint tests:
- `(watchlist_id, symbol)` unique constraint — insert duplicate throws `P2002`
- Only one `is_default = true` per user's watchlists — partial unique index enforced
- `saved_layouts` delete cascades to `chart_drawings` and `indicators`
- `alerts` delete cascades to `alert_rules`
- `users` delete cascades to watchlists, alerts, layouts, subscriptions
- `subscriptions.user_id` is unique (1:1 enforced)

### Query correctness tests:
- `findDefaultWatchlist(userId)` returns only `is_default = true` row for that user; null if none
- `getActiveAlerts(symbol)` returns only rows where `is_active = true` for the given symbol
- `getLayoutWithDetails(layoutId, userId)` returns layout only if `user_id` matches; throws 404 if not
- `getPlanForUser(userId)` returns `'free'` for users with no subscription row

### Data isolation tests:
- Every repository function takes `userId` as required parameter
- All queries include `WHERE user_id = $userId` — verified by test with two seeded users

---

## 8. Migration Tests

**Tool:** Prisma migrate + Neon ephemeral branch
**Location:** `tests/migrations/`

### Requirements per migration:
- `prisma migrate deploy` completes without error on a clean (empty) database
- Running `prisma migrate deploy` twice is idempotent (no errors on second run)
- All indexes from `/docs/DB_SCHEMA.md` exist post-migration (verified via `SELECT indexname FROM pg_indexes`)
- All enum values match `schema.prisma` (verified via `SELECT enum_range(NULL::plan_enum)`)
- Migration file includes a comment with the rollback SQL (manual, since Prisma doesn't auto-rollback)

### CI process for migrations:
```
1. Create ephemeral Neon branch
2. Run: prisma migrate deploy
3. Run: migration assertion tests (indexes + enums)
4. Run: seed script
5. Run: integration + database tests
6. Destroy Neon branch on completion
```

---

## 9. Security Validation Tests

**Location:** `tests/security/`

### 9.1 Authentication bypass (every PR)
- Unauthenticated `GET /api/watchlists` → 401
- Expired Clerk JWT → 401
- Tampered JWT (modified payload) → 401
- WebSocket connect with invalid JWT → close code 4001 before any data sent

### 9.2 Authorization / IDOR
- User A requests `GET /api/layouts/:id` where layout belongs to User B → 404 (not 403 — do not leak existence)
- User A `DELETE /api/watchlists/:id` of User B's watchlist → 404
- Stripe checkout for User A cannot be fulfilled for User B session

### 9.3 Input injection
- Watchlist name `<script>alert(1)</script>` → stored; returned in response encoded; NOT executed in browser (CSP + React auto-escaping)
- Symbol `'; DROP TABLE users; --` → Prisma parameterized query; no DB error; stored as literal string
- `layoutId = "../../../../etc/passwd"` → UUID regex validation rejects on route parameter parsing

### 9.4 Rate limiting
- 101st request from same authenticated user in 60 seconds → 429 `{ error: 'rate_limit_exceeded' }`
- 21st unauthenticated request from same IP in 60 seconds → 429

### 9.5 Stripe webhook integrity
- No `stripe-signature` header → 400
- Invalid signature → 400
- Valid signature, mutated payload → 400

### 9.6 Secret exposure (CI pipeline step)
```bash
# Fails build if secrets are found committed in source
git grep -n "sk_live_\|STRIPE_SECRET_KEY=\|DATABASE_URL=postgres"
pnpm audit --audit-level=high
```

---

## 10. Chart-Specific Interaction Tests

**Tool:** Playwright
**Location:** `playwright/chart/`

### Canvas interaction:
- Mouse enter chart area → crosshair visible
- Mouse move → OHLCV legend values update (verified via DOM overlay text)
- Scroll on chart → x-axis range changes (visible range shrinks)
- Click-drag right → x-axis shifts left (pans into history)
- Price scale visible and labeled with correct decimal places for symbol type

### Data rendering:
- Candlestick bars: up-candles use `#26A69A`, down-candles use `#EF5350`
- Symbol switch: previous series data cleared before new data renders (no ghost bars)
- Weekend/holiday gaps: appear as visual gaps, not zero-value bars
- Real-time tick: last candle updates without full chart re-render

### Indicator rendering:
- Add SMA(20) → overlay line appears on chart
- RSI panel → rendered below main chart with 70 and 30 reference lines
- MACD → histogram with positive/negative bar colors
- Remove indicator → removed from chart immediately, no page reload

### Drawing tools:
- Select Trend Line tool → cursor changes to crosshair
- First click → anchor set; second click → line rendered
- Drawn line persists after switching back to cursor tool
- Select line → handles appear
- Press `Delete` with line selected → line removed from chart and DB

### WebSocket staleness:
- Disconnect WebSocket → after 5s, price cells in watchlist show staleness indicator (grayed + clock icon)
- Reconnect → staleness clears; price updates resume
- Free plan: prices arrive with `delayed: true`; "(Delayed 15min)" badge visible near chart price

---

## 11. Running Tests

```bash
pnpm test               # Vitest unit + integration
pnpm test:coverage      # Unit + integration with coverage report
pnpm test:e2e           # Playwright E2E (requires running dev server)
pnpm test:visual        # Playwright visual regression
pnpm test:a11y          # Playwright accessibility audits
pnpm test:security      # Security test suite
pnpm test:contracts     # API contract tests
pnpm test:db            # Database constraint + isolation tests
pnpm test:ci            # Full CI suite (all of the above, headless)
```

---

## 12. Coverage Thresholds (CI enforcement)

| Scope | Minimum |
|---|---|
| `src/lib/` — business logic | 80% statements |
| `src/app/api/` — route handlers | 70% statements |
| `src/components/ui/` — design system | 60% statements |
| Overall project | 70% statements |

Coverage below thresholds **blocks CI merge**. Run `pnpm test:coverage` before opening a PR.
