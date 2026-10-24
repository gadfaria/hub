import { useState, type FormEvent } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { today } from '@/lib/format'
import type { Medication } from './types'
import type { MedicationInput } from './useHealth'

interface MedicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: string
  medication?: Medication
  onSubmit: (input: MedicationInput) => Promise<boolean>
  onDelete?: (medication: Medication) => void
}

export function MedicationDialog(props: MedicationDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.open && <MedicationForm key={props.medication?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function MedicationForm({ person, medication, onSubmit, onOpenChange, onDelete }: MedicationDialogProps) {
  const [values, setValues] = useState<MedicationInput>({
    person: medication?.person ?? person,
    name: medication?.name ?? '',
    dosage: medication?.dosage ?? '',
    frequency: medication?.frequency ?? '',
    startDate: medication?.startDate ?? today(),
    endDate: medication?.endDate ?? '',
    notes: medication?.notes ?? '',
  })
  const [pending, setPending] = useState(false)
  const set = (key: keyof MedicationInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!values.name.trim()) return
    setPending(true)
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])) as MedicationInput
    const ok = await onSubmit(trimmed)
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{medication ? 'Editar medicamento' : 'Novo medicamento'}</DialogTitle>
        <DialogDescription>Deixe o fim em branco enquanto estiver em uso.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Medicamento" id="med-name" className="col-span-2">
          <Input id="med-name" value={values.name} onChange={set('name')} placeholder="Ex.: Losartana" autoFocus />
        </Field>
        <Field label="Dose" optional id="med-dosage">
          <Input id="med-dosage" value={values.dosage} onChange={set('dosage')} placeholder="50 mg" />
        </Field>
        <Field label="Frequência" optional id="med-frequency">
          <Input id="med-frequency" value={values.frequency} onChange={set('frequency')} placeholder="1x ao dia" />
        </Field>
        <Field label="Início" optional id="med-start">
          <Input id="med-start" type="date" value={values.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="Fim" optional id="med-end">
          <Input id="med-end" type="date" value={values.endDate} onChange={set('endDate')} />
        </Field>
        <Field label="Observações" optional id="med-notes" className="col-span-2">
          <Textarea id="med-notes" value={values.notes} onChange={set('notes')} rows={2} placeholder="Ex.: em jejum" />
        </Field>
      </div>
      <DialogFooter className="sm:justify-between">
        {medication && onDelete ? (
          <Button type="button" variant="ghost" onClick={() => onDelete(medication)} disabled={pending}>
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || !values.name.trim()}>
          {pending ? 'Salvando…' : medication ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
