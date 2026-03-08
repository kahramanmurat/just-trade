# Validation Checklist — JustTrade

This document defines the mandatory checks that must pass at each development gate. **No code is considered complete unless the appropriate checklist is satisfied.**

Reference: `/docs/TEST_STRATEGY.md` for test implementation details, `/docs/QA_ACCEPTANCE.md` for feature-level acceptance templates.

---

## Gate 1: Pre-Commit Checks

Run before every commit. These are fast, local checks. Enforce via `lefthook` or `husky` pre-commit hook.

### Code quality
- [ ] `pnpm lint` — zero ESLint errors (warnings permitted, errors block commit)
- [ ] `pnpm format --check` — Prettier formatting passes (no diff)
- [ ] TypeScript: `pnpm tsc --noEmit` — zero type errors
- [ ] No `any` types introduced (ESLint `@typescript-eslint/no-explicit-any` rule = error)
- [ ] No `console.log` statements in `src/` (ESLint `no-console` rule = error)
- [ ] No `TODO` comments left in committed code without a linked issue reference

### Secret exposure
- [ ] No API keys, tokens, or connection strings in staged files
- [ ] `.env*` files not staged (enforced by `.gitignore`)
- [ ] No hardcoded hex color values in component files (must use design tokens)

### Unit tests
- [ ] `pnpm test --run` passes for all tests related to changed files
- [ ] No new failing tests introduced

---

## Gate 2: Pre-Merge Checks (Pull Request)

All checks must pass in CI before a PR can be merged to `main`. Required status checks enforced via branch protection rules.

### Automated CI checks

#### Build
- [ ] `pnpm build` completes without errors
- [ ] JS bundle size ≤ 250KB gzipped initial load (hard block — see NFR §1.4); warn if size increased > 10% vs base branch
- [ ] `pnpm prisma generate` succeeds with no schema warnings

#### Tests
- [ ] All Vitest unit tests pass (`pnpm test:ci`)
- [ ] All Vitest integration tests pass
- [ ] API contract tests pass (`pnpm test:contracts`)
- [ ] Database constraint tests pass (`pnpm test:db`)
- [ ] Coverage thresholds met: `src/lib/` ≥ 80%, overall ≥ 70%
- [ ] All Playwright E2E tests pass for impacted flows (`pnpm test:e2e`)
- [ ] Visual regression comparison passes (0.1% diff threshold) (`pnpm test:visual`)
- [ ] Accessibility audit passes — zero critical/serious violations (`pnpm test:a11y`)
- [ ] Security tests pass (`pnpm test:security`)

#### Migration (if `prisma/` files changed)
- [ ] `prisma migrate deploy` runs cleanly on ephemeral Neon branch
- [ ] All indexes from `/docs/DB_SCHEMA.md` verified present post-migration
- [ ] Rollback SQL documented in migration comment

#### Dependency checks
- [ ] `pnpm audit --audit-level=high` — zero high-severity vulnerabilities
- [ ] No new dependencies added without PR description explaining the choice

### Manual review checklist (reviewer responsibility)

#### Code review
- [ ] API routes scope all DB queries to authenticated `userId`
- [ ] All new inputs validated with Zod schema
- [ ] Error responses follow `{ error: string, code?: string }` structure
- [ ] No new `PrismaClient` instantiated outside `src/lib/db/prisma.ts`
- [ ] Rate limiting applied to any new public-facing endpoint

#### UI review (for component PRs)
- [ ] Component renders correctly in dark mode (no hardcoded light-mode colors)
- [ ] All interactive states tested: default, hover, focus, disabled, loading, error
- [ ] ARIA labels present on icon-only buttons
- [ ] Component does not introduce horizontal scrollbar at any breakpoint
- [ ] Animation follows spec: ≤ 150ms ease for UI transitions, no animations on chart data

#### Cross-cutting concerns
- [ ] Changes consistent with `/docs/ARCHITECTURE.md` decisions
- [ ] New features match scope defined in `/docs/FEATURE_BACKLOG.md`
- [ ] Design token usage consistent with `/docs/UI_UX_SPEC.md`
- [ ] Tier enforcement implemented server-side, not only client-side

---

## Gate 3: Pre-Release Checks

