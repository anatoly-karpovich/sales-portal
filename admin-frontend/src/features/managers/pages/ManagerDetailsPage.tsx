import { isAxiosError } from 'axios'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ManagerOrder } from '@/api/modules/managers.api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { useAuth } from '@/features/auth/useAuth'
import { ChangePasswordDialog } from '@/features/managers/components/ChangePasswordDialog'
import {
  useChangeManagerPasswordMutation,
  useDeleteManagerMutation,
  useManagerDetailsQuery,
} from '@/features/managers/hooks/useManagersQuery'
import { managersUiText, getDeleteManagerMessage } from '@/features/managers/managers.ui-text'
import { formatDateTime } from '@/utils/date'
import { getOrderStatusColor } from '@/utils/orderStatus'
import { useSnackbar } from 'notistack'

const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i

function isValidManagerId(value: string) {
  return MONGO_OBJECT_ID_REGEX.test(value)
}

function resolveApiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const responseData = error.response?.data
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as { ErrorMessage?: unknown }).ErrorMessage
      if (typeof message === 'string' && message.trim().length > 0) {
        return message
      }
    }
  }
  return fallback
}

function isManagerNotFoundErrorMessage(message: string) {
  return (
    message === managersUiText.errors.managerNotFound ||
    /^Manager with id '.*' wasn't found$/.test(message)
  )
}

function resolveLastModified(order: ManagerOrder) {
  const history = order.history ?? order.History ?? []
  const lastHistoryEntry = history.length > 0 ? history.at(-1) : undefined
  const value =
    lastHistoryEntry?.changedOn ??
    order.changedOn ??
    lastHistoryEntry?.createdOn ??
    lastHistoryEntry?.createdAt ??
    lastHistoryEntry?.updatedOn ??
    lastHistoryEntry?.updatedAt ??
    order.lastModified ??
    order.updatedOn ??
    order.updatedAt

  return value ? formatDateTime(value) : '-'
}

function getManagerOrdersColumns(): DataTableColumn<ManagerOrder>[] {
  return [
    {
      key: '_id',
      label: managersUiText.detailsPage.orderColumns.orderNumber,
      width: '28%',
      minWidth: 250,
      render: (row) => (
        <Button
          component={Link}
          to={`/orders/${row._id}`}
          variant="text"
          sx={{ textTransform: 'none', px: 0, minWidth: 0 }}
          data-testid={`manager-details-order-link-${row._id}`}
        >
          {row._id}
        </Button>
      ),
    },
    {
      key: 'total_price',
      label: managersUiText.detailsPage.orderColumns.price,
      width: '12%',
      minWidth: 120,
      render: (row) => `$${row.total_price}`,
    },
    {
      key: 'status',
      label: managersUiText.detailsPage.orderColumns.status,
      width: '16%',
      minWidth: 150,
      render: (row) => (
        <Typography sx={{ color: getOrderStatusColor(row.status) }}>{row.status}</Typography>
      ),
    },
    {
      key: 'createdOn',
      label: managersUiText.detailsPage.orderColumns.createdOn,
      width: '22%',
      minWidth: 220,
      render: (row) => formatDateTime(row.createdOn),
    },
    {
      key: 'lastModified',
      label: managersUiText.detailsPage.orderColumns.lastModified,
      width: '22%',
      minWidth: 220,
      render: (row) => resolveLastModified(row),
    },
  ]
}

function DetailsField({ testId, label, value }: { testId: string; label: string; value: string }) {
  return (
    <Stack spacing={0.25} data-testid={`${testId}-field`}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }} data-testid={`${testId}-label`}>
        {label}
      </Typography>
      <Typography color="text.secondary" data-testid={`${testId}-value`}>
        {value}
      </Typography>
    </Stack>
  )
}

function ManagerDetailsSkeleton() {
  return (
    <Stack spacing={2.5} data-testid="manager-details-page-skeleton">
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width={120} height={28} />
          <Skeleton variant="text" width={240} height={50} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      </Paper>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width={180} height={40} />
          <Skeleton variant="rounded" height={280} />
        </Stack>
      </Paper>
    </Stack>
  )
}

