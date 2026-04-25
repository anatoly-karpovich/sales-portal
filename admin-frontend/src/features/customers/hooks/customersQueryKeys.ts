import type { CustomersQuery } from '@/api/modules/customers.api'

const CUSTOMERS_QUERY_KEY_BASE = ['customers'] as const

export const customersQueryKeys = {
  all: CUSTOMERS_QUERY_KEY_BASE,
  lists: () => [...CUSTOMERS_QUERY_KEY_BASE, 'lists'] as const,
  list: (params: CustomersQuery) => [...customersQueryKeys.lists(), params] as const,
  details: () => [...CUSTOMERS_QUERY_KEY_BASE, 'details'] as const,
  detail: (customerId: string) => [...customersQueryKeys.details(), customerId] as const,
  orders: () => [...CUSTOMERS_QUERY_KEY_BASE, 'orders'] as const,
  orderList: (customerId: string) => [...customersQueryKeys.orders(), customerId] as const,
}
