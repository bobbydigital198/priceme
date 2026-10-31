import { useLiveQuery } from 'dexie-react-hooks'
import { ScanIcon } from '../components/ScanIcon'
import { ScanRow } from '../components/ScanRow'
import { getRecentScans } from '../lib/queries'
import { addSampleData, isSampleBarcode, removeSampleData } from '../lib/sampleData'

type Props = { onStartScan: () => void; onOpenProduct: (barcode: string) => void }

export function Home({ onStartScan, onOpenProduct }: Props) {
  const recent = useLiveQuery(() => getRecentScans())
  const hasSamples = recent?.some((r) => isSampleBarcode(r.scan.barcode)) ?? false

  return (
    <main className="screen home">
      <header className="home-header">
        <h1 className="app-title">PriceMe</h1>
        <p className="app-subtitle">Fuck dynamic pricing</p>
      </header>

      {recent && recent.length === 0 && (
        <section className="empty-state">
          <h2>No scans yet</h2>
          <p>
            Tap the button at the bottom right, scan a product's barcode, then photograph its shelf
            price tag. Every price you log appears here, newest first.
          </p>
          <button type="button" className="text-button" onClick={addSampleData}>
            Add sample scans (for testing)
          </button>
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
          {hasSamples && (
            <button type="button" className="text-button" onClick={removeSampleData}>
              Remove sample scans
            </button>
          )}
        </>
      )}

      <button type="button" className="fab" onClick={onStartScan} aria-label="Scan a product">
        <ScanIcon size={30} />
      </button>
    </main>
  )
}
