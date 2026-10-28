import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/auth/context'
import { newSyncable, touch } from '@/domain/merge'
import { useOnline } from '@/hooks/use-online'
import { deleteOffline, getOffline, persistOffline, setOffline } from '@/lib/offline-store'
import { useVaultContext } from '@/storage/context'
import { NoteConflictError, type NoteFile } from '@/storage/vault'
import { buildTree, isInside, type Note, type NoteFolder, type NotesData } from './types'

const EMPTY: NotesData = { folders: [], notes: [] }

/** Offline copy of notes.json, tagged with the account so another sign-in never sees it. */
const INDEX_KEY = 'notes:index'
const noteKey = (noteId: string) => `notes:note:${noteId}`

interface CachedIndex {
  owner: string
  data: NotesData
}

/** A note's Markdown and the Drive version it came from (empty for a note never saved). */
export interface NoteContent {
  markdown: string
  modifiedTime: string
}

export type SaveResult = { ok: true; modifiedTime: string } | { ok: false; conflict: boolean }

/** fetch() rejects with a TypeError when there is no connection at all. */
const isNetworkError = (err: unknown) => err instanceof TypeError

/**
 * The notes tree (notes.json) and each note's Markdown file. Everything read from Drive
 * is also kept on the device, so the tree and the notes can be read offline; changes
 * need a connection. With `sync`, every note changed on Drive is downloaded in the
 * background, so notes never opened on this device are readable offline too.
 */
