import { useEffect, useState } from 'react'
import { Home } from './screens/Home'
import { ProductDetail } from './screens/ProductDetail'

export type Screen = { name: 'home' } | { name: 'product'; barcode: string }

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
          onStartScan={() => alert('Scanning arrives in stage 3.')}
          onOpenProduct={(barcode) => openScreen({ name: 'product', barcode })}
        />
      )
    case 'product':
      return <ProductDetail barcode={screen.barcode} onBack={() => history.back()} />
  }
}

export default App
