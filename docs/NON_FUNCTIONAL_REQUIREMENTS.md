# Non-Functional Requirements — JustTrade

This document specifies the measurable quality attributes of the JustTrade system beyond functional correctness. These requirements constrain how the system must behave and are validated during performance testing, pre-release checks, and ongoing monitoring.

Cross-reference: `/docs/PRODUCT_PRINCIPLES.md` for the principles behind these targets.

---

## 1. Performance

### 1.1 Chart Rendering

| Metric | Target | Measurement method |
|---|---|---|
| Time to first candlestick render (data available → pixels) | **< 100ms** | Playwright `performance.now()` around chart data load |
| Time to first candlestick render (cold page load) | **< 500ms** | Lighthouse TTI metric |
| Chart series switch (candlestick → line) | **< 50ms** | Playwright interaction timing |
| Indicator add (SMA appears on chart) | **< 100ms** | Playwright interaction timing |
| Drawing tool: line rendered after second click | **< 30ms** | Playwright interaction timing |

### 1.2 Real-Time Data

| Metric | Target | Measurement method |
|---|---|---|
| WebSocket tick → price cell DOM update | **< 50ms** | Custom Playwright hook measuring event→DOM timing |
| WebSocket tick → chart last candle update | **< 50ms** | Same as above |
| Time from market event to client receive (end-to-end latency) | **< 200ms** | Server timestamp in tick vs client `Date.now()` |
| WebSocket reconnect after disconnect | **< 30s** (exponential backoff, max interval) | Playwright network intercept test |

### 1.3 API Response Times

| Endpoint | Cache hit | Cache miss | Measurement method |
|---|---|---|---|
| `GET /api/ohlcv?symbol=&timeframe=` | **< 50ms** | **< 300ms** | `p95` from Vercel analytics |
| `GET /api/watchlists` | — | **< 200ms** | p95 |
| `GET /api/alerts` | — | **< 200ms** | p95 |
| `GET /api/layouts/:id` | — | **< 300ms** | p95 |
| `POST /api/layouts` (with drawings) | — | **< 500ms** | p95 |
| `POST /api/billing/checkout` | — | **< 1000ms** | p95 |

Measurement basis: **p95** (95th percentile) at normal load. Targets apply at up to 500 concurrent users.

### 1.4 Page Load

| Metric | Target |
|---|---|
| Largest Contentful Paint (LCP) | **< 2.5s** (Good threshold per Core Web Vitals) |
| First Input Delay (FID) / INP | **< 200ms** |
| Cumulative Layout Shift (CLS) | **< 0.1** |
| Total JS bundle size (initial load) | **< 250KB** gzipped |
| Time to Interactive (TTI) | **< 3.5s** on 4G throttled connection |

Measured via Lighthouse CI on every PR targeting `main`.

### 1.5 Database Query Performance

| Query | Target |
|---|---|
| `SELECT` watchlists + items for user | **< 20ms** (indexed) |
| `SELECT` active alerts by symbol | **< 10ms** (indexed) |
| `SELECT` layout with drawings + indicators | **< 30ms** (indexed) |
| `INSERT` new watchlist item | **< 50ms** |
| `UPDATE` subscription status (webhook) | **< 100ms** |

Slow queries (> 500ms) must be logged and investigated before production.

---

## 2. Reliability

### 2.1 Availability

| Service | Target uptime | Measurement |
|---|---|---|
| Next.js app (Vercel) | **99.9%** monthly | Uptime monitoring (e.g., Better Uptime) |
| WebSocket service (Railway) | **99.5%** monthly | HTTP health endpoint ping every 60s |
| PostgreSQL (Neon) | **99.9%** monthly | Neon SLA |
| Redis (Upstash) | **99.9%** monthly | Upstash SLA |

### 2.2 Error Rates

| Error type | Target |
|---|---|
| HTTP 5xx rate on API routes | **< 0.1%** of requests |
| WebSocket connection failure rate | **< 0.5%** of connection attempts |
| Failed Stripe webhook processing | **< 0.01%** (Stripe retries; must be handled idempotently) |
| Database query errors | **< 0.01%** of queries |

### 2.3 Resilience & Recovery

