import { useCallback, useMemo } from 'react'
import { newSyncable, touch } from '@/domain/merge'
import type { Syncable } from '@/domain/types'
import { today } from '@/lib/format'
import { useCollection } from '@/storage/useCollection'
import {
  serviceTotal,
  vehicleLabel,
  type OdometerReading,
  type Service,
  type VehiclesData,
  type Vehicle,
} from './types'

const EMPTY: VehiclesData = { vehicles: [], services: [], readings: [] }

export type VehicleInput = Omit<Vehicle, keyof Syncable>
export type ServiceInput = Omit<Service, keyof Syncable | 'vehicleId'>

export interface VehicleSummary {
  vehicle: Vehicle
  /** Newest first */
  services: Service[]
  currentKm: { km: number; date: string } | undefined
  lastService: Service | undefined
  totalCost: number
  yearCost: number
}

/** Newest first: by date, then by when it was recorded. */
function byNewest(a: { date: string; updatedAt: string }, b: { date: string; updatedAt: string }): number {
  return b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
}

export function useVehicles() {
  const { data, loading, save } = useCollection('vehicles', EMPTY)

  const summaries = useMemo(() => {
    const year = today().slice(0, 4)
    const services = (data?.services ?? []).filter((s) => !s.deleted).sort(byNewest)
    const readings = (data?.readings ?? []).filter((r) => !r.deleted)

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
        return {
          vehicle,
          services: own,
          currentKm,
          lastService: own[0],
          totalCost: own.reduce((sum, s) => sum + serviceTotal(s), 0),
          yearCost: own.filter((s) => s.date.startsWith(year)).reduce((sum, s) => sum + serviceTotal(s), 0),
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
    (vehicle: Vehicle) =>
      save({
        vehicles: [touch(vehicle, { deleted: true })],
        services: (data?.services ?? []).filter((s) => s.vehicleId === vehicle.id && !s.deleted).map((s) => touch(s, { deleted: true })),
        readings: (data?.readings ?? []).filter((r) => r.vehicleId === vehicle.id && !r.deleted).map((r) => touch(r, { deleted: true })),
      }),
    [save, data],
  )

  const saveService = useCallback(
    (vehicleId: string, input: ServiceInput, existing?: Service) =>
      save({ services: [existing ? touch(existing, input) : { ...newSyncable(), vehicleId, ...input }] }),
    [save],
  )

  const deleteService = useCallback((service: Service) => save({ services: [touch(service, { deleted: true })] }), [save])

  const addReading = useCallback(
    (vehicleId: string, km: number, date: string) => {
      const reading: OdometerReading = { ...newSyncable(), vehicleId, km, date }
      return save({ readings: [reading] })
    },
    [save],
  )

  return { loading, summaries, createVehicle, updateVehicle, deleteVehicle, saveService, deleteService, addReading }
}
