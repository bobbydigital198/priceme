import { ScanIcon } from '../components/ScanIcon'

type Props = { onStartScan: () => void }

export function Home({ onStartScan }: Props) {
  return (
    <main className="screen home">
      <header className="home-header">
        <h1 className="app-title">PriceMe</h1>
        <p className="app-subtitle">Fuck dynamic pricing</p>
      </header>

      <section className="empty-state">
        <h2>No scans yet</h2>
        <p>
          Tap the button at the bottom right, scan a product's barcode, then photograph its shelf
          price tag. Every price you log appears here, newest first.
        </p>
      </section>

      <button type="button" className="fab" onClick={onStartScan} aria-label="Scan a product">
        <ScanIcon size={30} />
      </button>
    </main>
  )
}
