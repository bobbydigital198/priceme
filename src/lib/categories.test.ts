import { describe, expect, it } from 'vitest'
import { CATEGORIES, categorise } from './categories'

describe('categorise from Open Food Facts tags', () => {
  it.each([
    [['en:beverages', 'en:carbonated-drinks', 'en:energy-drinks'], 'drinks'],
    [['en:plant-based-foods', 'en:pastas', 'en:dry-pastas'], 'pasta'],
    [['en:condiments', 'en:sauces', 'en:ketchup'], 'condiments'],
    [['en:dairies', 'en:milks', 'en:beverages'], 'dairy'],
    [['en:dairies', 'en:cheeses'], 'cheese'],
    [['en:beverages', 'en:waters', 'en:mineral-waters'], 'water'],
    [['en:beverages', 'en:alcoholic-beverages', 'en:beers'], 'alcohol'],
    [['en:spreads', 'en:sweet-spreads', 'en:hazelnut-spreads'], 'spreads'],
    [['en:frozen-foods', 'en:pizzas'], 'frozen'],
    [['en:snacks', 'en:sweet-snacks', 'en:biscuits'], 'biscuits'],
  ])('%j becomes %s', (categoryTags, expected) => {
    expect(categorise({ name: 'x', categoryTags })).toBe(expected)
  })
})

describe('categorise from the name', () => {
  it.each([
    ['Red Bull Energy Drink 250ml', 'drinks'],
    ['Penne Rigate', 'pasta'],
    ['Pâtes Coquillettes', 'pasta'],
    ['Ketchup Heinz', 'condiments'],
    ['Papier toilette double épaisseur', 'paper'],
    ['Essuie-tout Sopalin', 'paper'],
    ['Savon liquide mains', 'toiletries'],
    ['Lessive liquide Ariel', 'cleaning'],
    ['Lait demi-écrémé', 'dairy'],
    ['Chocolat au lait', 'sweets'],
    ['Pain au chocolat', 'bakery'],
    ['Beurre de cacahuète', 'spreads'],
    ['Biscuits au beurre', 'biscuits'],
    ['Fromage blanc nature', 'yoghurt'],
    ['Eau minérale naturelle', 'water'],
    ['Saucisses de Toulouse', 'meat'],
    ['Thon au naturel', 'fish'],
    ['Bananes', 'fruit-veg'],
  ])('%j becomes %s', (name, expected) => {
    expect(categorise({ name })).toBe(expected)
  })

  it('matches whole words only', () => {
    expect(categorise({ name: 'Saucisse' })).toBe('meat')
    expect(categorise({ name: 'Vinaigrette' })).toBe('condiments')
  })
})

describe('categorise fallbacks', () => {
  it('lets your own choice win', () => {
    expect(categorise({ name: 'Penne', category: 'other', categoryTags: ['en:pastas'] })).toBe('other')
  })

  it('uses the database the product came from', () => {
    expect(categorise({ name: 'Unknown thing', lookupSource: 'beauty' })).toBe('toiletries')
    expect(categorise({ name: 'Unknown thing', lookupSource: 'products' })).toBe('household')
    expect(categorise({ name: 'Unknown thing' })).toBe('other')
  })

  it('has unique category ids', () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length)
  })
})
