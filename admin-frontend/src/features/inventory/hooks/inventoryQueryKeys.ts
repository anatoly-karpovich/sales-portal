import type { InventoryQuery } from '@/api/modules/inventory.api'

const INVENTORY_QUERY_KEY_BASE = ['inventory'] as const

export const inventoryQueryKeys = {
  all: INVENTORY_QUERY_KEY_BASE,
  lists: () => [...INVENTORY_QUERY_KEY_BASE, 'lists'] as const,
  list: (params: InventoryQuery) => [...inventoryQueryKeys.lists(), params] as const,
  details: () => [...INVENTORY_QUERY_KEY_BASE, 'details'] as const,
  detail: (productId: string) => [...inventoryQueryKeys.details(), productId] as const,
  histories: () => [...INVENTORY_QUERY_KEY_BASE, 'histories'] as const,
  historyByProduct: (productId: string, params: Record<string, unknown>) =>
    [...inventoryQueryKeys.histories(), 'product', productId, params] as const,
  historyByVariant: (productId: string, variantId: string, params: Record<string, unknown>) =>
    [...inventoryQueryKeys.histories(), 'variant', productId, variantId, params] as const,
}
