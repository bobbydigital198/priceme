import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { parseBackup, type Backup } from '../lib/backup'
import { canShareFiles, deleteAllData, downloadFile, exportBackup, restoreBackup, shareFile } from '../lib/dataAdmin'
import { isIos } from '../lib/platform'
import { db } from '../lib/db'
import { formatScanDay } from '../lib/format'
import { setThemeChoice, useThemeChoice, type ThemeChoice } from '../lib/theme'

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

      <AppearanceSection />
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

// ---- Light or dark mode ----

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: 'Match phone' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

function AppearanceSection() {
  const choice = useThemeChoice()
  return (
    <section className="card">
      <h2 className="card-heading">Appearance</h2>
      <div className="sort-chips theme-chips" role="radiogroup" aria-label="Light or dark mode">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={choice === t.id}
            className={choice === t.id ? 'selected' : ''}
            onClick={() => setThemeChoice(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="product-sub small">
        {choice === 'system' ? 'Follows your phone’s light or dark setting.' : `Always ${choice} mode, whatever your phone is set to.`}
      </p>
    </section>
  )
}

// ---- Backup and restore ----

function BackupSection({ scanCount }: { scanCount: number }) {
  const [message, setMessage] = useState<{ text: string; error?: boolean }>()
  const [pending, setPending] = useState<{ backup: Backup; fileName: string }>()

  const contents = (counts: { scans: number; products: number; shops: number }) =>
    `${count(counts.scans, 'scan')}, ${count(counts.products, 'product')} and ${count(counts.shops, 'shop')}`

  async function exportNow() {
    const { fileName, json, counts } = await exportBackup()
    downloadFile(fileName, json)
    setMessage({
      text: `Saved ${fileName}, with ${contents(counts)}. Look for it in ${isIos() ? 'the Files app, under Downloads' : 'your Downloads'}.`,
    })
  }

  // Opens the phone's share sheet, to save the backup to Files, Google Drive, email and so on.
  async function shareNow() {
    const { fileName, json, counts } = await exportBackup()
    try {
      await shareFile(fileName, json)
      setMessage({ text: `Shared ${fileName}, with ${contents(counts)}.` })
    } catch (error) {
      // Closing the share sheet without choosing anything isn't an error.
      if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage({ text: "Couldn't share the backup. Try Save a backup instead.", error: true })
    }
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
        Your scans are only stored on this phone, inside the app. Deleting the app or clearing your browser's website data
        would erase them, so save a backup now and then and keep a copy somewhere safe, such as{' '}
        {isIos() ? 'iCloud Drive' : 'Google Drive'} or an email to yourself.
      </p>
      <div className="button-row">
        <button type="button" className="primary-button" onClick={exportNow}>
          Save a backup
        </button>
        {canShareFiles() && (
          <button type="button" className="secondary-button" onClick={shareNow}>
            Share a backup
          </button>
        )}
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
