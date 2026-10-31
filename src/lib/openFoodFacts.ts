// Product lookups. This is the only data the app sends to the internet, apart from shop detection.
import type { Product } from './db'
import { parseQuantity } from './quantity'

const FIELDS = ['product_name', 'product_name_fr', 'brands', 'quantity', 'image_front_small_url', 'image_front_url']

export type OffProduct = {
  product_name?: string
  product_name_fr?: string
  brands?: string
  quantity?: string
  image_front_small_url?: string
  image_front_url?: string
}

export function mapOffProduct(barcode: string, off: OffProduct, now = Date.now()): Product | null {
  const name = (off.product_name_fr || off.product_name || '').trim()
  if (!name) return null

  const quantityText = off.quantity?.trim() || undefined
  const quantity = parseQuantity(quantityText)
  return {
    barcode,
    name,
    brand: off.brands?.split(',')[0].trim() || undefined,
    quantityText,
    quantityValue: quantity?.value,
    quantityUnit: quantity?.unit,
    imageUrl: off.image_front_small_url || off.image_front_url || undefined,
    source: 'openfoodfacts',
    updatedAt: now,
  }
}

// Resolves to the product, or null if Open Food Facts doesn't know it. Throws if the lookup fails.
export async function fetchProduct(barcode: string, signal?: AbortSignal): Promise<Product | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS.join(',')}`
  const response = await fetch(url, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Open Food Facts replied ${response.status}`)

  const json = (await response.json()) as { status?: number; product?: OffProduct }
  return json.status === 1 && json.product ? mapOffProduct(barcode, json.product) : null
}
