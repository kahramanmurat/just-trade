import { create } from 'zustand'
import type {
  PlanType,
  SubscriptionWithLimitsResponse,
  TierLimitsResponse,
} from '@/lib/api/types'

type SubscriptionState = {
  plan: PlanType
  limits: TierLimitsResponse
  usage: { watchlists: number; watchlistItems: number; alerts: number; layouts: number }
  loaded: boolean
  setSubscription: (data: SubscriptionWithLimitsResponse) => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plan: 'free',
  limits: {
    maxWatchlists: 1,
    maxWatchlistItems: 10,
    maxIndicators: 2,
    maxAlerts: 0,
    maxLayouts: 0,
  },
  usage: { watchlists: 0, watchlistItems: 0, alerts: 0, layouts: 0 },
  loaded: false,
  setSubscription: (data) =>
    set({
      plan: data.subscription.plan,
      limits: data.limits,
      usage: data.usage,
      loaded: true,
    }),
}))
