import type { InventoryQuery } from '@/api/modules/inventory.api'

const INVENTORY_QUERY_KEY_BASE = ['inventory'] as const

export const inventoryQueryKeys = {
  all: INVENTORY_QUERY_KEY_BASE,
  lists: () => [...INVENTORY_QUERY_KEY_BASE, 'lists'] as const,
  list: (params: InventoryQuery) => [...inventoryQueryKeys.lists(), params] as const,
}
