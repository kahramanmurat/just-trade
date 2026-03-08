# CLAUDE.md — JustTrade Developer Guide

This file is read by Claude Code at the start of every session. It defines the project's conventions, constraints, and working rules.

---

## Project Overview

**JustTrade** is a SaaS trading dashboard — a TradingView-style charting application for retail traders, crypto traders, and technical analysts.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Charting | `lightweight-charts` (TradingView open-source) |
| State | Zustand (global UI) + TanStack React Query (server data) |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | PostgreSQL via Prisma ORM (hosted on Neon) |
| Caching | Redis via Upstash |
| Payments | Stripe |
| Real-time | WebSocket (standalone Node.js service on Railway) |
| Testing | Vitest (unit) + Playwright (E2E) |

---

## Before You Start

### Before adding a new API route or DB query:
> Read `/docs/ARCHITECTURE.md`

### Before creating any component:
> Read `/docs/UI_UX_SPEC.md`

### Before implementing any feature:
> Read the relevant Epic in `/docs/FEATURE_BACKLOG.md` and `/docs/QA_ACCEPTANCE.md`

### Before modifying the Prisma schema:
> Read `/docs/DB_SCHEMA.md` — it is the canonical source of truth

### Before claiming any work is complete:
> Run the validation gates in `/docs/VALIDATION_CHECKLIST.md` for the appropriate gate (pre-commit, pre-merge, or pre-release)

---

## Folder Conventions

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/             # Public auth pages (sign-in, sign-up)
│   ├── dashboard/          # Main app shell (protected by Clerk middleware)
│   └── api/                # REST API route handlers
│       ├── watchlists/
│       ├── alerts/
│       ├── layouts/
│       └── webhooks/
├── components/
│   ├── chart/              # Chart-specific React components (Charting Agent)
│   ├── ui/                 # Design system primitives (Design System Agent)
│   └── [feature]/          # Feature components (Frontend UI Agent)
├── lib/
│   ├── api/                # API client, Zod schemas, market data client
│   ├── chart/              # Chart helpers, indicator calculations
│   └── db/                 # Prisma client singleton
├── hooks/                  # Custom React hooks
└── styles/                 # Global CSS, Tailwind base layers
prisma/
├── schema.prisma
└── migrations/
tests/                      # Vitest unit tests (mirrors src/ structure)
playwright/                 # Playwright E2E tests
docs/                       # Project documentation
```

---

## Coding Standards

### TypeScript
- **Strict mode is on** — `"strict": true` in `tsconfig.json`
- **No `any`** — use `unknown` and type guard instead
- **No non-null assertions** (`!`) without a comment explaining why it is safe
- Prefer `type` over `interface` for object shapes; use `interface` only for extendable contracts
- All API response types must be defined in `src/lib/api/types.ts`

### Formatting & Linting
- **Prettier** for formatting — run on save, enforced in CI
- **ESLint** with Next.js recommended config + TypeScript rules
- No unused imports, no unused variables
- Run `pnpm lint` before considering any task complete

### Naming Conventions
| Entity | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `ChartContainer.tsx` |
| Files (utilities) | camelCase | `formatPrice.ts` |
| Files (hooks) | camelCase prefixed | `useWatchlist.ts` |
| React components | PascalCase | `WatchlistPanel` |
| Functions/variables | camelCase | `fetchOhlcv` |
| Constants | UPPER_SNAKE_CASE | `MAX_WATCHLIST_ITEMS` |
| CSS classes | Tailwind only | n/a |
| DB columns | snake_case (Prisma maps) | `user_id` → `userId` |

---

## UI Rules

### Tailwind Only
- **No inline styles** (`style={{}}`) — use Tailwind classes exclusively
- **No CSS modules** — all styles in Tailwind
- Exception: CSS custom property declarations in `globals.css` for design tokens

### Dark Mode
- The app is dark by default — all components must look correct in dark theme
- Use design tokens (CSS custom properties) via Tailwind, never hardcoded colors in JSX
- Color tokens (from `/docs/UI_UX_SPEC.md`):
  - Background: `bg-[#0F1117]` or `bg-bg` (Tailwind token)
  - Surface: `bg-[#1A1D29]` or `bg-surface`
  - Accent: `text-[#2962FF]` / `bg-[#2962FF]` or token `accent`
  - Up/positive: `#26A69A`
  - Down/negative: `#EF5350`
  - Primary text: `#E0E3EB`
  - Secondary text: `#787B86`

### Spacing
- Use 4px base grid — Tailwind's default spacing scale (1 unit = 4px) aligns with this
- Never use arbitrary pixel values when a Tailwind spacing class is available

### Typography
- UI text: Inter (loaded via `next/font`)
- Prices, OHLCV values: monospace (`font-mono`)

---

## API Route Conventions

All API routes follow this pattern:

```typescript
// src/app/api/watchlists/route.ts
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ... handler logic
}
```

- Always validate `userId` from Clerk before any DB access
- Always validate request body with Zod before processing
- Always scope DB queries to `userId` — never allow cross-user data access
- Return structured errors: `{ error: string, code?: string }`
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)

---

## Database Rules

- **Never** call `new PrismaClient()` in a route handler — use the singleton from `src/lib/db/prisma.ts`
- **Always** scope queries with `where: { userId }` for user-owned data
- **Never** use `prisma.user.findMany()` without a `where` clause
- Use Prisma's `select` to fetch only the columns you need
- Run `pnpm prisma generate` after any schema change
- Run `pnpm prisma migrate dev` locally; `pnpm prisma migrate deploy` in CI

