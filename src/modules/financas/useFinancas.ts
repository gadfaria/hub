import { useCallback, useMemo } from 'react'
import { newSyncable, touch } from '@/domain/merge'
import { useCollection } from '@/storage/useCollection'
import { today } from './format'
import type { Account, AccountType, BalanceEntry, FinancasData } from './types'

const EMPTY: FinancasData = { accounts: [], balances: [] }

export interface AccountSummary {
  account: Account
  latest: BalanceEntry | undefined
}

export interface InstitutionGroup {
  institution: string
  total: number
  accounts: AccountSummary[]
}

export interface SeriesPoint {
  /** YYYY-MM-DD */
  date: string
  /** Net worth in cents on that day */
  total: number
}

/** Newest balance first: by date, then by when it was recorded. */
function byNewest(a: BalanceEntry, b: BalanceEntry): number {
  return b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
}

/**
 * Net worth over time: on each day with a balance entry, the sum of every
 * account's most recent balance up to that day. Extended to today.
 */
function buildSeries(accounts: Account[], history: Map<string, BalanceEntry[]>): SeriesPoint[] {
  const entries = accounts.flatMap((a) => history.get(a.id) ?? []).sort((a, b) => byNewest(b, a))
  const current = new Map<string, number>()
  const series: SeriesPoint[] = []
  for (const entry of entries) {
    current.set(entry.accountId, entry.amount)
    let total = 0
    for (const amount of current.values()) total += amount
    if (series.at(-1)?.date === entry.date) series[series.length - 1].total = total
    else series.push({ date: entry.date, total })
  }
  const last = series.at(-1)
  if (last && last.date < today()) series.push({ date: today(), total: last.total })
  return series
}

/** Net worth on a given day (the last point on or before it), or undefined before the first record. */
export function valueAt(series: SeriesPoint[], date: string): number | undefined {
  let value: number | undefined
  for (const point of series) {
    if (point.date > date) break
    value = point.total
  }
  return value
}

export function useFinancas() {
  const { data, loading, save } = useCollection('financas', EMPTY)

  const derived = useMemo(() => {
    const accounts = (data?.accounts ?? []).filter((a) => !a.deleted)
    const history = new Map<string, BalanceEntry[]>()
    for (const entry of data?.balances ?? []) {
      if (entry.deleted) continue
      const list = history.get(entry.accountId) ?? []
      list.push(entry)
      history.set(entry.accountId, list)
    }
    for (const list of history.values()) list.sort(byNewest)

    const groups = new Map<string, InstitutionGroup>()
    for (const account of accounts) {
      const latest = history.get(account.id)?.[0]
      const key = account.institution.trim()
      const group = groups.get(key.toLowerCase()) ?? { institution: key, total: 0, accounts: [] }
      group.total += latest?.amount ?? 0
      group.accounts.push({ account, latest })
      groups.set(key.toLowerCase(), group)
    }
    const sortedGroups = [...groups.values()].sort((a, b) => b.total - a.total)
    for (const group of sortedGroups) {
      group.accounts.sort((a, b) => (b.latest?.amount ?? 0) - (a.latest?.amount ?? 0))
    }

    const latestEntries = accounts.map((a) => history.get(a.id)?.[0]).filter((e) => e !== undefined)
    return {
      groups: sortedGroups,
      total: latestEntries.reduce((sum, e) => sum + e.amount, 0),
      lastUpdate: latestEntries.map((e) => e.date).sort().at(-1),
      institutions: sortedGroups.map((g) => g.institution),
      history,
      series: buildSeries(accounts, history),
    }
  }, [data])

  const addAccount = useCallback(
    (input: { institution: string; name: string; type: AccountType }, amount: number, date: string) => {
      const account: Account = { ...newSyncable(), ...input }
      const entry: BalanceEntry = { ...newSyncable(), accountId: account.id, amount, date }
      return save({ accounts: [account], balances: [entry] })
    },
    [save],
  )

  const updateAccount = useCallback(
    (account: Account, changes: Partial<Pick<Account, 'institution' | 'name' | 'type'>>) =>
      save({ accounts: [touch(account, changes)] }),
    [save],
  )

  const addBalance = useCallback(
    (accountId: string, amount: number, date: string) =>
      save({ balances: [{ ...newSyncable(), accountId, amount, date }] }),
    [save],
  )

  const deleteBalance = useCallback(
    (entry: BalanceEntry) => save({ balances: [touch(entry, { deleted: true })] }),
    [save],
  )

  const deleteAccount = useCallback(
    (account: Account) =>
      save({
        accounts: [touch(account, { deleted: true })],
        balances: (derived.history.get(account.id) ?? []).map((e) => touch(e, { deleted: true })),
      }),
    [save, derived.history],
  )

  return { loading, ...derived, addAccount, updateAccount, addBalance, deleteBalance, deleteAccount }
}
