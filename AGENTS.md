# Agent Collaboration Rules — JustTrade

This file defines the roles, file ownership, and collaboration protocols for all development agents working on this codebase. **All agents must read this file before taking any action.**

---

## Guiding Principle

**No agent modifies another agent's owned files without explicit coordination.** When cross-ownership work is needed, the requesting agent must document the change rationale and the owning agent must acknowledge before changes are applied.

---

## Agents

### 1. Product Architect

**Role:** Defines and maintains the product vision, requirements, and documentation. Has final say on feature scope, acceptance criteria, and documentation accuracy.

**File Ownership:**
- `/docs/` — all documentation files
- `AGENTS.md` (this file)
- `CLAUDE.md`

**Responsibilities:**
- Keep `/docs/PRD.md` updated when scope changes
- Ensure `/docs/FEATURE_BACKLOG.md` reflects current sprint priorities
- Review all pull requests for scope alignment
- Resolve conflicts between agents about "what should be built"

**Does NOT own:**
- Any `src/` files
- `prisma/` files

---

### 2. Frontend UI Agent

**Role:** Implements feature-level UI components, page layouts, and application routes. Integrates design system primitives from Design System Agent.

**File Ownership:**
- `src/components/` (excluding `src/components/chart/` and `src/components/ui/`)
- `src/app/` (all routes and layouts, excluding `src/app/api/`)
- `src/styles/` (global CSS, animations)
- `src/lib/store/` — Zustand stores (global UI state: symbol, timeframe, tool, panel state, WS connection status)

**Responsibilities:**
- Implement feature components (watchlist, alerts panel, header, modals)
- Wire React Query hooks to API endpoints
- Connect Zustand store to component state
- Implement responsive layout breakpoints

**Must read before working:**
- `/docs/UI_UX_SPEC.md` — layout, colors, typography, spacing
- `/docs/ARCHITECTURE.md` — component/folder conventions

**Does NOT own:**
- Chart-specific components (`src/components/chart/`)
- Design system primitives (`src/components/ui/`)
- API routes (`src/app/api/`)

---

### 3. Charting Agent

**Role:** Implements all charting functionality using Lightweight Charts, including series management, indicator rendering, drawing tools, and chart plugins.

**File Ownership:**
- `src/components/chart/` — all chart React components
- `src/lib/chart/` — chart utilities, indicator calculations, drawing tool logic

**Responsibilities:**
- Implement and maintain the `ChartContainer` component
- Manage Lightweight Charts lifecycle (create, update, destroy)
- Implement series types (candlestick, bar, line)
- Implement overlay indicators (SMA, EMA, BB)
- Implement panel indicators (MACD, RSI)
- Implement drawing tools as chart plugins or canvas overlays
- Manage WebSocket price updates flowing into the chart

**Must read before working:**
- `/docs/UI_UX_SPEC.md` — chart colors, OHLCV legend spec, crosshair behavior
- `/docs/PRODUCT_PRINCIPLES.md` — performance constraints (< 100ms render)
- `/docs/FEATURE_BACKLOG.md` — Epic 3 (Charting), Epic 4 (Indicators), Epic 5 (Drawing Tools)

**Does NOT own:**
- Non-chart components (header, modals, right panel)
- API routes
- Database schema

---

### 4. Backend API Agent

**Role:** Implements all Next.js API routes and the standalone WebSocket streaming service.

**File Ownership:**
- `src/app/api/` — all API route handlers
- `src/lib/api/` — API utility functions, Zod validation schemas, market data client
- `src/worker/` — alert evaluation cron worker (`alertEvaluator.ts`)
- `src/emails/` — React Email templates (alert notification emails)
- `websocket-service/` — standalone Node.js WebSocket server

**Responsibilities:**
- Implement REST endpoints for watchlists, alerts, layouts, billing
- Implement Stripe webhook handler (`customer.subscription.created/updated/deleted`, `invoice.payment_failed`)
- Implement Clerk webhook handler (user sync + subscription row creation on `user.created`)
- Implement OHLCV data proxy with Redis caching and tier-based history depth enforcement
- Implement rate limiting middleware
- Implement the WebSocket streaming service including JWT refresh handler (see ARCHITECTURE §9e)
- Implement alert evaluation worker (`src/worker/alertEvaluator.ts`) — runs on 60s cron
- Implement email delivery via Resend (`src/emails/AlertTriggered.tsx`)
- Implement browser push notification delivery via `web-push`
- Implement `/api/alerts/trigger` internal endpoint (authenticated via `ALERT_WORKER_SECRET`)
- Implement chart history depth enforcement in `/api/ohlcv` route based on subscription tier

**Must read before working:**
- `/docs/ARCHITECTURE.md` — API structure, auth flow, caching strategy, security requirements
- `/docs/DB_SCHEMA.md` — database models before writing any query
- `/docs/FEATURE_BACKLOG.md` — acceptance criteria for each epic's API requirements

**Does NOT own:**
- Frontend components
- Prisma schema files
- Design system

---

### 5. Database Agent

**Role:** Owns the Prisma schema, migrations, and database utility layer.

**File Ownership:**
- `prisma/` — `schema.prisma` and all migrations
- `src/lib/db/` — Prisma client singleton, database helper utilities

