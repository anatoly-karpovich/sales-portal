import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCustomers } from '@/api/modules/customers.api'
import {
  createOrder,
  exportOrders,
  getOrderById,
  getOrders,
  updateOrder,
  updateOrderStatus,
  type UpdateOrderPayload,
  type CreateOrderPayload,
  type OrderStatusUpdatePayload,
  type OrdersExportPayload,
  type OrdersQuery,
} from '@/api/modules/orders.api'
import type { ApiRequestConfig } from '@/api/types'
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

export function useOrderDetailsQuery(orderId: string, enabled = true) {
  return useQuery({
    queryKey: ordersQueryKeys.detail(orderId),
    queryFn: () => getOrderById(orderId),
    enabled,
  })
}

export function useOrderCustomerOptionsQuery(search: string, enabled = true) {
  return useQuery({
    queryKey: ordersQueryKeys.customerOptions(search),
    queryFn: () =>
      getCustomers({
        search,
        country: [],
        sortField: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      }),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}

export function useOrderStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: OrderStatusUpdatePayload) => updateOrderStatus(orderId, status),
    onSuccess: async (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: ordersQueryKeys.detail(variables.orderId) })
    },
  })
}

export function useUpdateOrderMutation() {
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
      requestConfig,
    }: {
      orderId: string
      payload: UpdateOrderPayload
      requestConfig?: ApiRequestConfig
    }) => updateOrder(orderId, payload, requestConfig),
  })
}
