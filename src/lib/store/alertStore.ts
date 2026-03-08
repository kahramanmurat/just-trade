// Alert store — holds fetched alerts and manages triggered-alert toasts.
// Fed by AlertsTab fetch; consumed by AlertsTab UI and useAlertEvaluator hook.

import { create } from 'zustand'
import type { AlertResponse } from '@/lib/api/types'

export type AlertToast = {
  id: string
  alertId: string
  symbol: string
  condition: 'gt' | 'lt'
  threshold: number
  price: number
  timestamp: number
}

interface AlertStore {
  alerts: AlertResponse[]
  toasts: AlertToast[]
  setAlerts: (alerts: AlertResponse[]) => void
  addAlert: (alert: AlertResponse) => void
  removeAlert: (id: string) => void
  markTriggered: (id: string, triggeredAt: string) => void
  addToast: (toast: AlertToast) => void
  dismissToast: (id: string) => void
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  toasts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((state) => ({ alerts: [alert, ...state.alerts] })),
  removeAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  markTriggered: (id, triggeredAt) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id
          ? { ...a, triggered: true, isActive: false, triggeredAt }
          : a
      ),
    })),
  addToast: (toast) =>
    set((state) => ({ toasts: [...state.toasts, toast] })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
