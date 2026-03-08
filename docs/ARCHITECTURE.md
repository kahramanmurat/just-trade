# Architecture — JustTrade

## 1. System Overview

```
                          ┌─────────────────────────────┐
                          │        Browser (Client)      │
                          │  Next.js App Router (React)  │
                          │  Lightweight Charts          │
                          │  Zustand + React Query       │
                          └────────────┬────────────────-┘
                                       │ HTTPS / WSS
              ┌────────────────────────┼─────────────────────┐
              │                        │                     │
   ┌──────────▼──────────┐  ┌──────────▼──────────┐  ┌──────▼───────────┐
   │  Next.js API Routes │  │  WebSocket Service  │  │  Clerk Auth CDN  │
   │  (Vercel Edge)      │  │  (Railway/Render)   │  │  (JWT Validation)│
   └──────────┬──────────┘  └──────────┬──────────┘  └──────────────────┘
              │                        │
   ┌──────────▼──────────┐  ┌──────────▼──────────┐
   │  PostgreSQL (Neon)  │  │  Redis (Upstash)     │
   │  via Prisma ORM     │  │  Price cache + RL    │
   └─────────────────────┘  └──────────┬──────────-┘
                                        │
                             ┌──────────▼──────────┐
                             │  Market Data API     │
                             │  (Polygon.io / Alpaca│
                             │  / Binance WS)       │
                             └─────────────────────-┘
```

---

## 2. Frontend

### Framework
- **Next.js 14+** with App Router
- **React Server Components (RSC)** for static/layout-level rendering (header, panel shells)
- **Client Components** for interactive elements (chart, watchlist, modals)

### State Management
| Layer | Library | Usage |
|---|---|---|
| Global UI state | **Zustand** | Active symbol, timeframe, selected tool, panel open state |
| Server data | **React Query (TanStack Query)** | Watchlists, alerts, saved layouts, subscriptions |
| Form state | **React Hook Form** | Alert creation, layout naming |
| URL state | **Next.js `useSearchParams`** | Symbol, timeframe in URL for shareability |

### Charting
- **`lightweight-charts`** (TradingView open-source)
- Custom React wrapper `ChartContainer` that manages chart lifecycle
- Separate `SeriesManager` for adding/removing candlestick, line, indicator series
- Drawing tools implemented as chart plugins or overlay canvas

### Styling
- **Tailwind CSS** with custom design tokens in `tailwind.config.ts`
- All colors via CSS custom properties (`var(--color-*)`)
- No inline styles, no CSS modules — Tailwind only

### Key Dependencies
```
next, react, react-dom
lightweight-charts
@clerk/nextjs
zustand
@tanstack/react-query
react-hook-form
@stripe/stripe-js
tailwindcss
```

---

## 3. Backend — Next.js API Routes

REST endpoints in `src/app/api/`. All authenticated via Clerk JWT middleware.

### Responsibilities
- CRUD for watchlists, alerts, saved layouts, drawings
- Subscription status and Stripe webhook handling
- Historical OHLCV data proxy (fetched from market data provider, cached in Redis)

### Auth Middleware
```
All /api/* routes → Clerk middleware validates JWT
→ Extracts userId
→ Passes to route handler
```

### Caching Strategy
- Historical OHLCV data: Redis with TTL (1min data = 60s TTL, 1D = 3600s TTL)
- Watchlist prices: served via WebSocket, not REST

---

## 4. Backend — WebSocket Streaming Service

A **standalone Node.js service** (not Next.js) deployed on Railway or Render.

### Purpose
- Maintains persistent connection to market data provider(s)
- Manages client subscriptions (which symbols each client is watching)
- Broadcasts real-time price updates to connected clients

### Tech Stack
- Node.js + `ws` library (or `socket.io`)
- Redis Pub/Sub for scaling across multiple instances

### Protocol
```
Client → Server: { type: "subscribe", symbols: ["AAPL", "BTC/USD"] }
Server → Client: { type: "tick", symbol: "AAPL", price: 182.34, change: +0.54, changePercent: +0.30, timestamp: 1234567890 }
Client → Server: { type: "unsubscribe", symbols: ["AAPL"] }
```

### Authentication
- Client sends Clerk JWT on WebSocket handshake
- Server validates token before accepting connection
- Validates subscription tier to restrict real-time vs delayed data

---

## 5. Database — PostgreSQL via Prisma

