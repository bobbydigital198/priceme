import { describe, expect, it } from 'vitest'
import { cheapestSplit, compareShops, itemCount, latestPrices, setQuantity, shopsWithPrices } from './shoppingList'

const day = 86_400_000
const scans = [
  // Milk: shop 1 used to be 1.20, now 1.10; shop 2 is 1.30.
  { barcode: 'milk', price: 1.2, timestamp: 1 * day, shopId: 1 },
  { barcode: 'milk', price: 1.1, timestamp: 5 * day, shopId: 1 },
  { barcode: 'milk', price: 1.3, timestamp: 3 * day, shopId: 2 },
  // Bread: shop 1 is 2.00, shop 2 is 1.50.
  { barcode: 'bread', price: 2, timestamp: 2 * day, shopId: 1 },
  { barcode: 'bread', price: 1.5, timestamp: 4 * day, shopId: 2 },
  // Coffee: only at shop 1.
  { barcode: 'coffee', price: 4.99, timestamp: 2 * day, shopId: 1 },
  // A shop in pounds, and a scan with no shop.
  { barcode: 'milk', price: 0.95, timestamp: 6 * day, shopId: 3, currency: 'GBP' as const },
  { barcode: 'milk', price: 0.5, timestamp: 6 * day },
]

describe('latestPrices', () => {
  it('keeps only the newest price per product per shop', () => {
    const prices = latestPrices(scans)
    expect(prices.get(1)?.get('milk')?.price).toBe(1.1)
    expect(prices.get(2)?.get('bread')?.price).toBe(1.5)
    expect(prices.has(NaN)).toBe(false)
  })
})

describe('compareShops', () => {
  it('totals each shop with quantities, complete shops first', () => {
    const items = [
      { barcode: 'milk', quantity: 2 },
      { barcode: 'bread', quantity: 1 },
    ]
    const result = compareShops(items, [1, 2], scans)
    // Shop 1: 2 x 1.10 + 2.00 = 4.20. Shop 2: 2 x 1.30 + 1.50 = 4.10.
    expect(result.map((r) => [r.shopId, r.total])).toEqual([
      [2, 4.1],
      [1, 4.2],
    ])
    expect(result[0].missing).toEqual([])
  })

  it('puts a shop missing items after the complete ones, even if cheaper', () => {
    const items = [
      { barcode: 'milk', quantity: 1 },
      { barcode: 'coffee', quantity: 1 },
    ]
    const result = compareShops(items, [1, 2], scans)
    expect(result[0]).toMatchObject({ shopId: 1, total: 6.09, missing: [] })
    expect(result[1]).toMatchObject({ shopId: 2, total: 1.3, missing: [{ barcode: 'coffee', quantity: 1 }] })
  })

  it('leaves out shops with none of the items and shops not chosen', () => {
    expect(compareShops([{ barcode: 'coffee', quantity: 1 }], [2], scans)).toEqual([])
    expect(compareShops([{ barcode: 'milk', quantity: 1 }], [2], scans).map((r) => r.shopId)).toEqual([2])
  })

  it('records the oldest price used', () => {
    const [shop1] = compareShops([{ barcode: 'milk', quantity: 1 }, { barcode: 'bread', quantity: 1 }], [1], scans)
    expect(shop1.oldest).toBe(2 * day)
  })
})

describe('cheapestSplit', () => {
  it('buys each item where it is cheapest', () => {
    const items = [
      { barcode: 'milk', quantity: 2 },
      { barcode: 'bread', quantity: 1 },
      { barcode: 'jam', quantity: 1 },
    ]
    const plan = cheapestSplit(items, [1, 2], scans)
    expect(plan.picks.map((p) => [p.item.barcode, p.shopId])).toEqual([
      ['milk', 1],
      ['bread', 2],
    ])
    expect(plan.total).toBe(3.7)
    expect(plan.missing).toEqual([{ barcode: 'jam', quantity: 1 }])
  })
})

describe('shopsWithPrices', () => {
  it('finds shops with any item, in one currency', () => {
    expect([...shopsWithPrices([{ barcode: 'coffee', quantity: 1 }], scans, 'EUR')]).toEqual([1])
    expect([...shopsWithPrices([{ barcode: 'milk', quantity: 1 }], scans, 'EUR')].sort()).toEqual([1, 2])
    expect([...shopsWithPrices([{ barcode: 'milk', quantity: 1 }], scans, 'GBP')]).toEqual([3])
  })
})

describe('setQuantity', () => {
  it('adds, changes and removes items', () => {
    let items = setQuantity([], 'milk', 1)
    items = setQuantity(items, 'bread', 2)
    items = setQuantity(items, 'milk', 3)
    expect(items).toEqual([
      { barcode: 'milk', quantity: 3 },
      { barcode: 'bread', quantity: 2 },
    ])
    expect(itemCount(items)).toBe(5)
    expect(setQuantity(items, 'milk', 0)).toEqual([{ barcode: 'bread', quantity: 2 }])
    expect(setQuantity([], 'milk', 500)).toEqual([{ barcode: 'milk', quantity: 99 }])
  })
})
