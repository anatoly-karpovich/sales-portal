import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'
import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CustomerUpsertPayload } from '@/api/modules/customers.api'
import { CustomerForm } from '@/features/customers/components/CustomerForm'
import {
  useCreateCustomerMutation,
  useCustomerQuery,
  useDeleteCustomerMutation,
  useUpdateCustomerMutation,
} from '@/features/customers/hooks/useCustomersQuery'
import { customersUiText } from '@/features/customers/customers.ui-text'

type Mode = 'create' | 'edit'

type Props = {
  mode: Mode
}

function CustomerUpsertSkeleton() {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="customers-upsert-page-skeleton">
      <Stack spacing={2} data-testid="customers-upsert-page-skeleton-content">
        <Skeleton variant="text" width={120} height={24} />
        <Skeleton variant="text" width={260} height={50} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
        </Box>
        <Skeleton variant="rounded" height={140} />
        <Stack direction="row" justifyContent="space-between">
          <Skeleton variant="rounded" width={160} height={36} />
          <Skeleton variant="rounded" width={140} height={36} />
        </Stack>
      </Stack>
    </Paper>
  )
}

export function CustomerUpsertPage({ mode }: Props) {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const createMutation = useCreateCustomerMutation()
  const updateMutation = useUpdateCustomerMutation()
  const deleteMutation = useDeleteCustomerMutation()
  const shouldLoadCustomer = mode === 'edit' && Boolean(customerId)
  const { data: customer, isLoading } = useCustomerQuery(customerId ?? '', shouldLoadCustomer)

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const handleCreate = useCallback(
    async (payload: CustomerUpsertPayload) => {
      await createMutation.mutateAsync(payload)
      enqueueSnackbar(customersUiText.toasts.created, { variant: 'success' })
      navigate('/customers')
    },
    [createMutation, enqueueSnackbar, navigate],
  )

  const handleUpdate = useCallback(
    async (payload: CustomerUpsertPayload) => {
      if (!customerId) return
      await updateMutation.mutateAsync({ customerId, payload })
      enqueueSnackbar(customersUiText.toasts.updated, { variant: 'success' })
      navigate('/customers')
    },
    [customerId, enqueueSnackbar, navigate, updateMutation],
  )

  const handleDelete = useCallback(async () => {
    if (!customerId) return
    await deleteMutation.mutateAsync(customerId)
    enqueueSnackbar(customersUiText.toasts.deleted, { variant: 'success' })
    navigate('/customers')
  }, [customerId, deleteMutation, enqueueSnackbar, navigate])

  if (mode === 'create') {
    return (
      <CustomerForm
        mode="create"
        customer={null}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
      />
    )
  }

  if (!customerId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="customers-edit-page-missing-id">
        <Typography color="error" data-testid="customers-edit-page-missing-id-error-text">
          {customersUiText.errors.missingCustomerId}
        </Typography>
      </Paper>
    )
  }

  if (isLoading) {
    return <CustomerUpsertSkeleton />
  }

  if (!customer) {
    return (
      <Paper sx={{ p: 3 }} data-testid="customers-edit-page-not-found">
        <Typography color="error" data-testid="customers-edit-page-not-found-error-text">
          {customersUiText.errors.customerNotFound}
        </Typography>
      </Paper>
    )
  }

  return (
    <CustomerForm
      key={customer._id}
      mode="edit"
      customer={customer}
      isSubmitting={isSubmitting}
      isDeleting={deleteMutation.isPending}
      onSubmit={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
