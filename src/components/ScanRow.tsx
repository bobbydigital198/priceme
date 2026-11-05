import { formatPrice, formatScanCount, formatScanTime, formatShop, formatUnitPrice } from '../lib/format'
import type { RecentScan } from '../lib/queries'
import { currencyOf } from '../lib/region'
import { ProductThumb } from './ProductThumb'

type Props = { item: RecentScan; onOpen: (barcode: string) => void }

export function ScanRow({ item, onOpen }: Props) {
  const { scan, product, shop, productScanCount } = item
  const name = product?.name ?? `Unknown product (${scan.barcode})`
  const currency = currencyOf(scan)

  return (
    <li>
      <button type="button" className="scan-row" onClick={() => onOpen(scan.barcode)}>
        <ProductThumb imageUrl={product?.imageUrl} name={name} />

        <div className="scan-row-main">
          <div className="scan-row-name">{name}</div>
          {product?.brand && <div className="scan-row-brand">{product.brand}</div>}
          <div className="scan-row-meta">
            {shop && <span>{formatShop(shop)}</span>}
            <span>{formatScanTime(scan.timestamp)}</span>
          </div>
          <div className="scan-row-meta">{formatScanCount(productScanCount)}</div>
        </div>

        <div className="scan-row-price">
          <div className="scan-row-amount">{formatPrice(scan.price, currency)}</div>
          {scan.unitPrice !== undefined && scan.unitBasis && (
            <div className="scan-row-unit">
              {formatUnitPrice(scan.unitPrice, scan.unitBasis, currency)}
              {scan.unitPriceSource === 'calculated' && <span className="calc-tag">calc.</span>}
            </div>
          )}
        </div>
      </button>
    </li>
  )
}
