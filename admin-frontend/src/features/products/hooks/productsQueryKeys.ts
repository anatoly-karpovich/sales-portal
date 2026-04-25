import type { ProductsQuery } from '@/api/modules/products.api'

const PRODUCTS_QUERY_KEY_BASE = ['products'] as const

export const productsQueryKeys = {
  all: PRODUCTS_QUERY_KEY_BASE,
  lists: () => [...PRODUCTS_QUERY_KEY_BASE, 'lists'] as const,
  list: (params: ProductsQuery) => [...productsQueryKeys.lists(), params] as const,
  details: () => [...PRODUCTS_QUERY_KEY_BASE, 'details'] as const,
  detail: (productId: string) => [...productsQueryKeys.details(), productId] as const,
}
