import { useQuery } from '@tanstack/react-query'
import {
  getInventory,
  getInventoryByProductId,
  type InventoryQuery,
} from '@/api/modules/inventory.api'
import { inventoryQueryKeys } from '@/features/inventory/hooks/inventoryQueryKeys'

export function useInventoryQuery(query: InventoryQuery) {
  return useQuery({
    queryKey: inventoryQueryKeys.list(query),
    queryFn: () => getInventory(query),
    placeholderData: (previousData) => previousData,
  })
}

export function useInventoryDetailsQuery(productId: string, enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.detail(productId),
    queryFn: () => getInventoryByProductId(productId),
    enabled,
  })
}
