// Realtime price tick store.
// Holds latest tick per symbol and connection status.
// Fed by useTickStream hook; consumed by ChartContainer and WatchlistTab.

import { create } from 'zustand'

export type PriceTick = {
  symbol: string
  price: number
  change: number
  changePercent: number
  timestamp: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface TickStore {
  ticks: Record<string, PriceTick>
  status: ConnectionStatus
  setTick: (tick: PriceTick) => void
  setStatus: (status: ConnectionStatus) => void
}

export const useTickStore = create<TickStore>((set) => ({
  ticks: {},
  status: 'disconnected',
  setTick: (tick) =>
    set((state) => ({
      ticks: { ...state.ticks, [tick.symbol]: tick },
    })),
  setStatus: (status) => set({ status }),
}))
