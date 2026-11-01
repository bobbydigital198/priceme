import { lazy, Suspense, useEffect, useState } from 'react'
import { db, type Product } from './lib/db'
import { BarcodeScan } from './screens/BarcodeScan'
import { Home } from './screens/Home'
import { OcrTest } from './screens/OcrTest'
import { PriceScan } from './screens/PriceScan'
import { Settings } from './screens/Settings'

// Loaded when first opened, so the chart library doesn't slow down starting the app.
const ProductDetail = lazy(() => import('./screens/ProductDetail').then((m) => ({ default: m.ProductDetail })))

export type Screen =
  | { name: 'home' }
  | { name: 'product'; barcode: string }
  | { name: 'barcode' }
  | { name: 'price'; product: Product }
  | { name: 'settings' }
  | { name: 'ocr-test' }

function App() {
  // Screens you've opened, home first. The phone's back gesture steps back through them
  // instead of closing the app.
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }])
  const screen = stack[stack.length - 1]

  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openScreen(next: Screen) {
    history.pushState(null, '')
    setStack((s) => [...s, next])
    window.scrollTo(0, 0)
  }

  // Swaps the current screen without adding a back step.
  function replaceScreen(next: Screen) {
    setStack((s) => [...s.slice(0, -1), next])
    window.scrollTo(0, 0)
  }

  const back = () => history.back()

  switch (screen.name) {
    case 'home':
      return (
        <Home
          onStartScan={() => openScreen({ name: 'barcode' })}
          onOpenProduct={(barcode) => openScreen({ name: 'product', barcode })}
          onOpenSettings={() => openScreen({ name: 'settings' })}
        />
      )
    case 'product':
      return (
        <Suspense fallback={null}>
          <ProductDetail barcode={screen.barcode} onBack={back} />
        </Suspense>
      )
    case 'barcode':
      return (
        <BarcodeScan
          onCancel={back}
          onConfirm={async (product) => {
            // Saved so the next scan of this product is instant and works offline.
            await db.products.put(product)
            // Replaces the barcode step, so back still goes straight home.
            replaceScreen({ name: 'price', product })
          }}
        />
      )
    case 'price':
      return (
        <PriceScan
          product={screen.product}
          onCancel={back}
          onSave={async (scan) => {
            await db.transaction('rw', db.scans, db.shops, async () => {
              await db.scans.add(scan)
              // Keeps your most used shops at the top of the shop list.
              if (scan.shopId !== undefined) await db.shops.update(scan.shopId, { lastUsed: scan.timestamp })
            })
            // Back to home, where the new scan is at the top of the list.
            back()
          }}
        />
      )
    case 'settings':
      return <Settings onBack={back} onOpenOcrTest={() => openScreen({ name: 'ocr-test' })} />
    case 'ocr-test':
      return <OcrTest onBack={back} />
  }
}

export default App
