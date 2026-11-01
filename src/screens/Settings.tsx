import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { parseBackup, type Backup } from '../lib/backup'
import { deleteAllData, downloadFile, exportBackup, restoreBackup } from '../lib/dataAdmin'
import { db } from '../lib/db'
import { formatScanDay } from '../lib/format'

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
            <strong>Restoring replaces everything currently in PrixIt</strong>
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
