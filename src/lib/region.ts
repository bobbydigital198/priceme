// Your country and default currency, chosen in Settings and remembered on the phone.
// The country decides which supermarket chains are suggested; the currency is given to new shops.
// Each shop keeps its own currency, and each scan takes its shop's, so prices in different
// currencies are never averaged or compared together.
import { useSyncExternalStore } from 'react'

export type Currency = 'EUR' | 'GBP'
export type Country = 'FR' | 'GB'

export const CURRENCIES: Record<Currency, { name: string; symbol: string }> = {
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'Pound sterling', symbol: '£' },
}

export const COUNTRIES: Record<Country, { name: string; currency: Currency }> = {
  FR: { name: 'France', currency: 'EUR' },
  GB: { name: 'United Kingdom', currency: 'GBP' },
}

export type Region = { country: Country; currency: Currency }

const KEY = 'region'
const CHANGE = 'regionchange'
const DEFAULT: Region = { country: 'FR', currency: 'EUR' }

let cached: { raw: string | null; region: Region } | undefined

export function getRegion(): Region {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    // Storage unavailable: use the default.
  }
  // The same object is returned until the choice changes, as React requires.
  if (cached && cached.raw === raw) return cached.region
  let region = DEFAULT
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<Region>) : {}
    region = {
      country: saved.country && saved.country in COUNTRIES ? saved.country : DEFAULT.country,
      currency: saved.currency && saved.currency in CURRENCIES ? saved.currency : DEFAULT.currency,
    }
  } catch {
    // A damaged value: use the default.
  }
  cached = { raw, region }
  return region
}

export function setRegion(region: Region) {
  try {
    localStorage.setItem(KEY, JSON.stringify(region))
  } catch {
    // Not remembered next time.
  }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange)
  return () => window.removeEventListener(CHANGE, onChange)
}

export function useRegion(): Region {
  return useSyncExternalStore(subscribe, getRegion)
}

// Scans and shops saved before currencies existed were all in euros.
export function currencyOf(item: { currency?: Currency } | undefined): Currency {
  return item?.currency ?? 'EUR'
}
