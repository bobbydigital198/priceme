import { describe, expect, it } from 'vitest'
import { formatQuantity, parseQuantity, quantityFromEntry, quantityToEntry } from './quantity'

describe('parseQuantity', () => {
  it('reads weights', () => {
    expect(parseQuantity('400 g')).toEqual({ value: 400, unit: 'g' })
    expect(parseQuantity('250g')).toEqual({ value: 250, unit: 'g' })
    expect(parseQuantity('1 kg')).toEqual({ value: 1000, unit: 'g' })
    expect(parseQuantity('0,5 kg')).toEqual({ value: 500, unit: 'g' })
    expect(parseQuantity('500 gr')).toEqual({ value: 500, unit: 'g' })
  })

  it('reads volumes', () => {
    expect(parseQuantity('1 L')).toEqual({ value: 1000, unit: 'ml' })
    expect(parseQuantity('1,5 l')).toEqual({ value: 1500, unit: 'ml' })
    expect(parseQuantity('75cl')).toEqual({ value: 750, unit: 'ml' })
    expect(parseQuantity('330 ml')).toEqual({ value: 330, unit: 'ml' })
    expect(parseQuantity('2 litres')).toEqual({ value: 2000, unit: 'ml' })
  })

  it('multiplies packs', () => {
    expect(parseQuantity('6 x 33 cl')).toEqual({ value: 1980, unit: 'ml' })
    expect(parseQuantity('2x125g')).toEqual({ value: 250, unit: 'g' })
    expect(parseQuantity('4 × 100 g')).toEqual({ value: 400, unit: 'g' })
  })

  it('copes with extra text', () => {
    expect(parseQuantity('Poids net : 200 g ℮')).toEqual({ value: 200, unit: 'g' })
  })

  it('gives up on things it cannot read', () => {
    expect(parseQuantity(undefined)).toBeUndefined()
    expect(parseQuantity('')).toBeUndefined()
    expect(parseQuantity('12 pièces')).toBeUndefined()
    expect(parseQuantity('0 g')).toBeUndefined()
  })
})

describe('typed pack sizes', () => {
  it('turns a typed amount and unit into grams or millilitres', () => {
    expect(quantityFromEntry('400', 'g')).toEqual({ value: 400, unit: 'g' })
    expect(quantityFromEntry('1,5', 'kg')).toEqual({ value: 1500, unit: 'g' })
    expect(quantityFromEntry('0.75', 'L')).toEqual({ value: 750, unit: 'ml' })
    expect(quantityFromEntry('330', 'ml')).toEqual({ value: 330, unit: 'ml' })
  })

  it('rejects amounts that are not numbers or are zero', () => {
    expect(quantityFromEntry('', 'g')).toBeUndefined()
    expect(quantityFromEntry('abc', 'g')).toBeUndefined()
    expect(quantityFromEntry('0', 'g')).toBeUndefined()
  })

  it('shows kilos and litres from 1000 up', () => {
    expect(quantityToEntry({ value: 1500, unit: 'g' })).toEqual({ amount: '1,5', unit: 'kg' })
    expect(quantityToEntry({ value: 400, unit: 'g' })).toEqual({ amount: '400', unit: 'g' })
    expect(formatQuantity({ value: 2000, unit: 'ml' })).toBe('2\u00a0L')
    expect(formatQuantity({ value: 330, unit: 'ml' })).toBe('330\u00a0ml')
  })
})
