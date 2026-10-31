// Display helpers. Prices use the French style seen on tags ("3,49 €"); everything else is UK English.

const NBSP = ' '

export function formatPrice(euros: number): string {
  return `${euros.toFixed(2).replace('.', ',')}${NBSP}€`
}

export function formatUnitPrice(euros: number, basis: 'kg' | 'L'): string {
  return `${formatPrice(euros)}/${basis}`
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

export function formatScanCount(count: number): string {
  return count === 1 ? 'Scanned once' : `Scanned ${count} times`
}

// "Franprix, Rue de Rivoli"
export function formatShop(shop: { name: string; address?: string }): string {
  return shop.address ? `${shop.name}, ${shop.address}` : shop.name
}
