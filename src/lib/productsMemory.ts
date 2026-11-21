// Remembered while the app is open, so coming back to Products from a product finds the list
// as you left it: the same view, the same groups open, and the same scroll position.
export type ProductsView = 'category' | 'brand'

const memory: { view: ProductsView; open: Set<string>; scrollY?: number } = { view: 'category', open: new Set() }

export const rememberedView = () => memory.view
export const rememberedOpen = () => memory.open

export function rememberView(view: ProductsView) {
  memory.view = view
}

export function rememberOpen(open: Set<string>) {
  memory.open = open
}

export function rememberScroll(y: number) {
  memory.scrollY = y
}

// The saved scroll position, once: later visits start at the top.
export function takeScroll(): number | undefined {
  const y = memory.scrollY
  memory.scrollY = undefined
  return y
}
