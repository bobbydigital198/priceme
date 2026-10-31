// TEMPORARY: made-up scans for testing the home screen before real scanning exists.
// Remove this file and its buttons once stage 5 can save real scans.
import { db, type Product, type Scan } from './db'

const PREFIX = 'SAMPLE-'
const DAY = 86_400_000

export function isSampleBarcode(barcode: string): boolean {
  return barcode.startsWith(PREFIX)
}

export async function addSampleData() {
  const now = Date.now()

  await db.transaction('rw', db.products, db.scans, db.shops, async () => {
    const products: Product[] = [
      { barcode: `${PREFIX}1`, name: 'Lait demi-écrémé', brand: 'Lactel', quantityText: '1 L', quantityValue: 1000, quantityUnit: 'ml', source: 'manual', updatedAt: now },
      { barcode: `${PREFIX}2`, name: 'Beurre doux', brand: 'Président', quantityText: '250 g', quantityValue: 250, quantityUnit: 'g', source: 'manual', updatedAt: now },
      { barcode: `${PREFIX}3`, name: 'Penne Rigate', brand: 'Barilla', quantityText: '500 g', quantityValue: 500, quantityUnit: 'g', source: 'manual', updatedAt: now },
    ]
    await db.products.bulkPut(products)

    const franprix = await db.shops.add({ name: 'Franprix', chain: 'Franprix', address: 'Rue de Rivoli', source: 'manual', lastUsed: now })
    const monoprix = await db.shops.add({ name: 'Monoprix', chain: 'Monoprix', address: 'Rue de Turbigo', source: 'manual', lastUsed: now - 2 * DAY })

    const scans: Scan[] = [
      { barcode: `${PREFIX}1`, price: 1.15, unitPrice: 1.15, unitBasis: 'L', unitPriceSource: 'read', timestamp: now - 40 * DAY, shopId: monoprix },
      { barcode: `${PREFIX}1`, price: 1.19, unitPrice: 1.19, unitBasis: 'L', unitPriceSource: 'read', timestamp: now - 12 * DAY, shopId: monoprix },
      { barcode: `${PREFIX}3`, price: 1.49, unitPrice: 2.98, unitBasis: 'kg', unitPriceSource: 'read', timestamp: now - 2 * DAY, shopId: monoprix },
      { barcode: `${PREFIX}2`, price: 2.89, unitPrice: 11.56, unitBasis: 'kg', unitPriceSource: 'calculated', timestamp: now - 1 * DAY - 3_600_000, shopId: franprix },
      { barcode: `${PREFIX}2`, price: 3.15, unitPrice: 12.6, unitBasis: 'kg', unitPriceSource: 'calculated', timestamp: now - 25 * 60_000, shopId: franprix },
      { barcode: `${PREFIX}1`, price: 1.25, unitPrice: 1.25, unitBasis: 'L', unitPriceSource: 'read', timestamp: now - 20 * 60_000, shopId: franprix },
    ]
    await db.scans.bulkAdd(scans)
  })
}

export async function removeSampleData() {
  await db.transaction('rw', db.products, db.scans, db.shops, async () => {
    const sampleScans = await db.scans.filter((s) => isSampleBarcode(s.barcode)).toArray()
    const sampleShopIds = new Set(sampleScans.flatMap((s) => (s.shopId === undefined ? [] : [s.shopId])))

    await db.scans.bulkDelete(sampleScans.map((s) => s.id!))
    await db.products.filter((p) => isSampleBarcode(p.barcode)).delete()

    // Only delete sample shops that no real scan uses.
    for (const id of sampleShopIds) {
      if ((await db.scans.where('shopId').equals(id).count()) === 0) await db.shops.delete(id)
    }
  })
}
