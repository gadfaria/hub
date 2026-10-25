import { useCallback, useMemo } from 'react'
import { newSyncable, touch } from '@/domain/merge'
import type { Attachment, Syncable } from '@/domain/types'
import { today } from '@/lib/format'
import { useAttachments } from '@/storage/useAttachments'
import { useCollection } from '@/storage/useCollection'
import {
  serviceTotal,
  vehicleLabel,
  type InsurancePolicy,
  type OdometerReading,
  type Service,
  type VehiclesData,
  type Vehicle,
} from './types'

const EMPTY: VehiclesData = { vehicles: [], services: [], readings: [], policies: [] }

export type VehicleInput = Omit<Vehicle, keyof Syncable>
export type ServiceInput = Omit<Service, keyof Syncable | 'vehicleId' | 'attachments'>
export type PolicyInput = Omit<InsurancePolicy, keyof Syncable | 'vehicleId' | 'attachments'>

export interface VehicleSummary {
  vehicle: Vehicle
  /** Newest first */
  services: Service[]
  currentKm: { km: number; date: string } | undefined
  lastService: Service | undefined
  totalCost: number
  yearCost: number
  /** The policy covering today, or else the most recent one */
  currentPolicy: InsurancePolicy | undefined
  /** A renewal that starts after the current policy, if one was already registered */
  nextPolicy: InsurancePolicy | undefined
  /** Policies that already ended, newest first */
  pastPolicies: InsurancePolicy[]
}

/** Newest first: by date, then by when it was recorded. */
function byNewest(a: { date: string; updatedAt: string }, b: { date: string; updatedAt: string }): number {
  return b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
}

