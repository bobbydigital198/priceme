import { describe, expect, it } from 'vitest'
import { computeUnitPrice, parsePriceTag, type OcrLine } from './priceParser'

// A line of words with text heights in pixels, as Tesseract reports them.
function line(...words: [text: string, height: number, confidence?: number][]): OcrLine {
  return { words: words.map(([text, height, confidence = 90]) => ({ text, height, confidence })) }
}

describe('simple price formats', () => {
  it.each([
    ['3,49 €', 3.49],
    ['3,49€', 3.49],
    ['€3,49', 3.49],
    ['€ 3,49', 3.49],
    ['3€49', 3.49],
    ['3 € 49', 3.49],
    ['3.49', 3.49],
    ['3 , 49 €', 3.49],
    ['12,90 €', 12.9],
    ['0,89€', 0.89],
  ])('reads %s', (text, price) => {
    const result = parsePriceTag(text)
    expect(result.price).toBe(price)
    expect(result.confidence).toBe('high')
  })
})

describe('big euros, small cents', () => {
  it('reads them on the same line using text height', () => {
    const result = parsePriceTag([line(['3', 120], ['49', 55], ['€', 50])])
    expect(result.price).toBe(3.49)
    expect(result.confidence).toBe('high')
  })

  it('reads them without a euro sign when the cents are clearly smaller', () => {
    expect(parsePriceTag([line(['2', 110], ['15', 48])]).price).toBe(2.15)
  })

  it('does not join two numbers of the same size', () => {
    expect(parsePriceTag([line(['2', 50], ['15', 50])]).price).toBeUndefined()
  })

  it('reads them across two lines', () => {
    const result = parsePriceTag('BEURRE DOUX PRESIDENT\n2\n89 €\n11,56 €/kg')
    expect(result.price).toBe(2.89)
    expect(result.unitPrice).toBe(11.56)
    expect(result.unitBasis).toBe('kg')
  })

  it('reads them across two lines with heights', () => {
    const result = parsePriceTag([line(['1', 140]), line(['99', 60], ['€', 55]), line(['Prix', 18], ['au', 18], ['kg', 20], [':', 18], ['3,98', 20], ['€', 18])])
    expect(result.price).toBe(1.99)
    expect(result.unitPrice).toBe(3.98)
    expect(result.unitBasis).toBe('kg')
  })
})

describe('OCR mistakes', () => {
  it.each([
    ['3,4S €', 3.45],
    ['l,99 €', 1.99],
    ['B,49€', 8.49],
    ['O,89 €', 0.89],
    ['2,O5 €', 2.05],
    ['I,25€', 1.25],
  ])('fixes look-alike letters in %s', (text, price) => {
    const result = parsePriceTag(text)
    expect(result.price).toBe(price)
    expect(result.confidence).toBe('medium')
  })

  it('treats a trailing E or C as a euro sign', () => {
    expect(parsePriceTag('3,49E').price).toBe(3.49)
    expect(parsePriceTag('3,49 C').price).toBe(3.49)
  })

  it('leaves ordinary words alone', () => {
    expect(parsePriceTag('SOLDES\nLOT\n2,50 €').price).toBe(2.5)
  })

  it('copes with stray punctuation', () => {
    expect(parsePriceTag('"3,49" €').price).toBe(3.49)
  })

  it('reads a misread "kg" as kg', () => {
    const result = parsePriceTag('2,49 €\n9,96 € le k9')
    expect(result.unitPrice).toBe(9.96)
    expect(result.unitBasis).toBe('kg')
  })
})

describe('unit prices', () => {
  it.each([
    ['1,49 €\n2,98 €/kg', 2.98, 'kg'],
    ['1,49 €\n2,98 € / kg', 2.98, 'kg'],
    ['1,49 €\n2,98 € le kg', 2.98, 'kg'],
    ['1,49 €\nLe kg : 2,98 €', 2.98, 'kg'],
    ['1,49 €\nPrix au kg 2,98 €', 2.98, 'kg'],
    ['1,49 €\nPrix au kilo 2,98 €', 2.98, 'kg'],
    ['1,85 €\n1,23 €/L', 1.23, 'L'],
    ['1,85 €\n1,23 € le litre', 1.23, 'L'],
    ['1,85 €\nPrix au litre : 1,23 €', 1.23, 'L'],
  ])('separates the unit price in %j', (text, unitPrice, basis) => {
    const result = parsePriceTag(text)
    expect(result.unitPrice).toBe(unitPrice)
    expect(result.unitBasis).toBe(basis)
    expect(result.price).not.toBe(unitPrice)
  })

  it('handles price and unit price on one line', () => {
    const result = parsePriceTag([line(['1,49', 70], ['€', 60], ['2,98', 20], ['€/kg', 20])])
    expect(result.price).toBe(1.49)
    expect(result.unitPrice).toBe(2.98)
  })

  it('uses a marker on its own line for the price below it', () => {
    const result = parsePriceTag([line(['0,99', 90], ['€', 80]), line(['PRIX', 15], ['AU', 15], ['KG', 15]), line(['3,96', 15], ['€', 15])])
    expect(result.price).toBe(0.99)
    expect(result.unitPrice).toBe(3.96)
    expect(result.unitBasis).toBe('kg')
  })

  it('works when the unit price is the same as the price', () => {
    const result = parsePriceTag('LAIT DEMI ECREME 1L\n1,19 €\n1,19 € le litre')
    expect(result.price).toBe(1.19)
    expect(result.unitPrice).toBe(1.19)
    expect(result.unitBasis).toBe('L')
  })
})

