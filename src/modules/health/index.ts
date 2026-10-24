import { HeartPulseIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { HealthScreen } from './HealthScreen'

export const health: VaultModule = {
  id: 'health',
  name: 'Saúde',
  icon: HeartPulseIcon,
  Screen: HealthScreen,
}
