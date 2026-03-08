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
| State | Zustand (UI) + TanStack Query (server) | Zustand active, TanStack Query planned |
| Auth | Clerk (`@clerk/nextjs`) | Active |
| Database | Prisma 7 + Neon PostgreSQL | Active |
| Caching | Upstash Redis | Planned |
| Payments | Stripe | Planned |
| Real-time | WebSocket service (Railway) | Planned |
| Testing | Vitest + Playwright | Planned |

---

## Current Working Features

- **Dashboard shell** — header, left toolbar, chart area, right panel (responsive layout)
- **Chart engine** — lightweight-charts v5 candlestick chart with OHLCV legend overlay, crosshair, watermark
- **Symbol selection** — symbol search modal + watchlist click to switch active symbol
- **Timeframe selection** — header timeframe buttons (1m, 5m, 15m, 1H, 4H, 1D, 1W)
- **Mock OHLCV API** — `GET /api/ohlcv?symbol=X&timeframe=Y` returns generated candle data
- **Watchlist persistence** — DB-backed default watchlist with auto-seeded symbols (AAPL, TSLA, NVDA, MSFT)
- **Watchlist add/remove** — "+ Add" dropdown to add symbols, hover "×" to remove, optimistic UI with API rollback
- **Drawing tools v1** — horizontal line (click to place dashed price line), eraser (clears all lines), select (default cursor)
- **Unimplemented tools** — trendline, fibonacci, rectangle, text, magnet shown with "coming soon" tooltip and disabled state
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
- `resolveUser` helper for local dev (auto-creates user from Clerk session)

### Sprint 2 — Dashboard Shell & Chart Engine ✅

#### Dashboard Shell
- `DashboardShell` — flex layout: left toolbar, chart area, right panel
- `DashboardHeader` — logo, symbol display, timeframe buttons, search trigger, panel toggle
- `LeftToolbar` — 8 drawing tool buttons with icons, implemented/coming-soon states
- `RightPanel` — tabbed panel (Watchlist, Alerts, Indicators) with tab bar

#### Chart Engine
- `ChartContainer` — lightweight-charts v5 integration
- Candlestick series with up/down color tokens
- OHLCV legend overlay (O, H, L, C, Vol) tracks crosshair
- Text watermark showing active symbol
- Resize observer for responsive chart sizing
- Fetches data from `/api/ohlcv` on symbol/timeframe change
- Loading and error states

#### Symbol Selection
- `SymbolSearchModal` — search/filter across 6 mock symbols (AAPL, TSLA, NVDA, MSFT, BTCUSD, ETHUSD)
- Symbol directory at `src/lib/api/symbols.ts` with `searchSymbols()` and `findSymbol()`
- Clicking a watchlist item or search result sets the active symbol via Zustand

#### Mock OHLCV API
- `GET /api/ohlcv` — generates deterministic candle data per symbol/timeframe
- Supports timeframes: 1m, 5m, 15m, 1H, 4H, 1D, 1W
- Zod validation on query params

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
- Error display for duplicates and network failures

#### Drawing Tools v1
- Horizontal line: click chart to place dashed price line at cursor price
- Eraser: removes all placed price lines, resets tool to select
- `activeToolRef` pattern keeps chart click handler in sync with Zustand state
- Crosshair cursor when hline tool is active
- Unimplemented tools (trendline, fibonacci, rectangle, text, magnet) disabled with 40% opacity and "coming soon" tooltip

---

## Architecture

### Key Files

| File | Purpose |
|---|---|
| `src/app/dashboard/page.tsx` | Main dashboard page (protected) |
| `src/components/DashboardShell.tsx` | Layout wrapper |
| `src/components/DashboardHeader.tsx` | Top bar with symbol, timeframe, search |
| `src/components/LeftToolbar.tsx` | Drawing tool buttons |
| `src/components/RightPanel.tsx` | Watchlist/Alerts/Indicators tabs |
| `src/components/SymbolSearchModal.tsx` | Symbol search overlay |
| `src/components/chart/ChartContainer.tsx` | Chart rendering with lightweight-charts |
| `src/lib/store/chartStore.ts` | Zustand store (symbol, timeframe, tool, panel state) |
| `src/lib/api/symbols.ts` | Mock symbol directory |
| `src/lib/api/types.ts` | Shared API response types |
| `src/lib/db/prisma.ts` | Prisma client singleton |
| `src/lib/db/resolveUser.ts` | Auto-create DB user from Clerk session |
| `src/app/api/ohlcv/route.ts` | Mock OHLCV data endpoint |
| `src/app/api/watchlists/route.ts` | Watchlist CRUD |
| `src/app/api/watchlists/items/route.ts` | Watchlist item add/remove |
| `src/app/api/webhooks/clerk/route.ts` | Clerk webhook sync |
| `prisma/schema.prisma` | Database schema |

### Zustand Store State

```
symbol: string          — active chart symbol (default: 'AAPL')
timeframe: Timeframe    — active timeframe (default: '1D')
activeTool: DrawingTool — current drawing tool (default: 'select')
rightPanelTab: RightPanelTab — active right panel tab (default: 'watchlist')
rightPanelOpen: boolean — right panel visibility (default: true)
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

Required environment variables: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`

---

## Next Development Steps

1. **Real market data** — integrate a market data provider (Alpha Vantage, Polygon, or Twelve Data) to replace mock OHLCV
2. **WebSocket real-time prices** — live price streaming via standalone WS service
3. **TanStack React Query** — replace raw `fetch` calls with React Query for caching, refetching, optimistic updates
4. **Alerts system** — `POST/DELETE /api/alerts`, price-crossing logic, alerts tab wired to DB
5. **Saved layouts** — persist chart layout (symbol, timeframe, indicators, drawings) per user
6. **Drawing tools v2** — trendline, fibonacci retracement, rectangle annotation
7. **Indicators** — SMA, EMA, RSI overlays on chart via lightweight-charts plugins
8. **Stripe integration** — subscription checkout, billing portal, tier enforcement
9. **Upstash Redis caching** — cache OHLCV responses for performance targets
10. **Testing** — Vitest unit tests, Playwright E2E, accessibility audits
