import { useState, type FormEvent } from 'react'
import { deleteShop, mergeShops, updateShop } from '../lib/dataAdmin'
import type { Shop } from '../lib/db'
import { formatShop } from '../lib/format'
import { CHAINS } from '../lib/shops'

type Props = {
  shop: Shop
  scanCount: number
  others: Shop[]
  onSaved: () => void
  // After merging or deleting, when the shop no longer exists.
  onRemoved: () => void
}

const scansLabel = (n: number) => (n === 1 ? '1 scan' : `${n} scans`)

// Rename a shop, merge a duplicate into another, or delete it.
export function ShopEditor({ shop, scanCount, others, onSaved, onRemoved }: Props) {
  const [name, setName] = useState(shop.name)
  const [address, setAddress] = useState(shop.address ?? '')
  const [chain, setChain] = useState(shop.chain ?? '')
  const [mergeInto, setMergeInto] = useState('')
  const [confirm, setConfirm] = useState<'merge' | 'delete'>()
  const target = others.find((s) => String(s.id) === mergeInto)

  async function save(event: FormEvent) {
    event.preventDefault()
    await updateShop(shop.id!, { name: name.trim(), address: address.trim() || undefined, chain: chain.trim() || undefined })
    onSaved()
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
        <input type="text" list="editor-chains" value={chain} onChange={(e) => setChain(e.target.value)} />
        <datalist id="editor-chains">
          {CHAINS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <div className="button-row">
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Save changes
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
            Move {scanCount === 1 ? 'its 1 scan' : `its ${scansLabel(scanCount)}`} to {formatShop(target)} and remove {formatShop(shop)}?
          </p>
          <div className="delete-actions">
            <button type="button" className="danger-button" onClick={() => mergeShops(shop.id!, target.id!).then(onRemoved)}>
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
            <button type="button" className="danger-button" onClick={() => deleteShop(shop.id!).then(onRemoved)}>
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
