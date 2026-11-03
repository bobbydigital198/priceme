// Light or dark mode: follow the phone, or the choice made in Settings (remembered on the phone).
// index.html applies a saved choice before the app appears, so it never flashes the wrong colours.
import { useSyncExternalStore } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'theme'
const CHANGE = 'themechange'
const query = '(prefers-color-scheme: dark)'
// The phone's status bar colour in each mode (each palette's background).
const BAR_COLOUR = { light: '#f4faf6', dark: '#0a1812' }

export function getThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

export function isDark(choice = getThemeChoice()): boolean {
  return choice === 'dark' || (choice === 'system' && matchMedia(query).matches)
}

function applyTheme(choice: ThemeChoice) {
  if (choice === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = choice
  // Status bar: a chosen mode overrides the phone's light/dark setting.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const ownMode = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = BAR_COLOUR[choice === 'system' ? ownMode : choice]
  }
  window.dispatchEvent(new Event(CHANGE))
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // Not remembered next time, but still applied now.
  }
  applyTheme(choice)
}

// Keep the status bar right for a choice saved earlier.
applyTheme(getThemeChoice())

function subscribe(onChange: () => void) {
  const media = matchMedia(query)
  media.addEventListener('change', onChange)
  window.addEventListener(CHANGE, onChange)
  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener(CHANGE, onChange)
  }
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, getThemeChoice)
}

// True while the app is showing dark mode, whether from the phone or from Settings.
export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, () => isDark())
}
