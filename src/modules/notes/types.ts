import type { Syncable } from '@/domain/types'

/** A folder in the notes tree. Folders live only in notes.json, never on Drive. */
export interface NoteFolder extends Syncable {
  name: string
  /** Parent folder id, empty at the top level */
  parentId: string
}

/** A note's place in the tree. Its Markdown lives in notes/<id>.md on Drive. */
export interface Note extends Syncable {
  title: string
  /** Folder id, empty at the top level */
  folderId: string
}

export type NotesData = {
  folders: NoteFolder[]
  notes: Note[]
}

export const UNTITLED = 'Sem título'

const byName = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })

/** Folder names from the top down to `folderId`, e.g. ["Casa", "Reformas"]. */
export function folderPath(folders: NoteFolder[], folderId: string): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path: string[] = []
  // The guard stops a cycle (two devices moving folders into each other) from looping forever.
  for (let id = folderId; id && path.length < 50; ) {
    const folder = byId.get(id)
    if (!folder) break
    path.unshift(folder.name)
    id = folder.parentId
  }
  return path
}

export interface FolderNode {
  folder: NoteFolder
  folders: FolderNode[]
  notes: Note[]
}

/**
 * The tree under the top level, sorted by name. A note or folder whose parent is gone
 * (deleted on another device) shows at the top level instead of disappearing.
 */
export function buildTree(folders: NoteFolder[], notes: Note[]): { folders: FolderNode[]; notes: Note[] } {
  const ids = new Set(folders.map((f) => f.id))
  const parentOf = (id: string) => (ids.has(id) ? id : '')
  const nodes = new Map(folders.map((folder) => [folder.id, { folder, folders: [], notes: [] } as FolderNode]))
  const top: { folders: FolderNode[]; notes: Note[] } = { folders: [], notes: [] }

  for (const node of nodes.values()) {
    const parent = parentOf(node.folder.parentId)
    // A folder moved into its own subtree would vanish with its parent; keep it on top.
    const container = parent && !isInside(folders, parent, node.folder.id) ? nodes.get(parent)! : top
    container.folders.push(node)
  }
  for (const note of notes) {
    const parent = parentOf(note.folderId)
    ;(parent ? nodes.get(parent)! : top).notes.push(note)
  }

  const sort = (level: { folders: FolderNode[]; notes: Note[] }) => {
    level.folders.sort((a, b) => byName(a.folder.name, b.folder.name))
    level.notes.sort((a, b) => byName(a.title || UNTITLED, b.title || UNTITLED))
    level.folders.forEach(sort)
  }
  sort(top)
  return top
}

/** True when `folderId` is `ancestorId` or somewhere below it. */
export function isInside(folders: NoteFolder[], folderId: string, ancestorId: string): boolean {
  const byId = new Map(folders.map((f) => [f.id, f]))
  for (let id = folderId, steps = 0; id && steps < 50; steps++) {
    if (id === ancestorId) return true
    id = byId.get(id)?.parentId ?? ''
  }
  return false
}

/** Every folder as "Casa / Reformas", for pickers. */
export function folderOptions(folders: NoteFolder[]): { id: string; label: string }[] {
  return folders
    .map((f) => ({ id: f.id, label: folderPath(folders, f.id).join(' / ') }))
    .sort((a, b) => byName(a.label, b.label))
}
