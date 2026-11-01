import { lazy, Suspense, useEffect, useState } from 'react'
import { db, type Product } from './lib/db'
import { BarcodeScan } from './screens/BarcodeScan'
import { Home } from './screens/Home'
import { OcrTest } from './screens/OcrTest'
import { PriceScan } from './screens/PriceScan'

// Loaded when first opened, so the chart library doesn't slow down starting the app.
const ProductDetail = lazy(() => import('./screens/ProductDetail').then((m) => ({ default: m.ProductDetail })))

export type Screen =
  | { name: 'home' }
  | { name: 'product'; barcode: string }
  | { name: 'barcode' }
  | { name: 'price'; product: Product }
  | { name: 'ocr-test' }

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  // The phone's back gesture returns to the home screen instead of closing the app.
  useEffect(() => {
    const onPop = () => setScreen({ name: 'home' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openScreen(next: Screen) {
    history.pushState(null, '')
    setScreen(next)
    window.scrollTo(0, 0)
  }

  switch (screen.name) {
    case 'home':
      return (
        <Home
          onStartScan={() => openScreen({ name: 'barcode' })}
          onOpenProduct={(barcode) => openScreen({ name: 'product', barcode })}
          onOpenOcrTest={() => openScreen({ name: 'ocr-test' })}
        />
      )
    case 'product':
      return (
        <Suspense fallback={null}>
          <ProductDetail barcode={screen.barcode} onBack={() => history.back()} />
        </Suspense>
      )
    case 'barcode':
      return (
        <BarcodeScan
          onCancel={() => history.back()}
          onConfirm={async (product) => {
            // Saved so the next scan of this product is instant and works offline.
            await db.products.put(product)
            // Replaces the barcode step, so back still goes straight home.
            setScreen({ name: 'price', product })
          }}
        />
      )
    case 'price':
      return (
        <PriceScan
          product={screen.product}
          onCancel={() => history.back()}
          onSave={async (scan) => {
            await db.transaction('rw', db.scans, db.shops, async () => {
              await db.scans.add(scan)
              // Keeps your most used shops at the top of the shop list.
              if (scan.shopId !== undefined) await db.shops.update(scan.shopId, { lastUsed: scan.timestamp })
            })
            // Back to home, where the new scan is at the top of the list.
            history.back()
          }}
        />
      )
    case 'ocr-test':
      return <OcrTest onBack={() => history.back()} />
  }
}

export default App
