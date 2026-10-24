import { IdCardIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { DocumentsScreen } from './DocumentsScreen'

export const documents: VaultModule = {
  id: 'documents',
  name: 'Documentos',
  icon: IdCardIcon,
  Screen: DocumentsScreen,
}
