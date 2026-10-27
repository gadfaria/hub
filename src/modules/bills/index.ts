import { ReceiptTextIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { BillsModuleScreen } from './BillsModuleScreen'

export const bills: VaultModule = {
  id: 'bills',
  name: 'Contas',
  icon: ReceiptTextIcon,
  Screen: BillsModuleScreen,
}
