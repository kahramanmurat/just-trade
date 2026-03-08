# Sprint 0 — Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold a clean Next.js 15 project with TypeScript, Tailwind, and the full folder structure from ARCHITECTURE.md — no product features, no boilerplate.

**Architecture:** Next.js 15 App Router in the existing repo root (`just-trade/`). All code lives in `src/`. Tailwind uses CSS custom properties for design tokens. Folder structure mirrors the 7-agent ownership model from AGENTS.md.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS 4, ESLint, pnpm

---

## Pre-flight checks

- Working directory: `/Users/muratkahraman/Downloads/projects/just-trade`
- Package manager: `pnpm`
- Git branch: `feature/project-init`
- Do NOT implement any product features in this sprint
- Do NOT install runtime dependencies (Clerk, Prisma, etc.) — just the scaffold

---

### Task 1: Scaffold Next.js 15 with pnpm create next-app

**Files:**
- Creates everything at the repo root

**Step 1: Run the scaffolder**

```bash
cd /Users/muratkahraman/Downloads/projects/just-trade
pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias \
  --turbopack
```

Answer every interactive prompt as follows (if not already passed via flags):
- Would you like to use TypeScript? → **Yes**
- Would you like to use ESLint? → **Yes**
- Would you like to use Tailwind CSS? → **Yes**
- Would you like your code inside a `src/` directory? → **Yes**
- Would you like to use App Router? → **Yes**
- Would you like to use Turbopack for `next dev`? → **Yes**
- Would you like to customize the import alias? → **No**

**Step 2: Verify scaffold succeeded**

```bash
ls package.json tsconfig.json tailwind.config.ts next.config.ts src/
```

Expected: all files present, no errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 with TypeScript, Tailwind, ESLint"
```

---

### Task 2: Update CLAUDE.md — Next.js version reference

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update the version reference**

Find the line:
```
| Framework | Next.js 14+ (App Router) |
```

Replace with:
```
| Framework | Next.js 15+ (App Router) |
```

**Step 2: Verify**

```bash
grep "Next.js" CLAUDE.md
```

Expected: `Next.js 15+ (App Router)`

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect Next.js 15+"
```

---

### Task 3: Remove default Next.js boilerplate

**Files:**
- Delete: `src/app/page.tsx` (replace content, not delete — it's the root route)
- Delete: `src/app/globals.css` content (replace with our tokens)
- Delete: `public/next.svg`, `public/vercel.svg`
- Modify: `src/app/layout.tsx` (strip defaults, keep root shell)

**Step 1: Replace `src/app/page.tsx` with a minimal placeholder**

```tsx
// src/app/page.tsx
export default function RootPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F1117]">
      <p className="font-mono text-[#E0E3EB]">JustTrade — coming soon</p>
    </main>
  )
}
```

**Step 2: Replace `src/app/layout.tsx` with clean root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'JustTrade',
  description: 'Professional trading dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  )
}
```

**Step 3: Remove unused SVGs from public/**

```bash
rm -f public/next.svg public/vercel.svg
```

**Step 4: Verify dev server starts**

```bash
pnpm dev
```

Open `http://localhost:3000` — should show the placeholder page with dark background and "JustTrade — coming soon" text.

Kill the dev server (Ctrl+C).

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Next.js default boilerplate, add root placeholder"
```

---

### Task 4: Configure Tailwind design tokens and globals.css

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

**Step 1: Replace `src/app/globals.css` with design token definitions**

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Typography */
  --font-inter: var(--font-inter);

  /* Background scale */
  --color-bg: #0F1117;
  --color-surface: #1A1D29;
  --color-surface-2: #222531;

  /* Accent */
  --color-accent: #2962FF;
  --color-accent-hover: #1E4FD8;

  /* Semantic price colors */
  --color-up: #26A69A;
  --color-down: #EF5350;

  /* Text */
  --color-text: #E0E3EB;
  --color-text-secondary: #787B86;
  --color-text-muted: #4E5261;

  /* Borders */
  --color-border: #2A2E39;
  --color-border-subtle: #1E2030;
}

@layer base {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  }

  /* Monospace for price/OHLCV values */
  .font-price {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-feature-settings: "tnum";
  }
}
```

