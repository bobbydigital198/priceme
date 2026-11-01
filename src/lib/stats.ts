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
