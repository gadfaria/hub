import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import type { ExpiryStatus } from '@/lib/expiry'

function relative(days: number): string {
  if (days === 0) return 'hoje'
  const abs = Math.abs(days)
  const amount = abs >= 60 ? `${Math.round(abs / 30)} meses` : `${abs} ${abs === 1 ? 'dia' : 'dias'}`
  return days > 0 ? `em ${amount}` : `há ${amount}`
}

/** Expired → red, expiring soon → solid, valid → outline, no expiry → muted text. */
export function ExpiryBadge({ status, expiryDate }: { status: ExpiryStatus; expiryDate: string }) {
  switch (status.kind) {
    case 'none':
      return <span className="text-muted-foreground">Sem validade</span>
    case 'expired':
      return <Badge variant="destructive">Venceu {relative(status.days)}</Badge>
    case 'soon':
      return <Badge>Vence {relative(status.days)}</Badge>
    case 'valid':
      return (
        <Badge variant="outline" className="text-muted-foreground tabular-nums">
          Até {formatDate(expiryDate)}
        </Badge>
      )
  }
}
