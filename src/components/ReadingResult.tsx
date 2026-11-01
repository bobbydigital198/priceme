import type { Product } from '../lib/db'
import { formatPrice, formatUnitPrice } from '../lib/format'
import type { TagReading } from '../lib/ocr'
import { computeUnitPrice, type Confidence } from '../lib/priceParser'

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  high: 'Confident',
  medium: 'Fairly sure. Check it against the tag.',
  low: 'Not sure. Check it carefully against the tag.',
  none: "Couldn't find a price. You'll be able to type it in.",
}

type Props = { reading: TagReading; product?: Product }

// What the price reader found. Stage 5 turns this into the editable confirmation screen.
export function ReadingResult({ reading, product }: Props) {
  const { parsed } = reading
  const calculated =
    parsed.price !== undefined && parsed.unitPrice === undefined && product?.quantityValue && product.quantityUnit
      ? computeUnitPrice(parsed.price, { value: product.quantityValue, unit: product.quantityUnit })
      : undefined
  const unitPrice = parsed.unitPrice ?? calculated?.unitPrice
  const unitBasis = parsed.unitBasis ?? calculated?.unitBasis

  return (
    <section className="card reading">
      <div className="reading-prices">
        <div className="reading-price">{parsed.price !== undefined ? formatPrice(parsed.price) : 'No price'}</div>
        {unitPrice !== undefined && unitBasis && (
          <div className="reading-unit">
            {formatUnitPrice(unitPrice, unitBasis)}
            {calculated && <span className="calc-tag">calculated</span>}
          </div>
        )}
      </div>

      <p className={`confidence confidence-${parsed.confidence}`}>{CONFIDENCE_TEXT[parsed.confidence]}</p>

      {parsed.alternatives.length > 0 && (
        <p className="product-sub">Other prices on the tag: {parsed.alternatives.map(formatPrice).join(', ')}</p>
      )}
      {parsed.warnings.map((w) => (
        <p key={w} className="product-sub">
          {w}
        </p>
      ))}

      <img className="reading-image" src={reading.thumbnail} alt="The price tag photo" />
      <p className="product-sub small">Read in {(reading.durationMs / 1000).toFixed(1)} seconds</p>

      <details className="reading-details">
        <summary>What PrixIt read</summary>
        <img className="reading-image" src={reading.processedImage} alt="The cleaned-up image the reader used" />
        <pre>{reading.rawText.trim() || '(no text found)'}</pre>
      </details>
    </section>
  )
}
