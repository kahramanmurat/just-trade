# JustTrade — Project State

## Overview
JustTrade is a TradingView-style SaaS platform for charting, watchlists, alerts, and AI-assisted market analysis.

Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind v4
- Prisma 7
- Neon PostgreSQL
- Clerk Authentication
- Zustand
- TanStack Query
- lightweight-charts (planned)
- Stripe (planned)

---

## Current Status

### Sprint 0 — Foundation ✅
Completed
- Next.js 16 project scaffolded
- Tailwind v4 configured
- folder structure initialized
- environment variables configured
- development server verified
- base design tokens implemented

---

### Sprint 1 — Database & Authentication

#### Database (Prisma + Neon) ✅
- Prisma schema implemented
- tables created:
  - `users`
  - `subscriptions`
- migration executed successfully
- Prisma client singleton implemented

Database provider: Neon PostgreSQL

---

#### Authentication (Clerk) ✅
- Clerk integrated with Next.js App Router
- sign-in page working
- sign-up page working
- `/dashboard` protected
- webhook endpoint implemented

Webhook endpoint: