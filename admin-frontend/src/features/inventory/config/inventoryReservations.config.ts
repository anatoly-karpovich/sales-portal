import type {
  InventoryReservationsSortField,
  InventoryReservationsSortOrder,
} from '@/api/modules/inventory.api'

export type InventoryReservationsSortOption = {
  value: string
  label: string
  sortField: InventoryReservationsSortField
  sortOrder: InventoryReservationsSortOrder
}

export const INVENTORY_RESERVATIONS_DEFAULT_SORT: InventoryReservationsSortOption = {
  value: 'createdOn:desc',
  label: 'Created On (Newest)',
  sortField: 'createdOn',
  sortOrder: 'desc',
}

export const INVENTORY_RESERVATIONS_SORT_OPTIONS: InventoryReservationsSortOption[] = [
  INVENTORY_RESERVATIONS_DEFAULT_SORT,
  {
    value: 'createdOn:asc',
    label: 'Created On (Oldest)',
    sortField: 'createdOn',
    sortOrder: 'asc',
  },
  {
    value: 'expiresAt:desc',
    label: 'Expires At (Newest)',
    sortField: 'expiresAt',
    sortOrder: 'desc',
  },
  {
    value: 'expiresAt:asc',
    label: 'Expires At (Oldest)',
    sortField: 'expiresAt',
    sortOrder: 'asc',
  },
]

const SORT_OPTIONS_BY_VALUE = new Map(
  INVENTORY_RESERVATIONS_SORT_OPTIONS.map((option) => [option.value, option]),
)

export function resolveInventoryReservationsSortValue(
  sortField: InventoryReservationsSortField,
  sortOrder: InventoryReservationsSortOrder,
) {
  return `${sortField}:${sortOrder}`
}

export function parseInventoryReservationsSortValue(value: string) {
  return SORT_OPTIONS_BY_VALUE.get(value) ?? INVENTORY_RESERVATIONS_DEFAULT_SORT
}

export function resolveInventoryReservationsSortLabel(
  sortField: InventoryReservationsSortField,
  sortOrder: InventoryReservationsSortOrder,
) {
  return (
    INVENTORY_RESERVATIONS_SORT_OPTIONS.find(
      (option) => option.sortField === sortField && option.sortOrder === sortOrder,
    )?.label ?? INVENTORY_RESERVATIONS_DEFAULT_SORT.label
  )
}

