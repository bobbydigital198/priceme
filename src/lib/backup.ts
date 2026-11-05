// Backup files: everything PrixIt stores, as one JSON file you can keep and restore.
// The checks here run before anything is replaced, so a wrong or damaged file can't wipe your data.
import type { Product, Scan, Shop } from './db'

export type BackupData = { products: Product[]; scans: Scan[]; shops: Shop[] }
// The app was called PriceMe when backups began; the label inside the file stays the same so
// older backups still restore.
export type Backup = BackupData & { app: 'PriceMe'; format: 1; exportedAt: string; appVersion: string }

export function makeBackup(data: BackupData, appVersion: string, now = new Date()): Backup {
  return { app: 'PriceMe', format: 1, exportedAt: now.toISOString(), appVersion, ...data }
}

// "prixit-backup-2026-11-01.json"
export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `prixit-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const isString = (v: unknown) => typeof v === 'string'

export function parseBackup(text: string): ParsedBackup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: "This file isn't a PrixIt backup (it isn't valid JSON)." }
  }
  if (!isObject(json) || json.app !== 'PriceMe') return { ok: false, error: "This file isn't a PrixIt backup." }
  if (json.format !== 1) return { ok: false, error: 'This backup was made by a newer version of PrixIt. Update the app and try again.' }
  if (!Array.isArray(json.products) || !Array.isArray(json.scans) || !Array.isArray(json.shops)) {
    return { ok: false, error: 'This backup is incomplete or damaged.' }
  }

  const badProduct = json.products.findIndex((p) => !isObject(p) || !isString(p.barcode) || !isString(p.name))
  const badShop = json.shops.findIndex((s) => !isObject(s) || !isNumber(s.id) || !isString(s.name))
  const badScan = json.scans.findIndex(
    (s) => !isObject(s) || !isNumber(s.id) || !isString(s.barcode) || !isNumber(s.price) || !isNumber(s.timestamp),
  )
  if (badProduct >= 0 || badShop >= 0 || badScan >= 0) return { ok: false, error: 'This backup is damaged: some entries are unreadable.' }

  // Older backups include a small tag photo with each scan; those are no longer kept.
  const scans = json.scans.map((s) => {
    const { tagThumbnail: _photo, ...scan } = s as Record<string, unknown>
    return scan
  })
  return { ok: true, backup: { ...json, scans } as unknown as Backup }
}
