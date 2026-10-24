import type { Attachment, Syncable } from '@/domain/types'
import { getExpiryStatus, type ExpiryStatus } from '@/lib/expiry'

export const DOCUMENT_TYPES = {
  id: 'RG',
  cpf: 'CPF',
  driverLicense: 'CNH',
  passport: 'Passaporte',
  voterId: 'Título de eleitor',
  birthCertificate: 'Certidão de nascimento',
  marriageCertificate: 'Certidão de casamento',
  insurance: 'Seguro',
  other: 'Outro',
} as const

export type DocumentType = keyof typeof DOCUMENT_TYPES

export interface PersonalDocument extends Syncable {
  type: DocumentType
  /** Optional label, e.g. "Seguro do carro". Falls back to the type label. */
  title: string
  /** Whose document it is, e.g. "Gabriel" */
  owner: string
  number: string
  issuer: string
  /** YYYY-MM-DD or empty */
  issueDate: string
  /** YYYY-MM-DD or empty when it never expires */
  expiryDate: string
  notes: string
  attachments: Attachment[]
}

export type DocumentsData = {
  documents: PersonalDocument[]
}

/** How far ahead an expiry date counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 90

export function expiryStatus(document: Pick<PersonalDocument, 'expiryDate'>): ExpiryStatus {
  return getExpiryStatus(document.expiryDate, EXPIRING_SOON_DAYS)
}

export function documentLabel(document: Pick<PersonalDocument, 'title' | 'type'>): string {
  return document.title.trim() || DOCUMENT_TYPES[document.type]
}
