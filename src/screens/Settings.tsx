import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { parseBackup, type Backup } from '../lib/backup'
import { deleteAllData, deleteShop, downloadFile, exportBackup, mergeShops, restoreBackup, updateShop } from '../lib/dataAdmin'
import { db, type Shop } from '../lib/db'
import { formatScanDay, formatShop } from '../lib/format'
import { CHAINS } from '../lib/shops'

type Props = { onBack: () => void; onOpenOcrTest: () => void }

const DELETE_WORD = 'DELETE'

// "1 scan", "3 scans".
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function Settings({ onBack, onOpenOcrTest }: Props) {
  const counts = useLiveQuery(async () => ({ scans: await db.scans.count(), products: await db.products.count() }))

  return (
    <main className="screen settings">
      <button type="button" className="back-button" onClick={onBack}>
        Back
      </button>
      <h1 className="product-name">Settings</h1>

      <BackupSection scanCount={counts?.scans ?? 0} />
      <ShopsSection />

      <section className="card">
        <h2 className="card-heading">Price reader</h2>
        <p className="product-sub">Try the price reader on photos from your gallery, without saving anything.</p>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onOpenOcrTest}>
            Test with a photo
          </button>
        </div>
      </section>

      <DeleteAllSection scanCount={counts?.scans ?? 0} productCount={counts?.products ?? 0} />

      <p className="app-version">Version {__APP_VERSION__}</p>
    </main>
  )
}

// ---- Backup and restore ----

