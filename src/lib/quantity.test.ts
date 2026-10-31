import { describe, expect, it } from 'vitest'
import { parseQuantity } from './quantity'

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
