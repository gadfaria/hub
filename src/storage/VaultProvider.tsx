import { useCallback, useMemo, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { SessionExpiredError } from '@/auth/google'
import { VaultContext } from './context'
import { DriveClient, DriveError } from './drive'
import { Vault } from './vault'

export function VaultProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, markExpired } = useAuth()
  const vault = useMemo(() => new Vault(new DriveClient(getAccessToken)), [getAccessToken])

  const reportError = useCallback(
    (err: unknown) => {
      if (err instanceof SessionExpiredError) return
      if (err instanceof DriveError && err.status === 401) {
        markExpired()
        return
      }
      console.error(err)
      toast.error('Não foi possível falar com o Google Drive.', {
        description: err instanceof Error ? err.message : String(err),
      })
    },
    [markExpired],
  )

  const value = useMemo(() => ({ vault, reportError }), [vault, reportError])

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}
