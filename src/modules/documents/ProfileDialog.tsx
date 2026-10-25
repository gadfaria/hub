import { useState, type FormEvent } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { formatCpf, formatZip, type PersonalProfile, type ProfileExtra } from './types'
import type { ProfileInput } from './useDocuments'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: string
  profile?: PersonalProfile
  onSubmit: (input: ProfileInput) => Promise<boolean>
}

type TextKey = Exclude<keyof ProfileInput, 'extras'>

const TEXT_KEYS: TextKey[] = [
  'fullName', 'cpf', 'birthDate', 'birthPlace', 'motherName', 'fatherName', 'maritalStatus', 'nationality', 'passport', 'passportExpiry',
  'street', 'number', 'complement', 'district', 'city', 'state', 'zip', 'phone', 'email',
  'notes',
]

export function ProfileDialog(props: ProfileDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {props.open && <ProfileForm key={props.profile?.id ?? props.person} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</legend>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">{children}</div>
    </fieldset>
  )
}

function ProfileForm({ person, profile, onSubmit, onOpenChange }: ProfileDialogProps) {
  const [values, setValues] = useState<Record<TextKey, string>>(
    () => Object.fromEntries(TEXT_KEYS.map((k) => [k, profile?.[k] ?? ''])) as Record<TextKey, string>,
  )
  const [extras, setExtras] = useState<(ProfileExtra & { key: string })[]>(
    (profile?.extras ?? []).map((e) => ({ ...e, key: crypto.randomUUID() })),
  )
  const [pending, setPending] = useState(false)

  const set = (key: TextKey) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }))
  const field = (key: TextKey, label: string, className: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label} id={`profile-${key}`} className={className}>
      <Input id={`profile-${key}`} value={values[key]} onChange={set(key)} autoComplete="off" {...props} />
    </Field>
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    const trimmed = Object.fromEntries(TEXT_KEYS.map((k) => [k, values[k].trim()])) as Record<TextKey, string>
    const ok = await onSubmit({
      ...trimmed,
      cpf: formatCpf(trimmed.cpf),
      zip: formatZip(trimmed.zip),
      state: trimmed.state.toUpperCase(),
      passport: trimmed.passport.toUpperCase(),
      extras: extras
        .map(({ label, value }) => ({ label: label.trim(), value: value.trim() }))
        .filter((e) => e.label && e.value),
    })
    setPending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Dados pessoais · {person}</DialogTitle>
        <DialogDescription>Preencha só o que for útil; campos vazios não aparecem no quadro.</DialogDescription>
      </DialogHeader>

      <Group title="Identificação">
        {field('fullName', 'Nome completo', 'col-span-2 sm:col-span-4', { autoFocus: true })}
        {field('cpf', 'CPF', 'col-span-2', { inputMode: 'numeric', className: 'font-mono', placeholder: '000.000.000-00' })}
        {field('birthDate', 'Nascimento', 'sm:col-span-2', { type: 'date' })}
        {field('birthPlace', 'Naturalidade', 'sm:col-span-2', { placeholder: 'Cidade/UF' })}
        {field('maritalStatus', 'Estado civil', 'col-span-2 sm:col-span-2')}
        {field('motherName', 'Nome da mãe', 'col-span-2 sm:col-span-3')}
        {field('fatherName', 'Nome do pai', 'col-span-2 sm:col-span-3')}
        {field('nationality', 'Nacionalidade', 'col-span-2 sm:col-span-2', { placeholder: 'Brasileira' })}
        {field('passport', 'Passaporte', 'col-span-2 sm:col-span-2', { className: 'font-mono uppercase' })}
        {field('passportExpiry', 'Validade do passaporte', 'col-span-2 sm:col-span-2', { type: 'date' })}
      </Group>

      <Group title="Endereço e contato">
        {field('street', 'Rua', 'col-span-2 sm:col-span-4')}
        {field('number', 'Número', 'sm:col-span-1')}
        {field('complement', 'Complemento', 'sm:col-span-1', { placeholder: 'Apto 33' })}
        {field('district', 'Bairro', 'col-span-2 sm:col-span-2')}
        {field('city', 'Cidade', 'sm:col-span-2')}
        {field('state', 'UF', 'sm:col-span-1', { maxLength: 2, className: 'uppercase' })}
        {field('zip', 'CEP', 'sm:col-span-1', { inputMode: 'numeric', className: 'font-mono' })}
        {field('phone', 'Telefone', 'sm:col-span-3', { inputMode: 'tel' })}
        {field('email', 'E-mail', 'col-span-2 sm:col-span-3', { type: 'email' })}
      </Group>

      <fieldset className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Outros dados</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExtras((rows) => [...rows, { key: crypto.randomUUID(), label: '', value: '' }])}
          >
            <PlusIcon />
            Adicionar campo
          </Button>
        </div>
        {extras.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ex.: PIS, título de eleitor, chave Pix, matrícula do trabalho…</p>
        ) : (
          extras.map((extra) => (
            <div key={extra.key} className="grid grid-cols-[1fr_1.5fr_2rem] items-center gap-2">
              <Input
                value={extra.label}
                onChange={(e) => setExtras((rows) => rows.map((r) => (r.key === extra.key ? { ...r, label: e.target.value } : r)))}
                placeholder="Nome do campo"
                aria-label="Nome do campo"
              />
              <Input
                value={extra.value}
                onChange={(e) => setExtras((rows) => rows.map((r) => (r.key === extra.key ? { ...r, value: e.target.value } : r)))}
                placeholder="Valor"
                aria-label="Valor"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Remover campo"
                onClick={() => setExtras((rows) => rows.filter((r) => r.key !== extra.key))}
              >
                <XIcon />
              </Button>
            </div>
          ))
        )}
      </fieldset>

      <Field label="Observações" optional id="profile-notes">
        <Textarea id="profile-notes" value={values.notes} onChange={set('notes')} rows={2} />
      </Field>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
