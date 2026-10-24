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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { VEHICLE_TYPES, type Vehicle, type VehicleType } from './types'
import type { VehicleInput } from './useVehicles'

interface VehicleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, edits this vehicle. */
  vehicle?: Vehicle
  onSubmit: (input: VehicleInput) => Promise<boolean>
}

export function VehicleFormDialog(props: VehicleFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* Keyed so the form resets every time the dialog opens. */}
        {props.open && <VehicleForm key={props.vehicle?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function VehicleForm({ vehicle, onSubmit, onOpenChange }: VehicleFormDialogProps) {
  const [values, setValues] = useState<VehicleInput>({
    name: vehicle?.name ?? '',
    type: vehicle?.type ?? 'car',
    brand: vehicle?.brand ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year ?? '',
    plate: vehicle?.plate ?? '',
    color: vehicle?.color ?? '',
    renavam: vehicle?.renavam ?? '',
    chassis: vehicle?.chassis ?? '',
    notes: vehicle?.notes ?? '',
  })
  const [pending, setPending] = useState(false)

  const set = (key: keyof VehicleInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))
  const valid = values.brand.trim() !== '' || values.model.trim() !== '' || values.name.trim() !== ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const trimmed = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    ) as VehicleInput
    const ok = await onSubmit({ ...trimmed, plate: trimmed.plate.toUpperCase() })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{vehicle ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
        <DialogDescription>Só marca ou modelo são obrigatórios; o resto você completa quando quiser.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Marca" id="brand">
          <Input id="brand" value={values.brand} onChange={set('brand')} placeholder="Ex.: Honda" autoFocus />
        </Field>
        <Field label="Modelo" id="model">
          <Input id="model" value={values.model} onChange={set('model')} placeholder="Ex.: Civic EXL" />
        </Field>
        <Field label="Tipo" id="type">
          <Select value={values.type} onValueChange={(v) => setValues((s) => ({ ...s, type: v as VehicleType }))}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VEHICLE_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Ano" id="year">
          <Input id="year" value={values.year} onChange={set('year')} placeholder="2019/2020" inputMode="numeric" />
        </Field>
        <Field label="Placa" id="plate">
          <Input id="plate" value={values.plate} onChange={set('plate')} placeholder="ABC1D23" className="uppercase" />
        </Field>
        <Field label="Cor" id="color">
          <Input id="color" value={values.color} onChange={set('color')} placeholder="Preto" />
        </Field>
        <Field label="Renavam" id="renavam">
          <Input id="renavam" value={values.renavam} onChange={set('renavam')} inputMode="numeric" />
        </Field>
        <Field label="Chassi" id="chassis">
          <Input id="chassis" value={values.chassis} onChange={set('chassis')} className="uppercase" />
        </Field>
        <Field label="Apelido" optional id="name" className="col-span-2">
          <Input id="name" value={values.name} onChange={set('name')} placeholder="Ex.: Carro da família" />
        </Field>
        <Field label="Observações" optional id="notes" className="col-span-2">
          <Textarea id="notes" value={values.notes} onChange={set('notes')} rows={3} />
        </Field>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending || !valid}>
          {pending ? 'Salvando…' : vehicle ? 'Salvar' : 'Adicionar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function Field({
  label,
  id,
  optional,
  className,
  children,
}: {
  label: string
  id: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
    </div>
  )
}
