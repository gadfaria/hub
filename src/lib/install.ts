import { useSyncExternalStore } from 'react'

// Chrome/Android only (Safari has no such event): instead of relying on Chrome's own menu,
// keep the install prompt and offer it from an "Instalar app" button.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// Registered when this module loads (imported from main.tsx): the event can fire before React mounts.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferred = event as BeforeInstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  deferred = null
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
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}
