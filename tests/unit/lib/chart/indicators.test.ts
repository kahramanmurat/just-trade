import { describe, it, expect } from 'vitest'
import { calcSMA, calcEMA, calcRSI } from '@/lib/chart/indicators'

// Helper: generate mock closes with sequential timestamps
function mockCloses(prices: number[]): { time: number; close: number }[] {
  return prices.map((close, i) => ({ time: 1000 + i, close }))
}

describe('calcSMA', () => {
  it('returns NaN for first (period - 1) values', () => {
    const closes = mockCloses([10, 20, 30, 40, 50])
    const result = calcSMA(closes, 3)

    expect(result[0].value).toBeNaN()
    expect(result[1].value).toBeNaN()
    expect(result[2].value).not.toBeNaN()
  })

  it('computes correct SMA values', () => {
    const closes = mockCloses([1, 2, 3, 4, 5])
    const result = calcSMA(closes, 3)

    expect(result[2].value).toBeCloseTo(2) // (1+2+3)/3
    expect(result[3].value).toBeCloseTo(3) // (2+3+4)/3
    expect(result[4].value).toBeCloseTo(4) // (3+4+5)/3
  })

  it('preserves timestamps from input', () => {
    const closes = mockCloses([10, 20, 30])
    const result = calcSMA(closes, 2)

    expect(result.map((r) => r.time)).toEqual([1000, 1001, 1002])
  })

  it('returns same length as input', () => {
    const closes = mockCloses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const result = calcSMA(closes, 5)
    expect(result).toHaveLength(closes.length)
  })
})

describe('calcEMA', () => {
  it('returns NaN for first (period - 1) values', () => {
    const closes = mockCloses([10, 20, 30, 40, 50])
    const result = calcEMA(closes, 3)

    expect(result[0].value).toBeNaN()
    expect(result[1].value).toBeNaN()
    expect(result[2].value).not.toBeNaN()
  })

  it('seeds first EMA value with SMA', () => {
    const closes = mockCloses([10, 20, 30, 40, 50])
    const result = calcEMA(closes, 3)

    // First EMA = SMA of [10, 20, 30] = 20
    expect(result[2].value).toBeCloseTo(20)
  })

  it('applies EMA formula after seed', () => {
    const closes = mockCloses([10, 20, 30, 40])
    const result = calcEMA(closes, 3)

    // multiplier = 2 / (3 + 1) = 0.5
    // EMA[2] = 20 (SMA seed)
    // EMA[3] = (40 - 20) * 0.5 + 20 = 30
    expect(result[3].value).toBeCloseTo(30)
  })

  it('returns same length as input', () => {
    const closes = mockCloses([1, 2, 3, 4, 5, 6, 7])
    const result = calcEMA(closes, 3)
    expect(result).toHaveLength(closes.length)
  })
})

describe('calcRSI', () => {
  it('returns all NaN if insufficient data', () => {
    const closes = mockCloses([10, 20, 30]) // only 3, need period+1
    const result = calcRSI(closes, 14)

    result.forEach((r) => expect(r.value).toBeNaN())
  })

  it('returns NaN for first `period` values', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i)
    const closes = mockCloses(prices)
    const result = calcRSI(closes, 14)

    for (let i = 0; i < 14; i++) {
      expect(result[i].value).toBeNaN()
    }
    expect(result[14].value).not.toBeNaN()
  })

  it('returns RSI near 100 for all-up prices', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i)
    const closes = mockCloses(prices)
    const result = calcRSI(closes, 14)

    // All gains, no losses → RSI should be 100
    expect(result[14].value).toBe(100)
  })

  it('returns RSI near 0 for all-down prices', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 200 - i)
    const closes = mockCloses(prices)
    const result = calcRSI(closes, 14)

    // All losses, no gains → RSI should be 0
    expect(result[14].value).toBe(0)
  })

  it('returns RSI around 50 for equal up/down moves', () => {
    // Alternating +1/-1 prices
    const prices = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 === 0 ? 0 : 1))
    const closes = mockCloses(prices)
    const result = calcRSI(closes, 14)

    const lastRsi = result[result.length - 1].value
    expect(lastRsi).toBeGreaterThan(40)
    expect(lastRsi).toBeLessThan(60)
  })

  it('returns same length as input', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 10)
    const closes = mockCloses(prices)
    const result = calcRSI(closes, 14)
    expect(result).toHaveLength(closes.length)
  })

  it('timestamps align with input closes', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i)
    const closes = mockCloses(prices)
    const result = calcRSI(closes, 14)

    // Every result should have a time matching the corresponding close
    result.forEach((r, i) => {
      expect(r.time).toBe(closes[i].time)
    })
  })

  it('values stay in 0-100 range', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.5) * 20)
    const closes = mockCloses(prices)
    const result = calcRSI(closes, 14)

    result.forEach((r) => {
      if (!isNaN(r.value)) {
        expect(r.value).toBeGreaterThanOrEqual(0)
        expect(r.value).toBeLessThanOrEqual(100)
      }
    })
  })
})
