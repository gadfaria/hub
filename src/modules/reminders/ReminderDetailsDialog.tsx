import { CheckIcon, PencilIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, today } from '@/lib/format'
import { LEAD_OPTIONS, periodEnd, reminderColor, scheduleLabel, whenLabel, type Reminder } from './types'
import type { FinishedRow, ReminderRow } from './useReminders'

export function StatusBadge({ row }: { row: ReminderRow }) {
  if (row.status === 'overdue') return <Badge variant="destructive">{whenLabel(row.due)}</Badge>
  if (row.status === 'today') return <Badge>Hoje</Badge>
  return <Badge variant="secondary">{whenLabel(row.due)}</Badge>
}

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm first-letter:uppercase">{children}</dd>
    </div>
  )
}

interface ReminderDetailsDialogProps {
  open: boolean
  reminder: Reminder | undefined
  /** The day it was opened from (the calendar's occurrence); empty for the reminder as a whole */
  date?: string
  /** That occurrence is already done */
  done?: boolean
  /** What it is waiting on, while active */
  row: ReminderRow | undefined
  /** Set when it is over */
  finished: FinishedRow | undefined
  onClose: () => void
  onComplete: (row: ReminderRow) => void
  onEdit: (reminder: Reminder) => void
}

export function ReminderDetailsDialog({ open, reminder, date, done, row, finished, onClose, onComplete, onEdit }: ReminderDetailsDialogProps) {
  const color = reminderColor(reminder?.color)
  const day = date ?? row?.due
  // Other days of a repeating reminder are only informative: what can be done is the one it waits on.
  const isCurrent = !!row && !done && (!date || date === row.due)
  const until = reminder && day ? periodEnd(reminder, day) : ''

  return (
    <Dialog open={open && !!reminder} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {reminder && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-6">
                {color && <span className={`size-2.5 shrink-0 rounded-full ${color.dot}`} />}
                <span className="min-w-0 break-words">{reminder.title}</span>
              </DialogTitle>
              <DialogDescription>{scheduleLabel(reminder)}</DialogDescription>
            </DialogHeader>

            <dl className="flex flex-col gap-3">
              {day && (
                <Info label={until !== day ? 'Período' : 'Data'}>
                  {until !== day ? `${formatDate(day)} a ${formatDate(until)}` : formatDate(day, LONG_DATE)}
                </Info>
              )}
              <Info label="Status">
                {done ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    <CheckIcon />
                    Feito
                  </Badge>
                ) : finished ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    {reminder.endedAt ? 'Encerrado' : 'Feito'} em {formatDate(finished.finishedOn)}
                  </Badge>
                ) : isCurrent && row ? (
                  <StatusBadge row={row} />
                ) : (
                  <Badge variant="secondary">{day && day < today() ? 'Passou' : whenLabel(day ?? today())}</Badge>
                )}
              </Info>
              {row && !isCurrent && <Info label="Próximo">{formatDate(row.due, LONG_DATE)}</Info>}
              {row && row.due !== row.date && <Info label="Adiado de">{formatDate(row.date)}</Info>}
              <Info label="Avisar">{LEAD_OPTIONS[reminder.leadDays as keyof typeof LEAD_OPTIONS] ?? `${reminder.leadDays} dias antes`}</Info>
              {reminder.notes && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Observações</dt>
                  <dd className="text-sm break-words whitespace-pre-line">{reminder.notes}</dd>
                </div>
              )}
            </dl>

            <DialogFooter>
              <Button variant="outline" onClick={() => onEdit(reminder)}>
                <PencilIcon />
                Editar
              </Button>
              {isCurrent && row && (
                <Button
                  onClick={() => {
                    onComplete(row)
                    onClose()
                  }}
                >
                  <CheckIcon />
                  Concluir
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
