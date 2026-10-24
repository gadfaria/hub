import type { Attachment, Syncable } from '@/domain/types'

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

/** A bill that comes every month with a varying amount. */
export interface Bill extends Syncable {
  name: string
  category: BillCategory
  /** Day of the month it is due (clamped to short months) */
  dueDay: number
  paymentMethod: PaymentMethod
  /** Expected amount in cents, used until the real one is entered */
  estimate: number
  /** First month it applies to, YYYY-MM (earlier months don't list it) */
  startMonth: string
  /** Last month it applies to, YYYY-MM, or empty while active */
  endMonth: string
  notes: string
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

export type BillStatus = 'paid' | 'pending' | 'overdue'

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  paid: 'Paga',
  pending: 'Pendente',
  overdue: 'Atrasada',
}
