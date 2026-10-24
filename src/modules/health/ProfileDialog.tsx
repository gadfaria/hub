import { useState, type FormEvent } from 'react'
import { Field } from '@/components/form-field'
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
import { Textarea } from '@/components/ui/textarea'
import { BLOOD_TYPES, type HealthProfile } from './types'
import type { ProfileInput } from './useHealth'

const NO_BLOOD_TYPE = '__none__'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: string
  profile?: HealthProfile
  onSubmit: (input: ProfileInput) => Promise<boolean>
}

export function ProfileDialog(props: ProfileDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <ProfileForm key={props.profile?.id ?? props.person} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function ProfileForm({ person, profile, onSubmit, onOpenChange }: ProfileDialogProps) {
  const [values, setValues] = useState<ProfileInput>({
    birthDate: profile?.birthDate ?? '',
    bloodType: profile?.bloodType ?? '',
    allergies: profile?.allergies ?? '',
    conditions: profile?.conditions ?? '',
    insurance: profile?.insurance ?? '',
    insuranceNumber: profile?.insuranceNumber ?? '',
    emergencyContact: profile?.emergencyContact ?? '',
    notes: profile?.notes ?? '',
  })
  const [pending, setPending] = useState(false)
  const set = (key: keyof ProfileInput) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()])) as ProfileInput
    const ok = await onSubmit(trimmed)
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Perfil de saúde · {person}</DialogTitle>
        <DialogDescription>O que é bom ter à mão numa emergência.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nascimento" optional id="profile-birth">
          <Input id="profile-birth" type="date" value={values.birthDate} onChange={set('birthDate')} />
        </Field>
        <Field label="Tipo sanguíneo" optional id="profile-blood">
          <Select
            value={values.bloodType || NO_BLOOD_TYPE}
            onValueChange={(v) => setValues((s) => ({ ...s, bloodType: v === NO_BLOOD_TYPE ? '' : v }))}
          >
            <SelectTrigger id="profile-blood" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_BLOOD_TYPE}>Não sei</SelectItem>
              {BLOOD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Alergias" optional id="profile-allergies" className="col-span-2">
          <Input id="profile-allergies" value={values.allergies} onChange={set('allergies')} placeholder="Ex.: Dipirona, camarão" />
        </Field>
        <Field label="Condições" optional id="profile-conditions" className="col-span-2">
          <Input
            id="profile-conditions"
            value={values.conditions}
            onChange={set('conditions')}
            placeholder="Ex.: Asma, hipertensão"
          />
        </Field>
        <Field label="Plano de saúde" optional id="profile-insurance">
          <Input id="profile-insurance" value={values.insurance} onChange={set('insurance')} placeholder="Ex.: Unimed" />
        </Field>
        <Field label="Carteirinha" optional id="profile-card">
          <Input id="profile-card" value={values.insuranceNumber} onChange={set('insuranceNumber')} className="font-mono" />
        </Field>
        <Field label="Contato de emergência" optional id="profile-emergency" className="col-span-2">
          <Input
            id="profile-emergency"
            value={values.emergencyContact}
            onChange={set('emergencyContact')}
            placeholder="Ex.: Maria · (11) 99999-0000"
          />
        </Field>
        <Field label="Observações" optional id="profile-notes" className="col-span-2">
          <Textarea id="profile-notes" value={values.notes} onChange={set('notes')} rows={2} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
