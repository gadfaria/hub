import { useState } from 'react'
import { EllipsisVerticalIcon, ExternalLinkIcon, PlusIcon } from 'lucide-react'
import { PageBody } from '@/components/app-layout'
import { SiteHeader } from '@/components/site-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { daysUntil, formatDate, formatMoney } from '@/lib/format'
import { SubscriptionFormDialog } from './SubscriptionFormDialog'
import { CYCLES, categoryLabel, type Subscription } from './types'
import { useSubscriptions, type CategoryTotal, type SubscriptionRow } from './useSubscriptions'

type Confirm = { kind: 'cancel' | 'delete'; subscription: Subscription }

function inDays(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days === 0) return 'hoje'
  if (days === 1) return 'amanhã'
  return `em ${days} dias`
}

export function SubscriptionsScreen() {
  const subs = useSubscriptions()
  const [view, setView] = useState<'active' | 'cancelled'>('active')
  const [dialog, setDialog] = useState<{ subscription?: Subscription } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const rows = view === 'active' ? subs.active : subs.cancelled

  return (
    <>
      <SiteHeader title="Assinaturas">
        <Button size="sm" onClick={() => setDialog({})} disabled={subs.loading}>
          <PlusIcon />
          <span className="hidden sm:inline">Nova assinatura</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </SiteHeader>

      <PageBody>
        <SummaryCards loading={subs.loading} active={subs.active} monthlyTotal={subs.monthlyTotal} />

        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @5xl/main:grid-cols-[1fr_2fr]">
          <CategoriesCard loading={subs.loading} categories={subs.categories} monthlyTotal={subs.monthlyTotal} />
          <UpcomingCard loading={subs.loading} active={subs.active} />
        </div>

        <div className="flex flex-col gap-4 px-4 lg:px-6">
          <Tabs value={view} onValueChange={(v) => setView(v as 'active' | 'cancelled')}>
            <TabsList>
              <TabsTrigger value="active">
                Ativas
                <Badge variant="secondary" className="tabular-nums">
                  {subs.active.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Canceladas
                <Badge variant="secondary" className="tabular-nums">
                  {subs.cancelled.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <SubscriptionsTable
            loading={subs.loading}
            rows={rows}
            cancelled={view === 'cancelled'}
            onOpen={(subscription) => setDialog({ subscription })}
            onCancel={(subscription) => setConfirm({ kind: 'cancel', subscription })}
            onReactivate={subs.reactivateSubscription}
            onDelete={(subscription) => setConfirm({ kind: 'delete', subscription })}
          />
        </div>
      </PageBody>

      <SubscriptionFormDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        subscription={dialog?.subscription}
        paymentMethods={subs.paymentMethods}
        onSubmit={(input) => subs.saveSubscription(input, dialog?.subscription)}
      />
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'cancel' ? `Marcar ${confirm.subscription.name} como cancelada?` : 'Excluir assinatura?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'cancel'
                ? 'Ela sai dos totais e vai para "Canceladas". Lembre de cancelar também no serviço.'
                : `${confirm?.subscription.name ?? ''} será removida de vez. Para manter o histórico, prefira marcar como cancelada.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.kind === 'delete' ? 'destructive' : 'default'}
              onClick={async () => {
                if (confirm?.kind === 'cancel') await subs.cancelSubscription(confirm.subscription)
                if (confirm?.kind === 'delete') await subs.deleteSubscription(confirm.subscription)
                setConfirm(null)
              }}
            >
              {confirm?.kind === 'cancel' ? 'Marcar como cancelada' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SummaryCards({
  loading,
  active,
  monthlyTotal,
}: {
  loading: boolean
  active: SubscriptionRow[]
  monthlyTotal: number
}) {
  const next = active[0]
  const next30 = active.filter((r) => daysUntil(r.next) <= 30)
  const due30 = next30.reduce((sum, r) => sum + r.subscription.amount, 0)
  const priciest = [...active].sort((a, b) => b.monthly - a.monthly)[0]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <StatCard
        loading={loading}
        label="Por mês"
        value={formatMoney(Math.round(monthlyTotal))}
        badge={`${active.length} ${active.length === 1 ? 'ativa' : 'ativas'}`}
        headline="Média mensal"
        detail="Anuais divididas por 12"
      />
      <StatCard
        loading={loading}
        label="Por ano"
        value={formatMoney(Math.round(monthlyTotal * 12))}
        headline={priciest ? `Maior: ${priciest.subscription.name}` : 'Nenhuma assinatura ativa'}
        detail={priciest ? `${formatMoney(Math.round(priciest.monthly * 12))} por ano` : ''}
      />
      <StatCard
        loading={loading}
        label="Próxima cobrança"
        value={next ? formatMoney(next.subscription.amount) : '—'}
        badge={next ? inDays(next.next) : undefined}
        headline={next ? next.subscription.name : 'Nada para cobrar'}
        detail={next ? formatDate(next.next) : ''}
      />
      <StatCard
        loading={loading}
        label="Próximos 30 dias"
        value={formatMoney(due30)}
        headline={`${next30.length} ${next30.length === 1 ? 'cobrança' : 'cobranças'}`}
        detail="Soma das cobranças"
      />
    </div>
  )
}

function StatCard({
  loading,
  label,
  value,
  badge,
  headline,
  detail,
}: {
  loading: boolean
  label: string
  value: string
  badge?: string
  headline: string
  detail: string
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="col-span-full truncate text-2xl font-semibold tabular-nums @[340px]/card:text-3xl">
          {loading ? <Skeleton className="h-9 w-32" /> : value}
        </CardTitle>
        {!loading && badge && (
          <CardAction className="row-span-1">
            <Badge variant="outline">{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <>
            <div className="line-clamp-1 font-medium">{headline}</div>
            <div className="line-clamp-1 text-muted-foreground">{detail || ' '}</div>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

function CategoriesCard({
  loading,
  categories,
  monthlyTotal,
}: {
  loading: boolean
  categories: CategoryTotal[]
  monthlyTotal: number
}) {
  const max = categories[0]?.monthly ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Por categoria</CardTitle>
        <CardDescription>Gasto mensal de cada tipo</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {categories.map((c) => (
              <li key={c.category} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">
                    {categoryLabel(c.category)}
                    <span className="ml-1.5 text-xs text-muted-foreground">{c.count}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatMoney(Math.round(c.monthly))}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {Math.round((c.monthly / monthlyTotal) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(c.monthly / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function UpcomingCard({ loading, active }: { loading: boolean; active: SubscriptionRow[] }) {
  const upcoming = active.slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximas cobranças</CardTitle>
        <CardDescription>Na ordem em que vão cair</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {upcoming.map(({ subscription, next }) => (
              <li key={subscription.id} className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-md border py-1 leading-none">
                  <span className="text-lg font-semibold tabular-nums">{next.slice(8, 10)}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {formatDate(next, { month: 'short' }).replace('.', '')}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{subscription.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[inDays(next), subscription.paymentMethod].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(subscription.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function SubscriptionsTable({
  loading,
  rows,
  cancelled,
  onOpen,
  onCancel,
  onReactivate,
  onDelete,
}: {
  loading: boolean
  rows: SubscriptionRow[]
  cancelled: boolean
  onOpen: (subscription: Subscription) => void
  onCancel: (subscription: Subscription) => void
  onReactivate: (subscription: Subscription) => void
  onDelete: (subscription: Subscription) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="pl-4">Assinatura</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="hidden text-right md:table-cell">Por mês</TableHead>
            <TableHead className="hidden sm:table-cell">{cancelled ? 'Cancelada em' : 'Próxima'}</TableHead>
            <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            [0, 1, 2].map((i) => (
              <TableRow key={i}>
                <TableCell colSpan={6} className="px-4">
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                {cancelled ? 'Nenhuma assinatura cancelada.' : 'Nenhuma assinatura ainda. Adicione streaming, internet, seguros…'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ subscription, monthly, next }) => (
              <TableRow
                key={subscription.id}
                className={`cursor-pointer ${cancelled ? 'text-muted-foreground' : ''}`}
                onClick={() => onOpen(subscription)}
              >
                <TableCell className="pl-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{subscription.name}</span>
                    <span className="text-xs text-muted-foreground">{categoryLabel(subscription.category)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium tabular-nums">{formatMoney(subscription.amount)}</span>
                    <span className="text-xs text-muted-foreground">{CYCLES[subscription.cycle].label}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                  {formatMoney(Math.round(monthly))}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {cancelled ? (
                    <span className="tabular-nums">{formatDate(subscription.cancelledAt)}</span>
                  ) : daysUntil(next) <= 7 ? (
                    <Badge>{formatDate(next)}</Badge>
                  ) : (
                    <span className="text-muted-foreground tabular-nums">{formatDate(next)}</span>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-40 truncate text-muted-foreground lg:table-cell">
                  {subscription.paymentMethod || '—'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                        <EllipsisVerticalIcon />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => onOpen(subscription)}>Editar</DropdownMenuItem>
                      {subscription.url && (
                        <DropdownMenuItem asChild>
                          <a href={subscription.url} target="_blank" rel="noreferrer">
                            Gerenciar
                            <ExternalLinkIcon className="ml-auto" />
                          </a>
                        </DropdownMenuItem>
                      )}
                      {cancelled ? (
                        <DropdownMenuItem onSelect={() => onReactivate(subscription)}>Reativar</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => onCancel(subscription)}>Marcar como cancelada</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(subscription)}>
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
