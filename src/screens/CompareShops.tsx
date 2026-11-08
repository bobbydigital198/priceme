import { useLiveQuery } from 'dexie-react-hooks'
import { setCart, useCart } from '../lib/cart'
import { db, type Scan, type Shop } from '../lib/db'
import { formatDaysAgo, formatPrice, formatShop } from '../lib/format'
import { CURRENCIES, currencyOf, useRegion, type Currency } from '../lib/region'
import { useScannedProducts } from '../lib/scannedProducts'
import { cheapestSplit, compareShops, itemCount, shopsWithPrices, type ListItem } from '../lib/shoppingList'

type Props = { onBack: () => void }

const itemsLabel = (n: number) => (n === 1 ? '1 item' : `${n} items`)

// Which of your chosen shops would be cheapest for the whole shopping list, from your scans.
export function CompareShops({ onBack }: Props) {
  const cart = useCart()
  const region = useRegion()
  const products = useScannedProducts()
  const data = useLiveQuery(async () => ({ scans: await db.scans.toArray(), shops: await db.shops.toArray() }))
  if (!data) return <main className="screen" />

  const shopById = new Map(data.shops.map((s): [number, Shop] => [s.id!, s]))
  const nameOf = (barcode: string) => products?.get(barcode)?.product.name ?? `Unknown product (${barcode})`

  // Prices in different currencies are never added together: compare one currency at a time.
  const wanted = new Set(cart.items.map((i) => i.barcode))
  const currencies = [...new Set(data.scans.filter((s) => wanted.has(s.barcode) && s.shopId !== undefined).map(currencyOf))]
  const currency: Currency =
    cart.currency && currencies.includes(cart.currency) ? cart.currency : currencies.includes(region.currency) ? region.currency : (currencies[0] ?? region.currency)
  const scans = data.scans.filter((s) => currencyOf(s) === currency)
  const price = (amount: number) => formatPrice(amount, currency)

  // Shops with a price for at least one item; favourites first, then by name.
  const candidates = [...shopsWithPrices(cart.items, data.scans, currency)]
    .map((id) => shopById.get(id))
    .filter((s): s is Shop => !!s)
    .sort((a, b) => Number(!!b.favourite) - Number(!!a.favourite) || formatShop(a).localeCompare(formatShop(b), 'fr'))
  const chosenIds = candidates.filter((s) => !cart.shopIds || cart.shopIds.includes(s.id!)).map((s) => s.id!)
  const coverage = (shopId: number) => compareShops(cart.items, [shopId], scans)[0]?.priced.length ?? 0

  function toggleShop(shopId: number) {
    const next = chosenIds.includes(shopId) ? chosenIds.filter((id) => id !== shopId) : [...chosenIds, shopId]
    setCart((c) => ({ ...c, shopIds: next }))
  }
  const chooseAll = (all: boolean) => setCart((c) => ({ ...c, shopIds: all ? undefined : [] }))

  const results = compareShops(cart.items, chosenIds, scans)
  const complete = results.filter((r) => r.missing.length === 0)
  const best = complete[0]
  const split = cheapestSplit(cart.items, chosenIds, scans)
  const splitShops = new Set(split.picks.map((p) => p.shopId))
  const showSplit = splitShops.size > 1 && (!best || split.total < best.total)
  const totalItems = itemCount(cart.items)

  return (
    <main className="screen">
      <div className="step-header">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
        <h1 className="product-name">Cheapest shop</h1>
        <p className="product-sub">
          {cart.name || 'Your list'} · {itemsLabel(totalItems)}
        </p>
      </div>

      {cart.items.length === 0 && <p className="placeholder-note">Your shopping list is empty. Go back and add some products.</p>}

      {currencies.length > 1 && (
        <div className="sort-chips currency-chips" role="group" aria-label="Compare prices in">
          {currencies.map((c) => (
            <button key={c} type="button" className={c === currency ? 'selected' : ''} aria-pressed={c === currency} onClick={() => setCart((cart) => ({ ...cart, currency: c }))}>
              {CURRENCIES[c].symbol} {CURRENCIES[c].name}
            </button>
          ))}
        </div>
      )}

      {cart.items.length > 0 && candidates.length === 0 && (
        <p className="placeholder-note">None of your shops has a price for these products yet. Scan them in a shop first.</p>
      )}

      {candidates.length > 0 && (
        <details className="card shop-chooser">
          <summary>
            <span className="card-heading">Shops to compare</span>
            <span className="product-sub small">
              {chosenIds.length} of {candidates.length} chosen · tap to change
            </span>
          </summary>
          <p className="product-sub small">Untick shops that are too far away. Only shops with a price for at least one item are listed.</p>
          <ul className="check-list">
            {candidates.map((shop) => (
              <li key={shop.id}>
                <label>
                  <input type="checkbox" checked={chosenIds.includes(shop.id!)} onChange={() => toggleShop(shop.id!)} />
                  <span>
                    <span>
                      {formatShop(shop)}
                      {shop.favourite && <span aria-label="Favourite"> ★</span>}
                    </span>
                    <span className="product-sub small">
                      Prices for {coverage(shop.id!)} of {cart.items.length} products
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="list-actions">
            <button type="button" className="text-button" onClick={() => chooseAll(true)}>
              Choose all
            </button>
            <button type="button" className="text-button" onClick={() => chooseAll(false)}>
              Choose none
            </button>
          </div>
        </details>
      )}

      {candidates.length > 0 && chosenIds.length === 0 && <p className="placeholder-note">Choose at least one shop to compare.</p>}

      {best && (
        <section className="card hero">
          <p className="hero-label">Cheapest for your whole list</p>
          <p className="hero-price">{price(best.total)}</p>
          <p className="hero-shop">{shopName(shopById.get(best.shopId))}</p>
          {complete[1] && (
            <p className="product-sub">
              {price(complete[1].total - best.total)} less than {shopName(shopById.get(complete[1].shopId))}
            </p>
          )}
        </section>
      )}

      {!best && results.length > 0 && (
        <section className="card">
          <p className="product-sub">
            None of these shops has a price for every product on your list yet, so the totals below only count the products
            each shop has. Scan the missing ones next time you're there.
          </p>
        </section>
      )}

      {results.length > 0 && (
        <>
          <h2 className="section-heading">Totals by shop</h2>
          <div className="result-list">
            {results.map((result) => (
              <details key={result.shopId} className="card result-card">
                <summary>
                  <span className="result-main">
                    <span className="result-shop">{shopName(shopById.get(result.shopId))}</span>
                    <span className={`product-sub small${result.missing.length ? ' warning-text' : ''}`}>
                      {result.missing.length === 0
                        ? `All ${cart.items.length} products`
                        : `${result.priced.length} of ${cart.items.length} products · missing ${result.missing.map((m) => nameOf(m.barcode)).join(', ')}`}
                    </span>
                  </span>
                  <span className="result-total">{price(result.total)}</span>
                </summary>
                <Breakdown rows={result.priced} nameOf={nameOf} price={price} />
                {result.oldest !== undefined && <p className="product-sub small">Uses your latest price at this shop for each product. Oldest: {formatDaysAgo(result.oldest).replace(/^(Today|Yesterday)/, (w) => w.toLowerCase())}.</p>}
              </details>
            ))}
          </div>
        </>
      )}

      {showSplit && (
        <section className="card">
          <h2 className="card-heading">Cheapest if you split the shop</h2>
          <p className="hero-price small-hero">{price(split.total)}</p>
          <p className="product-sub">
            Buying each product wherever it's cheapest, across {splitShops.size} shops
            {best ? `: ${price(best.total - split.total)} less than ${shopName(shopById.get(best.shopId))} alone.` : '.'}
            {split.missing.length > 0 && ` Not counted: ${split.missing.map((m) => nameOf(m.barcode)).join(', ')}.`}
          </p>
          {[...splitShops].map((shopId) => (
            <div key={shopId} className="split-shop">
              <h3>{shopName(shopById.get(shopId))}</h3>
              <Breakdown rows={split.picks.filter((p) => p.shopId === shopId)} nameOf={nameOf} price={price} />
            </div>
          ))}
        </section>
      )}
    </main>
  )
}

const shopName = (shop: Shop | undefined) => (shop ? formatShop(shop) : 'Unknown shop')

type BreakdownProps = { rows: { item: ListItem; scan: Scan }[]; nameOf: (barcode: string) => string; price: (amount: number) => string }

function Breakdown({ rows, nameOf, price }: BreakdownProps) {
  return (
    <table className="breakdown">
      <tbody>
        {rows.map(({ item, scan }) => (
          <tr key={item.barcode}>
            <th scope="row">
              {nameOf(item.barcode)}
              <span className="product-sub small">
                {item.quantity > 1 ? `${item.quantity} × ${price(scan.price)} · ` : ''}
                {formatDaysAgo(scan.timestamp)}
              </span>
            </th>
            <td>{price(item.quantity * scan.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
