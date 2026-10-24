import { createContext, useContext } from 'react'
import type { Vault } from './vault'

export interface VaultContextValue {
  vault: Vault
  /** Routes an error to the right place: session errors to re-login, the rest to a toast. */
  reportError: (err: unknown) => void
}

export const VaultContext = createContext<VaultContextValue | null>(null)

export function useVaultContext(): VaultContextValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVaultContext must be used inside <VaultProvider>')
  return ctx
}
