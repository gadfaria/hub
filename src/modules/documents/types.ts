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

/** A free-form extra line in the personal data card, e.g. "Sócio torcedor: 12345". */
export interface ProfileExtra {
  label: string
  value: string
}

/**
 * Personal data that isn't a document of its own: what you look up to fill in forms.
 * One per person, matched to documents by `person` = document `owner`.
 */
export interface PersonalProfile extends Syncable {
  person: string
  fullName: string
  cpf: string
  /** YYYY-MM-DD or empty */
  birthDate: string
  birthPlace: string
  motherName: string
  fatherName: string
  maritalStatus: string
  nationality: string
  passport: string
  /** YYYY-MM-DD or empty */
  passportExpiry: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  extras: ProfileExtra[]
  notes: string
}

export type DocumentsData = {
  documents: PersonalDocument[]
  profiles: PersonalProfile[]
}

/** Address on one line, ready to paste into a form: "Rua X, 215 - Apto 33 - Centro, Itajubá/MG, CEP 37500-434". */
export function formatAddress(p: Pick<PersonalProfile, 'street' | 'number' | 'complement' | 'district' | 'city' | 'state' | 'zip'>): string {
  const street = [p.street, p.number].filter(Boolean).join(', ')
  const head = [street, p.complement, p.district].filter(Boolean).join(' - ')
  const place = [p.city, p.state].filter(Boolean).join('/')
  const zip = p.zip ? `CEP ${p.zip}` : ''
  return [head, place, zip].filter(Boolean).join(', ')
}

/** 12976683670 → 129.766.836-70; anything that isn't 11 digits is kept as typed. */
export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : value.trim()
}

/** 37500434 → 37500-434 */
export function formatZip(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value.trim()
}

/** How far ahead an expiry date counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 90

export function expiryStatus(document: Pick<PersonalDocument, 'expiryDate'>): ExpiryStatus {
  return getExpiryStatus(document.expiryDate, EXPIRING_SOON_DAYS)
}

export function documentLabel(document: Pick<PersonalDocument, 'title' | 'type'>): string {
  return document.title.trim() || DOCUMENT_TYPES[document.type]
}
