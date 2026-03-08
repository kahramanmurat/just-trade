'use client'

import DashboardHeader from '@/components/DashboardHeader'
import LeftToolbar from '@/components/LeftToolbar'
import RightPanel from '@/components/RightPanel'
import { useChartStore } from '@/lib/store/chartStore'

// Chart area placeholder — replaced by ChartContainer in Epic 3 (Charting Agent)
function ChartAreaPlaceholder() {
  const { symbol, timeframe } = useChartStore()

  return (
    <main
      className="relative flex-1 min-w-0 min-h-0 bg-[var(--color-bg)] overflow-hidden chart-grid"
      aria-label="Chart area"
      id="chart-area"
    >
      {/* OHLCV legend overlay */}
      <div
        className="absolute top-3 left-3 z-10 flex items-center gap-3 pointer-events-none select-none"
        aria-label="OHLCV legend"
      >
        <span className="text-[var(--color-text)] text-xs font-mono font-semibold">
          {symbol} · {timeframe}
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          {['O', 'H', 'L', 'C', 'Vol'].map((label) => (
            <span key={label}>
              <span className="text-[var(--color-text-secondary)]">{label} </span>
              <span className="text-[var(--color-text-muted)]">—</span>
            </span>
          ))}
        </div>
      </div>

      {/* Symbol watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        <span className="text-[var(--color-text-muted)] text-8xl font-bold font-mono opacity-[0.06] tracking-widest">
          {symbol}
        </span>
      </div>

      {/* Chart placeholder message */}
      <div className="absolute bottom-10 left-0 right-16 flex items-center justify-center pointer-events-none select-none">
        <p className="text-[var(--color-text-muted)] text-xs font-mono">
          Chart component renders here — Epic 3 (Charting Agent)
        </p>
      </div>

      {/* Price scale — right edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 border-l border-[var(--color-border)] flex flex-col justify-around items-end pr-2"
        aria-hidden="true"
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="text-[var(--color-text-muted)] text-[10px] font-mono tabular-nums">
            —
          </span>
        ))}
      </div>

      {/* Time scale — bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-16 h-8 border-t border-[var(--color-border)] flex items-center justify-around px-4"
        aria-hidden="true"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="text-[var(--color-text-muted)] text-[10px] font-mono">
            —
          </span>
        ))}
      </div>
    </main>
  )
}

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

export default function DashboardShell() {
  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)] overflow-hidden">
      <DashboardHeader />
      <MobileBanner />
      <div className="flex flex-1 min-h-0">
        <LeftToolbar />
        <ChartAreaPlaceholder />
        <RightPanel />
      </div>
    </div>
  )
}
