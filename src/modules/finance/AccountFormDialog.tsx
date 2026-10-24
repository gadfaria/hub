import { useState, type FormEvent } from 'react'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseMoney, today } from '@/lib/format'
import { ACCOUNT_TYPES, type Account, type AccountType } from './types'

export interface AccountFormValues {
  institution: string
  name: string
  type: AccountType
  amount: number
  date: string
}

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing institutions, suggested while typing. */
  institutions: string[]
  /** When set, edits this account (balance fields are hidden). */
  account?: Account
  onSubmit: (values: AccountFormValues) => Promise<boolean>
}

export function AccountFormDialog(props: AccountFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Keyed so the form resets every time the dialog opens. */}
        {props.open && <AccountForm key={props.account?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function AccountForm({ institutions, account, onSubmit, onOpenChange }: AccountFormDialogProps) {
  const editing = Boolean(account)
  const [institution, setInstitution] = useState(account?.institution ?? '')
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking')
  const [amountText, setAmountText] = useState('')
  const [date, setDate] = useState(today)
  const [pending, setPending] = useState(false)

  const amount = parseMoney(amountText)
  const valid = institution.trim() !== '' && (editing || (amount !== null && date !== ''))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit({ institution: institution.trim(), name: name.trim(), type, amount: amount ?? 0, date })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{editing ? 'Editar conta' : 'Nova conta'}</DialogTitle>
        <DialogDescription>
          {editing ? 'Altere os dados da conta.' : 'Onde está o dinheiro e quanto tem lá hoje.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="institution">Instituição</Label>
          <Input
            id="institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Ex.: Nubank, Itaú, XP"
            list="institutions"
            autoComplete="off"
            autoFocus
          />
          <datalist id="institutions">
            {institutions.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">
              Nome <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Caixinha"
              autoComplete="off"
            />
          </div>
        </div>

        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Saldo</Label>
              <Input
                id="amount"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                autoComplete="off"
                className="tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : editing ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
