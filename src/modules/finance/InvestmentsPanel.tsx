import { useState } from 'react'
import { EllipsisVerticalIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { daysUntil, formatDate, formatMoney, formatRatio } from '@/lib/format'
import { InvestmentFormDialog, RedeemDialog } from './InvestmentDialogs'
import { INVESTMENT_KINDS, MATURITY_SOON_DAYS, investmentReturn, type Investment } from './types'
import type { useFinance } from './useFinance'

interface InvestmentsPanelProps {
  finance: ReturnType<typeof useFinance>
  view: 'active' | 'redeemed'
  /** Controlled by the screen so its "Nova aplicação" button can open the form. */
  creating: boolean
  onCreatingChange: (open: boolean) => void
}

function MaturityCell({ investment }: { investment: Investment }) {
  if (!investment.maturity) return <span className="text-muted-foreground">Sem vencimento</span>
  const days = daysUntil(investment.maturity)
  if (days < 0) return <Badge variant="destructive">Venceu {formatDate(investment.maturity)}</Badge>
  if (days <= MATURITY_SOON_DAYS)
    return <Badge>{days === 0 ? 'Vence hoje' : `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`}</Badge>
  return <span className="text-muted-foreground tabular-nums">{formatDate(investment.maturity)}</span>
}

export function InvestmentsPanel({ finance, view, creating, onCreatingChange }: InvestmentsPanelProps) {
  const [editing, setEditing] = useState<Investment | null>(null)
  const [redeeming, setRedeeming] = useState<Investment | null>(null)
  const [deleting, setDeleting] = useState<Investment | null>(null)

  const { activeInvestments: active, redeemedInvestments: redeemed, loading } = finance
  const rows = view === 'active' ? active : redeemed
  const institutions = [...new Set([...finance.institutions, ...finance.investmentInstitutions])].sort()

  const invested = active.reduce((s, i) => s + i.amount, 0)
  const soon = active.filter((i) => i.maturity && daysUntil(i.maturity) >= 0 && daysUntil(i.maturity) <= MATURITY_SOON_DAYS)
  // Matured but still marked active: most likely redeemed without being recorded.
  const matured = active.filter((i) => i.maturity && daysUntil(i.maturity) < 0)
  const earned = redeemed.reduce((s, i) => s + (i.redeemedAmount - i.amount), 0)

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3 rounded-lg border p-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Aplicado (ativos)</dt>
          <dd className="text-lg font-semibold tabular-nums">{loading ? '—' : formatMoney(invested)}</dd>
          <dd className="text-xs text-muted-foreground">
            {active.length} {active.length === 1 ? 'aplicação' : 'aplicações'}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Vencem em {MATURITY_SOON_DAYS} dias</dt>
          <dd className="text-lg font-semibold tabular-nums">{loading ? '—' : formatMoney(soon.reduce((s, i) => s + i.amount, 0))}</dd>
          <dd className="truncate text-xs text-muted-foreground">
            {soon.length ? soon.map((i) => i.name).join(', ') : 'Nada vencendo'}
          </dd>
          {matured.length > 0 && (
            <dd className="text-xs font-medium text-destructive">
              {matured.length} {matured.length === 1 ? 'vencida' : 'vencidas'} sem resgate registrado
            </dd>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Rendimento resgatado</dt>
          <dd className="text-lg font-semibold tabular-nums">{loading ? '—' : formatMoney(earned)}</dd>
          <dd className="text-xs text-muted-foreground">
            {redeemed.length} {redeemed.length === 1 ? 'resgate' : 'resgates'}
          </dd>
        </div>
      </dl>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="pl-4">Aplicação</TableHead>
              <TableHead className="hidden md:table-cell">Taxa</TableHead>
              <TableHead className="text-right">{view === 'active' ? 'Aplicado' : 'Aplicado → recebido'}</TableHead>
              <TableHead className="hidden sm:table-cell">{view === 'active' ? 'Vencimento' : 'Rendimento'}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [0, 1, 2].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5} className="px-4">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  {view === 'active' ? 'Nenhuma aplicação ativa. Adicione CDBs, LCIs, Tesouro…' : 'Nenhum resgate ainda.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((investment) => {
                const result = investment.redeemedAt ? investmentReturn(investment) : null
                return (
                  <TableRow
                    key={investment.id}
                    className="cursor-pointer"
                    onClick={() => (investment.redeemedAt ? setRedeeming(investment) : setEditing(investment))}
                  >
                    <TableCell className="max-w-64 pl-4">
                      <div className="flex flex-col">
                        <span className="truncate font-medium">{investment.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {investment.institution} · {INVESTMENT_KINDS[investment.kind]} · desde {formatDate(investment.investedAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{investment.rate || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {result ? (
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{formatMoney(investment.redeemedAmount)}</span>
                          <span className="text-xs text-muted-foreground">de {formatMoney(investment.amount)}</span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatMoney(investment.amount)}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {result ? (
                        <div className="flex flex-col">
                          <span className="font-medium tabular-nums">
                            {formatMoney(result.profit)} <span className="text-muted-foreground">({formatRatio(result.total)})</span>
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatRatio(result.annual)} a.a. · resgatado {formatDate(investment.redeemedAt)}
                          </span>
                        </div>
                      ) : (
                        <MaturityCell investment={investment} />
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                            <EllipsisVerticalIcon />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {!investment.redeemedAt && (
                            <DropdownMenuItem onSelect={() => setRedeeming(investment)}>Registrar resgate</DropdownMenuItem>
                          )}
                          {investment.redeemedAt && (
                            <DropdownMenuItem onSelect={() => setRedeeming(investment)}>Editar resgate</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => setEditing(investment)}>Editar aplicação</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(investment)}>
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InvestmentFormDialog
        open={creating}
        onOpenChange={onCreatingChange}
        institutions={institutions}
        onSubmit={(input) => finance.saveInvestment(input)}
      />
      <InvestmentFormDialog
        open={editing !== null && deleting === null}
        onOpenChange={(open) => !open && setEditing(null)}
        investment={editing ?? undefined}
        institutions={institutions}
        onSubmit={(input) => (editing ? finance.saveInvestment(input, editing) : Promise.resolve(false))}
        onDelete={setDeleting}
      />
      <RedeemDialog investment={redeeming} onClose={() => setRedeeming(null)} onSubmit={finance.redeemInvestment} />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aplicação?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} será removida. Para guardar o histórico, prefira registrar o resgate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (deleting && (await finance.deleteInvestment(deleting))) setEditing(null)
                setDeleting(null)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
