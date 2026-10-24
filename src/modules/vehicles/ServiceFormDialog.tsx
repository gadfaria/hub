import { useState, type FormEvent } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney, formatMoneyInput, parseKm, parseMoney, today } from '@/lib/format'
import { SERVICE_TYPES, type Service, type ServiceType } from './types'
import type { ServiceInput } from './useVehicles'
import { Field } from './VehicleFormDialog'

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, edits this service. */
  service?: Service
  /** Suggested odometer for a new service (the vehicle's current km). */
  suggestedKm?: number
  /** Workshops used before, suggested while typing. */
  workshops: string[]
  onSubmit: (input: ServiceInput) => Promise<boolean>
  onDelete?: (service: Service) => void
}

interface PartRow {
  key: string
  name: string
  quantity: string
  unitCost: string
}

export function ServiceFormDialog(props: ServiceFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {props.open && <ServiceForm key={props.service?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function ServiceForm({ service, suggestedKm, workshops, onSubmit, onOpenChange, onDelete }: ServiceFormDialogProps) {
  const [date, setDate] = useState(service?.date ?? today())
  const [kmText, setKmText] = useState(
    service?.km != null ? String(service.km) : suggestedKm != null ? String(suggestedKm) : '',
  )
  const [type, setType] = useState<ServiceType>(service?.type ?? 'service')
  const [title, setTitle] = useState(service?.title ?? '')
  const [workshop, setWorkshop] = useState(service?.workshop ?? '')
  const [laborText, setLaborText] = useState(service?.laborCost ? formatMoneyInput(service.laborCost) : '')
  const [notes, setNotes] = useState(service?.notes ?? '')
  const [parts, setParts] = useState<PartRow[]>(
    (service?.parts ?? []).map((p) => ({
      key: crypto.randomUUID(),
      name: p.name,
      quantity: String(p.quantity),
      unitCost: p.unitCost ? formatMoneyInput(p.unitCost) : '',
    })),
  )
  const [pending, setPending] = useState(false)

  const parsedParts = parts
    .filter((p) => p.name.trim())
    .map((p) => ({
      name: p.name.trim(),
      quantity: Math.max(1, Number(p.quantity.replace(',', '.')) || 1),
      unitCost: parseMoney(p.unitCost) ?? 0,
    }))
  const laborCost = parseMoney(laborText) ?? 0
  const total = laborCost + parsedParts.reduce((sum, p) => sum + p.quantity * p.unitCost, 0)
  const valid = date !== '' && (title.trim() !== '' || parsedParts.length > 0)

  function updatePart(key: string, changes: Partial<PartRow>) {
    setParts((rows) => rows.map((r) => (r.key === key ? { ...r, ...changes } : r)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setPending(true)
    const ok = await onSubmit({
      date,
      km: parseKm(kmText),
      type,
      // A part swap without a title is named after its parts.
      title: title.trim() || parsedParts.map((p) => p.name).join(', '),
      workshop: workshop.trim(),
      laborCost,
      parts: parsedParts,
      notes: notes.trim(),
    })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{service ? 'Editar manutenção' : 'Nova manutenção'}</DialogTitle>
        <DialogDescription>Revisões, reparos e trocas de peças, com o que foi gasto.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Data" id="service-date">
          <Input id="service-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Km" id="service-km">
          <Input
            id="service-km"
            value={kmText}
            onChange={(e) => setKmText(e.target.value)}
            placeholder="45.000"
            inputMode="numeric"
            className="tabular-nums"
          />
        </Field>
        <Field label="Tipo" id="service-type" className="col-span-2 sm:col-span-1">
          <Select value={type} onValueChange={(v) => setType(v as ServiceType)}>
            <SelectTrigger id="service-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SERVICE_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Descrição" id="service-title" className="col-span-2 sm:col-span-3">
          <Input
            id="service-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Revisão dos 40.000 km"
            autoFocus
          />
        </Field>
        <Field label="Oficina" optional id="service-workshop" className="col-span-2">
          <Input
            id="service-workshop"
            value={workshop}
            onChange={(e) => setWorkshop(e.target.value)}
            list="workshops"
            autoComplete="off"
          />
          <datalist id="workshops">
            {workshops.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        </Field>
        <Field label="Mão de obra" id="service-labor">
          <Input
            id="service-labor"
            value={laborText}
            onChange={(e) => setLaborText(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="tabular-nums"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Peças</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setParts((rows) => [...rows, { key: crypto.randomUUID(), name: '', quantity: '1', unitCost: '' }])
            }
          >
            <PlusIcon />
            Adicionar peça
          </Button>
        </div>
        {parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma peça. Adicione o que foi trocado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_4rem_6.5rem_2rem] gap-2 text-xs text-muted-foreground">
              <span>Peça</span>
              <span>Qtd</span>
              <span>Valor un.</span>
              <span />
            </div>
            {parts.map((part) => (
              <div key={part.key} className="grid grid-cols-[1fr_4rem_6.5rem_2rem] items-center gap-2">
                <Input
                  value={part.name}
                  onChange={(e) => updatePart(part.key, { name: e.target.value })}
                  placeholder="Ex.: Filtro de óleo"
                  aria-label="Peça"
                />
                <Input
                  value={part.quantity}
                  onChange={(e) => updatePart(part.key, { quantity: e.target.value })}
                  inputMode="decimal"
                  aria-label="Quantidade"
                  className="tabular-nums"
                />
                <Input
                  value={part.unitCost}
                  onChange={(e) => updatePart(part.key, { unitCost: e.target.value })}
                  placeholder="0,00"
                  inputMode="decimal"
                  aria-label="Valor unitário"
                  className="tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Remover peça"
                  onClick={() => setParts((rows) => rows.filter((r) => r.key !== part.key))}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="Observações" optional id="service-notes">
        <Textarea id="service-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>

      <Separator />

      <DialogFooter className="items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
        </div>
        <div className="flex gap-2">
          {service && onDelete && (
            <Button type="button" variant="ghost" onClick={() => onDelete(service)} disabled={pending}>
              Excluir
            </Button>
          )}
          <Button type="submit" disabled={pending || !valid}>
            {pending ? 'Salvando…' : service ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
