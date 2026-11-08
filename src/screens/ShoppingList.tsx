import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { MenuButton } from '../components/Menu'
import { ProductPicker } from '../components/ProductPicker'
import { ProductThumb } from '../components/ProductThumb'
import { QuantityStepper } from '../components/QuantityStepper'
import { clearCart, deleteList, hasUnsavedChanges, openList, saveCartAsNewList, saveCartChanges, setCart, useCart } from '../lib/cart'
import { db, type ShoppingList as SavedList } from '../lib/db'
import { formatDaysAgo } from '../lib/format'
import { useScannedProducts } from '../lib/scannedProducts'
import { itemCount, setQuantity } from '../lib/shoppingList'

type Props = { onOpenMenu: () => void; onCompare: () => void }

const itemsLabel = (n: number) => (n === 1 ? '1 item' : `${n} items`)

// Build a shopping list from products you've scanned, see which shop is cheapest for it,
// and keep lists you use often under "My shopping lists".
export function ShoppingList({ onOpenMenu, onCompare }: Props) {
  const cart = useCart()
  const products = useScannedProducts()
  const savedLists = useLiveQuery(() => db.lists.orderBy('updatedAt').reverse().toArray())
  const saved = savedLists?.find((l) => l.id === cart.listId)
  const unsaved = hasUnsavedChanges(cart, saved)
  const [picking, setPicking] = useState(false)
  const [naming, setNaming] = useState<'new' | 'rename'>()
  const [nameText, setNameText] = useState('')
  const [confirm, setConfirm] = useState<{ kind: 'open'; list: SavedList } | { kind: 'clear' } | { kind: 'delete' }>()
  const [message, setMessage] = useState<string>()

  const change = (barcode: string, quantity: number) => setCart((c) => ({ ...c, items: setQuantity(c.items, barcode, quantity) }))

  function startNaming(kind: 'new' | 'rename') {
    setNaming(kind)
    setNameText(kind === 'rename' ? cart.name : '')
    setConfirm(undefined)
  }

  async function submitName(event: FormEvent) {
    event.preventDefault()
    const name = nameText.trim()
    if (!name) return
    if (naming === 'rename') {
      setCart((c) => ({ ...c, name }))
      await saveCartChanges()
      setMessage(`Renamed to “${name}”.`)
    } else {
      await saveCartAsNewList(name)
      setMessage(`Saved as “${name}” in My shopping lists.`)
    }
    setNaming(undefined)
  }

  async function saveChanges() {
    await saveCartChanges()
    setMessage(`Saved changes to “${cart.name}”.`)
  }

  function open(list: SavedList) {
    // Opening another list replaces the one you're working on, so check first if it isn't saved.
    if (hasUnsavedChanges(cart, saved) && list.id !== cart.listId) {
      setConfirm({ kind: 'open', list })
      return
    }
    openList(list)
    setConfirm(undefined)
    setMessage(undefined)
    window.scrollTo(0, 0)
  }

  return (
    <main className="screen">
      {picking && products && <ProductPicker products={products} onClose={() => setPicking(false)} />}

      <header className="section-header">
        <MenuButton onClick={onOpenMenu} />
        <h1>Shopping list</h1>
      </header>

      <section className="card">
        <div className="list-title-row">
          <h2 className="card-heading">{saved ? cart.name : 'Your list'}</h2>
          {saved && <span className="saved-tag">{unsaved ? 'Unsaved changes' : 'Saved'}</span>}
        </div>

        {cart.items.length === 0 ? (
          <p className="product-sub">Add products you've scanned, then see which of your shops would be cheapest for the whole list.</p>
        ) : (
          <ul className="list-rows">
            {cart.items.map((item) => {
              const found = products?.get(item.barcode)
              const name = found?.product.name ?? `Unknown product (${item.barcode})`
              return (
                <li key={item.barcode} className="list-row">
                  <ProductThumb imageUrl={found?.product.imageUrl} name={name} size={44} />
                  <span className="list-row-name">
                    {name}
                    {(found?.product.brand || found?.product.quantityText) && (
                      <span className="product-sub small">{[found.product.brand, found.product.quantityText].filter(Boolean).join(' · ')}</span>
                    )}
                  </span>
                  <QuantityStepper name={name} quantity={item.quantity} onChange={(q) => change(item.barcode, q)} />
                </li>
              )
            })}
          </ul>
        )}

        <div className="button-row">
          {cart.items.length > 0 && (
            <button type="button" className="primary-button" onClick={onCompare}>
              Find the cheapest shop
            </button>
          )}
          <button type="button" className={cart.items.length === 0 ? 'primary-button' : 'secondary-button'} onClick={() => setPicking(true)}>
            {cart.items.length === 0 ? 'Add products' : 'Add more products'}
          </button>
        </div>

        {cart.items.length > 0 && (
          <p className="product-sub small">
            {itemsLabel(itemCount(cart.items))}
            {cart.items.length !== itemCount(cart.items) ? ` (${cart.items.length} different products)` : ''}
          </p>
        )}

        {naming ? (
          <form className="name-form" onSubmit={submitName}>
            <label className="field">
              <span>{naming === 'rename' ? 'New name' : 'Name this list'}</span>
              <input type="text" autoFocus maxLength={60} placeholder="e.g. Weekend shop" value={nameText} onChange={(e) => setNameText(e.target.value)} />
            </label>
            <div className="delete-actions">
              <button type="submit" className="primary-button" disabled={!nameText.trim()}>
                Save
              </button>
              <button type="button" className="secondary-button" onClick={() => setNaming(undefined)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="list-actions">
            {saved && unsaved && (
              <button type="button" className="text-button" onClick={saveChanges}>
                Save changes
              </button>
            )}
            {!saved && cart.items.length > 0 && (
              <button type="button" className="text-button" onClick={() => startNaming('new')}>
                Save list
              </button>
            )}
            {saved && (
              <>
                <button type="button" className="text-button" onClick={() => startNaming('new')}>
                  Save as a new list
                </button>
                <button type="button" className="text-button" onClick={() => startNaming('rename')}>
                  Rename
                </button>
              </>
            )}
            {(cart.items.length > 0 || saved) && (
              <button type="button" className="text-button" onClick={() => setConfirm({ kind: 'clear' })}>
                {saved ? 'Start a new list' : 'Clear list'}
              </button>
            )}
            {saved && (
              <button type="button" className="text-button danger-text" onClick={() => setConfirm({ kind: 'delete' })}>
                Delete saved list
              </button>
            )}
          </div>
        )}

        {message && !naming && (
          <p className="product-sub small" role="status">
            {message}
          </p>
        )}

        {confirm?.kind === 'clear' && (
          <ConfirmBox
            text={
              saved
                ? unsaved
                  ? `Start a new list? Your unsaved changes to “${cart.name}” will be lost.`
                  : `Start a new list? “${cart.name}” stays in My shopping lists.`
                : 'Clear this list? It isn’t saved.'
            }
            action={saved ? 'Start a new list' : 'Clear list'}
            onConfirm={() => {
              clearCart()
              setConfirm(undefined)
              setMessage(undefined)
            }}
            onCancel={() => setConfirm(undefined)}
          />
        )}
        {confirm?.kind === 'delete' && saved && (
          <ConfirmBox
            text={`Delete “${saved.name}” from My shopping lists? This can't be undone.`}
            action="Delete list"
            danger
            onConfirm={async () => {
              await deleteList(saved.id!)
              setConfirm(undefined)
              setMessage(`Deleted “${saved.name}”. The products are still on your list until you clear it.`)
            }}
            onCancel={() => setConfirm(undefined)}
          />
        )}
      </section>

      <h2 className="section-heading">My shopping lists</h2>
      {savedLists && savedLists.length === 0 && (
        <p className="placeholder-note">No saved lists yet. Make a list above and tap Save list to keep it here.</p>
      )}
      {confirm?.kind === 'open' && (
        <ConfirmBox
          text={`Open “${confirm.list.name}”? ${cart.listId === undefined ? 'The list you’re working on isn’t saved and will be replaced.' : `Your unsaved changes to “${cart.name}” will be lost.`}`}
          action="Open it"
          onConfirm={() => {
            openList(confirm.list)
            setConfirm(undefined)
            setMessage(undefined)
            window.scrollTo(0, 0)
          }}
          onCancel={() => setConfirm(undefined)}
        />
      )}
      {savedLists && savedLists.length > 0 && (
        <ul className="saved-lists">
          {savedLists.map((list) => (
            <li key={list.id}>
              <button type="button" className={list.id === cart.listId ? 'selected' : ''} onClick={() => open(list)}>
                <span className="saved-list-name">{list.name}</span>
                <span className="product-sub small">
                  {itemsLabel(itemCount(list.items))} · updated {formatDaysAgo(list.updatedAt).replace(/^(Today|Yesterday)/, (w) => w.toLowerCase())}
                  {list.id === cart.listId ? ' · open above' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

type ConfirmProps = { text: string; action: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }

function ConfirmBox({ text, action, danger, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="delete-confirm" role="alert">
      <p>{text}</p>
      <div className="delete-actions">
        <button type="button" className={danger ? 'danger-button' : 'primary-button'} onClick={onConfirm}>
          {action}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
