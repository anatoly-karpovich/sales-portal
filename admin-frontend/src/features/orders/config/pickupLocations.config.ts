import type { Settings } from '@/api/modules/settings.api'

export type PickupLocationAddress = {
  street: string
  house: string
  apartment: string
  zipCode: string
}

export type PickupLocation = {
  id: string
  state: string
  city: string
  address: PickupLocationAddress
}

export type PickupLocationsByStateMap = Map<string, PickupLocation[]>

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeCityForMatch(value: string) {
  return normalizeKey(value)
}

export function buildPickupLocationsByStateMap(
  pickupLocations: Settings['shipping']['pickup']['locations'] | null | undefined,
): PickupLocationsByStateMap {
  const map: PickupLocationsByStateMap = new Map()
  if (!pickupLocations) {
    return map
  }

  for (const [stateCode, locations] of Object.entries(pickupLocations)) {
    if (!Array.isArray(locations) || locations.length === 0) continue

    const activeLocations = locations
      .filter((location) => location.isActive)
      .map((location) => ({
        id: location.id,
        state: stateCode,
        city: location.city,
        address: {
          street: location.address.street,
          house: String(location.address.house),
          apartment: location.address.apartment ? String(location.address.apartment) : '',
          zipCode: location.address.zipCode,
        },
      }))
      .sort((left, right) => left.city.localeCompare(right.city))

    if (activeLocations.length === 0) continue
    map.set(stateCode, activeLocations)
  }

  return map
}

export function resolvePickupStates(pickupLocationsMap: PickupLocationsByStateMap) {
  return [...pickupLocationsMap.keys()].sort((left, right) => left.localeCompare(right))
}

export function resolvePickupCitiesByState(
  pickupLocationsMap: PickupLocationsByStateMap,
  state: string,
) {
  return (pickupLocationsMap.get(state) ?? []).map((location) => location.city)
}

export function resolvePickupLocation(
  pickupLocationsMap: PickupLocationsByStateMap,
  state: string,
  city: string,
): PickupLocation | null {
  const locations = pickupLocationsMap.get(state) ?? []
  const normalizedCity = normalizeKey(city)
  return locations.find((location) => normalizeKey(location.city) === normalizedCity) ?? null
}