export function useNotes({ sync = false }: { sync?: boolean } = {}) {
  const { vault, reportError } = useVaultContext()
  const owner = useAuth().session?.email ?? ''
  const online = useOnline()
  const [data, setData] = useState<NotesData | null>(null)
  const [fromDrive, setFromDrive] = useState(false)
  const [settled, setSettled] = useState(false)
  const files = useRef<Promise<Map<string, NoteFile>> | null>(null)

  const keepIndex = useCallback(
    (index: NotesData) => {
      setData(index)
      void setOffline(INDEX_KEY, { owner, data: index } satisfies CachedIndex)
    },
    [owner],
  )

  useEffect(() => {
    let cancelled = false
    const cached = getOffline<CachedIndex>(INDEX_KEY).then((entry) => {
      if (!cancelled && entry?.owner === owner) setData((current) => current ?? entry.data)
    })
    if (!online) {
      cached.then(() => !cancelled && setSettled(true))
      return () => {
        cancelled = true
      }
    }
    vault
      .open()
      .then(() => vault.load('notes', EMPTY))
      .then(
        (loaded) => {
          if (cancelled) return
          keepIndex(loaded)
          setFromDrive(true)
        },
        (err) => {
          if (!cancelled && !isNetworkError(err)) reportError(err)
        },
      )
      .finally(() => !cancelled && setSettled(true))
    return () => {
      cancelled = true
    }
  }, [vault, owner, online, keepIndex, reportError])

  /** Note files on Drive, listed once per screen (one request covers every note). */
  const noteFiles = useCallback(() => {
    if (!files.current) {
      const listing = vault.listNoteFiles().then((list) => new Map(list.map((f) => [f.noteId, f])))
      listing.catch(() => (files.current = null))
      files.current = listing
    }
    return files.current
  }, [vault])

  // Read by the background sync, which runs once per load from Drive rather than on every edit.
  const latest = useRef(data)
  useEffect(() => {
    latest.current = data
  }, [data])

  // Background download of every note whose Drive version differs from the device's copy.
  useEffect(() => {
    const notes = latest.current?.notes
    if (!sync || !fromDrive || !online || !notes) return
    let cancelled = false
    persistOffline()
    ;(async () => {
      const map = await noteFiles()
      for (const note of notes) {
        if (cancelled) return
        if (note.deleted) {
          await deleteOffline(noteKey(note.id))
          continue
        }
        const file = map.get(note.id)
        if (!file) continue
        const cached = await getOffline<NoteContent>(noteKey(note.id))
        if (cached?.modifiedTime === file.modifiedTime) continue
        const markdown = await vault.readNote(file.fileId)
        await setOffline(noteKey(note.id), { markdown, modifiedTime: file.modifiedTime } satisfies NoteContent)
      }
    })().catch((err) => {
      if (!isNetworkError(err)) reportError(err)
    })
    return () => {
      cancelled = true
    }
  }, [sync, fromDrive, online, noteFiles, vault, reportError])

  /**
   * Drive's current version when online (taken from the device copy when it is the same one),
   * the device copy otherwise. Checking the version costs one small request per open, and
   * means a note edited on another device never opens stale.
   */
  const loadContent = useCallback(
    async (noteId: string): Promise<NoteContent | null> => {
      const cached = await getOffline<NoteContent>(noteKey(noteId))
      if (!navigator.onLine) return cached ?? null
      try {
        await noteFiles()
        const file = await vault.noteVersion(noteId)
        if (!file) return cached ?? { markdown: '', modifiedTime: '' }
        if (cached?.modifiedTime === file.modifiedTime) return cached
        const content = { markdown: await vault.readNote(file.fileId), modifiedTime: file.modifiedTime }
        await setOffline(noteKey(noteId), content)
        return content
      } catch (err) {
        if (!isNetworkError(err)) reportError(err)
        return cached ?? null
      }
    },
    [vault, noteFiles, reportError],
  )

  /**
   * Saves a note's Markdown. `expected` is the version the editor started from: when
   * Drive has another one, nothing is written and the result says it was a conflict.
   * Pass `undefined` to overwrite whatever is there.
   */
  const saveContent = useCallback(
    async (noteId: string, markdown: string, expected: string | undefined): Promise<SaveResult> => {
      try {
        await noteFiles()
        // A note that never had a file has nothing to conflict with.
        const file = await vault.writeNote(noteId, markdown, expected || undefined)
        ;(await noteFiles()).set(noteId, file)
        await setOffline(noteKey(noteId), { markdown, modifiedTime: file.modifiedTime } satisfies NoteContent)
        return { ok: true, modifiedTime: file.modifiedTime }
      } catch (err) {
        if (err instanceof NoteConflictError) return { ok: false, conflict: true }
        reportError(err)
        return { ok: false, conflict: false }
      }
    },
    [vault, noteFiles, reportError],
  )

  const saveIndex = useCallback(
    async (changes: Partial<NotesData>): Promise<boolean> => {
      try {
        keepIndex(await vault.save('notes', EMPTY, changes))
        return true
      } catch (err) {
        reportError(err)
        return false
      }
    },
    [vault, keepIndex, reportError],
  )

  const createNote = useCallback(
    async (folderId: string, title: string, markdown = ''): Promise<Note | null> => {
      const note: Note = { ...newSyncable(), title, folderId }
      // The file first: a note in the tree without one would only open empty, but the other way round leaves nothing visible.
      const saved = await saveContent(note.id, markdown, undefined)
      if (!saved.ok) return null
      return (await saveIndex({ notes: [note] })) ? note : null
    },
    [saveContent, saveIndex],
  )

  const updateNote = useCallback(
    (note: Note, changes: Partial<Pick<Note, 'title' | 'folderId'>>) => saveIndex({ notes: [touch(note, changes)] }),
    [saveIndex],
  )

  /** Removes notes from the tree and moves their files to the Drive trash. */
  const removeNotes = useCallback(
    async (notes: Note[], folders: NoteFolder[] = []): Promise<boolean> => {
      const ok = await saveIndex({
        notes: notes.map((n) => touch(n, { deleted: true })),
        folders: folders.map((f) => touch(f, { deleted: true })),
      })
      if (!ok) return false
      for (const note of notes) {
        await deleteOffline(noteKey(note.id))
        // Best effort: a file left in notes/ is harmless, the tree no longer shows it.
        await vault.trashNote(note.id).catch(reportError)
      }
      return true
    },
    [vault, saveIndex, reportError],
  )

  const deleteNote = useCallback((note: Note) => removeNotes([note]), [removeNotes])

  const createFolder = useCallback(
    async (name: string, parentId: string): Promise<NoteFolder | null> => {
      const folder: NoteFolder = { ...newSyncable(), name, parentId }
      return (await saveIndex({ folders: [folder] })) ? folder : null
    },
    [saveIndex],
  )

  const updateFolder = useCallback(
    (folder: NoteFolder, changes: Partial<Pick<NoteFolder, 'name' | 'parentId'>>) =>
      saveIndex({ folders: [touch(folder, changes)] }),
    [saveIndex],
  )

  const live = useMemo(
    () => ({
      folders: (data?.folders ?? []).filter((f) => !f.deleted),
      notes: (data?.notes ?? []).filter((n) => !n.deleted),
    }),
    [data],
  )

  /** Deletes a folder with every folder and note inside it. */
  const deleteFolder = useCallback(
    (folder: NoteFolder) => {
      const folders = live.folders.filter((f) => isInside(live.folders, f.id, folder.id))
      const ids = new Set(folders.map((f) => f.id))
      return removeNotes(
        live.notes.filter((n) => ids.has(n.folderId)),
        folders,
      )
    },
    [live, removeNotes],
  )

  const tree = useMemo(() => buildTree(live.folders, live.notes), [live])

  return {
    folders: live.folders,
    notes: live.notes,
    tree,
    loading: data === null && !settled,
    /** Changes need Drive: offline, or when Drive could not be reached, notes are read-only. */
    readOnly: !online || !fromDrive,
    loadContent,
    saveContent,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
  }
}
