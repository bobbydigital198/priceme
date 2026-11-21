import { HOME_SCAN_LIMIT } from './constants'
import { db, type Product, type Scan, type Shop } from './db'
import { currencyOf } from './region'

export type RecentScan = {
  scan: Scan
  product?: Product
  shop?: Shop
  // Your average price for this product at the scan's shop (in the same currency), to show
  // whether this price is above or below it.
  shopAverage?: number
}

// Latest scan of each product, newest first: scanning a product again moves it to the top
// instead of adding a second row. Older scans stay in the product's history.
export function latestPerProduct<T extends { barcode: string }>(newestFirst: T[], limit: number): T[] {
  const seen = new Set<string>()
  const latest: T[] = []
  for (const scan of newestFirst) {
    if (seen.has(scan.barcode)) continue
    seen.add(scan.barcode)
    latest.push(scan)
    if (latest.length >= limit) break
  }
  return latest
}

export async function getRecentScans(limit = HOME_SCAN_LIMIT): Promise<RecentScan[]> {
  const scans = latestPerProduct(await db.scans.orderBy('timestamp').reverse().toArray(), limit)

  const barcodes = [...new Set(scans.map((s) => s.barcode))]
  const shopIds = [...new Set(scans.flatMap((s) => (s.shopId === undefined ? [] : [s.shopId])))]

  const [products, counts, shops] = await Promise.all([
    db.products.bulkGet(barcodes),
    Promise.all(barcodes.map((b) => db.scans.where('barcode').equals(b).toArray())),
    db.shops.bulkGet(shopIds),
  ])

  const productByBarcode = new Map(barcodes.map((b, i) => [b, products[i]]))
  const scansByBarcode = new Map(barcodes.map((b, i) => [b, counts[i]]))
  const shopById = new Map(shopIds.map((id, i) => [id, shops[i]]))

  return scans.map((scan) => {
    const all = scansByBarcode.get(scan.barcode) ?? [scan]
    const atShop = all.filter((s) => s.shopId === scan.shopId && currencyOf(s) === currencyOf(scan))
    return {
      scan,
      product: productByBarcode.get(scan.barcode),
      shop: scan.shopId === undefined ? undefined : shopById.get(scan.shopId),
      shopAverage: scan.shopId === undefined || !atShop.length ? undefined : atShop.reduce((sum, s) => sum + s.price, 0) / atShop.length,
    }
  })
}
