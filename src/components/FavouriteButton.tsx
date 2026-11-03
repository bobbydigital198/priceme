import { setFavourite } from '../lib/dataAdmin'
import type { Shop } from '../lib/db'
import { formatShop } from '../lib/format'

// Star toggle for favouriting a shop.
export function FavouriteButton({ shop }: { shop: Shop }) {
  const on = !!shop.favourite
  return (
    <button
      type="button"
      className={`favourite-button${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${formatShop(shop)} from favourites` : `Add ${formatShop(shop)} to favourites`}
      onClick={() => setFavourite(shop.id!, !on)}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z" />
      </svg>
    </button>
  )
}
