import { useState } from 'react'
import { setCart, useCart } from '../lib/cart'
import { CATEGORIES, categorise } from '../lib/categories'
import { formatPrice } from '../lib/format'
import { currencyOf } from '../lib/region'
import type { ScannedProduct } from '../lib/scannedProducts'
import { itemCount, setQuantity } from '../lib/shoppingList'
import { ProductThumb } from './ProductThumb'
import { QuantityStepper } from './QuantityStepper'

type Props = { products: Map<string, ScannedProduct>; onClose: () => void }

const simplify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Full-screen list of the products you've scanned, grouped by category, for adding to the list.
export function ProductPicker({ products, onClose }: Props) {
  const cart = useCart()
  const [search, setSearch] = useState('')
  const quantityOf = new Map(cart.items.map((i) => [i.barcode, i.quantity]))
  const change = (barcode: string, quantity: number) => setCart((c) => ({ ...c, items: setQuantity(c.items, barcode, quantity) }))

  const words = simplify(search).split(/\s+/).filter(Boolean)
  const matches = [...products.values()]
    .filter(({ product }) => {
      const text = simplify([product.name, product.brand, product.quantityText].filter(Boolean).join(' '))
      return words.every((w) => text.includes(w))
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'fr'))
  const groups = CATEGORIES.map((category) => ({
    category,
    rows: matches.filter(({ product }) => categorise(product) === category.id),
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Add products">
      <main className="screen picker-screen">
        <div className="step-header">
          <button type="button" className="back-button" onClick={onClose}>
            Done
          </button>
          <h1 className="product-name">Add products</h1>
        </div>

        <label className="field picker-search">
          <span className="visually-hidden">Search your products</span>
          <input type="search" placeholder="Search your products" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        {products.size === 0 && <p className="placeholder-note">Products appear here once you've scanned their price.</p>}
        {products.size > 0 && groups.length === 0 && <p className="placeholder-note">No products match “{search}”.</p>}

        {groups.map(({ category, rows }) => (
          <section key={category.id}>
            <h2 className="section-heading">{category.name}</h2>
            <ul className="list-rows">
              {rows.map(({ product, latest }) => {
                const quantity = quantityOf.get(product.barcode) ?? 0
                return (
                  <li key={product.barcode} className={`list-row${quantity ? ' in-list' : ''}`}>
                    <ProductThumb imageUrl={product.imageUrl} name={product.name} size={44} />
                    <span className="list-row-name">
                      {product.name}
                      <span className="product-sub small">
                        {[product.brand, product.quantityText, formatPrice(latest.price, currencyOf(latest))].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {quantity === 0 ? (
                      <button type="button" className="add-button" aria-label={`Add ${product.name}`} onClick={() => change(product.barcode, 1)}>
                        Add
                      </button>
                    ) : (
                      <QuantityStepper name={product.name} quantity={quantity} onChange={(q) => change(product.barcode, q)} />
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </main>

      <div className="picker-footer">
        <button type="button" className="primary-button" onClick={onClose}>
          {cart.items.length === 0 ? 'Done' : `Done · ${itemCount(cart.items)} ${itemCount(cart.items) === 1 ? 'item' : 'items'}`}
        </button>
      </div>
    </div>
  )
}
