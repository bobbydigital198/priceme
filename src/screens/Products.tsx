import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { MenuButton } from '../components/Menu'
import { ProductThumb } from '../components/ProductThumb'
import { CATEGORIES, categorise, type CategoryId } from '../lib/categories'
import { db, type Product, type Scan } from '../lib/db'
import { formatPrice, formatScanCount } from '../lib/format'
import { currencyOf } from '../lib/region'
import { fetchCategoryTags } from '../lib/openFoodFacts'
import { rememberedOpen, rememberedView, rememberOpen, rememberScroll, rememberView, takeScroll, type ProductsView } from '../lib/productsMemory'

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
type View = ProductsView

const NO_BRAND = 'No brand'

// Every category (or every brand), with the products you've scanned sorted into them.
export function Products({ onOpenMenu, onOpenProduct }: Props) {
  const data = useLiveQuery(async () => ({ products: await db.products.toArray(), scans: await db.scans.toArray() }))
  const [view, setViewState] = useState<View>(rememberedView)
  const [open, setOpenState] = useState<Set<string>>(rememberedOpen)

  useEffect(() => {
    backfillCategoryTags()
  }, [])

  // Back from a product: return to where you were once the list has loaded.
  useEffect(() => {
    if (!data) return
    const y = takeScroll()
    if (y !== undefined) window.scrollTo(0, y)
  }, [data])

  function setView(next: View) {
    rememberView(next)
    setViewState(next)
  }

  function openProduct(barcode: string) {
    rememberScroll(window.scrollY)
    onOpenProduct(barcode)
  }

  // Only products you've logged a price for; each counts once however often you've scanned it.
  const byBarcode = new Map<string, { latest: Scan; count: number }>()
  for (const scan of data?.scans ?? []) {
    const current = byBarcode.get(scan.barcode)
    byBarcode.set(scan.barcode, {
      latest: !current || scan.timestamp > current.latest.timestamp ? scan : current.latest,
      count: (current?.count ?? 0) + 1,
    })
  }
  const rows: Row[] = (data?.products ?? [])
    .flatMap((product) => {
      const scans = byBarcode.get(product.barcode)
      return scans ? [{ product, ...scans }] : []
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'fr'))
  const total = rows.length

  const byCategory = new Map<CategoryId, Row[]>()
  for (const row of rows) {
    const id = categorise(row.product)
    byCategory.set(id, [...(byCategory.get(id) ?? []), row])
  }

  // Brands are grouped however they're capitalised; products without one go last.
  const byBrand = new Map<string, { name: string; rows: Row[] }>()
  for (const row of rows) {
    const name = row.product.brand?.trim() || NO_BRAND
    const key = name === NO_BRAND ? NO_BRAND : name.toLocaleLowerCase('fr')
    const group = byBrand.get(key) ?? { name, rows: [] }
    // Shown with a capital if any product spells it that way ("Barilla", not "barilla").
    if (group.name === group.name.toLocaleLowerCase('fr') && name !== name.toLocaleLowerCase('fr')) group.name = name
    group.rows.push(row)
    byBrand.set(key, group)
  }
  const brands = [...byBrand.entries()].sort(([a, ga], [b, gb]) =>
    a === NO_BRAND ? 1 : b === NO_BRAND ? -1 : ga.name.localeCompare(gb.name, 'fr', { sensitivity: 'base' }),
  )

  function toggle(key: string) {
    setOpenState((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      rememberOpen(next)
      return next
    })
  }

  const group = (key: string, name: string, groupRows: Row[]) => (
    <ProductGroup key={key} name={name} rows={groupRows} isOpen={open.has(key)} onToggle={() => toggle(key)} onOpenProduct={openProduct} />
  )

  return (
    <main className="screen">
      <header className="section-header">
        <MenuButton onClick={onOpenMenu} />
        <h1>Products</h1>
      </header>

      <div className="sort-chips view-chips" role="group" aria-label="Browse products">
        {(
          [
            ['category', 'By category'],
            ['brand', 'By brand'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={view === id ? 'selected' : ''} aria-pressed={view === id} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>

      {data && (
        <p className="product-sub">
          {total === 0
            ? 'Products appear here once you log a price for them.'
            : `${total} ${total === 1 ? 'product' : 'products'} you've scanned, by ${view}. Tap a ${view} to see them.`}
        </p>
      )}

      {view === 'category' &&
        GROUPS.map((g) => (
          <section key={g.id} className="category-group">
            <h2 className="section-heading">{g.name}</h2>
            <ul className="category-list">
              {CATEGORIES.filter((c) => c.group === g.id).map((category) => group(`category:${category.id}`, category.name, byCategory.get(category.id) ?? []))}
            </ul>
          </section>
        ))}

      {view === 'brand' && brands.length > 0 && (
        <section className="category-group">
          <ul className="category-list">{brands.map(([key, b]) => group(`brand:${key}`, b.name, b.rows))}</ul>
        </section>
      )}
    </main>
  )
}

type GroupProps = { name: string; rows: Row[]; isOpen: boolean; onToggle: () => void; onOpenProduct: (barcode: string) => void }

// One category or brand: a row you tap to show or hide its products. Empty ones are greyed out.
function ProductGroup({ name, rows, isOpen: wantsOpen, onToggle, onOpenProduct }: GroupProps) {
  const isOpen = wantsOpen && rows.length > 0
  return (
    <li>
      <button
        type="button"
        className={`category-row${rows.length ? '' : ' empty'}`}
        disabled={!rows.length}
        aria-expanded={rows.length ? isOpen : undefined}
        onClick={onToggle}
      >
        <span>
          {name}
          {rows.length > 0 && <span className="category-count"> ({rows.length})</span>}
        </span>
        {rows.length > 0 && (
          <span className="chevron" aria-hidden="true">
            {isOpen ? '−' : '+'}
          </span>
        )}
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
                <span className="history-price">{formatPrice(latest.price, currencyOf(latest))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
