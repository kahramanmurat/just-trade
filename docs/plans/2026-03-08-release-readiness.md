# Release Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the E2E test suite production-ready by forcing mock data, adding accessibility audits, visual regression baselines, and deployment/release documentation.

**Architecture:** Playwright route interception for deterministic E2E data; @axe-core/playwright for WCAG 2.1 AA audits; Playwright screenshot comparison for visual regression; standalone docs for deployment and release.

**Tech Stack:** Playwright, @axe-core/playwright (already installed), Next.js, Vercel, Neon, Upstash, Railway

---

## Task 1: Force Mock Market Data During E2E Runs

**Files:**
- Create: `playwright/fixtures/mock-data.ts` — Playwright fixture with route interception
- Modify: `playwright/e2e/dashboard.spec.ts` — Use mock fixture
- Modify: `playwright/e2e/watchlist.spec.ts` — Use mock fixture
- Modify: `playwright/e2e/symbol-search.spec.ts` — Use mock fixture
- Modify: `playwright/e2e/alerts.spec.ts` — Use mock fixture
- Modify: `playwright/e2e/layouts.spec.ts` — Use mock fixture
- Modify: `playwright/e2e/billing.spec.ts` — Use mock fixture
- Modify: `playwright/e2e/ai-assistant.spec.ts` — Use mock fixture

**Approach:** Create a shared Playwright fixture that intercepts `/api/ohlcv` responses and returns deterministic mock OHLCV data. This eliminates Polygon.io 429 rate limits and makes tests fully offline-capable.

---

## Task 2: Accessibility Audits with @axe-core/playwright

**Files:**
- Create: `playwright/a11y/dashboard.spec.ts` — Dashboard page + modal accessibility audits

**Approach:** Scan dashboard, sign-in, symbol search modal, and right panel tabs for WCAG 2.1 AA violations using axe-core. Zero critical/serious violations allowed.

---

## Task 3: Visual Regression Baselines

**Files:**
- Create: `playwright/visual/dashboard.spec.ts` — Screenshot baselines at key viewports

**Approach:** Capture baseline screenshots of dashboard at 1440x900 and 1024x768. Use Playwright's `toHaveScreenshot()` with 0.1% pixel diff threshold.

---

## Task 4: docs/DEPLOYMENT.md

**Files:**
- Create: `docs/DEPLOYMENT.md`

---

## Task 5: docs/RELEASE_RUNBOOK.md

**Files:**
- Create: `docs/RELEASE_RUNBOOK.md`
