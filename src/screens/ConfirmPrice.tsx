import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type FormEvent } from 'react'
import { PriceComparison } from '../components/PriceComparison'
import { ShopPicker } from '../components/ShopPicker'
import { db, type Product, type Scan, type Shop } from '../lib/db'
import { formatAmountInput, formatPrice, formatShop, parseAmountInput } from '../lib/format'
import type { TagReading } from '../lib/ocr'
import { computeUnitPrice, MAX_PRICE, MAX_UNIT_PRICE, type UnitBasis } from '../lib/priceParser'
import { detectChain, suggestShop } from '../lib/shops'

type Props = {
  product: Product
  // Missing when entering the price by hand without a photo.
  reading?: TagReading
  onSave: (scan: Scan) => void
  onRetake: () => void
  onCancel: () => void
}

// Check and correct the price read from the tag, see how it compares, and save it.
export function ConfirmPrice({ product, reading, onSave, onRetake, onCancel }: Props) {
  const parsed = reading?.parsed
  // A shaky guess isn't filled in: you type the price, and the guess is offered as a suggestion.
  const trusted = parsed?.price !== undefined && (parsed.confidence === 'high' || parsed.confidence === 'medium')
  const suggestions = [...new Set([...(trusted ? [] : [parsed?.price]), ...(parsed?.alternatives ?? [])])].filter(
    (p): p is number => p !== undefined,
  )

  const [priceText, setPriceText] = useState(trusted ? formatAmountInput(parsed.price!) : '')
  // The unit price is "typed" once it's read from the tag or edited; otherwise it's worked out from the pack size.
  const [unitText, setUnitText] = useState(parsed?.unitPrice !== undefined ? formatAmountInput(parsed.unitPrice) : '')
  const [unitTyped, setUnitTyped] = useState(parsed?.unitPrice !== undefined)
  const productBasis: UnitBasis | undefined = product.quantityUnit === 'g' ? 'kg' : product.quantityUnit === 'ml' ? 'L' : undefined
  const [basis, setBasis] = useState<UnitBasis | undefined>(parsed?.unitBasis ?? productBasis)
  const [showErrors, setShowErrors] = useState(false)
  const priceInput = useRef<HTMLInputElement>(null)

  const scans = useLiveQuery(() => db.scans.where('barcode').equals(product.barcode).toArray(), [product.barcode])

  // The shop: whatever you pick, otherwise the suggestion from your last scan or the tag's chain.
  const shops = useLiveQuery(() => db.shops.toArray())
  const lastScan = useLiveQuery(async () => ({ scan: await db.scans.orderBy('timestamp').last() }))
  const shopById = new Map((shops ?? []).map((s): [number, Shop] => [s.id!, s]))
  const chain = detectChain(reading?.rawText)
  const suggestion = shops && lastScan ? suggestShop(lastScan.scan, shops, chain) : undefined
  const [chosenShopId, setChosenShopId] = useState<number>()
  const [picking, setPicking] = useState(false)
  const shopId = chosenShopId ?? suggestion?.shopId
  const shop = shopId === undefined ? undefined : shopById.get(shopId)

  const price = parseAmountInput(priceText)
  const priceError = price === undefined ? 'Enter the price, e.g. 3,49' : price > MAX_PRICE ? `That's over ${MAX_PRICE} €. Check the price.` : ''

  const calculated =
    !unitTyped && price !== undefined && product.quantityValue && product.quantityUnit
      ? computeUnitPrice(price, { value: product.quantityValue, unit: product.quantityUnit })
      : undefined
  const unitPrice = unitTyped ? parseAmountInput(unitText) : calculated?.unitPrice
  const unitBasis = unitTyped ? basis : calculated?.unitBasis
  const unitError =
    unitTyped && unitText.trim() !== ''
      ? unitPrice === undefined
        ? 'Enter the price per kilo or litre, e.g. 11,56'
        : unitPrice > MAX_UNIT_PRICE
          ? 'That price per kilo or litre looks too high.'
          : !unitBasis
            ? 'Choose per kg or per litre.'
            : ''
      : ''

  function enterManually() {
    setPriceText('')
    setUnitText('')
    setUnitTyped(false)
    priceInput.current?.focus()
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (priceError || unitError || price === undefined) {
      setShowErrors(true)
      priceInput.current?.focus()
      return
    }
    // Every scan records its shop.
    if (shopId === undefined) {
      setPicking(true)
      return
    }
    const hasUnit = unitPrice !== undefined && unitBasis !== undefined
    onSave({
      barcode: product.barcode,
      shopId,
      price,
      unitPrice: hasUnit ? unitPrice : undefined,
      unitBasis: hasUnit ? unitBasis : undefined,
      unitPriceSource: hasUnit ? (unitTyped ? 'read' : 'calculated') : undefined,
      timestamp: Date.now(),
      rawOcrText: reading?.rawText,
      tagThumbnail: reading?.thumbnail,
    })
  }

  return (
    <main className="screen">
      {picking && (
        <ShopPicker
          currentId={shopId}
          chain={chain}
          onPick={(id) => {
            setChosenShopId(id)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}

      <div className="step-header">
        <button type="button" className="back-button" onClick={onCancel}>
          Cancel
        </button>
        <p className="step-label">Check the price</p>
        <p className="product-sub">
          {product.name}
          {product.quantityText ? `, ${product.quantityText}` : ''}
        </p>
      </div>

      <div className="shop-row">
        <button type="button" className={`shop-chip${shop ? '' : ' empty'}`} onClick={() => setPicking(true)}>
          {shop ? formatShop(shop) : 'Choose the shop'}
        </button>
        {shop && chosenShopId === undefined && suggestion && (
          <span className="product-sub small">{suggestion.reason === 'session' ? 'Same shop as your last scan' : 'Chain matched from the tag'}</span>
        )}
      </div>

      <form className="card" onSubmit={save} noValidate>
        {!reading && <p className="field-hint">Type the price from the tag.</p>}
        {reading && !trusted && (
          <p className="confidence confidence-low">PriceMe couldn't read the price for sure, so please type it in.</p>
        )}
        {reading && parsed?.confidence === 'medium' && trusted && (
          <p className="confidence confidence-medium">Fairly sure. Check it against the tag.</p>
        )}

        <div className="confirm-prices">
          <label className="price-field">
            <span>Price</span>
            <span className="price-input-wrap">
              <input
                ref={priceInput}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus={!trusted}
                placeholder="0,00"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                aria-invalid={showErrors && !!priceError}
              />
              <span aria-hidden="true">€</span>
            </span>
          </label>

          <label className="unit-field">
            <span>
              Per {unitBasis ?? basis ?? 'kg / L'}
              {!unitTyped && calculated && <span className="calc-tag">calculated</span>}
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={calculated ? formatAmountInput(calculated.unitPrice) : 'optional'}
              value={unitTyped ? unitText : ''}
              onChange={(e) => {
                setUnitText(e.target.value)
                // Clearing the box goes back to the worked-out unit price.
                setUnitTyped(e.target.value.trim() !== '')
              }}
            />
          </label>
        </div>

        {unitTyped && !productBasis && !parsed?.unitBasis && (
          <div className="basis-toggle" role="group" aria-label="Unit">
            {(['kg', 'L'] as const).map((b) => (
              <button key={b} type="button" className={basis === b ? 'selected' : ''} onClick={() => setBasis(b)}>
                per {b === 'kg' ? 'kg' : 'litre'}
              </button>
            ))}
          </div>
        )}

        {showErrors && priceError && <p className="field-error">{priceError}</p>}
        {showErrors && unitError && <p className="field-error">{unitError}</p>}

        {suggestions.length > 0 && (
          <div className="suggestions">
            <span className="product-sub">{trusted ? 'Other prices on the tag:' : 'Possibly:'}</span>
            {suggestions.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => setPriceText(formatAmountInput(s))}>
                {formatPrice(s)}
              </button>
            ))}
          </div>
        )}

        {reading && <img className="reading-image" src={reading.thumbnail} alt="The price tag photo" />}

        <h2 className="comparison-heading">Compared with before</h2>
        {scans && <PriceComparison scans={scans} shops={shopById} shopId={shopId} current={price} />}

        <div className="button-row">
          <button type="submit" className="primary-button">
            Save
          </button>
          <button type="button" className="secondary-button" onClick={onRetake}>
            {reading ? 'Retake photo' : 'Take a photo instead'}
          </button>
          {reading && (
            <button type="button" className="secondary-button" onClick={enterManually}>
              Enter manually
            </button>
          )}
        </div>
      </form>
    </main>
  )
}