Run before every deployment to production. Performed on the staging environment (see `/docs/ARCHITECTURE.md` §9f for staging environment configuration).

### Staging smoke tests
- [ ] Sign up new user → dashboard loads → default watchlist created
- [ ] Symbol search returns results within 500ms
- [ ] Chart loads for AAPL 1D within 100ms (measured via browser DevTools performance panel)
- [ ] WebSocket connects and delivers price ticks within 2 seconds
- [ ] Add symbol to watchlist → price updates live
- [ ] Stripe Checkout flow (test mode) → subscription updated → plan badge changes
- [ ] All Playwright E2E critical flows pass on staging (`pnpm test:e2e --env staging`)

### Database
- [ ] Migration applied to staging DB without error
- [ ] No orphaned rows from previous migration (verify via spot queries)
- [ ] All expected indexes present on staging DB

### Infrastructure
- [ ] Environment variables verified for all required keys (automated check script)
- [ ] Stripe webhook endpoint registered and receiving events on staging
- [ ] Clerk webhook endpoint active and syncing users
- [ ] Redis connection verified (ping returns PONG)
- [ ] WebSocket service health endpoint responds 200

### Rollback readiness
- [ ] Rollback plan documented: database migration rollback SQL ready; previous Docker image tagged; Vercel previous deployment accessible
- [ ] Team notified of deployment window

---

## UI Validation

For every new or modified UI component before it is considered complete.

### Visual correctness
- [ ] Renders correctly at 1440px, 1280px, 1024px, 768px, 375px
- [ ] No layout overflow or clipping at any tested viewport
- [ ] Dark mode colors are correct: background uses `--color-bg` or `--color-surface` tokens; never hardcoded hex in JSX
- [ ] Text is legible — minimum contrast ratio 4.5:1 (body), 3:1 (large text)
- [ ] Up/positive values shown in `#26A69A`, down/negative in `#EF5350`, AND with +/- sign (not color alone)
- [ ] Monospace font used for all price and numeric values
- [ ] Spacing follows 4px grid — no arbitrary pixel values in Tailwind

### Interactive states
- [ ] Hover state visible and distinct
- [ ] Focus-visible ring present on all focusable elements (`--color-accent` 2px outline)
- [ ] Active/pressed state visually distinct
- [ ] Disabled state styled correctly (`--color-text-disabled`)
- [ ] Loading state: spinner or skeleton visible while data fetches
- [ ] Error state: visible inline error message with retry option where applicable
- [ ] Empty state: icon + single-line message + single CTA

### Animation
- [ ] Transitions ≤ 150ms ease for UI elements
- [ ] Modal open: scale 0.97→1 + fade 150ms
- [ ] Price cells flash on update (300ms ease-out)
- [ ] No animation on chart candlestick data
- [ ] Animations respect `prefers-reduced-motion` media query

---

## Auth Validation

Before any auth-related change ships.

- [ ] Sign up with valid email + password succeeds and creates `users` table row
- [ ] Sign up with already-registered email shows appropriate error (not a crash)
- [ ] Sign up with weak password shows Clerk validation error
- [ ] OAuth sign-in (Google, GitHub) succeeds and creates or links user
- [ ] Protected routes (`/dashboard`, `/account`, `/api/*`) redirect to sign-in when unauthenticated
- [ ] Expired JWT returns 401 on API routes (not a 500 crash)
- [ ] Session persists across page refresh
- [ ] Sign out clears session; subsequent requests to protected routes return 401
- [ ] Clerk webhook `user.created` is idempotent (safe to replay)

---

## API Validation

Before any API route change ships.

- [ ] Route returns 401 for unauthenticated requests
- [ ] Route returns 401 for expired/invalid JWT
- [ ] Route returns 400 for invalid request body (Zod validation)
- [ ] Route returns 404 (not 403) for resources belonging to another user
- [ ] Route returns 403 with `{ error: 'plan_limit_exceeded' }` for tier violations
- [ ] All DB queries scoped to authenticated `userId`
- [ ] Response shape matches type defined in `src/lib/api/types.ts`
- [ ] API contract test exists and passes for this endpoint
- [ ] Rate limiting applies to this endpoint (100 req/min authenticated, 20 req/min unauthenticated)
- [ ] Errors follow `{ error: string, code?: string }` format

---

## Schema Validation

