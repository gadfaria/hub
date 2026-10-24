import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { PageBody } from '@/components/app-layout'
import { SiteHeader } from '@/components/site-header'
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
import { AccountDetailDialog } from './AccountDetailDialog'
import { AccountFormDialog, type AccountFormValues } from './AccountFormDialog'
import { AccountsTable } from './AccountsTable'
import { NetWorthChart } from './NetWorthChart'
import { SummaryCards } from './SummaryCards'
import { accountLabel, type Account } from './types'
import { useFinancas } from './useFinancas'

export function FinancasScreen() {
  const financas = useFinancas()
  const { loading, groups, total, lastUpdate, institutions, history, series } = financas
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const accountCount = groups.reduce((n, g) => n + g.accounts.length, 0)
  const selected = groups.flatMap((g) => g.accounts).find((a) => a.account.id === selectedId)?.account ?? null

  function handleCreate(values: AccountFormValues) {
    const { amount, date, ...account } = values
    return financas.addAccount(account, amount, date)
  }

  function handleEdit(values: AccountFormValues) {
    if (!editing) return Promise.resolve(false)
    const { institution, name, type } = values
    return financas.updateAccount(editing, { institution, name, type })
  }

  return (
    <>
      <SiteHeader title="Finanças" />
      <PageBody>
        <SummaryCards loading={loading} total={total} lastUpdate={lastUpdate} series={series} groups={groups} />
        <div className="px-4 lg:px-6">
          <NetWorthChart loading={loading} series={series} />
        </div>
        <div className="flex flex-col gap-4 px-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium">Contas</h2>
              {!loading && (
                <Badge variant="secondary" className="tabular-nums">
                  {accountCount}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreating(true)} disabled={loading}>
              <PlusIcon />
              Nova conta
            </Button>
          </div>
          <AccountsTable
            loading={loading}
            groups={groups}
            total={total}
            onOpen={(account) => setSelectedId(account.id)}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        </div>
      </PageBody>

      <AccountFormDialog
        open={creating}
        onOpenChange={setCreating}
        institutions={institutions}
        onSubmit={handleCreate}
      />
      <AccountFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        institutions={institutions}
        account={editing ?? undefined}
        onSubmit={handleEdit}
      />
      <AccountDetailDialog
        account={editing || deleting ? null : selected}
        history={selected ? (history.get(selected.id) ?? []) : []}
        onClose={() => setSelectedId(null)}
        onAddBalance={financas.addBalance}
        onDeleteBalance={financas.deleteBalance}
        onEdit={setEditing}
        onDelete={setDeleting}
      />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `${deleting.institution} · ${accountLabel(deleting)}`} e todo o histórico de saldos dela
              deixam de contar no patrimônio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!deleting) return
                if (await financas.deleteAccount(deleting)) {
                  if (selectedId === deleting.id) setSelectedId(null)
                }
                setDeleting(null)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
