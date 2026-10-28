/**
 * A small key-value store in IndexedDB, for data kept on the device to be read offline
 * (only notes use it). Every call fails soft: without storage (private window, blocked
 * site data) the app simply has no offline copy.
 */
const DB_NAME = 'vault-offline'
const STORE = 'kv'

let opening: Promise<IDBDatabase> | undefined

function db(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch((err) => {
    opening = undefined
    throw err
  })
  return opening
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const request = action(database.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

export async function getOffline<T>(key: string): Promise<T | undefined> {
  try {
    return (await run('readonly', (store) => store.get(key))) as T | undefined
  } catch {
    return undefined
  }
}

export async function setOffline(key: string, value: unknown): Promise<void> {
  try {
    await run('readwrite', (store) => store.put(value, key))
  } catch {
    // No offline copy this time; the data is still on Drive.
  }
}

export async function deleteOffline(key: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(key))
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Wipes every offline copy, e.g. on sign-out. */
export async function clearOffline(): Promise<void> {
  try {
    await run('readwrite', (store) => store.clear())
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Asks the browser not to evict the offline copy under storage pressure (Safari does otherwise). */
export function persistOffline(): void {
  navigator.storage?.persist?.().catch(() => {})
}
