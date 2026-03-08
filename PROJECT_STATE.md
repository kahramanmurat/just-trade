# JustTrade — Project State

> Last Updated: 2026-03-08

## Overview
JustTrade is a TradingView-style SaaS platform for charting, watchlists, alerts, and AI-assisted market analysis.

### Tech Stack

| Layer | Technology | Status |
|---|---|---|
| Framework | Next.js 16 (App Router) | Active |
| Language | TypeScript (strict) | Active |
| Styling | Tailwind CSS v4 | Active |
| Charting | lightweight-charts v5 | Active |
| State | Zustand (UI + ticks) + TanStack Query (server) | Zustand active, TanStack Query planned |
| Auth | Clerk (`@clerk/nextjs`) | Active |
| Database | Prisma 7 + Neon PostgreSQL | Active |
| Caching | Upstash Redis (`@upstash/redis`) | Active |
| Market Data | Polygon.io REST + mock fallback | Active |
| Real-time | Mock tick simulator (WebSocket-ready architecture) | Active |
| Payments | Stripe (Checkout + Portal + Webhooks) | Active |
| Testing | Vitest + Playwright | Planned |

---

## Current Working Features

- **Dashboard shell** — header, left toolbar, chart area, right panel (responsive layout)
- **Chart engine** — lightweight-charts v5 candlestick chart with OHLCV legend overlay, crosshair, watermark
- **Symbol selection** — symbol search modal + watchlist click to switch active symbol
- **Timeframe selection** — header timeframe buttons (1m, 5m, 15m, 1h, 4h, 1D, 1W, 1M)
- **OHLCV API with provider abstraction** — `GET /api/ohlcv` with Polygon.io provider, mock fallback, and Redis caching
- **Watchlist persistence** — DB-backed default watchlist with auto-seeded symbols (AAPL, TSLA, NVDA, MSFT)
- **Watchlist add/remove** — "+ Add" dropdown to add symbols, hover "×" to remove, optimistic UI with API rollback
- **Watchlist live prices** — each watchlist item shows realtime price and daily % change (green/red)
- **Drawing tools v1** — horizontal line (click to place dashed price line), eraser (clears all lines), select (default cursor)
- **Unimplemented tools** — trendline, fibonacci, rectangle, text, magnet shown with "coming soon" tooltip and disabled state
- **Indicators v1** — SMA (20), EMA (50) as chart overlays; RSI (14) in separate lower pane; add/remove/toggle from Indicators tab
- **Realtime price updates** — mock tick simulator feeds live prices to chart (updates last candle) and watchlist; connection status in header
- **Saved chart layouts v1** — save/load/delete named layouts storing symbol, timeframe, indicators, drawings, and panel state; default layout support
- **Price alerts v1** — create gt/lt price alerts, client-side evaluation against tick store, in-app toast notifications, alerts tab with create/delete/status
- **Clerk authentication** — sign-in, sign-up, protected `/dashboard`, webhook endpoint for user sync
- **Local dev user resolution** — `resolveUser` helper auto-creates DB user from Clerk session if webhook hasn't fired; handles P2002 race conditions

---

## Completed Milestones

### Sprint 0 — Foundation ✅
- Next.js 16 project scaffolded with Turbopack
- Tailwind v4 configured (CSS-only `@theme`, no `tailwind.config.ts`)
- Folder structure initialized per ARCHITECTURE.md
- Environment variables configured (`.env.local`)
- Base design tokens in `globals.css` (bg, surface, accent, up, down, text, border)

### Sprint 1 — Database & Authentication ✅

#### Database (Prisma + Neon)
- Prisma schema with models: `User`, `Subscription`, `Watchlist`, `WatchlistItem`
- Unique constraints: `clerk_id`, `(user_id, is_default)`, `(watchlist_id, symbol)`
- Migration executed on Neon PostgreSQL
- Prisma client singleton at `src/lib/db/prisma.ts`

#### Authentication (Clerk)
- Clerk integrated with Next.js App Router
- Sign-in and sign-up pages working
- `/dashboard` protected via Clerk middleware
- Webhook endpoint at `/api/webhooks/clerk` for `user.created` sync
- `resolveUser` helper for local dev (auto-creates user from Clerk session; P2002 race handling)

### Sprint 2 — Dashboard Shell & Chart Engine ✅

