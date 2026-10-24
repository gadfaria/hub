import { HouseIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { HomeScreen } from './HomeScreen'

/** Landing page: no collection of its own, it reads every other module's. */
export const home: VaultModule = {
  id: 'home',
  name: 'Início',
  icon: HouseIcon,
  Screen: HomeScreen,
}
