import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatMonth, formatMoney } from '@/lib/format'
import { BILL_CATEGORIES, billFrequency, PAYMENT_METHODS, scheduleLabel, type Bill } from './types'
import type { HistoryPoint } from './useBills'

const chartConfig = {
  value: { label: 'Valor', color: 'var(--primary)' },
} satisfies ChartConfig

interface BillHistoryDialogProps {
  bill: Bill | null
  history: HistoryPoint[]
  onClose: () => void
  onEdit: (bill: Bill) => void
  onEnd: (bill: Bill) => void
}

export function BillHistoryDialog({ bill, history, onClose, onEdit, onEnd }: BillHistoryDialogProps) {
  const entered = history.filter((p) => p.amount !== null) as { month: string; amount: number }[]
  const average = entered.length ? Math.round(entered.reduce((s, p) => s + p.amount, 0) / entered.length) : 0
  const highest = entered.reduce<{ month: string; amount: number } | undefined>(
    (max, p) => (!max || p.amount > max.amount ? p : max),
    undefined,
  )
  const monthly = bill ? billFrequency(bill) === 'monthly' : true
  const data = history.map((p) => ({ month: p.month, value: p.amount === null ? null : p.amount / 100 }))

  return (
    <Dialog open={bill !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        {bill && (
          <div className="flex flex-col gap-6">
            <DialogHeader>
              <DialogDescription>
                {BILL_CATEGORIES[bill.category]} · {PAYMENT_METHODS[bill.paymentMethod]} · {scheduleLabel(bill)}
              </DialogDescription>
              <DialogTitle>{bill.name}</DialogTitle>
            </DialogHeader>

            <dl className="grid grid-cols-3 gap-4 text-sm">
              <Stat label={monthly ? 'Média (12 meses)' : `Média (últimas ${history.length})`} value={entered.length ? formatMoney(average) : '—'} />
              <Stat
                label="Maior valor"
                value={highest ? formatMoney(highest.amount) : '—'}
                detail={highest ? formatMonth(highest.month, true) : undefined}
              />
              <Stat label="Estimativa" value={bill.estimate ? formatMoney(bill.estimate) : '—'} />
            </dl>

            {entered.length === 0 ? (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                {monthly ? 'Lance os valores mês a mês para ver o histórico aqui.' : 'Lance os valores de cada vencimento para ver o histórico aqui.'}
              </p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                <BarChart data={data}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={0}
                    tickFormatter={(value: string) => (monthly ? formatMonth(value, true).split('/')[0] : formatMonth(value, true))}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const month = payload?.[0]?.payload?.month as string | undefined
                          return month ? formatMonth(month) : ''
                        }}
                        formatter={(value) => (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">Valor</span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatMoney(Math.round(Number(value) * 100))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}

            {bill.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{bill.notes}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
              <span>
                Desde {formatMonth(bill.startMonth)}
                {bill.endMonth && bill.endMonth !== bill.startMonth && ` até ${formatMonth(bill.endMonth)}`}
                {' · '}criada em {formatDate(bill.createdAt.slice(0, 10))}
              </span>
              <div className="flex gap-2">
                {!bill.endMonth && billFrequency(bill) !== 'once' && (
                  <Button variant="ghost" size="sm" onClick={() => onEnd(bill)}>
                    Encerrar conta
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => onEdit(bill)}>
                  Editar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {value}
        {detail && <span className="ml-1 text-xs font-normal text-muted-foreground">{detail}</span>}
      </dd>
    </div>
  )
}
