import { useSyncExternalStore } from 'react'

// "Hide values": masks every amount on screen, for opening the app next to someone.
// Kept in localStorage so it stays on after a reload or reopening the installed app.
const KEY = 'vault.hideValues'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let hidden = read()

export function valuesHidden(): boolean {
  return hidden
}

export function setValuesHidden(value: boolean) {
  hidden = value
  try {
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // Private mode: the toggle still works until the page is closed.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Re-renders when values are hidden or shown. Used at the root, so every screen picks it up. */
export function useValuesHidden(): boolean {
  return useSyncExternalStore(subscribe, valuesHidden)
}
