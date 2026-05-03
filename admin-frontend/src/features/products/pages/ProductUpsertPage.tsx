import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'
import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ProductUpsertPayload } from '@/api/modules/products.api'
import { ProductCreateVariantsForm } from '@/features/products/components/ProductCreateVariantsForm'
import { ProductForm } from '@/features/products/components/ProductForm'
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductQuery,
  useUpdateProductMutation,
} from '@/features/products/hooks/useProductsQuery'
import { productsUiText } from '@/features/products/products.ui-text'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
}

function ProductUpsertSkeleton() {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="products-upsert-page-skeleton">
      <Stack spacing={2} data-testid="products-upsert-page-skeleton-content">
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="text" width={260} height={50} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
        </Box>
        <Skeleton variant="rounded" height={140} />
        <Stack direction="row" justifyContent="space-between">
          <Skeleton variant="rounded" width={140} height={36} />
          <Skeleton variant="rounded" width={140} height={36} />
        </Stack>
      </Stack>
    </Paper>
  )
}

export function ProductUpsertPage({ mode }: Props) {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const deleteMutation = useDeleteProductMutation()

  const shouldLoadProduct = mode === 'edit' && Boolean(productId)
  const { data: product, isLoading } = useProductQuery(productId ?? '', shouldLoadProduct)
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const handleCreate = useCallback(
    async (payload: ProductUpsertPayload) => {
      await createMutation.mutateAsync(payload)
      enqueueSnackbar(productsUiText.toasts.created, { variant: 'success' })
      navigate('/products')
    },
    [createMutation, enqueueSnackbar, navigate],
  )

  const handleUpdate = useCallback(
    async (payload: ProductUpsertPayload) => {
      if (!productId) return
      await updateMutation.mutateAsync({ productId, payload })
      enqueueSnackbar(productsUiText.toasts.updated, { variant: 'success' })
      navigate('/products')
    },
    [enqueueSnackbar, navigate, productId, updateMutation],
  )

  const handleDelete = useCallback(async () => {
    if (!productId) return
    await deleteMutation.mutateAsync(productId)
    enqueueSnackbar(productsUiText.toasts.deleted, { variant: 'success' })
    navigate('/products')
  }, [deleteMutation, enqueueSnackbar, navigate, productId])

  if (mode === 'create') {
    return (
      <ProductCreateVariantsForm
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
      />
    )
  }

  if (!productId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="products-edit-page-missing-id">
        <Typography color="error" data-testid="products-edit-page-missing-id-error-text">{productsUiText.errors.missingProductId}</Typography>
      </Paper>
    )
  }

  if (isLoading || !product) {
    return <ProductUpsertSkeleton />
  }

  return (
    <ProductForm
      key={product._id}
      mode="edit"
      product={product}
      isSubmitting={isSubmitting}
      isDeleting={deleteMutation.isPending}
      onSubmit={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