> **Note:** Tailwind v4 uses `@theme` and `@import "tailwindcss"` instead of `@tailwind base/components/utilities` directives and `tailwind.config.ts` `extend.colors`. If the project was scaffolded with Tailwind v3, see Step 2 for the v3 approach.

**Step 2 (Tailwind v3 only — skip if v4): Configure `tailwind.config.ts`**

If `package.json` shows `tailwindcss` version `^3.x`, use this config instead of the `@theme` block above:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0F1117',
        surface: '#1A1D29',
        'surface-2': '#222531',
        accent: '#2962FF',
        'accent-hover': '#1E4FD8',
        up: '#26A69A',
        down: '#EF5350',
        text: '#E0E3EB',
        'text-secondary': '#787B86',
        'text-muted': '#4E5261',
        border: '#2A2E39',
        'border-subtle': '#1E2030',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

And replace `src/app/globals.css` with:

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #0F1117;
  --color-surface: #1A1D29;
  --color-surface-2: #222531;
  --color-accent: #2962FF;
  --color-accent-hover: #1E4FD8;
  --color-up: #26A69A;
  --color-down: #EF5350;
  --color-text: #E0E3EB;
  --color-text-secondary: #787B86;
  --color-text-muted: #4E5261;
  --color-border: #2A2E39;
  --color-border-subtle: #1E2030;
}

@layer base {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-bg text-text;
    font-feature-settings: "kern";
  }

  .font-price {
    font-feature-settings: "tnum";
  }
}
```

**Step 3: Verify tokens load**

```bash
pnpm dev
```

Inspect the page — background should be `#0F1117`. Kill dev server.

**Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "style: add design tokens and Tailwind configuration"
```

---

### Task 5: Build the folder structure

**Files:**
- Create empty directories with `.gitkeep` files per ARCHITECTURE.md

**Step 1: Create all required directories**

```bash
cd /Users/muratkahraman/Downloads/projects/just-trade

# App Router pages
mkdir -p src/app/\(auth\)/sign-in
mkdir -p src/app/\(auth\)/sign-up
mkdir -p src/app/dashboard
mkdir -p src/app/api/watchlists
mkdir -p src/app/api/alerts
mkdir -p src/app/api/layouts
mkdir -p src/app/api/push-subscriptions
mkdir -p src/app/api/webhooks/stripe
mkdir -p src/app/api/webhooks/clerk

# Components
mkdir -p src/components/chart
mkdir -p src/components/ui

# Lib
mkdir -p src/lib/api
mkdir -p src/lib/chart
mkdir -p src/lib/db
mkdir -p src/lib/store

# Other src
mkdir -p src/hooks
mkdir -p src/styles
mkdir -p src/emails
mkdir -p src/worker

# Infrastructure
mkdir -p prisma/migrations
mkdir -p websocket-service/src

# Tests
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/contracts
mkdir -p tests/security
mkdir -p tests/db

# Playwright
mkdir -p playwright/e2e
mkdir -p playwright/visual
mkdir -p playwright/a11y
mkdir -p playwright/chart
```

**Step 2: Add `.gitkeep` to every empty directory so git tracks them**

```bash
find src tests playwright prisma websocket-service -type d -empty -exec touch {}/.gitkeep \;
```

**Step 3: Verify structure**

```bash
find src -type d | sort
find tests -type d | sort
find playwright -type d | sort
```

Expected: all directories listed above appear.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: create project folder structure per ARCHITECTURE.md"
```

---

### Task 6: Create placeholder stub files for critical singletons

These files don't implement anything yet — they establish the right file paths and export shapes so future tasks import from the correct locations.

**Files:**
- Create: `src/lib/db/prisma.ts`
- Create: `src/lib/store/chartStore.ts`
- Create: `src/lib/api/types.ts`
- Create: `src/middleware.ts`

**Step 1: Prisma singleton stub**

