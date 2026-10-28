import { useState } from 'react'
import { CheckCircle2Icon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { PageBody } from '@/components/app-layout'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { currentMonth, daysUntil, formatDate, formatMonth, shiftMonth, today } from '@/lib/format'
import { useBills } from '@/modules/bills/useBills'
import { useDocuments } from '@/modules/documents/useDocuments'
import { useFinance } from '@/modules/finance/useFinance'
import { useHealth } from '@/modules/health/useHealth'
import { useReminders, type ReminderRow } from '@/modules/reminders/useReminders'
import { useSubscriptions } from '@/modules/subscriptions/useSubscriptions'
import { useVehicles } from '@/modules/vehicles/useVehicles'
import { collectCalendar, itemsOn, monthGrid, monthsBetween, type CalendarItem } from './calendar'
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
  const reminders = useReminders()
  const loading =
    finance.loading || bills.loading || subs.loading || docs.loading || health.loading || vehicles.loading || reminders.loading

  async function completeReminder(row: ReminderRow) {
    const done = await reminders.complete(row)
    if (done) toast.success(`${row.reminder.title}: feito`, { action: { label: 'Desfazer', onClick: () => reminders.undoOccurrence(done) } })
  }

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
        reminders: reminders.active,
        completeReminder,
      })

  const attention = events.filter((e) => e.attention).sort(byUrgency)
  const now = today()
  const agenda = events.filter((e) => e.date >= now && daysUntil(e.date) <= AGENDA_DAYS).sort((a, b) => a.date.localeCompare(b.date))

  const [shownMonth, setShownMonth] = useState(month)
  const [selected, setSelected] = useState(now)
  const grid = monthGrid(shownMonth)
  const gridFrom = grid[0]
  const gridTo = grid[grid.length - 1]
  const calendar = loading
    ? []
    : collectCalendar(gridFrom, gridTo, {
        reminders: reminders.inRange(gridFrom, gridTo),
        billRows: monthsBetween(gridFrom, gridTo).flatMap((m) => bills.monthRows(m)),
        subscriptions: subs.active.map((r) => r.subscription),
        documents: docs.rows,
        health: health.people.map((person) => ({ person, upcoming: health.forPerson(person).upcoming })),
        vehicles: vehicles.summaries,
        investments: finance.activeInvestments,
      })

  function showMonth(next: string) {
    setShownMonth(next)
    // Keep today selected in its own month; elsewhere start from the 1st.
    setSelected(next === month ? now : `${next}-01`)
  }

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

        <div className="px-4 lg:px-6">
          <CalendarCard
            loading={loading}
            month={shownMonth}
            grid={grid}
            items={calendar}
            selected={selected}
            onSelect={(day) => {
              setSelected(day)
              if (day.slice(0, 7) !== shownMonth) setShownMonth(day.slice(0, 7))
            }}
            onMonth={showMonth}
            attention={attention}
            agenda={agenda}
          />
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
    <li className="flex items-center gap-1 py-2.5 first:pt-0">
      <a href={event.href} className="group flex min-w-0 flex-1 items-center gap-3">
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
      {event.onComplete && (
        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={event.onComplete}>
          <CheckIcon />
          <span className="sr-only">Concluir</span>
        </Button>
      )}
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

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
/** Items listed inside a day cell on wide screens; the rest become "+N". */
const CELL_ITEMS = 3

function itemTone(item: CalendarItem): string {
  if (item.late) return 'text-destructive'
  if (item.done) return 'text-muted-foreground line-through'
  // A past occurrence nobody marked: no longer asked for, so just faded.
  if (item.until < today()) return 'text-muted-foreground'
  return ''
}

