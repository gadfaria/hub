import type { LucideIcon } from 'lucide-react'
import { BellIcon, CarIcon, HeartPulseIcon, IdCardIcon, PiggyBankIcon, ReceiptTextIcon, RepeatIcon } from 'lucide-react'
import { addDays, addMonths, formatMoney, parseDate, today, toIsoDate } from '@/lib/format'
import type { MonthRow } from '@/modules/bills/useBills'
import { documentLabel } from '@/modules/documents/types'
import type { DocumentRow } from '@/modules/documents/useDocuments'
import type { Investment } from '@/modules/finance/types'
import { ENTRY_KINDS, type HealthEntry } from '@/modules/health/types'
import type { CalendarReminder } from '@/modules/reminders/useReminders'
import { CYCLES, type Subscription } from '@/modules/subscriptions/types'
import { vehicleLabel } from '@/modules/vehicles/types'
import type { VehicleSummary } from '@/modules/vehicles/useVehicles'

export type CalendarKind = 'reminder' | 'bill' | 'subscription' | 'other'

/** Something that falls on a day of the calendar, from any module. */
export interface CalendarItem {
  id: string
  kind: CalendarKind
  icon: LucideIcon
  /** YYYY-MM-DD it starts on */
  date: string
  /** YYYY-MM-DD it ends on; equal to `date` unless it spans days (a trip) */
  until: string
  title: string
  /** Short trailing info (amount, person…) */
  meta: string
  href: string
  done: boolean
  /** Overdue and still waiting to be done */
  late: boolean
}

/** The six weeks shown for a month, Sunday first, as YYYY-MM-DD. */
export function monthGrid(month: string): string[] {
  const first = parseDate(`${month}-01`)
  const start = addDays(`${month}-01`, -first.getDay())
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export interface CalendarSources {
  reminders: CalendarReminder[]
  /** Bill rows of every month the grid touches */
  billRows: MonthRow[]
  subscriptions: Subscription[]
  documents: DocumentRow[]
  health: { person: string; upcoming: HealthEntry[] }[]
  vehicles: VehicleSummary[]
  investments: Investment[]
}

/** Every item between `from` and `to` (inclusive), in date order. */
export function collectCalendar(from: string, to: string, sources: CalendarSources): CalendarItem[] {
  const now = today()
  const items: CalendarItem[] = []
  const within = (date: string) => date >= from && date <= to

  for (const { reminder, due, until, done, late } of sources.reminders) {
    items.push({
      id: `reminder-${reminder.id}-${due}`,
      kind: 'reminder',
      icon: BellIcon,
      date: due,
      until,
      title: reminder.title,
      meta: '',
      href: '#/reminders',
      done,
      late,
    })
  }

  for (const row of sources.billRows) {
    if (!within(row.dueDate)) continue
    items.push({
      id: `bill-${row.bill.id}-${row.dueDate}`,
      kind: 'bill',
      icon: ReceiptTextIcon,
      date: row.dueDate,
      until: row.dueDate,
      title: row.bill.name,
      meta: row.amount ? formatMoney(row.amount) : '',
      href: '#/bills',
      done: row.status === 'paid',
      late: row.status === 'overdue',
    })
  }

  for (const subscription of sources.subscriptions) {
    const step = CYCLES[subscription.cycle].months
    // Always from the first charge, so month-end dates clamp per month instead of drifting.
    for (let k = 0; ; k++) {
      const date = addMonths(subscription.startDate, k * step)
      if (date > to) break
      if (date < from) continue
      items.push({
        id: `sub-${subscription.id}-${date}`,
        kind: 'subscription',
        icon: RepeatIcon,
        date,
        until: date,
        title: subscription.name,
        meta: formatMoney(subscription.amount),
        href: '#/bills/subscriptions',
        done: date < now,
        late: false,
      })
    }
  }

  const other = (item: Omit<CalendarItem, 'kind' | 'until' | 'done' | 'late'>) => {
    if (within(item.date)) items.push({ ...item, kind: 'other', until: item.date, done: false, late: false })
  }

  for (const { document } of sources.documents) {
    if (!document.expiryDate) continue
    other({
      id: `doc-${document.id}`,
      icon: IdCardIcon,
      date: document.expiryDate,
      title: `Vence: ${documentLabel(document)}`,
      meta: document.owner,
      href: '#/documents',
    })
  }

  for (const { vehicle, currentPolicy } of sources.vehicles) {
    if (!currentPolicy) continue
    other({
      id: `policy-${currentPolicy.id}`,
      icon: CarIcon,
      date: currentPolicy.endDate,
      title: `Fim do seguro: ${vehicleLabel(vehicle)}`,
      meta: currentPolicy.insurer,
      href: `#/vehicles/${vehicle.id}`,
    })
  }

  for (const { person, upcoming } of sources.health) {
    for (const entry of upcoming) {
      other({
        id: `health-${entry.id}`,
        icon: HeartPulseIcon,
        date: entry.nextDate,
        title: `${entry.kind === 'vaccine' ? 'Próxima dose' : entry.kind === 'appointment' ? 'Retorno' : ENTRY_KINDS[entry.kind]}: ${entry.title}`,
        meta: person,
        href: '#/health',
      })
    }
  }

  for (const investment of sources.investments) {
    if (!investment.maturity) continue
    other({
      id: `investment-${investment.id}`,
      icon: PiggyBankIcon,
      date: investment.maturity,
      title: `Vence: ${investment.name}`,
      meta: formatMoney(investment.amount),
      href: '#/finance',
    })
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

/** The items on a given day, including periods that cover it. */
export function itemsOn(items: CalendarItem[], day: string): CalendarItem[] {
  return items.filter((item) => item.date <= day && day <= item.until)
}

/** YYYY-MM months a span of days touches, e.g. a grid that starts in September and ends in November. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  for (let date = parseDate(`${from.slice(0, 7)}-01`); toIsoDate(date) <= to; date.setMonth(date.getMonth() + 1)) {
    months.push(toIsoDate(date).slice(0, 7))
  }
  return months
}
