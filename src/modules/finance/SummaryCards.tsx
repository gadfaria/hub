import type { ReactNode } from 'react'
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatMoney, formatPercent, formatSignedMoney, daysAgo, endOfPreviousMonth } from '@/lib/format'
import { valueAt, type InstitutionGroup, type SeriesPoint } from './useFinance'

interface SummaryCardsProps {
  loading: boolean
  total: number
  lastUpdate: string | undefined
  series: SeriesPoint[]
  groups: InstitutionGroup[]
}

function TrendIcon({ delta, className }: { delta: number; className?: string }) {
  if (delta > 0) return <TrendingUpIcon className={className} />
  if (delta < 0) return <TrendingDownIcon className={className} />
  return <MinusIcon className={className} />
}

export function SummaryCards({ loading, total, lastUpdate, series, groups }: SummaryCardsProps) {
  const base30 = valueAt(series, daysAgo(30))
  const delta30 = base30 === undefined ? 0 : total - base30

  // Month-to-date: compared with the last day of the previous month.
  const endOfLastMonth = endOfPreviousMonth()
  const baseMonth = valueAt(series, endOfLastMonth)
  const deltaMonth = baseMonth === undefined ? 0 : total - baseMonth

  const top = groups[0]
  const accountCount = groups.reduce((n, g) => n + g.accounts.length, 0)
  const topShare = top && total > 0 ? Math.round((top.total / total) * 100) : null

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <SummaryCard
        loading={loading}
        label="Patrimônio total"
        value={formatMoney(total)}
        badge={
          formatPercent(total, base30) && (
            <>
              <TrendIcon delta={delta30} />
              {formatPercent(total, base30)}
            </>
          )
        }
        headline={
          base30 === undefined ? (
            'Sem histórico de 30 dias'
          ) : (
            <>
              {formatSignedMoney(delta30)} em 30 dias <TrendIcon delta={delta30} className="size-4" />
            </>
          )
        }
        detail={lastUpdate ? `Atualizado em ${formatDate(lastUpdate)}` : 'Nenhum saldo registrado'}
      />
      <SummaryCard
        loading={loading}
        label="Variação no mês"
        value={baseMonth === undefined ? '—' : formatSignedMoney(deltaMonth)}
        badge={
          formatPercent(total, baseMonth) && (
            <>
              <TrendIcon delta={deltaMonth} />
              {formatPercent(total, baseMonth)}
            </>
          )
        }
        headline={
          baseMonth === undefined
            ? 'Sem saldo no fim do mês passado'
            : deltaMonth >= 0
              ? 'Crescendo este mês'
              : 'Caindo este mês'
        }
        detail={`Desde ${formatDate(endOfLastMonth)}`}
      />
      <SummaryCard
        loading={loading}
        label="Maior instituição"
        value={top?.institution ?? '—'}
        badge={topShare !== null && `${topShare}% do total`}
        headline={top ? formatMoney(top.total) : 'Nenhuma conta ainda'}
        detail={top ? `${top.accounts.length} ${top.accounts.length === 1 ? 'conta' : 'contas'}` : ''}
      />
      <SummaryCard
        loading={loading}
        label="Contas"
        value={String(accountCount)}
        badge={groups.length > 0 && `${groups.length} ${groups.length === 1 ? 'instituição' : 'instituições'}`}
        headline={series.length > 0 ? `Desde ${formatDate(series[0].date, { month: 'long', year: 'numeric' })}` : 'Comece adicionando uma conta'}
        detail="Saldos guardados no seu Drive"
      />
    </div>
  )
}

interface SummaryCardProps {
  loading: boolean
  label: string
  value: string
  badge?: ReactNode
  headline: ReactNode
  detail: string
}

function SummaryCard({ loading, label, value, badge, headline, detail }: SummaryCardProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="col-span-full truncate text-2xl font-semibold tabular-nums @[340px]/card:text-3xl">
          {loading ? <Skeleton className="h-9 w-40" /> : value}
        </CardTitle>
        {!loading && badge && (
          <CardAction className="row-span-1">
            <Badge variant="outline">{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <>
            <div className="line-clamp-1 flex items-center gap-2 font-medium">{headline}</div>
            <div className="text-muted-foreground">{detail}</div>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
