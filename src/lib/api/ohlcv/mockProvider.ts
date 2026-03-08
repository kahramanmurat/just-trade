// Mock OHLCV provider — wraps the existing deterministic generator.
// Used as fallback when no real market data provider is configured.

import { generateOhlcv } from '@/lib/chart/generateOhlcv'
import type { OhlcvProvider, OhlcvTimeframe, OhlcvProviderResult } from './types'

export const mockProvider: OhlcvProvider = {
  name: 'mock',

  async fetchCandles(
    symbol: string,
    timeframe: OhlcvTimeframe,
    count: number
  ): Promise<OhlcvProviderResult> {
    const candles = generateOhlcv(symbol, timeframe, count)
    return { candles, source: 'mock' }
  },
}
