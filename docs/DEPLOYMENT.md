# Deployment Guide — JustTrade

## Infrastructure Overview

| Service | Provider | Purpose |
|---|---|---|
| Frontend + API | Vercel | Next.js hosting with serverless functions |
| Database | Neon | Serverless PostgreSQL with branching |
| Cache | Upstash | Serverless Redis (OHLCV cache + rate limiting) |
| Auth | Clerk | Managed authentication |
| Payments | Stripe | Subscription billing |
| Market Data | Polygon.io | Historical OHLCV + real-time quotes |
| WebSocket Service | Railway or Render | Standalone Node.js real-time price streaming |
| Email | Resend | Transactional email (alert notifications) |

---

## Prerequisites

- Node.js 20+
- pnpm 9+ (via corepack: `corepack enable`)
- Accounts: Vercel, Neon, Upstash, Clerk, Stripe, Polygon.io (optional), Resend (optional)

---

## Environment Variables

All variables are listed in `.env.example`. Copy to `.env.local` for local development.

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string |
| `DIRECT_URL` | Neon direct connection string (used by Prisma migrations only) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend auth (public, starts with `pk_`) |
| `CLERK_SECRET_KEY` | Clerk backend auth (starts with `sk_test_` or `sk_live_`) |
| `CLERK_WEBHOOK_SECRET` | Svix signing secret for Clerk webhook verification |
| `STRIPE_SECRET_KEY` | Stripe API access (starts with `sk_test_` or `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification (starts with `whsec_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe frontend (public, starts with `pk_`) |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for the Pro plan ($15/mo) |
| `STRIPE_PREMIUM_PRICE_ID` | Stripe Price ID for the Premium plan ($39/mo) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key for the AI assistant |

### Optional

| Variable | Purpose | Fallback behavior |
|---|---|---|
| `POLYGON_API_KEY` | Polygon.io market data API key | Falls back to deterministic mock data generator |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint | Caching skipped; every OHLCV request hits the provider |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis authentication token | Rate limiting allows all requests |
| `RESEND_API_KEY` | Resend transactional email API key | Alert email notifications disabled |
| `WEBSOCKET_SERVICE_URL` | Internal WebSocket service URL (server-side) | Real-time features unavailable |
| `NEXT_PUBLIC_WEBSOCKET_URL` | Public WebSocket URL (client-side) | Client uses mock tick simulator |
| `ALERT_WORKER_SECRET` | Shared secret for internal alert evaluation calls | Alert worker cannot trigger alerts via API |

### Clerk Routing (required, public)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |

---

## Vercel Deployment

### Initial Setup

1. Connect the GitHub repository to Vercel
2. Set the framework preset to **Next.js**
3. Set the build command: `pnpm build`
4. Set the install command: `pnpm install`
5. Add all environment variables listed above in the Vercel dashboard (Settings > Environment Variables)
6. Deploy

### Build Settings

| Setting | Value |
|---|---|
| Node.js version | 20.x |
| Build command | `pnpm build` |
| Output directory | `.next` |
| Install command | `pnpm install` |

Prisma client generation happens automatically during `pnpm build` via the `postinstall` script or must be added as a prebuild step if not configured:

```bash
pnpm prisma generate && pnpm next build
```

### Automatic Deployments

- Push to `main` triggers a **production** deployment
- Push to `staging` triggers a **preview** deployment (configure as the staging environment)
- Pull request branches trigger **preview** deployments with unique URLs

---

## Database (Neon)

### Setup

1. Create a Neon project at [console.neon.tech](https://console.neon.tech)
2. Create database branches: `main` (production), `staging`, `dev`
3. Get connection strings for each branch
4. Set `DATABASE_URL` to the **pooled** connection string (uses PgBouncer)
5. Set `DIRECT_URL` to the **direct** connection string (required for Prisma migrations)

### Migrations

```bash
# Local development — creates migration files and applies them
pnpm prisma migrate dev

# CI / Staging / Production — applies pending migrations without prompting
pnpm prisma migrate deploy

# Regenerate Prisma client after schema changes
pnpm prisma generate
```

### Connection Pooling

- Use Neon's **pooled** connection string for `DATABASE_URL` (all application queries go through PgBouncer)
- Use Neon's **direct** connection string for `DIRECT_URL` (Prisma migrations require a direct connection)
- Prisma is configured for serverless environments (1 connection per function invocation)

### Database Models

The schema (`prisma/schema.prisma`) includes: `User`, `Subscription`, `Watchlist`, `WatchlistItem`, `Alert`, `SavedLayout`. See `/docs/DB_SCHEMA.md` for full details.

---

## Redis (Upstash)

### Setup

1. Create an Upstash Redis database at [console.upstash.com](https://console.upstash.com)
2. Get the REST URL and token from the database details page
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel

### Usage

| Key Pattern | TTL | Data |
|---|---|---|
| `ohlcv:{symbol}:{timeframe}` | 30s (1m) to 14400s (1M) | Serialized OHLCV array |
| `tick:{symbol}` | 5s | Latest price tick |
| `rl:{userId}` | 60s | Rate limit counter |

Rate limits:
- Authenticated users: 100 requests/min
- Unauthenticated endpoints: 20 requests/min per IP

### Graceful Degradation

Redis is **optional**. If credentials are not set:
- OHLCV caching is skipped (every request hits the market data provider directly)
- Rate limiting allows all requests through
- The app remains fully functional, but with higher latency and provider API usage

---

## Authentication (Clerk)

### Setup

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Configure OAuth providers (Google, GitHub) if desired
3. Set webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
4. Get the publishable key and secret key from Clerk dashboard
5. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

### Webhook Configuration

The Clerk webhook syncs new users to the local database on first sign-up.

1. In Clerk dashboard, go to **Webhooks**
2. Create a new endpoint: `POST https://your-domain.com/api/webhooks/clerk`
3. Subscribe to the `user.created` event
4. Copy the **Svix signing secret** and set it as `CLERK_WEBHOOK_SECRET`

**Local development fallback:** The `resolveUser` helper auto-creates a database user from the Clerk session if the webhook has not fired yet, handling race conditions gracefully.

### Protected Routes

- All routes under `/dashboard` are protected by Clerk middleware
- All `/api/*` routes validate `userId` from the Clerk JWT
- The WebSocket service validates Clerk JWTs on handshake

---

## Payments (Stripe)

### Setup

1. Create a Stripe account at [dashboard.stripe.com](https://dashboard.stripe.com)
2. Use **test mode** for development and staging
3. Create two subscription products with monthly prices:
   - **Pro** ($15/mo) — copy the price ID to `STRIPE_PRO_PRICE_ID`
   - **Premium** ($39/mo) — copy the price ID to `STRIPE_PREMIUM_PRICE_ID`
4. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
5. Configure the webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Subscribe to events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
6. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Testing Stripe Locally

```bash
# Install the Stripe CLI (https://stripe.com/docs/stripe-cli)
stripe login

# Forward webhook events to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

### Subscription Tiers

| Plan | Price | Watchlists | Symbols/List | Indicators | Alerts | Layouts | Data |
|---|---|---|---|---|---|---|---|
| Free | $0 | 1 | 10 | 2 | 0 | 0 | 15min delayed |
| Pro | $15/mo | 3 | 50 | 10 | 5 | 5 | Real-time |
| Premium | $39/mo | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Real-time |

---

## Market Data (Polygon.io)

### Setup (Optional)

1. Create a Polygon.io account at [polygon.io](https://polygon.io)
2. Get an API key from the dashboard
3. Set `POLYGON_API_KEY` in the environment

### Provider Abstraction

The OHLCV API route (`/api/ohlcv`) uses a provider abstraction layer:
- If `POLYGON_API_KEY` is set, it uses the Polygon.io REST API
- If the key is absent or a Polygon request fails (429 rate limit, 5xx), it falls back to a deterministic mock data generator

The response includes diagnostic headers:
- `X-Data-Source`: `polygon`, `mock`, `cache`, or `mock-fallback`
- `X-Cache-Hit`: `true` or `false`

### Data Sources

| Data Type | Primary Source | Fallback |
|---|---|---|
| Historical OHLCV (equities) | Polygon.io REST API | Mock generator |
| Historical OHLCV (crypto) | Polygon.io REST API | Mock generator |
| Real-time ticks | Mock tick simulator (Polygon WebSocket planned) | N/A |

---

## WebSocket Service (Railway)

The WebSocket service is a standalone Node.js application in the `websocket-service/` directory. It is **not** part of the Next.js deployment.

### Setup

1. Create a Railway project at [railway.app](https://railway.app)
2. Connect the `websocket-service/` directory
3. Set environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CLERK_SECRET_KEY`
4. Deploy
5. Set the public URL as `NEXT_PUBLIC_WEBSOCKET_URL` in Vercel
6. Set the internal URL as `WEBSOCKET_SERVICE_URL` in Vercel

### Current State

The WebSocket architecture is defined but the production service uses a **mock tick simulator** for real-time prices. The mock provider generates random-walk ticks at approximately 1.5-second intervals. The WebSocket client in the frontend is ready for a provider swap.

---

## Email Notifications (Resend)

### Setup (Optional)

1. Create a Resend account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Get an API key and set `RESEND_API_KEY`

### Usage

Resend is used for alert notification emails when price alerts are triggered. The email template is a React Email component at `src/emails/AlertTriggered.tsx`.

If `RESEND_API_KEY` is not set, alert triggering still works (the alert is marked as triggered) but no email is sent.

---

## CI/CD Pipeline

### GitHub Actions

The CI pipeline is defined in `.github/workflows/ci.yml`.

**Triggers:**
- Push to `main`
- Pull requests targeting `main`

**Steps (in order):**
1. Checkout code
2. Enable corepack and set up Node.js 20 with pnpm cache
3. Install dependencies (`pnpm install --frozen-lockfile`)
4. Generate Prisma client (`pnpm prisma generate`)
5. Lint (`pnpm lint`)
6. Typecheck (`pnpm tsc --noEmit`)
7. Unit tests with coverage (`pnpm test:coverage`)
8. Production build (`pnpm build`)

CI uses mock environment variables for Clerk, Stripe, and database connections so that the build succeeds without real credentials.

### Pre-deployment Checklist

1. All CI checks pass (lint, typecheck, tests, build)
2. Database migrations applied: `pnpm prisma migrate deploy`
3. No high-severity vulnerabilities: `pnpm audit --audit-level=high`
4. Coverage thresholds met: `src/lib/` at 80%+, overall at 70%+
5. E2E tests pass against staging (when applicable)

---

## Monitoring and Health

### Vercel

- Function execution logs available in the Vercel dashboard
- Error tracking via Vercel's built-in monitoring
- Deployment logs show build output and any failures

### Health Checks

| Check | Method |
|---|---|
| App alive | `GET /` returns 200 |
| API functional | `GET /api/ohlcv?symbol=AAPL&timeframe=1D` returns OHLCV data |
| Auth working | Any `/api/*` route returns 401 without auth (not 500) |
| WebSocket | Connection status indicator in the dashboard header (green = connected) |

### Response Headers

The OHLCV endpoint returns diagnostic headers useful for monitoring:
- `X-Data-Source` — which provider served the data
- `X-Cache-Hit` — whether the response came from Redis cache
- `X-RateLimit-Remaining` — remaining requests in the current window

---

## Rollback

### Vercel (Frontend + API)

1. Go to Vercel dashboard and select the project
2. Navigate to **Deployments**
3. Find the previous successful deployment
4. Click **Promote to Production**

This instantly switches production traffic to the previous deployment with zero downtime.

### Database

Database rollbacks must be handled manually:

1. Each Prisma migration file in `prisma/migrations/` contains the forward SQL
2. Write and test rollback SQL before applying migrations to production
3. Apply rollback SQL via the Neon SQL Editor or `psql` connected to the direct URL
4. Alternatively, use Neon's **branching** feature to restore from a point-in-time snapshot

---

## Staging Environment

| Aspect | Value |
|---|---|
| Branch | `staging` |
| URL | `https://staging.justtrade.app` (separate Vercel project) |
| Database | Separate Neon branch (`staging`) |
| Redis | Separate Upstash database (not shared with production) |
| Stripe | Test mode (`sk_test_*` and `pk_test_*` keys) |
| Clerk | Separate Clerk application (`justtrade-staging`) |
| WebSocket | Separate Railway service instance |
| Market Data | Same Polygon.io API key (quota shared with production) |

### Promotion Path

```
dev branch → staging (auto-deploy) → manual QA gate → main (auto-deploy to production)
```

Staging auto-deploys from the `staging` branch via Vercel. Production deploys require a merge to `main` after QA sign-off.

---

## Local Development

```bash
# Clone and install
git clone <repo-url>
cd just-trade
corepack enable
pnpm install

# Configure environment
cp .env.example .env.local
# Fill in at minimum: DATABASE_URL, CLERK keys, STRIPE keys, ANTHROPIC_API_KEY

# Set up database
pnpm prisma generate
pnpm prisma migrate dev

# Start dev server
pnpm dev
# App available at http://localhost:3000

# Run tests
pnpm test              # Unit tests
pnpm test:coverage     # With coverage report
pnpm test:e2e          # Playwright E2E (requires running dev server)

# Database browser
pnpm prisma studio
```

### Minimum Viable Local Setup

For a working local environment with mock data (no external API keys needed beyond auth and payments):

1. `DATABASE_URL` and `DIRECT_URL` — required (Neon free tier works)
2. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — required for auth
3. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID` — required for billing
4. `ANTHROPIC_API_KEY` — required for AI assistant
5. Everything else falls back gracefully (mock market data, no caching, no rate limiting, no email)