- **Chart data failure:** Inline error state with Retry button; React error boundary contains the failure; right panel remains functional
- **WebSocket disconnect:** Automatic reconnect with exponential backoff: `1s → 2s → 4s → 8s → 16s → 30s max`; staleness indicator shown after 5s without tick
- **Redis unavailable:** OHLCV requests fall through to market data API directly (degraded performance, no user-facing error); rate limiting disabled (fail open)
- **Stripe webhook delivery failure:** Stripe retries for 72 hours; subscription status not downgraded within 24-hour grace period
- **Neon database unavailable:** API routes return 503 with `{ error: 'service_unavailable' }`; frontend shows retry state

### 2.4 Data Durability

- PostgreSQL data: Neon continuous WAL backup; point-in-time recovery available up to 7 days
- User-generated data (drawings, layouts, alerts) must not be lost due to application-layer errors
- Prisma transactions used for multi-table writes (e.g., layout + drawings + indicators in single transaction)

---

## 3. Scalability

### 3.1 Concurrent Users

| Component | Target capacity | Notes |
|---|---|---|
| Next.js API routes (Vercel) | 500 concurrent users | Vercel serverless scales automatically |
| WebSocket service | 1,000 concurrent connections | Horizontal scaling via Redis Pub/Sub |
| PostgreSQL | 200 concurrent connections | Neon PgBouncer handles pooling |
| Redis | 500 req/s | Upstash scales automatically |

### 3.2 Data Volume

| Entity | Expected volume at scale | Notes |
|---|---|---|
| Users | 50,000 rows | Trivial; indexed on `clerk_id` |
| Watchlist items | 2,500,000 rows | Indexed on `watchlist_id`, `symbol` |
| Alerts | 500,000 rows | Indexed on `user_id`, `symbol`, `is_active` |
| Saved layouts | 250,000 rows | |
| Chart drawings | 2,000,000 rows | Associated with layouts; JSON blob storage |
| OHLCV data (cached) | Not stored in PostgreSQL | Sourced from market data provider; Redis cache only |

### 3.3 Scaling Triggers

- Add Redis read replica when p95 Redis latency exceeds 20ms
- Add WebSocket service instance when CPU > 70% sustained or connection count > 800
- Add Neon compute tier when p95 DB query time exceeds targets in section 1.5
- Implement CDN-level caching for symbol search results when search API p95 > 500ms

---

## 4. Observability

### 4.1 Logging

All log entries must be structured JSON (not plain text) with these fields:

```json
{
  "timestamp": "ISO 8601",
  "level": "info | warn | error",
  "service": "api | websocket | worker",
  "requestId": "uuid",
  "userId": "clerk_id (hashed or omitted for privacy)",
  "message": "...",
  "meta": {}
}
```

**What must be logged:**
- All API 4xx and 5xx responses (with sanitized request details — no passwords or tokens)
- WebSocket connect/disconnect events (with userId and connection duration)
- Stripe webhook receipt (event type and processing result)
- Alert trigger evaluations (symbol, condition, result)
- Cache hit/miss for OHLCV (symbol, timeframe, hit/miss)
- Database query errors

**What must NOT be logged:**
- Passwords, API keys, JWT tokens, or credit card numbers
- Full request/response bodies that may contain PII

### 4.2 Metrics

Collected and exposed to monitoring dashboard (e.g., Vercel Analytics + custom metrics):

| Metric | Type | Alert threshold |
|---|---|---|
| API response time (p50, p95, p99) | Histogram | p95 > 500ms for > 5 minutes |
| API error rate (5xx) | Rate | > 1% for > 2 minutes |
| WebSocket active connections | Gauge | > 900 (approaching capacity) |
| WebSocket tick delivery latency | Histogram | p95 > 100ms for > 2 minutes |
| Cache hit rate (OHLCV) | Ratio | < 70% for > 10 minutes |
| Database connection pool usage | Gauge | > 80% of max connections |
| Alert evaluation failures | Counter | Any failure |
| Stripe webhook processing errors | Counter | Any failure |

### 4.3 Alerting

Alerts routed to on-call channel (Slack or PagerDuty):

