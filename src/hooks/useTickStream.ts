// Hook that manages the realtime tick provider lifecycle.
// Connects on mount, subscribes to symbols, feeds ticks into the tick store.
// Exposes seedPrices so ChartContainer can seed from OHLCV last close.

'use client'

import { useEffect, useRef } from 'react'
import { useTickStore } from '@/lib/store/tickStore'
import { createMockRealtimeProvider } from '@/lib/realtime/mockProvider'
import type { RealtimeProvider } from '@/lib/realtime/types'

// Singleton provider — shared across the app
let globalProvider: RealtimeProvider | null = null

export function getRealtimeProvider(): RealtimeProvider | null {
  return globalProvider
}

export function useTickStream(symbols: string[]) {
  const prevSymbolsRef = useRef<string[]>([])
  const { setTick, setStatus } = useTickStore()

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    // TODO: swap to Polygon WebSocket provider when NEXT_PUBLIC_WEBSOCKET_URL is set
    const provider = createMockRealtimeProvider()
    globalProvider = provider

    setStatus('connecting')

    provider.connect(
      (tick) => setTick(tick),
      (status) => setStatus(status)
    )

    return () => {
      provider.disconnect()
      globalProvider = null
      setStatus('disconnected')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync subscriptions when symbols change
  useEffect(() => {
    const provider = globalProvider
    if (!provider) return

    const prev = new Set(prevSymbolsRef.current)
    const next = new Set(symbols)

    const toSub = symbols.filter((s) => !prev.has(s))
    const toUnsub = prevSymbolsRef.current.filter((s) => !next.has(s))

    if (toUnsub.length > 0) provider.unsubscribe(toUnsub)
    if (toSub.length > 0) provider.subscribe(toSub)

    prevSymbolsRef.current = symbols
  }, [symbols])
}
