// Finds where the selling price is on a tag, without relying on Tesseract's layout analysis
// (which often skips the big price next to QR codes, barcodes or dark promo boxes).
// The price is nearly always the biggest text, so we look for the tallest character-shaped marks.
import type { GrayImage } from './imageProcessing'

export type Box = { x0: number; y0: number; x1: number; y1: number; pixels: number }
export type Region = { left: number; top: number; width: number; height: number }
// The big digits, and the space to their right where small cents and the euro sign usually sit.
export type PriceRegion = { digits: Region; beside: Region }

// Groups touching black pixels into separate marks (letters, digits, bars, blobs).
export function findMarks(image: GrayImage): Box[] {
  const { pixels, width, height } = image
  const seen = new Uint8Array(pixels.length)
  const stack = new Int32Array(pixels.length)
  const marks: Box[] = []

  for (let start = 0; start < pixels.length; start++) {
    if (pixels[start] !== 0 || seen[start]) continue
    let top = 0
    stack[top++] = start
    seen[start] = 1
    let x0 = width
    let y0 = height
    let x1 = 0
    let y1 = 0
    let count = 0

    while (top) {
      const i = stack[--top]
      const x = i % width
      const y = (i - x) / width
      count++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]
      for (const n of neighbours) {
        if (n >= 0 && !seen[n] && pixels[n] === 0) {
          seen[n] = 1
          stack[top++] = n
        }
      }
    }
    marks.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, pixels: count })
  }
  return marks
}

const heightOf = (b: Box) => b.y1 - b.y0
const widthOf = (b: Box) => b.x1 - b.x0

// Digit-like: not tiny, not a thin barcode bar, not a filled box or blob.
function looksLikeCharacter(b: Box, imageHeight: number): boolean {
  const h = heightOf(b)
  const aspect = widthOf(b) / h
  const fill = b.pixels / (widthOf(b) * h)
  return h >= imageHeight * 0.1 && h <= imageHeight * 0.9 && aspect >= 0.15 && aspect <= 1.3 && fill >= 0.15 && fill <= 0.8
}

// Up to `max` areas likely to hold the selling price, biggest text first.
export function findPriceRegions(image: GrayImage, max = 2): PriceRegion[] {
  const characters = findMarks(image).filter((b) => looksLikeCharacter(b, image.height))
  characters.sort((a, b) => heightOf(b) - heightOf(a))
  const regions: PriceRegion[] = []
  const used = new Set<Box>()

  for (const tallest of characters) {
    if (regions.length >= max) break
    if (used.has(tallest)) continue
    const h = heightOf(tallest)
    const group = { x0: tallest.x0, y0: tallest.y0, x1: tallest.x1, y1: tallest.y1 }
    used.add(tallest)

    // Join neighbouring digits of a similar size on the same line, e.g. "12" or "1,79".
    for (let grew = true; grew; ) {
      grew = false
      for (const c of characters) {
        if (used.has(c) || heightOf(c) < h * 0.6) continue
        const overlap = Math.min(group.y1, c.y1) - Math.max(group.y0, c.y0)
        const gap = c.x0 >= group.x1 ? c.x0 - group.x1 : group.x0 >= c.x1 ? group.x0 - c.x1 : 0
        if (overlap >= heightOf(c) * 0.5 && gap <= h * 0.5) {
          group.x0 = Math.min(group.x0, c.x0)
          group.x1 = Math.max(group.x1, c.x1)
          group.y0 = Math.min(group.y0, c.y0)
          group.y1 = Math.max(group.y1, c.y1)
          used.add(c)
          grew = true
        }
      }
    }

    const margin = Math.round(h * 0.12)
    const left = Math.max(0, group.x0 - margin)
    const top = Math.max(0, group.y0 - margin)
    const bottom = Math.min(image.height, group.y1 + margin)
    const digitsRight = Math.min(image.width, group.x1 + Math.round(margin / 2))
    const right = Math.min(image.width, Math.round(group.x1 + h * 1.3))
    regions.push({
      digits: { left, top, width: digitsRight - left, height: bottom - top },
      beside: { left: digitsRight, top, width: Math.max(0, right - digitsRight), height: bottom - top },
    })

    // Skip anything inside this region when looking for the next one.
    for (const c of characters) {
      if (c.x0 >= left && c.x1 <= right && c.y0 >= top && c.y1 <= bottom) used.add(c)
    }
  }
  return regions
}
