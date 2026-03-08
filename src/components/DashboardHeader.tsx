'use client'

import { UserButton } from '@clerk/nextjs'
import { useChartStore, type Timeframe } from '@/lib/store/chartStore'

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M']

function IndicatorsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M1 10L4.5 6L7.5 8.5L12 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 6L3.5 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />
    </svg>
  )
}

function LayoutsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M1.5 5H11.5M5 5V11.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PanelToggleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 1.5V11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export default function DashboardHeader() {
  const { symbol, timeframe, setTimeframe, toggleRightPanel } = useChartStore()

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 z-50"
      role="banner"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 select-none mr-1" aria-label="JustTrade">
        <div className="w-6 h-6 rounded bg-[var(--color-accent)] flex items-center justify-center shrink-0">
          <span className="text-white text-[9px] font-bold font-mono leading-none tracking-tight">
            JT
          </span>
        </div>
        <span className="text-[var(--color-text)] font-semibold text-sm tracking-tight hidden sm:block">
          JustTrade
        </span>
      </div>

      <div className="w-px h-5 bg-[var(--color-border)] shrink-0" aria-hidden="true" />

      {/* Active symbol chip */}
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors shrink-0"
        aria-label={`Active symbol: ${symbol}. Click to search.`}
      >
        <span className="text-sm font-mono font-medium">{symbol}</span>
        <span className="text-[var(--color-text-secondary)] text-xs hidden md:inline">· NASDAQ</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
          className="text-[var(--color-text-secondary)]"
        >
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>

      <div className="w-px h-5 bg-[var(--color-border)] shrink-0 hidden md:block" aria-hidden="true" />

      {/* Timeframe selector */}
      <nav
        className="hidden md:flex items-center gap-px"
        aria-label="Timeframe selector"
        role="navigation"
      >
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={[
              'px-2 py-1 text-xs font-mono rounded transition-colors',
              timeframe === tf
                ? 'bg-[var(--color-accent)] text-white font-medium'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
            ].join(' ')}
            aria-pressed={timeframe === tf}
            aria-label={`Set timeframe to ${tf}`}
          >
            {tf}
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <button
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded transition-colors"
          aria-label="Open indicators picker"
        >
          <IndicatorsIcon />
          <span>Indicators</span>
        </button>

        <button
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded transition-colors"
          aria-label="Save or load chart layout"
        >
          <LayoutsIcon />
          <span>Layouts</span>
        </button>

        <div className="w-px h-5 bg-[var(--color-border)] mx-1" aria-hidden="true" />

        <button
          onClick={toggleRightPanel}
          className="hidden lg:flex items-center justify-center w-8 h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded transition-colors"
          aria-label="Toggle right panel"
        >
          <PanelToggleIcon />
        </button>

        <div className="ml-1">
          <UserButton />
        </div>
      </div>
    </header>
  )
}
