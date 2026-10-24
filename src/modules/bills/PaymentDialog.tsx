import { useState, type FormEvent } from 'react'
import { AttachmentGrid, AttachmentPicker, PendingFileList } from '@/components/attachments'
import { Field } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Attachment } from '@/domain/types'
import { formatMonth, formatMoneyInput, parseMoney, today } from '@/lib/format'
import type { MonthRow, PaymentInput } from './useBills'

interface PaymentDialogProps {
  /** The bill and month being entered; null closes the dialog. */
  row: MonthRow | null
  month: string
  /** Opened from "Marcar como paga": starts with "Já paguei" checked. */
  markPaid: boolean
  onClose: () => void
  onSubmit: (row: MonthRow, input: PaymentInput, newFiles: File[], removed: Attachment[]) => Promise<boolean>
}

export function PaymentDialog(props: PaymentDialogProps) {
  return (
    <Dialog open={props.row !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {props.row && <PaymentForm key={`${props.row.bill.id}-${props.month}`} {...props} row={props.row} />}
      </DialogContent>
    </Dialog>
  )
}

function PaymentForm({ row, month, markPaid, onClose, onSubmit }: PaymentDialogProps & { row: MonthRow }) {
  const { bill, payment } = row
  const [amount, setAmount] = useState(row.amount ? formatMoneyInput(row.amount) : '')
  const [dueDate, setDueDate] = useState(row.dueDate)
  const [paid, setPaid] = useState(markPaid || Boolean(payment?.paidAt))
  const [paidAt, setPaidAt] = useState(payment?.paidAt || today())
  const [notes, setNotes] = useState(payment?.notes ?? '')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [removed, setRemoved] = useState<Attachment[]>([])
  const [pending, setPending] = useState(false)

  const parsed = parseMoney(amount)
  const existing = (payment?.attachments ?? []).filter((a) => !removed.some((r) => r.id === a.id))
  const valid = parsed !== null && dueDate !== '' && (!paid || paidAt !== '')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit(
      row,
      { amount: parsed!, dueDate, paidAt: paid ? paidAt : '', notes: notes.trim() },
      newFiles,
      removed,
    )
    setPending(false)
    if (ok) onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{bill.name}</DialogTitle>
        <DialogDescription className="first-letter:uppercase">{formatMonth(month)}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor" id="payment-amount">
          <Input
            id="payment-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
            autoFocus
          />
        </Field>
        <Field label="Vencimento" id="payment-due">
          <Input id="payment-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <div className="col-span-2 flex items-center gap-3">
          <Checkbox id="payment-paid" checked={paid} onCheckedChange={(v) => setPaid(v === true)} />
          <Label htmlFor="payment-paid">Já paguei</Label>
          {paid && (
            <Input
              id="payment-paid-at"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="ml-auto w-40"
              aria-label="Data do pagamento"
            />
          )}
        </div>
        <Field label="Observações" optional id="payment-notes" className="col-span-2">
          <Textarea id="payment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex.: consumo 210 kWh" />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Boleto ou fatura</span>
          <AttachmentPicker onFiles={(files) => setNewFiles((f) => [...f, ...files])} disabled={pending} />
        </div>
        {existing.length > 0 && <AttachmentGrid attachments={existing} onRemove={(a) => setRemoved((r) => [...r, a])} />}
        {newFiles.length > 0 && (
          <PendingFileList files={newFiles} onRemove={(i) => setNewFiles((f) => f.filter((_, j) => j !== i))} />
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending || !valid}>
          {pending ? (newFiles.length ? 'Enviando…' : 'Salvando…') : paid ? 'Salvar como paga' : 'Salvar valor'}
        </Button>
      </DialogFooter>
    </form>
  )
}
