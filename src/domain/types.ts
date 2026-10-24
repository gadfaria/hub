export const SCHEMA_VERSION = 1

/** Base for anything synced to Drive: merged by `id`, newest `updatedAt` wins. */
export interface Syncable {
  id: string
  createdAt: string
  updatedAt: string
  deleted: boolean
}

/**
 * Content of one collection file: named lists of syncable items,
 * e.g. `{ accounts: Account[], balances: BalanceEntry[] }`.
 */
export type CollectionData = Record<string, Syncable[]>
