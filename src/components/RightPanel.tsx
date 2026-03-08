'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useChartStore, type RightPanelTab, type IndicatorType } from '@/lib/store/chartStore'
import { useTickStore, type PriceTick } from '@/lib/store/tickStore'
import { useAlertStore } from '@/lib/store/alertStore'
import { SYMBOLS } from '@/lib/api/symbols'
import type {
  WatchlistResponse,
  WatchlistItemResponse,
  AlertsListResponse,
  AlertResponse,
  AlertCondition,
} from '@/lib/api/types'

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'indicators', label: 'Indicators' },
]

const AVAILABLE_INDICATORS: { type: IndicatorType; label: string }[] = [
  { type: 'SMA', label: 'Simple Moving Average' },
  { type: 'EMA', label: 'Exponential Moving Average' },
  { type: 'RSI', label: 'Relative Strength Index' },
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

function WatchlistPrice({ tick }: { tick: PriceTick | undefined }) {
  if (!tick) return null

  const isUp = tick.change >= 0
  const colorClass = isUp ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
  const sign = isUp ? '+' : ''

  return (
    <div className="text-right shrink-0">
      <p className={`text-xs font-mono font-medium ${colorClass}`}>
        {tick.price.toFixed(2)}
      </p>
      <p className={`text-[10px] font-mono ${colorClass}`}>
        {sign}{tick.changePercent.toFixed(2)}%
      </p>
    </div>
  )
}

function WatchlistTab() {
  const { symbol: activeSymbol, setSymbol } = useChartStore()
  const ticks = useTickStore((s) => s.ticks)
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
                  <WatchlistPrice tick={ticks[symbol]} />
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

function CreateAlertForm({ onCreated }: { onCreated: (alert: AlertResponse) => void }) {
  const symbol = useChartStore((s) => s.symbol)
  const [condition, setCondition] = useState<AlertCondition>('gt')
  const [threshold, setThreshold] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleSubmit = async () => {
    const value = parseFloat(threshold)
    if (isNaN(value) || value <= 0) {
      setError('Enter a valid price')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, condition, threshold: value }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to create' }))
        setError(body.error ?? `HTTP ${res.status}`)
        return
      }

      const alert: AlertResponse = await res.json()
      onCreated(alert)
      setThreshold('')
      setOpen(false)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[var(--color-accent)] text-xs hover:text-[var(--color-text)] transition-colors"
        aria-label="Create new alert"
      >
        + New
      </button>
    )
  }

  return (
    <div className="px-3 py-2 border-b border-[var(--color-border)] space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[var(--color-text)] text-xs font-mono font-medium">{symbol}</span>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as AlertCondition)}
          className="bg-[var(--color-surface-2)] text-[var(--color-text)] text-xs border border-[var(--color-border)] rounded px-1.5 py-1"
          aria-label="Alert condition"
        >
          <option value="gt">above</option>
          <option value="lt">below</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Price..."
          className="flex-1 bg-[var(--color-surface-2)] text-[var(--color-text)] text-xs font-mono border border-[var(--color-border)] rounded px-2 py-1 placeholder:text-[var(--color-text-muted)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Threshold price"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[var(--color-accent)] text-white text-xs px-2.5 py-1 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? '...' : 'Set'}
        </button>
        <button
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm leading-none"
          aria-label="Cancel"
        >
          ×
        </button>
      </div>
      {error && <p className="text-[var(--color-down)] text-[10px] font-mono">{error}</p>}
    </div>
  )
}

