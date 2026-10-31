import { HOME_SCAN_LIMIT } from './constants'
import { db, type Product, type Scan, type Shop } from './db'

export type RecentScan = {
  scan: Scan
  product?: Product
  shop?: Shop
  // Total scans of this product, not just the ones on screen.
  productScanCount: number
}

export async function getRecentScans(limit = HOME_SCAN_LIMIT): Promise<RecentScan[]> {
  const scans = await db.scans.orderBy('timestamp').reverse().limit(limit).toArray()

  const barcodes = [...new Set(scans.map((s) => s.barcode))]
  const shopIds = [...new Set(scans.flatMap((s) => (s.shopId === undefined ? [] : [s.shopId])))]

  const [products, counts, shops] = await Promise.all([
    db.products.bulkGet(barcodes),
    Promise.all(barcodes.map((b) => db.scans.where('barcode').equals(b).count())),
    db.shops.bulkGet(shopIds),
  ])

  const productByBarcode = new Map(barcodes.map((b, i) => [b, products[i]]))
  const countByBarcode = new Map(barcodes.map((b, i) => [b, counts[i]]))
  const shopById = new Map(shopIds.map((id, i) => [id, shops[i]]))

  return scans.map((scan) => ({
    scan,
    product: productByBarcode.get(scan.barcode),
    shop: scan.shopId === undefined ? undefined : shopById.get(scan.shopId),
    productScanCount: countByBarcode.get(scan.barcode) ?? 1,
  }))
}
