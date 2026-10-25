import { Children } from 'react'
import { CopyIcon, PencilIcon, UserRoundIcon } from 'lucide-react'
import { toast } from 'sonner'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { formatAddress, type PersonalProfile } from './types'

interface ProfileCardProps {
  loading: boolean
  person: string
  profile: PersonalProfile | undefined
  onEdit: () => void
}

/** A value with its label and a copy button; renders nothing when empty. */
function CopyField({
  label,
  value,
  hint,
  mono,
  className,
}: {
  label: string
  value: string
  /** Shown next to the value but not copied, e.g. an expiry date */
  hint?: string
  mono?: boolean
  className?: string
}) {
  if (!value.trim()) return null
  return (
    <div className={`group flex min-w-0 flex-col gap-0.5 ${className ?? ''}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className={`min-w-0 font-medium break-words ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
        <CopyButton value={value} label={label} className="-my-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" />
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  // Hide the whole section when none of its fields are filled in.
  if (Children.toArray(children).length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 @4xl/main:grid-cols-3">{children}</dl>
    </div>
  )
}

const nonEmpty = (value: string) => (value.trim() ? value : null)

export function ProfileCard({ loading, person, profile, onEdit }: ProfileCardProps) {
  if (loading) return <Skeleton className="h-48 w-full" />

  if (!profile) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <UserRoundIcon className="size-6 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Dados pessoais de {person}</p>
            <p className="text-sm text-muted-foreground">
              CPF, endereço, filiação, Pix… para consultar e copiar rápido quando precisar preencher algo.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <PencilIcon />
            Preencher dados
          </Button>
        </CardContent>
      </Card>
    )
  }

  const address = formatAddress(profile)
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address)
      toast.success('Endereço copiado', { description: address })
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>Dados pessoais</CardDescription>
        <CardTitle className="text-xl">{profile.fullName || person}</CardTitle>
        <CardAction className="flex gap-1">
          {address && (
            <Button variant="outline" size="sm" onClick={copyAddress}>
              <CopyIcon />
              <span className="hidden sm:inline">Copiar endereço</span>
              <span className="sm:hidden">Endereço</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PencilIcon />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Section title="Identificação">
          {nonEmpty(profile.cpf) && <CopyField label="CPF" value={profile.cpf} mono />}
          {nonEmpty(profile.birthDate) && (
            <CopyField
              label="Nascimento"
              value={[formatDate(profile.birthDate), profile.birthPlace].filter(Boolean).join(' · ')}
            />
          )}
          {!profile.birthDate && nonEmpty(profile.birthPlace) && <CopyField label="Naturalidade" value={profile.birthPlace} />}
          {nonEmpty(profile.motherName) && <CopyField label="Mãe" value={profile.motherName} />}
          {nonEmpty(profile.fatherName) && <CopyField label="Pai" value={profile.fatherName} />}
          {nonEmpty(profile.maritalStatus) && <CopyField label="Estado civil" value={profile.maritalStatus} />}
          {nonEmpty(profile.nationality) && <CopyField label="Nacionalidade" value={profile.nationality} />}
          {nonEmpty(profile.passport) && (
            <CopyField
              label="Passaporte"
              value={profile.passport}
              hint={profile.passportExpiry && `válido até ${formatDate(profile.passportExpiry)}`}
              mono
            />
          )}
        </Section>

        <Section title="Contato">
          {nonEmpty(address) && <CopyField label="Endereço" value={address} className="sm:col-span-2" />}
          {nonEmpty(profile.zip) && <CopyField label="CEP" value={profile.zip} mono />}
          {nonEmpty(profile.phone) && <CopyField label="Telefone" value={profile.phone} mono />}
          {nonEmpty(profile.email) && <CopyField label="E-mail" value={profile.email} />}
        </Section>

        <Section title="Outros dados">
          {profile.extras
            .filter((e) => e.label.trim() && e.value.trim())
            .map((extra, i) => (
              <CopyField key={i} label={extra.label} value={extra.value} />
            ))}
        </Section>

        {profile.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{profile.notes}</p>}
      </CardContent>
    </Card>
  )
}
