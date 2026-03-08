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
import { calcSMA, calcEMA, calcRSI } from '@/lib/chart/indicators'
import type { OhlcvCandle, OhlcvResponse } from '@/lib/api/types'

type OhlcvLegend = {
  open: string
  high: string
  low: string
  close: string
  volume: string
  up: boolean
}

// Design tokens — keep in sync with globals.css @theme
const C = {
  bg: '#0F1117',
  surface: '#1A1D29',
  border: '#2A2E39',
  textSecondary: '#787B86',
  textMuted: '#4E5261',
  up: '#26A69A',
  down: '#EF5350',
} as const

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

  // Filter out NaN values
  return points.filter((p) => !isNaN(p.value))
}

export default function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const activeToolRef = useRef<string>('select')
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const candlesRef = useRef<OhlcvCandle[]>([])

  const { symbol, timeframe, activeTool, setActiveTool, indicators } = useChartStore()
  const [legend, setLegend] = useState<OhlcvLegend | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep ref in sync so chart click handler sees current tool
  useEffect(() => {
    activeToolRef.current = activeTool

    // Eraser: remove all price lines and reset to select
    if (activeTool === 'eraser') {
      const series = seriesRef.current
      if (series) {
        for (const line of priceLinesRef.current) {
          series.removePriceLine(line)
        }
        priceLinesRef.current = []
      }
      setActiveTool('select')
    }
  }, [activeTool, setActiveTool])

  // Fetch OHLCV data from API
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

  // Create chart and load data when symbol/timeframe change
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

    // Watermark (v5 plugin API)
    const pane = chart.panes()[0]
    createTextWatermark(pane, {
      horzAlign: 'center',
      vertAlign: 'center',
      lines: [
        {
          text: symbol,
          color: C.textMuted,
          fontSize: 48,
          fontStyle: 'bold',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
      ],
    })

    // Add candlestick series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: C.up,
      downColor: C.down,
      wickUpColor: C.up,
      wickDownColor: C.down,
      borderVisible: false,
    })
    seriesRef.current = series

    // Fetch and render data
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

        // Set initial legend from last candle
        if (candles.length > 0) {
          setLegend(legendFromCandle(candles[candles.length - 1]))
        }

        // Crosshair tracking for OHLCV legend
        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.seriesData.size) {
            if (candles.length > 0) {
              setLegend(legendFromCandle(candles[candles.length - 1]))
            }
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
        })

        setLoading(false)
      })
      .catch((err) => {
        if (abortController.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load chart data')
        setLoading(false)
      })

    // Horizontal line drawing on click
    chart.subscribeClick((param) => {
      if (activeToolRef.current !== 'hline') return
      if (!param.point) return

      const price = series.coordinateToPrice(param.point.y)
      if (price === null) return

      const priceLine = series.createPriceLine({
        price,
        color: C.up,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      })
      priceLinesRef.current.push(priceLine)
    })

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        chart.resize(width, height)
      }
    })
    resizeObserver.observe(container)

    const indicatorSeries = indicatorSeriesRef.current

    return () => {
      abortController.abort()
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      priceLinesRef.current = []
      indicatorSeries.clear()
      candlesRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe])

  // Sync indicator series when indicators config or loading state changes
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || loading || candlesRef.current.length === 0) return

    const candles = candlesRef.current
    const existingSeries = indicatorSeriesRef.current

    // Determine which indicator IDs should currently have a series
    const desiredIds = new Set(
      indicators.filter((ind) => ind.visible).map((ind) => ind.id)
    )

    // Remove series for indicators that are no longer visible or removed
    for (const [id, lineSeries] of existingSeries) {
      if (!desiredIds.has(id)) {
        chart.removeSeries(lineSeries)
        existingSeries.delete(id)
      }
    }

    // Add or update series for visible indicators
    for (const ind of indicators) {
      if (!ind.visible) continue

      const points = computeIndicator(candles, ind)
      const data = points.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.value,
      }))

      const existing = existingSeries.get(ind.id)
      if (existing) {
        // Update data on existing series
        existing.setData(data)
        existing.applyOptions({ color: ind.color })
      } else {
        // Create new series
        const isRSI = ind.type === 'RSI'

        let paneIndex: number | undefined
        if (isRSI) {
          // RSI goes in a separate pane — find or create one
          const panes = chart.panes()
          if (panes.length < 2) {
            const rsiPane = chart.addPane()
            rsiPane.setStretchFactor(0.25)
            // Shrink main pane proportionally
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
          // Set RSI scale to 0-100
          lineSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.1, bottom: 0.1 },
          })
        }

        lineSeries.setData(data)
        existingSeries.set(ind.id, lineSeries)
      }
    }
  }, [indicators, loading])

  const priceColor = legend?.up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'

  return (
    <div className="relative flex-1 min-w-0 min-h-0 bg-[var(--color-bg)] overflow-hidden">
      {/* OHLCV legend overlay */}
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
                <span className="text-[var(--color-text-secondary)]">
                  {key[0].toUpperCase()}{' '}
                </span>
                <span className={priceColor}>{legend[key]}</span>
              </span>
            ))}
            <span>
              <span className="text-[var(--color-text-secondary)]">Vol </span>
              <span className="text-[var(--color-text)]">{legend.volume}</span>
            </span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="text-[var(--color-text-muted)] text-xs font-mono">Loading...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span className="text-[var(--color-down)] text-xs font-mono">{error}</span>
        </div>
      )}

      {/* Chart canvas — lightweight-charts mounts here */}
      <div
        ref={containerRef}
        className={['absolute inset-0', activeTool === 'hline' ? 'cursor-crosshair' : ''].join(
          ' '
        )}
      />
    </div>
  )
}
