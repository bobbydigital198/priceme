// Reads pack sizes like "400 g", "1,5 L", "75cl" or "6 x 33 cl" into grams or millilitres.

export type Quantity = { value: number; unit: 'g' | 'ml' }

const UNITS: Record<string, { unit: Quantity['unit']; factor: number }> = {
  kg: { unit: 'g', factor: 1000 },
  g: { unit: 'g', factor: 1 },
  gr: { unit: 'g', factor: 1 },
  gramme: { unit: 'g', factor: 1 },
  grammes: { unit: 'g', factor: 1 },
  mg: { unit: 'g', factor: 0.001 },
  l: { unit: 'ml', factor: 1000 },
  litre: { unit: 'ml', factor: 1000 },
  litres: { unit: 'ml', factor: 1000 },
  dl: { unit: 'ml', factor: 100 },
  cl: { unit: 'ml', factor: 10 },
  ml: { unit: 'ml', factor: 1 },
}

const PATTERN = /(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|grammes|gramme|gr|g|mg|litres|litre|l|dl|cl|ml)(?![a-z])/

export function parseQuantity(text: string | undefined): Quantity | undefined {
  if (!text) return undefined
  const match = PATTERN.exec(text.toLowerCase().replace(/(\d),(\d)/g, '$1.$2'))
  if (!match) return undefined

  const count = match[1] ? Number(match[1]) : 1
  const { unit, factor } = UNITS[match[3]]
  const value = Math.round(count * Number(match[2]) * factor * 100) / 100
  return value > 0 ? { value, unit } : undefined
}

// Units offered when you type a pack size yourself.
export type EntryUnit = 'g' | 'kg' | 'ml' | 'L'

const ENTRY_UNITS: Record<EntryUnit, { unit: Quantity['unit']; factor: number }> = {
  g: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  ml: { unit: 'ml', factor: 1 },
  L: { unit: 'ml', factor: 1000 },
}

// A typed amount ("400", "1,5") in a chosen unit, as grams or millilitres.
export function quantityFromEntry(amount: string, unit: EntryUnit): Quantity | undefined {
  const cleaned = amount.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined
  const value = Math.round(Number(cleaned) * ENTRY_UNITS[unit].factor * 100) / 100
  return value > 0 && value <= 100_000 ? { value, unit: ENTRY_UNITS[unit].unit } : undefined
}

// How to show a stored pack size in the edit form: kilos and litres from 1000 up.
export function quantityToEntry(quantity: Quantity): { amount: string; unit: EntryUnit } {
  const big = quantity.value >= 1000
  const unit: EntryUnit = quantity.unit === 'g' ? (big ? 'kg' : 'g') : big ? 'L' : 'ml'
  const amount = big ? quantity.value / 1000 : quantity.value
  return { amount: String(Math.round(amount * 1000) / 1000).replace('.', ','), unit }
}

// "400 g", "1,5 kg", "330 ml", "2 L".
export function formatQuantity(quantity: Quantity): string {
  const { amount, unit } = quantityToEntry(quantity)
  return `${amount}\u00a0${unit}`
}
