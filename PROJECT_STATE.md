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
| Payments | Stripe | Planned |
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
```

#### tickStore
```
ticks: Record<string, PriceTick> — latest tick per symbol
status: ConnectionStatus         — disconnected | connecting | connected
```

### Database Models

- **User** — `id`, `clerkId`, `email`, `name`, `createdAt`
- **Subscription** — `id`, `userId`, `stripeCustomerId`, `plan`, `status`, `currentPeriodEnd`
- **Watchlist** — `id`, `userId`, `name`, `isDefault`, `createdAt`
- **WatchlistItem** — `id`, `watchlistId`, `symbol`, `displayOrder`

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

---

## Next Development Steps

1. **TanStack React Query** — replace raw `fetch` calls with React Query for caching, refetching, optimistic updates
2. **Polygon WebSocket integration** — swap mock tick provider for real Polygon WebSocket with Clerk JWT auth
3. **Alerts system** — `POST/DELETE /api/alerts`, price-crossing logic, alerts tab wired to DB
4. **Saved layouts** — persist chart layout (symbol, timeframe, indicators, drawings) per user
5. **Drawing tools v2** — trendline, fibonacci retracement, rectangle annotation
6. **Indicator settings** — editable period/color per indicator, persist indicator config
7. **Stripe integration** — subscription checkout, billing portal, tier enforcement
8. **Subscription tier enforcement** — restrict indicators, watchlists, alerts, data delay by plan
9. **Testing** — Vitest unit tests, Playwright E2E, accessibility audits
10. **Deployment** — Vercel (frontend), Railway (WebSocket service), staging environment