export function ManagerDetailsPage() {
  const { managerId } = useParams<{ managerId: string }>()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { user, logout } = useAuth()
  const hasRedirectedRef = useRef(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const shouldLoadManager = Boolean(managerId) && isValidManagerId(managerId)
  const detailsQuery = useManagerDetailsQuery(managerId ?? '', shouldLoadManager)
  const deleteMutation = useDeleteManagerMutation()
  const changePasswordMutation = useChangeManagerPasswordMutation()

  const manager = detailsQuery.data?.Manager ?? null
  const orders = detailsQuery.data?.Orders ?? []

  const loadErrorMessage = useMemo(() => {
    if (!detailsQuery.error) return managersUiText.errors.loadFailed
    return resolveApiErrorMessage(detailsQuery.error, managersUiText.errors.loadFailed)
  }, [detailsQuery.error])

  useEffect(() => {
    if (!managerId || hasRedirectedRef.current || isValidManagerId(managerId)) {
      return
    }

    hasRedirectedRef.current = true
    enqueueSnackbar(managersUiText.toasts.invalidIdRedirect, { variant: 'warning' })
    navigate('/managers', { replace: true })
  }, [enqueueSnackbar, managerId, navigate])

  useEffect(() => {
    if (!detailsQuery.isError || hasRedirectedRef.current) {
      return
    }

    if (!isManagerNotFoundErrorMessage(loadErrorMessage)) {
      return
    }

    hasRedirectedRef.current = true
    enqueueSnackbar(managersUiText.toasts.notFoundRedirect, { variant: 'warning' })
    navigate('/managers', { replace: true })
  }, [detailsQuery.isError, enqueueSnackbar, loadErrorMessage, navigate])

  if (!managerId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="manager-details-page-missing-id">
        <Typography color="error" data-testid="manager-details-page-missing-id-error-text">
          {managersUiText.errors.missingManagerId}
        </Typography>
      </Paper>
    )
  }

  if (!isValidManagerId(managerId)) {
    return null
  }

  if (detailsQuery.isLoading) {
    return <ManagerDetailsSkeleton />
  }

  if (detailsQuery.isError || !manager) {
    return (
      <Paper sx={{ p: 3 }} data-testid="manager-details-page-error">
        <Typography color="error" data-testid="manager-details-page-error-text">
          {loadErrorMessage}
        </Typography>
      </Paper>
    )
  }

  const isCurrentUserAdmin = Boolean(user?.roles.includes('ADMIN'))
  const canManageManager = Boolean(user) && (user?._id === manager._id || isCurrentUserAdmin)
  const isTargetAdmin = manager.roles.includes('ADMIN')
  const canManageCredentials = canManageManager && !isTargetAdmin

  return (
    <Stack spacing={2.5} data-testid="manager-details-page">
      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="manager-details-page-summary">
        <Stack spacing={2.5}>
          <Button
            component={Link}
            to="/managers"
            variant="text"
            startIcon={<ArrowBackRoundedIcon fontSize="small" />}
            sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
            data-testid="manager-details-back-to-list-link"
          >
            {managersUiText.createPage.backToManagers}
          </Button>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            data-testid="manager-details-header"
          >
            <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="manager-details-title">
              {managersUiText.detailsPage.title}
            </Typography>
            {canManageCredentials ? (
              <>
                <Button
                  variant="contained"
                  color="inherit"
                  startIcon={<KeyOutlinedIcon fontSize="small" />}
                  onClick={() => setChangePasswordOpen(true)}
                  data-testid="manager-details-change-password-button"
                >
                  {managersUiText.detailsPage.actions.changePassword}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="manager-details-delete-button"
                >
                  {managersUiText.detailsPage.actions.delete}
                </Button>
              </>
            ) : null}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
            data-testid="manager-details-grid"
          >
            <Stack spacing={1.5} data-testid="manager-details-fields-section">
              <DetailsField
                testId="manager-details-username"
                label={managersUiText.detailsPage.fields.username}
                value={manager.username}
              />
              <DetailsField
                testId="manager-details-first-name"
                label={managersUiText.detailsPage.fields.firstName}
                value={manager.firstName}
              />
              <DetailsField
                testId="manager-details-last-name"
                label={managersUiText.detailsPage.fields.lastName}
                value={manager.lastName}
              />
              <DetailsField
                testId="manager-details-roles"
                label={managersUiText.detailsPage.fields.roles}
                value={
                  manager.roles.length > 1 ? manager.roles.join(', ') : (manager.roles[0] ?? '-')
                }
              />
              <DetailsField
                testId="manager-details-created-on"
                label={managersUiText.detailsPage.fields.createdOn}
                value={formatDateTime(manager.createdOn)}
              />
            </Stack>
            <Box />
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="manager-details-page-orders">
        <Stack spacing={1.5}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700 }}
            data-testid="manager-details-orders-title"
          >
            {managersUiText.detailsPage.ordersTitle}
          </Typography>
          <DataTable
            rows={orders}
            columns={getManagerOrdersColumns()}
            sortField="createdOn"
            sortOrder="desc"
            onSort={() => undefined}
            isLoading={false}
            emptyText={managersUiText.detailsPage.emptyOrders}
          />
        </Stack>
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={managersUiText.dialogs.deleteTitle}
        message={getDeleteManagerMessage(manager.username)}
        confirmLabel={managersUiText.dialogs.deleteConfirm}
        cancelLabel={managersUiText.dialogs.cancel}
        isSubmitting={deleteMutation.isPending}
        onCancel={() => {
          if (deleteMutation.isPending) return
          setDeleteDialogOpen(false)
        }}
        onConfirm={async () => {
          await deleteMutation.mutateAsync({ managerId: manager._id })
          setDeleteDialogOpen(false)
          enqueueSnackbar(managersUiText.toasts.deleted, { variant: 'success' })

          if (user?._id === manager._id) {
            await logout()
            navigate('/login', { replace: true })
            return
          }

          navigate('/managers')
        }}
      />

      <ChangePasswordDialog
        open={changePasswordOpen}
        isSubmitting={changePasswordMutation.isPending}
        onClose={() => {
          if (changePasswordMutation.isPending) return
          setChangePasswordOpen(false)
        }}
        onSubmit={async (payload) => {
          await changePasswordMutation.mutateAsync({
            managerId: manager._id,
            payload,
          })
          enqueueSnackbar(managersUiText.toasts.passwordChanged, { variant: 'success' })
          setChangePasswordOpen(false)
        }}
      />
    </Stack>
  )
}
