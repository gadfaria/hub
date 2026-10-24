import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { bills } from './bills'
import { documents } from './documents'
import { finance } from './finance'
import { health } from './health'
import { subscriptions } from './subscriptions'
import { vehicles } from './vehicles'

export interface ModuleScreenProps {
  /** Route segments after the module id: #/vehicles/abc → ['abc'] */
  path: string[]
}

export interface VaultModule {
  /** URL slug (#/<id>) and collection file name (data/<id>.json). */
  id: string
  name: string
  icon: LucideIcon
  Screen: ComponentType<ModuleScreenProps>
}

/** Every area of the vault, in sidebar order. To add one, create src/modules/<id>/ and register it here. */
export const MODULES: VaultModule[] = [finance, bills, subscriptions, vehicles, documents, health]
