import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrder,
  exportOrders,
  getOrders,
  updateOrderStatus,
  type CreateOrderPayload,
  type OrderStatusUpdatePayload,
  type OrdersExportPayload,
  type OrdersQuery,
} from '@/api/modules/orders.api'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'

export function useOrdersQuery(query: OrdersQuery) {
  return useQuery({
    queryKey: ordersQueryKeys.list(query),
    queryFn: () => getOrders(query),
    placeholderData: (previousData) => previousData,
  })
}

export function useOrdersExportMutation() {
  return useMutation({
    mutationFn: (payload: OrdersExportPayload) => exportOrders(payload),
  })
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
    },
  })
}

export function useOrderStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: OrderStatusUpdatePayload) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
    },
  })
}
