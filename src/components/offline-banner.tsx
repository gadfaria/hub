import { useSyncExternalStore } from "react"
import { WifiOffIcon } from "lucide-react"

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

/** The app shell works offline, but the data lives on Drive: say so instead of failing silently. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine)
  if (online) return null
  return (
    <div className="flex items-center gap-2 border-b bg-muted px-4 py-2 text-sm text-muted-foreground lg:px-6">
      <WifiOffIcon className="size-4 shrink-0" />
      Sem conexão. Seus dados estão no Drive e voltam a carregar quando a internet voltar.
    </div>
  )
}
