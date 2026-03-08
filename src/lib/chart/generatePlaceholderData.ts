// Generates realistic-looking OHLCV candlestick data for development.
// Replaced by real market data API in Epic 6 (Backend API Agent).

import type { CandlestickData, UTCTimestamp } from 'lightweight-charts'

type OhlcvCandle = CandlestickData<UTCTimestamp> & { volume: number }

export function generatePlaceholderData(
  symbol: string,
  timeframe: string,
  count = 200
): OhlcvCandle[] {
  // Seed price range based on symbol for deterministic-looking results
  const seedMap: Record<string, number> = {
    AAPL: 182,
    TSLA: 248,
    NVDA: 875,
    MSFT: 415,
    AMZN: 196,
    GOOGL: 175,
    META: 521,
  }
  let price = seedMap[symbol] ?? 100

  // Interval in seconds for each timeframe
  const intervalMap: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1D': 86400,
    '1W': 604800,
    '1M': 2592000,
  }
  const intervalSec = intervalMap[timeframe] ?? 86400

  // Start time: count intervals before "now"
  const now = Math.floor(Date.now() / 1000)
  let time = now - count * intervalSec

  // Simple seeded PRNG for deterministic output per symbol+timeframe
  let seed = 0
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed * 31 + symbol.charCodeAt(i)) | 0
  }
  for (let i = 0; i < timeframe.length; i++) {
    seed = (seed * 31 + timeframe.charCodeAt(i)) | 0
  }
  function rand(): number {
    seed = (seed * 16807 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  const data: OhlcvCandle[] = []
  const volatility = price * 0.015

  for (let i = 0; i < count; i++) {
    const change = (rand() - 0.48) * volatility
    const open = price
    const close = open + change
    const high = Math.max(open, close) + rand() * volatility * 0.5
    const low = Math.min(open, close) - rand() * volatility * 0.5
    const volume = Math.floor(500000 + rand() * 2000000)

    data.push({
      time: time as UTCTimestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    })

    price = close
    time += intervalSec
  }

  return data
}
