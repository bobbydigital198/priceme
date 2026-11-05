import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db, type Product, type Scan } from '../lib/db'
import { formatAmountInput, formatPrice, formatShop, parseAmountInput } from '../lib/format'
import { computeUnitPrice, MAX_PRICE, MAX_UNIT_PRICE } from '../lib/priceParser'
import { CURRENCIES, currencyOf } from '../lib/region'
import { ShopPicker } from './ShopPicker'

type Props = { scan: Scan; product?: Product; onDone: () => void }

// Correct a saved scan: its price, price per kilo or litre, and shop. The date stays the same.
export function EditScan({ scan, product, onDone }: Props) {
  const wasCalculated = scan.unitPriceSource === 'calculated'
  const [priceText, setPriceText] = useState(formatAmountInput(scan.price, currencyOf(scan)))
  // A worked-out unit price keeps following the price until you type your own.
  const [unitTyped, setUnitTyped] = useState(!wasCalculated)
  const [unitText, setUnitText] = useState(scan.unitPrice !== undefined && !wasCalculated ? formatAmountInput(scan.unitPrice, currencyOf(scan)) : '')
  const [shopId, setShopId] = useState(scan.shopId)
  const [picking, setPicking] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const shop = useLiveQuery(() => (shopId === undefined ? undefined : db.shops.get(shopId)), [shopId])
  // Moving the scan to another shop gives it that shop's currency.
  const currency = shop ? currencyOf(shop) : currencyOf(scan)

  const price = parseAmountInput(priceText)
  const example = currency === 'GBP' ? '3.49' : '3,49'
  const priceError =
    price === undefined ? `Enter the price, e.g. ${example}` : price > MAX_PRICE ? `That's over ${formatPrice(MAX_PRICE, currency)}. Check the price.` : ''

  const canCalculate = !!product?.quantityValue && !!product.quantityUnit
  const basis = scan.unitBasis ?? (product?.quantityUnit === 'g' ? 'kg' : product?.quantityUnit === 'ml' ? 'L' : undefined)
  const calculated =
    !unitTyped && price !== undefined && canCalculate
      ? computeUnitPrice(price, { value: product!.quantityValue!, unit: product!.quantityUnit! })
      : undefined
  const unitPrice = unitTyped ? (unitText.trim() === '' ? undefined : parseAmountInput(unitText)) : calculated?.unitPrice
  const unitBasis = unitTyped ? basis : calculated?.unitBasis
  const unitError =
    unitTyped && unitText.trim() !== ''
      ? unitPrice === undefined
        ? `Enter the price per kilo or litre, e.g. ${currency === 'GBP' ? '11.56' : '11,56'}`
        : unitPrice > MAX_UNIT_PRICE
          ? 'That price per kilo or litre looks too high.'
          : ''
      : ''

  async function save(event: FormEvent) {
    event.preventDefault()
    if (priceError || unitError || price === undefined) {
      setShowErrors(true)
      return
    }
    const hasUnit = unitPrice !== undefined && unitBasis !== undefined
    await db.scans.update(scan.id!, {
      price,
      shopId,
      currency,
      unitPrice: hasUnit ? unitPrice : undefined,
      unitBasis: hasUnit ? unitBasis : undefined,
      unitPriceSource: hasUnit ? (unitTyped ? 'read' : 'calculated') : undefined,
    })
    onDone()
  }

  return (
    <form className="edit-scan" onSubmit={save} noValidate>
      {picking && (
        <ShopPicker
          currentId={shopId}
          onPick={(id) => {
            setShopId(id)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}

      <div className="confirm-prices">
        <label className="price-field">
          <span>Price</span>
          <span className="price-input-wrap">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              aria-invalid={showErrors && !!priceError}
            />
            <span aria-hidden="true">{CURRENCIES[currency].symbol}</span>
          </span>
        </label>

        {basis && (
          <label className="unit-field">
            <span>
              Per {basis}
              {!unitTyped && calculated && <span className="calc-tag">calculated</span>}
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={calculated ? formatAmountInput(calculated.unitPrice, currency) : 'optional'}
              value={unitTyped ? unitText : ''}
              onChange={(e) => {
                setUnitText(e.target.value)
                // Clearing the box goes back to the worked-out unit price, if there is one.
                setUnitTyped(e.target.value.trim() !== '' || !canCalculate)
              }}
            />
          </label>
        )}
      </div>

      {showErrors && priceError && <p className="field-error">{priceError}</p>}
      {showErrors && unitError && <p className="field-error">{unitError}</p>}

      <div className="shop-row">
        <button type="button" className={`shop-chip${shop ? '' : ' empty'}`} onClick={() => setPicking(true)}>
          {shop ? formatShop(shop) : 'Choose the shop'}
        </button>
      </div>

      <div className="delete-actions">
        <button type="submit" className="primary-button">
          Save changes
        </button>
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
