import { CarIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { VehiclesScreen } from './VehiclesScreen'

export const vehicles: VaultModule = {
  id: 'vehicles',
  name: 'Veículos',
  icon: CarIcon,
  Screen: VehiclesScreen,
}
