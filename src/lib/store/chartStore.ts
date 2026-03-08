// Global UI state — active symbol, timeframe, drawing tool, panel state.
// Used by: DashboardHeader, LeftToolbar, RightPanel, ChartContainer (future).

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

interface ChartStore {
  symbol: string
  timeframe: Timeframe
  activeTool: DrawingTool
  rightPanelTab: RightPanelTab
  rightPanelOpen: boolean
  setSymbol: (symbol: string) => void
  setTimeframe: (timeframe: Timeframe) => void
  setActiveTool: (tool: DrawingTool) => void
  setRightPanelTab: (tab: RightPanelTab) => void
  toggleRightPanel: () => void
}

export const useChartStore = create<ChartStore>((set) => ({
  symbol: 'AAPL',
  timeframe: '1D',
  activeTool: 'select',
  rightPanelTab: 'watchlist',
  rightPanelOpen: true,
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}))
