import { PRICE_WARNING_THRESHOLD } from '../lib/constants'
import { formatDifference, formatPrice, formatScanDay } from '../lib/format'
import { isAboveUsual, priceDifference, type PriceHistory } from '../lib/stats'

type Props = { history: PriceHistory; current?: number }

// How the price you're about to save compares with what you've paid before.
export function PriceComparison({ history, current }: Props) {
  if (!history.count || !history.last || !history.lowest || history.average === undefined) {
    return <p className="product-sub">First time you've scanned this product, so there's nothing to compare yet.</p>
  }

  const above = current !== undefined && isAboveUsual(current, history.average)
  const rows = [
    { label: 'Last paid', price: history.last.price, note: formatScanDay(history.last.timestamp) },
    { label: 'Lowest', price: history.lowest.price, note: formatScanDay(history.lowest.timestamp) },
    { label: 'Average', price: history.average, note: history.count === 1 ? '1 scan' : `${history.count} scans` },
  ]

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
              <td>{formatPrice(row.price)}</td>
              <td className={current === undefined ? '' : current > row.price ? 'diff-up' : current < row.price ? 'diff-down' : ''}>
                {current === undefined ? '' : formatDifference(priceDifference(current, row.price))}
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
