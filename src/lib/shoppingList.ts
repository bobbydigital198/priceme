// Shopping list maths: what a list would cost at each shop, from the prices you've scanned.
// Pure functions, covered by shoppingList.test.ts.
import { currencyOf, type Currency } from './region'

export type ListItem = { barcode: string; quantity: number }

type ScanLike = { barcode: string; price: number; timestamp: number; shopId?: number; currency?: Currency }

// The latest price of each product at each shop: shopId -> barcode -> scan.
export function latestPrices<T extends ScanLike>(scans: T[]): Map<number, Map<string, T>> {
  const byShop = new Map<number, Map<string, T>>()
  for (const scan of scans) {
    if (scan.shopId === undefined) continue
    const products = byShop.get(scan.shopId) ?? new Map<string, T>()
    const current = products.get(scan.barcode)
    if (!current || scan.timestamp > current.timestamp) products.set(scan.barcode, scan)
    byShop.set(scan.shopId, products)
  }
  return byShop
}

export type ShopTotal<T> = {
  shopId: number
  // Sum of quantity x latest price, for the items this shop has a price for.
  total: number
  // Items with a price here, and the scan each price comes from.
  priced: { item: ListItem; scan: T }[]
  // Items you've never scanned at this shop.
  missing: ListItem[]
  // When the oldest price used was scanned.
  oldest?: number
}

const round = (n: number) => Math.round(n * 100) / 100

// What the list costs at each shop. Shops with every item come first, cheapest first; then the
// rest, those with more of the items first. Shops with none of the items are left out.
export function compareShops<T extends ScanLike>(items: ListItem[], shopIds: number[], scans: T[]): ShopTotal<T>[] {
  const prices = latestPrices(scans)
  return shopIds
    .map((shopId): ShopTotal<T> => {
      const here = prices.get(shopId)
      const priced: { item: ListItem; scan: T }[] = []
      const missing: ListItem[] = []
      for (const item of items) {
        const scan = here?.get(item.barcode)
        if (scan) priced.push({ item, scan })
        else missing.push(item)
      }
      const total = round(priced.reduce((sum, { item, scan }) => sum + item.quantity * scan.price, 0))
      const oldest = priced.length ? Math.min(...priced.map((p) => p.scan.timestamp)) : undefined
      return { shopId, total, priced, missing, oldest }
    })
    .filter((s) => s.priced.length > 0)
    .sort((a, b) => a.missing.length - b.missing.length || a.total - b.total)
}

export type SplitPlan<T> = {
  total: number
  // For each item, the shop where it's cheapest (among the shops chosen) and that price.
  picks: { item: ListItem; shopId: number; scan: T }[]
  // Items none of the chosen shops has a price for.
  missing: ListItem[]
}

// The cheapest possible total if you bought each item wherever it's cheapest.
export function cheapestSplit<T extends ScanLike>(items: ListItem[], shopIds: number[], scans: T[]): SplitPlan<T> {
  const prices = latestPrices(scans)
  const picks: SplitPlan<T>['picks'] = []
  const missing: ListItem[] = []
  for (const item of items) {
    let best: { shopId: number; scan: T } | undefined
    for (const shopId of shopIds) {
      const scan = prices.get(shopId)?.get(item.barcode)
      if (scan && (!best || scan.price < best.scan.price)) best = { shopId, scan }
    }
    if (best) picks.push({ item, ...best })
    else missing.push(item)
  }
  return { total: round(picks.reduce((sum, p) => sum + p.item.quantity * p.scan.price, 0)), picks, missing }
}

// Shops that have a price for at least one item on the list, in a given currency.
export function shopsWithPrices<T extends ScanLike>(items: ListItem[], scans: T[], currency: Currency): Set<number> {
  const wanted = new Set(items.map((i) => i.barcode))
  const shops = new Set<number>()
  for (const scan of scans) {
    if (scan.shopId !== undefined && wanted.has(scan.barcode) && currencyOf(scan) === currency) shops.add(scan.shopId)
  }
  return shops
}

// Adds one of a product, or changes how many; a quantity of 0 removes it.
export function setQuantity(items: ListItem[], barcode: string, quantity: number): ListItem[] {
  const clamped = Math.max(0, Math.min(99, Math.round(quantity)))
  const exists = items.some((i) => i.barcode === barcode)
  if (clamped === 0) return items.filter((i) => i.barcode !== barcode)
  if (exists) return items.map((i) => (i.barcode === barcode ? { ...i, quantity: clamped } : i))
  return [...items, { barcode, quantity: clamped }]
}

export const itemCount = (items: ListItem[]) => items.reduce((sum, i) => sum + i.quantity, 0)
