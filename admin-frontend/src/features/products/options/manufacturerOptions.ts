import { MANUFACTURERS } from '@/constants/dictionaries'

type ManufacturerValue = (typeof MANUFACTURERS)[number]

export function getManufacturerOptions() {
  return [...MANUFACTURERS]
}

export function getDefaultManufacturer() {
  return MANUFACTURERS[0]
}

export function isManufacturerOption(value: string) {
  return MANUFACTURERS.includes(value as ManufacturerValue)
}
