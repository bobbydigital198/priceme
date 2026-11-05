import { PRICE_WARNING_THRESHOLD } from '../lib/constants'
import type { Scan, Shop } from '../lib/db'
import { formatDaysAgo, formatDifference, formatPrice, formatShop } from '../lib/format'
import type { Currency } from '../lib/region'
import { isAboveUsual, priceDifference, summariseHistory } from '../lib/stats'

type Props = {
  scans: Scan[]
  shops: Map<number, Shop>
  // The shop this scan is being saved for, if chosen.
  shopId?: number
  current?: number
  // All the scans given are in this currency.
  currency?: Currency
}

// How the price you're about to save compares with what you've paid before.
export function PriceComparison({ scans, shops, shopId, current, currency = 'EUR' }: Props) {
  const history = summariseHistory(scans)
  if (!history.last || !history.lowest || history.average === undefined) {
    return <p className="product-sub">First time you've scanned this product, so there's nothing to compare yet.</p>
  }

  const atShop = shopId === undefined ? undefined : summariseHistory(scans.filter((s) => s.shopId === shopId))
  const where = (scan: Scan) => {
    const shop = scan.shopId === undefined ? undefined : shops.get(scan.shopId)
    return [shop && formatShop(shop), formatDaysAgo(scan.timestamp)].filter(Boolean).join(', ')
  }
  const scansLabel = (count: number) => (count === 1 ? '1 scan' : `${count} scans`)

  const rows = [
    ...(atShop?.average !== undefined ? [{ label: 'Usual at this shop', price: atShop.average, note: scansLabel(atShop.count) }] : []),
    { label: 'Cheapest anywhere', price: history.lowest.price, note: where(history.lowest) },
    { label: 'Last paid', price: history.last.price, note: where(history.last) },
    { label: 'Average', price: history.average, note: scansLabel(history.count) },
  ]

  const above = current !== undefined && isAboveUsual(current, history.average)

  return (
    <section className="comparison">
      {above && current !== undefined && (
        <p className="price-warning" role="alert">
          {priceDifference(current, history.average).percent}% above your usual price
        </p>
      )}
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">
                {row.label}
                <span>{row.note}</span>
              </th>
              <td>{formatPrice(row.price, currency)}</td>
              <td className={current === undefined ? '' : current > row.price ? 'diff-up' : current < row.price ? 'diff-down' : ''}>
                {current === undefined ? '' : formatDifference(priceDifference(current, row.price), currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="product-sub small">
        Differences are from the price above. A warning shows when it's more than {Math.round(PRICE_WARNING_THRESHOLD * 100)}% over
        your average.
      </p>
    </section>
  )
}
