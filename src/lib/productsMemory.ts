// Lets Products pick up where you left off when you come back from a product's page: the same
// view, the same groups open and the same scroll position. Arriving any other way (from the
// menu) starts afresh, with every group closed and the page at the top.
export type ProductsView = 'category' | 'brand'

const memory: { view: ProductsView; open: Set<string>; scrollY?: number } = { view: 'category', open: new Set() }

// The view (by category or by brand) is kept either way, as a preference.
export const rememberedView = () => memory.view

// The open groups, only when coming back from a product.
export const rememberedOpen = () => (memory.scrollY !== undefined ? memory.open : new Set<string>())

export function rememberView(view: ProductsView) {
  memory.view = view
}

export function rememberOpen(open: Set<string>) {
  memory.open = open
}

// Called when opening a product from the list.
export function rememberScroll(y: number) {
  memory.scrollY = y
}

// The saved scroll position, once: later visits start afresh.
export function takeScroll(): number | undefined {
  const y = memory.scrollY
  memory.scrollY = undefined
  return y
}
