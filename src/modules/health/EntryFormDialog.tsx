import { useState, type FormEvent } from 'react'
import { AttachmentGrid, AttachmentPicker, PendingFileList } from '@/components/attachments'
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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { Attachment } from '@/domain/types'
import { formatMoneyInput, parseMoney, today } from '@/lib/format'
import { ENTRY_KINDS, type EntryKind, type HealthEntry } from './types'
import type { EntryInput } from './useHealth'

/** What the "next date" means for each kind. */
const NEXT_DATE_LABEL: Record<EntryKind, string> = {
  appointment: 'Retorno',
  exam: 'Repetir em',
  vaccine: 'Próxima dose',
  procedure: 'Acompanhamento',
  other: 'Próxima data',
}

interface EntryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: string
  people: string[]
  /** Doctors, clinics and labs used before, suggested while typing. */
  providers: string[]
  entry?: HealthEntry
  onSubmit: (input: EntryInput, newFiles: File[], removed: Attachment[]) => Promise<boolean>
  onDelete?: (entry: HealthEntry) => void
}

export function EntryFormDialog(props: EntryFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {props.open && <EntryForm key={props.entry?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function EntryForm({ person, people, providers, entry, onSubmit, onOpenChange, onDelete }: EntryFormDialogProps) {
  const [values, setValues] = useState({
    person: entry?.person ?? person,
    kind: entry?.kind ?? ('appointment' as EntryKind),
    date: entry?.date ?? today(),
    title: entry?.title ?? '',
    provider: entry?.provider ?? '',
    specialty: entry?.specialty ?? '',
    notes: entry?.notes ?? '',
    cost: entry?.cost ? formatMoneyInput(entry.cost) : '',
    nextDate: entry?.nextDate ?? '',
  })
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [removed, setRemoved] = useState<Attachment[]>([])
  const [pending, setPending] = useState(false)

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))
  const existing = (entry?.attachments ?? []).filter((a) => !removed.some((r) => r.id === a.id))
  const valid = values.date !== '' && values.title.trim() !== '' && values.person.trim() !== ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit(
      {
        person: values.person.trim(),
        kind: values.kind,
        date: values.date,
        title: values.title.trim(),
        provider: values.provider.trim(),
        specialty: values.specialty.trim(),
        notes: values.notes.trim(),
        cost: parseMoney(values.cost) ?? 0,
        nextDate: values.nextDate,
      },
      newFiles,
      removed,
    )
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{entry ? 'Editar registro' : 'Novo registro'}</DialogTitle>
        <DialogDescription>Consultas, exames, vacinas e procedimentos, com resultados anexados.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Tipo" id="entry-kind">
          <Select value={values.kind} onValueChange={(v) => setValues((s) => ({ ...s, kind: v as EntryKind }))}>
            <SelectTrigger id="entry-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENTRY_KINDS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Data" id="entry-date">
          <Input id="entry-date" type="date" value={values.date} onChange={set('date')} />
        </Field>
        <Field label="Pessoa" id="entry-person" className="col-span-2 sm:col-span-1">
          <Input id="entry-person" value={values.person} onChange={set('person')} list="entry-people" autoComplete="off" />
          <datalist id="entry-people">
            {people.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Descrição" id="entry-title" className="col-span-2 sm:col-span-3">
          <Input
            id="entry-title"
            value={values.title}
            onChange={set('title')}
            placeholder="Ex.: Check-up anual, Hemograma, Gripe 2026"
            autoFocus
          />
        </Field>
        <Field label="Médico / local" optional id="entry-provider" className="col-span-2">
          <Input id="entry-provider" value={values.provider} onChange={set('provider')} list="entry-providers" autoComplete="off" />
          <datalist id="entry-providers">
            {providers.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Especialidade" optional id="entry-specialty">
          <Input id="entry-specialty" value={values.specialty} onChange={set('specialty')} placeholder="Cardiologia" />
        </Field>
        <Field label={NEXT_DATE_LABEL[values.kind]} optional id="entry-next">
          <Input id="entry-next" type="date" value={values.nextDate} onChange={set('nextDate')} />
        </Field>
        <Field label="Valor" optional id="entry-cost">
          <Input
            id="entry-cost"
            value={values.cost}
            onChange={set('cost')}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Observações" optional id="entry-notes" className="col-span-2 sm:col-span-3">
          <Textarea
            id="entry-notes"
            value={values.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Diagnóstico, orientações, resultados importantes…"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Arquivos</span>
          <AttachmentPicker onFiles={(files) => setNewFiles((f) => [...f, ...files])} disabled={pending} />
        </div>
        {existing.length > 0 && (
          <AttachmentGrid attachments={existing} onRemove={(a) => setRemoved((r) => [...r, a])} />
        )}
        {newFiles.length > 0 && (
          <PendingFileList files={newFiles} onRemove={(i) => setNewFiles((f) => f.filter((_, j) => j !== i))} />
        )}
        {existing.length === 0 && newFiles.length === 0 && (
          <p className="text-sm text-muted-foreground">Resultado de exame, receita, carteira de vacinação…</p>
        )}
      </div>

      <Separator />

      <DialogFooter className="sm:justify-between">
        {entry && onDelete ? (
          <Button type="button" variant="ghost" onClick={() => onDelete(entry)} disabled={pending}>
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || !valid}>
          {pending ? (newFiles.length ? 'Enviando…' : 'Salvando…') : entry ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
