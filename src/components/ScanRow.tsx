import { formatPrice, formatScanTime, formatShop, formatUnitPrice } from '../lib/format'
import type { RecentScan } from '../lib/queries'
import { currencyOf } from '../lib/region'
import { ProductThumb } from './ProductThumb'

type Props = { item: RecentScan; onOpen: (barcode: string) => void }

export function ScanRow({ item, onOpen }: Props) {
  const { scan, product, shop, shopAverage } = item
  const name = product?.name ?? `Unknown product (${scan.barcode})`
  const currency = currencyOf(scan)
  // Red if this price is above your average for the product at this shop, green if below.
  const difference = shopAverage === undefined ? 0 : Math.round((scan.price - shopAverage) * 100)
  const tone = difference > 0 ? ' diff-up' : difference < 0 ? ' diff-down' : ''
  const toneLabel = difference > 0 ? 'Above your average at this shop' : difference < 0 ? 'Below your average at this shop' : undefined

  return (
    <li>
      <button type="button" className="scan-row" onClick={() => onOpen(scan.barcode)}>
        <ProductThumb imageUrl={product?.imageUrl} name={name} />

        <div className="scan-row-main">
          <div className="scan-row-name">{name}</div>
          {product?.brand && <div className="scan-row-brand">{product.brand}</div>}
          {product?.quantityText && <div className="scan-row-brand">{product.quantityText}</div>}
          <div className="scan-row-meta">{formatScanTime(scan.timestamp)}</div>
        </div>

        <div className={`scan-row-price${tone}`} title={toneLabel}>
          <div className="scan-row-amount">{formatPrice(scan.price, currency)}</div>
          {scan.unitPrice !== undefined && scan.unitBasis && (
            <div className="scan-row-unit">
              {formatUnitPrice(scan.unitPrice, scan.unitBasis, currency)}
              {scan.unitPriceSource === 'calculated' && <span className="calc-tag">calc.</span>}
            </div>
          )}
          {shop && <div className="scan-row-shop">{formatShop(shop)}</div>}
          {toneLabel && <span className="visually-hidden">{toneLabel}</span>}
        </div>
      </button>
    </li>
  )
}
