import { useState } from 'react'
import { CheckIcon, EllipsisVerticalIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PageBody } from '@/components/app-layout'
import { SiteHeader } from '@/components/site-header'
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
import { addDays, formatDate, today } from '@/lib/format'
import { StatusBadge } from './ReminderDetailsDialog'
import { reminderColor, scheduleLabel, whenLabel, type Reminder } from './types'
import { useReminderDialogs } from './useReminderDialogs'
import { useReminders, type FinishedRow, type ReminderRow } from './useReminders'

export function RemindersScreen() {
  const reminders = useReminders()
  const dialogs = useReminderDialogs(reminders)
  const [view, setView] = useState<'active' | 'finished'>('active')

  async function snooze(row: ReminderRow, days: number) {
    // From today when it is already due, otherwise from its own date.
    const base = row.due > today() ? row.due : today()
    const to = addDays(base, days)
    if (await reminders.snooze(row, to)) toast(`${row.reminder.title}: adiado para ${formatDate(to)}`)
  }

  return (
    <>
      <SiteHeader title="Lembretes">
        <Button size="sm" onClick={() => dialogs.edit()} disabled={reminders.loading}>
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
              onOpen={(reminder) => dialogs.showDetails({ reminderId: reminder.id })}
              onComplete={dialogs.complete}
              onSnooze={snooze}
              onEdit={dialogs.edit}
              onEnd={dialogs.askToEnd}
            />
          ) : (
            <FinishedTable
              loading={reminders.loading}
              rows={reminders.finished}
              onOpen={(reminder) => dialogs.showDetails({ reminderId: reminder.id })}
              onEdit={dialogs.edit}
              onReactivate={reminders.reactivateReminder}
              onUndo={reminders.undoOccurrence}
              onDelete={dialogs.askToDelete}
            />
          )}
        </div>
      </PageBody>

      {dialogs.dialogs}
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
  onOpen,
  onComplete,
  onSnooze,
  onEdit,
  onEnd,
}: {
  loading: boolean
  rows: ReminderRow[]
  hasReminders: boolean
  onOpen: (reminder: Reminder) => void
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
              <TableRow key={row.reminder.id} className="cursor-pointer" onClick={() => onOpen(row.reminder)}>
                <TableCell className="pl-4">
                  <div className="flex flex-col">
                    <span className={`tabular-nums ${row.status === 'overdue' ? 'font-medium text-destructive' : ''}`}>
                      {formatDate(row.due, { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-xs text-muted-foreground sm:hidden">{whenLabel(row.due)}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-64">
                  <div className="flex flex-col">
                    <ReminderTitle reminder={row.reminder} />
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
  onOpen,
  onEdit,
  onReactivate,
  onUndo,
  onDelete,
}: {
  loading: boolean
  rows: FinishedRow[]
  onOpen: (reminder: Reminder) => void
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
              <TableRow key={reminder.id} className="cursor-pointer" onClick={() => onOpen(reminder)}>
                <TableCell className="pl-4 tabular-nums text-muted-foreground">{formatDate(finishedOn)}</TableCell>
                <TableCell className="max-w-64">
                  <div className="flex flex-col">
                    <ReminderTitle reminder={reminder} />
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

/** The title, with the reminder's calendar color as a dot when it has one. */
function ReminderTitle({ reminder }: { reminder: Reminder }) {
  const color = reminderColor(reminder.color)
  return (
    <span className="flex min-w-0 items-center gap-1.5 font-medium">
      {color && <span className={`size-2 shrink-0 rounded-full ${color.dot}`} />}
      <span className="truncate">{reminder.title}</span>
    </span>
  )
}
