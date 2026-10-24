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
import { BILL_CATEGORIES, PAYMENT_METHODS, type Bill, type BillCategory, type PaymentMethod } from './types'
import type { BillInput } from './useBills'

interface BillFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill?: Bill
  onSubmit: (input: BillInput) => Promise<boolean>
  onDelete?: (bill: Bill) => void
}

export function BillFormDialog(props: BillFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <BillForm key={props.bill?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function BillForm({ bill, onSubmit, onOpenChange, onDelete }: BillFormDialogProps) {
  const [name, setName] = useState(bill?.name ?? '')
  const [category, setCategory] = useState<BillCategory>(bill?.category ?? 'electricity')
  const [dueDay, setDueDay] = useState(String(bill?.dueDay ?? 10))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(bill?.paymentMethod ?? 'boleto')
  const [estimate, setEstimate] = useState(bill?.estimate ? formatMoneyInput(bill.estimate) : '')
  const [startMonth, setStartMonth] = useState(bill?.startMonth ?? currentMonth())
  const [notes, setNotes] = useState(bill?.notes ?? '')
  const [pending, setPending] = useState(false)

  const day = Math.round(Number(dueDay))
  const valid = name.trim() !== '' && day >= 1 && day <= 31 && /^\d{4}-\d{2}$/.test(startMonth)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit({
      name: name.trim(),
      category,
      dueDay: day,
      paymentMethod,
      estimate: parseMoney(estimate) ?? 0,
      startMonth,
      endMonth: bill?.endMonth ?? '',
      notes: notes.trim(),
    })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{bill ? 'Editar conta' : 'Nova conta'}</DialogTitle>
        <DialogDescription>Contas que chegam todo mês com valor diferente: luz, água, aluguel, fatura…</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome" id="bill-name" className="col-span-2">
          <Input id="bill-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Luz (Cemig)" autoFocus />
        </Field>
        <Field label="Categoria" id="bill-category">
          <Select value={category} onValueChange={(v) => setCategory(v as BillCategory)}>
            <SelectTrigger id="bill-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BILL_CATEGORIES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Forma de pagamento" id="bill-method">
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger id="bill-method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Dia do vencimento" id="bill-day">
          <Input
            id="bill-day"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>
        <Field label="Valor estimado" optional id="bill-estimate">
          <Input
            id="bill-estimate"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="A partir de" id="bill-start">
          <Input id="bill-start" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </Field>
        <Field label="Observações" optional id="bill-notes" className="col-span-2">
          <Textarea
            id="bill-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: número da instalação, código do cliente"
          />
        </Field>
      </div>

      <DialogFooter className="sm:justify-between">
        {bill && onDelete ? (
          <Button type="button" variant="ghost" onClick={() => onDelete(bill)} disabled={pending}>
            Excluir conta
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : bill ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
