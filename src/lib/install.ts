import { useSyncExternalStore } from 'react'

// Chrome/Android only (Safari has no such event): instead of relying on Chrome's own menu,
// keep the install prompt and offer it from an "Instalar app" button.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __installPrompt?: BeforeInstallPromptEvent
  }
}

// The event is caught by an inline script in index.html, which may run before this module loads.
let deferred: BeforeInstallPromptEvent | null = window.__installPrompt ?? null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

window.addEventListener('vault:installable', () => {
  deferred = window.__installPrompt ?? null
  notify()
})

window.addEventListener('appinstalled', () => {
  deferred = null
  window.__installPrompt = undefined
  notify()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True while Chrome says the app can be installed (not installed yet, prompt not used). */
export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribe, () => deferred !== null)
}

/** Opens Chrome's install dialog. The prompt can only be used once, so the button goes away either way. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const event = deferred
  deferred = null
  window.__installPrompt = undefined
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}
