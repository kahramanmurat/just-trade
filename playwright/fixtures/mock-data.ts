import { test as base } from '@playwright/test'

// ---------------------------------------------------------------------------
// Mock response shapes — MUST match types in src/lib/api/types.ts exactly
// ---------------------------------------------------------------------------

// Deterministic OHLCV candle generator (simplified from src/lib/chart/generateOhlcv.ts)
function generateMockCandles(symbol: string, count = 200) {
  const SEED_PRICES: Record<string, number> = {
    AAPL: 182,
    TSLA: 248,
    NVDA: 875,
    MSFT: 415,
    BTCUSD: 63500,
    ETHUSD: 3420,
  }
  const price = SEED_PRICES[symbol] ?? 100
  const now = Math.floor(Date.now() / 1000)
  const interval = 86400
  let currentPrice = price
  const candles = []

  for (let i = 0; i < count; i++) {
    const open = currentPrice
    const change = (Math.sin(i * 0.1) * 0.02 + 0.001) * price // deterministic wave
    const close = open + change
    const high = Math.max(open, close) * 1.005
    const low = Math.min(open, close) * 0.995
    candles.push({
      time: now - (count - i) * interval,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: 1000000 + i * 10000,
    })
    currentPrice = close
  }
  return candles
}

// Shape: WatchlistResponse (src/lib/api/types.ts)
const MOCK_WATCHLIST = {
  id: 'mock-watchlist-1',
  name: 'Watchlist',
  isDefault: true,
  items: [
    { id: 'item-1', symbol: 'AAPL', name: 'Apple Inc.', displayOrder: 0 },
    { id: 'item-2', symbol: 'TSLA', name: 'Tesla Inc.', displayOrder: 1 },
    { id: 'item-3', symbol: 'NVDA', name: 'NVIDIA Corp.', displayOrder: 2 },
    { id: 'item-4', symbol: 'MSFT', name: 'Microsoft Corp.', displayOrder: 3 },
  ],
}

// Shape: SubscriptionWithLimitsResponse (src/lib/api/types.ts)
const MOCK_SUBSCRIPTION = {
  subscription: {
    plan: 'free',
    status: 'active',
    currentPeriodEnd: null,
  },
  limits: {
    maxWatchlists: 1,
    maxWatchlistItems: 10,
    maxIndicators: 2,
    maxAlerts: 0,
    maxLayouts: 0,
  },
  usage: {
    watchlists: 1,
    watchlistItems: 4,
    alerts: 0,
    layouts: 0,
  },
}

// Shape: AlertsListResponse (src/lib/api/types.ts)
const MOCK_ALERTS_LIST = {
  alerts: [],
}

// Shape: LayoutsListResponse (src/lib/api/types.ts)
const MOCK_LAYOUTS_LIST = {
  layouts: [],
}

// Shape: AiChatResponse (src/lib/api/types.ts)
const MOCK_AI_RESPONSE = {
  reply:
    'Based on your **AAPL** chart on the **1D** timeframe, the current setup shows a steady trend. The active indicators suggest neutral momentum.\n\n*This is informational analysis only — not financial advice.*',
}

// ---------------------------------------------------------------------------
// Playwright fixture — auto-intercepts all API routes with mock data
// ---------------------------------------------------------------------------

export const test = base.extend<{ mockMarketData: void }>({
  mockMarketData: [
    async ({ page }, use) => {
      // Intercept OHLCV API — shape: OhlcvResponse
      await page.route('**/api/ohlcv*', async (route) => {
        const url = new URL(route.request().url())
        const symbol = url.searchParams.get('symbol') || 'AAPL'
        const candles = generateMockCandles(symbol)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            symbol,
            timeframe: url.searchParams.get('timeframe') || '1D',
            candles,
          }),
          headers: { 'X-Data-Source': 'mock', 'X-Cache-Hit': 'false' },
        })
      })

      // Intercept watchlists API — shape: WatchlistResponse
      await page.route('**/api/watchlists*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_WATCHLIST),
          })
        } else {
          await route.fallback()
        }
      })

      // Intercept subscription API — shape: SubscriptionWithLimitsResponse
      await page.route('**/api/subscription*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_SUBSCRIPTION),
          })
        } else {
          await route.fallback()
        }
      })

      // Intercept alerts API — shape: AlertsListResponse; POST returns 403 (free plan)
      await page.route('**/api/alerts*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ALERTS_LIST),
          })
        } else if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Alert limit reached (0). Upgrade your plan for more alerts.',
              code: 'LIMIT_REACHED',
            }),
          })
        } else {
          await route.fallback()
        }
      })

      // Intercept layouts API — shape: LayoutsListResponse; POST returns 403 (free plan)
      await page.route('**/api/layouts*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_LAYOUTS_LIST),
          })
        } else if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Layout limit reached (0). Upgrade your plan for more layouts.',
              code: 'LIMIT_REACHED',
            }),
          })
        } else {
          await route.fallback()
        }
      })

      // Intercept AI chat API — shape: AiChatResponse
      await page.route('**/api/ai/chat', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_AI_RESPONSE),
          })
        } else {
          await route.fallback()
        }
      })

      await use()
    },
    { auto: true },
  ],
})

export { expect, type Page } from '@playwright/test'
