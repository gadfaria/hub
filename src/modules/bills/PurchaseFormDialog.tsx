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
import { formatMonth, formatMoney, formatMoneyInput, parseMoney, shiftMonth, today } from '@/lib/format'
import { firstStatementMonth, installmentIn, type Bill, type CardPurchase } from './types'
import type { PurchaseInput } from './useBills'

interface PurchaseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: Bill
  /** A purchase to edit; empty for a new one */
  purchase?: CardPurchase
  onSubmit: (input: PurchaseInput) => Promise<boolean>
  onDelete: (purchase: CardPurchase) => void
}

export function PurchaseFormDialog(props: PurchaseFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {props.open && props.card && <PurchaseForm key={props.purchase?.id ?? 'new'} {...props} card={props.card} />}
      </DialogContent>
    </Dialog>
  )
}

const MAX_INSTALLMENTS = 48

function PurchaseForm({ card, purchase, onSubmit, onOpenChange, onDelete }: PurchaseFormDialogProps & { card: Bill }) {
  const [description, setDescription] = useState(purchase?.description ?? '')
  const [amount, setAmount] = useState(purchase ? formatMoneyInput(purchase.amount) : '')
  const [date, setDate] = useState(purchase?.date ?? today())
  const [installments, setInstallments] = useState(String(purchase?.installments ?? 1))
  /** Empty while the statement follows the purchase date */
  const [statement, setStatement] = useState(purchase?.firstMonth ?? '')
  const [pending, setPending] = useState(false)

  const parsed = parseMoney(amount)
  const count = Math.round(Number(installments))
  const valid = description.trim() !== '' && parsed !== null && parsed > 0 && date !== '' && count >= 1 && count <= MAX_INSTALLMENTS

  const suggested = firstStatementMonth(card, date || today())
  const firstMonth = statement || suggested
  const months = [...new Set([firstMonth, ...[-1, 0, 1, 2].map((n) => shiftMonth(suggested, n))])].sort()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit({ cardId: card.id, description: description.trim(), amount: parsed!, date, installments: count, firstMonth })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{purchase ? 'Editar compra' : 'Nova compra'}</DialogTitle>
        <DialogDescription>{card.name}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Descrição" id="purchase-description" className="col-span-2">
          <Input
            id="purchase-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Mercado Livre, AliExpress"
            autoFocus
          />
        </Field>
        <Field label="Valor total" id="purchase-amount">
          <Input
            id="purchase-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Data da compra" id="purchase-date">
          <Input id="purchase-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Parcelas" id="purchase-installments">
          <Input
            id="purchase-installments"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>
        <Field label={count > 1 ? 'Primeira fatura' : 'Fatura'} id="purchase-statement">
          <Select value={firstMonth} onValueChange={setStatement}>
            <SelectTrigger id="purchase-statement" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonth(month, true)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {valid && count > 1 && (
          <p className="col-span-2 text-sm text-muted-foreground">
            {count}x de {formatMoney(installmentIn({ amount: parsed!, installments: count, firstMonth }, firstMonth)!.amount)}, até{' '}
            {formatMonth(shiftMonth(firstMonth, count - 1), true)}
          </p>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        {purchase ? (
          <Button type="button" variant="ghost" onClick={() => onDelete(purchase)} disabled={pending}>
            Excluir compra
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : purchase ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
