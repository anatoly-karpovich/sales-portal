import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addProductVariants,
  completeProductSetup,
  deleteProduct,
  deleteProductVariant,
  exportProducts,
  getProductById,
  getProducts,
  initProductSetup,
  patchProduct,
  patchProductStatus,
  patchProductVariant,
  patchProductVariantStatus,
  replaceProductVariants,
  saveProductSetupSpec,
  updateProduct,
  type ProductExportPayload,
  type ProductParentPatchPayload,
  type ProductSetupInitPayload,
  type ProductSetupSpecPayload,
  type ProductStatusPatchPayload,
  type ProductUpsertPayload,
  type ProductVariantCreatePayload,
  type ProductVariantPatchPayload,
  type ProductVariantReplaceRequestPayload,
  type ProductsQuery,
} from '@/api/modules/products.api'
import { inventoryQueryKeys } from '@/features/inventory/hooks/inventoryQueryKeys'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'
import { productsQueryKeys } from '@/features/products/hooks/productsQueryKeys'

type ProductDetailsData = Awaited<ReturnType<typeof getProductById>>

function syncProductMutationResult(params: {
  queryClient: ReturnType<typeof useQueryClient>
  productId: string
  product: ProductDetailsData
}) {
  params.queryClient.setQueryData(productsQueryKeys.detail(params.productId), params.product)
  void params.queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
  void params.queryClient.invalidateQueries({
    queryKey: inventoryQueryKeys.detail(params.productId),
  })
  void params.queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lists() })
  void params.queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
}

function invalidateProductRelatedDomainCaches(params: {
  queryClient: ReturnType<typeof useQueryClient>
  productId?: string
}) {
  if (params.productId) {
    void params.queryClient.invalidateQueries({
      queryKey: inventoryQueryKeys.detail(params.productId),
    })
  }
  void params.queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.lists() })
  void params.queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all })
}

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

export function useInitProductSetupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductSetupInitPayload) => initProductSetup(payload),
    onSuccess: (product) => {
      syncProductMutationResult({
        queryClient,
        productId: product._id,
        product,
      })
    },
  })
}

export function useSaveProductSetupSpecMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string
      payload: ProductSetupSpecPayload
    }) => saveProductSetupSpec(productId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function useCompleteProductSetupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => completeProductSetup(productId),
    onSuccess: (product) => {
      syncProductMutationResult({
        queryClient,
        productId: product._id,
        product,
      })
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: ProductUpsertPayload }) =>
      updateProduct(productId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: (_, deletedProductId) => {
      queryClient.removeQueries({
        queryKey: productsQueryKeys.detail(deletedProductId),
        exact: true,
      })
      void queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
      invalidateProductRelatedDomainCaches({ queryClient, productId: deletedProductId })
    },
  })
}

export function usePatchProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string
      payload: ProductParentPatchPayload
    }) => patchProduct(productId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function useAddProductVariantsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string
      payload: ProductVariantCreatePayload[]
    }) => addProductVariants(productId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function useReplaceProductVariantsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string
      payload: ProductVariantReplaceRequestPayload
    }) => replaceProductVariants(productId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function usePatchProductStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string
      payload: ProductStatusPatchPayload
    }) => patchProductStatus(productId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function usePatchProductVariantStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      payload,
    }: {
      productId: string
      variantId: string
      payload: ProductStatusPatchPayload
    }) => patchProductVariantStatus(productId, variantId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function usePatchProductVariantMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      payload,
    }: {
      productId: string
      variantId: string
      payload: ProductVariantPatchPayload
    }) => patchProductVariant(productId, variantId, payload),
    onSuccess: (product, variables) => {
      syncProductMutationResult({
        queryClient,
        productId: variables.productId,
        product,
      })
    },
  })
}

export function useDeleteProductVariantMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      deleteProductVariant(productId, variantId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(variables.productId),
      })
      void queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() })
      invalidateProductRelatedDomainCaches({
        queryClient,
        productId: variables.productId,
      })
    },
  })
}