---

## State Management

### Zustand (Global UI State)
Used for: active symbol, active timeframe, selected drawing tool, right panel open state, WebSocket connection status.

```typescript
// src/lib/store/chartStore.ts
import { create } from 'zustand'

interface ChartStore {
  symbol: string
  timeframe: string
  setSymbol: (symbol: string) => void
  setTimeframe: (timeframe: string) => void
}
```

### React Query (Server State)
Used for: watchlists, alerts, saved layouts, subscription data.

- Query keys follow `['resource', userId, ...params]` pattern
- Stale time: 30 seconds for watchlist/alert data
- Always invalidate the relevant query after a mutation

---

## Definition of Done

**Implementation is NOT complete until all of the following are true:**

- [ ] Feature behavior matches acceptance criteria in `/docs/QA_ACCEPTANCE.md`
- [ ] Pre-commit checks pass: lint, format, typecheck, related unit tests
- [ ] All automated tests pass in CI (unit, integration, E2E, accessibility, visual regression, security)
- [ ] Coverage thresholds met: `src/lib/` ≥ 80%, overall ≥ 70%
- [ ] No console errors on happy-path and error-path flows
- [ ] Empty, loading, and error states implemented and verified
- [ ] Server-side tier enforcement implemented and tested (not only client-side)
- [ ] Security checklist below completed
- [ ] QA Agent sign-off recorded in PR description (see `/docs/QA_ACCEPTANCE.md` sign-off template)

**Do not open a PR without completing the pre-merge checklist in `/docs/VALIDATION_CHECKLIST.md`.**

---

## Testing

Read `/docs/TEST_STRATEGY.md` for the complete test strategy. Summary below.

### Test Types and Tools

| Type | Tool | Location |
|---|---|---|
| Unit tests | Vitest | `tests/unit/` |
| Integration tests | Vitest | `tests/integration/` |
| E2E tests | Playwright | `playwright/e2e/` |
| Visual regression | Playwright screenshots | `playwright/visual/` |
| Accessibility | @axe-core/playwright | `playwright/a11y/` |
| API contracts | Zod + Vitest | `tests/contracts/` |
| Database | Vitest + Prisma | `tests/db/` |
| Security | Vitest | `tests/security/` |
| Chart interactions | Playwright | `playwright/chart/` |

### Coverage Thresholds (CI enforced)

- `src/lib/` — ≥ 80% statements
- `src/app/api/` — ≥ 70% statements
- Overall project — ≥ 70% statements

Coverage below threshold **blocks CI merge**.

### Running Tests
```bash
pnpm test               # Vitest unit + integration
pnpm test:coverage      # With coverage report
pnpm test:e2e           # Playwright E2E
pnpm test:visual        # Visual regression
pnpm test:a11y          # Accessibility audits
pnpm test:security      # Security tests
pnpm test:contracts     # API contract tests
pnpm test:db            # Database constraint tests
pnpm test:ci            # Full CI suite (all of the above)
```

---

## Performance Constraints

From `/docs/PRODUCT_PRINCIPLES.md`:
- Chart render: **< 100ms** from data available to pixels
- Live price updates: **< 50ms** latency from WebSocket tick
- OHLCV API (cache hit): **< 50ms**
- OHLCV API (cache miss): **< 300ms**

Do not add synchronous operations to the chart render path. Do not add unnecessary re-renders to `ChartContainer`.

---

## Security Checklist (before submitting any PR)

- [ ] All API routes validate Clerk `userId`
- [ ] All DB queries scoped to `userId`
- [ ] All user inputs validated with Zod
- [ ] No secrets or API keys in source code
- [ ] Stripe webhook uses signature verification
- [ ] No `console.log` with user data in production paths

---

## Available Scripts

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Production build
pnpm lint             # ESLint check
pnpm format           # Prettier format
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright E2E
pnpm prisma studio    # Prisma DB browser
pnpm prisma migrate dev   # Apply local migrations
pnpm prisma generate  # Regenerate Prisma client
```

---

## Key Documentation Files

| File | When to Read |
|---|---|
| `/docs/PRD.md` | Understanding product scope and user personas |
| `/docs/UI_UX_SPEC.md` | Before building any UI component |
| `/docs/ARCHITECTURE.md` | Before adding API routes, DB queries, or new services |
| `/docs/FEATURE_BACKLOG.md` | Before implementing any feature |
| `/docs/DB_SCHEMA.md` | Before modifying Prisma schema |
| `/docs/PRODUCT_PRINCIPLES.md` | When making architecture or UX tradeoff decisions |
| `/docs/TEST_STRATEGY.md` | Before writing tests; defines what must be tested and how |
| `/docs/VALIDATION_CHECKLIST.md` | Before committing, merging, or releasing — mandatory gates |
| `/docs/NON_FUNCTIONAL_REQUIREMENTS.md` | Performance, reliability, security, accessibility targets |
| `/docs/QA_ACCEPTANCE.md` | Acceptance criteria per feature; sign-off template |
| `/AGENTS.md` | Understanding agent roles and file ownership |

When context exceeds 80%, stop and summarize the session into PROJECT_STATE.md before continuing in a new session.