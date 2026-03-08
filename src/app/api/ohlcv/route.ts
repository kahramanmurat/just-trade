// GET /api/ohlcv?symbol=AAPL&timeframe=1D
// Returns mock OHLCV candlestick data. Replaced by Polygon.io proxy + Redis cache in Epic 6.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOhlcv } from '@/lib/chart/generateOhlcv'
import type { OhlcvResponse, ApiError } from '@/lib/api/types'

const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'] as const

const querySchema = z.object({
  symbol: z
    .string()
    .min(1, 'symbol is required')
    .max(20, 'symbol too long')
    .transform((s) => s.toUpperCase()),
  timeframe: z.enum(VALID_TIMEFRAMES, {
    message: `timeframe must be one of: ${VALID_TIMEFRAMES.join(', ')}`,
  }),
  count: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 200))
    .pipe(z.number().int().min(1).max(1000)),
})

export async function GET(request: Request) {
  // Auth check — all API routes require authenticated user
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json<ApiError>(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Parse and validate query params
  // searchParams.get() returns null when absent; convert to undefined for Zod
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    symbol: searchParams.get('symbol') ?? undefined,
    timeframe: searchParams.get('timeframe') ?? undefined,
    count: searchParams.get('count') ?? undefined,
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json<ApiError>(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { symbol, timeframe, count } = parsed.data

  // Generate mock candles (replaced by Polygon.io fetch + Redis cache later)
  const candles = generateOhlcv(symbol, timeframe, count)

  return NextResponse.json<OhlcvResponse>({
    symbol,
    timeframe,
    candles,
  })
}
