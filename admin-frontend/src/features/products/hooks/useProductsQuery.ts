import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  exportProducts,
  getProducts,
  updateProduct,
  type ProductExportPayload,
  type ProductUpsertPayload,
  type ProductsQuery,
} from '@/api/modules/products.api'

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

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductUpsertPayload) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: ProductUpsertPayload }) => updateProduct(productId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
