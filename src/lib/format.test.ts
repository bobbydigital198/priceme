import { describe, expect, it } from 'vitest'
import { formatPrice, formatScanCount, formatScanTime, formatShop, formatUnitPrice } from './format'

const nbsp = ' '

describe('formatPrice', () => {
  it('uses a comma and a trailing euro sign', () => {
    expect(formatPrice(3.49)).toBe(`3,49${nbsp}€`)
    expect(formatPrice(12)).toBe(`12,00${nbsp}€`)
    expect(formatPrice(0.5)).toBe(`0,50${nbsp}€`)
  })

  it('rounds to cents', () => {
    expect(formatPrice(2.999)).toBe(`3,00${nbsp}€`)
  })
})

describe('formatUnitPrice', () => {
  it('adds the basis', () => {
    expect(formatUnitPrice(11.56, 'kg')).toBe(`11,56${nbsp}€/kg`)
    expect(formatUnitPrice(1.19, 'L')).toBe(`1,19${nbsp}€/L`)
  })
})

describe('formatScanTime', () => {
  const now = new Date(2026, 9, 31, 18, 0).getTime()

  it('says Today and Yesterday', () => {
    expect(formatScanTime(new Date(2026, 9, 31, 14, 5).getTime(), now)).toBe('Today, 14:05')
    expect(formatScanTime(new Date(2026, 9, 30, 9, 30).getTime(), now)).toBe('Yesterday, 09:30')
  })

  it('shows day and month this year, and the year for older scans', () => {
    expect(formatScanTime(new Date(2026, 9, 12, 18, 0).getTime(), now)).toBe('12 Oct, 18:00')
    expect(formatScanTime(new Date(2025, 9, 12, 18, 0).getTime(), now)).toBe('12 Oct 2025, 18:00')
  })

  it('treats just after midnight as yesterday, not today', () => {
    const justAfterMidnight = new Date(2026, 10, 1, 0, 10).getTime()
    expect(formatScanTime(new Date(2026, 9, 31, 23, 50).getTime(), justAfterMidnight)).toBe('Yesterday, 23:50')
  })
})

describe('formatScanCount', () => {
  it('reads naturally', () => {
    expect(formatScanCount(1)).toBe('Scanned once')
    expect(formatScanCount(4)).toBe('Scanned 4 times')
  })
})

describe('formatShop', () => {
  it('joins name and address', () => {
    expect(formatShop({ name: 'Franprix', address: 'Rue de Rivoli' })).toBe('Franprix, Rue de Rivoli')
    expect(formatShop({ name: 'Monoprix' })).toBe('Monoprix')
  })
})
