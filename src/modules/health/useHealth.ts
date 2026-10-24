import { useCallback, useMemo } from 'react'
import { newSyncable, touch } from '@/domain/merge'
import type { Attachment, Syncable } from '@/domain/types'
import { today } from '@/lib/format'
import { useAttachments } from '@/storage/useAttachments'
import { useCollection } from '@/storage/useCollection'
import { isOngoing, type HealthData, type HealthEntry, type HealthProfile, type Medication } from './types'

const EMPTY: HealthData = { profiles: [], entries: [], medications: [] }

export type ProfileInput = Omit<HealthProfile, keyof Syncable | 'person'>
export type EntryInput = Omit<HealthEntry, keyof Syncable | 'attachments'>
export type MedicationInput = Omit<Medication, keyof Syncable>

export interface PersonHealth {
  profile: HealthProfile | undefined
  /** Newest first */
  entries: HealthEntry[]
  activeMedications: Medication[]
  pastMedications: Medication[]
  /** Entries with a follow-up date from today on, soonest first */
  upcoming: HealthEntry[]
}

export function useHealth() {
  const { data, loading, save } = useCollection('health', EMPTY)
  const attachments = useAttachments('health')

  const live = useMemo(
    () => ({
      profiles: (data?.profiles ?? []).filter((p) => !p.deleted),
      entries: (data?.entries ?? []).filter((e) => !e.deleted),
      medications: (data?.medications ?? []).filter((m) => !m.deleted),
    }),
    [data],
  )

  const people = useMemo(
    () =>
      [
        ...new Set(
          [...live.profiles, ...live.entries, ...live.medications].map((x) => x.person.trim()).filter(Boolean),
        ),
      ].sort(),
    [live],
  )

  const forPerson = useCallback(
    (person: string): PersonHealth => {
      const mine = <T extends { person: string }>(list: T[]) => list.filter((x) => x.person.trim() === person)
      const entries = mine(live.entries).sort(
        (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      )
      const medications = mine(live.medications).sort((a, b) => a.name.localeCompare(b.name))
      const now = today()
      return {
        profile: mine(live.profiles)[0],
        entries,
        activeMedications: medications.filter(isOngoing),
        pastMedications: medications.filter((m) => !isOngoing(m)),
        upcoming: entries
          .filter((e) => e.nextDate && e.nextDate >= now)
          .sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
      }
    },
    [live],
  )

  const saveProfile = useCallback(
    (person: string, input: ProfileInput, existing?: HealthProfile) =>
      save({ profiles: [existing ? touch(existing, input) : { ...newSyncable(), person, ...input }] }),
    [save],
  )

  /** Uploads new files first, saves the entry, then trashes the files that were removed from it. */
  const saveEntry = useCallback(
    async (input: EntryInput, newFiles: File[], removed: Attachment[], existing?: HealthEntry) => {
      const uploaded = newFiles.length ? await attachments.upload(newFiles) : []
      if (uploaded === null) return false
      const removedIds = new Set(removed.map((a) => a.id))
      const kept = (existing?.attachments ?? []).filter((a) => !removedIds.has(a.id))
      const next = { ...input, attachments: [...kept, ...uploaded] }
      const ok = await save({ entries: [existing ? touch(existing, next) : { ...newSyncable(), ...next }] })
      if (ok && removed.length) await attachments.trash(removed)
      return ok
    },
    [save, attachments],
  )

  const deleteEntry = useCallback(
    async (entry: HealthEntry) => {
      const ok = await save({ entries: [touch(entry, { deleted: true })] })
      if (ok) await attachments.trash(entry.attachments)
      return ok
    },
    [save, attachments],
  )

  const saveMedication = useCallback(
    (input: MedicationInput, existing?: Medication) =>
      save({ medications: [existing ? touch(existing, input) : { ...newSyncable(), ...input }] }),
    [save],
  )

  const stopMedication = useCallback(
    (medication: Medication) => save({ medications: [touch(medication, { endDate: today() })] }),
    [save],
  )

  const deleteMedication = useCallback(
    (medication: Medication) => save({ medications: [touch(medication, { deleted: true })] }),
    [save],
  )

  return {
    loading,
    people,
    forPerson,
    saveProfile,
    saveEntry,
    deleteEntry,
    saveMedication,
    stopMedication,
    deleteMedication,
  }
}
