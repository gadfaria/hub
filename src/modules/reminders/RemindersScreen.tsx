import { useState } from 'react'
import { CheckIcon, EllipsisVerticalIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addDays, daysUntil, formatDate, today } from '@/lib/format'
import { ReminderFormDialog } from './ReminderFormDialog'
import { scheduleLabel, type Reminder } from './types'
import { useReminders, type FinishedRow, type ReminderRow } from './useReminders'

type Confirm = { kind: 'end' | 'delete'; reminder: Reminder }

function whenLabel(row: ReminderRow): string {
  const days = daysUntil(row.due)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  if (days === -1) return 'Ontem'
  return days < 0 ? `Há ${-days} dias` : `Em ${days} dias`
}

function StatusBadge({ row }: { row: ReminderRow }) {
  if (row.status === 'overdue') return <Badge variant="destructive">{whenLabel(row)}</Badge>
  if (row.status === 'today') return <Badge>Hoje</Badge>
  return <Badge variant="secondary">{whenLabel(row)}</Badge>
}

export function RemindersScreen() {
  const reminders = useReminders()
  const [view, setView] = useState<'active' | 'finished'>('active')
  const [dialog, setDialog] = useState<{ reminder?: Reminder } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  async function complete(row: ReminderRow) {
    const done = await reminders.complete(row)
    if (done) toast.success(`${row.reminder.title}: feito`, { action: { label: 'Desfazer', onClick: () => reminders.undoOccurrence(done) } })
  }

  async function snooze(row: ReminderRow, days: number) {
    // From today when it is already due, otherwise from its own date.
    const base = row.due > today() ? row.due : today()
    const to = addDays(base, days)
    if (await reminders.snooze(row, to)) toast(`${row.reminder.title}: adiado para ${formatDate(to)}`)
  }

  return (
    <>
      <SiteHeader title="Lembretes">
        <Button size="sm" onClick={() => setDialog({})} disabled={reminders.loading}>
          <PlusIcon />
          <span className="hidden sm:inline">Novo lembrete</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </SiteHeader>

      <PageBody>
        <div className="flex flex-col gap-4 px-4 lg:px-6">
          <Tabs value={view} onValueChange={(v) => setView(v as 'active' | 'finished')}>
            <TabsList>
              <TabsTrigger value="active">
                Ativos
                <Badge variant="secondary" className="tabular-nums">
                  {reminders.active.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="finished">
                Concluídos
                <Badge variant="secondary" className="tabular-nums">
                  {reminders.finished.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {view === 'active' ? (
            <ActiveTable
              loading={reminders.loading}
              rows={reminders.active}
              hasReminders={reminders.all.length > 0}
              onComplete={complete}
              onSnooze={snooze}
              onEdit={(reminder) => setDialog({ reminder })}
              onEnd={(reminder) => setConfirm({ kind: 'end', reminder })}
            />
          ) : (
            <FinishedTable
              loading={reminders.loading}
              rows={reminders.finished}
              onEdit={(reminder) => setDialog({ reminder })}
              onReactivate={reminders.reactivateReminder}
              onUndo={reminders.undoOccurrence}
              onDelete={(reminder) => setConfirm({ kind: 'delete', reminder })}
            />
          )}
        </div>
      </PageBody>

      <ReminderFormDialog
        open={dialog !== null && confirm === null}
        onOpenChange={(open) => !open && setDialog(null)}
        reminder={dialog?.reminder}
        onSubmit={(input) => reminders.saveReminder(input, dialog?.reminder)}
        onDelete={(reminder) => setConfirm({ kind: 'delete', reminder })}
      />
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === 'end' ? `Encerrar ${confirm.reminder.title}?` : 'Excluir lembrete?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'end'
                ? 'Ele para de repetir e vai para "Concluídos", de onde pode ser reativado.'
                : `${confirm?.reminder.title ?? ''} será removido de vez.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.kind === 'delete' ? 'destructive' : 'default'}
              onClick={async () => {
                if (confirm?.kind === 'end') await reminders.endReminder(confirm.reminder)
                if (confirm?.kind === 'delete' && (await reminders.deleteReminder(confirm.reminder))) setDialog(null)
                setConfirm(null)
              }}
            >
              {confirm?.kind === 'end' ? 'Encerrar' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function LoadingRows() {
  return [0, 1, 2].map((i) => (
    <TableRow key={i}>
      <TableCell colSpan={4} className="px-4">
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  ))
}

function ActiveTable({
  loading,
  rows,
  hasReminders,
  onComplete,
  onSnooze,
  onEdit,
  onEnd,
}: {
  loading: boolean
  rows: ReminderRow[]
  hasReminders: boolean
  onComplete: (row: ReminderRow) => void
  onSnooze: (row: ReminderRow, days: number) => void
  onEdit: (reminder: Reminder) => void
  onEnd: (reminder: Reminder) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="pl-4">Quando</TableHead>
            <TableHead>Lembrete</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                {hasReminders ? 'Nenhum lembrete ativo.' : 'Nenhum lembrete ainda. Adicione o que você não quer esquecer.'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.reminder.id} className="cursor-pointer" onClick={() => onEdit(row.reminder)}>
                <TableCell className="pl-4">
                  <div className="flex flex-col">
                    <span className={`tabular-nums ${row.status === 'overdue' ? 'font-medium text-destructive' : ''}`}>
                      {formatDate(row.due, { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-xs text-muted-foreground sm:hidden">{whenLabel(row)}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-64">
                  <div className="flex flex-col">
                    <span className="truncate font-medium">{row.reminder.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {scheduleLabel(row.reminder)}
                      {row.due !== row.date && ` · adiado de ${formatDate(row.date, { day: '2-digit', month: '2-digit' })}`}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <StatusBadge row={row} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 pr-2">
                    <Button variant="outline" size="sm" onClick={() => onComplete(row)}>
                      <CheckIcon />
                      <span className="hidden md:inline">Concluir</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                          <EllipsisVerticalIcon />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => onSnooze(row, 1)}>Adiar 1 dia</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onSnooze(row, 7)}>Adiar 1 semana</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onEdit(row.reminder)}>Editar</DropdownMenuItem>
                        {row.reminder.frequency !== 'once' && (
                          <DropdownMenuItem onSelect={() => onEnd(row.reminder)}>Encerrar</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function FinishedTable({
  loading,
  rows,
  onEdit,
  onReactivate,
  onUndo,
  onDelete,
}: {
  loading: boolean
  rows: FinishedRow[]
  onEdit: (reminder: Reminder) => void
  onReactivate: (reminder: Reminder) => void
  onUndo: (occurrence: NonNullable<FinishedRow['occurrence']>) => void
  onDelete: (reminder: Reminder) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="pl-4">Em</TableHead>
            <TableHead>Lembrete</TableHead>
            <TableHead className="hidden sm:table-cell" />
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                Lembretes feitos (os de uma vez só) e encerrados aparecem aqui.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ reminder, finishedOn, occurrence }) => (
              <TableRow key={reminder.id} className="cursor-pointer" onClick={() => onEdit(reminder)}>
                <TableCell className="pl-4 tabular-nums text-muted-foreground">{formatDate(finishedOn)}</TableCell>
                <TableCell className="max-w-64">
                  <div className="flex flex-col">
                    <span className="truncate font-medium">{reminder.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{scheduleLabel(reminder)}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="text-muted-foreground">
                    {reminder.endedAt ? 'Encerrado' : 'Feito'}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 pr-2">
                    {reminder.endedAt ? (
                      <Button variant="outline" size="sm" onClick={() => onReactivate(reminder)}>
                        Reativar
                      </Button>
                    ) : (
                      occurrence && (
                        <Button variant="outline" size="sm" onClick={() => onUndo(occurrence)}>
                          Desfazer
                        </Button>
                      )
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                          <EllipsisVerticalIcon />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => onEdit(reminder)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(reminder)}>
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
