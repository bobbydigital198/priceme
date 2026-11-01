// Numbers for the Shops section: how often you go, and whether each shop is cheap for you.
type ScanLike = { barcode: string; price: number; timestamp: number; shopId?: number }

export type ShopSummary = { scans: number; products: number; visits: number; lastVisit: number }

const dayOf = (timestamp: number) => {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Per shop: scans, distinct products, visits (days you scanned there) and last visit.
export function summariseShops(scans: ScanLike[]): Map<number, ShopSummary> {
  const groups = new Map<number, ScanLike[]>()
  for (const scan of scans) {
    if (scan.shopId !== undefined) groups.set(scan.shopId, [...(groups.get(scan.shopId) ?? []), scan])
  }
  return new Map(
    [...groups].map(([shopId, group]) => [
      shopId,
      {
        scans: group.length,
        products: new Set(group.map((s) => s.barcode)).size,
        visits: new Set(group.map((s) => dayOf(s.timestamp))).size,
        lastVisit: Math.max(...group.map((s) => s.timestamp)),
      },
    ]),
  )
}

export type ShopProduct<T> = {
  barcode: string
  latestHere: T
  // Average of what you paid for it at other shops; undefined if you've only bought it here.
  averageElsewhere?: number
}

// Products bought at a shop, most recent first, with how this shop's latest price compares elsewhere.
export function productsAtShop<T extends ScanLike>(shopId: number, scans: T[]): ShopProduct<T>[] {
  const here = scans.filter((s) => s.shopId === shopId)
  const latest = new Map<string, T>()
  for (const scan of here) {
    const current = latest.get(scan.barcode)
    if (!current || scan.timestamp > current.timestamp) latest.set(scan.barcode, scan)
  }
  return [...latest.values()]
    .map((latestHere) => {
      const elsewhere = scans.filter((s) => s.barcode === latestHere.barcode && s.shopId !== shopId)
      const averageElsewhere = elsewhere.length
        ? Math.round((elsewhere.reduce((sum, s) => sum + s.price, 0) / elsewhere.length) * 100) / 100
        : undefined
      return { barcode: latestHere.barcode, latestHere, averageElsewhere }
    })
    .sort((a, b) => b.latestHere.timestamp - a.latestHere.timestamp)
}

// "Cheaper here for 3 of 5 products you've also bought elsewhere."
export function cheaperHere(rows: ShopProduct<ScanLike>[]): { cheaper: number; compared: number } {
  const compared = rows.filter((r) => r.averageElsewhere !== undefined)
  return { cheaper: compared.filter((r) => r.latestHere.price < r.averageElsewhere!).length, compared: compared.length }
}
