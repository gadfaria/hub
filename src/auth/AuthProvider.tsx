import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AuthContext } from './context'
import {
  clearSession,
  isExpired,
  loadSession,
  SessionExpiredError,
  signIn as googleSignIn,
  type Session,
} from './google'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState(loadSession)
  const [expired, setExpired] = useState(() => (session ? isExpired(session) : false))
  // Mirrors `session` so getAccessToken stays stable and never reads a stale value.
  const sessionRef = useRef<Session | null>(session)

  const setSession = useCallback((next: Session | null) => {
    sessionRef.current = next
    setSessionState(next)
  }, [])

  const signIn = useCallback(async () => {
    setSession(await googleSignIn(sessionRef.current?.email))
    setExpired(false)
  }, [setSession])

  const signOut = useCallback(() => {
    clearSession()
    setSession(null)
    setExpired(false)
  }, [setSession])

  const markExpired = useCallback(() => setExpired(true), [])

  const getAccessToken = useCallback(async () => {
    const current = sessionRef.current
    if (!current || isExpired(current)) {
      setExpired(true)
      throw new SessionExpiredError()
    }
    return current.accessToken
  }, [])

  const value = useMemo(
    () => ({ session, expired, signIn, signOut, markExpired, getAccessToken }),
    [session, expired, signIn, signOut, markExpired, getAccessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
