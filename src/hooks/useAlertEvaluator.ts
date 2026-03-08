// Client-side alert evaluator.
// Watches tick store and evaluates active alerts against current prices.
// Triggers once per alert, then marks as triggered via API.

'use client'

import { useEffect, useRef } from 'react'
import { useTickStore } from '@/lib/store/tickStore'
import { useAlertStore } from '@/lib/store/alertStore'

export function useAlertEvaluator() {
  const ticks = useTickStore((s) => s.ticks)
  const alerts = useAlertStore((s) => s.alerts)
  const markTriggered = useAlertStore((s) => s.markTriggered)
  const addToast = useAlertStore((s) => s.addToast)

  // Track which alerts we've already fired to prevent duplicate triggers
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const alert of alerts) {
      // Skip inactive, already triggered, or already fired alerts
      if (!alert.isActive || alert.triggered || firedRef.current.has(alert.id)) {
        continue
      }

      const tick = ticks[alert.symbol]
      if (!tick) continue

      let shouldTrigger = false
      if (alert.condition === 'gt' && tick.price > alert.threshold) {
        shouldTrigger = true
      } else if (alert.condition === 'lt' && tick.price < alert.threshold) {
        shouldTrigger = true
      }

      if (shouldTrigger) {
        // Mark as fired immediately to prevent re-evaluation
        firedRef.current.add(alert.id)

        const now = new Date().toISOString()

        // Update local state immediately
        markTriggered(alert.id, now)

        // Add toast notification
        addToast({
          id: `toast-${alert.id}-${Date.now()}`,
          alertId: alert.id,
          symbol: alert.symbol,
          condition: alert.condition,
          threshold: alert.threshold,
          price: tick.price,
          timestamp: Date.now(),
        })

        // Persist to DB (fire-and-forget — state already updated locally)
        fetch(`/api/alerts/${alert.id}`, { method: 'PATCH' }).catch(() => {
          // If API fails, alert is still shown as triggered locally.
          // On next page load it will re-evaluate if DB wasn't updated.
        })
      }
    }
  }, [ticks, alerts, markTriggered, addToast])
}
