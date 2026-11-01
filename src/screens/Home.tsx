import { useLiveQuery } from 'dexie-react-hooks'
import { MenuButton } from '../components/Menu'
import { ScanIcon } from '../components/ScanIcon'
import { ScanRow } from '../components/ScanRow'
import { getRecentScans } from '../lib/queries'

type Props = { onOpenMenu: () => void; onStartScan: () => void; onOpenProduct: (barcode: string) => void }

export function Home({ onOpenMenu, onStartScan, onOpenProduct }: Props) {
  const recent = useLiveQuery(() => getRecentScans())

  return (
    <main className="screen home">
      <header className="home-header">
        <MenuButton onClick={onOpenMenu} />
        <div>
          <h1 className="app-title">PriceMe</h1>
          <p className="app-subtitle">Fuck dynamic pricing</p>
        </div>
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
