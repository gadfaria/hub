import { useState, type FormEvent } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, formatMoney, formatMoneyInput, parseMoney, today } from './format'
import { ACCOUNT_TYPES, accountLabel, type Account, type BalanceEntry } from './types'

interface AccountDetailDialogProps {
  account: Account | null
  history: BalanceEntry[]
  onClose: () => void
  onAddBalance: (accountId: string, amount: number, date: string) => Promise<boolean>
  onDeleteBalance: (entry: BalanceEntry) => Promise<boolean>
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

export function AccountDetailDialog(props: AccountDetailDialogProps) {
  return (
    <Dialog open={props.account !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {props.account && <AccountDetail key={props.account.id} {...props} account={props.account} />}
      </DialogContent>
    </Dialog>
  )
}

function AccountDetail({
  account,
  history,
  onAddBalance,
  onDeleteBalance,
  onEdit,
  onDelete,
}: AccountDetailDialogProps & { account: Account }) {
  const latest = history[0]
  const [amountText, setAmountText] = useState(latest ? formatMoneyInput(latest.amount) : '')
  const [date, setDate] = useState(today)
  const [pending, setPending] = useState(false)

  const amount = parseMoney(amountText)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (amount === null || !date) return
    setPending(true)
    await onAddBalance(account.id, amount, date)
    setPending(false)
  }

  return (
    <div className="flex flex-col gap-8">
      <DialogHeader>
        <DialogDescription>
          {account.institution} · {ACCOUNT_TYPES[account.type]}
        </DialogDescription>
        <DialogTitle>{accountLabel(account)}</DialogTitle>
        <p className="pt-2 text-3xl font-semibold tracking-tight tabular-nums">
          {latest ? formatMoney(latest.amount) : '—'}
        </p>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <span className="text-sm font-medium">Atualizar saldo</span>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="balance-amount" className="sr-only">
              Saldo
            </Label>
            <Input
              id="balance-amount"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="balance-date" className="sr-only">
              Data
            </Label>
            <Input id="balance-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <Button type="submit" disabled={pending || amount === null || !date}>
          {pending ? 'Salvando…' : 'Salvar saldo'}
        </Button>
      </form>

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Histórico</span>
          <ul className="flex flex-col divide-y border-y text-sm">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-muted-foreground tabular-nums">{formatDate(entry.date)}</span>
                <span className="ml-auto tabular-nums">{formatMoney(entry.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remover registro"
                  disabled={pending || history.length === 1}
                  onClick={() => onDeleteBalance(entry)}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" size="sm" onClick={() => onEdit(account)} disabled={pending}>
          Editar conta
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(account)} disabled={pending}>
          Excluir conta
        </Button>
      </div>
    </div>
  )
}
