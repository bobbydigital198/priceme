import { useRef, useState, type FormEvent } from 'react'
import { BarcodeCamera } from '../components/BarcodeCamera'
import { BarcodeIcon } from '../components/BarcodeIcon'
import { OffCredit } from '../components/Credits'
import { ProductThumb } from '../components/ProductThumb'
import { normaliseBarcode } from '../lib/barcode'
import { CATEGORIES, categorise, type CategoryId } from '../lib/categories'
import { db, type Product } from '../lib/db'
import { fetchProduct } from '../lib/openFoodFacts'
import { parseQuantity } from '../lib/quantity'

type Props = { onCancel: () => void; onConfirm: (product: Product) => void }

type Step =
  | { kind: 'scanning' }
  | { kind: 'camera-error'; message: string }
  | { kind: 'typing' }
  | { kind: 'looking-up'; barcode: string }
  | { kind: 'found'; product: Product }
  | { kind: 'not-found'; barcode: string }
  | { kind: 'lookup-failed'; barcode: string }

const STEP_LABEL = 'Step 1 of 2: scan the barcode'

export function BarcodeScan({ onCancel, onConfirm }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'scanning' })
  // Ignores a slow lookup if the user has since moved on.
  const lookupId = useRef(0)

  async function lookUp(barcode: string) {
    const id = ++lookupId.current
    setStep({ kind: 'looking-up', barcode })

    const cached = await db.products.get(barcode)
    if (cached) {
      if (id === lookupId.current) setStep({ kind: 'found', product: cached })
      return
    }
    try {
      const product = await fetchProduct(barcode)
      if (id !== lookupId.current) return
      setStep(product ? { kind: 'found', product } : { kind: 'not-found', barcode })
    } catch {
      if (id === lookupId.current) setStep({ kind: 'lookup-failed', barcode })
    }
  }

  function handleDetected(barcode: string) {
    navigator.vibrate?.(80)
    lookUp(barcode)
  }

  function rescan() {
    lookupId.current++
    setStep({ kind: 'scanning' })
  }

  if (step.kind === 'scanning') {
    return (
      <main className="camera-screen">
        <BarcodeCamera onDetected={handleDetected} onError={(message) => setStep({ kind: 'camera-error', message })} />
        <div className="camera-overlay">
          <div className="camera-top">
            <button type="button" className="camera-button" onClick={onCancel}>
              Cancel
            </button>
            <p className="camera-label">{STEP_LABEL}</p>
          </div>
          <BarcodeIcon className="camera-guide" />
          <div className="camera-bottom">
            <p className="camera-hint">Hold the barcode flat and level inside the frame.</p>
            <button type="button" className="camera-button" onClick={() => setStep({ kind: 'typing' })}>
              Type barcode instead
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="step-header">
        <button type="button" className="back-button" onClick={onCancel}>
          Cancel
        </button>
        <p className="step-label">{STEP_LABEL}</p>
      </div>

      {step.kind === 'camera-error' && (
        <section className="card">
          <h2>Camera unavailable</h2>
          <p>{step.message}</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={rescan}>
              Try again
            </button>
            <button type="button" className="secondary-button" onClick={() => setStep({ kind: 'typing' })}>
              Type barcode instead
            </button>
          </div>
        </section>
      )}

      {step.kind === 'typing' && <TypeBarcode onSubmit={lookUp} onRescan={rescan} />}

      {step.kind === 'looking-up' && (
        <section className="card" aria-busy="true">
          <h2>Looking up {step.barcode}</h2>
          <p>Checking Open Food Facts…</p>
        </section>
      )}

      {step.kind === 'found' && (
        <section className="card">
          <div className="product-card">
            <ProductThumb imageUrl={step.product.imageUrl} name={step.product.name} size={120} />
            <div>
              <h2 className="product-name">{step.product.name}</h2>
              {step.product.brand && <p className="product-sub">{step.product.brand}</p>}
              {step.product.quantityText && <p className="product-sub">{step.product.quantityText}</p>}
              <p className="product-sub small">Barcode {step.product.barcode}</p>
              {step.product.source === 'openfoodfacts' && <OffCredit />}
            </div>
          </div>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => onConfirm(step.product)}>
              Confirm
            </button>
            <button type="button" className="secondary-button" onClick={rescan}>
              Rescan
            </button>
          </div>
        </section>
      )}

      {step.kind === 'lookup-failed' && (
        <section className="card">
          <h2>Couldn't reach Open Food Facts</h2>
          <p>Check your internet connection and try again, or enter the product details yourself.</p>
          <p className="product-sub small">Barcode {step.barcode}</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => lookUp(step.barcode)}>
              Try again
            </button>
            <button type="button" className="secondary-button" onClick={() => setStep({ kind: 'not-found', barcode: step.barcode })}>
              Enter details
            </button>
          </div>
        </section>
      )}

      {step.kind === 'not-found' && <ManualProduct barcode={step.barcode} onSubmit={onConfirm} onRescan={rescan} />}
    </main>
  )
}

function TypeBarcode({ onSubmit, onRescan }: { onSubmit: (barcode: string) => void; onRescan: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const barcode = normaliseBarcode(value)
    if (barcode) onSubmit(barcode)
    else setError("That barcode doesn't look right. Check the digits under the bars and try again.")
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Type the barcode</h2>
      <label className="field">
        <span>The numbers under the bars</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
        />
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="button-row">
        <button type="submit" className="primary-button">
          Look up
        </button>
        <button type="button" className="secondary-button" onClick={onRescan}>
          Scan instead
        </button>
      </div>
    </form>
  )
}

function ManualProduct({ barcode, onSubmit, onRescan }: { barcode: string; onSubmit: (product: Product) => void; onRescan: () => void }) {
  const [name, setName] = useState('')
  const [quantityText, setQuantityText] = useState('')
  const quantity = parseQuantity(quantityText)
  // Guessed from the name as you type, until you pick one yourself.
  const [chosenCategory, setChosenCategory] = useState<CategoryId>()
  const category = chosenCategory ?? categorise({ name })

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = quantityText.trim()
    onSubmit({
      barcode,
      name: name.trim(),
      quantityText: trimmed || undefined,
      quantityValue: quantity?.value,
      quantityUnit: quantity?.unit,
      source: 'manual',
      category: chosenCategory,
      updatedAt: Date.now(),
    })
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Product not found</h2>
      <p>Open Food Facts and its sister databases don't know barcode {barcode}. Enter the details and PrixIt will remember them.</p>
      <label className="field">
        <span>Product name</span>
        <input type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Quantity (optional), e.g. 400 g, 1 L or 6 x 33 cl</span>
        <input type="text" value={quantityText} onChange={(e) => setQuantityText(e.target.value)} />
      </label>
      <label className="field">
        <span>Category</span>
        <select value={category} onChange={(e) => setChosenCategory(e.target.value as CategoryId)}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {quantityText.trim() && !quantity && (
        <p className="field-hint">PrixIt can't read that quantity, so it won't work out the price per kilo or litre.</p>
      )}
      <div className="button-row">
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Continue
        </button>
        <button type="button" className="secondary-button" onClick={onRescan}>
          Rescan
        </button>
      </div>
    </form>
  )
}
