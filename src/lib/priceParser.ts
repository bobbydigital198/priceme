// Reads the selling price and the unit price (€/kg, €/L) from price tag OCR output.
// Pure logic with no camera or OCR code, so it can be tested with plain strings (priceParser.test.ts).

export type OcrWord = { text: string; height?: number; confidence?: number }
export type OcrLine = { words: OcrWord[] }

export type UnitBasis = 'kg' | 'L'
export type Confidence = 'high' | 'medium' | 'low' | 'none'

export type ParseResult = {
  price?: number
  unitPrice?: number
  unitBasis?: UnitBasis
  confidence: Confidence
  // Other prices seen on the tag, e.g. the old price on a promotion.
  alternatives: number[]
  warnings: string[]
}

export const MAX_PRICE = 500
export const MAX_UNIT_PRICE = 2000

// Cents printed smaller than the euros are at most this fraction of their height.
const SMALL_CENTS_RATIO = 0.8
// The selling price counts as clearly the biggest when it is this much taller than the next.
const CLEAR_WINNER_RATIO = 1.25

type Token = { text: string; height: number; confidence: number; corrected: boolean }

type Candidate = {
  value: number
  height: number
  confidence: number
  corrected: boolean
  kind: 'decimal' | 'split' | 'whole' | 'merged'
  hasEuroSign: boolean
  line: number
  unit?: UnitBasis
}

// For tests and manual input: one OcrLine per text line, words split on spaces, no sizes.
export function linesFromText(text: string): OcrLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => ({ words: line.split(/\s+/).filter(Boolean).map((t) => ({ text: t })) }))
    .filter((line) => line.words.length > 0)
}

// ---- Token clean-up ----

const LOOKALIKES: Record<string, string> = {
  O: '0', o: '0', D: '0', Q: '0',
  l: '1', I: '1', i: '1', '|': '1', '!': '1',
  S: '5', s: '5',
  B: '8',
  Z: '2', z: '2',
}

// Fixes letters misread for digits, but only in tokens that already look like numbers.
function fixDigits(text: string): { text: string; corrected: boolean } {
  // "3,49E": a trailing E is usually a misread euro sign.
  const euro = /^([0-9OoIlSB]+[,.][0-9OoIlSB]{2})[Ee]$/.exec(text)
  if (euro) text = euro[1] + '€'

  if (!/\d/.test(text) || !/^[0-9OoDQlIi|!SsBZz,.€]+$/.test(text)) return { text, corrected: false }
  const fixed = text.replace(/[OoDQlIi|!SsBZz]/g, (c) => LOOKALIKES[c])
  return { text: fixed, corrected: fixed !== text }
}

const isInt = (t?: string) => t !== undefined && /^\d{1,3}$/.test(t)
const isCents = (t?: string) => t !== undefined && /^\d{2}$/.test(t)
const isNumberish = (t?: string) => t !== undefined && /^\d+([,.]\d+)?$/.test(t)
const heightsKnown = (...items: { height: number }[]) => items.every((t) => t.height > 0)

