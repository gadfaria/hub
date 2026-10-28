import { mergeById } from '@/domain/merge'
import { SCHEMA_VERSION, type Attachment, type CollectionData } from '@/domain/types'
import type { DriveClient, DriveFile } from './drive'

/**
 * Layout on Drive (every file is tagged with appProperties.vault = <role>):
 *
 *   db-vault/           role=root
 *     data/             role=data
 *       <key>.json      role=collection, collection=<key>
 *     attachments/      role=attachments
 *       <file>          role=attachment, module=<key>
 *     notes/            role=notes
 *       <id>.md         role=note, noteId=<id>
 *
 *   backup-db-vault/    role=backupRoot
 *     2026-10-24 14h30/ role=backup
 *       <key>.json      role=backupFile, collection=<key>
 *       <id>.md         role=backupNote, noteId=<id>
 *
 * Collections are fixed in code (see src/modules); each one is a single JSON file.
 * Notes keep their Markdown in their own files, so typing in one never rewrites the others.
 */
type Role = 'root' | 'data' | 'attachments' | 'collection' | 'notes' | 'note' | 'backupRoot' | 'backup' | 'backupNote'

const ROLES: Role[] = ['root', 'data', 'attachments', 'collection', 'notes']

function roleQuery(roles: Role[]): string {
  const clauses = roles.map((role) => `appProperties has { key='vault' and value='${role}' }`)
  return `(${clauses.join(' or ')})`
}

/** Where a note's Markdown lives on Drive, and the version last seen. */
export interface NoteFile {
  noteId: string
  fileId: string
  /** RFC 3339 */
  modifiedTime: string
}

/** The note changed on Drive (another device) since the version the save was based on. */
export class NoteConflictError extends Error {
  constructor() {
    super('A nota foi alterada em outro aparelho.')
    this.name = 'NoteConflictError'
  }
}

export interface BackupInfo {
  /** Drive folder id */
  id: string
  name: string
  /** RFC 3339 */
  createdTime: string
}

/** Collection keys are module ids: lowercase, no path characters. */
const COLLECTION_KEY = /^[a-z][a-z0-9-]*$/

