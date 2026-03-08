'use client'

import { useEffect, useMemo } from 'react'
import DashboardHeader from '@/components/DashboardHeader'
import LeftToolbar from '@/components/LeftToolbar'
import RightPanel from '@/components/RightPanel'
import ChartContainer from '@/components/chart/ChartContainer'
import { useChartStore } from '@/lib/store/chartStore'
import { SYMBOLS } from '@/lib/api/symbols'
import { useTickStream, getRealtimeProvider } from '@/hooks/useTickStream'
import { generateOhlcv } from '@/lib/chart/generateOhlcv'

// Mobile notice — shown below 768px
function MobileBanner() {
  return (
    <div
      className="md:hidden flex items-center justify-center gap-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-2"
      role="status"
      aria-label="Mobile notice"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        aria-hidden="true"
        className="text-[var(--color-text-secondary)] shrink-0"
      >
        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M6.5 5.5V9M6.5 4V4.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-[var(--color-text-secondary)] text-xs">
        Chart viewing only on mobile — switch to desktop for full trading tools
      </p>
    </div>
  )
}

function TickStreamManager() {
  const symbol = useChartStore((s) => s.symbol)
  const allSymbols = useMemo(() => {
    const set = new Set(SYMBOLS.map((s) => s.symbol))
    set.add(symbol)
    return Array.from(set)
  }, [symbol])

  useTickStream(allSymbols)

  // Seed all symbols with last close from mock OHLCV so ticks start at realistic prices
  useEffect(() => {
    const provider = getRealtimeProvider()
    if (!provider) return

    const seedPrices: Record<string, number> = {}
    for (const sym of allSymbols) {
      const candles = generateOhlcv(sym, '1D', 200)
      if (candles.length > 0) {
        seedPrices[sym] = candles[candles.length - 1].close
      }
    }
    provider.seedPrices(seedPrices)
  }, [allSymbols])

  return null
}

export default function DashboardShell() {
  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)] overflow-hidden">
      <TickStreamManager />
      <DashboardHeader />
      <MobileBanner />
      <div className="flex flex-1 min-h-0">
        <LeftToolbar />
        <ChartContainer />
        <RightPanel />
      </div>
    </div>
  )
}
