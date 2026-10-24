import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/context'
import { AppLayout } from '@/components/app-layout'
import { MODULES } from '@/modules'
import { LoginScreen } from '@/screens/LoginScreen'
import { VaultProvider } from '@/storage/VaultProvider'

/** Hash routing (#/financas): works on any static host and keeps the phone's back button. */
function useRoute(): string {
  const [hash, setHash] = useState(() => location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash.replace(/^#\/?/, '')
}

export default function App() {
  const { session, expired } = useAuth()
  const route = useRoute()
  if (!session || expired) return <LoginScreen />

  // Unknown routes (and "/") land on the first module.
  const active = MODULES.find((m) => m.id === route) ?? MODULES[0]
  return (
    <VaultProvider>
      <AppLayout activeId={active.id}>
        <active.Screen />
      </AppLayout>
    </VaultProvider>
  )
}
