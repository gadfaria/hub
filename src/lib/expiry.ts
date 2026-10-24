import { daysUntil } from './format'

export type ExpiryStatus =
  | { kind: 'none' }
  | { kind: 'expired'; days: number }
  | { kind: 'soon'; days: number }
  | { kind: 'valid'; days: number }

/** Classifies an expiry date (YYYY-MM-DD, or empty for "never expires"). */
export function getExpiryStatus(expiryDate: string, soonDays: number): ExpiryStatus {
  if (!expiryDate) return { kind: 'none' }
  const days = daysUntil(expiryDate)
  if (days < 0) return { kind: 'expired', days }
  if (days <= soonDays) return { kind: 'soon', days }
  return { kind: 'valid', days }
}
