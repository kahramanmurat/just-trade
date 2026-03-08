// Polygon.io OHLCV provider — fetches historical aggregates via REST API.
// Docs: https://polygon.io/docs/stocks/get_v2_aggs_ticker__stocksticker__range__multiplier___timespan___from___to

import type { OhlcvCandle } from '@/lib/api/types'
import type { OhlcvProvider, OhlcvTimeframe, OhlcvProviderResult } from './types'

const POLYGON_BASE = 'https://api.polygon.io'

// Map our timeframes to Polygon's multiplier + timespan
const TIMEFRAME_MAP: Record<OhlcvTimeframe, { multiplier: number; timespan: string }> = {
  '1m': { multiplier: 1, timespan: 'minute' },
  '5m': { multiplier: 5, timespan: 'minute' },
  '15m': { multiplier: 15, timespan: 'minute' },
  '1h': { multiplier: 1, timespan: 'hour' },
  '4h': { multiplier: 4, timespan: 'hour' },
  '1D': { multiplier: 1, timespan: 'day' },
  '1W': { multiplier: 1, timespan: 'week' },
  '1M': { multiplier: 1, timespan: 'month' },
}

// How far back to look for each timeframe (in ms)
const LOOKBACK_MS: Record<OhlcvTimeframe, number> = {
  '1m': 2 * 24 * 60 * 60 * 1000,         // 2 days
  '5m': 7 * 24 * 60 * 60 * 1000,          // 7 days
  '15m': 14 * 24 * 60 * 60 * 1000,        // 14 days
  '1h': 30 * 24 * 60 * 60 * 1000,         // 30 days
  '4h': 90 * 24 * 60 * 60 * 1000,         // 90 days
  '1D': 365 * 24 * 60 * 60 * 1000,        // 1 year
  '1W': 3 * 365 * 24 * 60 * 60 * 1000,    // 3 years
  '1M': 10 * 365 * 24 * 60 * 60 * 1000,   // 10 years
}

// Polygon REST response shape for /v2/aggs/
type PolygonAggResult = {
  t: number  // timestamp in ms
  o: number  // open
  h: number  // high
  l: number  // low
  c: number  // close
  v: number  // volume
}

type PolygonAggResponse = {
  status: string
  resultsCount?: number
  results?: PolygonAggResult[]
  error?: string
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().split('T')[0]
}

/** Convert crypto symbols like BTCUSD → X:BTCUSD for Polygon */
function toPolygonTicker(symbol: string): string {
  const cryptoPairs = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD']
  if (cryptoPairs.includes(symbol)) {
    return `X:${symbol}`
  }
  return symbol
}

function createPolygonProvider(apiKey: string): OhlcvProvider {
  return {
    name: 'polygon',

    async fetchCandles(
      symbol: string,
      timeframe: OhlcvTimeframe,
      count: number
    ): Promise<OhlcvProviderResult> {
      const { multiplier, timespan } = TIMEFRAME_MAP[timeframe]
      const ticker = toPolygonTicker(symbol)

      const now = Date.now()
      const lookback = LOOKBACK_MS[timeframe]
      const from = formatDate(now - lookback)
      const to = formatDate(now)

      const url = new URL(
        `${POLYGON_BASE}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}/${from}/${to}`
      )
      url.searchParams.set('adjusted', 'true')
      url.searchParams.set('sort', 'asc')
      url.searchParams.set('limit', String(Math.min(count, 5000)))
      url.searchParams.set('apiKey', apiKey)

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Polygon API error: HTTP ${res.status} — ${body.slice(0, 200)}`)
      }

      const data: PolygonAggResponse = await res.json()

      if (data.status === 'ERROR' || data.status === 'NOT_FOUND') {
        throw new Error(`Polygon API error: ${data.error ?? data.status}`)
      }

      const results = data.results ?? []

      // Take the last `count` candles if more were returned
      const sliced = results.length > count ? results.slice(-count) : results

      const candles: OhlcvCandle[] = sliced.map((r) => ({
        time: Math.floor(r.t / 1000), // Polygon returns ms, we use UTC seconds
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: r.v,
      }))

      return { candles, source: 'polygon' }
    },
  }
}

export { createPolygonProvider }