#### Dashboard Shell
- `DashboardShell` — flex layout: left toolbar, chart area, right panel, tick stream manager
- `DashboardHeader` — logo, symbol display, timeframe buttons, connection status, search trigger, panel toggle
- `LeftToolbar` — 8 drawing tool buttons with icons, implemented/coming-soon states
- `RightPanel` — tabbed panel (Watchlist, Alerts, Indicators) with tab bar

#### Chart Engine
- `ChartContainer` — lightweight-charts v5 integration
- Candlestick series with up/down color tokens
- OHLCV legend overlay (O, H, L, C, Vol) tracks crosshair
- Text watermark showing active symbol
- Resize observer for responsive chart sizing
- Fetches data from `/api/ohlcv` on symbol/timeframe change
- Live tick updates on the last candlestick bar
- Loading and error states

#### Symbol Selection
- `SymbolSearchModal` — search/filter across 6 mock symbols (AAPL, TSLA, NVDA, MSFT, BTCUSD, ETHUSD)
- Symbol directory at `src/lib/api/symbols.ts` with `searchSymbols()` and `findSymbol()`
- Clicking a watchlist item or search result sets the active symbol via Zustand

### Sprint 2b — Watchlist & Drawing Tools ✅

#### Watchlist Persistence
- `GET /api/watchlists` — returns user's default watchlist; creates one with seed symbols if absent
- `POST /api/watchlists/items` — add symbol to default watchlist (Zod validated, duplicate check)
- `DELETE /api/watchlists/items` — remove symbol from default watchlist
- All routes use `resolveUser` for DB user resolution
- P2002 race condition handling on user, watchlist, and item creation

#### Watchlist UI
- `AddSymbolDropdown` in RightPanel — dropdown of available symbols filtered against existing
- Optimistic remove (instant UI update, rollback on API failure)
- `cache: 'no-store'` on fetch to prevent stale data
- Live price and daily % change display per watchlist item via tick store
- Error display for duplicates and network failures

#### Drawing Tools v1
- Horizontal line: click chart to place dashed price line at cursor price
- Eraser: removes all placed price lines, resets tool to select
- `activeToolRef` pattern keeps chart click handler in sync with Zustand state
- Crosshair cursor when hline tool is active
- Unimplemented tools (trendline, fibonacci, rectangle, text, magnet) disabled with 40% opacity and "coming soon" tooltip

### Sprint 3 — OHLCV Provider & Caching ✅

#### Provider Abstraction
- `OhlcvProvider` interface at `src/lib/api/ohlcv/types.ts`
- `mockProvider` — wraps existing `generateOhlcv` deterministic generator
- `polygonProvider` — Polygon.io REST aggregates API with timeframe mapping and crypto ticker handling (`X:BTCUSD`)
- Auto-selects provider: Polygon if `POLYGON_API_KEY` is set, mock otherwise
- Automatic fallback to mock if Polygon request fails (429 rate limit, 5xx, timeout)

#### Redis Caching
- `@upstash/redis` for serverless-compatible caching
- Cache key pattern: `ohlcv:{symbol}:{timeframe}`
- Per-timeframe TTLs: 30s (1m) to 14400s (1M)
- Graceful degradation: no Redis credentials = caching skipped
- Response headers: `X-Data-Source` (polygon/mock/cache/mock-fallback) and `X-Cache-Hit` (true/false)

#### OHLCV API Route
- `GET /api/ohlcv` — cache check → provider fetch → fallback → cache write
- Zod validation on query params (symbol, timeframe, count)
- 502 error response with `PROVIDER_ERROR` code on total failure

### Sprint 3b — Indicators v1 ✅

