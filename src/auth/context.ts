import { createContext, useContext } from 'react'
import type { Session } from './google'

export interface AuthContextValue {
  session: Session | null
  /** The access token (1h) ran out; the user must click to reconnect. */
  expired: boolean
  signIn: () => Promise<void>
  signOut: () => void
  markExpired: () => void
  getAccessToken: () => Promise<string>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
