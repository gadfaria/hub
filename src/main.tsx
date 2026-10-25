import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/auth/AuthProvider'
import { completeRedirectSignIn } from '@/auth/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.tsx'

// Offline app shell. Production only: in dev the cache would serve stale modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('Service worker', err))
  })
}

// Coming back from a redirect sign-in (installed app): store the session before the first render.
await completeRedirectSignIn()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </AuthProvider>
  </StrictMode>,
)
