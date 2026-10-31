import { useEffect, useState } from 'react'
import { db } from './lib/db'
import { BarcodeScan } from './screens/BarcodeScan'
import { Home } from './screens/Home'
import { ProductDetail } from './screens/ProductDetail'

export type Screen = { name: 'home' } | { name: 'product'; barcode: string } | { name: 'barcode' }

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
        />
      )
    case 'product':
      return <ProductDetail barcode={screen.barcode} onBack={() => history.back()} />
    case 'barcode':
      return (
        <BarcodeScan
          onCancel={() => history.back()}
          onConfirm={async (product) => {
            // Saved so the next scan of this product is instant and works offline.
            await db.products.put(product)
            alert(`${product.name} saved. The price tag step arrives in stage 4.`)
            history.back()
          }}
        />
      )
  }
}

export default App
