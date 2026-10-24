import type { Syncable } from '@/domain/types'

export const ACCOUNT_TYPES = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  investment: 'Investimentos',
  pension: 'Previdência',
  crypto: 'Cripto',
  other: 'Outro',
} as const

export type AccountType = keyof typeof ACCOUNT_TYPES

/** Where money sits: a bank account, a brokerage, a wallet… */
export interface Account extends Syncable {
  institution: string
  /** Optional label, e.g. "Caixinha viagem". Falls back to the type label. */
  name: string
  type: AccountType
}

/** The balance of an account on a given day. The latest one is the current balance. */
export interface BalanceEntry extends Syncable {
  accountId: string
  /** YYYY-MM-DD */
  date: string
  /** In cents, to avoid floating point errors. */
  amount: number
}

export type FinanceData = {
  accounts: Account[]
  balances: BalanceEntry[]
}

export function accountLabel(account: Account): string {
  return account.name.trim() || ACCOUNT_TYPES[account.type]
}
