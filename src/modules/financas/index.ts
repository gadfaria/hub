import { LandmarkIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { FinancasScreen } from './FinancasScreen'

export const financas: VaultModule = {
  id: 'financas',
  name: 'Finanças',
  icon: LandmarkIcon,
  Screen: FinancasScreen,
}
