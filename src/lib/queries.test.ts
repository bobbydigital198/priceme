import { describe, expect, it } from 'vitest'
import { latestPerProduct } from './queries'

describe('latestPerProduct', () => {
  const newestFirst = [
    { id: 4, barcode: 'redbull' }, // rescanned in another shop
    { id: 3, barcode: 'water' },
    { id: 2, barcode: 'pasta' },
    { id: 1, barcode: 'redbull' },
  ]

  it('keeps only the newest scan of each product, in order', () => {
    expect(latestPerProduct(newestFirst, 100).map((s) => s.id)).toEqual([4, 3, 2])
  })

  it('stops at the limit', () => {
    expect(latestPerProduct(newestFirst, 2).map((s) => s.id)).toEqual([4, 3])
  })
})