```ts
// src/lib/db/prisma.ts
// Singleton Prisma client — import this everywhere, never new PrismaClient() in routes.
// TODO(Database Agent): install prisma + @prisma/client, then implement this module.

export const prisma = null as unknown as never
```

**Step 2: Zustand chart store stub**

```ts
// src/lib/store/chartStore.ts
// Global UI state for the chart (active symbol, timeframe, drawing tool, etc.)
// TODO(Frontend UI Agent): implement with zustand after installing the dependency.

export {}
```

**Step 3: API types stub**

```ts
// src/lib/api/types.ts
// All API response types must be defined here (CLAUDE.md convention).

export {}
```

**Step 4: Next.js middleware stub**

```ts
// src/middleware.ts
// Clerk authentication middleware — protects /dashboard and /api routes.
// TODO(Backend API Agent): implement after installing @clerk/nextjs.

export {}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
```

**Step 5: Commit**

```bash
git add src/lib/db/prisma.ts src/lib/store/chartStore.ts src/lib/api/types.ts src/middleware.ts
git commit -m "chore: add critical singleton stubs (prisma, store, api types, middleware)"
```

---

### Task 7: Create .env.example

**Files:**
- Create: `.env.example`
- Create: `.env.local` (gitignored — empty for now)

**Step 1: Create `.env.example`**

```bash
# .env.example — copy to .env.local and fill in values
# Never commit real secrets.

# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
DIRECT_URL=postgresql://user:password@host/dbname?sslmode=require

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Clerk Auth
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Market Data
POLYGON_API_KEY=your-polygon-key

# Email (Resend)
RESEND_API_KEY=re_...

# Internal services
WEBSOCKET_SERVICE_URL=ws://localhost:8080
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080
ALERT_WORKER_SECRET=change-me-in-production
```

**Step 2: Verify `.gitignore` already includes `.env.local`**

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` is listed. If not, add it:

```bash
echo ".env.local" >> .gitignore
```

**Step 3: Touch `.env.local`**

```bash
touch .env.local
```

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example with all required environment variables"
```

---

### Task 8: TypeScript strict mode verification

**Files:**
- Modify: `tsconfig.json` (if strict mode is not already set)

**Step 1: Verify strict mode is enabled**

```bash
grep '"strict"' tsconfig.json
```

Expected: `"strict": true`. Next.js 15 scaffolds with strict mode on by default.

If missing, add it inside `"compilerOptions"`:

```json
"strict": true,
"noUncheckedIndexedAccess": true,
```

**Step 2: Run TypeScript check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors. If stub files produce errors, fix them (usually by adjusting the `export {}` pattern).

**Step 3: Commit (only if tsconfig.json was modified)**

```bash
git add tsconfig.json
git commit -m "chore: ensure TypeScript strict mode is enabled"
```

---

### Task 9: Run lint and verify clean state

**Step 1: Run ESLint**

```bash
pnpm lint
```

Expected: no errors. Fix any reported issues before proceeding.

**Step 2: Verify build passes**

```bash
pnpm build
```

Expected: build completes with no TypeScript or compilation errors.

**Step 3: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "chore: fix lint issues from initial scaffold"
```

---

### Task 10: Final summary commit and branch push

**Step 1: Review git log**

```bash
git log --oneline
```

Expected: clean commit history showing all Sprint 0 tasks.

**Step 2: Done**

Sprint 0 is complete. Report to user with:
- Summary of files created
- Commands to run next (pnpm dev, and what to install for the next sprint)
- No features implemented — clean foundation only

---

## What comes next (Sprint 1 prerequisites)

Before Sprint 1 (Auth + Dashboard skeleton), install and configure:

```bash
# Auth
pnpm add @clerk/nextjs

# Database
pnpm add prisma @prisma/client
pnpm add -D prisma

# Caching
pnpm add @upstash/redis

# State
pnpm add zustand @tanstack/react-query

# Validation
pnpm add zod

# Charting
pnpm add lightweight-charts

# Email templates
pnpm add resend @react-email/components
```

Then initialize Prisma:
```bash
pnpm prisma init
```

And configure Clerk middleware in `src/middleware.ts`.
