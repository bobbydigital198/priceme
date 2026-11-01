import { useSyncExternalStore } from 'react'

// Shop colours for the price chart, in a fixed order that stays tellable apart with
// colour-blindness (checked with the dataviz palette validator against the app's
// light #ffffff and dark #1d1d1d surfaces). A 9th shop and beyond share the "other" grey.
const SHOP_COLOURS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}
const OTHER = '#898781'

export const CHART_INK = {
  light: { surface: '#ffffff', grid: '#e1e0d9', axis: '#c3c2b7', muted: '#6b6a66', text: '#111111' },
  dark: { surface: '#1d1d1d', grid: '#2c2c2a', axis: '#383835', muted: '#a8a8a4', text: '#f4f4f2' },
}

export function shopColour(index: number, dark: boolean): string {
  const colours = dark ? SHOP_COLOURS.dark : SHOP_COLOURS.light
  return index >= 0 && index < colours.length ? colours[index] : OTHER
}

const query = '(prefers-color-scheme: dark)'

// True while the phone is in dark mode; updates when it changes.
export function useDarkMode(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
  )
}
