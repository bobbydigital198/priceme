// Display helpers. Prices use the French style seen on tags ("3,49 €"); everything else is UK English.

const NBSP = ' '

export function formatPrice(euros: number): string {
  return `${euros.toFixed(2).replace('.', ',')}${NBSP}€`
}

export function formatUnitPrice(euros: number, basis: 'kg' | 'L'): string {
  return `${formatPrice(euros)}/${basis}`
}

// "+0,45 € (+15%)", "-0,30 € (-10%)" or "Same price".
export function formatDifference({ euros, percent }: { euros: number; percent: number }): string {
  if (euros === 0) return 'Same price'
  const sign = euros > 0 ? '+' : '-'
  return `${sign}${formatPrice(Math.abs(euros))} (${sign}${Math.abs(percent)}%)`
}

// Number as typed in a price box: "3,49".
export function formatAmountInput(euros: number): string {
  return euros.toFixed(2).replace('.', ',')
}

// Reads a typed price: "3,49", "3.49", "3,49 €" or "3". Undefined if it isn't a price.
export function parseAmountInput(text: string): number | undefined {
  const cleaned = text.replace(/[€\s]/g, '').replace(',', '.')
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(cleaned)) return undefined
  const value = Math.round(Number(cleaned) * 100) / 100
  return value > 0 ? value : undefined
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const fullDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

// "Today, 14:05", "Yesterday, 09:30", "12 Oct, 18:00", or "12 Oct 2025, 18:00" for older years.
export function formatScanTime(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp)
  const today = new Date(now)
  const dayDiff = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000)
  const time = timeFormat.format(date)

  if (dayDiff === 0) return `Today, ${time}`
  if (dayDiff === 1) return `Yesterday, ${time}`
  if (date.getFullYear() === today.getFullYear()) return `${dayMonthFormat.format(date)}, ${time}`
  return `${fullDateFormat.format(date)}, ${time}`
}

// "today", "yesterday", "12 Oct" or "12 Oct 2025".
export function formatScanDay(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp)
  const today = new Date(now)
  const dayDiff = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000)
  if (dayDiff === 0) return 'today'
  if (dayDiff === 1) return 'yesterday'
  if (date.getFullYear() === today.getFullYear()) return dayMonthFormat.format(date)
  return fullDateFormat.format(date)
}

// "today", "yesterday", "12 days ago", then the date after two months.
export function formatDaysAgo(timestamp: number, now: number = Date.now()): string {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(timestamp))) / 86_400_000)
  if (days < 2 || days > 60) return formatScanDay(timestamp, now)
  return `${days} days ago`
}

export function formatScanCount(count: number): string {
  return count === 1 ? 'Scanned once' : `Scanned ${count} times`
}

// "Franprix, Rue de Rivoli"
export function formatShop(shop: { name: string; address?: string }): string {
  return shop.address ? `${shop.name}, ${shop.address}` : shop.name
}