| Condition | Severity | Response |
|---|---|---|
| API error rate > 1% for 5 min | Critical | Immediate investigation |
| WebSocket service health check fails | Critical | Immediate investigation |
| Database response time > 1s p95 | High | Investigate within 30 min |
| Stripe webhook failures | High | Investigate within 30 min |
| Cache hit rate < 70% | Medium | Investigate within 2 hours |
| JS bundle size increase > 15% | Low | Review before next release |

### 4.4 Distributed Tracing

- Each API request carries a `x-request-id` header (Vercel auto-injects; propagate to DB calls and downstream services)
- WebSocket service logs include `requestId` from initial connection handshake
- Trace data retained for 7 days

---

## 5. Accessibility

**Standard:** WCAG 2.1 Level AA compliance
**Scope:** All pages and interactive components in the JustTrade web application

### 5.1 Requirements

| Requirement | Detail |
|---|---|
| Color contrast — body text | ≥ 4.5:1 against background |
| Color contrast — large text (≥ 18px bold or ≥ 24px) | ≥ 3:1 |
| Color contrast — UI components and focus indicators | ≥ 3:1 |
| Keyboard navigation | All interactive elements reachable via Tab in logical DOM order |
| Focus indicator | Visible `:focus-visible` ring on all focusable elements (`--color-accent` 2px outline) |
| Screen reader support | All icon-only buttons have `aria-label`; all form inputs have associated `<label>` |
| Modal focus trapping | Focus confined within open modal; `Esc` closes and restores focus to trigger |
| No seizure-triggering content | No flashing content > 3Hz |
| Alternative for color | Price direction conveyed by sign (+/-) and icon, not color alone |
| Skip navigation | "Skip to chart" link as first focusable element on dashboard |
| Touch targets | Minimum 44×44px for all interactive elements (supports trackpad and touch devices) |

### 5.2 Automated Coverage

- `@axe-core/playwright` audit passes with zero critical/serious violations on all tested pages
- Run as part of `pnpm test:a11y` in CI pipeline

### 5.3 Manual Audit Schedule

- Full keyboard-only navigation test: before every major release
- Screen reader test (VoiceOver on macOS, NVDA on Windows): quarterly

---

## 6. Maintainability

### 6.1 Code Quality Metrics

| Metric | Target |
|---|---|
| TypeScript strict mode | Enabled (`"strict": true` in tsconfig) |
| Any types | Zero (ESLint rule = error) |
| Cyclomatic complexity per function | ≤ 10 |
| Function length | ≤ 50 lines (guideline, not hard limit) |
| Test coverage — `src/lib/` | ≥ 80% statements |
| Test coverage — overall | ≥ 70% statements |
| Stale TODOs (> 30 days without linked issue) | Zero |

### 6.2 Dependency Management

- `pnpm audit` run on every PR; high-severity vulnerabilities block merge
- Dependencies reviewed quarterly for major version upgrades
- No dependencies with unresolved CVEs in production
- `lightweight-charts` must track latest stable within 2 minor versions
- Prisma client version must match schema version exactly

### 6.3 Documentation Currency

- `/docs/DB_SCHEMA.md` must match `prisma/schema.prisma` exactly at all times
- `/docs/UI_UX_SPEC.md` must be updated before design token changes ship
- `/docs/ARCHITECTURE.md` must be updated before new services are added
- `CLAUDE.md` must reference all new documentation files when they are added
- Each epic in `/docs/FEATURE_BACKLOG.md` must have at least one linked test in `/docs/TEST_STRATEGY.md`

### 6.4 Tech Debt Policy

- Tech debt items are filed as GitHub issues with label `tech-debt`
- No tech debt issue may be left open > 90 days without a scheduled resolution sprint
- Refactors are never bundled with feature PRs — they get separate commits or PRs

---

## 7. Security

### 7.1 Authentication & Session Management

| Requirement | Implementation |
|---|---|
| All sessions managed by Clerk | No custom session tokens |
| JWT lifetime | Short-lived (Clerk default: 60s; refresh via Clerk SDK) |
| Protected routes | Clerk middleware on `/dashboard` and all `/api/*` routes |
| WebSocket auth | JWT validated on handshake; reject before any data sent |

### 7.2 Authorization

