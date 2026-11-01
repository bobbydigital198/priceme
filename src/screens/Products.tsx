import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { MenuButton } from '../components/Menu'
import { ProductThumb } from '../components/ProductThumb'
import { CATEGORIES, categorise, type CategoryId } from '../lib/categories'
import { db, type Product, type Scan } from '../lib/db'
import { formatPrice, formatScanCount } from '../lib/format'
import { fetchCategoryTags } from '../lib/openFoodFacts'

type Props = { onOpenMenu: () => void; onOpenProduct: (barcode: string) => void }

const GROUPS = [
  { id: 'food', name: 'Food & drink' },
  { id: 'household', name: 'Household & personal' },
] as const

let backfillStarted = false

// Products saved before categories existed have no Open Food Facts tags yet: fetch them once, quietly.
// If you're offline they're sorted by name for now and checked again next time.
async function backfillCategoryTags() {
  if (backfillStarted) return
  backfillStarted = true
  const missing = await db.products.filter((p) => p.source === 'openfoodfacts' && p.categoryTags === undefined).toArray()
  for (const product of missing) {
    try {
      const categoryTags = await fetchCategoryTags(product.barcode, product.lookupSource)
      await db.products.update(product.barcode, { categoryTags })
    } catch {
      backfillStarted = false
      return
    }
  }
}

type Row = { product: Product; latest: Scan; count: number }

// Every category, with the products you've scanned sorted into them.
export function Products({ onOpenMenu, onOpenProduct }: Props) {
  const data = useLiveQuery(async () => ({ products: await db.products.toArray(), scans: await db.scans.toArray() }))
  const [open, setOpen] = useState<Set<CategoryId>>(new Set())

  useEffect(() => {
    backfillCategoryTags()
  }, [])

  // Only products you've logged a price for; each counts once however often you've scanned it.
  const byBarcode = new Map<string, { latest: Scan; count: number }>()
  for (const scan of data?.scans ?? []) {
    const current = byBarcode.get(scan.barcode)
    byBarcode.set(scan.barcode, {
      latest: !current || scan.timestamp > current.latest.timestamp ? scan : current.latest,
      count: (current?.count ?? 0) + 1,
    })
  }
  const byCategory = new Map<CategoryId, Row[]>()
  for (const product of data?.products ?? []) {
    const scans = byBarcode.get(product.barcode)
    if (!scans) continue
    const id = categorise(product)
    byCategory.set(id, [...(byCategory.get(id) ?? []), { product, ...scans }])
  }
  const total = [...byCategory.values()].reduce((n, rows) => n + rows.length, 0)

  function toggle(id: CategoryId) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main className="screen">
      <header className="section-header">
        <MenuButton onClick={onOpenMenu} />
        <h1>Products</h1>
      </header>
      {data && (
        <p className="product-sub">
          {total === 0 ? 'Products appear here once you log a price for them.' : `${total} ${total === 1 ? 'product' : 'products'} you've scanned, by category. Tap a category to see them.`}
        </p>
      )}

      {GROUPS.map((group) => (
        <section key={group.id} className="category-group">
          <h2 className="section-heading">{group.name}</h2>
          <ul className="category-list">
            {CATEGORIES.filter((c) => c.group === group.id).map((category) => {
              const rows = (byCategory.get(category.id) ?? []).sort((a, b) => a.product.name.localeCompare(b.product.name, 'fr'))
              const isOpen = open.has(category.id) && rows.length > 0
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    className={`category-row${rows.length ? '' : ' empty'}`}
                    disabled={!rows.length}
                    aria-expanded={rows.length ? isOpen : undefined}
                    onClick={() => toggle(category.id)}
                  >
                    <span>
                      {category.name}
                      {rows.length > 0 && <span className="category-count"> ({rows.length})</span>}
                    </span>
                    {rows.length > 0 && <span className="chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>}
                  </button>
                  {isOpen && (
                    <ul className="category-products">
                      {rows.map(({ product, latest, count }) => (
                        <li key={product.barcode}>
                          <button type="button" className="shop-product-row" onClick={() => onOpenProduct(product.barcode)}>
                            <ProductThumb imageUrl={product.imageUrl} name={product.name} size={44} />
                            <span className="shop-product-name">
                              {product.name}
                              <span className="product-sub small">{[product.brand, formatScanCount(count)].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span className="history-price">{formatPrice(latest.price)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}
