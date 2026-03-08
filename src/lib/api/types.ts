// All API response types must be defined here (CLAUDE.md convention).

// OHLCV candle — returned by GET /api/ohlcv
export type OhlcvCandle = {
  time: number // UTC seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// GET /api/ohlcv response
export type OhlcvResponse = {
  symbol: string
  timeframe: string
  candles: OhlcvCandle[]
}

// Standard API error response
export type ApiError = {
  error: string
  code?: string
}
