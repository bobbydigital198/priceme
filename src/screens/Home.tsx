import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { InstallSteps } from '../components/InstallSteps'
import { MenuButton } from '../components/Menu'
import { ScanIcon } from '../components/ScanIcon'
import { ScanRow } from '../components/ScanRow'
import { isInstalled } from '../lib/platform'
import { getRecentScans } from '../lib/queries'

type Props = { onOpenMenu: () => void; onStartScan: () => void; onOpenProduct: (barcode: string) => void }

export function Home({ onOpenMenu, onStartScan, onOpenProduct }: Props) {
  const recent = useLiveQuery(() => getRecentScans())

  return (
    <main className="screen home">
      <header className="home-header">
        <MenuButton onClick={onOpenMenu} />
        <div>
          <h1 className="app-title">PrixIt</h1>
          <p className="app-subtitle">Stay ahead of dynamic pricing</p>
        </div>
      </header>

      <InstallCard />

      {recent && recent.length === 0 && (
        <section className="empty-state">
          <h2>No scans yet</h2>
          <p>
            Tap the button at the bottom right, scan a product's barcode, then photograph its shelf
            price tag. Every price you log appears here, newest first.
          </p>
        </section>
      )}

      {recent && recent.length > 0 && (
        <>
          <h2 className="section-heading">Recent scans</h2>
          <ul className="scan-list">
            {recent.map((item) => (
              <ScanRow key={item.scan.id} item={item} onOpen={onOpenProduct} />
            ))}
          </ul>
        </>
      )}

      <p className="app-version">Version {__APP_VERSION__}</p>

      <button type="button" className="fab" onClick={onStartScan} aria-label="Scan a product">
        <ScanIcon size={30} />
      </button>
    </main>
  )
}

const HINT_KEY = 'install-hint-dismissed'

function hintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === 'yes'
  } catch {
    return false
  }
}

// Shown when PrixIt is opened in a browser tab instead of from the home screen.
function InstallCard() {
  const [hidden, setHidden] = useState(() => isInstalled() || hintDismissed())
  if (hidden) return null

  function dismiss() {
    try {
      localStorage.setItem(HINT_KEY, 'yes')
    } catch {
      // Not remembered; it shows again next time, which is harmless.
    }
    setHidden(true)
  }

  return (
    <section className="card install-card">
      <h2 className="card-heading">Add PrixIt to your home screen</h2>
      <p className="product-sub">It then opens like an app, works offline and keeps your prices safe on your phone.</p>
      <InstallSteps />
      <button type="button" className="text-button" onClick={dismiss}>
        Not now
      </button>
    </section>
  )
}
