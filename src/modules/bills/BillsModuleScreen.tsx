import type { ModuleScreenProps } from '..'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SubscriptionsScreen } from '../subscriptions/SubscriptionsScreen'
import { BillsScreen } from './BillsScreen'

type Section = 'bills' | 'subscriptions'

const SECTIONS: Record<Section, { label: string; href: string }> = {
  bills: { label: 'Contas', href: '#/bills' },
  subscriptions: { label: 'Assinaturas', href: '#/bills/subscriptions' },
}

/** Bills and subscriptions share one sidebar entry; the data stays in separate files. */
export function BillsModuleScreen({ path }: ModuleScreenProps) {
  const section: Section = path[0] === 'subscriptions' ? 'subscriptions' : 'bills'
  const nav = (
    <div className="px-4 lg:px-6">
      <Tabs value={section} onValueChange={(value) => window.location.assign(SECTIONS[value as Section].href)}>
        <TabsList>
          {Object.entries(SECTIONS).map(([id, { label }]) => (
            <TabsTrigger key={id} value={id}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
  return section === 'subscriptions' ? <SubscriptionsScreen nav={nav} /> : <BillsScreen nav={nav} />
}
