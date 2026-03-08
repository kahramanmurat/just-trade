// Indicator calculation functions for chart overlays.
// All functions take close prices and return arrays of the same length (with NaN for insufficient data).

export type IndicatorPoint = {
  time: number
  value: number
}

/**
 * Simple Moving Average.
 * Returns NaN for the first (period - 1) values.
 */
export function calcSMA(
  closes: { time: number; close: number }[],
  period: number
): IndicatorPoint[] {
  const result: IndicatorPoint[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push({ time: closes[i].time, value: NaN })
      continue
    }

    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += closes[j].close
    }
    result.push({ time: closes[i].time, value: sum / period })
  }

  return result
}

/**
 * Exponential Moving Average.
 * Uses SMA for the first period, then EMA formula.
 */
export function calcEMA(
  closes: { time: number; close: number }[],
  period: number
): IndicatorPoint[] {
  const result: IndicatorPoint[] = []
  const multiplier = 2 / (period + 1)

  let ema = NaN

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push({ time: closes[i].time, value: NaN })
      continue
    }

    if (i === period - 1) {
      // Seed with SMA
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += closes[j].close
      }
      ema = sum / period
    } else {
      ema = (closes[i].close - ema) * multiplier + ema
    }

    result.push({ time: closes[i].time, value: ema })
  }

  return result
}

/**
 * Relative Strength Index (Wilder's smoothing).
 * Returns NaN for the first `period` values.
 */
export function calcRSI(
  closes: { time: number; close: number }[],
  period: number
): IndicatorPoint[] {
  const result: IndicatorPoint[] = []

  if (closes.length < period + 1) {
    return closes.map((c) => ({ time: c.time, value: NaN }))
  }

  // First value is always NaN (no prior close to diff against)
  result.push({ time: closes[0].time, value: NaN })

  // Calculate price changes
  const changes: number[] = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i].close - closes[i - 1].close)
  }

  // Initial average gain/loss over first `period` changes
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  // Fill NaN for insufficient data (indices 1 through period-1 in closes)
  for (let i = 1; i < period; i++) {
    result.push({ time: closes[i].time, value: NaN })
  }

  // First RSI value at index `period`
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs)
  result.push({ time: closes[period].time, value: rsi })

  // Subsequent values using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] >= 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const currentRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + currentRs)
    result.push({ time: closes[i + 1].time, value: currentRsi })
  }

  return result
}
