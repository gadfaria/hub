import type { Attachment, Syncable } from '@/domain/types'
import { daysUntil } from '@/lib/format'

export const ENTRY_KINDS = {
  appointment: 'Consulta',
  exam: 'Exame',
  vaccine: 'Vacina',
  procedure: 'Procedimento',
  other: 'Outro',
} as const

export type EntryKind = keyof typeof ENTRY_KINDS

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

/** One per person: the facts you need at hand in an emergency. */
export interface HealthProfile extends Syncable {
  person: string
  /** YYYY-MM-DD or empty */
  birthDate: string
  /** One of BLOOD_TYPES or empty */
  bloodType: string
  allergies: string
  conditions: string
  insurance: string
  insuranceNumber: string
  emergencyContact: string
  notes: string
}

/** Something that happened: an appointment, an exam, a vaccine… */
export interface HealthEntry extends Syncable {
  person: string
  kind: EntryKind
  /** YYYY-MM-DD */
  date: string
  title: string
  /** Doctor, clinic or lab */
  provider: string
  specialty: string
  notes: string
  /** In cents, 0 when unknown or covered */
  cost: number
  /** Follow-up or next dose, YYYY-MM-DD or empty */
  nextDate: string
  attachments: Attachment[]
}

export interface Medication extends Syncable {
  person: string
  name: string
  dosage: string
  frequency: string
  /** YYYY-MM-DD or empty */
  startDate: string
  /** YYYY-MM-DD or empty while still in use */
  endDate: string
  notes: string
}

export type HealthData = {
  profiles: HealthProfile[]
  entries: HealthEntry[]
  medications: Medication[]
}

export function isOngoing(medication: Pick<Medication, 'endDate'>): boolean {
  return !medication.endDate || daysUntil(medication.endDate) >= 0
}
