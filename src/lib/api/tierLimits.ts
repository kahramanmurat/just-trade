// Tier limits — server-side enforcement of plan-based feature limits.
// Free: 1 watchlist (10 symbols), 2 indicators, 0 alerts, 0 layouts
// Pro ($15/mo): 3 watchlists (50 symbols each), 10 indicators, 5 alerts, 5 layouts
// Premium ($39/mo): unlimited

import type { Plan } from '@prisma/client'

type TierLimit = {
  maxWatchlists: number
  maxWatchlistItems: number
  maxIndicators: number
  maxAlerts: number
  maxLayouts: number
}

export const TIER_LIMITS: Record<Plan, TierLimit> = {
  free: {
    maxWatchlists: 1,
    maxWatchlistItems: 10,
    maxIndicators: 2,
    maxAlerts: 0,
    maxLayouts: 0,
  },
  pro: {
    maxWatchlists: 3,
    maxWatchlistItems: 50,
    maxIndicators: 10,
    maxAlerts: 5,
    maxLayouts: 5,
  },
  premium: {
    maxWatchlists: 999,
    maxWatchlistItems: 999,
    maxIndicators: 999,
    maxAlerts: 999,
    maxLayouts: 999,
  },
}

export function getLimitsForPlan(plan: Plan): TierLimit {
  return TIER_LIMITS[plan]
}
