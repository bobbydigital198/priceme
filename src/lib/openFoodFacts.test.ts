import { describe, expect, it } from 'vitest'
import { mapOffProduct } from './openFoodFacts'

describe('mapOffProduct', () => {
  it('prefers the French name and the first brand', () => {
    const product = mapOffProduct(
      '3017620422003',
      {
        product_name: 'Nutella',
        product_name_fr: 'Nutella pâte à tartiner',
        brands: 'Nutella, Ferrero',
        quantity: '400 g',
        image_front_small_url: 'https://images.openfoodfacts.org/small.jpg',
        image_front_url: 'https://images.openfoodfacts.org/large.jpg',
      },
      1000,
    )
    expect(product).toEqual({
      barcode: '3017620422003',
      name: 'Nutella pâte à tartiner',
      brand: 'Nutella',
      quantityText: '400 g',
      quantityValue: 400,
      quantityUnit: 'g',
      imageUrl: 'https://images.openfoodfacts.org/small.jpg',
      source: 'openfoodfacts',
      updatedAt: 1000,
    })
  })

  it('leaves out missing details', () => {
    const product = mapOffProduct('96385074', { product_name: ' Biscuits ', brands: '', quantity: '' }, 1000)
    expect(product).toEqual({
      barcode: '96385074',
      name: 'Biscuits',
      brand: undefined,
      quantityText: undefined,
      quantityValue: undefined,
      quantityUnit: undefined,
      imageUrl: undefined,
      source: 'openfoodfacts',
      updatedAt: 1000,
    })
  })

  it('treats a product with no name as not found', () => {
    expect(mapOffProduct('96385074', { quantity: '200 g' })).toBeNull()
  })
})
