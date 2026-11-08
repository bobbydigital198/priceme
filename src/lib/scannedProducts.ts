// Products you've logged at least one price for, with their latest scan: the products a
// shopping list can be made from.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Product, type Scan } from './db'

export type ScannedProduct = { product: Product; latest: Scan }

export function useScannedProducts(): Map<string, ScannedProduct> | undefined {
  return useLiveQuery(async () => {
    const [products, scans] = await Promise.all([db.products.toArray(), db.scans.toArray()])
    const latest = new Map<string, Scan>()
    for (const scan of scans) {
      const current = latest.get(scan.barcode)
      if (!current || scan.timestamp > current.timestamp) latest.set(scan.barcode, scan)
    }
    const result = new Map<string, ScannedProduct>()
    for (const product of products) {
      const scan = latest.get(product.barcode)
      if (scan) result.set(product.barcode, { product, latest: scan })
    }
    return result
  })
}
