import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { favouritesFirst } from '../lib/dataAdmin'
import { db } from '../lib/db'
import { formatShop } from '../lib/format'
import { OsmCredit } from './Credits'
import { CHAINS, fetchNearbyShops, getPosition, saveShop, type NearbyShop } from '../lib/shops'

type Props = {
  title?: string
  // Off when adding a shop from the Shops section, where your shops are already listed.
  showSaved?: boolean
  currentId?: number
  // Chain spotted on the tag, used to prefill a new shop and flag matching nearby shops.
  chain?: string
  onPick: (shopId: number) => void
  onClose: () => void
}

type Nearby =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; shops: NearbyShop[] }
  | { status: 'error'; message: string }

// Full-screen list for choosing the shop: your saved shops, a new shop, or (only if you ask)
// shops near your current location.
export function ShopPicker({ title = 'Which shop?', showSaved = true, currentId, chain, onPick, onClose }: Props) {
  // Favourites first, then most recently used.
  const saved = useLiveQuery(async () => (await db.shops.toArray()).sort(favouritesFirst))
  const [nearby, setNearby] = useState<Nearby>({ status: 'idle' })
  const [name, setName] = useState(chain ?? '')
  const [newChain, setNewChain] = useState(chain ?? '')
  const [address, setAddress] = useState('')

  async function findNearby() {
    setNearby({ status: 'searching' })
    let position: GeolocationPosition
    try {
      position = await getPosition()
    } catch (error) {
      const denied = error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED
      setNearby({
        status: 'error',
        message: denied
          ? 'Location is blocked for PrixIt, which is fine. Choose or add a shop above instead.'
          : "Couldn't get your location. Choose or add a shop above instead.",
      })
      return
    }
    try {
      const shops = await fetchNearbyShops(position.coords.latitude, position.coords.longitude)
      setNearby({ status: 'done', shops })
    } catch {
      setNearby({ status: 'error', message: "Couldn't reach OpenStreetMap. Check your connection, or choose a shop above." })
    }
  }

  async function pickNearby({ distance: _distance, ...shop }: NearbyShop) {
    onPick(await saveShop({ ...shop, source: 'osm' }))
  }

  async function addShop(event: FormEvent) {
    event.preventDefault()
    onPick(
      await saveShop({
        name: name.trim(),
        chain: newChain.trim() || undefined,
        address: address.trim() || undefined,
        source: 'manual',
      }),
    )
  }

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <main className="screen">
        <div className="step-header">
          <button type="button" className="back-button" onClick={onClose}>
            Close
          </button>
          <h1 className="product-name">{title}</h1>
        </div>

        {showSaved && saved && saved.length > 0 && (
          <section>
            <h2 className="section-heading">Your shops</h2>
            <ul className="shop-list">
              {saved.map((shop) => (
                <li key={shop.id}>
                  <button type="button" className={shop.id === currentId ? 'selected' : ''} onClick={() => onPick(shop.id!)}>
                    <span>{formatShop(shop)}</span>
                    {shop.favourite && <span className="shop-meta" aria-label="Favourite">★</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form className="card shop-form" onSubmit={addShop}>
          <h2>Add a new shop</h2>
          <label className="field">
            <span>Shop name</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Franprix" />
          </label>
          <label className="field">
            <span>Street (optional), to tell shops of the same chain apart</span>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Rue de Rivoli" />
          </label>
          <label className="field">
            <span>Chain (optional)</span>
            <input type="text" list="chains" value={newChain} onChange={(e) => setNewChain(e.target.value)} />
            <datalist id="chains">
              {CHAINS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <div className="button-row">
            <button type="submit" className="primary-button" disabled={!name.trim()}>
              {showSaved ? 'Add and use this shop' : 'Add this shop'}
            </button>
          </div>
        </form>

        <section className="card nearby">
          <h2>Find shops near me</h2>
          <p className="product-sub">
            Optional. Uses your approximate location once, to look up food shops within 150 m on OpenStreetMap. Your location
            isn't sent anywhere else and isn't saved.
          </p>
          {nearby.status === 'idle' && (
            <button type="button" className="secondary-button" onClick={findNearby}>
              Use my location
            </button>
          )}
          {nearby.status === 'searching' && <p>Looking for shops nearby…</p>}
          {nearby.status === 'error' && <p className="field-error">{nearby.message}</p>}
          {nearby.status === 'done' && nearby.shops.length === 0 && <p>No shops found within 150 m. Add yours above.</p>}
          {nearby.status === 'done' && nearby.shops.length > 0 && (
            <>
            <ul className="shop-list">
              {nearby.shops.map((shop) => (
                <li key={shop.osmId}>
                  <button type="button" onClick={() => pickNearby(shop)}>
                    <span>{formatShop(shop)}</span>
                    <span className="shop-meta">
                      {shop.distance} m{chain && shop.chain === chain ? ' · matches the tag' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <OsmCredit />
            </>
          )}
        </section>
      </main>
    </div>
  )
}
