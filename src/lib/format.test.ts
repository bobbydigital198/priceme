import { describe, expect, it } from 'vitest'
import {
  formatAmountInput,
  formatDaysAgo,
  formatDifference,
  formatPrice,
  formatScanCount,
  formatScanDay,
  formatScanTime,
  formatShop,
  formatSignedPrice,
  formatUnitPrice,
  parseAmountInput,
} from './format'

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

describe('formatScanDay', () => {
  const now = new Date(2026, 9, 31, 18, 0).getTime()

  it('names recent days and dates older ones', () => {
    expect(formatScanDay(new Date(2026, 9, 31, 9, 0).getTime(), now)).toBe('today')
    expect(formatScanDay(new Date(2026, 9, 30, 9, 0).getTime(), now)).toBe('yesterday')
    expect(formatScanDay(new Date(2026, 9, 12, 9, 0).getTime(), now)).toBe('12 Oct')
    expect(formatScanDay(new Date(2025, 9, 12, 9, 0).getTime(), now)).toBe('12 Oct 2025')
  })
})

describe('formatDaysAgo', () => {
  const now = new Date(2026, 9, 31, 18, 0).getTime()

  it('counts days for the last two months', () => {
    expect(formatDaysAgo(new Date(2026, 9, 31, 9, 0).getTime(), now)).toBe('today')
    expect(formatDaysAgo(new Date(2026, 9, 30, 9, 0).getTime(), now)).toBe('yesterday')
    expect(formatDaysAgo(new Date(2026, 9, 19, 9, 0).getTime(), now)).toBe('12 days ago')
    expect(formatDaysAgo(new Date(2026, 5, 1, 9, 0).getTime(), now)).toBe('1 Jun')
  })
})

describe('formatSignedPrice', () => {
  it('shows a sign before the euros', () => {
    expect(formatSignedPrice(0.54)).toBe(`+0,54${nbsp}€`)
    expect(formatSignedPrice(-1.2)).toBe(`-1,20${nbsp}€`)
    expect(formatSignedPrice(0)).toBe(`0,00${nbsp}€`)
  })
})

describe('formatDifference', () => {
  it('shows a sign on euros and percent', () => {
    expect(formatDifference({ euros: 0.45, percent: 15 })).toBe(`+0,45${nbsp}€ (+15%)`)
    expect(formatDifference({ euros: -0.3, percent: -10 })).toBe(`-0,30${nbsp}€ (-10%)`)
    expect(formatDifference({ euros: 0, percent: 0 })).toBe('Same price')
  })
})

describe('typed amounts', () => {
  it('formats for a price box', () => {
    expect(formatAmountInput(3.4)).toBe('3,40')
  })

  it.each([
    ['3,49', 3.49],
    ['3.49', 3.49],
    ['3,49 €', 3.49],
    [' 12 ', 12],
    ['3,', 3],
    ['0,5', 0.5],
  ])('reads %j', (text, value) => {
    expect(parseAmountInput(text)).toBe(value)
  })

  it.each(['', '0', '0,00', 'abc', '3,499', '3,4,9', '-2'])('rejects %j', (text) => {
    expect(parseAmountInput(text)).toBeUndefined()
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
