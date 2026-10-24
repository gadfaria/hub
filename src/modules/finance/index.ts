import { LandmarkIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { FinanceScreen } from './FinanceScreen'

export const finance: VaultModule = {
  id: 'finance',
  name: 'Finanças',
  icon: LandmarkIcon,
  Screen: FinanceScreen,
}
