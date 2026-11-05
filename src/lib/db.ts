import Dexie, { type EntityTable } from 'dexie'
import type { CategoryId } from './categories'
import type { Currency } from './region'

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
  // Which Open Food Facts database found it: food, beauty (toiletries) or other products.
  lookupSource?: 'food' | 'beauty' | 'products'
  // Category tags from that database, e.g. "en:pastas"; [] once checked and none found.
  categoryTags?: string[]
  // Set when you choose the category yourself; otherwise it's worked out (see categories.ts).
  category?: CategoryId
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
  // The shop's currency when the scan was saved; missing on older scans, which were all in euros.
  currency?: Currency
  // Kept for debugging the price parser.
  rawOcrText?: string
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
  // Starred by you: listed first when choosing a shop, and under Favourites in Shops.
  favourite?: boolean
  // Prices here are in this currency; missing on older shops, which were all in euros.
  currency?: Currency
}

export const db = new Dexie('priceme') as Dexie & {
  products: EntityTable<Product, 'barcode'>
  scans: EntityTable<Scan, 'id'>
  shops: EntityTable<Shop, 'id'>
}

const SCHEMA = {
  products: 'barcode',
  scans: '++id, barcode, timestamp, shopId, [barcode+timestamp]',
  shops: '++id, osmId, lastUsed',
}

db.version(1).stores(SCHEMA)

// Version 2 removes the made-up test scans from stage 2 (barcodes starting "SAMPLE-"),
// in case any are still on the phone. Runs once.
db.version(2)
  .stores(SCHEMA)
  .upgrade(async (tx) => {
    const isSample = (barcode: string) => barcode.startsWith('SAMPLE-')
    const scans = tx.table<Scan, number>('scans')
    const sampleScans = await scans.filter((s) => isSample(s.barcode)).toArray()
    const sampleShopIds = new Set(sampleScans.flatMap((s) => (s.shopId === undefined ? [] : [s.shopId])))

    await scans.bulkDelete(sampleScans.map((s) => s.id!))
    await tx.table<Product, string>('products').filter((p) => isSample(p.barcode)).delete()
    for (const id of sampleShopIds) {
      if ((await scans.where('shopId').equals(id).count()) === 0) await tx.table('shops').delete(id)
    }
  })

// Version 3 removes the small tag photos earlier versions kept with each scan, to save space.
// The price itself is kept. Runs once.
db.version(3)
  .stores(SCHEMA)
  .upgrade((tx) =>
    tx
      .table('scans')
      .toCollection()
      .modify((scan: Record<string, unknown>) => {
        delete scan.tagThumbnail
      }),
  )

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
