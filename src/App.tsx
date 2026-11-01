import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { MenuDrawer, type Section } from './components/Menu'
import { db, type Product } from './lib/db'
import { BarcodeScan } from './screens/BarcodeScan'
import { Home } from './screens/Home'
import { OcrTest } from './screens/OcrTest'
import { PriceScan } from './screens/PriceScan'
import { Products } from './screens/Products'
import { Settings } from './screens/Settings'
import { ShopDetail } from './screens/ShopDetail'
import { Shops } from './screens/Shops'

// Loaded when first opened, so the chart library doesn't slow down starting the app.
const ProductDetail = lazy(() => import('./screens/ProductDetail').then((m) => ({ default: m.ProductDetail })))

export type Screen =
  | { name: 'home' }
  | { name: 'shops' }
  | { name: 'shop'; shopId: number }
  | { name: 'products' }
  | { name: 'product'; barcode: string }
  | { name: 'barcode' }
  | { name: 'price'; product: Product }
  | { name: 'settings' }
  | { name: 'ocr-test' }

function App() {
  // Screens you've opened, home first. The phone's back gesture steps back through them
  // instead of closing the app. Each browser history entry records how deep it is.
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }])
  const depth = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const screen = stack[stack.length - 1]

  useEffect(() => {
    history.replaceState({ depth: 0 }, '')
    const onPop = (event: PopStateEvent) => {
      const target = (event.state as { depth?: number } | null)?.depth ?? 0
      depth.current = target
      setStack((s) => s.slice(0, target + 1))
      setMenuOpen(false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openScreen(next: Screen) {
    depth.current += 1
    history.pushState({ depth: depth.current }, '')
    setStack((s) => [...s, next])
    window.scrollTo(0, 0)
  }

  // Swaps the current screen without adding a back step.
  function replaceScreen(next: Screen) {
    setStack((s) => [...s.slice(0, -1), next])
    window.scrollTo(0, 0)
  }

  const back = () => history.back()

  // Sections sit one step above Scans, so back from any section returns to Scans.
  function openSection(section: Section) {
    if (section === 'scans') {
      if (depth.current > 0) history.go(-depth.current)
      return
    }
    // The menu is only on Scans and the sections themselves, so this is either Scans or a section.
    const next: Screen = { name: section }
    if (depth.current === 0) openScreen(next)
    else replaceScreen(next)
  }

  const currentSection: Section = screen.name === 'shops' ? 'shops' : screen.name === 'products' ? 'products' : 'scans'
  const menu = menuOpen && (
    <MenuDrawer
      current={currentSection}
      onNavigate={openSection}
      onOpenSettings={() => openScreen({ name: 'settings' })}
      onClose={() => setMenuOpen(false)}
    />
  )
  const openMenu = () => setMenuOpen(true)
  const openProduct = (barcode: string) => openScreen({ name: 'product', barcode })

  switch (screen.name) {
    case 'home':
      return (
        <>
          {menu}
          <Home onOpenMenu={openMenu} onStartScan={() => openScreen({ name: 'barcode' })} onOpenProduct={openProduct} />
        </>
      )
    case 'shops':
      return (
        <>
          {menu}
          <Shops onOpenMenu={openMenu} onOpenShop={(shopId) => openScreen({ name: 'shop', shopId })} />
        </>
      )
    case 'shop':
      return <ShopDetail shopId={screen.shopId} onBack={back} onOpenProduct={openProduct} />
    case 'products':
      return (
        <>
          {menu}
          <Products onOpenMenu={openMenu} onOpenProduct={openProduct} />
        </>
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