**Managed provider:** Neon (serverless Postgres, good Vercel integration)

**ORM:** Prisma with TypeScript-generated client

### Migration Strategy
- `prisma migrate dev` for local development
- `prisma migrate deploy` in CI/CD pipeline before deployment

### Connection Pooling
- Neon's built-in connection pooling (PgBouncer) for serverless environments
- Prisma connection pool settings tuned for serverless (1 connection per function invocation)

---

## 6. Caching — Redis via Upstash

**Managed provider:** Upstash (HTTP-based Redis, serverless-compatible)

### Usage
| Key Pattern | TTL | Data |
|---|---|---|
| `ohlcv:{symbol}:{timeframe}` | 60–3600s | Serialized OHLCV array |
| `tick:{symbol}` | 5s | Latest price tick |
| `rl:{userId}` | 60s | Rate limit counter |

### Rate Limiting
- 100 API requests/min per authenticated user
- 20 requests/min per IP for unauthenticated endpoints

---

## 7. Authentication — Clerk

- **Clerk** handles: sign-up, sign-in, OAuth (Google, GitHub), MFA, session management
- **`@clerk/nextjs`** middleware protects all routes under `/dashboard` and `/api`
- `userId` from Clerk synced to `users` table on first login via webhook
- JWT passed in `Authorization: Bearer` header for WebSocket auth

---

## 8. Payments — Stripe

- **Stripe Checkout** for subscription creation
- **Stripe Customer Portal** for plan management and cancellation
- **Stripe Webhooks** update `subscriptions` table on:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Webhook endpoint: `POST /api/webhooks/stripe` (unprotected, Stripe signature verified)

---

## 9. Deployment

| Service | Provider | Purpose |
|---|---|---|
| Frontend + API Routes | **Vercel** | Next.js hosting with edge functions |
| WebSocket Service | **Railway** or **Render** | Always-on Node.js WebSocket server |
| PostgreSQL | **Neon** | Serverless Postgres with branching |
| Redis | **Upstash** | Serverless Redis |
| Auth | **Clerk** | Managed auth |
| Payments | **Stripe** | Subscription billing |
| Market Data | **Polygon.io** / **Alpaca** | OHLCV historical + real-time quotes |

### Environment Variables
```
DATABASE_URL=
DIRECT_URL=                  # Neon direct connection (for migrations)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=        # Svix signing secret for Clerk webhook verification
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
POLYGON_API_KEY=             # Primary market data provider
RESEND_API_KEY=              # Transactional email (alert notifications)
WEBSOCKET_SERVICE_URL=
NEXT_PUBLIC_WEBSOCKET_URL=
ALERT_WORKER_SECRET=         # Shared secret for internal alert evaluation calls
```

---

## 9b. Market Data Provider

**Selected provider: Polygon.io** (primary for equities + crypto). Binance WebSocket used for crypto real-time ticks as fallback when Polygon WebSocket is unavailable.

| Data type | Source | Fallback |
|---|---|---|
| Historical OHLCV (equities) | Polygon.io REST API | None (show error state) |
| Historical OHLCV (crypto) | Polygon.io REST API | Binance Klines REST |
| Real-time ticks (equities) | Polygon.io WebSocket | None (show staleness) |
| Real-time ticks (crypto) | Polygon.io WebSocket | Binance WebSocket |

**Market data provider outage behavior:** If Polygon.io returns 5xx or connection drops, the WebSocket service broadcasts a `{ type: "provider_error", message: "..." }` message to all connected clients. The frontend shows a global "Market data unavailable" banner. Cached OHLCV data continues to serve historical charts; live prices go stale.

---

## 9c. Alert Evaluation Service

A standalone cron worker that evaluates active alerts against current prices.

**Deployment:** Railway cron job (or Vercel cron if latency requirements allow)
**Location in codebase:** `src/worker/alertEvaluator.ts`
**Owner:** Backend API Agent

**Process:**
1. Every 60 seconds: fetch all `alerts` where `is_active = true` and `triggered_at IS NULL`
2. For each alert, get latest price from Redis (`tick:{symbol}`)
3. Evaluate `condition_type` + `threshold` against current price
4. If condition met: call `POST /api/alerts/trigger` with internal `ALERT_WORKER_SECRET`
5. The trigger endpoint sets `triggered_at`, sends email via Resend, and optionally sends browser push

