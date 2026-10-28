import type { Syncable } from '@/domain/types'
import { addDays, addMonths, parseDate } from '@/lib/format'

/** How often a reminder repeats, with the unit `interval` counts in. */
export const FREQUENCIES = {
  once: { label: 'Uma vez', unit: ['', ''] },
  daily: { label: 'Diário', unit: ['dia', 'dias'] },
  weekly: { label: 'Semanal', unit: ['semana', 'semanas'] },
  monthly: { label: 'Mensal', unit: ['mês', 'meses'] },
  yearly: { label: 'Anual', unit: ['ano', 'anos'] },
} as const

export type ReminderFrequency = keyof typeof FREQUENCIES

/** Sunday first, matching Date.getDay(). */
export const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

/** How far ahead a reminder starts asking for attention, in days. */
export const LEAD_OPTIONS = {
  0: 'No dia',
  1: '1 dia antes',
  3: '3 dias antes',
  7: '1 semana antes',
  14: '2 semanas antes',
  30: '1 mês antes',
} as const

export interface Reminder extends Syncable {
  title: string
  notes: string
  frequency: ReminderFrequency
  /** Repeats every `interval` days, weeks, months or years (1 = every one) */
  interval: number
  /** Weekly only: days of the week, 0 = Sunday */
  weekdays: number[]
  /** First occurrence, YYYY-MM-DD. Later ones repeat from it (day 31 clamps to shorter months). */
  startDate: string
  /**
   * YYYY-MM-DD, empty for none (also missing on reminders saved before it existed).
   * Repeating: the last day it can fall on. One-time: the last day of a period (a trip, a stay).
   */
  endDate?: string
  /** Shown in "Precisa de atenção" from this many days before */
  leadDays: number
  /** YYYY-MM-DD when it was ended, empty while active */
  endedAt: string
}

/** What happened to one occurrence: done, or moved to another day. */
export interface ReminderOccurrence extends Syncable {
  reminderId: string
  /** The scheduled date, YYYY-MM-DD */
  date: string
  /** YYYY-MM-DD when done, empty while pending */
  doneAt: string
  /** Day it was moved to, empty unless snoozed */
  snoozedTo: string
}

export type RemindersData = {
  reminders: Reminder[]
  occurrences: ReminderOccurrence[]
}

type Schedule = Pick<Reminder, 'frequency' | 'interval' | 'weekdays' | 'startDate' | 'endDate'>

/** The last day of a one-time reminder's period: its end date when it spans several days, else its date. */
export function periodEnd(reminder: Pick<Reminder, 'frequency' | 'startDate' | 'endDate'>, date: string): string {
  return reminder.frequency === 'once' && reminder.endDate && reminder.endDate > date ? reminder.endDate : date
}

/** Weekly reminders without days picked fall on the start date's weekday. */
function sortedDays(reminder: Schedule): number[] {
  return reminder.weekdays.length ? [...reminder.weekdays].sort((a, b) => a - b) : [parseDate(reminder.startDate).getDay()]
}

/**
 * Every scheduled date from the start, in order, up to the end date if there is one.
 * Endless for repeating reminders without an end: stop iterating yourself.
 */
export function* occurrences(reminder: Schedule): Generator<string> {
  for (const date of unbounded(reminder)) {
    if (reminder.frequency !== 'once' && reminder.endDate && date > reminder.endDate) return
    yield date
  }
}

function* unbounded(reminder: Schedule): Generator<string> {
  const { startDate } = reminder
  const step = Math.max(1, reminder.interval)
  switch (reminder.frequency) {
    case 'once':
      yield startDate
      return
    case 'daily':
      for (let k = 0; ; k++) yield addDays(startDate, k * step)
    case 'weekly': {
      const days = sortedDays(reminder)
      const weekStart = addDays(startDate, -parseDate(startDate).getDay())
      for (let week = 0; ; week += step) {
        for (const day of days) {
          const date = addDays(weekStart, week * 7 + day)
          if (date >= startDate) yield date
        }
      }
    }
    case 'monthly':
      for (let k = 0; ; k++) yield addMonths(startDate, k * step)
    case 'yearly':
      for (let k = 0; ; k++) yield addMonths(startDate, k * step * 12)
  }
}

/** The last scheduled date on or before `date`, and the first one after it. */
export function around(reminder: Schedule, date: string): { last?: string; next?: string } {
  let last: string | undefined
  for (const occurrence of occurrences(reminder)) {
    if (occurrence > date) return { last, next: occurrence }
    last = occurrence
  }
  return { last }
}

/** "Todo dia", "A cada 2 semanas · seg, qua · até 30/06/2027", "Todo mês · dia 6", "Uma vez · 10/03/2027", "De 10/03/2027 a 15/03/2027" */
export function scheduleLabel(reminder: Schedule): string {
  const start = parseDate(reminder.startDate)
  if (reminder.frequency === 'once') {
    return reminder.endDate && reminder.endDate > reminder.startDate
      ? `De ${start.toLocaleDateString('pt-BR')} a ${parseDate(reminder.endDate).toLocaleDateString('pt-BR')}`
      : `Uma vez · ${start.toLocaleDateString('pt-BR')}`
  }
  const until = reminder.endDate ? ` · até ${parseDate(reminder.endDate).toLocaleDateString('pt-BR')}` : ''
  return `${repeatLabel(reminder, start)}${until}`
}

function repeatLabel(reminder: Schedule, start: Date): string {
  if (reminder.frequency === 'once') return ''
  const step = Math.max(1, reminder.interval)
  const every =
    step > 1
      ? `A cada ${step} ${FREQUENCIES[reminder.frequency].unit[1]}`
      : { daily: 'Todo dia', weekly: 'Toda semana', monthly: 'Todo mês', yearly: 'Todo ano' }[reminder.frequency]
  switch (reminder.frequency) {
    case 'daily':
      return every
    case 'weekly': {
      return `${every} · ${sortedDays(reminder).map((d) => WEEKDAYS[d]).join(', ')}`
    }
    case 'monthly':
      return `${every} · dia ${start.getDate()}`
    case 'yearly':
      return `${every} · ${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`
  }
}

export type ReminderStatus = 'overdue' | 'today' | 'upcoming'
