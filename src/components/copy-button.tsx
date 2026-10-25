import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Copies `value` to the clipboard, with a check mark and a toast as feedback. */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copiado`)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Não foi possível copiar.")
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7 shrink-0 text-muted-foreground", className)}
      onClick={copy}
      aria-label={`Copiar ${label}`}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </Button>
  )
}
