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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { Attachment } from '@/domain/types'
import { addMonths, formatMoney, formatMoneyInput, parseMoney, today } from '@/lib/format'
import type { InsurancePolicy } from './types'
import type { PolicyInput } from './useVehicles'

interface PolicyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy?: InsurancePolicy
  /** Prefills a renewal: same insurer, broker and phone, period starting when this one ends. */
  renewing?: InsurancePolicy
  onSubmit: (input: PolicyInput, newFiles: File[], removed: Attachment[]) => Promise<boolean>
  onDelete?: (policy: InsurancePolicy) => void
}

export function PolicyFormDialog(props: PolicyFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {props.open && <PolicyForm key={props.policy?.id ?? `new-${props.renewing?.id ?? ''}`} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function PolicyForm({ policy, renewing, onSubmit, onOpenChange, onDelete }: PolicyFormDialogProps) {
  const source = policy ?? renewing
  const start = policy?.startDate ?? renewing?.endDate ?? today()
  const [values, setValues] = useState({
    insurer: source?.insurer ?? '',
    policyNumber: policy?.policyNumber ?? '',
    broker: source?.broker ?? '',
    startDate: start,
    endDate: policy?.endDate ?? addMonths(start, 12),
    premium: policy ? formatMoneyInput(policy.premium) : '',
    installments: String(policy?.installments ?? source?.installments ?? 1),
    deductible: policy?.deductible ? formatMoneyInput(policy.deductible) : '',
    coverages: source?.coverages ?? '',
    assistancePhone: source?.assistancePhone ?? '',
    notes: policy?.notes ?? '',
  })
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [removed, setRemoved] = useState<Attachment[]>([])
  const [pending, setPending] = useState(false)

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))
  const premium = parseMoney(values.premium) ?? 0
  const installments = Math.max(1, Math.round(Number(values.installments) || 1))
  const existing = (policy?.attachments ?? []).filter((a) => !removed.some((r) => r.id === a.id))
  const valid =
    values.insurer.trim() !== '' && values.startDate !== '' && values.endDate !== '' && values.endDate >= values.startDate

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit(
      {
        insurer: values.insurer.trim(),
        policyNumber: values.policyNumber.trim(),
        broker: values.broker.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        premium,
        installments,
        deductible: parseMoney(values.deductible) ?? 0,
        coverages: values.coverages.trim(),
        assistancePhone: values.assistancePhone.trim(),
        notes: values.notes.trim(),
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
        <DialogTitle>{policy ? 'Editar seguro' : renewing ? 'Renovar seguro' : 'Novo seguro'}</DialogTitle>
        <DialogDescription>
          {renewing && !policy
            ? 'A apólice anterior fica no histórico.'
            : 'Dados da apólice; anexe o PDF para ter tudo à mão.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Seguradora" id="policy-insurer">
          <Input id="policy-insurer" value={values.insurer} onChange={set('insurer')} placeholder="Ex.: Tokio Marine" autoFocus />
        </Field>
        <Field label="Apólice" optional id="policy-number">
          <Input id="policy-number" value={values.policyNumber} onChange={set('policyNumber')} className="font-mono" />
        </Field>
        <Field label="Início da vigência" id="policy-start">
          <Input
            id="policy-start"
            type="date"
            value={values.startDate}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                startDate: e.target.value,
                // Keep a one-year period when the end still matches the old default.
                endDate: v.endDate === addMonths(v.startDate, 12) && e.target.value ? addMonths(e.target.value, 12) : v.endDate,
              }))
            }
          />
        </Field>
        <Field label="Fim da vigência" id="policy-end">
          <Input id="policy-end" type="date" value={values.endDate} onChange={set('endDate')} />
        </Field>
        <Field label="Prêmio total" optional id="policy-premium">
          <Input
            id="policy-premium"
            value={values.premium}
            onChange={set('premium')}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Parcelas" optional id="policy-installments">
          <Input
            id="policy-installments"
            value={values.installments}
            onChange={set('installments')}
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>
        <Field label="Franquia" optional id="policy-deductible">
          <Input
            id="policy-deductible"
            value={values.deductible}
            onChange={set('deductible')}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Assistência 24h" optional id="policy-phone">
          <Input
            id="policy-phone"
            value={values.assistancePhone}
            onChange={set('assistancePhone')}
            placeholder="0800 …"
            inputMode="tel"
          />
        </Field>
        <Field label="Corretor" optional id="policy-broker" className="col-span-2">
          <Input id="policy-broker" value={values.broker} onChange={set('broker')} />
        </Field>
        <Field label="Coberturas" optional id="policy-coverages" className="col-span-2">
          <Textarea
            id="policy-coverages"
            value={values.coverages}
            onChange={set('coverages')}
            rows={4}
            placeholder={'Uma por linha, ex.:\nColisão, incêndio e roubo: 100% FIPE\nDanos materiais a terceiros: R$ 200.000\nCarro reserva: 15 diárias'}
          />
        </Field>
        <Field label="Observações" optional id="policy-notes" className="col-span-2">
          <Textarea id="policy-notes" value={values.notes} onChange={set('notes')} rows={2} />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Arquivos</span>
          <AttachmentPicker onFiles={(files) => setNewFiles((f) => [...f, ...files])} disabled={pending} />
        </div>
        {existing.length > 0 && <AttachmentGrid attachments={existing} onRemove={(a) => setRemoved((r) => [...r, a])} />}
        {newFiles.length > 0 && (
          <PendingFileList files={newFiles} onRemove={(i) => setNewFiles((f) => f.filter((_, j) => j !== i))} />
        )}
        {existing.length === 0 && newFiles.length === 0 && (
          <p className="text-sm text-muted-foreground">Apólice em PDF, cartão do segurado…</p>
        )}
      </div>

      <Separator />

      <DialogFooter className="items-center sm:justify-between">
        <p className="text-sm text-muted-foreground tabular-nums">
          {premium > 0 && (installments > 1 ? `${installments}x de ${formatMoney(Math.round(premium / installments))}` : formatMoney(premium))}
        </p>
        <div className="flex gap-2">
          {policy && onDelete && (
            <Button type="button" variant="ghost" onClick={() => onDelete(policy)} disabled={pending}>
              Excluir
            </Button>
          )}
          <Button type="submit" disabled={pending || !valid}>
            {pending ? (newFiles.length ? 'Enviando…' : 'Salvando…') : policy ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
