import type { Settings } from '@/api/modules/settings.api'

export type PickupAddress = {
  city: string
  street: string
  house: string
  flat: string
}

export type PickupLocationsMap = Map<string, PickupAddress>

export function normalizeCityForMatch(value: string) {
  return value.trim().toLowerCase()
}

export function buildPickupLocationsMap(
  pickupAddresses: Settings['delivery']['pickupAddresses'] | null | undefined,
): PickupLocationsMap {
  const map: PickupLocationsMap = new Map()
  if (!pickupAddresses) {
    return map
  }

  for (const [city, address] of Object.entries(pickupAddresses)) {
    const key = normalizeCityForMatch(city)
    if (!key) continue
    map.set(key, {
      city,
      street: address.street,
      house: String(address.house),
      flat: String(address.flat),
    })
  }

  return map
}

export function resolvePickupAddressByCity(
  pickupLocationsMap: PickupLocationsMap,
  city: string,
): PickupAddress | null {
  return pickupLocationsMap.get(normalizeCityForMatch(city)) ?? null
}

export function resolvePickupCityOptions(
  defaultCities: readonly string[],
  pickupLocationsMap: PickupLocationsMap,
): string[] {
  return defaultCities
    .map((city) => resolvePickupAddressByCity(pickupLocationsMap, city)?.city ?? null)
    .filter((city): city is string => Boolean(city))
}