function tokenise(line: OcrLine): Token[] {
  const tokens: Token[] = []
  for (const word of line.words) {
    const { text, corrected } = fixDigits(word.text.replace(/^[:;*"'()«»]+|[:;*"'()«»]+$/g, ''))
    // Split euro signs and slashes off so "3,49€/kg" becomes "3,49", "€", "/", "kg".
    for (const part of text.split(/([€/])/).filter(Boolean)) {
      tokens.push({ text: part, height: word.height ?? 0, confidence: word.confidence ?? 100, corrected })
    }
  }

  // Rejoin numbers broken around the decimal separator: "3 ,49", "3, 49", "3 , 49".
  const merged: Token[] = []
  for (let i = 0; i < tokens.length; i++) {
    const [a, b, c] = [tokens[i], tokens[i + 1], tokens[i + 2]]
    const join = (...parts: Token[]): Token => ({
      text: parts.map((p) => p.text).join(''),
      height: Math.max(...parts.map((p) => p.height)),
      confidence: Math.min(...parts.map((p) => p.confidence)),
      corrected: parts.some((p) => p.corrected),
    })
    if (isInt(a.text) && b && /^[,.]\d{2}$/.test(b.text)) {
      merged.push(join(a, b))
      i += 1
    } else if (/^\d{1,3}[,.]$/.test(a.text) && isCents(b?.text)) {
      merged.push(join(a, b))
      i += 1
    } else if (isInt(a.text) && (b?.text === ',' || b?.text === '.') && isCents(c?.text)) {
      merged.push(join(a, b, c))
      i += 2
    } else {
      merged.push(a)
    }
  }

  // A lone E or C straight after a number is usually a misread euro sign.
  return merged.map((t, i) =>
    /^[EeC]$/.test(t.text) && isNumberish(merged[i - 1]?.text) ? { ...t, text: '€' } : t,
  )
}

// ---- Unit price markers ----

const KG_WORDS = new Set(['kg', 'k9', 'kq', 'kilo', 'kilos', 'kilogramme'])
const LITRE_WORDS = new Set(['l', 'litre', 'litres', 'lt', 'ltr'])
const MARKER_LEADS = new Set(['/', 'le', 'la', 'au', 'par', 'ie', '1e'])
const QUANTITY_UNITS = new Set(['g', 'gr', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'litre', 'litres'])

function unitWord(text?: string): UnitBasis | undefined {
  const t = text?.toLowerCase()
  if (t === undefined) return undefined
  if (KG_WORDS.has(t)) return 'kg'
  if (LITRE_WORDS.has(t)) return 'L'
  return undefined
}

// Finds "/kg", "le kg", "au litre" and so on within tokens[from..to).
function findMarker(tokens: Token[], from: number, to: number): UnitBasis | undefined {
  for (let i = Math.max(0, from); i < Math.min(tokens.length, to) - 1; i++) {
    if (MARKER_LEADS.has(tokens[i].text.toLowerCase())) {
      const basis = unitWord(tokens[i + 1].text)
      if (basis) return basis
    }
  }
  return undefined
}

// ---- Candidate prices ----

function findCandidates(lines: Token[][]): Candidate[] {
  const candidates: Candidate[] = []
  const consumed = lines.map(() => new Set<number>())

  const make = (line: number, start: Token, kind: Candidate['kind'], value: number, parts: Token[], hasEuroSign: boolean): Candidate => ({
    value: Math.round(value * 100) / 100,
    height: start.height,
    confidence: Math.min(...parts.map((p) => p.confidence)),
    corrected: parts.some((p) => p.corrected),
    kind,
    hasEuroSign,
    line,
  })

  // Big euros on one line, small cents starting the next: "3" then "49 €".
  for (let l = 0; l < lines.length - 1; l++) {
    const numbers = lines[l].map((t, i) => [t, i] as const).filter(([t]) => t.text !== '€')
    const next = lines[l + 1][0]
    if (numbers.length !== 1 || !isInt(numbers[0][0].text) || !next) continue
    const [euros, index] = numbers[0]
    const centsText = next.text.replace(/^[,.]/, '')
    if (!isCents(centsText)) continue
    if (heightsKnown(euros, next) && next.height >= euros.height * 0.85) continue

    const candidate = make(l, euros, 'split', Number(euros.text) + Number(centsText) / 100, [euros, next], lines[l + 1][1]?.text === '€')
    candidate.unit = findMarker(lines[l + 1], 1, 5)
    candidates.push(candidate)
    consumed[l].add(index)
    consumed[l + 1].add(0)
  }

  lines.forEach((tokens, l) => {
    const lineCandidates: { candidate: Candidate; start: number; end: number }[] = []

    for (let i = 0; i < tokens.length; i++) {
      if (consumed[l].has(i)) continue
      const [t, n1, n2] = [tokens[i], tokens[i + 1], tokens[i + 2]]
      const prevIsEuro = tokens[i - 1]?.text === '€'
      let found: { candidate: Candidate; end: number } | undefined

      const decimal = /^(\d{1,3})[,.](\d{2})$/.exec(t.text)
      if (decimal) {
        found = { candidate: make(l, t, 'decimal', Number(decimal[1]) + Number(decimal[2]) / 100, [t], prevIsEuro || n1?.text === '€'), end: i }
      } else if (isInt(t.text) && n1?.text === '€' && isCents(n2?.text)) {
        // "3€49"
        found = { candidate: make(l, t, 'split', Number(t.text) + Number(n2.text) / 100, [t, n2], true), end: i + 2 }
      } else if (
        isInt(t.text) &&
        n1 &&
        isCents(n1.text) &&
        ((heightsKnown(t, n1) && n1.height < t.height * SMALL_CENTS_RATIO) || n2?.text === '€')
      ) {
        // Big "3" next to small "49".
        const end = n2?.text === '€' ? i + 2 : i + 1
        found = { candidate: make(l, t, 'split', Number(t.text) + Number(n1.text) / 100, [t, n1], n2?.text === '€'), end }
      } else if (/^[1-9]\d{2,3}$/.test(t.text) && (n1?.text === '€' || prevIsEuro)) {
        // "349 €": cents probably merged into the euros, as supermarket items rarely cost over 100 €.
        found = { candidate: make(l, t, 'merged', Number(t.text) / 100, [t], true), end: n1?.text === '€' ? i + 1 : i }
      } else if (isInt(t.text) && n1?.text === '€') {
        // "3 €" with no cents.
        found = { candidate: make(l, t, 'whole', Number(t.text), [t], true), end: i + 1 }
      }

      if (!found) continue
      const after = tokens[found.end + 1]?.text.toLowerCase()
      // "0,75 L" or "500 g" is a pack size, and "30 %" a discount, not a price.
      const isQuantity = !found.candidate.hasEuroSign && after !== undefined && QUANTITY_UNITS.has(after)
      if (!isQuantity && !after?.startsWith('%')) lineCandidates.push({ ...found, start: i })
      i = found.end
    }

    lineCandidates.forEach(({ candidate, start, end }, k) => {
      // Look after the price ("2,98 €/kg") and before it ("Prix au kg : 2,98 €"), without crossing another price.
      const nextStart = lineCandidates[k + 1]?.start ?? tokens.length
      const prevEnd = lineCandidates[k - 1]?.end ?? -1
      candidate.unit = findMarker(tokens, end + 1, Math.min(nextStart, end + 5)) ?? findMarker(tokens, Math.max(prevEnd + 1, start - 5), start)
      candidates.push(candidate)
    })
  })

  // A line that is only a marker ("Prix au kilo") labels the price on the line below, or failing that, above.
  lines.forEach((tokens, l) => {
    if (candidates.some((c) => c.line === l)) return
    const basis = findMarker(tokens, 0, tokens.length)
    if (!basis) return
    const below = candidates.filter((c) => c.line === l + 1 && !c.unit)
    const target = below.length ? below : candidates.filter((c) => c.line === l - 1 && !c.unit)
    target.forEach((c) => (c.unit = basis))
  })

  return candidates
}

// ---- Choosing ----

const KIND_RANK: Record<Candidate['kind'], number> = { decimal: 2, split: 2, whole: 1, merged: 0 }

function rankCandidates(a: Candidate, b: Candidate): number {
  return b.height - a.height || KIND_RANK[b.kind] - KIND_RANK[a.kind] || Number(b.hasEuroSign) - Number(a.hasEuroSign) || a.line - b.line
}

function formatEuros(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`
}

const LEVELS: Confidence[] = ['none', 'low', 'medium', 'high']
const lower = (c: Confidence): Confidence => LEVELS[Math.max(1, LEVELS.indexOf(c) - 1)]

export function parsePriceTag(input: OcrLine[] | string): ParseResult {
  const lines = (typeof input === 'string' ? linesFromText(input) : input).map(tokenise).filter((l) => l.length)
  const warnings: string[] = []

  const candidates = findCandidates(lines).filter((c) => {
    const max = c.unit ? MAX_UNIT_PRICE : MAX_PRICE
    if (c.value > 0 && c.value <= max) return true
    warnings.push(`Ignored ${formatEuros(c.value)}${c.unit ? `/${c.unit}` : ''}, which is not a realistic price.`)
    return false
  })

  const prices = candidates.filter((c) => !c.unit).sort(rankCandidates)
  const units = candidates.filter((c) => c.unit).sort(rankCandidates)
  const unit = units[0]
  const best = prices[0]

  if (!best) {
    return { unitPrice: unit?.value, unitBasis: unit?.unit, confidence: 'none', alternatives: [], warnings }
  }

  const rivals = prices.filter((c) => c.value !== best.value)
  let confidence: Confidence = 'high'
  if (rivals.length) {
    const clearlyBigger = heightsKnown(best, rivals[0]) && best.height >= rivals[0].height * CLEAR_WINNER_RATIO
    if (!clearlyBigger) confidence = 'medium'
  }
  if (best.kind === 'whole' || best.kind === 'merged') confidence = 'low'
  if (best.corrected) confidence = lower(confidence)
  if (best.confidence < 50) confidence = 'low'
  else if (best.confidence < 70) confidence = lower(confidence)

  return {
    price: best.value,
    unitPrice: unit?.value,
    unitBasis: unit?.unit,
    confidence,
    alternatives: [...new Set(rivals.map((c) => c.value))],
    warnings,
  }
}

// When the tag has no unit price, work it out from the pack size.
export function computeUnitPrice(price: number, quantity: { value: number; unit: 'g' | 'ml' }): { unitPrice: number; unitBasis: UnitBasis } {
  return {
    unitPrice: Math.round((price / (quantity.value / 1000)) * 100) / 100,
    unitBasis: quantity.unit === 'g' ? 'kg' : 'L',
  }
}
