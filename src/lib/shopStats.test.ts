import { describe, expect, it } from 'vitest'
import { cheaperHere, productsAtShop, summariseShops } from './shopStats'

const day = 86_400_000
const scans = [
  { barcode: 'redbull', price: 1.5, timestamp: 1 * day, shopId: 1 },
  { barcode: 'redbull', price: 1.4, timestamp: 3 * day, shopId: 1 },
  { barcode: 'pasta', price: 0.99, timestamp: 3 * day + 60_000, shopId: 1 },
  { barcode: 'redbull', price: 1.6, timestamp: 2 * day, shopId: 2 },
  { barcode: 'redbull', price: 1.8, timestamp: 4 * day, shopId: 2 },
  { barcode: 'water', price: 0.5, timestamp: 5 * day, shopId: 2 },
  { barcode: 'water', price: 0.4, timestamp: 6 * day },
]

describe('summariseShops', () => {
  it('counts scans, products, visit days and the last visit', () => {
    const summary = summariseShops(scans)
    expect(summary.get(1)).toEqual({ scans: 3, products: 2, visits: 2, lastVisit: 3 * day + 60_000 })
    expect(summary.get(2)).toEqual({ scans: 3, products: 2, visits: 3, lastVisit: 5 * day })
    expect(summary.size).toBe(2)
  })
})

describe('productsAtShop', () => {
  it('lists each product once with the latest price here and the average elsewhere', () => {
    const rows = productsAtShop(1, scans)
    expect(rows.map((r) => r.barcode)).toEqual(['pasta', 'redbull'])
    expect(rows[1].latestHere.price).toBe(1.4)
    expect(rows[1].averageElsewhere).toBe(1.7)
    expect(rows[0].averageElsewhere).toBeUndefined()
  })

  it('compares water with the scan that has no shop', () => {
    expect(productsAtShop(2, scans).find((r) => r.barcode === 'water')?.averageElsewhere).toBe(0.4)
  })
})

describe('cheaperHere', () => {
  it('counts products cheaper here than elsewhere', () => {
    expect(cheaperHere(productsAtShop(1, scans))).toEqual({ cheaper: 1, compared: 1 })
    expect(cheaperHere(productsAtShop(2, scans))).toEqual({ cheaper: 0, compared: 2 })
  })
})
