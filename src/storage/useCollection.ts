import { useCallback, useEffect, useState } from 'react'
import type { CollectionData } from '@/domain/types'
import { useVaultContext } from './context'

/**
 * Loads one collection file and exposes a `save` that merges changes into it.
 * `empty` must be a stable (module-level) object: it is the collection's shape and defaults.
 */
export function useCollection<T extends CollectionData>(key: string, empty: T) {
  const { vault, reportError } = useVaultContext()
  const [data, setData] = useState<T | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    vault
      .open()
      .then(() => vault.load(key, empty))
      .then(
        (loaded) => !cancelled && setData(loaded),
        (err) => {
          if (cancelled) return
          setFailed(true)
          reportError(err)
        },
      )
    return () => {
      cancelled = true
    }
  }, [vault, key, empty, reportError])

  const save = useCallback(
    async (changes: Partial<T>): Promise<boolean> => {
      try {
        setData(await vault.save(key, empty, changes))
        return true
      } catch (err) {
        reportError(err)
        return false
      }
    },
    [vault, key, empty, reportError],
  )

  return { data, loading: !data && !failed, failed, save }
}
