import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  exportProducts,
  getProductById,
  getProducts,
  updateProduct,
  type ProductExportPayload,
  type ProductUpsertPayload,
  type ProductsQuery,
} from '@/api/modules/products.api'
import { productsQueryKeys } from '@/features/products/hooks/productsQueryKeys'

export function useProductsQuery(query: ProductsQuery) {
  return useQuery({
    queryKey: productsQueryKeys.list(query),
    queryFn: () => getProducts(query),
    placeholderData: (previousData) => previousData,
  })
}

export function useProductsExportMutation() {
  return useMutation({
    mutationFn: (payload: ProductExportPayload) => exportProducts(payload),
  })
}

export function useProductQuery(productId: string, enabled = true) {
  return useQuery({
    queryKey: productsQueryKeys.detail(productId),
    queryFn: () => getProductById(productId),
    enabled,
  })
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductUpsertPayload) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKeys.all })
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: ProductUpsertPayload }) => updateProduct(productId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKeys.all })
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsQueryKeys.all })
    },
  })
}
