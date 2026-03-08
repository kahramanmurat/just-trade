// Redis cache layer for OHLCV data using Upstash.
// Key pattern: ohlcv:{symbol}:{timeframe} (per ARCHITECTURE.md §6)

import { Redis } from '@upstash/redis'
import type { OhlcvCandle } from '@/lib/api/types'
import type { OhlcvTimeframe } from './types'

// TTLs per timeframe (seconds) — shorter timeframes get shorter TTLs
const TTL_MAP: Record<OhlcvTimeframe, number> = {
  '1m': 30,
  '5m': 60,
  '15m': 120,
  '1h': 300,
  '4h': 600,
  '1D': 3600,
  '1W': 7200,
  '1M': 14400,
}

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  redis = new Redis({ url, token })
  return redis
}

function cacheKey(symbol: string, timeframe: string): string {
  return `ohlcv:${symbol}:${timeframe}`
}

export async function getCachedCandles(
  symbol: string,
  timeframe: OhlcvTimeframe
): Promise<OhlcvCandle[] | null> {
  const r = getRedis()
  if (!r) return null

  try {
    const data = await r.get<OhlcvCandle[]>(cacheKey(symbol, timeframe))
    return data ?? null
  } catch {
    // Cache miss is not fatal — fall through to provider
    return null
  }
}

export async function setCachedCandles(
  symbol: string,
  timeframe: OhlcvTimeframe,
  candles: OhlcvCandle[]
): Promise<void> {
  const r = getRedis()
  if (!r) return

  const ttl = TTL_MAP[timeframe]

  try {
    await r.set(cacheKey(symbol, timeframe), candles, { ex: ttl })
  } catch {
    // Cache write failure is not fatal
  }
}
