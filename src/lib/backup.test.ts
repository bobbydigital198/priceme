import { describe, expect, it } from 'vitest'
import { backupFileName, makeBackup, parseBackup } from './backup'

const data = {
  products: [{ barcode: '3017620422003', name: 'Nutella', source: 'openfoodfacts' as const, updatedAt: 1 }],
  shops: [{ id: 1, name: 'Franprix', source: 'manual' as const, lastUsed: 2 }],
  scans: [{ id: 5, barcode: '3017620422003', price: 4.99, timestamp: 3, shopId: 1, tagThumbnail: 'data:image/jpeg;base64,AAAA' }],
}

describe('backups', () => {
  it('round-trips everything', () => {
    const backup = makeBackup(data, '1.8.13', new Date(2026, 10, 1, 12))
    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed).toEqual({ ok: true, backup })
    expect(backup).toMatchObject({ app: 'PriceMe', format: 1, appVersion: '1.8.13', ...data })
  })

  it('names the file by date', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('priceme-backup-2026-01-05.json')
  })

  it.each([
    ['not JSON', 'hello', "isn't valid JSON"],
    ['another app', JSON.stringify({ app: 'Other', format: 1 }), "isn't a PriceMe backup"],
    ['a newer format', JSON.stringify({ app: 'PriceMe', format: 2, products: [], scans: [], shops: [] }), 'newer version'],
    ['missing lists', JSON.stringify({ app: 'PriceMe', format: 1, products: [] }), 'incomplete'],
    ['a broken scan', JSON.stringify({ app: 'PriceMe', format: 1, products: [], shops: [], scans: [{ id: 1, barcode: 'x', price: 'free' }] }), 'damaged'],
  ])('rejects %s', (_label, text, message) => {
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toContain(message)
  })

  it('accepts an empty backup', () => {
    expect(parseBackup(JSON.stringify(makeBackup({ products: [], scans: [], shops: [] }, '1.8.13'))).ok).toBe(true)
  })
})
