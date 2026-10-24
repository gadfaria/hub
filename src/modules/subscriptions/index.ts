import { RepeatIcon } from 'lucide-react'
import type { VaultModule } from '..'
import { SubscriptionsScreen } from './SubscriptionsScreen'

export const subscriptions: VaultModule = {
  id: 'subscriptions',
  name: 'Assinaturas',
  icon: RepeatIcon,
  Screen: SubscriptionsScreen,
}