function BackupSection({ scanCount }: { scanCount: number }) {
  const [message, setMessage] = useState<{ text: string; error?: boolean }>()
  const [pending, setPending] = useState<{ backup: Backup; fileName: string }>()

  async function exportNow() {
    const { fileName, json, counts } = await exportBackup()
    downloadFile(fileName, json)
    setMessage({ text: `Saved ${fileName} to your Downloads, with ${count(counts.scans, 'scan')}, ${count(counts.products, 'product')} and ${count(counts.shops, 'shop')}.` })
  }

  async function chooseFile(file: File | undefined) {
    setPending(undefined)
    if (!file) return
    const parsed = parseBackup(await file.text())
    if (parsed.ok) setPending({ backup: parsed.backup, fileName: file.name })
    else setMessage({ text: parsed.error, error: true })
  }

  async function restoreNow() {
    if (!pending) return
    await restoreBackup(pending.backup)
    setMessage({ text: `Restored ${count(pending.backup.scans.length, 'scan')} from ${pending.fileName}.` })
    setPending(undefined)
  }

  return (
    <section className="card">
      <h2 className="card-heading">Backup</h2>
      <p className="product-sub">
        Your scans are only stored on this phone. Clearing Chrome's data or uninstalling Chrome would erase them, so save a
        backup now and then and keep a copy somewhere safe, such as Google Drive or an email to yourself.
      </p>
      <div className="button-row">
        <button type="button" className="primary-button" onClick={exportNow}>
          Save a backup
        </button>
        <label className="secondary-button file-button">
          Restore from a backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              chooseFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {pending && (
        <div className="delete-confirm" role="alert">
          <p>
            {pending.fileName} has {count(pending.backup.scans.length, 'scan')}, {count(pending.backup.products.length, 'product')} and{' '}
            {count(pending.backup.shops.length, 'shop')}, saved {formatScanDay(Date.parse(pending.backup.exportedAt))}.
          </p>
          <p>
            <strong>Restoring replaces everything currently in PriceMe</strong>
            {scanCount ? ` (${count(scanCount, 'scan')})` : ''}.
          </p>
          <div className="delete-actions">
            <button type="button" className="danger-button" onClick={restoreNow}>
              Replace and restore
            </button>
            <button type="button" className="secondary-button" onClick={() => setPending(undefined)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && <p className={message.error ? 'field-error' : 'settings-message'}>{message.text}</p>}
    </section>
  )
}

// ---- Saved shops ----

function ShopsSection() {
  const shops = useLiveQuery(async () => {
    const all = await db.shops.orderBy('lastUsed').reverse().toArray()
    return Promise.all(all.map(async (shop) => ({ shop, scans: await db.scans.where('shopId').equals(shop.id!).count() })))
  })
  const [editing, setEditing] = useState<number>()

  return (
    <section className="card">
      <h2 className="card-heading">Your shops</h2>
      {shops && shops.length === 0 && <p className="product-sub">No shops yet. They're added when you save a scan.</p>}
      <ul className="settings-shops">
        {shops?.map(({ shop, scans }) => (
          <li key={shop.id}>
            {editing === shop.id ? (
              <ShopEditor
                shop={shop}
                scanCount={scans}
                others={shops.map((s) => s.shop).filter((s) => s.id !== shop.id)}
                onDone={() => setEditing(undefined)}
              />
            ) : (
              <button type="button" className="settings-shop-row" onClick={() => setEditing(shop.id)}>
                <span>
                  {formatShop(shop)}
                  {shop.chain && shop.chain !== shop.name && <span className="shop-meta"> · {shop.chain}</span>}
                </span>
                <span className="shop-meta">{count(scans, 'scan')}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {shops && shops.length > 0 && <p className="product-sub small">Tap a shop to rename, merge or delete it.</p>}
    </section>
  )
}

function ShopEditor({ shop, scanCount, others, onDone }: { shop: Shop; scanCount: number; others: Shop[]; onDone: () => void }) {
  const [name, setName] = useState(shop.name)
  const [address, setAddress] = useState(shop.address ?? '')
  const [chain, setChain] = useState(shop.chain ?? '')
  const [mergeInto, setMergeInto] = useState('')
  const [confirm, setConfirm] = useState<'merge' | 'delete'>()
  const target = others.find((s) => String(s.id) === mergeInto)

  async function save(event: FormEvent) {
    event.preventDefault()
    await updateShop(shop.id!, { name: name.trim(), address: address.trim() || undefined, chain: chain.trim() || undefined })
    onDone()
  }

  return (
    <form className="shop-editor" onSubmit={save}>
      <label className="field">
        <span>Shop name</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Street (optional)</span>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label className="field">
        <span>Chain (optional)</span>
        <input type="text" list="settings-chains" value={chain} onChange={(e) => setChain(e.target.value)} />
        <datalist id="settings-chains">
          {CHAINS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <div className="button-row">
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Save changes
        </button>
        <button type="button" className="secondary-button" onClick={onDone}>
          Cancel
        </button>
      </div>

      {others.length > 0 && (
        <label className="field">
          <span>Same shop saved twice? Merge it into:</span>
          <select
            value={mergeInto}
            onChange={(e) => {
              setMergeInto(e.target.value)
              setConfirm(e.target.value ? 'merge' : undefined)
            }}
          >
            <option value="">Choose a shop…</option>
            {others.map((s) => (
              <option key={s.id} value={s.id}>
                {formatShop(s)}
              </option>
            ))}
          </select>
        </label>
      )}

      {confirm === 'merge' && target && (
        <div className="delete-confirm" role="alert">
          <p>
            Move {scanCount === 1 ? 'its 1 scan' : `its ${scanCount} scans`} to {formatShop(target)} and remove {formatShop(shop)}?
          </p>
          <div className="delete-actions">
            <button type="button" className="danger-button" onClick={() => mergeShops(shop.id!, target.id!).then(onDone)}>
              Merge
            </button>
            <button type="button" className="secondary-button" onClick={() => (setConfirm(undefined), setMergeInto(''))}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirm !== 'merge' && (
        <button type="button" className="text-button danger-text" onClick={() => setConfirm('delete')}>
          Delete this shop
        </button>
      )}
      {confirm === 'delete' && (
        <div className="delete-confirm" role="alert">
          <p>
            Delete {formatShop(shop)}?
            {scanCount > 0 && ` Its ${scanCount === 1 ? 'scan is' : `${scanCount} scans are`} kept, with no shop recorded.`}
          </p>
          <div className="delete-actions">
            <button type="button" className="danger-button" onClick={() => deleteShop(shop.id!).then(onDone)}>
              Delete shop
            </button>
            <button type="button" className="secondary-button" onClick={() => setConfirm(undefined)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

// ---- Delete everything ----

function DeleteAllSection({ scanCount, productCount }: { scanCount: number; productCount: number }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState(false)

  async function deleteEverything() {
    await deleteAllData()
    setOpen(false)
    setTyped('')
    setDone(true)
  }

  return (
    <section className="card danger-zone">
      <h2 className="card-heading">Delete all data</h2>
      <p className="product-sub">
        Erases every scan, product and shop from this phone. Save a backup first if you might want them back.
      </p>
      {!open && (
        <div className="button-row">
          <button type="button" className="secondary-button danger-text" onClick={() => (setOpen(true), setDone(false))}>
            Delete all data…
          </button>
        </div>
      )}
      {open && (
        <div className="delete-confirm" role="alert">
          <p>
            This permanently deletes {count(scanCount, 'scan')} and {count(productCount, 'product')}. It can't be undone.
          </p>
          <label className="field">
            <span>
              Type <strong>{DELETE_WORD}</strong> to confirm
            </span>
            <input type="text" autoCapitalize="characters" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </label>
          <div className="delete-actions">
            <button type="button" className="danger-button" disabled={typed.trim() !== DELETE_WORD} onClick={deleteEverything}>
              Delete everything
            </button>
            <button type="button" className="secondary-button" onClick={() => (setOpen(false), setTyped(''))}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {done && <p className="settings-message">Everything has been deleted.</p>}
    </section>
  )
}
