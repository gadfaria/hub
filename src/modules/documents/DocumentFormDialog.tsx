import { useState, type FormEvent } from 'react'
import { FileIcon, XIcon } from 'lucide-react'
import { AttachmentPicker } from '@/components/attachments'
import { Field } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatBytes } from '@/lib/format'
import { DOCUMENT_TYPES, type DocumentType, type PersonalDocument } from './types'
import type { DocumentInput } from './useDocuments'

interface DocumentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, edits this document (files are managed in the detail dialog). */
  document?: PersonalDocument
  owners: string[]
  defaultOwner: string
  onSubmit: (input: DocumentInput, files: File[]) => Promise<boolean>
}

export function DocumentFormDialog(props: DocumentFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <DocumentForm key={props.document?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function DocumentForm({ document, owners, defaultOwner, onSubmit, onOpenChange }: DocumentFormDialogProps) {
  const [values, setValues] = useState<DocumentInput>({
    type: document?.type ?? 'id',
    title: document?.title ?? '',
    owner: document?.owner ?? defaultOwner,
    number: document?.number ?? '',
    issuer: document?.issuer ?? '',
    issueDate: document?.issueDate ?? '',
    expiryDate: document?.expiryDate ?? '',
    notes: document?.notes ?? '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [pending, setPending] = useState(false)

  const set = (key: keyof DocumentInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])) as DocumentInput
    const ok = await onSubmit(trimmed, files)
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{document ? 'Editar documento' : 'Novo documento'}</DialogTitle>
        <DialogDescription>Os arquivos ficam na pasta attachments do seu Drive.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo" id="doc-type">
          <Select value={values.type} onValueChange={(v) => setValues((s) => ({ ...s, type: v as DocumentType }))}>
            <SelectTrigger id="doc-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="De quem" id="doc-owner">
          <Input id="doc-owner" value={values.owner} onChange={set('owner')} list="doc-owners" autoComplete="off" />
          <datalist id="doc-owners">
            {owners.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        <Field label="Nome" optional id="doc-title" className="col-span-2">
          <Input id="doc-title" value={values.title} onChange={set('title')} placeholder="Ex.: Seguro do carro" />
        </Field>
        <Field label="Número" id="doc-number">
          <Input id="doc-number" value={values.number} onChange={set('number')} className="font-mono" autoFocus />
        </Field>
        <Field label="Órgão emissor" optional id="doc-issuer">
          <Input id="doc-issuer" value={values.issuer} onChange={set('issuer')} placeholder="Ex.: SSP/SP" />
        </Field>
        <Field label="Emissão" optional id="doc-issue">
          <Input id="doc-issue" type="date" value={values.issueDate} onChange={set('issueDate')} />
        </Field>
        <Field label="Validade" optional id="doc-expiry">
          <Input id="doc-expiry" type="date" value={values.expiryDate} onChange={set('expiryDate')} />
        </Field>
        <Field label="Observações" optional id="doc-notes" className="col-span-2">
          <Textarea id="doc-notes" value={values.notes} onChange={set('notes')} rows={2} />
        </Field>
      </div>

      {!document && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Arquivos</span>
            <AttachmentPicker onFiles={(picked) => setFiles((f) => [...f, ...picked])} disabled={pending} />
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Foto ou PDF do documento, frente e verso.</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-md border text-sm">
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`} className="flex items-center gap-2 px-3 py-2">
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={`Remover ${file.name}`}
                    onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? (files.length ? 'Enviando…' : 'Salvando…') : document ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
