const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatMoney(cents: number): string {
  return brl.format(cents / 100)
}

/** Formats cents for an input field: 123456 → "1.234,56". */
export function formatMoneyInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Parses what a person types into cents. Accepts "1.234,56", "1234,56",
 * "R$ 1.234", "1234.56" and negatives (debts). Returns null when unreadable.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '')
  if (!/\d/.test(cleaned)) return null
  let normalized: string
  if (cleaned.includes(',')) normalized = cleaned.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d+\.\d{1,2}$/.test(cleaned)) normalized = cleaned
  else normalized = cleaned.replace(/\./g, '')
  const value = Number(normalized)
  return Number.isFinite(value) ? Math.round(value * 100) : null
}

/** YYYY-MM-DD → local Date (new Date('2026-10-24') would be UTC midnight, the previous day in Brazil). */
export function parseDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Today as YYYY-MM-DD in local time. */
export function today(): string {
  return toIsoDate(new Date())
}

export function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toIsoDate(date)
}

export function monthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return toIsoDate(date)
}

export function endOfPreviousMonth(): string {
  const now = new Date()
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 0))
}

export function formatDate(isoDate: string, options?: Intl.DateTimeFormatOptions): string {
  return parseDate(isoDate).toLocaleDateString('pt-BR', options)
}

/** "24 out" — compact day + month for chart axes. */
export function formatShortDate(isoDate: string): string {
  const date = parseDate(isoDate)
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${date.getDate()} ${month}`
}

/** "+12,5%" / "-3,0%"; null when there is nothing to compare against. */
export function formatPercent(current: number, base: number | undefined): string | null {
  if (base === undefined || base === 0) return null
  const pct = ((current - base) / Math.abs(base)) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

export function formatSignedMoney(cents: number): string {
  return `${cents > 0 ? '+' : ''}${formatMoney(cents)}`
}

const km = new Intl.NumberFormat('pt-BR')

/** 45230 → "45.230 km" */
export function formatKm(value: number): string {
  return `${km.format(value)} km`
}

/** Parses an odometer reading typed as "45.230" or "45230 km". Returns null when unreadable. */
export function parseKm(input: string): number | null {
  const digits = input.replace(/\D/g, '')
  return digits ? Number(digits) : null
}
