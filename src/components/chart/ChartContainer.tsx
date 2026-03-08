'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import {
  createChart,
  createTextWatermark,
  CandlestickSeries,
  LineSeries,
  CrosshairMode,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type IPriceLine,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useChartStore, type IndicatorConfig } from '@/lib/store/chartStore'
import { useTickStore } from '@/lib/store/tickStore'
import { getRealtimeProvider } from '@/hooks/useTickStream'
import { calcSMA, calcEMA, calcRSI } from '@/lib/chart/indicators'
import type { OhlcvCandle, OhlcvResponse } from '@/lib/api/types'

/* ---------- Types ---------- */

type OhlcvLegend = {
  open: string
  high: string
  low: string
  close: string
  volume: string
  up: boolean
}

type ContextMenuState = { x: number; y: number }
type PendingPoint = { time: number; price: number }

type OverlayItem =
  | { type: 'trendline'; x1: number; y1: number; x2: number; y2: number; idx: number }
  | { type: 'rectangle'; x: number; y: number; w: number; h: number; idx: number }
  | { type: 'text'; x: number; y: number; label: string; idx: number }

/* ---------- Constants ---------- */

const C = {
  bg: '#0F1117',
  surface: '#1A1D29',
  border: '#2A2E39',
  accent: '#2962FF',
  textSecondary: '#787B86',
  textMuted: '#4E5261',
  up: '#26A69A',
  down: '#EF5350',
} as const

const HIT_TOLERANCE_PX = 10
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 1]
const FIB_COLORS = ['#787B86', '#F57C00', '#4CAF50', '#2962FF', '#E91E63', '#787B86']

/* ---------- Helpers ---------- */

function formatPrice(v: number): string {
  return v.toFixed(2)
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toString()
}

function legendFromCandle(c: OhlcvCandle): OhlcvLegend {
  return {
    open: formatPrice(c.open),
    high: formatPrice(c.high),
    low: formatPrice(c.low),
    close: formatPrice(c.close),
    volume: formatVolume(c.volume),
    up: c.close >= c.open,
  }
}

function computeIndicator(
  candles: OhlcvCandle[],
  config: IndicatorConfig
): { time: number; value: number }[] {
  const closes = candles.map((c) => ({ time: c.time, close: c.close }))
  let points: { time: number; value: number }[]
  switch (config.type) {
    case 'SMA':
      points = calcSMA(closes, config.period)
      break
    case 'EMA':
      points = calcEMA(closes, config.period)
      break
    case 'RSI':
      points = calcRSI(closes, config.period)
      break
    default:
      return []
  }
  return points.filter((p) => !isNaN(p.value))
}

function distToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function snapToOHLC(price: number, candles: OhlcvCandle[], time: number): number {
  const candle = candles.find((c) => c.time === time)
  if (!candle) return price
  const ohlc = [candle.open, candle.high, candle.low, candle.close]
  return ohlc.reduce((closest, val) =>
    Math.abs(val - price) < Math.abs(closest - price) ? val : closest
  )
}

/* ---------- Component ---------- */

