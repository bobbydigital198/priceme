import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { FavouriteButton } from '../components/FavouriteButton'
import { ProductThumb } from '../components/ProductThumb'
import { ShopEditor } from '../components/ShopEditor'
import { db, type Product } from '../lib/db'
import { formatDaysAgo, formatPrice, formatShop } from '../lib/format'
import { currencyOf } from '../lib/region'
import { cheaperHere, productsAtShop, summariseShops } from '../lib/shopStats'
import { priceDifference } from '../lib/stats'

type Props = { shopId: number; onBack: () => void; onOpenProduct: (barcode: string) => void }

// One shop: how often you go, what you buy there and whether it's cheaper than elsewhere.
export function ShopDetail({ shopId, onBack, onOpenProduct }: Props) {
  const data = useLiveQuery(async () => ({
    shop: await db.shops.get(shopId),
    others: (await db.shops.toArray()).filter((s) => s.id !== shopId),
    scans: await db.scans.toArray(),
    products: await db.products.toArray(),
  }), [shopId])
  const [editing, setEditing] = useState(false)

  if (!data) return null
  const { shop, others, scans } = data
  if (!shop) {
    return (
      <main className="screen">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
        <p className="placeholder-note">This shop no longer exists.</p>
      </main>
    )
  }

  const productByBarcode = new Map(data.products.map((p): [string, Product] => [p.barcode, p]))
  const summary = summariseShops(scans).get(shopId)
  const rows = productsAtShop(shopId, scans)
  const { cheaper, compared } = cheaperHere(rows)

  return (
    <main className="screen product-page">
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>
      <div className="shop-title-row">
        <h1 className="product-name">{formatShop(shop)}</h1>
        <FavouriteButton shop={shop} />
      </div>
      {shop.chain && shop.chain !== shop.name && <p className="product-sub">{shop.chain}</p>}

      {summary ? (
        <section className="stat-grid">
          <Stat label="Visits" value={String(summary.visits)} note="days you scanned here" />
          <Stat label="Last visit" value={formatDaysAgo(summary.lastVisit)} note={new Date(summary.lastVisit).toLocaleDateString('en-GB')} />
          <Stat label="Products" value={String(summary.products)} note="different products" />
          <Stat label="Scans" value={String(summary.scans)} note="prices logged" />
        </section>
      ) : (
        <p className="placeholder-note">No scans at this shop yet.</p>
      )}

      {compared > 0 && (
        <section className="card">
          <p className="value-summary">
            Cheaper here for <strong>{cheaper}</strong> of {compared} {compared === 1 ? 'product' : 'products'} you've also bought elsewhere.
          </p>
          <p className="product-sub small">Compares this shop's latest price with your average at other shops.</p>
        </section>
      )}

      {rows.length > 0 && (
        <section className="card">
          <h2 className="card-heading">Bought here</h2>
          <ul className="history-list">
            {rows.map(({ barcode, latestHere, averageElsewhere }) => {
              const product = productByBarcode.get(barcode)
              const name = product?.name ?? `Unknown product (${barcode})`
              const diff = averageElsewhere === undefined ? undefined : priceDifference(latestHere.price, averageElsewhere)
              return (
                <li key={barcode}>
                  <button type="button" className="shop-product-row" onClick={() => onOpenProduct(barcode)}>
                    <ProductThumb imageUrl={product?.imageUrl} name={name} size={44} />
                    <span className="shop-product-name">
                      {name}
                      <span className="product-sub small">{formatDaysAgo(latestHere.timestamp)}</span>
                    </span>
                    <span className="history-price">
                      {formatPrice(latestHere.price, currencyOf(latestHere))}
                      <span className={`compare-badge ${diff === undefined ? '' : diff.euros < 0 ? 'diff-down' : diff.euros > 0 ? 'diff-up' : ''}`}>
                        {diff === undefined
                          ? 'Only bought here'
                          : diff.euros === 0
                            ? 'Same as elsewhere'
                            : `${diff.percent > 0 ? '+' : ''}${diff.percent}% vs elsewhere`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="card">
        {editing ? (
          <>
            <h2 className="card-heading">Edit shop</h2>
            <ShopEditor shop={shop} scanCount={summary?.scans ?? 0} others={others} onSaved={() => setEditing(false)} onRemoved={onBack} />
            <button type="button" className="text-button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="secondary-button" onClick={() => setEditing(true)}>
            Rename, merge or delete this shop
          </button>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-note">{note}</p>
    </div>
  )
}
