import { ReceiptTextIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { BillsScreen } from './BillsScreen'

export const bills: VaultModule = {
  id: 'bills',
  name: 'Contas',
  icon: ReceiptTextIcon,
  Screen: BillsScreen,
}
