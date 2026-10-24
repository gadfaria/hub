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
import { formatDate, formatMoney, formatMoneyInput, formatRatio, parseMoney, today } from '@/lib/format'
import { INVESTMENT_KINDS, investmentReturn, type Investment, type InvestmentKind } from './types'
import type { InvestmentInput } from './useFinance'

interface InvestmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment?: Investment
  institutions: string[]
  onSubmit: (input: InvestmentInput) => Promise<boolean>
  onDelete?: (investment: Investment) => void
}

export function InvestmentFormDialog(props: InvestmentFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <InvestmentForm key={props.investment?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function InvestmentForm({ investment, institutions, onSubmit, onOpenChange, onDelete }: InvestmentFormDialogProps) {
  const [values, setValues] = useState({
    institution: investment?.institution ?? '',
    name: investment?.name ?? '',
    kind: investment?.kind ?? ('cdb' as InvestmentKind),
    amount: investment ? formatMoneyInput(investment.amount) : '',
    investedAt: investment?.investedAt ?? today(),
    maturity: investment?.maturity ?? '',
    rate: investment?.rate ?? '',
    notes: investment?.notes ?? '',
  })
  const [pending, setPending] = useState(false)
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const amount = parseMoney(values.amount)
  const valid =
    values.institution.trim() !== '' &&
    values.name.trim() !== '' &&
    amount !== null &&
    amount > 0 &&
    values.investedAt !== '' &&
    (!values.maturity || values.maturity >= values.investedAt)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit({
      institution: values.institution.trim(),
      name: values.name.trim(),
      kind: values.kind,
      amount: amount!,
      investedAt: values.investedAt,
      maturity: values.maturity,
      rate: values.rate.trim(),
      notes: values.notes.trim(),
    })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{investment ? 'Editar aplicação' : 'Nova aplicação'}</DialogTitle>
        <DialogDescription>Não soma ao patrimônio: o saldo da instituição já inclui a aplicação.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Instituição" id="inv-institution">
          <Input
            id="inv-institution"
            value={values.institution}
            onChange={set('institution')}
            list="inv-institutions"
            autoComplete="off"
            placeholder="Ex.: Nubank"
            autoFocus
          />
          <datalist id="inv-institutions">
            {institutions.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </Field>
        <Field label="Tipo" id="inv-kind">
          <Select value={values.kind} onValueChange={(v) => setValues((s) => ({ ...s, kind: v as InvestmentKind }))}>
            <SelectTrigger id="inv-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INVESTMENT_KINDS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Aplicação" id="inv-name" className="col-span-2">
          <Input id="inv-name" value={values.name} onChange={set('name')} placeholder="Ex.: CDB Banco C6 Consignado" />
        </Field>
        <Field label="Valor aplicado" id="inv-amount">
          <Input
            id="inv-amount"
            value={values.amount}
            onChange={set('amount')}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
        <Field label="Taxa" optional id="inv-rate">
          <Input id="inv-rate" value={values.rate} onChange={set('rate')} placeholder="Ex.: 110% CDI" />
        </Field>
        <Field label="Data da aplicação" id="inv-date">
          <Input id="inv-date" type="date" value={values.investedAt} onChange={set('investedAt')} />
        </Field>
        <Field label="Vencimento" optional id="inv-maturity">
          <Input id="inv-maturity" type="date" value={values.maturity} onChange={set('maturity')} />
        </Field>
        <Field label="Observações" optional id="inv-notes" className="col-span-2">
          <Textarea id="inv-notes" value={values.notes} onChange={set('notes')} rows={2} />
        </Field>
      </div>
      <DialogFooter className="sm:justify-between">
        {investment && onDelete ? (
          <Button type="button" variant="ghost" onClick={() => onDelete(investment)} disabled={pending}>
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : investment ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface RedeemDialogProps {
  investment: Investment | null
  onClose: () => void
  onSubmit: (investment: Investment, redeemedAt: string, redeemedAmount: number) => Promise<boolean>
}

export function RedeemDialog({ investment, onClose, onSubmit }: RedeemDialogProps) {
  return (
    <Dialog open={investment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {investment && <RedeemForm key={investment.id} investment={investment} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function RedeemForm({ investment, onClose, onSubmit }: RedeemDialogProps & { investment: Investment }) {
  const editing = Boolean(investment.redeemedAt)
  const defaultDate = investment.redeemedAt || (investment.maturity && investment.maturity <= today() ? investment.maturity : today())
  const [date, setDate] = useState(defaultDate)
  const [amountText, setAmountText] = useState(investment.redeemedAmount ? formatMoneyInput(investment.redeemedAmount) : '')
  const [pending, setPending] = useState(false)
  const amount = parseMoney(amountText)
  const valid = amount !== null && amount > 0 && date !== '' && date >= investment.investedAt
  const preview = valid ? investmentReturn({ ...investment, redeemedAt: date, redeemedAmount: amount! }) : null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit(investment, date, amount!)
    setPending(false)
    if (ok) onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{editing ? 'Editar resgate' : 'Registrar resgate'}</DialogTitle>
        <DialogDescription>
          {investment.name} · {formatMoney(investment.amount)} aplicados em {formatDate(investment.investedAt)}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor recebido" id="redeem-amount">
          <Input
            id="redeem-amount"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
            autoFocus
          />
        </Field>
        <Field label="Data do resgate" id="redeem-date">
          <Input id="redeem-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {preview && (
        <dl className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Rendimento</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(preview.profit)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">No período</dt>
            <dd className="font-semibold tabular-nums">{formatRatio(preview.total)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Ao ano</dt>
            <dd className="font-semibold tabular-nums">{formatRatio(preview.annual)}</dd>
          </div>
        </dl>
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : editing ? 'Salvar' : 'Registrar resgate'}
        </Button>
      </DialogFooter>
    </form>
  )
}
