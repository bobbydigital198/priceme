import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { PriceChart, type ChartSeries } from '../components/PriceChart'
import { OffCredit } from '../components/Credits'
import { EditScan } from '../components/EditScan'
import { ProductThumb } from '../components/ProductThumb'
import { categoryName, categorise } from '../lib/categories'
import { shopColour } from '../lib/chartColours'
import { db, type Scan, type Shop } from '../lib/db'
import { formatDaysAgo, formatPrice, formatScanTime, formatShop, formatSignedPrice, formatUnitPrice } from '../lib/format'
import { computeUnitPrice } from '../lib/priceParser'
import { CURRENCIES, currencyOf, type Currency } from '../lib/region'
import { useDarkMode } from '../lib/theme'
import { breakdownByShop, cheapestAverageShop, priceDifference, shopsInFirstSeenOrder, summariseProduct } from '../lib/stats'

type Props = { barcode: string; onBack: () => void; onEdit: () => void }

const NO_SHOP = 'none'
const keyOf = (shopId?: number) => (shopId === undefined ? NO_SHOP : String(shopId))

// Everything about one product: stats, price chart, per-shop breakdown and every scan.
export function ProductDetail({ barcode, onBack, onEdit }: Props) {
  const product = useLiveQuery(() => db.products.get(barcode), [barcode])
  const allScans = useLiveQuery(() => db.scans.where('barcode').equals(barcode).toArray(), [barcode])
  // Prices in different currencies are never mixed: the page shows one currency at a time,
  // starting with the currency of your latest scan.
  const currencies = [...new Set([...(allScans ?? [])].sort((a, b) => b.timestamp - a.timestamp).map(currencyOf))]
  const [chosenCurrency, setChosenCurrency] = useState<Currency>()
  const currency = chosenCurrency && currencies.includes(chosenCurrency) ? chosenCurrency : (currencies[0] ?? 'EUR')
  const scans = allScans?.filter((s) => currencyOf(s) === currency)
  const shops = useLiveQuery(() => db.shops.toArray())
  const dark = useDarkMode()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState<number>()
  const [editing, setEditing] = useState<number>()
  // The shop shown in the average price box. Not remembered: the page always opens on the
  // shop with the cheapest average.
  const [chosenShop, setChosenShop] = useState<string>()
  const [pickingShop, setPickingShop] = useState(false)

  const name = product?.name ?? 'Unknown product'
  const shopById = new Map((shops ?? []).map((s): [number, Shop] => [s.id!, s]))
  const shopName = (shopId?: number) => {
    const shop = shopId === undefined ? undefined : shopById.get(shopId)
    return shop ? formatShop(shop) : 'No shop recorded'
  }

  const summary = summariseProduct(scans ?? [])
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
  const cheapest = cheapestAverageShop(byShop)
  const shown = byShop.find((row) => keyOf(row.shopId) === chosenShop) ?? cheapest
  const showingCheapest = !!shown && !!cheapest && keyOf(shown.shopId) === keyOf(cheapest.shopId)
  // Price per kilo or litre of an average, from the pack size.
  const size = product?.quantityValue && product.quantityUnit ? { value: product.quantityValue, unit: product.quantityUnit } : undefined
  const perUnit = (average: number) => {
    if (!size) return undefined
    const { unitPrice, unitBasis } = computeUnitPrice(average, size)
    return formatUnitPrice(unitPrice, unitBasis, currency)
  }
  // How the latest price compares with the average at the shop shown in the box above.
  const fromAverage = summary && shown ? priceDifference(summary.latest.price, shown.average) : { euros: 0, percent: 0 }
  const shownShop = shown?.shopId === undefined ? 'with no shop recorded' : `at ${shopName(shown.shopId)}`
  const averageAt = (shopId?: number) => (shopId === undefined ? 'Average price with no shop recorded' : `Average price at ${shopName(shopId)}`)
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
      <div className="page-top">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
        {product && (
          <button type="button" className="back-button edit-top-button" onClick={onEdit}>
            Edit
          </button>
        )}
      </div>

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
        <p className="category-line">
          Category: <strong>{categoryName(categorise(product))}</strong>
          {!product.category && <span className="product-sub small"> (chosen automatically)</span>}
        </p>
      )}

      {currencies.length > 1 && (
        <div className="sort-chips currency-chips" role="group" aria-label="Show prices in">
          {currencies.map((c) => (
            <button key={c} type="button" className={c === currency ? 'selected' : ''} aria-pressed={c === currency} onClick={() => setChosenCurrency(c)}>
              {CURRENCIES[c].symbol} {CURRENCIES[c].name}
            </button>
          ))}
        </div>
      )}

      {scans && !summary && <p className="placeholder-note">No scans of this product left.</p>}

      {summary && (
        <>
          {shown && (
            <section className="card hero">
              <button
                type="button"
                className="hero-button"
                aria-expanded={pickingShop}
                onClick={() => setPickingShop((open) => !open)}
                disabled={byShop.length < 2}
              >
                <span className="hero-label">{averageAt(shown.shopId)}</span>
                <span className="hero-price-row">
                  <span className="hero-price">{formatPrice(shown.average, currency)}</span>
                  {perUnit(shown.average) && <span className="hero-unit">{perUnit(shown.average)}</span>}
                </span>
                <span className="product-sub">
                  {shown.count === 1 ? 'From 1 scan' : `From ${shown.count} scans`}
                  {byShop.length > 1 && (pickingShop ? ' · choose a shop below' : ' · tap to see another shop')}
                </span>
              </button>
              {pickingShop && (
                <ul className="hero-shops" aria-label="Average price at each shop">
                  {byShop.map((row) => (
                    <li key={keyOf(row.shopId)}>
                      <button
                        type="button"
                        className={keyOf(row.shopId) === keyOf(shown.shopId) ? 'selected' : ''}
                        aria-pressed={keyOf(row.shopId) === keyOf(shown.shopId)}
                        onClick={() => {
                          setChosenShop(keyOf(row.shopId))
                          setPickingShop(false)
                        }}
                      >
                        <span>{shopName(row.shopId)}</span>
                        <span className="hero-shop-price">{formatPrice(row.average, currency)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {cheapest && !showingCheapest && (
            <section className="card lowest-average">
              <p className="lowest-average-label">Lowest average price · {shopName(cheapest.shopId)}</p>
              <p className="lowest-average-value">
                {formatPrice(cheapest.average, currency)}
                {perUnit(cheapest.average) && <span className="product-sub small"> · {perUnit(cheapest.average)}</span>}
              </p>
            </section>
          )}

          <section className="stat-grid">
            <Stat
              label="Latest price"
              value={formatPrice(summary.latest.price, currency)}
              note={[
                summary.latest.unitPrice !== undefined && summary.latest.unitBasis
                  ? formatUnitPrice(summary.latest.unitPrice, summary.latest.unitBasis, currency)
                  : '',
                shopName(summary.latest.shopId),
                formatDaysAgo(summary.latest.timestamp),
              ]
                .filter(Boolean)
                .join(' · ')}
            />
            <Stat
              label="Change from average"
              value={fromAverage.euros === 0 ? 'Same' : formatSignedPrice(fromAverage.euros, currency)}
              note={
                fromAverage.euros === 0
                  ? `Latest price is your average ${shownShop}`
                  : `${fromAverage.percent > 0 ? '+' : ''}${fromAverage.percent}% (latest vs your average ${shownShop})`
              }
              tone={fromAverage.euros > 0 ? 'up' : fromAverage.euros < 0 ? 'down' : undefined}
            />
          </section>

          <section className="card">
            <h2 className="card-heading">Price over time</h2>
            {summary.count < 2 ? (
              <p className="product-sub">The chart appears after your second scan of this product.</p>
            ) : (
              <>
                <PriceChart series={series} dark={dark} currency={currency} />
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
                      <td>{formatPrice(row.latest.price, currency)}</td>
                      <td>{formatPrice(row.lowest, currency)}</td>
                      <td>{formatPrice(row.average, currency)}</td>
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
                      <div>{formatPrice(scan.price, currency)}</div>
                      {scan.unitPrice !== undefined && scan.unitBasis && (
                        <div className="product-sub small">
                          {formatUnitPrice(scan.unitPrice, scan.unitBasis, currency)}
                          {scan.unitPriceSource === 'calculated' && <span className="calc-tag">calc.</span>}
                        </div>
                      )}
                    </div>
                    <div className="history-actions">
                      <button
                        type="button"
                        className="edit-button"
                        aria-label={`Edit the scan from ${formatScanTime(scan.timestamp)}`}
                        onClick={() => {
                          setConfirmingDelete(undefined)
                          setEditing(scan.id)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete-button"
                        aria-label={`Delete the scan from ${formatScanTime(scan.timestamp)}`}
                        onClick={() => {
                          setEditing(undefined)
                          setConfirmingDelete(scan.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {editing === scan.id && <EditScan key={scan.id} scan={scan} product={product} onDone={() => setEditing(undefined)} />}
                  {confirmingDelete === scan.id && (
                    <div className="delete-confirm" role="alert">
                      <p>
                        Delete this scan of {formatPrice(scan.price, currency)}? This can't be undone.
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
