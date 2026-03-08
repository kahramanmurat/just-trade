import { test as base } from '@playwright/test'

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

const MOCK_WATCHLIST = {
  watchlists: [
    {
      id: 'mock-watchlist-1',
      name: 'My Watchlist',
      userId: 'mock-user',
      symbols: ['AAPL', 'TSLA', 'NVDA', 'MSFT'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
}

const MOCK_SUBSCRIPTION = {
  plan: 'free',
  status: 'active',
  maxWatchlists: 1,
  maxSymbolsPerWatchlist: 10,
  maxIndicators: 2,
  maxAlerts: 0,
  maxLayouts: 0,
  realtimeData: false,
}

export const test = base.extend<{ mockMarketData: void }>({
  mockMarketData: [
    async ({ page }, use) => {
      // Intercept OHLCV API
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

      // Intercept watchlists API
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

      // Intercept subscription API
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

      await use()
    },
    { auto: true },
  ],
})

export { expect, type Page } from '@playwright/test'
