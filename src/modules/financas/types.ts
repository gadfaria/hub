import type { Syncable } from '@/domain/types'

export const ACCOUNT_TYPES = {
  conta: 'Conta corrente',
  poupanca: 'Poupança',
  investimento: 'Investimentos',
  previdencia: 'Previdência',
  cripto: 'Cripto',
  outro: 'Outro',
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

export type FinancasData = {
  accounts: Account[]
  balances: BalanceEntry[]
}

export function accountLabel(account: Account): string {
  return account.name.trim() || ACCOUNT_TYPES[account.type]
}
