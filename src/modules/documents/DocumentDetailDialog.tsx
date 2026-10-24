import { useState } from 'react'
import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AttachmentGrid, AttachmentPicker } from '@/components/attachments'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Attachment } from '@/domain/types'
import { formatDate } from '@/lib/format'
import { ExpiryBadge } from '@/components/expiry-badge'
import { DOCUMENT_TYPES, documentLabel, expiryStatus, type PersonalDocument } from './types'

interface DocumentDetailDialogProps {
  document: PersonalDocument | null
  onClose: () => void
  onEdit: (document: PersonalDocument) => void
  onDelete: (document: PersonalDocument) => void
  onAddFiles: (document: PersonalDocument, files: File[]) => Promise<boolean>
  onRemoveFile: (document: PersonalDocument, attachment: Attachment) => Promise<boolean>
}

export function DocumentDetailDialog(props: DocumentDetailDialogProps) {
  return (
    <Dialog open={props.document !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {props.document && <DocumentDetail {...props} document={props.document} />}
      </DialogContent>
    </Dialog>
  )
}

function DocumentDetail({
  document,
  onEdit,
  onDelete,
  onAddFiles,
  onRemoveFile,
}: DocumentDetailDialogProps & { document: PersonalDocument }) {
  const [uploading, setUploading] = useState(false)

  const fields: [string, string][] = [
    ['De quem', document.owner],
    ['Órgão emissor', document.issuer],
    ['Emissão', document.issueDate ? formatDate(document.issueDate) : ''],
    ['Validade', document.expiryDate ? formatDate(document.expiryDate) : ''],
  ]

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(document.number)
      toast.success('Número copiado')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogDescription>
          {DOCUMENT_TYPES[document.type]}
          {document.owner && ` · ${document.owner}`}
        </DialogDescription>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {documentLabel(document)}
          <ExpiryBadge status={expiryStatus(document)} expiryDate={document.expiryDate} />
        </DialogTitle>
      </DialogHeader>

      {document.number && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">Número</span>
            <span className="truncate font-mono text-lg font-medium tracking-wide">{document.number}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={copyNumber} aria-label="Copiar número">
            <CopyIcon />
          </Button>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        {fields.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {document.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{document.notes}</p>}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Arquivos</span>
          <AttachmentPicker
            pending={uploading}
            onFiles={async (files) => {
              setUploading(true)
              await onAddFiles(document, files)
              setUploading(false)
            }}
          />
        </div>
        {document.attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo. Anexe uma foto ou PDF do documento.</p>
        ) : (
          <AttachmentGrid attachments={document.attachments} onRemove={(a) => onRemoveFile(document, a)} />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" size="sm" onClick={() => onEdit(document)}>
          Editar documento
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(document)}>
          Excluir documento
        </Button>
      </div>
    </div>
  )
}