/** "2026-10-24 14h30": sortable, readable, and unique enough for manual backups. */
function backupFolderName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}h${pad(date.getMinutes())}`
}

/** Keeps only the lists the code knows about, defaulting missing ones (new lists need no migration). */
function withDefaults<T extends CollectionData>(empty: T, stored: Partial<T>): T {
  const result = { ...empty }
  for (const key of Object.keys(empty) as (keyof T)[]) {
    if (Array.isArray(stored[key])) result[key] = stored[key] as T[keyof T]
  }
  return result
}

export class Vault {
  private readonly drive: DriveClient
  private rootId = ''
  private dataId = ''
  private attachmentsId = ''
  private notesId: Promise<string> | undefined
  private readonly noteFiles = new Map<string, NoteFile>()
  private opening: Promise<void> | undefined
  private readonly collectionFiles = new Map<string, Promise<string>>()
  private readonly writes = new Map<string, Promise<unknown>>()
  private backupRootId: Promise<string> | undefined

  constructor(drive: DriveClient) {
    this.drive = drive
  }

  /**
   * Finds the vault folders on Drive, creating whatever is missing.
   * Concurrent calls share one run, otherwise each would create its own folders.
   */
  open(): Promise<void> {
    this.opening ??= this.locateOrCreate().catch((err) => {
      this.opening = undefined
      throw err
    })
    return this.opening
  }

  private async locateOrCreate(): Promise<void> {
    const files = await this.drive.list(roleQuery(ROLES))
    // Results are ordered by createdTime, so the oldest file of each role wins if duplicates exist.
    const first = (role: Role): DriveFile | undefined => files.find((f) => f.appProperties?.vault === role)

    this.rootId = first('root')?.id ?? (await this.drive.createFolder('db-vault', undefined, { vault: 'root' })).id
    this.dataId = first('data')?.id ?? (await this.drive.createFolder('data', this.rootId, { vault: 'data' })).id
    this.attachmentsId =
      first('attachments')?.id ?? (await this.drive.createFolder('attachments', this.rootId, { vault: 'attachments' })).id

    const notes = first('notes')
    if (notes) this.notesId = Promise.resolve(notes.id)

    for (const file of files) {
      const key = file.appProperties?.collection
      if (file.appProperties?.vault === 'collection' && key && !this.collectionFiles.has(key)) {
        this.collectionFiles.set(key, Promise.resolve(file.id))
      }
    }
  }

  /** Uploads a file into attachments/, tagged with the module that owns it. */
  async uploadAttachment(file: File, module: string): Promise<Attachment> {
    await this.open()
    const uploaded = await this.drive.uploadFile(file, this.attachmentsId, { vault: 'attachment', module })
    return {
      id: uploaded.id,
      name: uploaded.name,
      mimeType: uploaded.mimeType,
      size: Number(uploaded.size ?? file.size),
    }
  }

  downloadAttachment(fileId: string): Promise<Blob> {
    return this.drive.downloadBlob(fileId)
  }

  trashAttachment(fileId: string): Promise<void> {
    return this.drive.trash(fileId)
  }

  /** Every note file with its current version, from a single listing. */
  async listNoteFiles(): Promise<NoteFile[]> {
    await this.open()
    const files = await this.drive.list(roleQuery(['note']))
    for (const file of files) {
      const noteId = file.appProperties?.noteId
      // Oldest first, so a duplicate created by a race never replaces the original.
      if (noteId && !this.noteFiles.has(noteId)) {
        this.noteFiles.set(noteId, { noteId, fileId: file.id, modifiedTime: file.modifiedTime ?? '' })
      }
    }
    return [...this.noteFiles.values()]
  }

  readNote(fileId: string): Promise<string> {
    return this.drive.readText(fileId)
  }

  /** A note's file with its current version on Drive (one small request), or null if it has none. */
  async noteVersion(noteId: string): Promise<NoteFile | null> {
    const known = this.noteFiles.get(noteId)
    if (!known) return null
    const file = { ...known, modifiedTime: await this.drive.modifiedTime(known.fileId) }
    this.noteFiles.set(noteId, file)
    return file
  }

  /**
   * Writes a note's Markdown, creating its file the first time. With `expected`, the
   * save is refused (NoteConflictError) when Drive has a newer version than that one.
   * Writes to the same note run one at a time, so a quick second save never creates
   * a second file or skips the check.
   */
  writeNote(noteId: string, text: string, expected?: string): Promise<NoteFile> {
    const key = `note:${noteId}`
    const previous = this.writes.get(key) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(() => this.writeNoteNow(noteId, text, expected))
    this.writes.set(key, next)
    return next
  }

  private async writeNoteNow(noteId: string, text: string, expected?: string): Promise<NoteFile> {
    await this.open()
    const known = this.noteFiles.get(noteId)
    let file: NoteFile
    if (known) {
      if (expected !== undefined && (await this.drive.modifiedTime(known.fileId)) !== expected) {
        throw new NoteConflictError()
      }
      file = { ...known, modifiedTime: await this.drive.updateMarkdown(known.fileId, text) }
    } else {
      const created = await this.drive.createMarkdown(`${noteId}.md`, await this.notesFolder(), text, {
        vault: 'note',
        noteId,
      })
      file = { noteId, fileId: created.id, modifiedTime: created.modifiedTime ?? '' }
    }
    this.noteFiles.set(noteId, file)
    return file
  }

  /** Moves a deleted note's file to the Drive trash (recoverable for 30 days). */
  async trashNote(noteId: string): Promise<void> {
    const known = this.noteFiles.get(noteId)
    if (!known) return
    await this.drive.trash(known.fileId)
    this.noteFiles.delete(noteId)
  }

  private notesFolder(): Promise<string> {
    this.notesId ??= this.drive
      .createFolder('notes', this.rootId, { vault: 'notes' })
      .then((folder) => folder.id)
      .catch((err) => {
        this.notesId = undefined
        throw err
      })
    return this.notesId
  }

  /** Backups are folders inside backup-db-vault/ (at the Drive root), newest first. */
  async listBackups(): Promise<BackupInfo[]> {
    const folders = await this.drive.list(roleQuery(['backup']), 'createdTime desc')
    return folders.map((f) => ({ id: f.id, name: f.name, createdTime: f.createdTime ?? '' }))
  }

  /**
   * Copies every collection file and note into a new dated folder. Copies run on Drive's
   * side, so nothing is downloaded. Attachments are not copied: the app never overwrites them.
   */
  async backup(): Promise<BackupInfo & { files: number }> {
    await this.open()
    // Let saves already in flight land first, so the backup includes them.
    await Promise.allSettled(this.writes.values())
    const name = backupFolderName(new Date())
    const folder = await this.drive.createFolder(name, await this.backupRoot(), { vault: 'backup' })
    const keys = [...this.collectionFiles.keys()].sort()
    for (const key of keys) {
      const fileId = await this.collectionFiles.get(key)!
      await this.drive.copy(fileId, `${key}.json`, folder.id, { vault: 'backupFile', collection: key })
    }
    const notes = await this.listNoteFiles()
    for (const note of notes) {
      await this.drive.copy(note.fileId, `${note.noteId}.md`, folder.id, { vault: 'backupNote', noteId: note.noteId })
    }
    return { id: folder.id, name, createdTime: new Date().toISOString(), files: keys.length + notes.length }
  }

  /** Every collection's content, keyed by collection, for a local download. */
  async exportAll(): Promise<Record<string, unknown>> {
    await this.open()
    await Promise.allSettled(this.writes.values())
    const result: Record<string, unknown> = {}
    for (const key of [...this.collectionFiles.keys()].sort()) {
      result[key] = await this.drive.readJson(await this.collectionFiles.get(key)!)
    }
    return result
  }

  /** Every note's Markdown, keyed by note id, for a local download. */
  async exportNotes(): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    for (const note of await this.listNoteFiles()) result[note.noteId] = await this.drive.readText(note.fileId)
    return result
  }

  /** Reads every note inside a backup folder, keyed by note id. */
  async readBackupNotes(folderId: string): Promise<Record<string, string>> {
    const files = await this.drive.list(
      `'${folderId}' in parents and appProperties has { key='vault' and value='backupNote' }`,
    )
    const result: Record<string, string> = {}
    for (const file of files) {
      const noteId = file.appProperties?.noteId
      if (noteId) result[noteId] = await this.drive.readText(file.id)
    }
    return result
  }

  /** Overwrites (or recreates) each given note's file. Notes not in `notes` are left untouched. */
  async restoreNotes(notes: Record<string, string>): Promise<void> {
    await this.listNoteFiles()
    for (const [noteId, text] of Object.entries(notes)) {
      if (typeof text !== 'string') throw new Error(`O backup tem uma nota inválida: ${noteId}`)
      await this.writeNote(noteId, text)
    }
  }

  /** Reads every collection file inside a backup folder, keyed by collection. */
  async readBackup(folderId: string): Promise<Record<string, unknown>> {
    const files = await this.drive.list(
      `'${folderId}' in parents and appProperties has { key='vault' and value='backupFile' }`,
    )
    const result: Record<string, unknown> = {}
    for (const file of files) {
      const key = file.appProperties?.collection
      if (key) result[key] = await this.drive.readJson(file.id)
    }
    return result
  }

  /**
   * Replaces each given collection's file with the given content. A restore must
   * overwrite rather than merge: merging keeps the newest `updatedAt`, so an older
   * backup would never win. Collections not in `collections` are left untouched.
   */
  async restore(collections: Record<string, unknown>): Promise<string[]> {
    await this.open()
    const keys = Object.keys(collections).sort()
    for (const key of keys) {
      const content = collections[key]
      if (!COLLECTION_KEY.test(key) || typeof content !== 'object' || content === null || Array.isArray(content)) {
        throw new Error(`O backup tem um módulo inválido: ${key}`)
      }
    }
    await Promise.all(
      keys.map((key) => {
        // Queue behind any save in flight for the same collection.
        const previous = this.writes.get(key) ?? Promise.resolve()
        const next = previous.catch(() => undefined).then(() => this.overwrite(key, collections[key] as object))
        this.writes.set(key, next)
        return next
      }),
    )
    return keys
  }

  private async overwrite(key: string, content: object): Promise<void> {
    const known = this.collectionFiles.get(key)
    if (known) {
      await this.drive.updateJson(await known, content)
      return
    }
    const created = this.drive
      .createJson(`${key}.json`, this.dataId, content, { vault: 'collection', collection: key })
      .then((file) => file.id)
    created.catch(() => this.collectionFiles.delete(key))
    this.collectionFiles.set(key, created)
    await created
  }

  private backupRoot(): Promise<string> {
    this.backupRootId ??= (async () => {
      const [existing] = await this.drive.list(roleQuery(['backupRoot']))
      return existing?.id ?? (await this.drive.createFolder('backup-db-vault', undefined, { vault: 'backupRoot' })).id
    })().catch((err) => {
      this.backupRootId = undefined
      throw err
    })
    return this.backupRootId
  }

  async load<T extends CollectionData>(key: string, empty: T): Promise<T> {
    const fileId = await this.collectionFileId(key, empty)
    return withDefaults(empty, await this.drive.readJson<Partial<T>>(fileId))
  }

  /**
   * Read-merge-write: Drive has no locking, so changes are always merged onto the
   * latest remote copy. Writes to the same collection run one at a time, otherwise
   * two quick saves would each merge onto the same stale copy and one would be lost.
   */
  save<T extends CollectionData>(key: string, empty: T, changes: Partial<T>): Promise<T> {
    const previous = this.writes.get(key) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(() => this.mergeAndWrite(key, empty, changes))
    this.writes.set(key, next)
    return next
  }

  private async mergeAndWrite<T extends CollectionData>(key: string, empty: T, changes: Partial<T>): Promise<T> {
    const fileId = await this.collectionFileId(key, empty)
    const merged = withDefaults(empty, await this.drive.readJson<Partial<T>>(fileId))
    for (const name of Object.keys(changes) as (keyof T)[]) {
      merged[name] = mergeById(merged[name], changes[name] ?? []) as T[keyof T]
    }
    await this.drive.updateJson(fileId, { schemaVersion: SCHEMA_VERSION, ...merged })
    return merged
  }

  private collectionFileId(key: string, empty: CollectionData): Promise<string> {
    let fileId = this.collectionFiles.get(key)
    if (!fileId) {
      fileId = this.drive
        .createJson(`${key}.json`, this.dataId, { schemaVersion: SCHEMA_VERSION, ...empty }, {
          vault: 'collection',
          collection: key,
        })
        .then((file) => file.id)
      fileId.catch(() => this.collectionFiles.delete(key))
      this.collectionFiles.set(key, fileId)
    }
    return fileId
  }
}
