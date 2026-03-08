// Provider abstraction types for OHLCV data sources.

import type { OhlcvCandle } from '@/lib/api/types'

export type OhlcvTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M'

export type OhlcvProviderResult = {
  candles: OhlcvCandle[]
  /** Provider that served the data (for debugging/logging) */
  source: string
}

export type OhlcvProvider = {
  name: string
  /** Fetch OHLCV candles. Throws on failure. */
  fetchCandles(
    symbol: string,
    timeframe: OhlcvTimeframe,
    count: number
  ): Promise<OhlcvProviderResult>
}
