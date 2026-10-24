import type { Syncable } from './types'

/**
 * Merges two lists item by item: for each `id`, the version with the most
 * recent `updatedAt` wins. Deletions are tombstones (`deleted: true`), so a
 * removed item never comes back from a stale copy.
 */
export function mergeById<T extends Syncable>(remote: T[], local: T[]): T[] {
  const byId = new Map(remote.map((item) => [item.id, item]))
  for (const item of local) {
    const current = byId.get(item.id)
    if (!current || item.updatedAt > current.updatedAt) byId.set(item.id, item)
  }
  return [...byId.values()]
}

export function newSyncable(): Syncable {
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, deleted: false }
}

export function touch<T extends Syncable>(item: T, changes: Partial<NoInfer<T>> = {}): T {
  return { ...item, ...changes, updatedAt: new Date().toISOString() }
}