export function useVehicles() {
  const { data, loading, save } = useCollection('vehicles', EMPTY)
  const attachments = useAttachments('vehicles')

  const summaries = useMemo(() => {
    const year = today().slice(0, 4)
    const services = (data?.services ?? [])
      .filter((s) => !s.deleted)
      // Services saved before invoices existed have no attachments list.
      .map((s) => (s.attachments ? s : { ...s, attachments: [] }))
      .sort(byNewest)
    const readings = (data?.readings ?? []).filter((r) => !r.deleted)
    const now = today()
    const policies = (data?.policies ?? [])
      .filter((p) => !p.deleted)
      .sort((a, b) => b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate))

    return (data?.vehicles ?? [])
      .filter((v) => !v.deleted)
      .sort((a, b) => vehicleLabel(a).localeCompare(vehicleLabel(b)))
      .map((vehicle): VehicleSummary => {
        const own = services.filter((s) => s.vehicleId === vehicle.id)
        // The odometer only goes up, so the highest reading (service or manual) is the current km.
        const kmPoints = [
          ...own.filter((s) => s.km !== null).map((s) => ({ km: s.km as number, date: s.date })),
          ...readings.filter((r) => r.vehicleId === vehicle.id).map((r) => ({ km: r.km, date: r.date })),
        ]
        const currentKm = kmPoints.sort((a, b) => b.km - a.km || b.date.localeCompare(a.date))[0]
        const ownPolicies = policies.filter((p) => p.vehicleId === vehicle.id)
        const started = ownPolicies.filter((p) => p.startDate <= now)
        const upcoming = ownPolicies.filter((p) => p.startDate > now).sort((a, b) => a.startDate.localeCompare(b.startDate))
        // The policy covering today; otherwise the latest one that started; otherwise the first upcoming.
        const currentPolicy = started.find((p) => now <= p.endDate) ?? started[0] ?? upcoming[0]
        return {
          vehicle,
          services: own,
          currentKm,
          lastService: own[0],
          totalCost: own.reduce((sum, s) => sum + serviceTotal(s), 0),
          yearCost: own.filter((s) => s.date.startsWith(year)).reduce((sum, s) => sum + serviceTotal(s), 0),
          currentPolicy,
          nextPolicy: upcoming.find((p) => p !== currentPolicy),
          pastPolicies: started.filter((p) => p !== currentPolicy),
        }
      })
  }, [data])

  const createVehicle = useCallback(
    async (input: VehicleInput) => {
      const vehicle: Vehicle = { ...newSyncable(), ...input }
      return (await save({ vehicles: [vehicle] })) ? vehicle : null
    },
    [save],
  )

  const updateVehicle = useCallback(
    (vehicle: Vehicle, input: VehicleInput) => save({ vehicles: [touch(vehicle, input)] }),
    [save],
  )

  const deleteVehicle = useCallback(
    async (vehicle: Vehicle) => {
      const mine = <T extends { vehicleId: string; deleted: boolean }>(list: T[] = []) =>
        list.filter((x) => x.vehicleId === vehicle.id && !x.deleted)
      const policies = mine(data?.policies)
      const services = mine(data?.services)
      const ok = await save({
        vehicles: [touch(vehicle, { deleted: true })],
        services: services.map((s) => touch(s, { deleted: true })),
        readings: mine(data?.readings).map((r) => touch(r, { deleted: true })),
        policies: policies.map((p) => touch(p, { deleted: true })),
      })
      if (ok) {
        await attachments.trash([...policies.flatMap((p) => p.attachments), ...services.flatMap((s) => s.attachments ?? [])])
      }
      return ok
    },
    [save, data, attachments],
  )

  /** Uploads new files first, saves the service, then trashes the files removed from it. */
  const saveService = useCallback(
    async (vehicleId: string, input: ServiceInput, newFiles: File[], removed: Attachment[], existing?: Service) => {
      const uploaded = newFiles.length ? await attachments.upload(newFiles) : []
      if (uploaded === null) return false
      const removedIds = new Set(removed.map((a) => a.id))
      const kept = (existing?.attachments ?? []).filter((a) => !removedIds.has(a.id))
      const next = { ...input, attachments: [...kept, ...uploaded] }
      const ok = await save({ services: [existing ? touch(existing, next) : { ...newSyncable(), vehicleId, ...next }] })
      if (ok && removed.length) await attachments.trash(removed)
      return ok
    },
    [save, attachments],
  )

  const deleteService = useCallback(
    async (service: Service) => {
      const ok = await save({ services: [touch(service, { deleted: true })] })
      if (ok) await attachments.trash(service.attachments ?? [])
      return ok
    },
    [save, attachments],
  )

  const addReading = useCallback(
    (vehicleId: string, km: number, date: string) => {
      const reading: OdometerReading = { ...newSyncable(), vehicleId, km, date }
      return save({ readings: [reading] })
    },
    [save],
  )

  /** Uploads new files first, saves the policy, then trashes the files removed from it. */
  const savePolicy = useCallback(
    async (vehicleId: string, input: PolicyInput, newFiles: File[], removed: Attachment[], existing?: InsurancePolicy) => {
      const uploaded = newFiles.length ? await attachments.upload(newFiles) : []
      if (uploaded === null) return false
      const removedIds = new Set(removed.map((a) => a.id))
      const kept = (existing?.attachments ?? []).filter((a) => !removedIds.has(a.id))
      const next = { ...input, attachments: [...kept, ...uploaded] }
      const ok = await save({
        policies: [existing ? touch(existing, next) : { ...newSyncable(), vehicleId, ...next }],
      })
      if (ok && removed.length) await attachments.trash(removed)
      return ok
    },
    [save, attachments],
  )

  const deletePolicy = useCallback(
    async (policy: InsurancePolicy) => {
      const ok = await save({ policies: [touch(policy, { deleted: true })] })
      if (ok) await attachments.trash(policy.attachments)
      return ok
    },
    [save, attachments],
  )

  return {
    loading,
    summaries,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    saveService,
    deleteService,
    addReading,
    savePolicy,
    deletePolicy,
  }
}
