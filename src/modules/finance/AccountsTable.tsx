import { EllipsisVerticalIcon } from 'lucide-react'
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
import { formatDate, formatMoney } from '@/lib/format'
import { ACCOUNT_TYPES, accountLabel, type Account } from './types'
import type { InstitutionGroup } from './useFinance'

interface AccountsTableProps {
  loading: boolean
  groups: InstitutionGroup[]
  total: number
  onOpen: (account: Account) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
}

export function AccountsTable({ loading, groups, total, onOpen, onEdit, onDelete }: AccountsTableProps) {
  const rows = groups.flatMap((g) => g.accounts)

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="pl-4">Conta</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="hidden text-right md:table-cell">% do total</TableHead>
            <TableHead className="hidden md:table-cell">Atualizado em</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            [0, 1, 2].map((i) => (
              <TableRow key={i}>
                <TableCell colSpan={6} className="px-4">
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                Nenhuma conta ainda. Adicione onde seu dinheiro está guardado.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ account, latest }) => (
              <TableRow key={account.id} className="cursor-pointer" onClick={() => onOpen(account)}>
                <TableCell className="pl-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{account.institution}</span>
                    <span className="text-xs text-muted-foreground">{accountLabel(account)}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="px-1.5 text-muted-foreground">
                    {ACCOUNT_TYPES[account.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {latest ? formatMoney(latest.amount) : '—'}
                </TableCell>
                <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                  {latest && total > 0 ? `${((latest.amount / total) * 100).toFixed(1).replace('.', ',')}%` : '—'}
                </TableCell>
                <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                  {latest ? formatDate(latest.date) : '—'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                        <EllipsisVerticalIcon />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => onOpen(account)}>Atualizar saldo</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onEdit(account)}>Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(account)}>
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
