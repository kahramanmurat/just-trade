'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UserButton } from '@clerk/nextjs'
import {
  useChartStore,
  type Timeframe,
  type IndicatorConfig,
  type IndicatorType,
  type RightPanelTab,
} from '@/lib/store/chartStore'
import { useTickStore } from '@/lib/store/tickStore'
import { findSymbol } from '@/lib/api/symbols'
import SymbolSearchModal from '@/components/SymbolSearchModal'
import { UpgradeBadge } from '@/components/UpgradeButton'
import { useSubscriptionStore } from '@/lib/store/subscriptionStore'
import type {
  LayoutResponse,
  LayoutsListResponse,
  LayoutConfigJson,
} from '@/lib/api/types'

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

function ConnectionStatus() {
  const status = useTickStore((s) => s.status)
  const tick = useTickStore((s) => s.ticks[useChartStore.getState().symbol])

  const dotColor =
    status === 'connected'
      ? 'bg-[var(--color-up)]'
      : status === 'connecting'
        ? 'bg-yellow-500'
        : 'bg-[var(--color-text-muted)]'

  const label =
    status === 'connected'
      ? 'Live'
      : status === 'connecting'
        ? 'Connecting...'
        : 'Offline'

  return (
    <div className="flex items-center gap-1.5 px-2" aria-label={`Connection: ${label}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${status === 'connected' ? 'animate-pulse' : ''}`} />
      <span className="text-[var(--color-text-secondary)] text-[10px] font-mono hidden md:inline">
        {label}
      </span>
      {tick && status === 'connected' && (
        <span className={`text-xs font-mono font-medium ${tick.change >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>
          {tick.price.toFixed(2)}
        </span>
      )}
    </div>
  )
}

let nextRestoredId = 1

function configToIndicators(
  config: LayoutConfigJson
): IndicatorConfig[] {
  return config.indicators.map((ind) => ({
    id: `restored-${ind.type}-${Date.now()}-${nextRestoredId++}`,
    type: ind.type as IndicatorType,
    period: ind.period,
    visible: ind.visible,
    color: ind.color,
  }))
}

function LayoutsDropdown() {
  const [open, setOpen] = useState(false)
  const [layouts, setLayouts] = useState<LayoutResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const limits = useSubscriptionStore((s) => s.limits)
  const atLimit = layouts.length >= limits.maxLayouts

  const fetchLayouts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/layouts', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data: LayoutsListResponse = await res.json()
      setLayouts(data.layouts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchLayouts()
  }, [open, fetchLayouts])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowSaveForm(false)
        setError(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSave = async () => {
    if (!saveName.trim()) {
      setError('Enter a layout name')
      return
    }

    setSaving(true)
    setError(null)

    const state = useChartStore.getState()
    const config: LayoutConfigJson = {
      indicators: state.indicators.map((ind) => ({
        type: ind.type,
        period: ind.period,
        visible: ind.visible,
        color: ind.color,
      })),
      drawings: state.drawings.map((d) => ({ type: 'hline' as const, price: d.price })),
      rightPanelTab: state.rightPanelTab,
      rightPanelOpen: state.rightPanelOpen,
    }

    try {
      const res = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          symbol: state.symbol,
          timeframe: state.timeframe,
          isDefault: saveAsDefault,
          config,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to save' }))
        setError(body.error ?? `HTTP ${res.status}`)
        return
      }

      setSaveName('')
      setSaveAsDefault(false)
      setShowSaveForm(false)
      fetchLayouts()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = (layout: LayoutResponse) => {
    const store = useChartStore.getState()
    store.setSymbol(layout.symbol)
    store.setTimeframe(layout.timeframe as Timeframe)
    store.setIndicators(configToIndicators(layout.config))
    store.setDrawings(
      layout.config.drawings
        .filter((d) => d.type === 'hline')
        .map((d) => ({ price: d.price }))
    )
    store.setRightPanelTab(layout.config.rightPanelTab as RightPanelTab)
    store.setRightPanelOpen(layout.config.rightPanelOpen)
    setOpen(false)
  }

  const handleDelete = async (id: string) => {
    setLayouts((prev) => prev.filter((l) => l.id !== id))
    try {
      const res = await fetch(`/api/layouts/${id}`, { method: 'DELETE' })
      if (!res.ok) fetchLayouts()
    } catch {
      fetchLayouts()
    }
  }

  const handleSetDefault = async (id: string) => {
    setLayouts((prev) =>
      prev.map((l) => ({ ...l, isDefault: l.id === id }))
    )
    try {
      const res = await fetch(`/api/layouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })
      if (!res.ok) fetchLayouts()
    } catch {
      fetchLayouts()
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          setShowSaveForm(false)
          setError(null)
        }}
        className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] rounded transition-colors"
        aria-label="Save or load chart layout"
        aria-expanded={open}
      >
        <LayoutsIcon />
        <span>Layouts</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)] text-[10px] font-medium uppercase tracking-widest">
              Saved Layouts
            </span>
            {!atLimit && (
              <button
                onClick={() => {
                  setShowSaveForm(!showSaveForm)
                  setError(null)
                }}
                className="text-[var(--color-accent)] text-xs hover:text-[var(--color-text)] transition-colors"
                aria-label="Save current layout"
              >
                + Save
              </button>
            )}
          </div>

          {/* Save form */}
          {showSaveForm && (
            <div className="px-3 py-2 border-b border-[var(--color-border)] space-y-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Layout name..."
                maxLength={100}
                className="w-full bg-[var(--color-bg)] text-[var(--color-text)] text-xs border border-[var(--color-border)] rounded px-2 py-1.5 placeholder:text-[var(--color-text-muted)]"
                aria-label="Layout name"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                    className="w-3 h-3 rounded accent-[var(--color-accent)]"
                  />
                  <span className="text-[var(--color-text-secondary)] text-[10px]">Set as default</span>
                </label>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[var(--color-accent)] text-white text-xs px-2.5 py-1 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? '...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-1.5">
              <p className="text-[var(--color-down)] text-[10px] font-mono">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-16">
              <span className="text-[var(--color-text-muted)] text-xs font-mono">Loading...</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && layouts.length === 0 && (
            <div className="flex items-center justify-center h-16">
              <p className="text-[var(--color-text-muted)] text-xs">No saved layouts</p>
            </div>
          )}

          {/* Layout list */}
          {!loading && layouts.length > 0 && (
            <ul className="max-h-64 overflow-y-auto" role="list" aria-label="Saved layouts">
              {layouts.map((layout) => (
                <li key={layout.id}>
                  <div className="group flex items-start gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] transition-colors">
                    <button
                      onClick={() => handleLoad(layout)}
                      className="flex-1 min-w-0 text-left"
                      aria-label={`Load layout: ${layout.name}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="text-[var(--color-text)] text-xs font-medium truncate">
                          {layout.name}
                        </p>
                        {layout.isDefault && (
                          <span className="text-[10px] px-1 py-px rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium shrink-0">
                            default
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--color-text-secondary)] text-[10px] font-mono mt-0.5">
                        {layout.symbol} · {layout.timeframe}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!layout.isDefault && (
                        <button
                          onClick={() => handleSetDefault(layout.id)}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] text-[10px] transition-colors"
                          aria-label={`Set ${layout.name} as default`}
                          title="Set as default"
                        >
                          ★
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(layout.id)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-down)] text-sm leading-none transition-colors"
                        aria-label={`Delete layout ${layout.name}`}
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
      )}
    </div>
  )
}

export default function DashboardHeader() {
  const { symbol, timeframe, setTimeframe, toggleRightPanel } = useChartStore()
  const [searchOpen, setSearchOpen] = useState(false)

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // Global hotkeys: Ctrl+K or / to open symbol search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const symbolInfo = findSymbol(symbol)
  const exchangeLabel = symbolInfo?.exchange ?? ''

  return (
    <>
    <SymbolSearchModal open={searchOpen} onClose={closeSearch} />
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
        onClick={openSearch}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors shrink-0"
        aria-label={`Active symbol: ${symbol}. Click to search.`}
      >
        <span className="text-sm font-mono font-medium">{symbol}</span>
        {exchangeLabel && (
          <span className="text-[var(--color-text-secondary)] text-xs hidden md:inline">· {exchangeLabel}</span>
        )}
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

      <div className="w-px h-5 bg-[var(--color-border)] shrink-0 hidden md:block" aria-hidden="true" />

      <ConnectionStatus />

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

        <LayoutsDropdown />

        <UpgradeBadge />

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
    </>
  )
}