| Requirement | Implementation |
|---|---|
| Row-level data isolation | All Prisma queries include `WHERE user_id = $userId` |
| Plan tier enforcement | Server-side check on every resource creation endpoint |
| IDOR protection | Return 404 (not 403) for resources belonging to other users |

### 7.3 Input Validation

| Layer | Requirement |
|---|---|
| API routes | All inputs validated with Zod before processing |
| Database | Prisma parameterized queries only — no raw SQL string interpolation |
| Frontend | Client-side validation is supplementary only; never trusted as the security layer |

### 7.4 Transport Security

- HTTPS enforced on all services; no HTTP fallback (Vercel enforces; HSTS header set)
- WebSocket connections use `wss://` only
- Strict CORS policy: only JustTrade frontend origin allowed on API routes

### 7.5 Secrets Management

| Requirement | Implementation |
|---|---|
| No secrets in source code | Enforced by CI grep check + `.gitignore` |
| Production secrets in encrypted env vars | Vercel + Railway encrypted environment settings |
| Stripe webhook verification | `stripe-signature` header verified with `STRIPE_WEBHOOK_SECRET` |
| Rotation policy | Stripe + Clerk + DB keys rotated quarterly or immediately on suspected exposure |

### 7.6 Rate Limiting

| Scope | Limit | Response |
|---|---|---|
| Authenticated user | 100 req/min | 429 with `Retry-After` header |
| Unauthenticated IP | 20 req/min | 429 with `Retry-After` header |
| Stripe Checkout creation | 5 req/min per user | 429 |
| WebSocket subscribe messages | 50 subscribe actions/min per connection | Connection throttled |

### 7.7 Security Scanning

- `pnpm audit --audit-level=high` on every PR (high-severity = merge blocked)
- No known CVEs in production dependencies
- OWASP Top 10 reviewed at each major release:
  - A01 Broken Access Control — IDOR tests, auth bypass tests
  - A02 Cryptographic Failures — secrets management, HTTPS enforcement
  - A03 Injection — Zod input validation, Prisma parameterized queries, XSS via React encoding
  - A05 Security Misconfiguration — CORS policy, security headers
  - A06 Vulnerable Components — `pnpm audit`
  - A07 Authentication Failures — Clerk JWT enforcement, session management

---

## 8. Browser & Device Support

### 8.1 Supported Browsers

| Browser | Minimum version | Support level |
|---|---|---|
| Google Chrome | 110+ | Full (P0) |
| Mozilla Firefox | 115+ | Full (P1) |
| Apple Safari | 16+ | Full (P1) |
| Microsoft Edge | 110+ | Full (P2) |
| Mobile Chrome (Android) | 110+ | Read-only chart view only |
| Mobile Safari (iOS) | 16+ | Read-only chart view only |

### 8.2 Required Browser APIs

- Canvas 2D API (used by `lightweight-charts`)
- WebSocket API
- CSS Custom Properties (design tokens)
- Intersection Observer (lazy loading, if used)
- `requestAnimationFrame` (chart animation)
- `localStorage` (user preferences, if any)

### 8.3 Device Support

| Category | Support |
|---|---|
| Desktop (≥ 1024px) | Full feature set |
| Tablet (768–1023px) | Full chart + read-only panels; no drawing tools (UI collapsed) |
| Mobile (< 768px) | Read-only chart display; "Use desktop for full features" banner |

### 8.4 Explicit Non-Support

- Internet Explorer (all versions) — not supported, no polyfills
- Opera Mini — not supported (proxy-based rendering incompatible with WebSocket)
- Browsers without Canvas 2D API support

### 8.5 Performance Targets on Supported Browsers

All performance targets in Section 1 apply to Chrome 110+ on a modern desktop (4-core CPU, 8GB RAM, stable broadband). Safari and Firefox P95 targets may be up to 20% higher and still considered passing.

---

## 9. Operational Requirements

### 9.1 Cold Start Latency

Vercel serverless functions experience cold starts when inactive. Requirements:

| Route category | Max cold start latency | Mitigation |
|---|---|---|
| All `/api/*` routes | **< 2s** first request after cold start | Vercel Pro "Function warming" or minimum invocations pattern |
| `GET /api/ohlcv` | **< 2s** cold start; **< 300ms** warm | Redis cache hit removes DB dependency |
| WebSocket service (Railway) | Always-on — no cold start acceptable | Railway keep-alive + health-check endpoint |

