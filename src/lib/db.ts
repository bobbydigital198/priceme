import Dexie, { type EntityTable } from 'dexie'

export type Product = {
  barcode: string
  name: string
  brand?: string
  // As printed on the pack, e.g. "400 g" or "1 L".
  quantityText?: string
  // Parsed from quantityText: grams for solids, millilitres for liquids.
  quantityValue?: number
  quantityUnit?: 'g' | 'ml'
  imageUrl?: string
  source: 'openfoodfacts' | 'manual'
  updatedAt: number
}

export type Scan = {
  id?: number
  barcode: string
  price: number
  unitPrice?: number
  unitBasis?: 'kg' | 'L'
  // 'read' if the unit price came off the tag, 'calculated' if worked out from the pack size.
  unitPriceSource?: 'read' | 'calculated'
  timestamp: number
  shopId?: number
  // Kept for debugging the price parser.
  rawOcrText?: string
  // Small compressed JPEG of the tag, as a data URL.
  tagThumbnail?: string
}

export type Shop = {
  id?: number
  // Set when the shop came from OpenStreetMap, e.g. "node/123456".
  osmId?: string
  name: string
  chain?: string
  address?: string
  latitude?: number
  longitude?: number
  source: 'osm' | 'manual'
  lastUsed: number
}

export const db = new Dexie('priceme') as Dexie & {
  products: EntityTable<Product, 'barcode'>
  scans: EntityTable<Scan, 'id'>
  shops: EntityTable<Shop, 'id'>
}

db.version(1).stores({
  products: 'barcode',
  scans: '++id, barcode, timestamp, shopId, [barcode+timestamp]',
  shops: '++id, osmId, lastUsed',
})

// Asks the browser not to clear our data when the phone is low on space.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    // Not supported; the data is still saved, just with less protection.
  }
}
