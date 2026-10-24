import type { Syncable } from '@/domain/types'

export const VEHICLE_TYPES = {
  car: 'Carro',
  motorcycle: 'Moto',
  other: 'Outro',
} as const

export type VehicleType = keyof typeof VEHICLE_TYPES

export const SERVICE_TYPES = {
  service: 'Revisão',
  parts: 'Troca de peças',
  repair: 'Reparo',
  other: 'Outro',
} as const

export type ServiceType = keyof typeof SERVICE_TYPES

export interface Vehicle extends Syncable {
  /** Optional nickname, e.g. "Civic preto". Falls back to brand + model. */
  name: string
  type: VehicleType
  brand: string
  model: string
  /** Free text, e.g. "2019/2020" */
  year: string
  plate: string
  color: string
  renavam: string
  chassis: string
  notes: string
}

export interface Part {
  name: string
  quantity: number
  /** Price per unit, in cents */
  unitCost: number
}

/** A visit to the workshop: a scheduled service, a repair, a part swap… */
export interface Service extends Syncable {
  vehicleId: string
  /** YYYY-MM-DD */
  date: string
  /** Odometer at the time of the service, when known */
  km: number | null
  type: ServiceType
  title: string
  workshop: string
  /** Labor cost, in cents */
  laborCost: number
  parts: Part[]
  notes: string
}

/** A standalone odometer reading, to keep the current km up to date between services. */
export interface OdometerReading extends Syncable {
  vehicleId: string
  date: string
  km: number
}

export type VehiclesData = {
  vehicles: Vehicle[]
  services: Service[]
  readings: OdometerReading[]
}

export function vehicleLabel(vehicle: Pick<Vehicle, 'name' | 'brand' | 'model'>): string {
  return vehicle.name.trim() || `${vehicle.brand} ${vehicle.model}`.trim() || 'Veículo'
}

export function serviceTotal(service: Pick<Service, 'laborCost' | 'parts'>): number {
  return service.laborCost + service.parts.reduce((sum, p) => sum + p.quantity * p.unitCost, 0)
}
