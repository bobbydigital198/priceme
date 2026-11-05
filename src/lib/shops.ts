// Working out which shop a scan was taken in. Location is only used when you tap
// "Find shops near me"; otherwise this uses your last scan, the tag text and your saved shops.
import { SHOP_SESSION_MINUTES } from './constants'
import { db, type Shop } from './db'
import { getRegion, type Country } from './region'

// Saves a shop and returns its id. An OpenStreetMap shop already saved is reused, not duplicated.
export async function saveShop(shop: Omit<Shop, 'id' | 'lastUsed'>): Promise<number> {
  const existing = shop.osmId ? await db.shops.where('osmId').equals(shop.osmId).first() : undefined
  if (existing?.id !== undefined) return existing.id
  // A new shop takes your default currency unless one is given.
  return (await db.shops.add({ currency: getRegion().currency, ...shop, lastUsed: Date.now() })) as number
}

// Supermarket chains by country, longest names first so "Carrefour City" wins over a plain match.
export const CHAINS_BY_COUNTRY: Record<Country, string[]> = {
  FR: [
    'Carrefour Express',
    'Carrefour Market',
    'Carrefour City',
    'Leader Price',
    'Intermarché',
    'Naturalia',
    'U Express',
    'Franprix',
    'Monoprix',
    "Monop'",
    'Auchan',
    'Casino',
    'Picard',
    'Lidl',
    'Aldi',
    'G20',
  ],
  GB: [
    "Sainsbury's Local",
    'Little Waitrose',
    'Marks & Spencer',
    'Tesco Express',
    'Tesco Extra',
    'Tesco Metro',
    "Sainsbury's",
    'Morrisons',
    'Waitrose',
    'Iceland',
    'M&S Food',
    'Tesco',
    'Asda',
    'Co-op',
    'Aldi',
    'Lidl',
    'M&S',
  ],
}

// The chains for the country chosen in Settings.
export function chainsFor(country: Country = getRegion().country): string[] {
  return CHAINS_BY_COUNTRY[country]
}

// Every chain, for names that come from OpenStreetMap, which are reliable in any country.
const ALL_CHAINS = [...new Set(Object.values(CHAINS_BY_COUNTRY).flat())].sort((a, b) => b.length - a.length)

const simplify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")

// Finds a chain name in OCR text or an OpenStreetMap name. Never relied on alone.
export function detectChain(text: string | undefined, chains: string[] = ALL_CHAINS): string | undefined {
  if (!text) return undefined
  const simple = simplify(text)
  return chains.find((chain) => {
    // Apostrophes and hyphens are optional, so "SAINSBURYS" and "COOP" still match.
    const name = simplify(chain)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/'/g, "'?")
      .replace(/-/g, '-?')
    return new RegExp(`(^|[^a-z0-9])${name}(?![a-z0-9])`).test(simple)
  })
}

export type ShopSuggestion = { shopId: number; reason: 'session' | 'chain' }

// The shop to preselect: the one from your last scan if it was recent, otherwise your most
// recently used shop of the chain named on the tag.
export function suggestShop(
  lastScan: { timestamp: number; shopId?: number } | undefined,
  savedShops: Shop[],
  chain: string | undefined,
  now = Date.now(),
): ShopSuggestion | undefined {
  if (lastScan?.shopId !== undefined && now - lastScan.timestamp < SHOP_SESSION_MINUTES * 60_000) {
    return { shopId: lastScan.shopId, reason: 'session' }
  }
  if (chain) {
    const match = savedShops
      .filter((s) => s.id !== undefined && s.chain === chain)
      .sort((a, b) => b.lastUsed - a.lastUsed)[0]
    if (match) return { shopId: match.id!, reason: 'chain' }
  }
  return undefined
}

// ---- Optional: shops near you, from OpenStreetMap ----

export type NearbyShop = Omit<Shop, 'id' | 'lastUsed' | 'source'> & { osmId: string; distance: number }

type OverpassElement = {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const SEARCH_RADIUS_M = 150

// Distance in metres between two points.
export function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function parseOverpass(elements: OverpassElement[], latitude: number, longitude: number): NearbyShop[] {
  return elements
    .flatMap((el): NearbyShop[] => {
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      const tags = el.tags ?? {}
      if (lat === undefined || lon === undefined) return []
      const name = tags.name ?? tags.brand ?? 'Unnamed shop'
      const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
      return [
        {
          osmId: `${el.type}/${el.id}`,
          name,
          chain: detectChain(tags.brand) ?? detectChain(name) ?? tags.brand,
          address: street || undefined,
          latitude: lat,
          longitude: lon,
          distance: distanceMetres(latitude, longitude, lat, lon),
        },
      ]
    })
    .sort((a, b) => a.distance - b.distance)
}

// Nearby results are kept in memory only, so searching again in the same area doesn't repeat the
// lookup while the app is open, but no position is ever saved on the phone.
const nearbyCache = new Map<string, NearbyShop[]>()

export function clearNearbyCache() {
  nearbyCache.clear()
}

// Earlier versions kept these results (labelled with the area) on the phone for 30 days: remove them.
try {
  for (const key of Object.keys(localStorage)) if (key.startsWith('nearby-shops:')) localStorage.removeItem(key)
} catch {
  // Storage unavailable; nothing to remove.
}

// Sends your approximate position to an OpenStreetMap Overpass server (and nowhere else) and
// returns food shops within 150 m, nearest first.
export async function fetchNearbyShops(latitude: number, longitude: number): Promise<NearbyShop[]> {
  // About 10 m precision is plenty for a 150 m search.
  const lat = Math.round(latitude * 10_000) / 10_000
  const lon = Math.round(longitude * 10_000) / 10_000
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`
  const cached = nearbyCache.get(cacheKey)
  if (cached) return cached.map((s) => ({ ...s, distance: distanceMetres(lat, lon, s.latitude!, s.longitude!) })).sort((a, b) => a.distance - b.distance)

  const query = `[out:json][timeout:15];nwr["shop"~"^(supermarket|convenience|greengrocer)$"](around:${SEARCH_RADIUS_M},${lat},${lon});out center tags;`
  // The main server is often busy, so a second public server is tried if it fails.
  let lastError: unknown
  for (const server of OVERPASS_SERVERS) {
    try {
      const elements = await queryOverpass(server, query)
      const shops = parseOverpass(elements, lat, lon)
      nearbyCache.set(cacheKey, shops)
      return shops
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

// The main OpenStreetMap search server (FOSSGIS, Germany), then a second public one (Private.coffee).
export const OVERPASS_SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']

async function queryOverpass(server: string, query: string): Promise<OverpassElement[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`OpenStreetMap replied ${response.status}`)
    const json = (await response.json()) as { elements?: OverpassElement[] }
    return json.elements ?? []
  } finally {
    clearTimeout(timer)
  }
}

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error('unsupported'))
    else navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 })
  })
}
