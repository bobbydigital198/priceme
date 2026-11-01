import { describe, expect, it } from 'vitest'
import type { GrayImage } from './imageProcessing'
import { findMarks, findPriceRegions } from './priceRegion'

// A white image with black rectangles drawn on it.
function draw(width: number, height: number, rects: [x: number, y: number, w: number, h: number][]): GrayImage {
  const pixels = new Uint8ClampedArray(width * height).fill(255)
  for (const [x, y, w, h] of rects) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) pixels[yy * width + xx] = 0
  }
  return { pixels, width, height }
}

// A hollow digit-shaped outline, so it's not a filled blob.
function digit(x: number, y: number, w: number, h: number, stroke = 6): [number, number, number, number][] {
  return [
    [x, y, w, stroke],
    [x, y + h - stroke, w, stroke],
    [x, y, stroke, h],
    [x + w - stroke, y, stroke, h],
  ]
}

describe('findMarks', () => {
  it('finds separate shapes', () => {
    const marks = findMarks(draw(50, 20, [[1, 1, 5, 5], [10, 1, 5, 5], [30, 2, 10, 10]]))
    expect(marks).toHaveLength(3)
    expect(marks[2]).toEqual({ x0: 30, y0: 2, x1: 40, y1: 12, pixels: 100 })
  })
})

describe('findPriceRegions', () => {
  it('picks the biggest digit and leaves room for cents on the right', () => {
    const image = draw(400, 200, [
      ...digit(20, 20, 30, 30), // small text
      ...digit(100, 40, 70, 120), // big euro digit
      ...digit(180, 40, 30, 50), // small cents
    ])
    const [{ digits, beside }] = findPriceRegions(image)
    // The big digit alone, not the cents.
    expect(digits.left).toBeLessThanOrEqual(100)
    expect(digits.top).toBeLessThanOrEqual(40)
    expect(digits.left + digits.width).toBeGreaterThanOrEqual(170)
    expect(digits.left + digits.width).toBeLessThan(180)
    expect(digits.top + digits.height).toBeGreaterThanOrEqual(160)
    // The cents, to the right.
    expect(beside.left).toBe(digits.left + digits.width)
    expect(beside.left + beside.width).toBeGreaterThanOrEqual(210)
  })

  it('joins several big digits on one line', () => {
    const image = draw(500, 200, [...digit(50, 40, 60, 100), ...digit(130, 40, 60, 100), ...digit(210, 40, 60, 100)])
    const [{ digits }] = findPriceRegions(image)
    expect(digits.left).toBeLessThanOrEqual(50)
    expect(digits.left + digits.width).toBeGreaterThanOrEqual(270)
  })

  it('ignores filled boxes and barcode bars', () => {
    const image = draw(500, 200, [
      [10, 10, 150, 150], // solid promo box
      ...Array.from({ length: 10 }, (_, i): [number, number, number, number] => [200 + i * 8, 20, 3, 150]), // barcode
      ...digit(350, 50, 40, 60), // the real digit
    ])
    const [{ digits }] = findPriceRegions(image)
    expect(digits.left).toBeGreaterThanOrEqual(300)
  })

  it('returns nothing for a blank image', () => {
    expect(findPriceRegions(draw(100, 100, []))).toEqual([])
  })
})
