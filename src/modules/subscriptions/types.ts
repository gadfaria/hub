import type { Syncable } from '@/domain/types'
import { addMonths, today } from '@/lib/format'

export const CATEGORIES = {
  streaming: 'Streaming',
  software: 'Apps e software',
  telecom: 'Internet e celular',
  utilities: 'Casa (luz, água, gás)',
  insurance: 'Seguros',
  health: 'Saúde e academia',
  education: 'Educação',
  other: 'Outros',
} as const

export type Category = keyof typeof CATEGORIES

/** Billing cycles and how many months each one spans. */
export const CYCLES = {
  monthly: { label: 'Mensal', months: 1 },
  quarterly: { label: 'Trimestral', months: 3 },
  semiannual: { label: 'Semestral', months: 6 },
  yearly: { label: 'Anual', months: 12 },
} as const

export type Cycle = keyof typeof CYCLES

export interface Subscription extends Syncable {
  name: string
  category: Category
  /** Charged every cycle, in cents */
  amount: number
  cycle: Cycle
  /** First charge, YYYY-MM-DD. Later charges repeat every cycle from this date. */
  startDate: string
  /** e.g. "Nubank crédito" */
  paymentMethod: string
  /** Where to manage or cancel it */
  url: string
  notes: string
  /** YYYY-MM-DD when cancelled, empty while active */
  cancelledAt: string
}

export type SubscriptionsData = {
  subscriptions: Subscription[]
}

export function monthlyCost(subscription: Pick<Subscription, 'amount' | 'cycle'>): number {
  return subscription.amount / CYCLES[subscription.cycle].months
}

/** The first charge date from today on (today included). */
export function nextCharge(subscription: Pick<Subscription, 'startDate' | 'cycle'>): string {
  const now = today()
  if (subscription.startDate >= now) return subscription.startDate
  const step = CYCLES[subscription.cycle].months
  // Jump close to today first, then step forward; always computed from startDate so
  // month-end dates (the 31st) clamp per month instead of drifting.
  const [sy, sm] = subscription.startDate.split('-').map(Number)
  const [ny, nm] = now.split('-').map(Number)
  let cycles = Math.max(0, Math.floor(((ny - sy) * 12 + (nm - sm)) / step) - 1)
  let date = addMonths(subscription.startDate, cycles * step)
  while (date < now) {
    cycles += 1
    date = addMonths(subscription.startDate, cycles * step)
  }
  return date
}
