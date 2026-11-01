// Price history maths for the confirmation screen (and the product dashboard in stage 7).
import { PRICE_WARNING_THRESHOLD } from './constants'

type PricePoint = { price: number; timestamp: number }

export type PriceHistory<T extends PricePoint = PricePoint> = {
  count: number
  last?: T
  lowest?: T
  average?: number
}

export function summariseHistory<T extends PricePoint>(scans: T[]): PriceHistory<T> {
  if (!scans.length) return { count: 0 }
  const byTime = [...scans].sort((a, b) => a.timestamp - b.timestamp)
  // On a tie, the earliest time you saw the lowest price.
  const lowest = byTime.reduce((low, s) => (s.price < low.price ? s : low))
  const average = Math.round((scans.reduce((sum, s) => sum + s.price, 0) / scans.length) * 100) / 100
  return { count: scans.length, last: byTime[byTime.length - 1], lowest, average }
}

// ---- Product dashboard ----

type ShopPricePoint = PricePoint & { shopId?: number }

export type ProductSummary<T extends PricePoint> = {
  count: number
  first: T
  latest: T
  lowest: T
  highest: T
  average: number
  // Latest price compared with the first one you logged.
  change: { euros: number; percent: number }
}

export function summariseProduct<T extends PricePoint>(scans: T[]): ProductSummary<T> | undefined {
  if (!scans.length) return undefined
  const byTime = [...scans].sort((a, b) => a.timestamp - b.timestamp)
  const history = summariseHistory(byTime)
  const first = byTime[0]
  const latest = byTime[byTime.length - 1]
  return {
    count: scans.length,
    first,
    latest,
    lowest: history.lowest!,
    highest: byTime.reduce((high, s) => (s.price > high.price ? s : high)),
    average: history.average!,
    change: priceDifference(latest.price, first.price),
  }
}

export type ShopBreakdown<T> = { shopId?: number; latest: T; lowest: number; average: number; count: number }

// Per-shop stats, cheapest on average first. Scans without a shop are grouped together.
export function breakdownByShop<T extends ShopPricePoint>(scans: T[]): ShopBreakdown<T>[] {
  const groups = new Map<number | undefined, T[]>()
  for (const scan of scans) groups.set(scan.shopId, [...(groups.get(scan.shopId) ?? []), scan])
  return [...groups.entries()]
    .map(([shopId, group]) => {
      const history = summariseHistory(group)
      return { shopId, latest: history.last!, lowest: history.lowest!.price, average: history.average!, count: group.length }
    })
    .sort((a, b) => a.average - b.average)
}

// Shops in the order you first scanned this product there. Chart colours follow this order,
// so a shop keeps its colour as you add scans.
export function shopsInFirstSeenOrder(scans: ShopPricePoint[]): (number | undefined)[] {
  const order: (number | undefined)[] = []
  for (const scan of [...scans].sort((a, b) => a.timestamp - b.timestamp)) {
    if (!order.includes(scan.shopId)) order.push(scan.shopId)
  }
  return order
}

// How the current price compares with an earlier one: positive means you'd pay more now.
export function priceDifference(current: number, reference: number): { euros: number; percent: number } {
  return {
    euros: Math.round((current - reference) * 100) / 100,
    percent: Math.round(((current - reference) / reference) * 100),
  }
}

export function isAboveUsual(current: number, average: number | undefined, threshold = PRICE_WARNING_THRESHOLD): boolean {
  return average !== undefined && current > average * (1 + threshold)
}
