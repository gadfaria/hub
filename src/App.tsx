import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/context'
import { AppLayout } from '@/components/app-layout'
import { MODULES } from '@/modules'
import { useValuesHidden } from '@/lib/privacy'
import { LoginScreen } from '@/screens/LoginScreen'
import { VaultProvider } from '@/storage/VaultProvider'

/** Hash routing (#/finance): works on any static host and keeps the phone's back button. */
function useRoute(): string[] {
  const [hash, setHash] = useState(() => location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
}

export default function App() {
  const { session, expired } = useAuth()
  const [moduleId, ...path] = useRoute()
  // Subscribed here so the whole tree re-renders, and every formatMoney masks or unmasks, on toggle.
  useValuesHidden()
  if (!session || expired) return <LoginScreen />

  // Unknown routes (and "/") land on the first module.
  const active = MODULES.find((m) => m.id === moduleId)
  const Screen = (active ?? MODULES[0]).Screen
  return (
    <VaultProvider>
      <AppLayout activeId={(active ?? MODULES[0]).id}>
        <Screen path={active ? path : []} />
      </AppLayout>
    </VaultProvider>
  )
}
