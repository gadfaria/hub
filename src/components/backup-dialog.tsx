import { useEffect, useRef, useState } from "react"
import { DownloadIcon, ExternalLinkIcon, FileUpIcon, FolderUpIcon, Loader2Icon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { SCHEMA_VERSION } from "@/domain/types"
import { today } from "@/lib/format"
import { MODULES } from "@/modules"
import { useVaultContext } from "@/storage/context"
import type { BackupInfo } from "@/storage/vault"

const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`

function ago(createdTime: string): string {
  const minutes = Math.round((Date.now() - new Date(createdTime).getTime()) / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? "ontem" : `há ${days} dias`
}

function moduleNames(keys: string[]): string {
  return keys.map((key) => MODULES.find((m) => m.id === key)?.name ?? key).join(", ")
}

/** What a restore will apply, once read from a Drive backup or an uploaded file. */
interface PendingRestore {
  source: string
  collections: Record<string, unknown>
}

type Busy = "drive" | "download" | "read" | "restore" | null

export function BackupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">{open && <BackupPanel />}</DialogContent>
    </Dialog>
  )
}

function BackupPanel() {
  const { vault, reportError } = useVaultContext()
  const [backups, setBackups] = useState<BackupInfo[] | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [restoring, setRestoring] = useState<PendingRestore | null>(null)
  const [readingId, setReadingId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    vault
      .open()
      .then(() => vault.listBackups())
      .then(
        (list) => !cancelled && setBackups(list),
        (err) => {
          if (cancelled) return
          setBackups([])
          reportError(err)
        },
      )
    return () => {
      cancelled = true
    }
  }, [vault, reportError])

  async function backupToDrive() {
    setBusy("drive")
    try {
      const created = await vault.backup()
      setBackups((list) => [created, ...(list ?? [])])
      toast.success(`Backup ${created.name} criado`, {
        description: `${created.files} ${created.files === 1 ? "arquivo copiado" : "arquivos copiados"} para backup-db-vault`,
        action: { label: "Abrir", onClick: () => window.open(folderUrl(created.id), "_blank", "noreferrer") },
      })
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(null)
    }
  }

  async function download() {
    setBusy("download")
    try {
      const collections = await vault.exportAll()
      const payload = { app: "db-vault", schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), collections }
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `db-vault-${today()}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(null)
    }
  }

  async function prepareFromDrive(backup: BackupInfo) {
    setBusy("read")
    setReadingId(backup.id)
    try {
      const collections = await vault.readBackup(backup.id)
      if (Object.keys(collections).length === 0) toast.error("Esse backup está vazio.")
      else setRestoring({ source: `o backup ${backup.name}`, collections })
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(null)
      setReadingId(null)
    }
  }

  async function prepareFromFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const collections = parsed?.collections
      if (parsed?.app !== "db-vault" || typeof collections !== "object" || collections === null) {
        throw new Error("not a db-vault export")
      }
      if (Object.keys(collections).length === 0) toast.error("Esse arquivo não tem dados.")
      else setRestoring({ source: `o arquivo ${file.name}`, collections })
    } catch {
      toast.error("Arquivo inválido", { description: 'Use um .json gerado em "Baixar cópia".' })
    }
  }

  async function restore() {
    if (!restoring) return
    setBusy("restore")
    try {
      // Safety net: snapshot the current data first, so a wrong restore can be undone.
      const safety = await vault.backup()
      const keys = await vault.restore(restoring.collections)
      toast.success("Dados restaurados", {
        description: `${moduleNames(keys)}. O estado anterior ficou salvo no backup ${safety.name}.`,
      })
      // Every screen holds its collection in memory; reloading is the simplest way to show the restored data.
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      reportError(err)
      setBusy(null)
      setRestoring(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Backup</DialogTitle>
        <DialogDescription>
          Copia os dados de todos os módulos para a pasta{" "}
          <span className="font-mono whitespace-nowrap">backup-db-vault</span> do seu Drive, numa pasta com a data e
          hora. Os anexos não são copiados: eles já ficam no Drive.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Button onClick={backupToDrive} disabled={busy !== null}>
          {busy === "drive" ? <Loader2Icon className="animate-spin" /> : <FolderUpIcon />}
          {busy === "drive" ? "Fazendo backup…" : "Fazer backup no Drive"}
        </Button>
        <Button variant="outline" onClick={download} disabled={busy !== null}>
          {busy === "download" ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
          Baixar cópia (.json)
        </Button>
        <p className="text-xs text-muted-foreground">
          A cópia baixada fica no seu computador e protege até se você perder acesso à conta Google.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Backups no Drive</span>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) prepareFromFile(file)
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
            <FileUpIcon />
            Restaurar de arquivo
          </Button>
        </div>
        {backups === null ? (
          <Skeleton className="h-16 w-full" />
        ) : backups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum backup ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {backups.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center gap-2 py-1.5">
                <span className="font-mono">{b.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{b.createdTime && ago(b.createdTime)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => prepareFromDrive(b)}
                  disabled={busy !== null}
                  aria-label={`Restaurar backup ${b.name}`}
                  title="Restaurar"
                >
                  {readingId === b.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <RotateCcwIcon className="size-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="size-7" asChild>
                  <a href={folderUrl(b.id)} target="_blank" rel="noreferrer" aria-label={`Abrir backup ${b.name} no Drive`} title="Abrir no Drive">
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {backups && backups.length > 5 && (
          <p className="text-xs text-muted-foreground">E mais {backups.length - 5} na pasta backup-db-vault.</p>
        )}
      </div>

      <AlertDialog open={restoring !== null} onOpenChange={(open) => !open && busy !== "restore" && setRestoring(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar dados?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>
                  Os dados atuais de <strong className="text-foreground">{restoring && moduleNames(Object.keys(restoring.collections))}</strong>{" "}
                  serão substituídos pelos de {restoring?.source}. Os outros módulos não mudam.
                </p>
                <p>Antes disso, um backup automático do estado atual é feito no Drive, para você poder desfazer.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "restore"}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while restoring; the page reloads when done.
                e.preventDefault()
                restore()
              }}
              disabled={busy === "restore"}
            >
              {busy === "restore" && <Loader2Icon className="animate-spin" />}
              {busy === "restore" ? "Restaurando…" : "Restaurar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
