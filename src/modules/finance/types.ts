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

export const INVESTMENT_KINDS = {
  cdb: 'CDB',
  lci: 'LCI',
  lca: 'LCA',
  treasury: 'Tesouro Direto',
  debenture: 'Debênture / CRI / CRA',
  fund: 'Fundo',
  stock: 'Ações / FII',
  crypto: 'Cripto',
  other: 'Outro',
} as const

export type InvestmentKind = keyof typeof INVESTMENT_KINDS

/**
 * One application (a CDB, an LCI…). It is a detail of where the money is: account
 * balances already include it, so investments never add to net worth.
 */
export interface Investment extends Syncable {
  institution: string
  /** e.g. "CDB Banco C6 Consignado" */
  name: string
  kind: InvestmentKind
  /** Invested amount, in cents */
  amount: number
  /** YYYY-MM-DD */
  investedAt: string
  /** YYYY-MM-DD, empty when there is no maturity (daily liquidity, stocks…) */
  maturity: string
  /** Free text, e.g. "110% CDI", "IPCA + 6%", "13,5% a.a." */
  rate: string
  /** YYYY-MM-DD when redeemed, empty while active */
  redeemedAt: string
  /** Amount received on redemption, in cents */
  redeemedAmount: number
  notes: string
}

export type FinanceData = {
  accounts: Account[]
  balances: BalanceEntry[]
  investments: Investment[]
}

/** Maturity reminders start one month ahead. */
export const MATURITY_SOON_DAYS = 30

/** Profit of a redeemed investment: absolute (cents), total % and annualized %. */
export function investmentReturn(investment: Pick<Investment, 'amount' | 'investedAt' | 'redeemedAt' | 'redeemedAmount'>) {
  const profit = investment.redeemedAmount - investment.amount
  const total = investment.amount ? profit / investment.amount : 0
  const days = Math.max(
    1,
    Math.round((new Date(investment.redeemedAt).getTime() - new Date(investment.investedAt).getTime()) / 86_400_000),
  )
  const annual = Math.pow(1 + total, 365 / days) - 1
  return { profit, total, annual, days }
}

export function accountLabel(account: Account): string {
  return account.name.trim() || ACCOUNT_TYPES[account.type]
}
