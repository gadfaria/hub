import { CheckCircle2Icon, ChevronRightIcon } from 'lucide-react'
import { useAuth } from '@/auth/context'
import { PageBody } from '@/components/app-layout'
import { SiteHeader } from '@/components/site-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { currentMonth, daysUntil, formatDate, formatMoney, shiftMonth, today } from '@/lib/format'
import { useBills } from '@/modules/bills/useBills'
import { useDocuments } from '@/modules/documents/useDocuments'
import { useFinance } from '@/modules/finance/useFinance'
import { useHealth } from '@/modules/health/useHealth'
import { useSubscriptions } from '@/modules/subscriptions/useSubscriptions'
import { useVehicles } from '@/modules/vehicles/useVehicles'
import { AGENDA_DAYS, byUrgency, collectEvents, type HomeEvent, type Severity } from './events'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function relativeDay(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  if (days === -1) return 'Ontem'
  return days < 0 ? `Há ${-days} dias` : `Em ${days} dias`
}

export function HomeScreen() {
  const { session } = useAuth()
  const finance = useFinance()
  const bills = useBills()
  const subs = useSubscriptions()
  const docs = useDocuments()
  const health = useHealth()
  const vehicles = useVehicles()
  const loading = finance.loading || bills.loading || subs.loading || docs.loading || health.loading || vehicles.loading

  const month = currentMonth()
  const billRows = bills.monthRows(month)

  const events = loading
    ? []
    : collectEvents({
        // Next month's bills too, so early-month due dates show up in the agenda.
        billRows: [...billRows, ...bills.monthRows(shiftMonth(month, 1))],
        subscriptions: subs.active,
        documents: docs.rows,
        health: health.people.map((person) => ({ person, upcoming: health.forPerson(person).upcoming })),
        vehicles: vehicles.summaries,
        balancesUpdatedAt: finance.lastUpdate,
        investments: finance.activeInvestments,
      })

  const attention = events.filter((e) => e.attention).sort(byUrgency)
  const now = today()
  const agenda = events.filter((e) => e.date >= now && daysUntil(e.date) <= AGENDA_DAYS).sort((a, b) => a.date.localeCompare(b.date))

  const billsTotal = billRows.reduce((s, r) => s + r.amount, 0)
  const open = billRows.filter((r) => r.status !== 'paid')
  const overdue = open.filter((r) => r.status === 'overdue')
  const urgent = attention.filter((e) => e.severity !== 'info').length
  const firstName = session?.name.split(' ')[0] ?? ''

  return (
    <>
      <SiteHeader title="Início" />
      <PageBody>
        <div className="flex flex-col gap-0.5 px-4 lg:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting()}
            {firstName && `, ${firstName}`}
          </h2>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {formatDate(now, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="order-2 grid grid-cols-1 gap-4 px-4 @xl/main:order-none *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          <StatCard
            loading={loading}
            href="#/finance"
            label="Patrimônio"
            value={formatMoney(finance.total)}
            headline={finance.lastUpdate ? `Atualizado em ${formatDate(finance.lastUpdate)}` : 'Nenhum saldo registrado'}
            detail={`${finance.groups.length} ${finance.groups.length === 1 ? 'instituição' : 'instituições'}`}
          />
          <StatCard
            loading={loading}
            href="#/bills"
            label="Gasto fixo mensal"
            value={formatMoney(Math.round(billsTotal + subs.monthlyTotal))}
            headline={`Contas ${formatMoney(billsTotal)} + assinaturas ${formatMoney(Math.round(subs.monthlyTotal))}`}
            detail="Neste mês"
          />
          <StatCard
            loading={loading}
            href="#/bills"
            label="A pagar este mês"
            value={formatMoney(open.reduce((s, r) => s + r.amount, 0))}
            badge={overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'atrasada' : 'atrasadas'}` : undefined}
            badgeVariant="destructive"
            headline={open.length ? `${open.length} de ${billRows.length} contas em aberto` : billRows.length ? 'Tudo pago' : 'Nenhuma conta cadastrada'}
            detail={overdue.length ? overdue.map((r) => r.bill.name).join(', ') : ' '}
          />
          <StatCard
            loading={loading}
            label="Precisa de atenção"
            value={String(urgent)}
            headline={urgent ? `${urgent} ${urgent === 1 ? 'item' : 'itens'} para resolver` : 'Tudo em dia'}
            detail={`${agenda.length} ${agenda.length === 1 ? 'evento' : 'eventos'} nos próximos ${AGENDA_DAYS} dias`}
          />
        </div>

        <div className="order-1 grid grid-cols-1 items-start gap-4 px-4 lg:px-6 @xl/main:order-none @4xl/main:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Precisa de atenção</CardTitle>
              <CardDescription>Atrasos, vencimentos e o que está chegando</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : attention.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CheckCircle2Icon className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nada pendente. Tudo em dia.</p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y">
                  {attention.map((event) => (
                    <EventRow key={event.id} event={event} trailing={relativeDay(event.date)} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos {AGENDA_DAYS} dias</CardTitle>
              <CardDescription>Vencimentos, cobranças e retornos</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : agenda.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nada agendado.</p>
              ) : (
                <Agenda events={agenda} />
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

const DOT: Record<Severity, string> = {
  danger: 'bg-destructive',
  warning: 'bg-foreground',
  info: 'bg-muted-foreground/40',
}

function EventRow({ event, trailing }: { event: HomeEvent; trailing?: string }) {
  const Icon = event.icon
  return (
    <li>
      <a href={event.href} className="group flex items-center gap-3 py-2.5 first:pt-0">
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-md border">
          <Icon className="size-4 text-muted-foreground" />
          <span className={`absolute -top-0.5 -right-0.5 size-2 rounded-full ${DOT[event.severity]}`} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-sm font-medium ${event.severity === 'danger' ? 'text-destructive' : ''}`}>
            {event.title}
          </span>
          <span className="truncate text-xs text-muted-foreground">{event.detail}</span>
        </span>
        {trailing && <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span>}
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    </li>
  )
}

function Agenda({ events }: { events: HomeEvent[] }) {
  const days = new Map<string, HomeEvent[]>()
  for (const event of events) days.set(event.date, [...(days.get(event.date) ?? []), event])

  return (
    <div className="flex flex-col gap-4">
      {[...days.entries()].map(([date, list]) => (
        <div key={date} className="flex gap-4">
          <div className="flex w-12 shrink-0 flex-col items-center rounded-md border py-1 leading-none">
            <span className="text-lg font-semibold tabular-nums">{date.slice(8, 10)}</span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {formatDate(date, { month: 'short' }).replace('.', '')}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted-foreground">{relativeDay(date)}</span>
            <ul className="flex flex-col">
              {list.map((event) => (
                <li key={event.id}>
                  <a href={event.href} className="flex items-baseline gap-2 py-0.5 text-sm hover:underline">
                    <span className={`size-1.5 shrink-0 translate-y-[-1px] rounded-full ${DOT[event.severity]}`} />
                    <span className="truncate">{event.title}</span>
                    <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground tabular-nums">{event.meta}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({
  loading,
  href,
  label,
  value,
  badge,
  badgeVariant = 'outline',
  headline,
  detail,
}: {
  loading: boolean
  href?: string
  label: string
  value: string
  badge?: string
  badgeVariant?: 'outline' | 'destructive'
  headline: string
  detail: string
}) {
  return (
    <Card className={`@container/card relative ${href ? 'transition-colors hover:border-foreground/30' : ''}`}>
      <CardHeader>
        <CardDescription>
          {href ? (
            <a href={href} className="after:absolute after:inset-0">
              {label}
            </a>
          ) : (
            label
          )}
        </CardDescription>
        <CardTitle className="col-span-full truncate text-2xl font-semibold tabular-nums @[340px]/card:text-3xl">
          {loading ? <Skeleton className="h-9 w-32" /> : value}
        </CardTitle>
        {!loading && badge && (
          <CardAction className="row-span-1">
            <Badge variant={badgeVariant}>{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <>
            <div className="line-clamp-1 font-medium">{headline}</div>
            <div className="line-clamp-1 text-muted-foreground">{detail}</div>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
