import { describe, expect, it } from 'vitest'
import type { Shop } from './db'
import { chainsFor, detectChain, distanceMetres, parseOverpass, suggestShop } from './shops'

describe('detectChain', () => {
  it.each([
    ['FRANPRIX\nBeurre doux 2,89 €', 'Franprix'],
    ['monoprix', 'Monoprix'],
    ["MONOP' Paris", "Monop'"],
    ['Monop Bercy', "Monop'"],
    ['Carrefour City Turbigo', 'Carrefour City'],
    ['CARREFOUR MARKET', 'Carrefour Market'],
    ['INTERMARCHE', 'Intermarché'],
    ['Intermarché Express', 'Intermarché'],
    ['g20 rue de rivoli', 'G20'],
    ['Leader Price', 'Leader Price'],
  ])('finds the chain in %j', (text, chain) => {
    expect(detectChain(text)).toBe(chain)
  })

  it.each([
    ["SAINSBURY'S Local", "Sainsbury's Local"],
    ['Sainsburys', "Sainsbury's"],
    ['TESCO Express', 'Tesco Express'],
    ['tesco', 'Tesco'],
    ['COOP', 'Co-op'],
    ['M&S Food Hall', 'M&S Food'],
    ['Waitrose & Partners', 'Waitrose'],
  ])('finds the UK chain in %j', (text, chain) => {
    expect(detectChain(text, chainsFor('GB'))).toBe(chain)
  })

  it('only looks for the chosen country’s chains on tags', () => {
    expect(detectChain('TESCO', chainsFor('FR'))).toBeUndefined()
    expect(detectChain('Franprix', chainsFor('GB'))).toBeUndefined()
    expect(detectChain('Lidl', chainsFor('GB'))).toBe('Lidl')
  })

  it('ignores chain names inside other words', () => {
    expect(detectChain('ALDINE')).toBeUndefined()
    expect(detectChain('casinos')).toBeUndefined()
    expect(detectChain('PG200')).toBeUndefined()
  })

  it('finds nothing in ordinary tag text', () => {
    expect(detectChain('PENNE RIGATE 500 g 1,49 €')).toBeUndefined()
    expect(detectChain(undefined)).toBeUndefined()
  })
})

describe('suggestShop', () => {
  const now = 1_000_000_000
  const shops: Shop[] = [
    { id: 1, name: 'Franprix', chain: 'Franprix', address: 'Rue de Rivoli', source: 'manual', lastUsed: now - 5 * 86_400_000 },
    { id: 2, name: 'Franprix', chain: 'Franprix', address: 'Rue Saint-Antoine', source: 'manual', lastUsed: now - 86_400_000 },
    { id: 3, name: 'Monoprix', chain: 'Monoprix', source: 'manual', lastUsed: now - 2 * 86_400_000 },
  ]

  it('keeps the shop from a scan less than 30 minutes ago', () => {
    expect(suggestShop({ timestamp: now - 10 * 60_000, shopId: 3 }, shops, 'Franprix', now)).toEqual({ shopId: 3, reason: 'session' })
  })

  it('falls back to the most recent shop of the chain on the tag', () => {
    expect(suggestShop({ timestamp: now - 45 * 60_000, shopId: 3 }, shops, 'Franprix', now)).toEqual({ shopId: 2, reason: 'chain' })
  })

  it('suggests nothing without a recent scan or a known chain', () => {
    expect(suggestShop(undefined, shops, undefined, now)).toBeUndefined()
    expect(suggestShop({ timestamp: now - 45 * 60_000, shopId: 3 }, shops, 'Lidl', now)).toBeUndefined()
    expect(suggestShop({ timestamp: now - 5 * 60_000 }, shops, undefined, now)).toBeUndefined()
  })
})

describe('distanceMetres', () => {
  it('measures short distances in Paris', () => {
    // Châtelet to Hôtel de Ville is roughly 450 m.
    const d = distanceMetres(48.8584, 2.3470, 48.8566, 2.3522)
    expect(d).toBeGreaterThan(400)
    expect(d).toBeLessThan(500)
  })
})

describe('parseOverpass', () => {
  it('turns OpenStreetMap results into shops, nearest first', () => {
    const shops = parseOverpass(
      [
        { type: 'node', id: 2, lat: 48.8600, lon: 2.3470, tags: { name: 'Monop’ Châtelet', brand: 'Monop’', 'addr:street': 'Rue de Rivoli', 'addr:housenumber': '52' } },
        { type: 'way', id: 7, center: { lat: 48.8586, lon: 2.3471 }, tags: { name: 'Franprix', shop: 'supermarket' } },
        { type: 'node', id: 9, lat: 48.8590, lon: 2.3480, tags: { shop: 'convenience' } },
        { type: 'node', id: 10, tags: { name: 'No position' } },
      ],
      48.8584,
      2.347,
    )
    expect(shops.map((s) => s.osmId)).toEqual(['way/7', 'node/9', 'node/2'])
    expect(shops[0]).toMatchObject({ name: 'Franprix', chain: 'Franprix', address: undefined, latitude: 48.8586 })
    expect(shops[1].name).toBe('Unnamed shop')
    expect(shops[2]).toMatchObject({ chain: "Monop'", address: '52 Rue de Rivoli' })
    expect(shops[0].distance).toBeLessThan(shops[2].distance)
  })
})
