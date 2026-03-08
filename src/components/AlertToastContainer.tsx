'use client'

import { useEffect } from 'react'
import { useAlertStore } from '@/lib/store/alertStore'

const TOAST_DURATION = 8000

function conditionLabel(condition: 'gt' | 'lt'): string {
  return condition === 'gt' ? 'crossed above' : 'crossed below'
}

export default function AlertToastContainer() {
  const toasts = useAlertStore((s) => s.toasts)
  const dismissToast = useAlertStore((s) => s.dismissToast)

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return

    const timers = toasts.map((toast) =>
      setTimeout(() => dismissToast(toast.id), TOAST_DURATION)
    )

    return () => timers.forEach(clearTimeout)
  }, [toasts, dismissToast])

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      aria-live="polite"
      aria-label="Alert notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg"
          role="alert"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[var(--color-text)] text-sm font-medium">
              Alert Triggered
            </p>
            <p className="text-[var(--color-text-secondary)] text-xs mt-0.5">
              <span className="font-mono font-medium text-[var(--color-text)]">
                {toast.symbol}
              </span>
              {' '}{conditionLabel(toast.condition)}{' '}
              <span className="font-mono">${toast.threshold.toFixed(2)}</span>
            </p>
            <p className="text-[var(--color-text-muted)] text-[10px] font-mono mt-1">
              Current: ${toast.price.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors text-lg leading-none shrink-0"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
