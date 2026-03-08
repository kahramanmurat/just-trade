// Realtime data provider abstraction.
// Ready for Polygon WebSocket integration — swap the provider, keep the interface.

import type { PriceTick } from '@/lib/store/tickStore'

export type TickHandler = (tick: PriceTick) => void
export type StatusHandler = (status: 'connected' | 'disconnected') => void

export type RealtimeProvider = {
  name: string
  connect(onTick: TickHandler, onStatus: StatusHandler): void
  subscribe(symbols: string[]): void
  unsubscribe(symbols: string[]): void
  /** Seed the provider with known prices (e.g. from last OHLCV close) so ticks start from realistic values */
  seedPrices(prices: Record<string, number>): void
  disconnect(): void
}
