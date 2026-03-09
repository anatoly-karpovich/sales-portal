import { useMutation, useQuery } from '@tanstack/react-query'
import { exportProducts, getProducts, type ProductExportPayload, type ProductsQuery } from '@/api/modules/products.api'

export function useProductsQuery(query: ProductsQuery) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: () => getProducts(query),
    placeholderData: (previousData) => previousData,
  })
}

export function useProductsExportMutation() {
  return useMutation({
    mutationFn: (payload: ProductExportPayload) => exportProducts(payload),
  })
}