export default function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const fibLinesRef = useRef<Map<number, IPriceLine[]>>(new Map())
  const activeToolRef = useRef<string>('select')
  const magnetOnRef = useRef(false)
  const pendingPointRef = useRef<PendingPoint | null>(null)
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const candlesRef = useRef<OhlcvCandle[]>([])
  const rsiThresholdLinesRef = useRef<IPriceLine[]>([])
  const overlayItemsRef = useRef<OverlayItem[]>([])

  const {
    symbol, timeframe, activeTool, setActiveTool,
    indicators, drawings, clearDrawings, setIndicators,
    removeIndicator, magnetOn,
  } = useChartStore()
  const tick = useTickStore((s) => s.ticks[symbol])

  const [legend, setLegend] = useState<OhlcvLegend | null>(null)
  const [rsiValue, setRsiValue] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)
  const [overlayItems, setOverlayItems] = useState<OverlayItem[]>([])
  const [previewLine, setPreviewLine] = useState<{
    x1: number; y1: number; x2: number; y2: number; tool: string
  } | null>(null)

  // Keep overlay ref in sync for use in click handler
  useEffect(() => {
    overlayItemsRef.current = overlayItems
  }, [overlayItems])

  // Sync refs with store
  useEffect(() => {
    activeToolRef.current = activeTool
    magnetOnRef.current = magnetOn
    pendingPointRef.current = null
    setPreviewLine(null)

    if (activeTool === 'eraser') {
      const series = seriesRef.current
      if (series) {
        for (const line of priceLinesRef.current) series.removePriceLine(line)
        priceLinesRef.current = []
        for (const lines of fibLinesRef.current.values()) {
          for (const line of lines) series.removePriceLine(line)
        }
        fibLinesRef.current.clear()
      }
      clearDrawings()
      setActiveTool('select')
    }
  }, [activeTool, magnetOn, setActiveTool, clearDrawings])

  // Right-click context menu (DOM-level to bypass lightweight-charts)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const handler = (e: MouseEvent) => {
      e.preventDefault()
      const rect = wrapper.getBoundingClientRect()
      setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    wrapper.addEventListener('contextmenu', handler)
    return () => wrapper.removeEventListener('contextmenu', handler)
  }, [])

  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])

  // Update overlay pixel coordinates from chart coordinates
  const updateOverlayCoords = useCallback(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return

    const ts = chart.timeScale()
    const currentDrawings = useChartStore.getState().drawings
    const items: OverlayItem[] = []

    for (let i = 0; i < currentDrawings.length; i++) {
      const d = currentDrawings[i]
      if (d.type === 'trendline') {
        const x1 = ts.timeToCoordinate(d.time1 as UTCTimestamp)
        const y1 = series.priceToCoordinate(d.price1)
        const x2 = ts.timeToCoordinate(d.time2 as UTCTimestamp)
        const y2 = series.priceToCoordinate(d.price2)
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          items.push({ type: 'trendline', x1, y1, x2, y2, idx: i })
        }
      } else if (d.type === 'rectangle') {
        const x1 = ts.timeToCoordinate(d.time1 as UTCTimestamp)
        const y1 = series.priceToCoordinate(d.price1)
        const x2 = ts.timeToCoordinate(d.time2 as UTCTimestamp)
        const y2 = series.priceToCoordinate(d.price2)
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          items.push({
            type: 'rectangle',
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            w: Math.abs(x2 - x1),
            h: Math.abs(y2 - y1),
            idx: i,
          })
        }
      } else if (d.type === 'text') {
        const x = ts.timeToCoordinate(d.time as UTCTimestamp)
        const y = series.priceToCoordinate(d.price)
        if (x !== null && y !== null) {
          items.push({ type: 'text', x, y, label: d.label, idx: i })
        }
      }
    }

    setOverlayItems(items)
  }, [])

  // Fetch OHLCV data
  const fetchOhlcv = useCallback(
    async (signal: AbortSignal): Promise<OhlcvCandle[]> => {
      const params = new URLSearchParams({ symbol, timeframe })
      const res = await fetch(`/api/ohlcv?${params}`, { signal })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data: OhlcvResponse = await res.json()
      return data.candles
    },
    [symbol, timeframe]
  )

  // Create chart and load data
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const abortController = new AbortController()

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: C.bg },
        textColor: C.textSecondary,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: C.border, style: 4 },
        horzLines: { color: C.border, style: 4 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: C.textSecondary, labelBackgroundColor: C.surface },
        horzLine: { width: 1, color: C.textSecondary, labelBackgroundColor: C.surface },
      },
      rightPriceScale: {
        borderColor: C.border,
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      timeScale: {
        borderColor: C.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        minBarSpacing: 3,
      },
    })

    chartRef.current = chart

    const pane = chart.panes()[0]
    createTextWatermark(pane, {
      horzAlign: 'center',
      vertAlign: 'center',
      lines: [{
        text: symbol,
        color: C.textMuted,
        fontSize: 48,
        fontStyle: 'bold',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }],
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: C.up,
      downColor: C.down,
      wickUpColor: C.up,
      wickDownColor: C.down,
      borderVisible: false,
    })
    seriesRef.current = series

    setLoading(true)
    setError(null)

    fetchOhlcv(abortController.signal)
      .then((candles) => {
        if (abortController.signal.aborted) return

        candlesRef.current = candles

        series.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        )
        chart.timeScale().fitContent()

        if (candles.length > 0) {
          setLegend(legendFromCandle(candles[candles.length - 1]))
          const lastClose = candles[candles.length - 1].close
          const provider = getRealtimeProvider()
          if (provider) provider.seedPrices({ [symbol]: lastClose })
        }

        // Crosshair move — legend + RSI + drawing preview
        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.seriesData.size) {
            if (candles.length > 0) setLegend(legendFromCandle(candles[candles.length - 1]))
            setPreviewLine(null)
            return
          }

          const bar = param.seriesData.get(series) as CandlestickData<UTCTimestamp> | undefined
          if (!bar) return

          const matched = candles.find((c) => c.time === param.time)
          const vol = matched?.volume ?? 0

          setLegend({
            open: formatPrice(bar.open),
            high: formatPrice(bar.high),
            low: formatPrice(bar.low),
            close: formatPrice(bar.close),
            volume: formatVolume(vol),
            up: bar.close >= bar.open,
          })

          // RSI value at crosshair
          const indSeries = indicatorSeriesRef.current
          const rsiIndicator = useChartStore.getState().indicators.find(
            (i) => i.type === 'RSI' && i.visible
          )
          if (rsiIndicator) {
            const rsiSeries = indSeries.get(rsiIndicator.id)
            if (rsiSeries) {
              const rsiData = param.seriesData.get(rsiSeries) as { value?: number } | undefined
              setRsiValue(rsiData?.value ?? null)
            }
          } else {
            setRsiValue(null)
          }

          // Preview line for 2-click tools
          const pending = pendingPointRef.current
          if (pending && param.point) {
            const tool = activeToolRef.current
            const ts = chart.timeScale()
            const px = ts.timeToCoordinate(pending.time as UTCTimestamp)
            const py = series.priceToCoordinate(pending.price)
            if (px !== null && py !== null) {
              setPreviewLine({ x1: px, y1: py, x2: param.point.x, y2: param.point.y, tool })
            }
          } else {
            setPreviewLine(null)
          }
        })

        // Update overlay when chart scrolls/zooms
        chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
          updateOverlayCoords()
        })

        setLoading(false)
      })
      .catch((err) => {
        if (abortController.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load chart data')
        setLoading(false)
      })

    // Chart click handler — all drawing tools
    chart.subscribeClick((param) => {
      const tool = activeToolRef.current
      if (!param.point) return

      setCtxMenu(null)

      if (tool === 'magnet' || tool === 'eraser') return

      const price = series.coordinateToPrice(param.point.y)
      if (price === null) return
      const time = param.time as number | undefined

      // Magnet snap
      const useMagnet = magnetOnRef.current
      const finalPrice = (useMagnet && time)
        ? snapToOHLC(price, candlesRef.current, time)
        : price

      switch (tool) {
        case 'hline': {
          const priceLine = series.createPriceLine({
            price: finalPrice,
            color: C.up,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: '',
          })
          priceLinesRef.current.push(priceLine)
          useChartStore.getState().addDrawing({ type: 'hline', price: finalPrice })
          break
        }

        case 'trendline':
        case 'rectangle': {
          if (!time) break
          const pending = pendingPointRef.current
          if (!pending) {
            pendingPointRef.current = { time, price: finalPrice }
          } else {
            useChartStore.getState().addDrawing({
              type: tool,
              time1: pending.time,
              price1: pending.price,
              time2: time,
              price2: finalPrice,
            })
            pendingPointRef.current = null
            setPreviewLine(null)
            useChartStore.getState().setActiveTool('select')
            // Update overlay immediately
            requestAnimationFrame(() => updateOverlayCoords())
          }
          break
        }

        case 'fibonacci': {
          const pending = pendingPointRef.current
          if (!pending) {
            pendingPointRef.current = { time: time ?? 0, price: finalPrice }
          } else {
            const high = Math.max(pending.price, finalPrice)
            const low = Math.min(pending.price, finalPrice)
            const range = high - low

            // Create fib price lines
            const fibLines: IPriceLine[] = []
            for (let j = 0; j < FIB_LEVELS.length; j++) {
              const fibPrice = high - range * FIB_LEVELS[j]
              const line = series.createPriceLine({
                price: fibPrice,
                color: FIB_COLORS[j],
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                axisLabelVisible: true,
                title: `${(FIB_LEVELS[j] * 100).toFixed(1)}%`,
              })
              fibLines.push(line)
            }

            const store = useChartStore.getState()
            store.addDrawing({ type: 'fibonacci', price1: pending.price, price2: finalPrice })
            fibLinesRef.current.set(store.drawings.length, fibLines)

            pendingPointRef.current = null
            setPreviewLine(null)
            useChartStore.getState().setActiveTool('select')
          }
          break
        }

        case 'text': {
          if (!time) break
          const label = window.prompt('Enter text label:')
          if (label) {
            useChartStore.getState().addDrawing({
              type: 'text',
              time,
              price: finalPrice,
              label,
            })
            requestAnimationFrame(() => updateOverlayCoords())
          }
          useChartStore.getState().setActiveTool('select')
          break
        }

        case 'select': {
          // Click near a drawing to remove it
          const items = overlayItemsRef.current
          let closestIdx = -1
          let closestDist = Infinity

          // Check hline price lines
          const hlineDrawings = useChartStore.getState().drawings
          for (let i = 0; i < priceLinesRef.current.length; i++) {
            const linePrice = priceLinesRef.current[i].options().price
            const lineY = series.priceToCoordinate(linePrice)
            if (lineY === null) continue
            const dist = Math.abs(param.point.y - lineY)
            if (dist < closestDist) {
              closestDist = dist
              // Find the actual drawing index for this hline
              let hlineCount = 0
              for (let di = 0; di < hlineDrawings.length; di++) {
                if (hlineDrawings[di].type === 'hline') {
                  if (hlineCount === i) {
                    closestIdx = di
                    break
                  }
                  hlineCount++
                }
              }
            }
          }

          // Check fib price lines
          for (const [drawIdx, fibLines] of fibLinesRef.current) {
            for (const fLine of fibLines) {
              const lineY = series.priceToCoordinate(fLine.options().price)
              if (lineY === null) continue
              const dist = Math.abs(param.point.y - lineY)
              if (dist < closestDist) {
                closestDist = dist
                closestIdx = drawIdx
              }
            }
          }

          // Check SVG overlay items (trendlines, rectangles, text)
          for (const item of items) {
            let dist = Infinity
            if (item.type === 'trendline') {
              dist = distToSegment(param.point.x, param.point.y, item.x1, item.y1, item.x2, item.y2)
            } else if (item.type === 'rectangle') {
              // Distance to nearest edge
              const cx = Math.max(item.x, Math.min(param.point.x, item.x + item.w))
              const cy = Math.max(item.y, Math.min(param.point.y, item.y + item.h))
              dist = Math.hypot(param.point.x - cx, param.point.y - cy)
              // If inside, distance is 0
              if (
                param.point.x >= item.x && param.point.x <= item.x + item.w &&
                param.point.y >= item.y && param.point.y <= item.y + item.h
              ) {
                dist = 0
              }
            } else if (item.type === 'text') {
              dist = Math.hypot(param.point.x - item.x, param.point.y - item.y)
            }
            if (dist < closestDist) {
              closestDist = dist
              closestIdx = item.idx
            }
          }

          if (closestIdx >= 0 && closestDist <= HIT_TOLERANCE_PX) {
            const drawing = hlineDrawings[closestIdx]

            // Clean up visual elements
            if (drawing?.type === 'hline') {
              // Find the hline priceLine index
              let hlineIdx = 0
              for (let di = 0; di < closestIdx; di++) {
                if (hlineDrawings[di].type === 'hline') hlineIdx++
              }
              if (priceLinesRef.current[hlineIdx]) {
                series.removePriceLine(priceLinesRef.current[hlineIdx])
                priceLinesRef.current.splice(hlineIdx, 1)
              }
            } else if (drawing?.type === 'fibonacci') {
              const fibLines = fibLinesRef.current.get(closestIdx)
              if (fibLines) {
                for (const line of fibLines) series.removePriceLine(line)
                fibLinesRef.current.delete(closestIdx)
              }
            }

            useChartStore.getState().removeDrawing(closestIdx)
            requestAnimationFrame(() => updateOverlayCoords())
          }
          break
        }
      }
    })

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        chart.resize(width, height)
      }
      updateOverlayCoords()
    })
    resizeObserver.observe(container)

    const indicatorSeries = indicatorSeriesRef.current
    const fibLines = fibLinesRef.current

    return () => {
      abortController.abort()
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      priceLinesRef.current = []
      fibLines.clear()
      rsiThresholdLinesRef.current = []
      indicatorSeries.clear()
      candlesRef.current = []
      setOverlayItems([])
      setPreviewLine(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe])

  // Restore drawings from store (saved layouts)
  const prevDrawingsLenRef = useRef(0)
  useEffect(() => {
    const series = seriesRef.current
    if (!series || loading) return

    if (drawings.length > 0 && priceLinesRef.current.length === 0 && prevDrawingsLenRef.current === 0) {
      for (const d of drawings) {
        if (d.type === 'hline') {
          const priceLine = series.createPriceLine({
            price: d.price,
            color: C.up,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: '',
          })
          priceLinesRef.current.push(priceLine)
        } else if (d.type === 'fibonacci') {
          const high = Math.max(d.price1, d.price2)
          const low = Math.min(d.price1, d.price2)
          const range = high - low
          const fibLines: IPriceLine[] = []
          for (let j = 0; j < FIB_LEVELS.length; j++) {
            const fibPrice = high - range * FIB_LEVELS[j]
            const line = series.createPriceLine({
              price: fibPrice,
              color: FIB_COLORS[j],
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: `${(FIB_LEVELS[j] * 100).toFixed(1)}%`,
            })
            fibLines.push(line)
          }
          fibLinesRef.current.set(drawings.indexOf(d), fibLines)
        }
      }
      requestAnimationFrame(() => updateOverlayCoords())
    }
    prevDrawingsLenRef.current = drawings.length
  }, [drawings, loading, updateOverlayCoords])

  // Sync indicator series
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || loading || candlesRef.current.length === 0) return

    const candles = candlesRef.current
    const existingSeries = indicatorSeriesRef.current

    const desiredIds = new Set(
      indicators.filter((ind) => ind.visible).map((ind) => ind.id)
    )

    for (const [id, lineSeries] of existingSeries) {
      if (!desiredIds.has(id)) {
        chart.removeSeries(lineSeries)
        existingSeries.delete(id)
      }
    }

    const hasVisibleRSI = indicators.some((i) => i.type === 'RSI' && i.visible)
    if (!hasVisibleRSI) {
      rsiThresholdLinesRef.current = []
      const panes = chart.panes()
      if (panes.length > 1) {
        chart.removePane(panes.length - 1)
      }
      setRsiValue(null)
    }

    for (const ind of indicators) {
      if (!ind.visible) continue

      const points = computeIndicator(candles, ind)
      const data = points.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
      }))

      const existing = existingSeries.get(ind.id)
      if (existing) {
        existing.setData(data)
        existing.applyOptions({ color: ind.color })
      } else {
        const isRSI = ind.type === 'RSI'

        let paneIndex: number | undefined
        if (isRSI) {
          const panes = chart.panes()
          if (panes.length < 2) {
            const rsiPane = chart.addPane()
            rsiPane.setStretchFactor(0.25)
            panes[0].setStretchFactor(0.75)
          }
          paneIndex = chart.panes().length - 1
        }

        const lineSeries = chart.addSeries(LineSeries, {
          color: ind.color,
          lineWidth: 1,
          priceScaleId: isRSI ? 'rsi' : undefined,
          lastValueVisible: false,
          priceLineVisible: false,
        }, paneIndex)

        if (isRSI) {
          lineSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.1, bottom: 0.1 },
          })
          rsiThresholdLinesRef.current = []
          for (const t of [
            { price: 70, color: C.down, title: '70' },
            { price: 50, color: C.textMuted, title: '50' },
            { price: 30, color: C.up, title: '30' },
          ]) {
            const tLine = lineSeries.createPriceLine({
              price: t.price,
              color: t.color,
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: false,
              title: t.title,
            })
            rsiThresholdLinesRef.current.push(tLine)
          }
          if (data.length > 0) setRsiValue(data[data.length - 1].value)
        }

        lineSeries.setData(data)
        existingSeries.set(ind.id, lineSeries)
      }
    }
  }, [indicators, loading])

  // Live tick update
  useEffect(() => {
    if (!tick || loading) return
    const series = seriesRef.current
    const candles = candlesRef.current
    if (!series || candles.length === 0) return

    const lastCandle = candles[candles.length - 1]
    const price = tick.price
    const updated: OhlcvCandle = {
      ...lastCandle,
      close: price,
      high: Math.max(lastCandle.high, price),
      low: Math.min(lastCandle.low, price),
    }
    candles[candles.length - 1] = updated

    series.update({
      time: updated.time as UTCTimestamp,
      open: updated.open,
      high: updated.high,
      low: updated.low,
      close: updated.close,
    })
    setLegend(legendFromCandle(updated))
  }, [tick, loading])

  // --- Context menu actions ---

  const handleResetChart = useCallback(() => {
    const series = seriesRef.current
    if (series) {
      for (const line of priceLinesRef.current) series.removePriceLine(line)
      priceLinesRef.current = []
      for (const lines of fibLinesRef.current.values()) {
        for (const line of lines) series.removePriceLine(line)
      }
      fibLinesRef.current.clear()
    }
    clearDrawings()

    const chart = chartRef.current
    if (chart) {
      for (const [, lineSeries] of indicatorSeriesRef.current) {
        chart.removeSeries(lineSeries)
      }
      indicatorSeriesRef.current.clear()
      const panes = chart.panes()
      if (panes.length > 1) chart.removePane(panes.length - 1)
      rsiThresholdLinesRef.current = []
    }

    setIndicators(indicators.map((ind) => ({ ...ind, visible: false })))
    setRsiValue(null)
    setOverlayItems([])
    chart?.timeScale().fitContent()
    setCtxMenu(null)
  }, [indicators, clearDrawings, setIndicators])

  const handleRemoveAllDrawings = useCallback(() => {
    const series = seriesRef.current
    if (series) {
      for (const line of priceLinesRef.current) series.removePriceLine(line)
      priceLinesRef.current = []
      for (const lines of fibLinesRef.current.values()) {
        for (const line of lines) series.removePriceLine(line)
      }
      fibLinesRef.current.clear()
    }
    clearDrawings()
    setOverlayItems([])
    setCtxMenu(null)
  }, [clearDrawings])

  const handleRemoveIndicator = useCallback((id: string) => {
    const chart = chartRef.current
    const lineSeries = indicatorSeriesRef.current.get(id)
    if (chart && lineSeries) {
      chart.removeSeries(lineSeries)
      indicatorSeriesRef.current.delete(id)
    }
    const ind = indicators.find((i) => i.id === id)
    if (ind?.type === 'RSI' && chart) {
      const panes = chart.panes()
      if (panes.length > 1) chart.removePane(panes.length - 1)
      rsiThresholdLinesRef.current = []
      setRsiValue(null)
    }
    removeIndicator(id)
    setCtxMenu(null)
  }, [indicators, removeIndicator])

  // --- Render ---

  const priceColor = legend?.up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
  const rsiColor = rsiValue !== null
    ? rsiValue >= 70 ? 'text-[var(--color-down)]'
      : rsiValue <= 30 ? 'text-[var(--color-up)]'
        : 'text-[var(--color-text-secondary)]'
    : ''

  const hasVisibleRSI = indicators.some((i) => i.type === 'RSI' && i.visible)
  const visibleIndicators = indicators.filter((i) => i.visible)
  const hasDrawings = drawings.length > 0

  const cursorClass =
    activeTool === 'hline' || activeTool === 'trendline' ||
    activeTool === 'fibonacci' || activeTool === 'rectangle'
      ? 'cursor-crosshair'
      : activeTool === 'text'
        ? 'cursor-text'
        : ''

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 min-w-0 min-h-0 bg-[var(--color-bg)] overflow-hidden"
    >
      {/* OHLCV legend */}
      <div
        className="absolute top-2 left-3 z-10 flex items-center gap-3 pointer-events-none select-none"
        aria-label="OHLCV legend"
      >
        <span className="text-[var(--color-text)] text-xs font-mono font-semibold">
          {symbol} · {timeframe}
        </span>
        {legend && (
          <div className="flex items-center gap-2 text-[11px] font-mono leading-none">
            {(['open', 'high', 'low', 'close'] as const).map((key) => (
              <span key={key}>
                <span className="text-[var(--color-text-secondary)]">{key[0].toUpperCase()} </span>
                <span className={priceColor}>{legend[key]}</span>
              </span>
            ))}
            <span>
              <span className="text-[var(--color-text-secondary)]">Vol </span>
              <span className="text-[var(--color-text)]">{legend.volume}</span>
            </span>
            {hasVisibleRSI && rsiValue !== null && (
              <span>
                <span className="text-[var(--color-text-secondary)]">RSI </span>
                <span className={rsiColor}>{rsiValue.toFixed(1)}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="text-[var(--color-text-muted)] text-xs font-mono">Loading...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="text-[var(--color-down)] text-xs font-mono">{error}</span>
        </div>
      )}

      {/* Chart canvas */}
      <div
        ref={containerRef}
        className={['absolute inset-0', cursorClass].join(' ')}
      />

      {/* SVG overlay for trendlines, rectangles, and preview */}
      {(overlayItems.length > 0 || previewLine) && (
        <svg className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
          {/* Preview line */}
          {previewLine && (
            previewLine.tool === 'rectangle' ? (
              <rect
                x={Math.min(previewLine.x1, previewLine.x2)}
                y={Math.min(previewLine.y1, previewLine.y2)}
                width={Math.abs(previewLine.x2 - previewLine.x1)}
                height={Math.abs(previewLine.y2 - previewLine.y1)}
                fill={C.accent}
                fillOpacity={0.1}
                stroke={C.accent}
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            ) : (
              <line
                x1={previewLine.x1}
                y1={previewLine.y1}
                x2={previewLine.x2}
                y2={previewLine.y2}
                stroke={C.accent}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                opacity={0.7}
              />
            )
          )}

          {/* Committed drawings */}
          {overlayItems.map((item) => {
            if (item.type === 'trendline') {
              return (
                <line
                  key={`tl-${item.idx}`}
                  x1={item.x1}
                  y1={item.y1}
                  x2={item.x2}
                  y2={item.y2}
                  stroke={C.accent}
                  strokeWidth={1.5}
                />
              )
            }
            if (item.type === 'rectangle') {
              return (
                <rect
                  key={`rc-${item.idx}`}
                  x={item.x}
                  y={item.y}
                  width={item.w}
                  height={item.h}
                  fill={C.accent}
                  fillOpacity={0.08}
                  stroke={C.accent}
                  strokeWidth={1}
                />
              )
            }
            return null
          })}
        </svg>
      )}

      {/* Text label overlays */}
      {overlayItems.filter((i): i is Extract<OverlayItem, { type: 'text' }> => i.type === 'text').map((item) => (
        <div
          key={`txt-${item.idx}`}
          className="absolute z-10 pointer-events-none text-[var(--color-text)] text-[11px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 shadow"
          style={{ left: item.x, top: item.y, transform: 'translate(-50%, -100%)' }}
        >
          {item.label}
        </div>
      ))}

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={closeCtxMenu}
            onContextMenu={(e) => { e.preventDefault(); closeCtxMenu() }}
          />
          <div
            className="absolute z-40 min-w-[180px] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded shadow-xl py-1"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={handleResetChart}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors text-left"
            >
              <span className="text-[var(--color-text-secondary)] w-3 text-center">↺</span>
              Reset Chart
            </button>

            {hasDrawings && (
              <button
                onClick={handleRemoveAllDrawings}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors text-left"
              >
                <span className="text-[var(--color-down)] w-3 text-center">×</span>
                Remove All Drawings
              </button>
            )}

            {visibleIndicators.length > 0 && (
              <>
                <div className="h-px bg-[var(--color-border)] my-1" />
                <div className="px-3 py-1">
                  <span className="text-[var(--color-text-muted)] text-[9px] font-medium uppercase tracking-widest">
                    Indicators
                  </span>
                </div>
                {visibleIndicators.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => handleRemoveIndicator(ind.id)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors text-left"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ind.color }}
                    />
                    <span className="flex-1">Remove {ind.type}({ind.period})</span>
                    <span className="text-[var(--color-down)]">×</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
