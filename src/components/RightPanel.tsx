'use client'

import { useChartStore, type RightPanelTab } from '@/lib/store/chartStore'

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'indicators', label: 'Indicators' },
]

// --- Placeholder data (replaced by real API in Epic 2 / Epic 5) ---

const WATCHLIST_ITEMS = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: '182.63', pct: '+0.68%', up: true },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: '248.50', pct: '-1.27%', up: false },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: '875.39', pct: '+1.44%', up: true },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: '415.26', pct: '+0.70%', up: true },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', price: '196.83', pct: '-0.47%', up: false },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: '175.12', pct: '+0.23%', up: true },
  { symbol: 'META', name: 'Meta Platforms', price: '521.60', pct: '+2.11%', up: true },
]

const ALERT_ITEMS = [
  { symbol: 'AAPL', condition: 'Price above', threshold: '$190.00', status: 'active' as const },
  { symbol: 'TSLA', condition: 'Price below', threshold: '$230.00', status: 'triggered' as const },
]

const INDICATOR_ITEMS = [
  { name: 'SMA', params: 'Length: 20, Source: close', visible: true },
  { name: 'EMA', params: 'Length: 50, Source: close', visible: true },
  { name: 'RSI', params: 'Length: 14', visible: false },
]

// --- Tab content components ---

function WatchlistTab() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-[var(--color-text-secondary)] text-[10px] font-medium uppercase tracking-widest">
          Default
        </span>
        <button
          className="text-[var(--color-accent)] text-xs hover:text-[var(--color-text)] transition-colors"
          aria-label="Create new watchlist"
        >
          + New
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto" role="list" aria-label="Watchlist items">
        {WATCHLIST_ITEMS.map(({ symbol, name, price, pct, up }) => (
          <li key={symbol}>
            <button
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors text-left border-b border-[var(--color-border-subtle)]"
              aria-label={`${symbol} ${name}: ${price}, ${pct}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text)] text-xs font-mono font-medium">{symbol}</p>
                <p className="text-[var(--color-text-secondary)] text-[10px] truncate">{name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[var(--color-text)] text-xs font-mono tabular-nums">{price}</p>
                <p
                  className={[
                    'text-[10px] font-mono tabular-nums',
                    up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]',
                  ].join(' ')}
                >
                  {pct}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AlertsTab() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-[var(--color-text-secondary)] text-[10px] font-medium uppercase tracking-widest">
          Active
        </span>
        <button
          className="text-[var(--color-accent)] text-xs hover:text-[var(--color-text)] transition-colors"
          aria-label="Create new alert"
        >
          + New
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto" role="list" aria-label="Alert items">
        {ALERT_ITEMS.map((alert, i) => (
          <li key={i}>
            <div className="flex items-start gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-2)] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text)] text-xs font-mono font-medium">
                  {alert.symbol}
                </p>
                <p className="text-[var(--color-text-secondary)] text-[10px] mt-0.5">
                  {alert.condition}
                </p>
                <p className="text-[var(--color-text)] text-[10px] font-mono">{alert.threshold}</p>
              </div>
              <span
                className={[
                  'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5',
                  alert.status === 'active'
                    ? 'bg-[var(--color-up)]/15 text-[var(--color-up)]'
                    : 'bg-[var(--color-down)]/15 text-[var(--color-down)]',
                ].join(' ')}
              >
                {alert.status}
              </span>
            </div>
          </li>
        ))}

        {ALERT_ITEMS.length === 0 && (
          <li className="flex items-center justify-center h-24" aria-live="polite">
            <p className="text-[var(--color-text-muted)] text-xs">No alerts configured</p>
          </li>
        )}
      </ul>
    </div>
  )
}

function IndicatorsTab() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-[var(--color-text-secondary)] text-[10px] font-medium uppercase tracking-widest">
          Applied
        </span>
        <button
          className="text-[var(--color-accent)] text-xs hover:text-[var(--color-text)] transition-colors"
          aria-label="Add indicator to chart"
        >
          + Add
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto" role="list" aria-label="Applied indicators">
        {INDICATOR_ITEMS.map((ind) => (
          <li key={ind.name}>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-2)] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text)] text-xs font-medium">{ind.name}</p>
                <p className="text-[var(--color-text-secondary)] text-[10px] font-mono mt-0.5 truncate">
                  {ind.params}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Visibility toggle */}
                <button
                  className={[
                    'relative w-7 h-4 rounded-full transition-colors shrink-0',
                    ind.visible ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
                  ].join(' ')}
                  role="switch"
                  aria-checked={ind.visible}
                  aria-label={`${ind.visible ? 'Hide' : 'Show'} ${ind.name}`}
                >
                  <span
                    className={[
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                      ind.visible ? 'translate-x-3.5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </button>
                {/* Settings */}
                <button
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  aria-label={`Settings for ${ind.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.3" />
                    <path
                      d="M6 1V2.5M6 9.5V11M1 6H2.5M9.5 6H11M2.4 2.4L3.45 3.45M8.55 8.55L9.6 9.6M9.6 2.4L8.55 3.45M3.45 8.55L2.4 9.6"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {/* Remove */}
                <button
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-down)] transition-colors text-sm leading-none"
                  aria-label={`Remove ${ind.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          </li>
        ))}

        {INDICATOR_ITEMS.length === 0 && (
          <li className="flex items-center justify-center h-24" aria-live="polite">
            <p className="text-[var(--color-text-muted)] text-xs">No indicators applied</p>
          </li>
        )}
      </ul>
    </div>
  )
}

// --- Main panel ---

export default function RightPanel() {
  const { rightPanelTab, setRightPanelTab, rightPanelOpen } = useChartStore()

  return (
    <aside
      className={[
        'flex-col w-[280px] shrink-0 bg-[var(--color-surface)] border-l border-[var(--color-border)]',
        rightPanelOpen ? 'hidden lg:flex' : 'hidden',
      ].join(' ')}
      aria-label="Right panel"
    >
      {/* Tab bar */}
      <div
        className="flex shrink-0 border-b border-[var(--color-border)]"
        role="tablist"
        aria-label="Right panel tabs"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={rightPanelTab === id}
            aria-controls={`tabpanel-${id}`}
            onClick={() => setRightPanelTab(id)}
            className={[
              'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
              rightPanelTab === id
                ? 'text-[var(--color-text)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        id={`tabpanel-${rightPanelTab}`}
        role="tabpanel"
        aria-label={rightPanelTab}
        className="flex-1 overflow-hidden"
      >
        {rightPanelTab === 'watchlist' && <WatchlistTab />}
        {rightPanelTab === 'alerts' && <AlertsTab />}
        {rightPanelTab === 'indicators' && <IndicatorsTab />}
      </div>
    </aside>
  )
}
