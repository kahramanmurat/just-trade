// Global UI state — active symbol, timeframe, drawing tool, panel state, indicators.
// Used by: DashboardHeader, LeftToolbar, RightPanel, ChartContainer.

import { create } from 'zustand'

export type DrawingTool =
  | 'select'
  | 'trendline'
  | 'hline'
  | 'fibonacci'
  | 'rectangle'
  | 'text'
  | 'magnet'
  | 'eraser'

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M'
export type RightPanelTab = 'watchlist' | 'alerts' | 'indicators'

export type IndicatorType = 'SMA' | 'EMA' | 'RSI'

export type IndicatorConfig = {
  id: string
  type: IndicatorType
  period: number
  visible: boolean
  color: string
}

export type Drawing =
  | { type: 'hline'; price: number }
  | { type: 'trendline'; time1: number; price1: number; time2: number; price2: number }
  | { type: 'fibonacci'; price1: number; price2: number }
  | { type: 'rectangle'; time1: number; price1: number; time2: number; price2: number }
  | { type: 'text'; time: number; price: number; label: string }

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'sma-20', type: 'SMA', period: 20, visible: true, color: '#2962FF' },
  { id: 'ema-50', type: 'EMA', period: 50, visible: true, color: '#FF6D00' },
  { id: 'rsi-14', type: 'RSI', period: 14, visible: false, color: '#AB47BC' },
]

interface ChartStore {
  symbol: string
  timeframe: Timeframe
  activeTool: DrawingTool
  rightPanelTab: RightPanelTab
  rightPanelOpen: boolean
  indicators: IndicatorConfig[]
  drawings: Drawing[]
  magnetOn: boolean
  setSymbol: (symbol: string) => void
  setTimeframe: (timeframe: Timeframe) => void
  setActiveTool: (tool: DrawingTool) => void
  setRightPanelTab: (tab: RightPanelTab) => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  toggleIndicator: (id: string) => void
  removeIndicator: (id: string) => void
  addIndicator: (type: IndicatorType) => void
  setIndicators: (indicators: IndicatorConfig[]) => void
  addDrawing: (drawing: Drawing) => void
  removeDrawing: (index: number) => void
  clearDrawings: () => void
  setDrawings: (drawings: Drawing[]) => void
  toggleMagnet: () => void
}

let nextIndicatorId = 1

function makeIndicatorId(type: IndicatorType): string {
  return `${type.toLowerCase()}-${Date.now()}-${nextIndicatorId++}`
}

const INDICATOR_DEFAULTS: Record<IndicatorType, { period: number; color: string }> = {
  SMA: { period: 20, color: '#2962FF' },
  EMA: { period: 50, color: '#FF6D00' },
  RSI: { period: 14, color: '#AB47BC' },
}

export const useChartStore = create<ChartStore>((set) => ({
  symbol: 'AAPL',
  timeframe: '1D',
  activeTool: 'select',
  rightPanelTab: 'watchlist',
  rightPanelOpen: true,
  indicators: DEFAULT_INDICATORS,
  drawings: [],
  magnetOn: false,
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  toggleIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.map((ind) =>
        ind.id === id ? { ...ind, visible: !ind.visible } : ind
      ),
    })),
  removeIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.filter((ind) => ind.id !== id),
    })),
  addIndicator: (type) =>
    set((state) => {
      const defaults = INDICATOR_DEFAULTS[type]
      return {
        indicators: [
          ...state.indicators,
          {
            id: makeIndicatorId(type),
            type,
            period: defaults.period,
            visible: true,
            color: defaults.color,
          },
        ],
      }
    }),
  setIndicators: (indicators) => set({ indicators }),
  addDrawing: (drawing) =>
    set((state) => ({ drawings: [...state.drawings, drawing] })),
  removeDrawing: (index) =>
    set((state) => ({
      drawings: state.drawings.filter((_, i) => i !== index),
    })),
  clearDrawings: () => set({ drawings: [] }),
  setDrawings: (drawings) => set({ drawings }),
  toggleMagnet: () => set((state) => ({ magnetOn: !state.magnetOn })),
}))
