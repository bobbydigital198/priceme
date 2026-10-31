import { useLiveQuery } from 'dexie-react-hooks'
import { ProductThumb } from '../components/ProductThumb'
import { db } from '../lib/db'

type Props = { barcode: string; onBack: () => void }

// Basic version. Stats, the price chart and the scan list arrive in stage 7.
export function ProductDetail({ barcode, onBack }: Props) {
  const product = useLiveQuery(() => db.products.get(barcode), [barcode])
  const name = product?.name ?? 'Unknown product'

  return (
    <main className="screen">
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>

      <section className="product-header">
        <ProductThumb imageUrl={product?.imageUrl} name={name} size={96} />
        <div>
          <h1 className="product-name">{name}</h1>
          {product?.brand && <p className="product-sub">{product.brand}</p>}
          {product?.quantityText && <p className="product-sub">{product.quantityText}</p>}
          <p className="product-sub">Barcode {barcode}</p>
        </div>
      </section>

      <p className="placeholder-note">Price history and stats for this product arrive in stage 7.</p>
    </main>
  )
}
