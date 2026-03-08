'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useChartStore } from '@/lib/store/chartStore'
import { searchSymbols, type SymbolInfo, type SymbolCategory } from '@/lib/api/symbols'

type SymbolSearchModalProps = {
  open: boolean
  onClose: () => void
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function SymbolSearchModal({ open, onClose }: SymbolSearchModalProps) {
  const { setSymbol } = useChartStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = searchSymbols(query)

  // Group results by category
  const grouped = useMemo(
    () =>
      results.reduce<Record<SymbolCategory, SymbolInfo[]>>(
        (acc, sym) => {
          acc[sym.category].push(sym)
          return acc
        },
        { Equities: [], Crypto: [] }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query]
  )

  // Flat list for keyboard navigation
  const flatResults = useMemo(
    () => [...grouped.Equities, ...grouped.Crypto],
    [grouped]
  )

  const selectSymbol = useCallback(
    (sym: SymbolInfo) => {
      setSymbol(sym.symbol)
      setQuery('')
      setActiveIndex(0)
      onClose()
    },
    [setSymbol, onClose]
  )

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // Focus input after a tick to allow the modal to render
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatResults[activeIndex]) {
            selectSymbol(flatResults[activeIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, activeIndex, flatResults, selectSymbol, onClose])

  // Keep active item scrolled into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const active = list.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Focus trap — keep Tab/Shift+Tab within the modal
  const modalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const modal = modalRef.current
    if (!modal) return

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = modal!.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [open])

  // Clamp activeIndex when results change
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(flatResults.length - 1, 0)))
  }, [flatResults.length])

  if (!open) return null

  // Track index across grouped rendering
  let runningIndex = 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-[201] flex items-start justify-center pt-[15vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Symbol search"
      >
        <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)] shrink-0">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol or name..."
              className="flex-1 bg-transparent text-[var(--color-text)] text-sm font-mono placeholder:text-[var(--color-text-muted)] outline-none"
              aria-label="Search symbols"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-block text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1.5 py-0.5 font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[300px] overflow-y-auto" role="listbox">
            {flatResults.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <p className="text-[var(--color-text-muted)] text-xs">No symbols match &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {(['Equities', 'Crypto'] as SymbolCategory[]).map((category) => {
              const items = grouped[category]
              if (items.length === 0) return null

              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-4 py-1.5 bg-[var(--color-bg)]">
                    <span className="text-[var(--color-text-muted)] text-[10px] font-medium uppercase tracking-widest">
                      {category}
                    </span>
                  </div>

                  {/* Symbol rows */}
                  {items.map((sym) => {
                    const idx = runningIndex++
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={sym.symbol}
                        role="option"
                        aria-selected={isActive}
                        data-active={isActive}
                        onClick={() => selectSymbol(sym)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={[
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isActive
                            ? 'bg-[var(--color-surface-2)]'
                            : 'hover:bg-[var(--color-surface-2)]',
                        ].join(' ')}
                      >
                        <span className="text-[var(--color-text)] text-sm font-mono font-medium w-16 shrink-0">
                          {sym.symbol}
                        </span>
                        <span className="text-[var(--color-text-secondary)] text-xs truncate flex-1">
                          {sym.name}
                        </span>
                        <span className="text-[var(--color-text-muted)] text-[10px] font-mono shrink-0">
                          {sym.exchange}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
            <span className="text-[var(--color-text-muted)] text-[10px] flex items-center gap-1">
              <kbd className="border border-[var(--color-border)] rounded px-1 py-px font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="text-[var(--color-text-muted)] text-[10px] flex items-center gap-1">
              <kbd className="border border-[var(--color-border)] rounded px-1 py-px font-mono">↵</kbd>
              select
            </span>
            <span className="text-[var(--color-text-muted)] text-[10px] flex items-center gap-1">
              <kbd className="border border-[var(--color-border)] rounded px-1 py-px font-mono">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
