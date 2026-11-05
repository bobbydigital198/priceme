// Settings actions that change stored data: backup, restore, delete all, and shop tidying.
import { backupFileName, makeBackup, type Backup } from './backup'
import { db, type Shop } from './db'
import { clearNearbyCache } from './shops'

export async function exportBackup(): Promise<{ fileName: string; json: string; counts: { scans: number; products: number; shops: number } }> {
  const [products, scans, shops] = await Promise.all([db.products.toArray(), db.scans.toArray(), db.shops.toArray()])
  const backup = makeBackup({ products, scans, shops }, __APP_VERSION__)
  return { fileName: backupFileName(), json: JSON.stringify(backup), counts: { scans: scans.length, products: products.length, shops: shops.length } }
}

const backupFile = (fileName: string, text: string) => new File([text], fileName, { type: 'application/json' })

// Whether the phone can hand a file to its share sheet (iPhones and most Android phones).
export function canShareFiles(): boolean {
  try {
    return navigator.canShare?.({ files: [backupFile('test.json', '{}')] }) ?? false
  } catch {
    return false
  }
}

export async function shareFile(fileName: string, text: string) {
  await navigator.share({ files: [backupFile(fileName, text)], title: fileName })
}

// Saves a text file to the phone's downloads (Android: Downloads folder; iPhone: Files app).
export function downloadFile(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Replaces everything with the backup's contents, keeping ids so scans still point at their shops.
export async function restoreBackup(backup: Backup) {
  await db.transaction('rw', db.products, db.scans, db.shops, async () => {
    await Promise.all([db.products.clear(), db.scans.clear(), db.shops.clear()])
    await db.products.bulkAdd(backup.products)
    await db.shops.bulkAdd(backup.shops)
    await db.scans.bulkAdd(backup.scans)
  })
}

export async function deleteAllData() {
  await db.transaction('rw', db.products, db.scans, db.shops, async () => {
    await Promise.all([db.products.clear(), db.scans.clear(), db.shops.clear()])
  })
  clearNearbyCache()
}

// A shop has one currency, so changing it also changes the currency of the scans saved there.
export async function updateShop(id: number, changes: Pick<Shop, 'name' | 'address' | 'chain' | 'currency'>) {
  await db.transaction('rw', db.shops, db.scans, async () => {
    await db.shops.update(id, changes)
    if (changes.currency) await db.scans.where('shopId').equals(id).modify({ currency: changes.currency })
  })
}

export async function setFavourite(id: number, favourite: boolean) {
  await db.shops.update(id, { favourite })
}

// Favourites first, then most recently used.
export function favouritesFirst(a: Shop, b: Shop): number {
  return Number(!!b.favourite) - Number(!!a.favourite) || b.lastUsed - a.lastUsed
}

// Moves every scan from one shop to another, then removes the first: for duplicates.
export async function mergeShops(fromId: number, intoId: number) {
  await db.transaction('rw', db.scans, db.shops, async () => {
    const [from, into] = await Promise.all([db.shops.get(fromId), db.shops.get(intoId)])
    if (!from || !into || fromId === intoId) return
    await db.scans.where('shopId').equals(fromId).modify({ shopId: intoId })
    await db.shops.update(intoId, { lastUsed: Math.max(from.lastUsed, into.lastUsed) })
    await db.shops.delete(fromId)
  })
}

// Deletes a shop. Its scans are kept, with no shop recorded.
export async function deleteShop(id: number) {
  await db.transaction('rw', db.scans, db.shops, async () => {
    await db.scans
      .where('shopId')
      .equals(id)
      .modify((scan) => {
        delete scan.shopId
      })
    await db.shops.delete(id)
  })
}
