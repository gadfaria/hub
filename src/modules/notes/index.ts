import { NotebookPenIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { NotesScreen } from './NotesScreen'

export const notes: VaultModule = {
  id: 'notes',
  name: 'Notas',
  icon: NotebookPenIcon,
  Screen: NotesScreen,
}
