import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { CATEGORIES, categorise, type CategoryId } from '../lib/categories'
import { updateProduct } from '../lib/dataAdmin'
import { db, type Product } from '../lib/db'
import { formatQuantity, quantityFromEntry, quantityToEntry, type EntryUnit } from '../lib/quantity'

type Props = { barcode: string; onDone: () => void }

const UNITS: { id: EntryUnit; label: string }[] = [
  { id: 'g', label: 'grams (g)' },
  { id: 'kg', label: 'kilos (kg)' },
  { id: 'ml', label: 'millilitres (ml)' },
  { id: 'L', label: 'litres (L)' },
]

// Change a product's details: name, brand, weight or volume, and category.
export function ProductEdit({ barcode, onDone }: Props) {
  const product = useLiveQuery(() => db.products.get(barcode), [barcode])
  if (!product) return <main className="screen" />
  // The form starts from the saved product, so it waits until that has loaded.
  return <EditForm product={product} onDone={onDone} />
}

function EditForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const start = product.quantityValue && product.quantityUnit ? quantityToEntry({ value: product.quantityValue, unit: product.quantityUnit }) : undefined
  const [name, setName] = useState(product.name)
  const [brand, setBrand] = useState(product.brand ?? '')
  const [amount, setAmount] = useState(start?.amount ?? '')
  const [unit, setUnit] = useState<EntryUnit>(start?.unit ?? 'g')
  const [category, setCategory] = useState<CategoryId>(categorise(product))
  const [showErrors, setShowErrors] = useState(false)

  const quantity = amount.trim() === '' ? undefined : quantityFromEntry(amount, unit)
  const amountError = amount.trim() !== '' && !quantity ? 'Enter the weight or volume as a number, e.g. 400 or 1,5' : ''
  const nameError = name.trim() === '' ? 'Enter the product name' : ''
  const automatic = categorise({ ...product, category: undefined })

  async function save(event: FormEvent) {
    event.preventDefault()
    if (nameError || amountError) {
      setShowErrors(true)
      return
    }
    const sameQuantity = quantity?.value === product.quantityValue && quantity?.unit === product.quantityUnit
    await updateProduct(product.barcode, {
      name: name.trim(),
      brand: brand.trim() || undefined,
      // An unchanged size keeps its original wording, such as "6 x 33 cl".
      quantityText: quantity ? (sameQuantity && product.quantityText ? product.quantityText : formatQuantity(quantity)) : undefined,
      quantityValue: quantity?.value,
      quantityUnit: quantity?.unit,
      // Choosing the automatic category again goes back to choosing it automatically.
      category: category === automatic && !product.category ? undefined : category,
      updatedAt: Date.now(),
    })
    onDone()
  }

  return (
    <main className="screen">
      <div className="step-header">
        <button type="button" className="back-button" onClick={onDone}>
          Cancel
        </button>
        <h1 className="product-name">Edit product</h1>
        <p className="product-sub small">Barcode {product.barcode}</p>
      </div>

      <form className="card edit-product" onSubmit={save} noValidate>
        <label className="field">
          <span>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={showErrors && !!nameError} />
        </label>
        {showErrors && nameError && <p className="field-error">{nameError}</p>}

        <label className="field">
          <span>Brand (optional)</span>
          <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Lactel" />
        </label>

        <div className="field">
          <span id="size-label">Weight or volume (optional)</span>
          <div className="size-row" role="group" aria-labelledby="size-label">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 400"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Amount"
              aria-invalid={showErrors && !!amountError}
            />
            <select value={unit} onChange={(e) => setUnit(e.target.value as EntryUnit)} aria-label="Unit">
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <span className="product-sub small">Used to work out the price per kilo or litre.</span>
        </div>
        {showErrors && amountError && <p className="field-error">{amountError}</p>}

        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.id === automatic ? ' (automatic)' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="delete-actions">
          <button type="submit" className="primary-button">
            Save changes
          </button>
          <button type="button" className="secondary-button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}
