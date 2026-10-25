import { useCallback, useMemo } from 'react'
import { newSyncable, touch } from '@/domain/merge'
import type { Attachment, Syncable } from '@/domain/types'
import { useAttachments } from '@/storage/useAttachments'
import { useCollection } from '@/storage/useCollection'
import type { ExpiryStatus } from '@/lib/expiry'
import { DOCUMENT_TYPES, expiryStatus, type DocumentsData, type PersonalDocument, type PersonalProfile } from './types'

const EMPTY: DocumentsData = { documents: [], profiles: [] }

export type DocumentInput = Omit<PersonalDocument, keyof Syncable | 'attachments'>
export type ProfileInput = Omit<PersonalProfile, keyof Syncable | 'person'>

export interface DocumentRow {
  document: PersonalDocument
  status: ExpiryStatus
}

export function useDocuments() {
  const { data, loading, save } = useCollection('documents', EMPTY)
  const attachments = useAttachments('documents')

  const derived = useMemo(() => {
    const rows: DocumentRow[] = (data?.documents ?? [])
      .filter((d) => !d.deleted)
      .map((document) => ({ document, status: expiryStatus(document) }))
      .sort(
        (a, b) =>
          a.document.owner.localeCompare(b.document.owner) ||
          DOCUMENT_TYPES[a.document.type].localeCompare(DOCUMENT_TYPES[b.document.type]),
      )
    // Fields added after a profile was saved come back missing: default them to empty.
    const profiles = (data?.profiles ?? []).filter((p) => !p.deleted).map((p) => ({ ...p, passport: p.passport ?? '', passportExpiry: p.passportExpiry ?? '' }))
    const owners = [
      ...new Set([...rows.map((r) => r.document.owner), ...profiles.map((p) => p.person)].map((o) => o.trim()).filter(Boolean)),
    ].sort()
    return { rows, owners, profiles }
  }, [data])

  const createDocument = useCallback(
    async (input: DocumentInput, files: File[]) => {
      const uploaded = files.length ? await attachments.upload(files) : []
      if (uploaded === null) return false
      return save({ documents: [{ ...newSyncable(), ...input, attachments: uploaded }] })
    },
    [save, attachments],
  )

  const updateDocument = useCallback(
    (document: PersonalDocument, input: DocumentInput) => save({ documents: [touch(document, input)] }),
    [save],
  )

  const addAttachments = useCallback(
    async (document: PersonalDocument, files: File[]) => {
      const uploaded = await attachments.upload(files)
      if (!uploaded) return false
      return save({ documents: [touch(document, { attachments: [...document.attachments, ...uploaded] })] })
    },
    [save, attachments],
  )

  const removeAttachment = useCallback(
    async (document: PersonalDocument, attachment: Attachment) => {
      const ok = await save({
        documents: [touch(document, { attachments: document.attachments.filter((a) => a.id !== attachment.id) })],
      })
      if (ok) await attachments.trash([attachment])
      return ok
    },
    [save, attachments],
  )

  const deleteDocument = useCallback(
    async (document: PersonalDocument) => {
      const ok = await save({ documents: [touch(document, { deleted: true })] })
      if (ok) await attachments.trash(document.attachments)
      return ok
    },
    [save, attachments],
  )

  const profileFor = useCallback(
    (person: string) => derived.profiles.find((p) => p.person.trim() === person),
    [derived.profiles],
  )

  const saveProfile = useCallback(
    (person: string, input: ProfileInput, existing?: PersonalProfile) =>
      save({ profiles: [existing ? touch(existing, input) : { ...newSyncable(), person, ...input }] }),
    [save],
  )

  return { loading, ...derived, profileFor, saveProfile, createDocument, updateDocument, addAttachments, removeAttachment, deleteDocument }
}
