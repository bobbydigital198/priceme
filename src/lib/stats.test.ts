import { describe, expect, it } from 'vitest'
import { breakdownByShop, isAboveUsual, priceDifference, shopsInFirstSeenOrder, summariseHistory, summariseProduct } from './stats'

const scans = [
  { price: 2.89, timestamp: 100, shopId: 1 },
  { price: 3.15, timestamp: 400, shopId: 2 },
  { price: 2.99, timestamp: 200, shopId: 2 },
  { price: 3.05, timestamp: 300, shopId: 1 },
  { price: 3.49, timestamp: 250 },
]

describe('summariseProduct', () => {
  it('is undefined with no scans', () => {
    expect(summariseProduct([])).toBeUndefined()
  })

  it('gives the dashboard numbers', () => {
    const summary = summariseProduct(scans)!
    expect(summary.count).toBe(5)
    expect(summary.first.timestamp).toBe(100)
    expect(summary.latest.price).toBe(3.15)
    expect(summary.lowest.price).toBe(2.89)
    expect(summary.highest.price).toBe(3.49)
    expect(summary.average).toBe(3.11)
    expect(summary.change).toEqual({ euros: 0.26, percent: 9 })
  })
})

describe('breakdownByShop', () => {
  it('groups by shop, cheapest average first', () => {
    const rows = breakdownByShop(scans)
    expect(rows.map((r) => r.shopId)).toEqual([1, 2, undefined])
    expect(rows[0]).toMatchObject({ lowest: 2.89, average: 2.97, count: 2, latest: { price: 3.05 } })
    expect(rows[1]).toMatchObject({ lowest: 2.99, average: 3.07, count: 2, latest: { price: 3.15 } })
    expect(rows[2]).toMatchObject({ count: 1, average: 3.49 })
  })
})

describe('shopsInFirstSeenOrder', () => {
  it('lists shops by first scan, including no shop', () => {
    expect(shopsInFirstSeenOrder(scans)).toEqual([1, 2, undefined])
  })
})

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
