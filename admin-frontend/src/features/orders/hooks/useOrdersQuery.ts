import { isAxiosError } from 'axios'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCustomers } from '@/api/modules/customers.api'
import { getProductById, getProducts } from '@/api/modules/products.api'
import { getManagers } from '@/api/modules/managers.api'
import {
  assignOrderManager,
  calculateOrderPricing,
  createOrderComment,
  createOrder,
  deleteOrderComment,
  exportOrders,
  getOrderById,
  getOrders,
  receiveOrderProducts,
  unassignOrderManager,
  updateOrderDelivery,
  updateOrderPickup,
  updateOrder,
  updateOrderStatus,
  type OrderDetails,
  type OrderAssignManagerPayload,
  type OrderCommentCreatePayload,
  type OrderCommentDeletePayload,
  type OrderDeliveryUpdatePayload,
  type OrderPickupUpdatePayload,
  type OrderUnassignManagerPayload,
  type OrderReceivePayload,
  type UpdateOrderPayload,
  type CreateOrderPayload,
  type OrderStatusUpdatePayload,
  type OrderPricingPayload,
  type OrdersExportPayload,
  type OrdersQuery,
} from '@/api/modules/orders.api'
import type { ApiRequestConfig } from '@/api/types'
import { ORDER_DETAILS_PRODUCT_SEARCH_LIMIT } from '@/features/orders/config/orderDetails.config'
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
        state: [],
        sortField: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      }),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useOrderProductOptionsQuery(search: string, enabled = true) {
  return useQuery({
    queryKey: ordersQueryKeys.productOptions(search),
    queryFn: () =>
      getProducts({
        search,
        manufacturer: [],
        status: ['Active'],
        sortField: 'name',
        sortOrder: 'asc',
        page: 1,
        limit: ORDER_DETAILS_PRODUCT_SEARCH_LIMIT,
      }),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useOrderProductDetailsQuery(productId: string, enabled = true) {
  return useQuery({
    queryKey: ordersQueryKeys.productDetails(productId),
    queryFn: () => getProductById(productId),
    enabled,
  })
}

export function useOrderProductsDetailsQueries(productIds: string[], enabled = true) {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))]

  return useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: ordersQueryKeys.productDetails(productId),
      queryFn: () => getProductById(productId),
      enabled,
      retry: false,
      staleTime: 60_000,
    })),
  })
}

export function useOrderManagerOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: ordersQueryKeys.managerOptions(),
    queryFn: () => getManagers(),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function useOrderProductsAvailability(productIds: string[], enabled = true) {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))]
  const queries = useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: ordersQueryKeys.productAvailability(productId),
      queryFn: () => getProductById(productId),
      enabled,
      retry: false,
      staleTime: 60_000,
    })),
  })

  const unavailableIds = new Set<string>()
  let isLoading = false

  queries.forEach((query, index) => {
    if (query.isPending || query.isFetching) {
      isLoading = true
      return
    }

    if (query.isError && isAxiosError(query.error) && query.error.response?.status === 404) {
      unavailableIds.add(uniqueProductIds[index])
    }
  })

  return { unavailableIds, isLoading }
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

export function useOrderPricingMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      requestConfig,
    }: {
      payload: OrderPricingPayload
      requestConfig?: ApiRequestConfig
    }) => calculateOrderPricing(payload, requestConfig),
  })
}

export function useOrderStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status, requestConfig }: OrderStatusUpdatePayload) =>
      updateOrderStatus(orderId, status, requestConfig),
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient()
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
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}

export function useCreateOrderCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      comment,
      requestConfig,
    }: OrderCommentCreatePayload & { requestConfig?: ApiRequestConfig }) =>
      createOrderComment(orderId, comment, requestConfig),
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
    },
  })
}

export function useDeleteOrderCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      commentId,
      requestConfig,
    }: OrderCommentDeletePayload & { requestConfig?: ApiRequestConfig }) =>
      deleteOrderComment(orderId, commentId, requestConfig),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ordersQueryKeys.detail(variables.orderId) })
    },
  })
}

export function useReceiveOrderProductsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, products, requestConfig }: OrderReceivePayload) =>
      receiveOrderProducts(orderId, products, requestConfig),
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}

export function useUpdateOrderDeliveryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      delivery,
      requestConfig,
    }: OrderDeliveryUpdatePayload & { requestConfig?: ApiRequestConfig }) =>
      updateOrderDelivery(orderId, delivery, requestConfig),
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}

export function useUpdateOrderPickupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      pickup,
      requestConfig,
    }: OrderPickupUpdatePayload & { requestConfig?: ApiRequestConfig }) =>
      updateOrderPickup(orderId, pickup, requestConfig),
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}

export function useAssignOrderManagerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, managerId, requestConfig }: OrderAssignManagerPayload) =>
      assignOrderManager(orderId, managerId, requestConfig),
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}

export function useUnassignOrderManagerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, requestConfig }: OrderUnassignManagerPayload) =>
      unassignOrderManager(orderId, requestConfig),
    onSuccess: (updatedOrder, variables) => {
      queryClient.setQueryData<OrderDetails>(
        ordersQueryKeys.detail(variables.orderId),
        updatedOrder,
      )
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() })
    },
  })
}
