import { useCallback, useMemo } from 'react'
import { newSyncable, touch } from '@/domain/merge'
import type { Syncable } from '@/domain/types'
import { today } from '@/lib/format'
import { useCollection } from '@/storage/useCollection'
import { around, type Reminder, type ReminderOccurrence, type RemindersData, type ReminderStatus } from './types'

const EMPTY: RemindersData = { reminders: [], occurrences: [] }

export type ReminderInput = Omit<Reminder, keyof Syncable | 'endedAt'>

/** An active reminder and the occurrence it is waiting on. */
export interface ReminderRow {
  reminder: Reminder
  /** The scheduled date of that occurrence */
  date: string
  /** When it is due: the scheduled date, or the day it was moved to */
  due: string
  occurrence: ReminderOccurrence | undefined
  status: ReminderStatus
}

/** A reminder that is over: ended, or a one-time one already done. */
export interface FinishedRow {
  reminder: Reminder
  /** The day it ended or was last done */
  finishedOn: string
  /** The completion to undo, for a one-time reminder that was done */
  occurrence: ReminderOccurrence | undefined
}

export function useReminders() {
  const { data, loading, save } = useCollection('reminders', EMPTY)

  const derived = useMemo(() => {
    const now = today()
    const occurrences = (data?.occurrences ?? []).filter((o) => !o.deleted)
    const recordFor = (reminderId: string, date: string) =>
      occurrences
        .filter((o) => o.reminderId === reminderId && o.date === date)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

    const active: ReminderRow[] = []
    const finished: FinishedRow[] = []
    for (const reminder of (data?.reminders ?? []).filter((r) => !r.deleted)) {
      if (reminder.endedAt) {
        finished.push({ reminder, finishedOn: reminder.endedAt, occurrence: undefined })
        continue
      }
      // The latest occurrence up to today while it is pending, otherwise the next one.
      // Older missed ones don't pile up: a daily reminder only ever asks for one day.
      const { last, next } = around(reminder, now)
      const lastRecord = last ? recordFor(reminder.id, last) : undefined
      const date = last && !lastRecord?.doneAt ? last : next
      if (!date) {
        const lastDone = occurrences
          .filter((o) => o.reminderId === reminder.id && o.doneAt)
          .sort((a, b) => b.doneAt.localeCompare(a.doneAt))[0]
        finished.push({ reminder, finishedOn: lastDone?.doneAt ?? reminder.startDate, occurrence: lastDone })
        continue
      }
      const occurrence = date === last ? lastRecord : recordFor(reminder.id, date)
      const due = occurrence?.snoozedTo || date
      active.push({
        reminder,
        date,
        due,
        occurrence,
        status: due < now ? 'overdue' : due === now ? 'today' : 'upcoming',
      })
    }

    return {
      active: active.sort((a, b) => a.due.localeCompare(b.due) || a.reminder.title.localeCompare(b.reminder.title)),
      finished: finished.sort((a, b) => b.finishedOn.localeCompare(a.finishedOn)),
      all: (data?.reminders ?? []).filter((r) => !r.deleted),
    }
  }, [data])

  const saveReminder = useCallback(
    (input: ReminderInput, existing?: Reminder) =>
      save({ reminders: [existing ? touch(existing, input) : { ...newSyncable(), ...input, endedAt: '' }] }),
    [save],
  )

  /** Updates the row's occurrence record, creating it on first use. Resolves to the saved record, or null. */
  const saveOccurrence = useCallback(
    async (row: ReminderRow, changes: Pick<ReminderOccurrence, 'doneAt' | 'snoozedTo'>) => {
      const record = row.occurrence
        ? touch(row.occurrence, changes)
        : { ...newSyncable(), reminderId: row.reminder.id, date: row.date, ...changes }
      return (await save({ occurrences: [record] })) ? record : null
    },
    [save],
  )

  const complete = useCallback(
    (row: ReminderRow) => saveOccurrence(row, { doneAt: today(), snoozedTo: row.occurrence?.snoozedTo ?? '' }),
    [saveOccurrence],
  )

  const snooze = useCallback(
    (row: ReminderRow, to: string) => saveOccurrence(row, { doneAt: '', snoozedTo: to }),
    [saveOccurrence],
  )

  const undoOccurrence = useCallback(
    (occurrence: ReminderOccurrence) => save({ occurrences: [touch(occurrence, { doneAt: '' })] }),
    [save],
  )

  const endReminder = useCallback(
    (reminder: Reminder) => save({ reminders: [touch(reminder, { endedAt: today() })] }),
    [save],
  )

  const reactivateReminder = useCallback(
    (reminder: Reminder) => save({ reminders: [touch(reminder, { endedAt: '' })] }),
    [save],
  )

  const deleteReminder = useCallback(
    (reminder: Reminder) =>
      save({
        reminders: [touch(reminder, { deleted: true })],
        occurrences: (data?.occurrences ?? [])
          .filter((o) => o.reminderId === reminder.id && !o.deleted)
          .map((o) => touch(o, { deleted: true })),
      }),
    [save, data],
  )

  return {
    loading,
    ...derived,
    saveReminder,
    complete,
    snooze,
    undoOccurrence,
    endReminder,
    reactivateReminder,
    deleteReminder,
  }
}
