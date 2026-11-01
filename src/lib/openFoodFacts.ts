// Product lookups. Barcodes are sent to Open Food Facts and, for non-food products it doesn't know,
// to its sister databases Open Beauty Facts and Open Products Facts (same non-profit).
// This is the only data the app sends to the internet, apart from the optional shop search.
import type { Product } from './db'
import { parseQuantity } from './quantity'

const FIELDS = ['product_name', 'product_name_fr', 'brands', 'quantity', 'image_front_small_url', 'image_front_url', 'categories_tags']

const DATABASES = [
  { source: 'food', host: 'world.openfoodfacts.org' },
  { source: 'beauty', host: 'world.openbeautyfacts.org' },
  { source: 'products', host: 'world.openproductsfacts.org' },
] as const

type LookupSource = (typeof DATABASES)[number]['source']

export type OffProduct = {
  product_name?: string
  product_name_fr?: string
  brands?: string
  quantity?: string
  image_front_small_url?: string
  image_front_url?: string
  categories_tags?: string[]
}

export function mapOffProduct(barcode: string, off: OffProduct, now = Date.now(), lookupSource: LookupSource = 'food'): Product | null {
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
    lookupSource,
    categoryTags: off.categories_tags ?? [],
    updatedAt: now,
  }
}

async function fetchFrom(host: string, barcode: string, fields: string[], signal?: AbortSignal): Promise<OffProduct | null> {
  const response = await fetch(`https://${host}/api/v2/product/${barcode}.json?fields=${fields.join(',')}`, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${host} replied ${response.status}`)
  const json = (await response.json()) as { status?: number; product?: OffProduct }
  return json.status === 1 && json.product ? json.product : null
}

// Resolves to the product, or null if none of the databases know it. Throws if the lookup fails.
export async function fetchProduct(barcode: string, signal?: AbortSignal): Promise<Product | null> {
  for (const { source, host } of DATABASES) {
    const found = await fetchFrom(host, barcode, FIELDS, signal)
    const product = found && mapOffProduct(barcode, found, Date.now(), source)
    if (product) return product
  }
  return null
}

// For products saved before categories existed: fetches just their category tags.
export async function fetchCategoryTags(barcode: string, lookupSource: LookupSource = 'food'): Promise<string[]> {
  const host = DATABASES.find((d) => d.source === lookupSource)!.host
  return (await fetchFrom(host, barcode, ['categories_tags']))?.categories_tags ?? []
}
