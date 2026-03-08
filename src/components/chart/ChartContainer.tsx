'use client'

import {
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react'
import {
  createChart,
  createTextWatermark,
  CandlestickSeries,
  CrosshairMode,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useChartStore } from '@/lib/store/chartStore'
import { generatePlaceholderData } from '@/lib/chart/generatePlaceholderData'

// OHLCV values displayed in the legend overlay
type OhlcvValues = {
  open: string
  high: string
  low: string
  close: string
  volume: string
  up: boolean
}

// Design tokens (read from CSS vars at mount time)
const CHART_COLORS = {
  bg: '#0F1117',
  surface: '#1A1D29',
  border: '#2A2E39',
  textSecondary: '#787B86',
  textMuted: '#4E5261',
  up: '#26A69A',
  down: '#EF5350',
  accent: '#2962FF',
} as const

export default function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const { symbol, timeframe } = useChartStore()
  const [ohlcv, setOhlcv] = useState<OhlcvValues | null>(null)

  // Format price with appropriate decimals
  const formatPrice = useCallback((value: number): string => {
    if (value >= 1000) return value.toFixed(2)
    if (value >= 1) return value.toFixed(2)
    return value.toFixed(4)
  }, [])

  // Format volume with K/M suffix
  const formatVolume = useCallback((vol: number): string => {
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + 'M'
    if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K'
    return vol.toString()
  }, [])

  // Create chart on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.bg },
        textColor: CHART_COLORS.textSecondary,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.border, style: 4 },
        horzLines: { color: CHART_COLORS.border, style: 4 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: CHART_COLORS.textSecondary,
          labelBackgroundColor: CHART_COLORS.surface,
        },
        horzLine: {
          width: 1,
          color: CHART_COLORS.textSecondary,
          labelBackgroundColor: CHART_COLORS.surface,
        },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        minBarSpacing: 3,
      },
    })

    chartRef.current = chart

    // Symbol watermark (v5 plugin API)
    const pane = chart.panes()[0]
    createTextWatermark(pane, {
      horzAlign: 'center',
      vertAlign: 'center',
      lines: [
        {
          text: symbol,
          color: CHART_COLORS.textMuted,
          fontSize: 48,
          fontStyle: 'bold',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
      ],
    })

    // Add candlestick series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
      borderVisible: false,
    })
    seriesRef.current = series

    // Load placeholder data
    const data = generatePlaceholderData(symbol, timeframe)
    series.setData(data)
    chart.timeScale().fitContent()

    // Set initial legend from the last bar
    if (data.length > 0) {
      const last = data[data.length - 1]
      setOhlcv({
        open: formatPrice(last.open),
        high: formatPrice(last.high),
        low: formatPrice(last.low),
        close: formatPrice(last.close),
        volume: formatVolume(last.volume),
        up: last.close >= last.open,
      })
    }

    // Subscribe to crosshair for OHLCV legend updates
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        // Reset to last bar when crosshair leaves
        if (data.length > 0) {
          const last = data[data.length - 1]
          setOhlcv({
            open: formatPrice(last.open),
            high: formatPrice(last.high),
            low: formatPrice(last.low),
            close: formatPrice(last.close),
            volume: formatVolume(last.volume),
            up: last.close >= last.open,
          })
        }
        return
      }

      const bar = param.seriesData.get(series) as
        | CandlestickData<UTCTimestamp>
        | undefined
      if (!bar) return

      // Find matching candle to get volume
      const matchedCandle = data.find((d) => d.time === param.time)
      const vol = matchedCandle?.volume ?? 0

      setOhlcv({
        open: formatPrice(bar.open),
        high: formatPrice(bar.high),
        low: formatPrice(bar.low),
        close: formatPrice(bar.close),
        volume: formatVolume(vol),
        up: bar.close >= bar.open,
      })
    })

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        chart.resize(width, height)
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // Re-create chart when symbol or timeframe changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe])

  return (
    <div className="relative flex-1 min-w-0 min-h-0 bg-[var(--color-bg)] overflow-hidden">
      {/* OHLCV legend overlay — top-left corner */}
      <div
        className="absolute top-2 left-3 z-10 flex items-center gap-3 pointer-events-none select-none"
        aria-label="OHLCV legend"
      >
        <span className="text-[var(--color-text)] text-xs font-mono font-semibold">
          {symbol} · {timeframe}
        </span>

        {ohlcv && (
          <div className="flex items-center gap-2 text-[11px] font-mono leading-none">
            <span>
              <span className="text-[var(--color-text-secondary)]">O </span>
              <span className={ohlcv.up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}>
                {ohlcv.open}
              </span>
            </span>
            <span>
              <span className="text-[var(--color-text-secondary)]">H </span>
              <span className={ohlcv.up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}>
                {ohlcv.high}
              </span>
            </span>
            <span>
              <span className="text-[var(--color-text-secondary)]">L </span>
              <span className={ohlcv.up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}>
                {ohlcv.low}
              </span>
            </span>
            <span>
              <span className="text-[var(--color-text-secondary)]">C </span>
              <span className={ohlcv.up ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}>
                {ohlcv.close}
              </span>
            </span>
            <span>
              <span className="text-[var(--color-text-secondary)]">Vol </span>
              <span className="text-[var(--color-text)]">{ohlcv.volume}</span>
            </span>
          </div>
        )}
      </div>

      {/* Chart canvas container — lightweight-charts mounts here */}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}
