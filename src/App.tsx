import { useState } from 'react'
import { Home } from './screens/Home'

export type Screen = { name: 'home' }

function App() {
  const [screen] = useState<Screen>({ name: 'home' })

  switch (screen.name) {
    case 'home':
      return <Home onStartScan={() => alert('Scanning arrives in stage 3.')} />
  }
}

export default App
