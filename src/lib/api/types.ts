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

// Alert condition — "gt" (greater than) or "lt" (less than)
export type AlertCondition = 'gt' | 'lt'

// Alert item — returned by GET /api/alerts
export type AlertResponse = {
  id: string
  symbol: string
  condition: AlertCondition
  threshold: number
  isActive: boolean
  triggered: boolean
  triggeredAt: string | null
  createdAt: string
}

// GET /api/alerts response
export type AlertsListResponse = {
  alerts: AlertResponse[]
}

// Saved layout config — stored as JSON in the database
export type LayoutConfigJson = {
  indicators: {
    type: string
    period: number
    visible: boolean
    color: string
  }[]
  drawings: {
    type: 'hline'
    price: number
  }[]
  rightPanelTab: string
  rightPanelOpen: boolean
}

// Layout item — returned by GET /api/layouts
export type LayoutResponse = {
  id: string
  name: string
  symbol: string
  timeframe: string
  isDefault: boolean
  config: LayoutConfigJson
  createdAt: string
  updatedAt: string
}

// GET /api/layouts response
export type LayoutsListResponse = {
  layouts: LayoutResponse[]
}

// POST /api/layouts request body
export type CreateLayoutRequest = {
  name: string
  symbol: string
  timeframe: string
  isDefault?: boolean
  config: LayoutConfigJson
}

// Subscription / billing types

export type PlanType = 'free' | 'pro' | 'premium'

export type SubscriptionResponse = {
  plan: PlanType
  status: string
  currentPeriodEnd: string | null
}

export type TierLimitsResponse = {
  maxWatchlists: number
  maxWatchlistItems: number
  maxIndicators: number
  maxAlerts: number
  maxLayouts: number
}

// AI Assistant types

export type AiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiChatRequest = {
  message: string
  context: {
    symbol: string
    timeframe: string
    indicators: { type: string; period: number; visible: boolean }[]
    watchlist: string[]
  }
}

export type AiChatResponse = {
  reply: string
}

export type SubscriptionWithLimitsResponse = {
  subscription: SubscriptionResponse
  limits: TierLimitsResponse
  usage: {
    watchlists: number
    watchlistItems: number
    alerts: number
    layouts: number
  }
}
