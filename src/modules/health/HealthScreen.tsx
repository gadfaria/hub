import { useState } from 'react'
import { CopyIcon, EllipsisVerticalIcon, PaperclipIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
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
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { daysUntil, formatDate, today } from '@/lib/format'
import { EntryFormDialog } from './EntryFormDialog'
import { MedicationDialog } from './MedicationDialog'
import { ProfileDialog } from './ProfileDialog'
import { ENTRY_KINDS, type HealthEntry, type HealthProfile, type Medication } from './types'
import { useHealth, type PersonHealth } from './useHealth'

type Confirm = { kind: 'entry'; entry: HealthEntry } | { kind: 'medication'; medication: Medication }

export function HealthScreen() {
  const health = useHealth()
  const { session } = useAuth()
  const me = session?.name.split(' ')[0] ?? 'Eu'
  const people = health.people.includes(me) ? health.people : [me, ...health.people]
  const [chosen, setChosen] = useState(me)
  const person = people.includes(chosen) ? chosen : people[0]
  const data = health.forPerson(person)

  const [profileOpen, setProfileOpen] = useState(false)
  const [entryDialog, setEntryDialog] = useState<{ entry?: HealthEntry } | null>(null)
  const [medicationDialog, setMedicationDialog] = useState<{ medication?: Medication } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const providers = [...new Set(health.people.flatMap((p) => health.forPerson(p).entries.map((e) => e.provider)))]
    .filter(Boolean)
    .sort()

  return (
    <>
      <SiteHeader title="Saúde">
        <Button size="sm" onClick={() => setEntryDialog({})} disabled={health.loading}>
          <PlusIcon />
          <span className="hidden sm:inline">Novo registro</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </SiteHeader>

      <PageBody>
        {people.length > 1 && (
          <div className="px-4 lg:px-6">
            <Tabs value={person} onValueChange={setChosen}>
              <TabsList>
                {people.map((p) => (
                  <TabsTrigger key={p} value={p}>
                    {p}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        <SummaryCards loading={health.loading} data={data} />

        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @4xl/main:grid-cols-2">
          <ProfileCard
            loading={health.loading}
            person={person}
            profile={data.profile}
            onEdit={() => setProfileOpen(true)}
          />
          <MedicationsCard
            loading={health.loading}
            data={data}
            onAdd={() => setMedicationDialog({})}
            onOpen={(medication) => setMedicationDialog({ medication })}
            onStop={health.stopMedication}
          />
        </div>

        <div className="flex flex-col gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Histórico</h2>
            {!health.loading && (
              <Badge variant="secondary" className="tabular-nums">
                {data.entries.length}
              </Badge>
            )}
          </div>
          <EntriesTable
            loading={health.loading}
            entries={data.entries}
            onOpen={(entry) => setEntryDialog({ entry })}
            onDelete={(entry) => setConfirm({ kind: 'entry', entry })}
          />
        </div>
      </PageBody>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        person={person}
        profile={data.profile}
        onSubmit={(input) => health.saveProfile(person, input, data.profile)}
      />
      <EntryFormDialog
        open={entryDialog !== null && confirm === null}
        onOpenChange={(open) => !open && setEntryDialog(null)}
        person={person}
        people={people}
        providers={providers}
        entry={entryDialog?.entry}
        onSubmit={async (input, newFiles, removed) => {
          const ok = await health.saveEntry(input, newFiles, removed, entryDialog?.entry)
          if (ok) setChosen(input.person)
          return ok
        }}
        onDelete={(entry) => setConfirm({ kind: 'entry', entry })}
      />
      <MedicationDialog
        open={medicationDialog !== null && confirm === null}
        onOpenChange={(open) => !open && setMedicationDialog(null)}
        person={person}
        medication={medicationDialog?.medication}
        onSubmit={(input) => health.saveMedication(input, medicationDialog?.medication)}
        onDelete={(medication) => setConfirm({ kind: 'medication', medication })}
      />
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === 'entry' ? 'Excluir registro?' : 'Excluir medicamento?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'entry'
                ? `${confirm.entry.title} (${formatDate(confirm.entry.date)}) será removido${confirm.entry.attachments.length ? ' e os arquivos vão para a lixeira do Drive' : ''}.`
                : confirm?.kind === 'medication'
                  ? `${confirm.medication.name} será removido. Para só marcar que parou de tomar, use "Encerrar".`
                  : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (confirm?.kind === 'entry' && (await health.deleteEntry(confirm.entry))) setEntryDialog(null)
                if (confirm?.kind === 'medication' && (await health.deleteMedication(confirm.medication)))
                  setMedicationDialog(null)
                setConfirm(null)
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

function relativeDays(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days === 0) return 'hoje'
  if (days === 1) return 'amanhã'
  return days < 60 ? `em ${days} dias` : `em ${Math.round(days / 30)} meses`
}

function SummaryCards({ loading, data }: { loading: boolean; data: PersonHealth }) {
  const year = today().slice(0, 4)
  const thisYear = data.entries.filter((e) => e.date.startsWith(year))
  const appointments = thisYear.filter((e) => e.kind === 'appointment')
  const exams = thisYear.filter((e) => e.kind === 'exam')
  const next = data.upcoming[0]
  const lastOf = (kind: HealthEntry['kind']) => data.entries.find((e) => e.kind === kind)

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <StatCard
        loading={loading}
        label={`Consultas em ${year}`}
        value={String(appointments.length)}
        headline={lastOf('appointment') ? `Última: ${lastOf('appointment')!.title}` : 'Nenhuma consulta registrada'}
        detail={lastOf('appointment') ? formatDate(lastOf('appointment')!.date) : ''}
      />
      <StatCard
        loading={loading}
        label={`Exames em ${year}`}
        value={String(exams.length)}
        headline={lastOf('exam') ? `Último: ${lastOf('exam')!.title}` : 'Nenhum exame registrado'}
        detail={lastOf('exam') ? formatDate(lastOf('exam')!.date) : ''}
      />
      <StatCard
        loading={loading}
        label="Próximo compromisso"
        value={next ? formatDate(next.nextDate) : '—'}
        badge={next ? relativeDays(next.nextDate) : undefined}
        headline={next ? next.title : 'Nada agendado'}
        detail={data.upcoming.length > 1 ? `E mais ${data.upcoming.length - 1}` : 'Retornos e próximas doses'}
      />
      <StatCard
        loading={loading}
        label="Medicamentos em uso"
        value={String(data.activeMedications.length)}
        headline={data.activeMedications.length ? data.activeMedications.map((m) => m.name).join(', ') : 'Nenhum em uso'}
        detail={data.pastMedications.length ? `${data.pastMedications.length} no histórico` : ''}
      />
    </div>
  )
}

function StatCard({
  loading,
  label,
  value,
  badge,
  headline,
  detail,
}: {
  loading: boolean
  label: string
  value: string
  badge?: string
  headline: string
  detail: string
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="col-span-full truncate text-2xl font-semibold tabular-nums @[340px]/card:text-3xl">
          {loading ? <Skeleton className="h-9 w-20" /> : value}
        </CardTitle>
        {!loading && badge && (
          <CardAction className="row-span-1">
            <Badge variant="outline">{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <>
            <div className="line-clamp-1 font-medium">{headline}</div>
            <div className="line-clamp-1 text-muted-foreground">{detail || ' '}</div>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

function age(birthDate: string): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  const now = new Date()
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0)
}

function ProfileCard({
  loading,
  person,
  profile,
  onEdit,
}: {
  loading: boolean
  person: string
  profile: HealthProfile | undefined
  onEdit: () => void
}) {
  async function copyCard() {
    if (!profile?.insuranceNumber) return
    try {
      await navigator.clipboard.writeText(profile.insuranceNumber)
      toast.success('Carteirinha copiada')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil · {person}</CardTitle>
        <CardDescription>
          {profile?.birthDate ? `${age(profile.birthDate)} anos · nasceu em ${formatDate(profile.birthDate)}` : 'Dados para emergências'}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={onEdit} disabled={loading}>
            <PencilIcon />
            {profile ? 'Editar' : 'Preencher'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Item label="Tipo sanguíneo" value={profile?.bloodType} strong />
            <Item label="Alergias" value={profile?.allergies} />
            <Item label="Condições" value={profile?.conditions} />
            <Item label="Contato de emergência" value={profile?.emergencyContact} />
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Plano de saúde</dt>
              <dd className="flex min-w-0 items-center gap-2 font-medium">
                <span className="truncate">
                  {profile?.insurance || '—'}
                  {profile?.insuranceNumber && (
                    <span className="ml-2 font-mono font-normal text-muted-foreground">{profile.insuranceNumber}</span>
                  )}
                </span>
                {profile?.insuranceNumber && (
                  <Button variant="ghost" size="icon" className="size-6" onClick={copyCard} aria-label="Copiar carteirinha">
                    <CopyIcon className="size-3.5" />
                  </Button>
                )}
              </dd>
            </div>
            {profile?.notes && <p className="col-span-2 whitespace-pre-line text-muted-foreground">{profile.notes}</p>}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function Item({ label, value, strong }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={strong && value ? 'text-xl font-semibold' : 'line-clamp-2 font-medium'}>{value || '—'}</dd>
    </div>
  )
}

function MedicationsCard({
  loading,
  data,
  onAdd,
  onOpen,
  onStop,
}: {
  loading: boolean
  data: PersonHealth
  onAdd: () => void
  onOpen: (medication: Medication) => void
  onStop: (medication: Medication) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medicamentos em uso</CardTitle>
        <CardDescription>
          {data.pastMedications.length ? `${data.pastMedications.length} encerrados no histórico` : 'Uso contínuo ou tratamentos atuais'}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={onAdd} disabled={loading}>
            <PlusIcon />
            Adicionar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : data.activeMedications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum medicamento em uso.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {data.activeMedications.map((medication) => (
              <li key={medication.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                <button type="button" onClick={() => onOpen(medication)} className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-sm font-medium">
                    {medication.name}
                    {medication.dosage && <span className="font-normal text-muted-foreground"> · {medication.dosage}</span>}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[medication.frequency, medication.startDate && `desde ${formatDate(medication.startDate)}`, medication.endDate && `até ${formatDate(medication.endDate)}`]
                      .filter(Boolean)
                      .join(' · ') || ' '}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                      <EllipsisVerticalIcon />
                      <span className="sr-only">Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onSelect={() => onOpen(medication)}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onStop(medication)}>Encerrar hoje</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
        {!loading && data.pastMedications.length > 0 && (
          <p className="mt-3 truncate text-xs text-muted-foreground">
            Encerrados:{' '}
            {data.pastMedications.map((m, i) => (
              <span key={m.id}>
                {i > 0 && ', '}
                <button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpen(m)}>
                  {m.name}
                </button>
              </span>
            ))}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function EntriesTable({
  loading,
  entries,
  onOpen,
  onDelete,
}: {
  loading: boolean
  entries: HealthEntry[]
  onOpen: (entry: HealthEntry) => void
  onDelete: (entry: HealthEntry) => void
}) {
  const now = today()

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="pl-4">Data</TableHead>
            <TableHead>Registro</TableHead>
            <TableHead className="hidden md:table-cell">Tipo</TableHead>
            <TableHead className="hidden lg:table-cell">Próxima data</TableHead>
            <TableHead className="hidden w-12 sm:table-cell" />
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            [0, 1, 2].map((i) => (
              <TableRow key={i}>
                <TableCell colSpan={6} className="px-4">
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                Nenhum registro ainda. Adicione consultas, exames e vacinas.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id} className="cursor-pointer" onClick={() => onOpen(entry)}>
                <TableCell className="pl-4 text-muted-foreground tabular-nums">{formatDate(entry.date)}</TableCell>
                <TableCell className="max-w-72">
                  <div className="flex flex-col">
                    <span className="truncate font-medium">{entry.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[entry.provider, entry.specialty].filter(Boolean).join(' · ') || ' '}
                      <span className="md:hidden">{` · ${ENTRY_KINDS[entry.kind]}`}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="px-1.5 text-muted-foreground">
                    {ENTRY_KINDS[entry.kind]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {entry.nextDate ? (
                    entry.nextDate >= now ? (
                      <Badge>{formatDate(entry.nextDate)}</Badge>
                    ) : (
                      <span className="text-muted-foreground tabular-nums">{formatDate(entry.nextDate)}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {entry.attachments.length > 0 && (
                    <span className="flex items-center gap-1 text-xs tabular-nums">
                      <PaperclipIcon className="size-3.5" />
                      {entry.attachments.length}
                    </span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                        <EllipsisVerticalIcon />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onSelect={() => onOpen(entry)}>Abrir</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(entry)}>
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
