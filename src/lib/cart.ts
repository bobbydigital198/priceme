// The shopping list you're working on. It's remembered on the phone, so closing the app
// doesn't lose it, and can be saved under a name in "My shopping lists".
import { useSyncExternalStore } from 'react'
import { db, type ShoppingList } from './db'
import type { Currency } from './region'
import type { ListItem } from './shoppingList'

export type Cart = {
  // Set when this is a saved list being edited.
  listId?: number
  name: string
  items: ListItem[]
  // Shops chosen for comparing; missing means every shop with a price.
  shopIds?: number[]
  currency?: Currency
}

const KEY = 'shopping-cart'
const CHANGE = 'cartchange'
const EMPTY: Cart = { name: '', items: [] }

let cached: { raw: string | null; cart: Cart } | undefined

export function getCart(): Cart {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    // Storage unavailable: start empty.
  }
  // The same object is returned until the list changes, as React requires.
  if (cached && cached.raw === raw) return cached.cart
  let cart = EMPTY
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<Cart>) : undefined
    if (saved && Array.isArray(saved.items)) {
      cart = {
        listId: typeof saved.listId === 'number' ? saved.listId : undefined,
        name: typeof saved.name === 'string' ? saved.name : '',
        items: saved.items.filter((i) => typeof i?.barcode === 'string' && typeof i.quantity === 'number' && i.quantity > 0),
        shopIds: Array.isArray(saved.shopIds) ? saved.shopIds.filter((id) => typeof id === 'number') : undefined,
        currency: saved.currency,
      }
    }
  } catch {
    // A damaged value: start empty.
  }
  cached = { raw, cart }
  return cart
}

export function setCart(next: Cart | ((current: Cart) => Cart)) {
  const cart = typeof next === 'function' ? next(getCart()) : next
  try {
    localStorage.setItem(KEY, JSON.stringify(cart))
  } catch {
    // Not remembered after closing the app, but still works now.
    cached = { raw: null, cart }
  }
  window.dispatchEvent(new Event(CHANGE))
}

export function clearCart() {
  setCart(EMPTY)
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange)
  return () => window.removeEventListener(CHANGE, onChange)
}

export function useCart(): Cart {
  return useSyncExternalStore(subscribe, getCart)
}

// ---- Saved lists ----

const listFields = (cart: Cart) => ({ items: cart.items, shopIds: cart.shopIds, currency: cart.currency })

// Saves the list under a new name and carries on editing the saved copy.
export async function saveCartAsNewList(name: string) {
  const cart = getCart()
  const now = Date.now()
  const listId = (await db.lists.add({ name, ...listFields(cart), createdAt: now, updatedAt: now })) as number
  setCart({ ...cart, listId, name })
}

// Saves changes to the saved list being edited.
export async function saveCartChanges() {
  const cart = getCart()
  if (cart.listId === undefined) return
  await db.lists.update(cart.listId, { name: cart.name, ...listFields(cart), updatedAt: Date.now() })
}

export function openList(list: ShoppingList) {
  setCart({ listId: list.id, name: list.name, items: list.items, shopIds: list.shopIds, currency: list.currency })
}

export async function deleteList(id: number) {
  await db.lists.delete(id)
  if (getCart().listId === id) setCart((cart) => ({ ...cart, listId: undefined, name: '' }))
}

// Whether the list being edited differs from its saved copy (or isn't saved and has items).
export function hasUnsavedChanges(cart: Cart, saved: ShoppingList | undefined): boolean {
  if (cart.listId === undefined || !saved) return cart.items.length > 0
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  return cart.name !== saved.name || !same(cart.items, saved.items) || !same(cart.shopIds, saved.shopIds) || !same(cart.currency, saved.currency)
}
