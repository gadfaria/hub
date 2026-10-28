import { WifiOffIcon } from "lucide-react"
import { useOnline } from "@/hooks/use-online"

/** The app shell works offline, but the data lives on Drive: say so instead of failing silently. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="flex items-center gap-2 border-b bg-muted px-4 py-2 text-sm text-muted-foreground lg:px-6">
      <WifiOffIcon className="size-4 shrink-0" />
      Sem conexão. As notas ficam disponíveis para leitura; o resto volta a carregar quando a internet voltar.
    </div>
  )
}
