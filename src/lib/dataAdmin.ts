// Settings actions that change stored data: backup, restore, delete all, and shop tidying.
import { backupFileName, makeBackup, type Backup } from './backup'
import { db, type Shop } from './db'

export async function exportBackup(): Promise<{ fileName: string; json: string; counts: { scans: number; products: number; shops: number } }> {
  const [products, scans, shops] = await Promise.all([db.products.toArray(), db.scans.toArray(), db.shops.toArray()])
  const backup = makeBackup({ products, scans, shops }, __APP_VERSION__)
  return { fileName: backupFileName(), json: JSON.stringify(backup), counts: { scans: scans.length, products: products.length, shops: shops.length } }
}

// Saves a text file to the phone's Downloads (Chrome shows a download notification).
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
  try {
    // Cached nearby-shop lookups.
    for (const key of Object.keys(localStorage)) if (key.startsWith('nearby-shops:')) localStorage.removeItem(key)
  } catch {
    // Storage unavailable; nothing cached to clear.
  }
}

export async function updateShop(id: number, changes: Pick<Shop, 'name' | 'address' | 'chain'>) {
  await db.shops.update(id, changes)
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