**Constraints:**
- Worker must not evaluate the same alert twice (use Redis lock: `alert_lock:{alertId}` with 55s TTL)
- Free-tier prices are delayed 15 min — worker must use delayed tick for Free users' alerts
- If Resend email fails, still set `triggered_at` (don't re-trigger). Log failure to monitoring.

---

## 9d. Email Notifications

**Provider: Resend** (`resend.com`) — chosen for Next.js/serverless compatibility.

**Triggered by:** `POST /api/alerts/trigger` (called by alert evaluation worker)
**Template:** React Email component at `src/emails/AlertTriggered.tsx`

**Email content:**
- Symbol and condition that triggered (e.g., "AAPL crossed above $185.00")
- Trigger timestamp
- Link to chart: `https://justtrade.app/dashboard?symbol=AAPL`
- One-click unsubscribe link (required for CAN-SPAM compliance)

---

## 9e. WebSocket JWT Refresh

Clerk JWTs expire after 60 seconds (default). The WebSocket client must refresh the token proactively:

1. On WebSocket open, client sends `{ type: "auth", token: "<clerk_jwt>" }`
2. Client sets a local timer to re-authenticate every 50 seconds: `{ type: "auth", token: "<new_jwt>" }`
3. New JWT fetched via Clerk's `getToken()` client-side method (no reconnect required)
4. Server responds to `auth` message with `{ type: "auth_ok" }` or closes connection with 4001 if invalid
5. If client fails to re-auth within 65 seconds, server closes connection (client reconnects)

This is owned by: **Charting Agent** (WebSocket client in `src/lib/chart/`) + **Backend API Agent** (WebSocket server auth handler).

---

## 9f. Staging Environment

| Aspect | Value |
|---|---|
| URL | `https://staging.justtrade.app` (separate Vercel project, `staging` branch) |
| Database | Dedicated Neon branch: `staging` (separate from `main` and `dev`) |
| Redis | Separate Upstash database (not shared with production) |
| Stripe | Test mode (`sk_test_*` keys) — always test mode in staging |
| Clerk | Separate Clerk application: `justtrade-staging` |
| WebSocket | Staging Railway service instance |
| Market data | Polygon.io with same API key (staging uses same data; quota shared) |
| Test credentials | Seeded via `pnpm db:seed:staging`; shared with QA Agent in secure password manager |

**Promotion path:** `dev` branch → staging (auto-deploy) → manual QA gate → `main` (auto-deploy to production)

---

## 10. Security

| Concern | Mitigation |
|---|---|
| Authentication | Clerk JWTs, short-lived tokens |
| Authorization | Prisma queries scoped to `userId` from verified JWT |
| Row-level isolation | All queries include `WHERE user_id = $userId` |
| Rate limiting | Redis counter per user + per IP |
| Input validation | Zod schemas on all API route inputs |
| HTTPS only | Vercel enforces TLS, no HTTP fallback |
| Stripe webhooks | Signature verification with `STRIPE_WEBHOOK_SECRET` |
| Environment secrets | Vercel + Railway encrypted env vars, never in codebase |
| SQL injection | Prisma parameterized queries only |

---

## 11. Folder Structure

```
just-trade/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (sign-in, sign-up)
│   │   ├── dashboard/          # Main app (protected)
│   │   └── api/                # API routes
│   │       ├── watchlists/
│   │       ├── alerts/
│   │       ├── layouts/
│   │       ├── push-subscriptions/
│   │       └── webhooks/
│   ├── components/
│   │   ├── chart/              # Chart-specific components
│   │   ├── ui/                 # Design system primitives
│   │   └── ...                 # Feature components
│   ├── emails/                 # React Email templates (alert notifications)
│   ├── lib/
│   │   ├── api/                # API client utilities, Zod schemas
│   │   ├── chart/              # Chart helpers, plugins, WS client
│   │   ├── db/                 # Prisma client singleton
│   │   └── store/              # Zustand stores (global UI state)
│   ├── worker/                 # Cron workers (alert evaluation)
│   │   └── alertEvaluator.ts
│   ├── hooks/                  # Custom React hooks
│   └── styles/                 # Global CSS, Tailwind base
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── websocket-service/          # Standalone Node.js WebSocket server
├── tests/                      # Vitest unit tests
├── playwright/                 # Playwright E2E tests
├── docs/                       # This documentation
├── CLAUDE.md
└── AGENTS.md
```
