import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { PriceChart, type ChartSeries } from '../components/PriceChart'
import { OffCredit } from '../components/Credits'
import { ProductThumb } from '../components/ProductThumb'
import { CATEGORIES, categorise, type CategoryId } from '../lib/categories'
import { shopColour } from '../lib/chartColours'
import { db, type Scan, type Shop } from '../lib/db'
import { formatDaysAgo, formatPrice, formatScanTime, formatShop, formatSignedPrice, formatUnitPrice } from '../lib/format'
import { useDarkMode } from '../lib/theme'
import { breakdownByShop, priceDifference, shopsInFirstSeenOrder, summariseProduct } from '../lib/stats'

type Props = { barcode: string; onBack: () => void }

const NO_SHOP = 'none'
const keyOf = (shopId?: number) => (shopId === undefined ? NO_SHOP : String(shopId))

// Everything about one product: stats, price chart, per-shop breakdown and every scan.
export function ProductDetail({ barcode, onBack }: Props) {
  const product = useLiveQuery(() => db.products.get(barcode), [barcode])
  const scans = useLiveQuery(() => db.scans.where('barcode').equals(barcode).toArray(), [barcode])
  const shops = useLiveQuery(() => db.shops.toArray())
  const dark = useDarkMode()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState<number>()

  const name = product?.name ?? 'Unknown product'
  const shopById = new Map((shops ?? []).map((s): [number, Shop] => [s.id!, s]))
  const shopName = (shopId?: number) => {
    const shop = shopId === undefined ? undefined : shopById.get(shopId)
    return shop ? formatShop(shop) : 'No shop recorded'
  }

  const summary = summariseProduct(scans ?? [])
  // How the latest price compares with your average for this product.
  const fromAverage = summary ? priceDifference(summary.latest.price, summary.average) : { euros: 0, percent: 0 }
  const order = shopsInFirstSeenOrder(scans ?? [])
  const colourOf = (shopId?: number) => shopColour(order.indexOf(shopId), dark)
  const series: ChartSeries[] = order.map((shopId) => ({
    key: keyOf(shopId),
    label: shopName(shopId),
    colour: colourOf(shopId),
    scans: (scans ?? []).filter((s) => s.shopId === shopId),
    hidden: hidden.has(keyOf(shopId)),
  }))
  const byShop = breakdownByShop(scans ?? [])
  const newestFirst = [...(scans ?? [])].sort((a, b) => b.timestamp - a.timestamp)

  function toggleShop(key: string) {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      // Keep at least one line showing.
      else if (next.size < series.length - 1) next.add(key)
      return next
    })
  }

  async function deleteScan(scan: Scan) {
    await db.scans.delete(scan.id!)
    setConfirmingDelete(undefined)
  }

  return (
    <main className="screen product-page">
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>

      <section className="product-header">
        <ProductThumb imageUrl={product?.imageUrl} name={name} size={96} />
        <div>
          <h1 className="product-name">{name}</h1>
          {product?.brand && <p className="product-sub">{product.brand}</p>}
          {product?.quantityText && <p className="product-sub">{product.quantityText}</p>}
          <p className="product-sub small">Barcode {barcode}</p>
          {product?.source === 'openfoodfacts' && <OffCredit />}
        </div>
      </section>

      {product && (
        <label className="field category-field">
          <span>Category{product.category ? '' : ' (chosen automatically)'}</span>
          <select
            value={categorise(product)}
            onChange={(e) => db.products.update(barcode, { category: e.target.value as CategoryId })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {scans && !summary && <p className="placeholder-note">No scans of this product left.</p>}

      {summary && (
        <>
          <section className="card hero">
            <p className="hero-label">Average price</p>
            <p className="hero-price">{formatPrice(summary.average)}</p>
            <p className="product-sub">{summary.count === 1 ? 'From 1 scan' : `From ${summary.count} scans`}</p>
          </section>

          <section className="stat-grid">
            <Stat
              label="Lowest price"
              value={formatPrice(summary.lowest.price)}
              note={`${shopName(summary.lowest.shopId)}, ${formatDaysAgo(summary.lowest.timestamp)}`}
            />
            <Stat
              label="Change from average"
              value={fromAverage.euros === 0 ? 'Same' : formatSignedPrice(fromAverage.euros)}
              note={fromAverage.euros === 0 ? 'Latest price is the average' : `${fromAverage.percent > 0 ? '+' : ''}${fromAverage.percent}% (latest vs average)`}
              tone={fromAverage.euros > 0 ? 'up' : fromAverage.euros < 0 ? 'down' : undefined}
            />
          </section>

          <section className="card hero">
            <p className="hero-label">Latest price</p>
            <p className="hero-price">{formatPrice(summary.latest.price)}</p>
            <p className="product-sub">
              {[
                summary.latest.unitPrice !== undefined && summary.latest.unitBasis
                  ? formatUnitPrice(summary.latest.unitPrice, summary.latest.unitBasis)
                  : '',
                shopName(summary.latest.shopId),
                formatDaysAgo(summary.latest.timestamp),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </section>

          <section className="card">
            <h2 className="card-heading">Price over time</h2>
            {summary.count < 2 ? (
              <p className="product-sub">The chart appears after your second scan of this product.</p>
            ) : (
              <>
                <PriceChart series={series} dark={dark} />
                {series.length > 1 && (
                  <div className="chart-legend" role="group" aria-label="Show or hide shops">
                    {series.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className={s.hidden ? 'off' : ''}
                        aria-pressed={!s.hidden}
                        onClick={() => toggleShop(s.key)}
                      >
                        <span className="legend-swatch" style={{ background: s.colour }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                {series.length > 1 && <p className="product-sub small">Tap a shop above to show or hide its line.</p>}
              </>
            )}
          </section>

          {byShop.length > 1 && (
            <section className="card">
              <h2 className="card-heading">By shop</h2>
              <table className="shop-table">
                <thead>
                  <tr>
                    <th scope="col">Shop</th>
                    <th scope="col">Latest</th>
                    <th scope="col">Lowest</th>
                    <th scope="col">Average</th>
                    <th scope="col">Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {byShop.map((row) => (
                    <tr key={keyOf(row.shopId)}>
                      <th scope="row">
                        <span className="legend-swatch" style={{ background: colourOf(row.shopId) }} />
                        {shopName(row.shopId)}
                      </th>
                      <td>{formatPrice(row.latest.price)}</td>
                      <td>{formatPrice(row.lowest)}</td>
                      <td>{formatPrice(row.average)}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="product-sub small">Cheapest on average first.</p>
            </section>
          )}

          <section className="card">
            <h2 className="card-heading">All scans</h2>
            <ul className="history-list">
              {newestFirst.map((scan) => (
                <li key={scan.id}>
                  <div className="history-row">
                    <div>
                      <div className="history-when">{formatScanTime(scan.timestamp)}</div>
                      <div className="product-sub small">{shopName(scan.shopId)}</div>
                    </div>
                    <div className="history-price">
                      <div>{formatPrice(scan.price)}</div>
                      {scan.unitPrice !== undefined && scan.unitBasis && (
                        <div className="product-sub small">
                          {formatUnitPrice(scan.unitPrice, scan.unitBasis)}
                          {scan.unitPriceSource === 'calculated' && <span className="calc-tag">calc.</span>}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="delete-button"
                      aria-label={`Delete the scan from ${formatScanTime(scan.timestamp)}`}
                      onClick={() => setConfirmingDelete(scan.id)}
                    >
                      Delete
                    </button>
                  </div>
                  {confirmingDelete === scan.id && (
                    <div className="delete-confirm" role="alert">
                      <p>
                        Delete this scan of {formatPrice(scan.price)}? This can't be undone.
                      </p>
                      <div className="delete-actions">
                        <button type="button" className="danger-button" onClick={() => deleteScan(scan)}>
                          Delete scan
                        </button>
                        <button type="button" className="secondary-button" onClick={() => setConfirmingDelete(undefined)}>
                          Keep it
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'up' | 'down' }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className={`stat-value${tone === 'up' ? ' diff-up' : tone === 'down' ? ' diff-down' : ''}`}>{value}</p>
      <p className="stat-note">{note}</p>
    </div>
  )
}