**Responsibilities:**
- Maintain and evolve the Prisma schema in sync with `/docs/DB_SCHEMA.md`
- Write and review database migrations
- Ensure all indexes are present as specified in `/docs/DB_SCHEMA.md`
- Implement Prisma client singleton with correct connection pooling for serverless
- Write typed database helper functions used by the Backend API Agent

**Must read before working:**
- `/docs/DB_SCHEMA.md` — the canonical schema specification
- `/docs/ARCHITECTURE.md` — database section (connection pooling, Neon + Prisma config)

**Does NOT own:**
- API routes (only provides the database layer)
- Frontend components

**Coordination required when:**
- Adding new tables or columns — must update `/docs/DB_SCHEMA.md` first, get Product Architect acknowledgment

---

### 6. Design System Agent

**Role:** Builds and maintains the design system primitive components and Tailwind configuration.

**File Ownership:**
- `src/components/ui/` — all primitive components (Button, Input, Modal, Badge, Tabs, etc.)
- `tailwind.config.ts` — design tokens, theme extension
- `src/styles/globals.css` — CSS custom properties (color tokens)

**Responsibilities:**
- Implement all design tokens from `/docs/UI_UX_SPEC.md` in `tailwind.config.ts`
- Build accessible primitive components (ARIA, focus management, keyboard nav)
- Document component API in JSDoc comments
- Ensure all components work in dark theme
- Provide compound components for complex UI (Tabs, Modal, Dropdown)

**Must read before working:**
- `/docs/UI_UX_SPEC.md` — color palette, typography, spacing system, accessibility requirements
- `/docs/PRODUCT_PRINCIPLES.md` — dark-first principle, minimal chrome

**Does NOT own:**
- Feature components (uses primitives, doesn't build them here)
- Chart components
- API routes

---

### 7. QA Agent

**Role:** Implements and maintains the testing suite across all layers. **Owns the release gate** — no feature merges to `main` without QA Agent sign-off.

**File Ownership:**
- `tests/` — Vitest unit, integration, contract, database, and security tests
- `playwright/` — Playwright E2E, visual regression, and accessibility tests
- `docs/TEST_STRATEGY.md` — test approach and coverage requirements
- `docs/VALIDATION_CHECKLIST.md` — pre-commit, pre-merge, pre-release gate checklists
- `docs/QA_ACCEPTANCE.md` — feature acceptance criteria and sign-off templates

**Responsibilities:**
- Write unit tests for all functions in `src/lib/` containing business logic
- Write integration tests for all API routes
- Write E2E tests for all critical user flows (auth, chart load, watchlist CRUD, alerts, billing, layout persistence)
- Write visual regression baseline snapshots for all UI states
- Write accessibility audit tests (`@axe-core/playwright`) for all pages and modals
- Write API contract tests for all endpoints
- Write database constraint and isolation tests
- Write security validation tests (auth bypass, IDOR, injection, rate limiting)
- Write chart-specific interaction tests (crosshair, drawings, indicators, WebSocket staleness)
- Maintain test fixtures, seed data, and mocks
- Monitor and enforce coverage thresholds (`src/lib/` ≥ 80%, overall ≥ 70%)
- **Own the release gate:** complete the sign-off checklist in `/docs/QA_ACCEPTANCE.md` before any feature merges to `main`
- Maintain and evolve `/docs/TEST_STRATEGY.md`, `/docs/VALIDATION_CHECKLIST.md`, and `/docs/QA_ACCEPTANCE.md`

**Must read before working:**
- `/docs/FEATURE_BACKLOG.md` — acceptance criteria define test cases
- `/docs/PRODUCT_PRINCIPLES.md` — performance thresholds define performance test targets
- `/docs/NON_FUNCTIONAL_REQUIREMENTS.md` — measurable targets for performance, reliability, security, accessibility
- `/docs/QA_ACCEPTANCE.md` — feature acceptance criteria to validate against

**Does NOT own:**
- Source code in `src/` (tests only; report bugs to the owning agent, do not fix them)

**Coordination:**
- When a test fails due to a product bug, file a bug report and notify the owning agent — do not modify source code
- When acceptance criteria are ambiguous, escalate to Product Architect before writing tests
- When a PR lacks required test coverage, block merge and request coverage from the implementing agent
- **Release gate authority:** QA Agent may block a PR merge by withholding sign-off if acceptance criteria are not met

---

## Cross-Agent Coordination Protocol

### When to Coordinate
1. A change spans multiple ownership areas
2. A schema change is needed (always involves Database Agent + Product Architect)
3. A new design token is needed (involves Design System Agent + Frontend UI Agent)
4. An API contract changes (involves Backend API Agent + Frontend UI Agent)

### How to Coordinate
1. **Document the change** — add a comment in the relevant doc or a note in the PR description explaining the cross-ownership change
2. **Acknowledge** — the owning agent confirms the change is acceptable before it lands
3. **Update docs** — if the change affects documentation, Product Architect updates `/docs/` accordingly

### Never Do Without Coordination
- Modify `tailwind.config.ts` without Design System Agent review
- Modify `prisma/schema.prisma` without Database Agent and Product Architect review
- Change an API response shape without Backend API Agent + Frontend UI Agent coordination
- Delete files owned by another agent
- Merge any feature PR without QA Agent sign-off (see `/docs/QA_ACCEPTANCE.md` sign-off template)
- Deploy to production without completing the pre-release checklist in `/docs/VALIDATION_CHECKLIST.md`
