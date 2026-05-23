import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInventoryAdjustment,
  getInventoryAdjustmentsByProduct,
  getInventoryAdjustmentsByVariant,
  getInventory,
  getInventoryByProductId,
  getInventoryReservations,
  saveInitialInventory,
  type InventoryAdjustmentsQuery,
  type InventoryDetails,
  type InventoryAdjustmentCreatePayload,
  type InventoryInitialSetupPayload,
  type InventoryReservationsQuery,
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

export function useInventoryReservationsQuery(query: InventoryReservationsQuery) {
  return useQuery({
    queryKey: inventoryQueryKeys.reservationsList(query),
    queryFn: () => getInventoryReservations(query),
    placeholderData: (previousData) => previousData,
  })
}

export function useInventoryAdjustmentsByProductQuery(
  productId: string,
  query: InventoryAdjustmentsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: inventoryQueryKeys.historyByProduct(productId, query),
    queryFn: () => getInventoryAdjustmentsByProduct(productId, query),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useInventoryAdjustmentsByVariantQuery(
  productId: string,
  variantId: string,
  query: InventoryAdjustmentsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: inventoryQueryKeys.historyByVariant(productId, variantId, query),
    queryFn: () => getInventoryAdjustmentsByVariant(productId, variantId, query),
    enabled,
    placeholderData: (previousData) => previousData,
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
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.histories() })
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
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.histories() })
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
    },
  })
}

export function useInventoryInitialSetupMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string
      payload: InventoryInitialSetupPayload
    }) => saveInitialInventory(productId, payload),
    onSuccess: (updatedInventory, variables) => {
      queryClient.setQueryData<InventoryDetails>(
        inventoryQueryKeys.detail(variables.productId),
        updatedInventory,
      )
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.histories() })
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
    },
  })
}
