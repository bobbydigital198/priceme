import { useEffect, useState } from 'react'

// iPhones and iPads (newer iPads report themselves as Macs with a touch screen).
export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
}

// True when opened from the home-screen icon rather than a browser tab.
export function isInstalled(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

type InstallPromptEvent = Event & { prompt: () => Promise<void> }

let deferredPrompt: InstallPromptEvent | undefined
const listeners = new Set<() => void>()

// Chrome on Android offers its own install prompt; keep it so we can show an Install button.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt = event as InstallPromptEvent
  listeners.forEach((l) => l())
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = undefined
  listeners.forEach((l) => l())
})

// An install function when the browser supports one-tap installing (Android Chrome), otherwise undefined.
export function useInstallPrompt(): (() => Promise<void>) | undefined {
  const [, setTick] = useState(0)
  useEffect(() => {
    const update = () => setTick((t) => t + 1)
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])
  if (!deferredPrompt) return undefined
  const prompt = deferredPrompt
  return async () => {
    await prompt.prompt()
    deferredPrompt = undefined
    listeners.forEach((l) => l())
  }
}
