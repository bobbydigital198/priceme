import { describe, expect, it } from 'vitest'
import { expandUpcE, hasValidCheckDigit, normaliseBarcode } from './barcode'

describe('hasValidCheckDigit', () => {
  it('accepts real barcodes', () => {
    expect(hasValidCheckDigit('3017620422003')).toBe(true) // EAN-13
    expect(hasValidCheckDigit('96385074')).toBe(true) // EAN-8
    expect(hasValidCheckDigit('036000291452')).toBe(true) // UPC-A
  })

  it('rejects a wrong final digit', () => {
    expect(hasValidCheckDigit('3017620422004')).toBe(false)
    expect(hasValidCheckDigit('96385075')).toBe(false)
  })
})

describe('expandUpcE', () => {
  it('expands to UPC-A', () => {
    expect(expandUpcE('04252614')).toBe('042100005264')
    expect(expandUpcE('01234505')).toBe('012000003455')
  })

  it('rejects codes that are not UPC-E', () => {
    expect(expandUpcE('24252614')).toBeNull()
    expect(expandUpcE('0425261')).toBeNull()
  })
})

describe('normaliseBarcode', () => {
  it('keeps EAN-13 and EAN-8 as they are', () => {
    expect(normaliseBarcode('3017620422003')).toBe('3017620422003')
    expect(normaliseBarcode('96385074')).toBe('96385074')
  })

  it('turns UPC-A into EAN-13', () => {
    expect(normaliseBarcode('036000291452', 'upc_a')).toBe('0036000291452')
    expect(normaliseBarcode('036000291452')).toBe('0036000291452')
  })

  it('turns UPC-E into EAN-13, with or without the check digit', () => {
    expect(normaliseBarcode('04252614', 'upc_e')).toBe('0042100005264')
    expect(normaliseBarcode('0425261', 'upc_e')).toBe('0042100005264')
    expect(normaliseBarcode('425261', 'upc_e')).toBe('0042100005264')
    expect(normaliseBarcode('04252614')).toBe('0042100005264')
  })

  it('ignores spaces and dashes in typed barcodes', () => {
    expect(normaliseBarcode(' 3 017620 422003 ')).toBe('3017620422003')
    expect(normaliseBarcode('3017-6204-22003')).toBe('3017620422003')
  })

  it('rejects mistakes', () => {
    expect(normaliseBarcode('3017620422004')).toBeNull()
    expect(normaliseBarcode('12345')).toBeNull()
    expect(normaliseBarcode('30176204220O3')).toBeNull()
    expect(normaliseBarcode('')).toBeNull()
  })
})
