// Mock realtime provider — simulates price ticks using random walk.
// Generates ticks every 1-3 seconds for subscribed symbols.
// Replace with Polygon WebSocket provider for production.

import type { PriceTick } from '@/lib/store/tickStore'
import type { RealtimeProvider, TickHandler, StatusHandler } from './types'

export function createMockRealtimeProvider(): RealtimeProvider {
  let onTick: TickHandler | null = null
  let onStatus: StatusHandler | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null
  const subscribedSymbols = new Set<string>()
  // Current walk prices — seeded from OHLCV last close via seedPrices()
  const currentPrices: Record<string, number> = {}
  // Session open prices — used for change/changePercent calculation
  const openPrices: Record<string, number> = {}

  function generateTick(symbol: string): PriceTick {
    const current = currentPrices[symbol]
    if (current === undefined) return { symbol, price: 0, change: 0, changePercent: 0, timestamp: Date.now() }

    const volatility = current * 0.0005 // 0.05% per tick — subtle movement
    const delta = (Math.random() - 0.48) * volatility * 2
    const price = Math.max(current + delta, 0.01)
    currentPrices[symbol] = price

    const open = openPrices[symbol] ?? price
    const change = price - open
    const changePercent = open > 0 ? (change / open) * 100 : 0

    return {
      symbol,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      timestamp: Date.now(),
    }
  }

  function startTicking() {
    if (intervalId) return

    intervalId = setInterval(() => {
      if (subscribedSymbols.size === 0 || !onTick) return

      // Pick a random subscribed symbol that has a seeded price
      const symbols = Array.from(subscribedSymbols).filter((s) => s in currentPrices)
      if (symbols.length === 0) return

      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      onTick(generateTick(symbol))
    }, 1500)
  }

  function stopTicking() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return {
    name: 'mock',

    connect(tickHandler, statusHandler) {
      onTick = tickHandler
      onStatus = statusHandler

      setTimeout(() => {
        onStatus?.('connected')
        startTicking()
      }, 300)
    },

    seedPrices(prices) {
      for (const [symbol, price] of Object.entries(prices)) {
        currentPrices[symbol] = price
        // Set open price only once — first seed establishes the session open
        if (!(symbol in openPrices)) {
          openPrices[symbol] = price
        }
      }
    },

    subscribe(symbols) {
      for (const s of symbols) {
        subscribedSymbols.add(s)
      }

      // Emit initial ticks for symbols that have seeded prices
      if (onTick) {
        for (const s of symbols) {
          if (s in currentPrices) {
            onTick(generateTick(s))
          }
        }
      }
    },

    unsubscribe(symbols) {
      for (const s of symbols) {
        subscribedSymbols.delete(s)
      }
    },

    disconnect() {
      stopTicking()
      subscribedSymbols.clear()
      onTick = null
      onStatus?.('disconnected')
      onStatus = null
    },
  }
}
