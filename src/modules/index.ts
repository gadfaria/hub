import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import { financas } from './financas'

export interface VaultModule {
  /** URL slug (#/<id>) and collection file name (data/<id>.json). */
  id: string
  name: string
  icon: LucideIcon
  Screen: ComponentType
}

/** Every area of the vault, in sidebar order. To add one, create src/modules/<id>/ and register it here. */
export const MODULES: VaultModule[] = [financas]
