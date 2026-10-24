import { CopyIcon, EllipsisVerticalIcon, PhoneIcon, PlusIcon, RefreshCwIcon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AttachmentGrid } from '@/components/attachments'
import { ExpiryBadge } from '@/components/expiry-badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatMoney } from '@/lib/format'
import { policyStatus, type InsurancePolicy } from './types'

interface InsuranceCardProps {
  currentPolicy: InsurancePolicy | undefined
  nextPolicy: InsurancePolicy | undefined
  pastPolicies: InsurancePolicy[]
  onAdd: () => void
  onRenew: (policy: InsurancePolicy) => void
  onEdit: (policy: InsurancePolicy) => void
  onDelete: (policy: InsurancePolicy) => void
}

function premiumLabel(policy: InsurancePolicy): string {
  if (!policy.premium) return '—'
  if (policy.installments <= 1) return formatMoney(policy.premium)
  return `${formatMoney(policy.premium)} · ${policy.installments}x de ${formatMoney(Math.round(policy.premium / policy.installments))}`
}

export function InsuranceCard({ currentPolicy: policy, nextPolicy, pastPolicies, onAdd, onRenew, onEdit, onDelete }: InsuranceCardProps) {
  if (!policy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seguro</CardTitle>
          <CardDescription>Nenhum seguro cadastrado</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <ShieldCheckIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Guarde apólice, vigência, coberturas e o telefone da assistência 24h.
          </p>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon />
            Adicionar seguro
          </Button>
        </CardContent>
      </Card>
    )
  }

  const status = policyStatus(policy)
  const coverages = policy.coverages
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(policy!.policyNumber)
      toast.success('Número da apólice copiado')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Seguro</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {policy.insurer}
          <ExpiryBadge status={status} expiryDate={policy.endDate} />
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          {!nextPolicy && (status.kind === 'soon' || status.kind === 'expired') && (
            <Button size="sm" onClick={() => onRenew(policy)}>
              <RefreshCwIcon />
              Renovar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                <EllipsisVerticalIcon />
                <span className="sr-only">Ações do seguro</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => onEdit(policy)}>Editar</DropdownMenuItem>
              {!nextPolicy && <DropdownMenuItem onSelect={() => onRenew(policy)}>Renovar</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(policy)}>
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {nextPolicy && (
          <button
            type="button"
            onClick={() => onEdit(nextPolicy)}
            className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-left text-sm"
          >
            <RefreshCwIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Renovado: <span className="font-medium">{nextPolicy.insurer}</span> a partir de{' '}
              {formatDate(nextPolicy.startDate)}
            </span>
            {nextPolicy.premium > 0 && <span className="shrink-0 tabular-nums">{formatMoney(nextPolicy.premium)}</span>}
          </button>
        )}
        {policy.assistancePhone && (
          <Button variant="outline" className="justify-start" asChild>
            <a href={`tel:${policy.assistancePhone.replace(/[^\d+]/g, '')}`}>
              <PhoneIcon />
              Assistência 24h
              <span className="ml-auto font-mono tabular-nums">{policy.assistancePhone}</span>
            </a>
          </Button>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Apólice</dt>
            <dd className="flex items-center gap-1 font-mono font-medium">
              {policy.policyNumber || '—'}
              {policy.policyNumber && (
                <Button variant="ghost" size="icon" className="size-6" onClick={copyNumber} aria-label="Copiar apólice">
                  <CopyIcon className="size-3.5" />
                </Button>
              )}
            </dd>
          </div>
          <Item label="Vigência" value={`${formatDate(policy.startDate)} a ${formatDate(policy.endDate)}`} />
          <Item label="Franquia" value={policy.deductible ? formatMoney(policy.deductible) : '—'} />
          <Item label="Prêmio" value={premiumLabel(policy)} className="col-span-2" />
          {policy.broker && <Item label="Corretor" value={policy.broker} className="col-span-2" />}
        </dl>

        {coverages.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Coberturas</span>
            <ul className="flex flex-col gap-1 text-sm">
              {coverages.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {policy.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{policy.notes}</p>}
        {policy.attachments.length > 0 && <AttachmentGrid attachments={policy.attachments} />}

        {pastPolicies.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t pt-4">
            <span className="text-xs text-muted-foreground">Apólices anteriores</span>
            <ul className="flex flex-col divide-y text-sm">
              {pastPolicies.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="flex w-full items-center justify-between gap-3 py-2 text-left hover:text-foreground"
                  >
                    <span className="truncate">
                      {p.insurer}
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                        {formatDate(p.startDate, { month: 'short', year: 'numeric' })} –{' '}
                        {formatDate(p.endDate, { month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{p.premium ? formatMoney(p.premium) : '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Item({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${className ?? ''}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
