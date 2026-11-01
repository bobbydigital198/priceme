import { describe, expect, it } from 'vitest'
import { isAboveUsual, priceDifference, summariseHistory } from './stats'

describe('summariseHistory', () => {
  it('is empty with no scans', () => {
    expect(summariseHistory([])).toEqual({ count: 0 })
  })

  it('finds the last, lowest and average price', () => {
    const history = summariseHistory([
      { price: 3.15, timestamp: 300 },
      { price: 2.89, timestamp: 100 },
      { price: 3.05, timestamp: 200 },
    ])
    expect(history).toEqual({
      count: 3,
      last: { price: 3.15, timestamp: 300 },
      lowest: { price: 2.89, timestamp: 100 },
      average: 3.03,
    })
  })

  it('keeps the first time a lowest price was seen', () => {
    const history = summariseHistory([
      { price: 1.99, timestamp: 200 },
      { price: 1.99, timestamp: 100 },
    ])
    expect(history.lowest?.timestamp).toBe(100)
  })
})

describe('priceDifference', () => {
  it('gives euros and whole percent', () => {
    expect(priceDifference(3.45, 3)).toEqual({ euros: 0.45, percent: 15 })
    expect(priceDifference(2.7, 3)).toEqual({ euros: -0.3, percent: -10 })
    expect(priceDifference(3, 3)).toEqual({ euros: 0, percent: 0 })
  })
})

describe('isAboveUsual', () => {
  it('warns only when more than 10% above average', () => {
    expect(isAboveUsual(3.31, 3)).toBe(true)
    expect(isAboveUsual(3.3, 3)).toBe(false)
    expect(isAboveUsual(2.5, 3)).toBe(false)
    expect(isAboveUsual(5, undefined)).toBe(false)
  })

  it('uses a custom threshold', () => {
    expect(isAboveUsual(3.2, 3, 0.05)).toBe(true)
  })
})
