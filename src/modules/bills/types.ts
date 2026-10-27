import type { Attachment, Syncable } from '@/domain/types'
import { dayOfMonth, parseDate } from '@/lib/format'

export const BILL_CATEGORIES = {
  rent: 'Aluguel',
  condo: 'Condomínio',
  electricity: 'Luz',
  water: 'Água',
  gas: 'Gás',
  internet: 'Internet e telefone',
  creditCard: 'Fatura do cartão',
  tax: 'Impostos e taxas',
  other: 'Outros',
} as const

export type BillCategory = keyof typeof BILL_CATEGORIES

export const PAYMENT_METHODS = {
  boleto: 'Boleto',
  autoDebit: 'Débito automático',
  pix: 'Pix',
  card: 'Cartão',
  other: 'Outro',
} as const

export type PaymentMethod = keyof typeof PAYMENT_METHODS

/** How often a bill comes and how many months apart (0: only once, in its start month). */
export const FREQUENCIES = {
  monthly: { label: 'Mensal', months: 1 },
  bimonthly: { label: 'Bimestral', months: 2 },
  quarterly: { label: 'Trimestral', months: 3 },
  semiannual: { label: 'Semestral', months: 6 },
  yearly: { label: 'Anual', months: 12 },
  once: { label: 'Avulsa', months: 0 },
} as const

export type BillFrequency = keyof typeof FREQUENCIES

/** A bill with a varying amount, due every month, every few months or just once. */
export interface Bill extends Syncable {
  name: string
  category: BillCategory
  /** Missing on bills saved before frequencies existed, which are monthly */
  frequency?: BillFrequency
  /** Day of the month it is due (clamped to short months) */
  dueDay: number
  paymentMethod: PaymentMethod
  /** Expected amount in cents, used until the real one is entered */
  estimate: number
  /** First month it applies to, YYYY-MM (earlier months don't list it). Later ones repeat every cycle from it. */
  startMonth: string
  /** Last month it applies to, YYYY-MM, or empty while active */
  endMonth: string
  notes: string
  /** Set on credit cards (category creditCard): the bill is the card's monthly statement */
  card?: CardDetails
}

/** A credit card. Only the last digits: the full number, CVV or password never go in the vault. */
export interface CardDetails {
  bank: string
  /** Last 4 digits, or empty */
  lastDigits: string
  /** Credit limit in cents, 0 when not set */
  limit: number
  /** Day the statement closes, 0 when not set */
  closingDay: number
}

/** Credit cards are bills of category creditCard; older ones may have no details yet. */
export function isCard(bill: Pick<Bill, 'category'>): boolean {
  return bill.category === 'creditCard'
}

/** "Nubank •••• 1234" */
export function cardLabel(bill: Pick<Bill, 'card'>): string {
  const card = bill.card
  if (!card) return ''
  return [card.bank, card.lastDigits && `•••• ${card.lastDigits}`].filter(Boolean).join(' ')
}

/** One month of a bill: the real amount and whether it was paid. */
export interface BillPayment extends Syncable {
  billId: string
  /** YYYY-MM */
  month: string
  /** In cents */
  amount: number
  /** YYYY-MM-DD */
  dueDate: string
  /** YYYY-MM-DD when paid, empty while pending */
  paidAt: string
  notes: string
  attachments: Attachment[]
}

export type BillsData = {
  bills: Bill[]
  payments: BillPayment[]
}

export function billFrequency(bill: Pick<Bill, 'frequency'>): BillFrequency {
  return bill.frequency ?? 'monthly'
}

/** Whether the bill is due in a YYYY-MM month. */
export function isDueIn(bill: Pick<Bill, 'frequency' | 'startMonth' | 'endMonth'>, month: string): boolean {
  if (month < bill.startMonth || (bill.endMonth && month > bill.endMonth)) return false
  const step = FREQUENCIES[billFrequency(bill)].months
  if (step === 0) return month === bill.startMonth
  return monthsBetween(bill.startMonth, month) % step === 0
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

/** "vence dia 10"; "trimestral · dia 10 (jan, abr, jul, out)"; "anual · 10 de março"; "avulsa · 10/03/2027" */
export function scheduleLabel(bill: Pick<Bill, 'frequency' | 'dueDay' | 'startMonth'>): string {
  const frequency = billFrequency(bill)
  if (frequency === 'monthly') return `vence dia ${bill.dueDay}`
  const label = FREQUENCIES[frequency].label.toLowerCase()
  const first = parseDate(dayOfMonth(bill.startMonth, bill.dueDay))
  if (frequency === 'once') return `${label} · ${first.toLocaleDateString('pt-BR')}`
  if (frequency === 'yearly') return `${label} · ${first.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`
  const step = FREQUENCIES[frequency].months
  const months = Array.from({ length: 12 / step }, (_, i) =>
    new Date(2000, (first.getMonth() + i * step) % 12, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  )
  return `${label} · dia ${bill.dueDay} (${months.join(', ')})`
}

export type BillStatus = 'paid' | 'pending' | 'overdue'

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  paid: 'Paga',
  pending: 'Pendente',
  overdue: 'Atrasada',
}