Before any Prisma schema or migration change ships.

- [ ] `/docs/DB_SCHEMA.md` updated to match the schema change
- [ ] Product Architect has acknowledged the schema change
- [ ] Migration file contains rollback SQL in comment block
- [ ] All new indexes are present in both `schema.prisma` and `/docs/DB_SCHEMA.md`
- [ ] `prisma migrate deploy` tested on ephemeral Neon branch (CI)
- [ ] `prisma generate` produces no warnings
- [ ] Seeding script updated if new required rows introduced
- [ ] No breaking changes to existing column types without a migration path

---

## Responsive Validation

Before any layout or component change ships.

| Breakpoint | Check |
|---|---|
| 1440px | Full layout: header + left toolbar + chart + right panel all visible and correctly proportioned |
| 1024px | Full layout: right panel still visible (280px); no overflow |
| 768px | Right panel hidden; toggle button visible; left toolbar visible; chart fills remaining space |
| 375px | Mobile view: read-only chart; "Desktop recommended" banner; no horizontal scroll |

- [ ] Chart area width never goes below `min-width: 600px` on desktop
- [ ] Header height is exactly 48px at all breakpoints
- [ ] Left toolbar width is exactly 40px at all breakpoints
- [ ] Right panel collapse/expand works at tablet breakpoint with animation
- [ ] No horizontal overflow at any tested viewport (check with DevTools overflow highlight)

---

## Browser Validation

Before a release. Manual verification on each supported browser.

| Browser | Minimum version | Priority |
|---|---|---|
| Chrome | 110+ | P0 — primary target |
| Firefox | 115+ | P1 |
| Safari | 16+ | P1 |
| Edge | 110+ | P2 |

For each browser:
- [ ] Chart renders correctly (canvas API support)
- [ ] WebSocket connection establishes
- [ ] Symbol search modal opens and keyboard navigation works
- [ ] Stripe Checkout redirect works
- [ ] CSS custom properties applied correctly (no missing colors)
- [ ] Font loading correct (Inter + monospace)
- [ ] No console errors on dashboard load
- [ ] No console errors on chart load

---

## Console & Network Error Checks

Before merging any PR.

### Browser console (verified in DevTools during E2E test run)
- [ ] Zero console errors on dashboard initial load
- [ ] Zero console errors on symbol change
- [ ] Zero console errors on modal open/close
- [ ] Zero `Warning: Each child in a list should have a unique "key"` React warnings
- [ ] Zero `Warning: Can't perform a React state update on an unmounted component` warnings
- [ ] Zero failed network requests (4xx or 5xx) on normal user flow (not intentional error cases)

### Network
- [ ] OHLCV API requests include caching headers (verify via Network tab: `Cache-Control`)
- [ ] No duplicate OHLCV requests fired for same symbol+timeframe within TTL window
- [ ] WebSocket connection uses `wss://` (not `ws://`) in all environments
- [ ] Stripe requests use HTTPS
- [ ] No API keys or secrets visible in request headers or URL parameters

---

## Empty / Loading / Error State Checks

Every data-dependent UI component must handle all three states before it is considered done.

### Empty states
- [ ] Watchlist panel empty state: icon + "Add your first symbol" + CTA button
- [ ] Alerts tab empty state: icon + "No alerts yet" + "New Alert" CTA
- [ ] Layouts picker empty state: "No saved layouts" + "Save Layout" CTA
- [ ] Chart with no data: "No data available for this symbol" message centered in chart area
- [ ] Search results empty state: "No results for '[query]'" — not a blank dropdown

### Loading states
- [ ] Chart area: skeleton or spinner while OHLCV data fetches
- [ ] Watchlist prices: skeleton rows while initial prices load
- [ ] Alerts tab: skeleton rows during fetch
- [ ] Subscription badge: skeleton while status fetches
- [ ] Layouts picker: spinner while loading

### Error states
- [ ] Chart data fetch fails: inline error with "Retry" button (no full page crash)
- [ ] WebSocket disconnected: staleness indicator on prices after 5 seconds
- [ ] API error on watchlist load: inline error message, not empty list silently
- [ ] Stripe checkout creation fails: user-facing error message, not redirect to broken URL
- [ ] Form submission error: field-level validation messages, not silent failure
