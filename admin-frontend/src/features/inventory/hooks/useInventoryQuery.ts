import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInventoryAdjustment,
  getInventory,
  getInventoryByProductId,
  type InventoryDetails,
  type InventoryAdjustmentCreatePayload,
  type InventoryVariantSettingsPatchPayload,
  type InventoryQuery,
  updateInventoryVariantSettings,
} from '@/api/modules/inventory.api'
import { inventoryQueryKeys } from '@/features/inventory/hooks/inventoryQueryKeys'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'

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

export function useInventoryAdjustStockMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InventoryAdjustmentCreatePayload) => createInventoryAdjustment(payload),
    onSuccess: (updatedInventory, variables) => {
      queryClient.setQueryData<InventoryDetails>(
        inventoryQueryKeys.detail(variables.productId),
        updatedInventory,
      )
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
    },
  })
}

export function useInventoryUpdateVariantSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InventoryVariantSettingsPatchPayload) =>
      updateInventoryVariantSettings(payload),
    onSuccess: (updatedInventory, variables) => {
      queryClient.setQueryData<InventoryDetails>(
        inventoryQueryKeys.detail(variables.productId),
        updatedInventory,
      )
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
    },
  })
}
