import { useSnackbar } from 'notistack'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ProductUpsertPayload } from '@/api/modules/products.api'
import { ProductCreateVariantsForm } from '@/features/products/components/ProductCreateVariantsForm'
import { useCreateProductMutation } from '@/features/products/hooks/useProductsQuery'
import { getProductApiErrorMessage, productsUiText } from '@/features/products/products.ui-text'

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

export function ProductUpsertPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const createMutation = useCreateProductMutation()

  const handleCreate = useCallback(
    async (payload: ProductUpsertPayload) => {
      try {
        await createMutation.mutateAsync(payload)
        enqueueSnackbar(productsUiText.toasts.created, { variant: 'success' })
        navigate('/products')
      } catch (error) {
        enqueueSnackbar(getProductApiErrorMessage(getErrorStatus(error)), { variant: 'error' })
      }
    },
    [createMutation, enqueueSnackbar, navigate],
  )

  return (
    <ProductCreateVariantsForm isSubmitting={createMutation.isPending} onSubmit={handleCreate} />
  )
}
