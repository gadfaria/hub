import { BellIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { RemindersScreen } from './RemindersScreen'

export const reminders: VaultModule = {
  id: 'reminders',
  name: 'Lembretes',
  icon: BellIcon,
  Screen: RemindersScreen,
}