function CalendarCard({
  loading,
  month,
  grid,
  items,
  selected,
  onSelect,
  onMonth,
  attention,
  agenda,
}: {
  loading: boolean
  month: string
  grid: string[]
  items: CalendarItem[]
  selected: string
  onSelect: (day: string) => void
  onMonth: (month: string) => void
  attention: HomeEvent[]
  agenda: HomeEvent[]
}) {
  const now = today()
  const dayItems = itemsOn(items, selected)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="first-letter:uppercase">{formatMonth(month)}</CardTitle>
        <CardDescription>Lembretes, contas, cobranças e vencimentos</CardDescription>
        <CardAction className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onMonth(currentMonth())} disabled={month === currentMonth()}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
            <ChevronLeftIcon />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
            <ChevronRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 @4xl/main:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="grid grid-cols-7 pb-1 text-center text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-md border bg-border gap-px">
            {grid.map((day) => {
              const inMonth = day.slice(0, 7) === month
              const list = loading ? [] : itemsOn(items, day)
              const isSelected = day === selected
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSelect(day)}
                  aria-pressed={isSelected}
                  aria-label={`${formatDate(day, { day: 'numeric', month: 'long' })}${list.length ? `, ${list.length} ${list.length === 1 ? 'item' : 'itens'}` : ''}`}
                  className={`flex min-h-14 min-w-0 flex-col items-stretch gap-0.5 p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset @4xl/main:min-h-24 ${
                    isSelected ? 'bg-muted' : 'bg-card hover:bg-muted/60'
                  } ${inMonth ? '' : 'text-muted-foreground/60'}`}
                >
                  <span
                    className={`flex size-6 items-center justify-center self-center rounded-full text-xs tabular-nums @4xl/main:self-start ${
                      day === now ? 'bg-primary font-semibold text-primary-foreground' : ''
                    }`}
                  >
                    {Number(day.slice(8, 10))}
                  </span>
                  {/* Phones: a dot per item (up to four). */}
                  {list.length > 0 && (
                    <span className="flex justify-center gap-0.5 @4xl/main:hidden">
                      {list.slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          className={`size-1.5 rounded-full ${item.late ? 'bg-destructive' : item.done || item.until < now ? 'bg-muted-foreground/40' : 'bg-foreground'}`}
                        />
                      ))}
                    </span>
                  )}
                  {/* Wide screens: the first few titles. */}
                  <span className="hidden min-w-0 flex-col gap-0.5 @4xl/main:flex">
                    {list.slice(0, CELL_ITEMS).map((item) => (
                      <span key={item.id} className={`flex min-w-0 items-center gap-1 text-[11px] leading-4 ${itemTone(item)}`}>
                        <item.icon className="size-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.title}</span>
                      </span>
                    ))}
                    {list.length > CELL_ITEMS && (
                      <span className="text-[11px] leading-4 text-muted-foreground">+{list.length - CELL_ITEMS}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Wide screens: as tall as the calendar and scrolls inside; phones: below it, full length. */}
        <div className="relative min-w-0">
          <div className="flex flex-col gap-6 @4xl/main:absolute @4xl/main:inset-0 @4xl/main:overflow-y-auto @4xl/main:pr-1">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Precisa de atenção</h3>
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : attention.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2Icon className="size-4" />
                  Nada pendente. Tudo em dia.
                </p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {attention.map((event) => (
                    <EventRow key={event.id} event={event} trailing={relativeDay(event.date)} />
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium first-letter:uppercase">
                  {formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <span className="text-xs text-muted-foreground">{relativeDay(selected)}</span>
              </div>
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : dayItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada neste dia.</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {dayItems.map((item) => (
                    <li key={item.id}>
                      <a href={item.href} className="group flex items-center gap-3 py-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border">
                          {item.done ? <CheckIcon className="size-4 text-muted-foreground" /> : <item.icon className="size-4 text-muted-foreground" />}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={`truncate text-sm font-medium ${itemTone(item)}`}>{item.title}</span>
                          {item.until !== item.date && (
                            <span className="truncate text-xs text-muted-foreground">
                              {formatDate(item.date, { day: 'numeric', month: 'short' })} a {formatDate(item.until, { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </span>
                        {item.meta && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.meta}</span>}
                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Próximos {AGENDA_DAYS} dias</h3>
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : agenda.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada agendado.</p>
              ) : (
                <Agenda events={agenda} />
              )}
            </section>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
