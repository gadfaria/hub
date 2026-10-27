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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { currentMonth, formatMoneyInput, parseMoney } from '@/lib/format'
import { PAYMENT_METHODS, type Bill, type PaymentMethod } from './types'
import type { BillInput } from './useBills'

interface CardFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A credit card bill to edit; empty for a new card */
  card?: Bill
  onSubmit: (input: BillInput) => Promise<boolean>
  onDelete?: (card: Bill) => void
}

export function CardFormDialog(props: CardFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <CardForm key={props.card?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

const validDay = (day: number) => day >= 1 && day <= 31

function CardForm({ card, onSubmit, onOpenChange, onDelete }: CardFormDialogProps) {
  const details = card?.card
  const [name, setName] = useState(card?.name ?? '')
  const [bank, setBank] = useState(details?.bank ?? '')
  const [lastDigits, setLastDigits] = useState(details?.lastDigits ?? '')
  const [limit, setLimit] = useState(details?.limit ? formatMoneyInput(details.limit) : '')
  const [closingDay, setClosingDay] = useState(details?.closingDay ? String(details.closingDay) : '')
  const [dueDay, setDueDay] = useState(String(card?.dueDay ?? 10))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(card?.paymentMethod ?? 'autoDebit')
  const [estimate, setEstimate] = useState(card?.estimate ? formatMoneyInput(card.estimate) : '')
  const [notes, setNotes] = useState(card?.notes ?? '')
  const [pending, setPending] = useState(false)

  const due = Math.round(Number(dueDay))
  const closing = closingDay.trim() ? Math.round(Number(closingDay)) : 0
  const valid = name.trim() !== '' && validDay(due) && (closing === 0 || validDay(closing)) && /^\d{0,4}$/.test(lastDigits)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit({
      name: name.trim(),
      category: 'creditCard',
      frequency: 'monthly',
      dueDay: due,
      paymentMethod,
      estimate: parseMoney(estimate) ?? 0,
      startMonth: card?.startMonth ?? currentMonth(),
      endMonth: card?.endMonth ?? '',
      notes: notes.trim(),
      card: { bank: bank.trim(), lastDigits, limit: parseMoney(limit) ?? 0, closingDay: closing },
    })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{card ? 'Editar cartão' : 'Novo cartão'}</DialogTitle>
        <DialogDescription>
          A fatura de cada mês aparece em Contas e no Início. Guarde só os 4 últimos dígitos: nunca o número completo, o CVV ou a senha.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome" id="card-name" className="col-span-2">
          <Input id="card-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank Ultravioleta" autoFocus />
        </Field>
        <Field label="Banco" optional id="card-bank">
          <Input id="card-bank" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ex.: Nubank" />
        </Field>
        <Field label="Últimos 4 dígitos" optional id="card-digits">
          <Input
            id="card-digits"
            value={lastDigits}
            onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="1234"
            className="font-mono tabular-nums"
          />
        </Field>
        <Field label="Fecha dia" optional id="card-closing">
          <Input
            id="card-closing"
            value={closingDay}
            onChange={(e) => setClosingDay(e.target.value)}
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>
        <Field label="Vence dia" id="card-due">
          <Input id="card-due" value={dueDay} onChange={(e) => setDueDay(e.target.value)} inputMode="numeric" className="tabular-nums" />
        </Field>
        <Field label="Limite" optional id="card-limit">
          <Input
            id="card-limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Fatura média" optional id="card-estimate">
          <Input
            id="card-estimate"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Pagamento da fatura" id="card-method" className="col-span-2">
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger id="card-method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHODS)
                .filter(([value]) => value !== 'card')
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Observações" optional id="card-notes" className="col-span-2">
          <Textarea id="card-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex.: app do banco, telefone da central" />
        </Field>
      </div>

      <DialogFooter className="sm:justify-between">
        {card && onDelete ? (
          <Button type="button" variant="ghost" onClick={() => onDelete(card)} disabled={pending}>
            Excluir cartão
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : card ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