#### Indicator Calculations
- `calcSMA` — Simple Moving Average with configurable period
- `calcEMA` — Exponential Moving Average (SMA-seeded, standard multiplier)
- `calcRSI` — Relative Strength Index (Wilder's smoothing)
- All functions at `src/lib/chart/indicators.ts`

#### Indicator Rendering
- SMA and EMA render as `LineSeries` overlays on the main price chart
- RSI renders in a separate lower pane via lightweight-charts `addPane()` API (25% height)
- Indicator colors: SMA blue (#2962FF), EMA orange (#FF6D00), RSI purple (#AB47BC)

#### Indicator Management
- `IndicatorConfig` type in Zustand store with id, type, period, visible, color
- Default indicators: SMA(20) on, EMA(50) on, RSI(14) off
- Indicators tab in RightPanel: toggle visibility, remove, add new via dropdown
- `AddIndicatorDropdown` — add SMA, EMA, or RSI instances
- Color dot per indicator in the panel list
- Indicators recalculate on symbol/timeframe change

### Sprint 4 — Alerts System v1 ✅

#### Price Alerts
- Alert model in Prisma: symbol, condition (gt/lt), threshold, isActive, triggered, triggeredAt
- `GET /api/alerts` — list user's alerts (sorted by createdAt desc)
- `POST /api/alerts` — create alert with Zod validation (symbol, condition, threshold)
- `DELETE /api/alerts/[id]` — delete alert (ownership check)
- `PATCH /api/alerts/[id]` — mark alert as triggered (idempotent, sets isActive=false)

#### Client-Side Evaluation
- `useAlertEvaluator` hook — subscribes to tick store, evaluates active alerts against live prices
- Condition check: `gt` (price > threshold), `lt` (price < threshold)
- `firedRef` Set prevents duplicate triggers within a session
- Triggers update local Zustand state immediately, then fire-and-forget PATCH to persist

#### In-App Notifications
- `AlertToastContainer` — fixed bottom-right toast popups for triggered alerts
- Auto-dismiss after 8 seconds, manual dismiss via × button
- Shows symbol, condition label ("crossed above/below"), threshold, and current price
- `aria-live="polite"` for accessibility

#### Alerts Tab
- `AlertsTab` in RightPanel — fetches from API on mount, populates alert store
- `CreateAlertForm` — inline form (symbol from chart, condition dropdown, threshold input)
- Sorted display: active alerts first, then triggered
- Optimistic delete with API rollback on failure
- Loading, error, and empty states

#### Alert Store (Zustand)
- `alertStore` — holds alerts array and toasts array
- Actions: setAlerts, addAlert, removeAlert, markTriggered, addToast, dismissToast

### Sprint 5 — Saved Chart Layouts v1 ✅

#### Layout Persistence
- `SavedLayout` model in Prisma with `config_json` JSONB column (symbol, timeframe, indicators, drawings, panel state)
- `GET /api/layouts` — list user's saved layouts (sorted by default first, then updatedAt desc)
- `POST /api/layouts` — create layout with Zod validation (name, symbol, timeframe, config)
- `DELETE /api/layouts/[id]` — delete layout (ownership check)
- `PATCH /api/layouts/[id]` — set layout as default (unsets previous default)

#### Layout Save/Load
- `LayoutsDropdown` in DashboardHeader — save form with name input and "set as default" checkbox
- Load restores: symbol, timeframe, indicators (type/period/visible/color), horizontal line drawings, right panel tab and open state
- Optimistic delete with API rollback on failure
- Loading, error, and empty states

#### Drawing State Tracking
- `HLineDrawing` type and `drawings` array added to chartStore
- Horizontal line placements tracked in store for save/restore
- Eraser clears drawings from both chart and store
- ChartContainer restores drawings from store when loading a layout

#### Chart Store Additions
- `setIndicators`, `addDrawing`, `clearDrawings`, `setDrawings`, `setRightPanelOpen` actions
- Layout load sets all chart state atomically via store actions

### Sprint 6 — Billing / Subscription Gating v1 ✅

#### Free / Pro / Premium Plan Support
- Tier limits config at `src/lib/api/tierLimits.ts` — Free (1 watchlist/10 items, 2 indicators, 0 alerts, 0 layouts), Pro (3/50, 10, 5, 5), Premium (unlimited)
- `getUserPlan` helper at `src/lib/db/getUserPlan.ts` — fetches user's plan from Subscription row
- `subscriptionStore` (Zustand) — holds plan, limits, and usage; loaded on dashboard mount

#### Stripe Checkout
- `POST /api/checkout` — creates Stripe Checkout session for Pro or Premium upgrade
- Lazy-creates real Stripe customer from placeholder `pending:{clerkId}` on first checkout
- Price IDs configured via `STRIPE_PRO_PRICE_ID` and `STRIPE_PREMIUM_PRICE_ID` env vars
- Success/cancel redirects back to `/dashboard`

#### Stripe Billing Portal
- `POST /api/billing-portal` — creates Stripe Customer Portal session for subscription management
- Guards against users without a real Stripe customer (returns 400)

#### Stripe Webhook
- `POST /api/webhooks/stripe` — handles `customer.subscription.created`, `updated`, `deleted`
- Signature verification via `STRIPE_WEBHOOK_SECRET`
- Maps Stripe price IDs to plan enum, Stripe status to SubscriptionStatus enum
- Subscription deletion resets user to free plan

#### Server-Side Plan Enforcement
- `POST /api/alerts` — checks alert count against plan limit (403 `LIMIT_REACHED`)
- `POST /api/layouts` — checks layout count against plan limit (403 `LIMIT_REACHED`)
- `POST /api/watchlists/items` — checks watchlist item count against plan limit (403 `LIMIT_REACHED`)

#### Billing UI
- `UpgradeBadge` in DashboardHeader — shows "Upgrade" button for free users, plan badge for paid users
- `UpgradePrompt` inline component — shown in Alerts tab, Watchlist tab, and Layouts dropdown when limits reached
- "+ Save" button hidden in Layouts dropdown when at layout limit
- "+ New" alert button hidden when at alert limit
- "+ Add" watchlist button hidden when at watchlist item limit
- `GET /api/subscription` — returns current plan, limits, and usage counts
- `SubscriptionManager` in DashboardShell — fetches subscription data on mount

### Sprint 3c — Realtime Price Updates v1 ✅

#### Realtime Architecture
- `RealtimeProvider` interface at `src/lib/realtime/types.ts` — ready for Polygon WebSocket swap
- `mockProvider` — random walk tick simulator, ~1.5s interval, 0.05% volatility per tick
- Provider seeded from OHLCV last close prices so ticks start at realistic values
- `seedPrices()` method on provider interface for price initialization

#### Tick Store
- `tickStore` (Zustand) — holds `PriceTick` per symbol and `ConnectionStatus`
- `PriceTick`: symbol, price, change, changePercent, timestamp
- `ConnectionStatus`: disconnected → connecting → connected

#### Integration
- `TickStreamManager` in DashboardShell — subscribes all known symbols to tick stream
- `useTickStream` hook — manages provider lifecycle and symbol subscriptions
- Singleton provider pattern via `getRealtimeProvider()`
- ChartContainer: live ticks update last candle (close, high, low) and OHLCV legend
- WatchlistTab: `WatchlistPrice` component shows live price and % change per item
- DashboardHeader: `ConnectionStatus` component — green pulsing dot, "Live" label, current symbol price

---

## Architecture

### Key Files

| File | Purpose |
|---|---|
| `src/app/dashboard/page.tsx` | Main dashboard page (protected) |
| `src/components/DashboardShell.tsx` | Layout wrapper + tick stream manager |
| `src/components/DashboardHeader.tsx` | Top bar with symbol, timeframe, connection status, search |
| `src/components/LeftToolbar.tsx` | Drawing tool buttons |
| `src/components/RightPanel.tsx` | Watchlist/Alerts/Indicators tabs with live prices |
| `src/components/SymbolSearchModal.tsx` | Symbol search overlay |
| `src/components/chart/ChartContainer.tsx` | Chart rendering, indicators, live tick updates |
| `src/lib/store/chartStore.ts` | Zustand store (symbol, timeframe, tool, panel, indicators) |
| `src/lib/store/tickStore.ts` | Zustand store (live ticks, connection status) |
| `src/lib/api/symbols.ts` | Mock symbol directory |
| `src/lib/api/types.ts` | Shared API response types |
| `src/lib/api/ohlcv/index.ts` | OHLCV fetcher — cache → provider → fallback |
| `src/lib/api/ohlcv/types.ts` | OhlcvProvider interface |
| `src/lib/api/ohlcv/polygonProvider.ts` | Polygon.io REST integration |
| `src/lib/api/ohlcv/mockProvider.ts` | Mock OHLCV generator wrapper |
| `src/lib/api/ohlcv/cache.ts` | Upstash Redis cache layer |
| `src/lib/chart/generateOhlcv.ts` | Deterministic mock candle generator |
| `src/lib/chart/indicators.ts` | SMA, EMA, RSI calculation functions |
| `src/lib/realtime/types.ts` | RealtimeProvider interface |
| `src/lib/realtime/mockProvider.ts` | Mock tick simulator |
| `src/hooks/useTickStream.ts` | Tick stream hook + singleton provider |
| `src/lib/db/prisma.ts` | Prisma client singleton |
| `src/lib/db/resolveUser.ts` | Auto-create DB user from Clerk session |
| `src/app/api/ohlcv/route.ts` | OHLCV data endpoint (provider + cache) |
| `src/app/api/watchlists/route.ts` | Watchlist CRUD |
| `src/app/api/watchlists/items/route.ts` | Watchlist item add/remove |
| `src/app/api/webhooks/clerk/route.ts` | Clerk webhook sync |
| `src/lib/store/alertStore.ts` | Zustand store (alerts, toasts) |
| `src/hooks/useAlertEvaluator.ts` | Client-side alert evaluation against ticks |
| `src/components/AlertToastContainer.tsx` | Toast notifications for triggered alerts |
| `src/app/api/alerts/route.ts` | Alert list + create endpoints |
| `src/app/api/alerts/[id]/route.ts` | Alert delete + trigger endpoints |
| `src/app/api/layouts/route.ts` | Layout list + create endpoints |
| `src/app/api/layouts/[id]/route.ts` | Layout delete + set-default endpoints |
| `src/lib/stripe.ts` | Stripe client singleton (lazy proxy) |
| `src/lib/api/tierLimits.ts` | Plan-based feature limits config |
| `src/lib/db/getUserPlan.ts` | Fetch user's subscription plan |
| `src/lib/store/subscriptionStore.ts` | Zustand store (plan, limits, usage) |
| `src/components/UpgradeButton.tsx` | UpgradeBadge + UpgradePrompt components |
| `src/app/api/subscription/route.ts` | Subscription + limits + usage endpoint |
| `src/app/api/checkout/route.ts` | Stripe Checkout session creation |
| `src/app/api/billing-portal/route.ts` | Stripe Customer Portal session creation |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler (signature verified) |
| `prisma/schema.prisma` | Database schema |

### Zustand Stores

#### chartStore
```
symbol: string            — active chart symbol (default: 'AAPL')
timeframe: Timeframe      — active timeframe (default: '1D')
activeTool: DrawingTool   — current drawing tool (default: 'select')
rightPanelTab: RightPanelTab — active right panel tab (default: 'watchlist')
rightPanelOpen: boolean   — right panel visibility (default: true)
indicators: IndicatorConfig[] — active indicators with type, period, visible, color
drawings: HLineDrawing[]  — tracked horizontal line drawings for layout save/restore
```

#### tickStore
```
ticks: Record<string, PriceTick> — latest tick per symbol
status: ConnectionStatus         — disconnected | connecting | connected
```

#### alertStore
```
alerts: AlertResponse[]  — user's alerts fetched from API
toasts: AlertToast[]     — active toast notifications for triggered alerts
```

#### subscriptionStore
```
plan: PlanType            — current plan (free/pro/premium)
limits: TierLimitsResponse — max watchlists, items, indicators, alerts, layouts
usage: object             — current counts of watchlists, items, alerts, layouts
loaded: boolean           — whether subscription data has been fetched
```

### Database Models

- **User** — `id`, `clerkId`, `email`, `name`, `createdAt`
- **Subscription** — `id`, `userId`, `stripeCustomerId`, `plan`, `status`, `currentPeriodEnd`
- **Watchlist** — `id`, `userId`, `name`, `isDefault`, `createdAt`
- **WatchlistItem** — `id`, `watchlistId`, `symbol`, `displayOrder`
- **Alert** — `id`, `userId`, `symbol`, `condition`, `threshold`, `isActive`, `triggered`, `triggeredAt`, `createdAt`
- **SavedLayout** — `id`, `userId`, `name`, `symbol`, `timeframe`, `isDefault`, `configJson`, `createdAt`, `updatedAt`

---

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in Clerk + Neon credentials
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev
```

### Required Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend auth |
| `CLERK_SECRET_KEY` | Yes | Clerk backend auth |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection |
| `POLYGON_API_KEY` | No | Polygon.io market data (falls back to mock) |
| `UPSTASH_REDIS_REST_URL` | No | Redis caching (skipped if absent) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis caching (skipped if absent) |
| `STRIPE_SECRET_KEY` | Yes | Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signature verification |
| `STRIPE_PRO_PRICE_ID` | Yes | Stripe Price ID for Pro plan |
| `STRIPE_PREMIUM_PRICE_ID` | Yes | Stripe Price ID for Premium plan |

---

## Next Development Steps

1. **TanStack React Query** — replace raw `fetch` calls with React Query for caching, refetching, optimistic updates
2. **Polygon WebSocket integration** — swap mock tick provider for real Polygon WebSocket with Clerk JWT auth
3. **Drawing tools v2** — trendline, fibonacci retracement, rectangle annotation
4. **Indicator settings** — editable period/color per indicator, persist indicator config
5. **Alerts v2** — email/SMS notifications, cron worker for server-side evaluation, indicator-based alerts
6. **Saved layouts v2** — layout sharing, layout update/overwrite, auto-load default layout on startup
7. **Testing** — Vitest unit tests, Playwright E2E, accessibility audits
8. **Deployment** — Vercel (frontend), Railway (WebSocket service), staging environment
