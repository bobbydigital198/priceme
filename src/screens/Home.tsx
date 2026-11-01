import { useLiveQuery } from 'dexie-react-hooks'
import { ScanIcon } from '../components/ScanIcon'
import { ScanRow } from '../components/ScanRow'
import { getRecentScans } from '../lib/queries'

type Props = { onStartScan: () => void; onOpenProduct: (barcode: string) => void; onOpenSettings: () => void }

export function Home({ onStartScan, onOpenProduct, onOpenSettings }: Props) {
  const recent = useLiveQuery(() => getRecentScans())

  return (
    <main className="screen home">
      <header className="home-header">
        <div>
          <h1 className="app-title">PriceMe</h1>
          <p className="app-subtitle">Fuck dynamic pricing</p>
        </div>
        <button type="button" className="settings-button" onClick={onOpenSettings} aria-label="Settings">
          <SettingsIcon />
        </button>
      </header>

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

// Gear icon for the settings button.
function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
