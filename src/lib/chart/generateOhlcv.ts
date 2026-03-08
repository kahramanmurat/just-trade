// Generates deterministic mock OHLCV data for a given symbol + timeframe.
// Replaced by Polygon.io REST API in Epic 6 (Backend API Agent).

import type { OhlcvCandle } from '@/lib/api/types'

const SEED_PRICES: Record<string, number> = {
  AAPL: 182,
  TSLA: 248,
  NVDA: 875,
  MSFT: 415,
  BTCUSD: 63500,
  ETHUSD: 3420,
}

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1D': 86400,
  '1W': 604800,
  '1M': 2592000,
}

// Deterministic PRNG seeded from symbol + timeframe strings
function createRng(symbol: string, timeframe: string): () => number {
  let seed = 0
  for (const ch of symbol) seed = (seed * 31 + ch.charCodeAt(0)) | 0
  for (const ch of timeframe) seed = (seed * 31 + ch.charCodeAt(0)) | 0
  return () => {
    seed = (seed * 16807 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

export function generateOhlcv(
  symbol: string,
  timeframe: string,
  count = 200
): OhlcvCandle[] {
  let price = SEED_PRICES[symbol] ?? 100
  const interval = INTERVAL_SECONDS[timeframe] ?? 86400
  const rand = createRng(symbol, timeframe)
  const volatility = price * 0.015

  const now = Math.floor(Date.now() / 1000)
  let time = now - count * interval

  const candles: OhlcvCandle[] = []

  for (let i = 0; i < count; i++) {
    const change = (rand() - 0.48) * volatility
    const open = price
    const close = open + change
    const high = Math.max(open, close) + rand() * volatility * 0.5
    const low = Math.min(open, close) - rand() * volatility * 0.5
    const volume = Math.floor(500000 + rand() * 2000000)

    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    })

    price = close
    time += interval
  }

  return candles
}
