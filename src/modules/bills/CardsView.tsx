import { CheckIcon, CreditCardIcon, EllipsisVerticalIcon, PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatMoney } from '@/lib/format'
import type { SubscriptionRow } from '../subscriptions/useSubscriptions'
import { BILL_STATUS_LABELS, cardLabel, PAYMENT_METHODS, type CardPurchase } from './types'
import type { MonthRow } from './useBills'

interface CardsViewProps {
  loading: boolean
  /** The month's statement of every card due in it */
  rows: MonthRow[]
  /** Active subscriptions, matched to cards by `cardId` */
  subscriptions: SubscriptionRow[]
  onAdd: () => void
  onPay: (row: MonthRow) => void
  onEnter: (row: MonthRow) => void
  onUndo: (row: MonthRow) => void
  onHistory: (row: MonthRow) => void
  onEdit: (row: MonthRow) => void
  onAddPurchase: (row: MonthRow) => void
  onEditPurchase: (row: MonthRow, purchase: CardPurchase) => void
}

export function CardsView({ loading, rows, subscriptions, onAdd, ...actions }: CardsViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CreditCardIcon className="size-6 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Nenhum cartão neste mês</p>
              <p className="text-sm text-muted-foreground">
                Cadastre seus cartões para acompanhar a fatura de cada mês e as assinaturas cobradas em cada um.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onAdd}>
              <PlusIcon />
              Novo cartão
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <p className="text-sm text-muted-foreground">
        Faturas do mês: <span className="font-medium text-foreground tabular-nums">{formatMoney(total)}</span>
      </p>
      <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
        {rows.map((row) => (
          <CardTile
            key={row.bill.id}
            row={row}
            subscriptions={subscriptions.filter((s) => s.subscription.cardId === row.bill.id)}
            {...actions}
          />
        ))}
      </div>
    </div>
  )
}

function CardTile({
  row,
  subscriptions,
  onPay,
  onEnter,
  onUndo,
  onHistory,
  onEdit,
  onAddPurchase,
  onEditPurchase,
}: Omit<CardsViewProps, 'loading' | 'rows' | 'subscriptions' | 'onAdd'> & { row: MonthRow; subscriptions: SubscriptionRow[] }) {
  const { bill, status } = row
  const details = bill.card
  const monthly = subscriptions.reduce((sum, s) => sum + s.monthly, 0)
  const purchasesTotal = row.purchases.reduce((sum, p) => sum + p.amount, 0)
  const schedule = [details?.closingDay ? `fecha dia ${details.closingDay}` : '', `vence ${formatDate(row.dueDate, { day: '2-digit', month: '2-digit' })}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <CreditCardIcon className="size-4" />
          {cardLabel(bill) || 'Cartão de crédito'}
        </CardDescription>
        <CardTitle className="text-lg">{bill.name}</CardTitle>
        <CardAction className="flex items-center gap-1">
          {status === 'paid' ? (
            <Badge variant="outline" className="text-muted-foreground">
              <CheckIcon />
              {BILL_STATUS_LABELS.paid}
            </Badge>
          ) : (
            <Badge variant={status === 'overdue' ? 'destructive' : 'secondary'}>{BILL_STATUS_LABELS[status]}</Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                <EllipsisVerticalIcon />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onAddPurchase(row)}>Adicionar compra</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEnter(row)}>{row.estimated ? 'Lançar fatura' : 'Editar fatura'}</DropdownMenuItem>
              {status === 'paid' && <DropdownMenuItem onSelect={() => onUndo(row)}>Desfazer pagamento</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => onHistory(row)}>Ver histórico</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onEdit(row)}>Editar cartão</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Fatura{row.estimated && row.amount ? ' (estimada)' : ''}</span>
            <span className={`text-2xl font-semibold tabular-nums ${row.estimated ? 'text-muted-foreground' : ''}`}>
              {row.amount ? formatMoney(row.amount) : '—'}
            </span>
            <span className="text-xs text-muted-foreground">
              {schedule} · {PAYMENT_METHODS[bill.paymentMethod]}
            </span>
          </div>
          {status !== 'paid' && (
            <Button variant="outline" size="sm" onClick={() => onPay(row)}>
              <CheckIcon />
              Pagar
            </Button>
          )}
        </div>

        {details?.limit ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Limite</span>
            <span className="tabular-nums">{formatMoney(details.limit)}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Compras nesta fatura</span>
            <span className="flex items-center gap-1">
              <span className="tabular-nums">{row.purchases.length ? formatMoney(purchasesTotal) : '—'}</span>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={() => onAddPurchase(row)}>
                <PlusIcon />
                <span className="sr-only">Adicionar compra</span>
              </Button>
            </span>
          </div>
          {row.purchases.map(({ purchase, number, amount }) => (
            <button
              key={purchase.id}
              type="button"
              onClick={() => onEditPurchase(row, purchase)}
              className="flex items-baseline justify-between gap-4 rounded-sm text-left text-xs hover:bg-muted"
            >
              <span className="min-w-0 truncate">
                {purchase.description}
                <span className="text-muted-foreground">
                  {' · '}
                  {formatDate(purchase.date, { day: '2-digit', month: '2-digit' })}
                  {purchase.installments > 1 && ` · ${number}/${purchase.installments}`}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatMoney(amount)}</span>
            </button>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2 border-t text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Assinaturas neste cartão</span>
          <span className="tabular-nums">{subscriptions.length ? `${formatMoney(Math.round(monthly))}/mês` : '—'}</span>
        </div>
        {subscriptions.length > 0 && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {subscriptions.map((s) => s.subscription.name).join(', ')}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
