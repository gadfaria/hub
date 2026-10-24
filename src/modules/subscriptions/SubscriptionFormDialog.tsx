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
import { formatDate, formatMoney, formatMoneyInput, parseMoney, today } from '@/lib/format'
import { CATEGORIES, CYCLES, nextCharge, type Category, type Cycle, type Subscription } from './types'
import type { SubscriptionInput } from './useSubscriptions'

interface SubscriptionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription?: Subscription
  paymentMethods: string[]
  onSubmit: (input: SubscriptionInput) => Promise<boolean>
}

export function SubscriptionFormDialog(props: SubscriptionFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <SubscriptionForm key={props.subscription?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function SubscriptionForm({ subscription, paymentMethods, onSubmit, onOpenChange }: SubscriptionFormDialogProps) {
  const [name, setName] = useState(subscription?.name ?? '')
  const [category, setCategory] = useState<Category>(subscription?.category ?? 'streaming')
  const [amountText, setAmountText] = useState(subscription ? formatMoneyInput(subscription.amount) : '')
  const [cycle, setCycle] = useState<Cycle>(subscription?.cycle ?? 'monthly')
  const [startDate, setStartDate] = useState(subscription?.startDate ?? today())
  const [paymentMethod, setPaymentMethod] = useState(subscription?.paymentMethod ?? '')
  const [url, setUrl] = useState(subscription?.url ?? '')
  const [notes, setNotes] = useState(subscription?.notes ?? '')
  const [pending, setPending] = useState(false)

  const amount = parseMoney(amountText)
  const valid = name.trim() !== '' && amount !== null && amount > 0 && startDate !== ''
  const preview = valid ? nextCharge({ startDate, cycle }) : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const trimmedUrl = url.trim()
    const ok = await onSubmit({
      name: name.trim(),
      category,
      amount: amount!,
      cycle,
      startDate,
      paymentMethod: paymentMethod.trim(),
      // Typing "netflix.com" should still produce a working link.
      url: trimmedUrl && !/^https?:\/\//i.test(trimmedUrl) ? `https://${trimmedUrl}` : trimmedUrl,
      notes: notes.trim(),
    })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{subscription ? 'Editar assinatura' : 'Nova assinatura'}</DialogTitle>
        <DialogDescription>Assinaturas e contas que se repetem: streaming, internet, seguro, academia…</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome" id="sub-name" className="col-span-2">
          <Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Netflix" autoFocus />
        </Field>
        <Field label="Categoria" id="sub-category">
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger id="sub-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Frequência" id="sub-cycle">
          <Select value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
            <SelectTrigger id="sub-cycle" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CYCLES).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Valor" id="sub-amount">
          <Input
            id="sub-amount"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Primeira cobrança" id="sub-start">
          <Input id="sub-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Forma de pagamento" optional id="sub-payment">
          <Input
            id="sub-payment"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="Ex.: Nubank crédito"
            list="sub-payments"
            autoComplete="off"
          />
          <datalist id="sub-payments">
            {paymentMethods.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Link para gerenciar" optional id="sub-url">
          <Input id="sub-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="netflix.com/account" inputMode="url" />
        </Field>
        <Field label="Observações" optional id="sub-notes" className="col-span-2">
          <Textarea id="sub-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
      </div>

      <DialogFooter className="items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {preview && amount !== null
            ? `Próxima: ${formatDate(preview)} · ${formatMoney(amount)}`
            : 'Informe nome, valor e data da primeira cobrança.'}
        </p>
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : subscription ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
