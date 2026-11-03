import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { FavouriteButton } from '../components/FavouriteButton'
import { MenuButton } from '../components/Menu'
import { ShopPicker } from '../components/ShopPicker'
import { db } from '../lib/db'
import { formatDaysAgo, formatShop } from '../lib/format'
import { summariseShops } from '../lib/shopStats'

type Props = { onOpenMenu: () => void; onOpenShop: (shopId: number) => void }
type Sort = 'recent' | 'visits' | 'favourites'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function Shops({ onOpenMenu, onOpenShop }: Props) {
  const data = useLiveQuery(async () => ({ shops: await db.shops.toArray(), scans: await db.scans.toArray() }))
  const [sort, setSort] = useState<Sort>('recent')
  const [adding, setAdding] = useState(false)

  const summaries = summariseShops(data?.scans ?? [])
  const allRows = (data?.shops ?? []).map((shop) => ({ shop, summary: summaries.get(shop.id!) }))
  // Favourites shows only your starred shops, most recent first.
  const rows = allRows
    .filter(({ shop }) => sort !== 'favourites' || shop.favourite)
    .sort((a, b) =>
      sort === 'visits'
        ? (b.summary?.visits ?? 0) - (a.summary?.visits ?? 0) || (b.summary?.scans ?? 0) - (a.summary?.scans ?? 0)
        : (b.summary?.lastVisit ?? b.shop.lastUsed) - (a.summary?.lastVisit ?? a.shop.lastUsed),
    )

  return (
    <main className="screen">
      {adding && <ShopPicker title="Add a shop" showSaved={false} onPick={() => setAdding(false)} onClose={() => setAdding(false)} />}

      <header className="section-header">
        <MenuButton onClick={onOpenMenu} />
        <h1>Shops</h1>
      </header>

      <div className="list-toolbar">
        <h2 className="section-heading">Your shops</h2>
        {allRows.length > 0 && (
          <div className="sort-chips" role="group" aria-label="Sort shops">
            {(
              [
                ['recent', 'Recent'],
                ['visits', 'Most visited'],
                ['favourites', 'Favourites'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={sort === id ? 'selected' : ''} aria-pressed={sort === id} onClick={() => setSort(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {data && allRows.length > 0 && rows.length === 0 && (
        <section className="empty-state">
          <h2>No favourites yet</h2>
          <p>Tap the star on a shop to make it a favourite. Favourites come first when you choose a shop for a scan.</p>
        </section>
      )}

      {data && allRows.length === 0 && (
        <section className="empty-state">
          <h2>No shops yet</h2>
          <p>Shops are added when you save a scan, or you can add one now.</p>
        </section>
      )}

      <ul className="scan-list">
        {rows.map(({ shop, summary }) => (
          <li key={shop.id} className="shop-card-item">
            <button type="button" className="shop-card" onClick={() => onOpenShop(shop.id!)}>
              <span className="shop-card-name">{formatShop(shop)}</span>
              {shop.chain && shop.chain !== shop.name && <span className="product-sub small">{shop.chain}</span>}
              <span className="scan-row-meta">
                {summary ? (
                  <>
                    <span>{plural(summary.visits, 'visit')}</span>
                    <span>{plural(summary.products, 'product')}</span>
                    <span>Last visit {formatDaysAgo(summary.lastVisit)}</span>
                  </>
                ) : (
                  <span>No scans yet</span>
                )}
              </span>
            </button>
            <FavouriteButton shop={shop} />
          </li>
        ))}
      </ul>

      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => setAdding(true)}>
          Add a shop
        </button>
      </div>
    </main>
  )
}