Cold start latency is excluded from the p95 targets in §1.3 (which apply to warm instances only). Cold starts must be flagged in monitoring with a `cold_start: true` log field.

### 9.2 Error Monitoring

**Tool: Sentry** (selected for Next.js/serverless compatibility and source-map support)

| Requirement | Detail |
|---|---|
| Error capture | All unhandled exceptions in `src/app/api/`, `src/worker/`, and `websocket-service/` must be captured by Sentry |
| Frontend errors | React error boundaries report to Sentry with component stack |
| Source maps | Uploaded to Sentry on every Vercel deployment; deleted from Sentry after 90 days |
| Sampling rate | 100% of errors; 10% of transactions (performance monitoring) |
| Alert threshold | New error type with > 5 occurrences in 10 minutes → Sentry alert to on-call channel |
| PII scrubbing | Sentry SDK configured to strip JWT tokens, passwords, and email addresses from breadcrumbs |

### 9.3 Log Retention

| Log source | Retention period | Storage |
|---|---|---|
| Vercel API route logs | 30 days | Vercel log drain → external sink (Datadog / Logtail) |
| Railway WebSocket service logs | 30 days | Railway log drain |
| Sentry error events | 90 days | Sentry (source maps deleted after 90 days) |
| Stripe webhook event logs | 90 days | Stripe dashboard (extended retention via Stripe) |
| Database query error logs | 30 days | Same log sink as API logs |

Logs older than the retention period are automatically deleted. No log archive is kept beyond these periods except where required by legal obligation.

### 9.4 Data Retention & Deletion (GDPR Right to Erasure)

| Data category | Retention while account active | Action on deletion request |
|---|---|---|
| User account (`users` row) | Indefinitely while active | Hard delete within 30 days of request |
| Subscription history (`subscriptions`) | 7 years (financial record obligation) | Anonymize `user_id` FK; retain aggregate billing data |
| Watchlists, alerts, layouts, drawings | Indefinitely while active | Hard delete within 30 days of request |
| Push subscriptions (`push_subscriptions`) | Until endpoint 410 or user deletion | Hard delete immediately on request |
| Stripe customer data | Managed by Stripe; governed by Stripe's retention policy | Submit deletion request to Stripe via API |
| Application logs | Per §9.3 retention periods | Cannot be selectively deleted (anonymized at source) |

**Deletion mechanism:** `DELETE /api/account` route (authenticated, requires password confirmation) triggers cascading deletion of all user-owned rows via Prisma transaction. Stripe customer deletion called via Stripe API. Clerk user deletion called via Clerk Management API. 30-day window allows Stripe to finalize any pending invoices.

---

## 10. Internationalization & Localization

**Current scope:** English-only UI. No i18n infrastructure required for MVP.

### Requirements for future i18n readiness:
- No hardcoded UI strings in component JSX — all strings sourced from a constants file (even in English-only phase)
- Dates and times formatted using `Intl.DateTimeFormat` (not manual string concatenation)
- Numbers (prices) formatted using `Intl.NumberFormat` respecting locale
- Currency amounts displayed with explicit currency symbol (not assumed to be USD)

---

## Validation Against These Requirements

| NFR category | Validated by |
|---|---|
| Performance (chart, API, DB) | Playwright timing assertions + Lighthouse CI + monitoring alerts |
| Reliability (uptime, error rates) | Uptime monitoring + error rate alerts in observability dashboard |
| Scalability | Load test before each major release (k6 or Artillery) |
| Observability | Logging audit in staging before release |
| Accessibility | `pnpm test:a11y` in CI + manual keyboard test pre-release |
| Maintainability | Coverage thresholds in CI + dependency audit |
| Security | `pnpm test:security` in CI + OWASP review at each major release |
| Browser support | Manual browser matrix test pre-release |
| Cold start latency | Synthetic monitoring with fresh function invocation every 5 min |
| Error monitoring | Sentry alert coverage verified in staging (trigger deliberate error; confirm Sentry receipt) |
| Log retention | Automated retention policy audit quarterly |
| Data deletion | Manual E2E test of account deletion flow before each major release |
