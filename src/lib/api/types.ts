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

// Watchlist item — returned by GET /api/watchlists
export type WatchlistItemResponse = {
  id: string
  symbol: string
  name: string
  displayOrder: number
}

// GET /api/watchlists response
export type WatchlistResponse = {
  id: string
  name: string
  isDefault: boolean
  items: WatchlistItemResponse[]
}

// Standard API error response
export type ApiError = {
  error: string
  code?: string
}
