export type PickupAddress = {
  city: string
  street: string
  house: string
  flat: string
}

export const US_PICKUP_LOCATIONS: PickupAddress[] = [
  {
    city: 'Jefferson City',
    street: 'John Daniel Drive',
    house: '381',
    flat: '2',
  },
]

export function getDefaultUsPickupLocation(): PickupAddress {
  const [defaultLocation] = US_PICKUP_LOCATIONS
  return { ...defaultLocation }
}
