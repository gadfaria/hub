import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatKm, parseKm, today } from '@/lib/format'
import { Field } from './VehicleFormDialog'

interface OdometerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentKm?: number
  onSubmit: (km: number, date: string) => Promise<boolean>
}

export function OdometerDialog(props: OdometerDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-sm">{props.open && <OdometerForm {...props} />}</DialogContent>
    </Dialog>
  )
}

function OdometerForm({ currentKm, onSubmit, onOpenChange }: OdometerDialogProps) {
  const [kmText, setKmText] = useState('')
  const [date, setDate] = useState(today)
  const [pending, setPending] = useState(false)
  const km = parseKm(kmText)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (km === null || !date) return
    setPending(true)
    const ok = await onSubmit(km, date)
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Atualizar km</DialogTitle>
        <DialogDescription>
          {currentKm !== undefined ? `Último registro: ${formatKm(currentKm)}.` : 'Quanto o hodômetro marca hoje.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Km" id="odometer-km">
          <Input
            id="odometer-km"
            value={kmText}
            onChange={(e) => setKmText(e.target.value)}
            placeholder={currentKm !== undefined ? String(currentKm) : '0'}
            inputMode="numeric"
            className="tabular-nums"
            autoFocus
          />
        </Field>
        <Field label="Data" id="odometer-date">
          <Input id="odometer-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || km === null || !date}>
          {pending ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
