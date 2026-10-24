import { mergeById } from '@/domain/merge'
import { SCHEMA_VERSION, type CollectionData } from '@/domain/types'
import type { DriveClient, DriveFile } from './drive'

/**
 * Layout on Drive (every file is tagged with appProperties.vault = <role>):
 *
 *   Vault/              role=root
 *     data/             role=data
 *       <key>.json      role=collection, collection=<key>
 *     anexos/           role=attachments
 *
 * Collections are fixed in code (see src/modules); each one is a single JSON file.
 */
type Role = 'root' | 'data' | 'attachments' | 'collection'

const ROLES: Role[] = ['root', 'data', 'attachments', 'collection']

function roleQuery(roles: Role[]): string {
  const clauses = roles.map((role) => `appProperties has { key='vault' and value='${role}' }`)
  return `(${clauses.join(' or ')})`
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
  private opening: Promise<void> | undefined
  private readonly collectionFiles = new Map<string, Promise<string>>()
  private readonly writes = new Map<string, Promise<unknown>>()

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

    this.rootId = first('root')?.id ?? (await this.drive.createFolder('Vault', undefined, { vault: 'root' })).id
    this.dataId = first('data')?.id ?? (await this.drive.createFolder('data', this.rootId, { vault: 'data' })).id
    this.attachmentsId =
      first('attachments')?.id ?? (await this.drive.createFolder('anexos', this.rootId, { vault: 'attachments' })).id

    for (const file of files) {
      const key = file.appProperties?.collection
      if (file.appProperties?.vault === 'collection' && key && !this.collectionFiles.has(key)) {
        this.collectionFiles.set(key, Promise.resolve(file.id))
      }
    }
  }

  get attachmentsFolderId(): string {
    return this.attachmentsId
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
