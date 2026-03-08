'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useChartStore, type RightPanelTab } from '@/lib/store/chartStore'
import { SYMBOLS } from '@/lib/api/symbols'
import type { WatchlistResponse, WatchlistItemResponse } from '@/lib/api/types'

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'indicators', label: 'Indicators' },
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

function AddSymbolDropdown({
  existingSymbols,
  onAdd,
}: {
  existingSymbols: string[]
  onAdd: (symbol: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const available = SYMBOLS.filter((s) => !existingSymbols.includes(s.symbol))

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setAddError(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleAdd = async (symbol: string) => {
    setAddError(null)
    try {
      const res = await fetch('/api/watchlists/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to add' }))
        if (body.code === 'DUPLICATE') {
          setAddError('Already in watchlist')
        } else {
          setAddError(body.error ?? `HTTP ${res.status}`)
        }
        return
      }
      setOpen(false)
      onAdd(symbol)
    } catch {
      setAddError('Network error')
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          setAddError(null)
        }}
        className="text-[var(--color-accent)] text-xs hover:text-[var(--color-text)] transition-colors"
        aria-label="Add symbol to watchlist"
        aria-expanded={open}
      >
        + Add
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded shadow-lg overflow-hidden">
          {addError && (
            <div className="px-3 py-1.5 bg-[var(--color-down)]/10 border-b border-[var(--color-border)]">
              <p className="text-[var(--color-down)] text-[10px] font-mono">{addError}</p>
            </div>
          )}
          {available.length === 0 ? (
            <div className="px-3 py-3">
              <p className="text-[var(--color-text-muted)] text-xs text-center">
                All symbols added
              </p>
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto" role="listbox" aria-label="Available symbols">
              {available.map((s) => (
                <li key={s.symbol}>
                  <button
                    onClick={() => handleAdd(s.symbol)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface)] transition-colors"
                    role="option"
                    aria-selected={false}
                  >
                    <span className="text-[var(--color-text)] text-xs font-mono font-medium">
                      {s.symbol}
                    </span>
                    <span className="text-[var(--color-text-secondary)] text-[10px] truncate">
                      {s.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function WatchlistTab() {
  const { symbol: activeSymbol, setSymbol } = useChartStore()
  const [items, setItems] = useState<WatchlistItemResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWatchlist = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/watchlists', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data: WatchlistResponse = await res.json()
      setItems(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  const removeSymbol = async (symbol: string) => {
    setItems((prev) => prev.filter((item) => item.symbol !== symbol))
    try {
      const res = await fetch('/api/watchlists/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      if (!res.ok) {
        fetchWatchlist(true)
      }
    } catch {
      fetchWatchlist(true)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-[var(--color-text-secondary)] text-[10px] font-medium uppercase tracking-widest">
          Default
        </span>
        <AddSymbolDropdown
          existingSymbols={items.map((i) => i.symbol)}
          onAdd={() => fetchWatchlist(true)}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24">
          <span className="text-[var(--color-text-muted)] text-xs font-mono">Loading...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-24 px-3">
          <span className="text-[var(--color-down)] text-xs font-mono text-center">{error}</span>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex items-center justify-center h-24">
          <p className="text-[var(--color-text-muted)] text-xs">Watchlist is empty</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="flex-1 overflow-y-auto" role="list" aria-label="Watchlist items">
          {items.map(({ symbol, name }) => {
            const isActive = symbol === activeSymbol
            return (
              <li key={symbol}>
                <div
                  className={[
                    'group w-full flex items-center gap-2 px-3 py-2.5 transition-colors border-b border-[var(--color-border-subtle)]',
                    isActive
                      ? 'bg-[var(--color-accent)]/10 border-l-2 border-l-[var(--color-accent)]'
                      : 'hover:bg-[var(--color-surface-2)]',
                  ].join(' ')}
                >
                  <button
                    onClick={() => setSymbol(symbol)}
                    className="flex-1 min-w-0 text-left"
                    aria-label={`Select ${symbol} ${name}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <p className="text-[var(--color-text)] text-xs font-mono font-medium">
                      {symbol}
                    </p>
                    <p className="text-[var(--color-text-secondary)] text-[10px] truncate">
                      {name}
                    </p>
                  </button>
                  <button
                    onClick={() => removeSymbol(symbol)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-down)] transition-all text-sm leading-none shrink-0"
                    aria-label={`Remove ${symbol} from watchlist`}
                  >
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
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