function AlertsTab() {
  const { alerts, setAlerts, addAlert, removeAlert } = useAlertStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/alerts', { cache: 'no-store' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        const data: AlertsListResponse = await res.json()
        setAlerts(data.alerts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alerts')
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [setAlerts])

  const handleDelete = async (id: string) => {
    removeAlert(id)
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const res2 = await fetch('/api/alerts', { cache: 'no-store' })
        if (res2.ok) {
          const data: AlertsListResponse = await res2.json()
          setAlerts(data.alerts)
        }
      }
    } catch {
      // Silently fail — alert already removed from UI
    }
  }

  // Sort: active first, then triggered (by createdAt desc)
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.triggered !== b.triggered) return a.triggered ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-[var(--color-text-secondary)] text-[10px] font-medium uppercase tracking-widest">
          Alerts
        </span>
        <CreateAlertForm onCreated={addAlert} />
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

      {!loading && !error && sortedAlerts.length === 0 && (
        <div className="flex items-center justify-center h-24" aria-live="polite">
          <p className="text-[var(--color-text-muted)] text-xs">No alerts configured</p>
        </div>
      )}

      {!loading && !error && sortedAlerts.length > 0 && (
        <ul className="flex-1 overflow-y-auto" role="list" aria-label="Alert items">
          {sortedAlerts.map((alert) => (
            <li key={alert.id}>
              <div className="group flex items-start gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-2)] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--color-text)] text-xs font-mono font-medium">
                    {alert.symbol}
                  </p>
                  <p className="text-[var(--color-text-secondary)] text-[10px] mt-0.5">
                    Price {alert.condition === 'gt' ? 'above' : 'below'}
                  </p>
                  <p className="text-[var(--color-text)] text-[10px] font-mono">
                    ${alert.threshold.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span
                    className={[
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      alert.triggered
                        ? 'bg-[var(--color-down)]/15 text-[var(--color-down)]'
                        : 'bg-[var(--color-up)]/15 text-[var(--color-up)]',
                    ].join(' ')}
                  >
                    {alert.triggered ? 'triggered' : 'active'}
                  </span>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-down)] transition-all text-sm leading-none"
                    aria-label={`Delete alert for ${alert.symbol}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AddIndicatorDropdown({ onAdd }: { onAdd: (type: IndicatorType) => void }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[var(--color-accent)] text-xs hover:text-[var(--color-text)] transition-colors"
        aria-label="Add indicator to chart"
        aria-expanded={open}
      >
        + Add
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded shadow-lg overflow-hidden">
          <ul className="max-h-48 overflow-y-auto" role="listbox" aria-label="Available indicators">
            {AVAILABLE_INDICATORS.map((ind) => (
              <li key={ind.type}>
                <button
                  onClick={() => {
                    onAdd(ind.type)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface)] transition-colors"
                  role="option"
                  aria-selected={false}
                >
                  <span className="text-[var(--color-text)] text-xs font-mono font-medium">
                    {ind.type}
                  </span>
                  <span className="text-[var(--color-text-secondary)] text-[10px] truncate">
                    {ind.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function IndicatorsTab() {
  const { indicators, toggleIndicator, removeIndicator, addIndicator } = useChartStore()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-[var(--color-text-secondary)] text-[10px] font-medium uppercase tracking-widest">
          Applied
        </span>
        <AddIndicatorDropdown onAdd={addIndicator} />
      </div>

      <ul className="flex-1 overflow-y-auto" role="list" aria-label="Applied indicators">
        {indicators.map((ind) => (
          <li key={ind.id}>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-2)] transition-colors">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: ind.color }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text)] text-xs font-medium">{ind.type}</p>
                <p className="text-[var(--color-text-secondary)] text-[10px] font-mono mt-0.5 truncate">
                  Period: {ind.period}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Visibility toggle */}
                <button
                  onClick={() => toggleIndicator(ind.id)}
                  className={[
                    'relative w-7 h-4 rounded-full transition-colors shrink-0',
                    ind.visible ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
                  ].join(' ')}
                  role="switch"
                  aria-checked={ind.visible}
                  aria-label={`${ind.visible ? 'Hide' : 'Show'} ${ind.type}`}
                >
                  <span
                    className={[
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                      ind.visible ? 'translate-x-3.5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </button>
                {/* Remove */}
                <button
                  onClick={() => removeIndicator(ind.id)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-down)] transition-colors text-sm leading-none"
                  aria-label={`Remove ${ind.type}`}
                >
                  ×
                </button>
              </div>
            </div>
          </li>
        ))}

        {indicators.length === 0 && (
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
