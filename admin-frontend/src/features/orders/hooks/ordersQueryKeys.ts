import type { OrdersQuery } from '@/api/modules/orders.api'

const ORDERS_QUERY_KEY_BASE = ['orders'] as const

export const ordersQueryKeys = {
  all: ORDERS_QUERY_KEY_BASE,
  lists: () => [...ORDERS_QUERY_KEY_BASE, 'lists'] as const,
  list: (params: OrdersQuery) => [...ordersQueryKeys.lists(), params] as const,
  details: () => [...ORDERS_QUERY_KEY_BASE, 'details'] as const,
  detail: (orderId: string) => [...ordersQueryKeys.details(), orderId] as const,
  customerOptions: (search: string) => [...ORDERS_QUERY_KEY_BASE, 'customer-options', search] as const,
  productOptions: (search: string) => [...ORDERS_QUERY_KEY_BASE, 'product-options', search] as const,
  productAvailability: (productId: string) =>
    [...ORDERS_QUERY_KEY_BASE, 'product-availability', productId] as const,
}
