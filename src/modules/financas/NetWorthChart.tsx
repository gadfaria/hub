import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate, formatMoney, formatShortDate, monthsAgo } from './format'
import { valueAt, type SeriesPoint } from './useFinancas'

const RANGES = {
  '3m': { label: 'Últimos 3 meses', months: 3 },
  '6m': { label: 'Últimos 6 meses', months: 6 },
  '12m': { label: 'Últimos 12 meses', months: 12 },
  all: { label: 'Tudo', months: null },
} as const

type Range = keyof typeof RANGES

const chartConfig = {
  total: { label: 'Patrimônio', color: 'var(--primary)' },
} satisfies ChartConfig

export function NetWorthChart({ loading, series }: { loading: boolean; series: SeriesPoint[] }) {
  const [range, setRange] = useState<Range>('6m')

  const data = useMemo(() => {
    const { months } = RANGES[range]
    if (months === null) return series.map((p) => ({ ...p, value: p.total / 100 }))
    const startIso = monthsAgo(months)
    const inRange = series.filter((p) => p.date >= startIso)
    // Anchor the line at the left edge with the value carried over from before the range.
    const carried = valueAt(series, startIso)
    const points = carried !== undefined && inRange[0]?.date !== startIso ? [{ date: startIso, total: carried }, ...inRange] : inRange
    return points.map((p) => ({ ...p, value: p.total / 100 }))
  }, [series, range])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Evolução do patrimônio</CardTitle>
        <CardDescription>{RANGES[range].label}</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {Object.entries(RANGES).map(([value, { label }]) => (
              <ToggleGroupItem key={value} value={value}>
                {label.replace('Últimos ', '')}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Período"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Object.entries(RANGES).map(([value, { label }]) => (
                <SelectItem key={value} value={value} className="rounded-lg">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : data.length < 2 ? (
          <div className="flex h-[250px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Registre saldos em datas diferentes para ver a evolução aqui.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) => formatShortDate(value)}
              />
              <YAxis hide domain={['dataMin - (dataMax - dataMin) * 0.2', 'auto']} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const date = payload?.[0]?.payload?.date as string | undefined
                      return date ? formatDate(date, { day: '2-digit', month: 'long', year: 'numeric' }) : ''
                    }}
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">Patrimônio</span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatMoney(Math.round(Number(value) * 100))}
                        </span>
                      </div>
                    )}
                    indicator="dot"
                  />
                }
              />
              <Area dataKey="value" type="monotone" fill="url(#fillTotal)" stroke="var(--color-total)" />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
