// OHLCV data fetcher — resolves provider, checks cache, returns candles.
// Entry point used by the /api/ohlcv route handler.

import type { OhlcvCandle } from '@/lib/api/types'
import type { OhlcvProvider, OhlcvTimeframe } from './types'
import { getCachedCandles, setCachedCandles } from './cache'
import { mockProvider } from './mockProvider'
import { createPolygonProvider } from './polygonProvider'

let resolvedProvider: OhlcvProvider | null = null

function getProvider(): OhlcvProvider {
  if (resolvedProvider) return resolvedProvider

  const polygonKey = process.env.POLYGON_API_KEY
  if (polygonKey) {
    resolvedProvider = createPolygonProvider(polygonKey)
  } else {
    resolvedProvider = mockProvider
  }

  return resolvedProvider
}

export type FetchOhlcvResult = {
  candles: OhlcvCandle[]
  source: string
  cached: boolean
}

export async function fetchOhlcv(
  symbol: string,
  timeframe: OhlcvTimeframe,
  count: number
): Promise<FetchOhlcvResult> {
  // 1. Check cache
  const cached = await getCachedCandles(symbol, timeframe)
  if (cached && cached.length > 0) {
    return { candles: cached, source: 'cache', cached: true }
  }

  const provider = getProvider()

  // 2. Try the configured provider
  try {
    const result = await provider.fetchCandles(symbol, timeframe, count)

    // 3. Cache the result (fire-and-forget)
    if (result.candles.length > 0) {
      setCachedCandles(symbol, timeframe, result.candles).catch(() => {})
    }

    return { candles: result.candles, source: result.source, cached: false }
  } catch (err) {
    // 4. If Polygon fails, fall back to mock
    if (provider.name !== 'mock') {
      console.error(
        `[ohlcv] ${provider.name} failed for ${symbol}/${timeframe}:`,
        err instanceof Error ? err.message : err
      )
      const fallback = await mockProvider.fetchCandles(symbol, timeframe, count)
      return { candles: fallback.candles, source: 'mock-fallback', cached: false }
    }

    throw err
  }
}