describe('choosing between prices', () => {
  it('prefers the bigger text on a promotion', () => {
    const result = parsePriceTag([line(['4,99', 30], ['€', 28]), line(['3,49', 90], ['€', 80]), line(['6,98', 18], ['€/kg', 18])])
    expect(result.price).toBe(3.49)
    expect(result.alternatives).toEqual([4.99])
    expect(result.confidence).toBe('high')
  })

  it('is less sure when two prices are a similar size', () => {
    const result = parsePriceTag([line(['4,99', 60], ['€', 55]), line(['3,49', 64], ['€', 60])])
    expect(result.price).toBe(3.49)
    expect(result.alternatives).toEqual([4.99])
    expect(result.confidence).toBe('medium')
  })

  it('is less sure without size information', () => {
    const result = parsePriceTag('4,99 €\n3,49 €')
    expect(result.price).toBe(4.99)
    expect(result.alternatives).toEqual([3.49])
    expect(result.confidence).toBe('medium')
  })

  it('does not count the same price twice as a rival', () => {
    const result = parsePriceTag('2,50 €\n2,50 €')
    expect(result.alternatives).toEqual([])
    expect(result.confidence).toBe('high')
  })
})

describe('things that are not prices', () => {
  it('ignores pack sizes', () => {
    expect(parsePriceTag('PENNE RIGATE 0,50 kg\n1,49 €').price).toBe(1.49)
    expect(parsePriceTag('JUS ORANGE 0,75 L\n2,35 €').price).toBe(2.35)
    expect(parsePriceTag('COCA-COLA 1,5L\n1,85€').price).toBe(1.85)
  })

  it('ignores discounts', () => {
    expect(parsePriceTag('-30 %\n2,10 €').price).toBe(2.1)
    expect(parsePriceTag('-30%\n2,10 €').price).toBe(2.1)
  })

  it('ignores barcodes and long numbers', () => {
    const result = parsePriceTag('FRANPRIX\n3,15 €\n12,60 €/kg\n3228021170039\nREF 004512')
    expect(result.price).toBe(3.15)
    expect(result.unitPrice).toBe(12.6)
  })

  it('reads a realistic messy tag', () => {
    const text = [
      'FRANPRIX',
      'Beurre doux',
      'PRESIDENT 250g',
      '| 2,89€',
      'Prix au kg : 11,56 €',
      '3228021170039 30/10/26',
    ].join('\n')
    const result = parsePriceTag(text)
    expect(result.price).toBe(2.89)
    expect(result.unitPrice).toBe(11.56)
    expect(result.unitBasis).toBe('kg')
  })
})

describe('low confidence and failures', () => {
  it('gives up when there is no price', () => {
    const result = parsePriceTag('PROMO\nBARILLA\nPENNE RIGATE')
    expect(result.price).toBeUndefined()
    expect(result.confidence).toBe('none')
  })

  it('gives up on empty text', () => {
    expect(parsePriceTag('').confidence).toBe('none')
    expect(parsePriceTag([]).confidence).toBe('none')
  })

  it('rejects zero and silly prices', () => {
    const zero = parsePriceTag('0,00 €')
    expect(zero.price).toBeUndefined()
    expect(zero.warnings).toHaveLength(1)

    const huge = parsePriceTag('999,99 €')
    expect(huge.price).toBeUndefined()
    expect(huge.warnings).toHaveLength(1)
  })

  it('keeps a real price when another is silly', () => {
    const result = parsePriceTag('0,00 €\n1,99 €')
    expect(result.price).toBe(1.99)
    expect(result.warnings).toHaveLength(1)
  })

  it('is unsure about whole euros and merged cents', () => {
    expect(parsePriceTag('3 €')).toMatchObject({ price: 3, confidence: 'low' })
    expect(parsePriceTag('349 €')).toMatchObject({ price: 3.49, confidence: 'low' })
  })

  it('is unsure when OCR itself was unsure', () => {
    expect(parsePriceTag([line(['3,49', 80, 40], ['€', 70, 40])]).confidence).toBe('low')
    expect(parsePriceTag([line(['3,49', 80, 65], ['€', 70, 65])]).confidence).toBe('medium')
  })

  it('reports a unit price even when the main price is missing', () => {
    const result = parsePriceTag('11,56 €/kg')
    expect(result.price).toBeUndefined()
    expect(result.unitPrice).toBe(11.56)
    expect(result.confidence).toBe('none')
  })
})

describe('computeUnitPrice', () => {
  it('works out price per kilo and per litre', () => {
    expect(computeUnitPrice(2.89, { value: 250, unit: 'g' })).toEqual({ unitPrice: 11.56, unitBasis: 'kg' })
    expect(computeUnitPrice(1.25, { value: 1000, unit: 'ml' })).toEqual({ unitPrice: 1.25, unitBasis: 'L' })
    expect(computeUnitPrice(0.99, { value: 330, unit: 'ml' })).toEqual({ unitPrice: 3, unitBasis: 'L' })
  })
})
