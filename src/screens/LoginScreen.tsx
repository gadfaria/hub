import { useState } from 'react'
import { useAuth } from '@/auth/context'
import { GOOGLE_CLIENT_ID, takeRedirectError } from '@/auth/google'
import { Button } from '@/components/ui/button'

export function LoginScreen() {
  const { session, signIn, signOut } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(takeRedirectError)

  async function handleSignIn() {
    setPending(true)
    setError(null)
    try {
      await signIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-xs flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground">
            {session
              ? 'Sua sessão expirou. Conecte de novo para continuar.'
              : 'Seus dados, guardados no seu próprio Google Drive.'}
          </p>
        </div>

        {GOOGLE_CLIENT_ID ? (
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={handleSignIn} disabled={pending}>
              {session ? `Continuar como ${session.name.split(' ')[0]}` : 'Entrar com Google'}
            </Button>
            {session && (
              <Button variant="ghost" size="sm" onClick={signOut} disabled={pending}>
                Usar outra conta
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Defina <code className="font-mono text-foreground">VITE_GOOGLE_CLIENT_ID</code> no arquivo{' '}
            <code className="font-mono text-foreground">.env.local</code> para ativar o login.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </main>
  )
}
