import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { OrderAssignedManager, OrderComment, OrderStatus } from '@/api/modules/orders.api'
import { getAllCustomers, type Customer } from '@/api/modules/customers.api'
import { EditOrderCustomerDialog } from '@/features/orders/components/EditOrderCustomerDialog'
import { readStoredUser } from '@/features/auth/auth.service'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'
import {
  useOrderDetailsQuery,
  useOrderStatusMutation,
  useUpdateOrderMutation,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type DetailsTab = 'delivery' | 'history' | 'comments'
type PendingStatusAction = 'cancel' | 'process' | 'reopen' | null

type LocalComment = {
  id: string
  text: string
  createdOn: string
  createdBy: string
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

function OrderDetailsSkeleton() {
  return (
    <Stack spacing={2.5} data-testid="order-details-page-skeleton">
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width={140} height={34} />
          <Skeleton variant="text" width={260} height={58} />
          <Skeleton variant="rounded" height={160} />
        </Stack>
      </Paper>
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <Skeleton variant="rounded" height={320} />
        <Skeleton variant="rounded" height={320} />
      </Box>
      <Skeleton variant="rounded" height={260} />
    </Stack>
  )
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.trim().length === 0) return '-'
  return String(value)
}

function resolveAssignedManagerName(assignedManager: OrderAssignedManager | null) {
  if (!assignedManager) {
    return '-'
  }

  const fullName = `${assignedManager.firstName ?? ''} ${assignedManager.lastName ?? ''}`.trim()
  return fullName || assignedManager.username || '-'
}

function resolveCommentAuthor(comment: OrderComment, fallbackAuthor: string) {
  if (typeof comment.createdBy === 'string' && comment.createdBy.trim()) {
    return comment.createdBy
  }

  if (comment.createdBy && typeof comment.createdBy === 'object') {
    const fullName = `${comment.createdBy.firstName ?? ''} ${comment.createdBy.lastName ?? ''}`.trim()
    return fullName || comment.createdBy.username || fallbackAuthor
  }

  return fallbackAuthor
}

function canCancelOrder(status: OrderStatus) {
  return status === 'Draft' || status === 'In Process'
}

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [activeTab, setActiveTab] = useState<DetailsTab>('delivery')
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingStatusAction>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [localComments, setLocalComments] = useState<LocalComment[]>([])
  const [isRefreshPending, setIsRefreshPending] = useState(false)
  const [isDetailsReloading, setIsDetailsReloading] = useState(false)
  const [isNotFoundRedirectScheduled, setIsNotFoundRedirectScheduled] = useState(false)
  const [isCustomerEditDialogOpen, setIsCustomerEditDialogOpen] = useState(false)
  const [isCustomerEditLoading, setIsCustomerEditLoading] = useState(false)
  const [customerEditSearch, setCustomerEditSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([])

  const shouldLoadOrder = Boolean(orderId)
  const orderDetailsQuery = useOrderDetailsQuery(orderId ?? '', shouldLoadOrder)
  const statusMutation = useOrderStatusMutation()
  const updateOrderMutation = useUpdateOrderMutation()
  const order = orderDetailsQuery.data
  const isNotFoundError = isAxiosError(orderDetailsQuery.error) && orderDetailsQuery.error.response?.status === 404

  const storedUser = useMemo(() => readStoredUser(), [])
  const defaultCommentAuthor = useMemo(() => {
    const fullName = `${storedUser?.firstName ?? ''} ${storedUser?.lastName ?? ''}`.trim()
    return fullName || storedUser?.username || 'AQA User'
  }, [storedUser])

  useEffect(() => {
    setIsNotFoundRedirectScheduled(false)
  }, [orderId])

  useEffect(() => {
    if (!order) return
    const mapped = [...(order.comments ?? [])]
      .reverse()
      .map((comment, index) => ({
        id: comment._id ?? `${order._id}-comment-${index}`,
        text: comment.text,
        createdOn: comment.createdOn,
        createdBy: resolveCommentAuthor(comment, defaultCommentAuthor),
      }))
    setLocalComments(mapped)
  }, [defaultCommentAuthor, order])

  useEffect(() => {
    if (!isNotFoundError || isNotFoundRedirectScheduled) {
      return
    }

    setIsNotFoundRedirectScheduled(true)
    enqueueSnackbar(ordersUiText.toasts.notFoundRedirect, { variant: 'warning' })
    const timeoutId = window.setTimeout(() => {
      navigate('/orders', { replace: true })
    }, 1000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [enqueueSnackbar, isNotFoundError, isNotFoundRedirectScheduled, navigate])

  const commentWithoutLineBreaks = commentDraft.replace(/[\r\n]/g, '').trim()
  const isCommentValid =
    commentWithoutLineBreaks.length > 0 &&
    commentWithoutLineBreaks.length <= 250 &&
    !/[<>]/.test(commentWithoutLineBreaks)

  const reloadOrderDetailsWithSkeleton = async () => {
    setIsDetailsReloading(true)
    try {
      await orderDetailsQuery.refetch()
    } finally {
      setIsDetailsReloading(false)
    }
  }

  const handleRefresh = async () => {
    if (!orderId) return
    setIsRefreshPending(true)
    try {
      await Promise.all([
        orderDetailsQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all }),
      ])
    } finally {
      setIsRefreshPending(false)
    }
  }

  const handleOpenCustomerEditDialog = async () => {
    if (!order || order.status !== 'Draft') return

    setCustomerEditSearch('')
    setSelectedCustomerId(order.customer._id)
    setIsCustomerEditDialogOpen(true)
    setIsCustomerEditLoading(true)
    try {
      const customers = await getAllCustomers()
      setAvailableCustomers(customers)
    } catch (error) {
      setIsCustomerEditDialogOpen(false)
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.customersLoadFailed)
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } finally {
      setIsCustomerEditLoading(false)
    }
  }

  const handleCloseCustomerEditDialog = () => {
    if (updateOrderMutation.isPending) return
    setIsCustomerEditDialogOpen(false)
  }

  const handleSaveEditedCustomer = async (nextCustomerId: string) => {
    if (!order || !orderId) return

    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        payload: {
          customer: nextCustomerId,
          products: order.products.map((product) => product._id),
        },
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.updated, { variant: 'success' })
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.updateCustomerFailed)
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } finally {
      setIsCustomerEditDialogOpen(false)
      await reloadOrderDetailsWithSkeleton()
    }
  }

  const handleConfirmStatusAction = async () => {
    if (!pendingStatusAction || !orderId || !order) return

    const statusByAction: Record<Exclude<PendingStatusAction, null>, OrderStatus> = {
      cancel: 'Canceled',
      process: 'In Process',
      reopen: 'Draft',
    }

    const toastByAction: Record<Exclude<PendingStatusAction, null>, string> = {
      cancel: ordersUiText.toasts.canceled,
      process: ordersUiText.toasts.processed,
      reopen: ordersUiText.toasts.reopened,
    }

    const nextStatus = statusByAction[pendingStatusAction]
    await statusMutation.mutateAsync({ orderId, status: nextStatus })
    enqueueSnackbar(toastByAction[pendingStatusAction], { variant: 'success' })
    setPendingStatusAction(null)
  }

  const handleCreateLocalComment = () => {
    if (!isCommentValid) return

    const nextComment: LocalComment = {
      id:
        typeof window.crypto?.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `local-comment-${Date.now()}`,
      text: commentDraft.trim(),
      createdOn: new Date().toISOString(),
      createdBy: defaultCommentAuthor,
    }

    setLocalComments((current) => [nextComment, ...current])
    setCommentDraft('')
  }

  if (!orderId) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-missing-id">
        <Typography color="error">{ordersUiText.errors.missingOrderId}</Typography>
      </Paper>
    )
  }

  if (orderDetailsQuery.isLoading || isDetailsReloading) {
    return <OrderDetailsSkeleton />
  }

  if (isNotFoundError) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-not-found">
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography color="error">{ordersUiText.errors.orderNotFound}</Typography>
        </Stack>
      </Paper>
    )
  }

  if (orderDetailsQuery.isError || !order) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-load-error">
        <Stack spacing={2}>
          <Alert severity="error">{ordersUiText.errors.detailsUnavailable}</Alert>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon fontSize="small" />}
            onClick={() => void handleRefresh()}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="order-details-page-load-error-refresh-button"
          >
            {ordersUiText.detailsPage.actions.refresh}
          </Button>
        </Stack>
      </Paper>
    )
  }

  const assignedManagerValue = resolveAssignedManagerName(order.assignedManager)
  const isCustomerEditable = order.status === 'Draft'
  const isCancelVisible = canCancelOrder(order.status)
  const isProcessVisible = order.status === 'Draft'
  const isProcessDisabled = isProcessVisible && !order.delivery
  const isReopenVisible = order.status === 'Canceled'

  const statusColor =
    order.status === 'Canceled'
      ? 'error.main'
      : order.status === 'Received'
        ? 'success.main'
        : order.status === 'Partially Received'
          ? 'primary.main'
          : order.status === 'In Process'
            ? 'info.main'
            : 'text.primary'

  const detailsDialogCopy =
    pendingStatusAction === 'cancel'
      ? {
          title: ordersUiText.dialogs.details.cancelTitle,
          message: ordersUiText.dialogs.details.cancelMessage,
          confirm: ordersUiText.dialogs.details.cancelConfirm,
          confirmColor: 'error' as const,
        }
      : pendingStatusAction === 'process'
        ? {
            title: ordersUiText.dialogs.details.processTitle,
            message: ordersUiText.dialogs.details.processMessage,
            confirm: ordersUiText.dialogs.details.processConfirm,
            confirmColor: 'primary' as const,
          }
        : pendingStatusAction === 'reopen'
          ? {
              title: ordersUiText.dialogs.details.reopenTitle,
              message: ordersUiText.dialogs.details.reopenMessage,
              confirm: ordersUiText.dialogs.details.reopenConfirm,
              confirmColor: 'primary' as const,
            }
          : null

  return (
    <Stack spacing={2.5} data-testid="order-details-page">
      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-summary-section">
        <Stack spacing={2.5}>
          <Button
            component={Link}
            to="/orders"
            variant="text"
            startIcon={<ArrowBackRoundedIcon fontSize="small" />}
            sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none' }}
            data-testid="order-details-back-to-list-link"
          >
            {ordersUiText.detailsPage.backToOrders}
          </Button>

          <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="order-details-page-title">
            {ordersUiText.detailsPage.title}
          </Typography>

          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack spacing={1}>
                <Typography color="text.secondary">
                  <Typography component="span" variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                    {ordersUiText.detailsPage.labels.orderNumber}:
                  </Typography>{' '}
                  <Typography
                    component="span"
                    sx={{ fontStyle: 'italic' }}
                    data-testid="order-details-order-id-value"
                  >
                    {order._id}
                  </Typography>
                </Typography>
                <Typography color="text.secondary">
                  <Typography component="span" variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                    {ordersUiText.detailsPage.labels.assignedManager}:
                  </Typography>{' '}
                  <Typography component="span" data-testid="order-details-summary-assigned-manager-value">
                    {assignedManagerValue}
                  </Typography>
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                {isCancelVisible ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setPendingStatusAction('cancel')}
                    data-testid="order-details-action-cancel-button"
                  >
                    {ordersUiText.detailsPage.actions.cancel}
                  </Button>
                ) : null}

                {isReopenVisible ? (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => setPendingStatusAction('reopen')}
                    data-testid="order-details-action-reopen-button"
                  >
                    {ordersUiText.detailsPage.actions.reopen}
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-start">
              {isProcessVisible ? (
                <Tooltip
                  title={ordersUiText.detailsPage.placeholders.processNeedsDelivery}
                  disableHoverListener={!isProcessDisabled}
                >
                  <span>
                    <Button
                      variant="contained"
                      onClick={() => setPendingStatusAction('process')}
                      disabled={isProcessDisabled}
                      data-testid="order-details-action-process-button"
                    >
                      {ordersUiText.detailsPage.actions.process}
                    </Button>
                  </span>
                </Tooltip>
              ) : null}

              <Button
                variant="text"
                startIcon={
                  isRefreshPending || orderDetailsQuery.isFetching ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <RefreshRoundedIcon fontSize="small" />
                  )
                }
                onClick={() => void handleRefresh()}
                disabled={isRefreshPending}
                sx={{ px: 0.5 }}
                data-testid="order-details-action-refresh-button"
              >
                {ordersUiText.detailsPage.actions.refresh}
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' } }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.orderStatus}
              </Typography>
              <Typography sx={{ color: statusColor, fontWeight: 700 }} data-testid="order-details-summary-status-value">
                {order.status}
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.totalPrice}
              </Typography>
              <Typography sx={{ fontWeight: 700 }} data-testid="order-details-summary-total-price-value">
                {formatPrice(order.total_price)}
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.delivery}
              </Typography>
              <Typography sx={{ fontWeight: 700 }} data-testid="order-details-summary-delivery-date-value">
                {order.delivery?.finalDate ? formatDateTime(order.delivery.finalDate) : '-'}
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.createdOn}
              </Typography>
              <Typography sx={{ fontWeight: 700 }} data-testid="order-details-summary-created-on-value">
                {formatDateTime(order.createdOn)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-customer-section">
          <Stack spacing={2}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.customerDetails}
              </Typography>
              {isCustomerEditable ? (
                <IconButton
                  size="small"
                  onClick={() => void handleOpenCustomerEditDialog()}
                  data-testid="order-details-customer-edit-trigger"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Stack>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />
            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: { xs: '1fr', sm: '170px 1fr' },
              }}
            >
              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.email}</Typography>
              <Typography data-testid="order-details-customer-email-value">
                {normalizeValue(order.customer.email)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.name}</Typography>
              <Typography data-testid="order-details-customer-name-value">
                {normalizeValue(order.customer.name)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.country}</Typography>
              <Typography data-testid="order-details-customer-country-value">
                {normalizeValue(order.customer.country)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.city}</Typography>
              <Typography data-testid="order-details-customer-city-value">
                {normalizeValue(order.customer.city)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.street}</Typography>
              <Typography data-testid="order-details-customer-street-value">
                {normalizeValue(order.customer.street)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.house}</Typography>
              <Typography data-testid="order-details-customer-house-value">
                {normalizeValue(order.customer.house)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.flat}</Typography>
              <Typography data-testid="order-details-customer-flat-value">
                {normalizeValue(order.customer.flat)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.phone}</Typography>
              <Typography data-testid="order-details-customer-phone-value">
                {normalizeValue(order.customer.phone)}
              </Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.createdOn}</Typography>
              <Typography>{formatDateTime(order.customer.createdOn)}</Typography>

              <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.customer.notes}</Typography>
              <Typography data-testid="order-details-customer-notes-value">
                {normalizeValue(order.customer.notes)}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-products-section">
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {ordersUiText.detailsPage.labels.requestedProducts}
            </Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />
            <Stack spacing={1} data-testid="order-details-products-table">
              {order.products.length ? (
                order.products.map((product, index) => (
                  <Accordion key={`${product._id}-${index}`} disableGutters elevation={0} data-testid={`order-details-products-row-${index}`}>
                    <AccordionSummary expandIcon={<ExpandMoreRoundedIcon fontSize="small" />}>
                      <Box
                        sx={{
                          width: '100%',
                          display: 'grid',
                          gap: 1,
                          gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                          alignItems: 'center',
                        }}
                      >
                        <Typography data-testid={`order-details-products-row-${index}-name`}>
                          {normalizeValue(product.name)}
                        </Typography>
                        <Typography color={product.received ? 'success.main' : 'text.secondary'} data-testid={`order-details-products-row-${index}-received`}>
                          {product.received ? 'Received' : 'Not Received'}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={0.8}>
                        <Typography data-testid={`order-details-products-row-${index}-manufacturer`}>
                          <Typography
                            component="span"
                            variant="subtitle2"
                            sx={{ color: 'text.primary', fontWeight: 700 }}
                          >
                            Manufacturer:
                          </Typography>{' '}
                          {normalizeValue(product.manufacturer)}
                        </Typography>
                        <Typography data-testid={`order-details-products-row-${index}-amount`}>
                          <Typography
                            component="span"
                            variant="subtitle2"
                            sx={{ color: 'text.primary', fontWeight: 700 }}
                          >
                            Amount:
                          </Typography>{' '}
                          {normalizeValue(product.amount)}
                        </Typography>
                        <Typography data-testid={`order-details-products-row-${index}-price`}>
                          <Typography
                            component="span"
                            variant="subtitle2"
                            sx={{ color: 'text.primary', fontWeight: 700 }}
                          >
                            Price:
                          </Typography>{' '}
                          {formatPrice(product.price)}
                        </Typography>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Typography color="text.secondary">-</Typography>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-tabs-placeholder-section">
        <Tabs value={activeTab} onChange={(_, value: DetailsTab) => setActiveTab(value)} sx={{ mb: 2 }}>
          <Tab
            label={ordersUiText.detailsPage.tabs.delivery}
            value="delivery"
            data-testid="order-details-tabs-placeholder-delivery-tab"
          />
          <Tab
            label={ordersUiText.detailsPage.tabs.history}
            value="history"
            data-testid="order-details-tabs-placeholder-history-tab"
          />
          <Tab
            label={ordersUiText.detailsPage.tabs.comments}
            value="comments"
            data-testid="order-details-tabs-placeholder-comments-tab"
          />
        </Tabs>
        <Box data-testid="order-details-tabs-placeholder-content">
          {activeTab === 'delivery' ? (
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.deliveryInformation}
              </Typography>
              {order.delivery ? (
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.25,
                    gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
                  }}
                >
                  <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.condition}</Typography>
                  <Typography>{normalizeValue(order.delivery.condition)}</Typography>

                  <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.finalDate}</Typography>
                  <Typography>{formatDateTime(order.delivery.finalDate)}</Typography>

                  <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.country}</Typography>
                  <Typography>{normalizeValue(order.delivery.address.country)}</Typography>

                  <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.city}</Typography>
                  <Typography>{normalizeValue(order.delivery.address.city)}</Typography>

                  <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.street}</Typography>
                  <Typography>{normalizeValue(order.delivery.address.street)}</Typography>

                  <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.house}</Typography>
                  <Typography>{normalizeValue(order.delivery.address.house)}</Typography>

                  <Typography fontWeight={700}>{ordersUiText.detailsPage.fields.delivery.flat}</Typography>
                  <Typography>{normalizeValue(order.delivery.address.flat)}</Typography>
                </Box>
              ) : (
                <Typography color="text.secondary">{ordersUiText.detailsPage.placeholders.noDeliveryScheduled}</Typography>
              )}
            </Stack>
          ) : null}

          {activeTab === 'history' ? (
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.orderHistory}
              </Typography>
              <Typography color="text.secondary">{ordersUiText.detailsPage.placeholders.historyPlaceholder}</Typography>
            </Stack>
          ) : null}

          {activeTab === 'comments' ? (
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.comments}
              </Typography>
              <TextField
                multiline
                rows={3}
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={ordersUiText.detailsPage.placeholders.commentInput}
                data-testid="order-details-comments-input"
                inputProps={{ 'data-testid': 'order-details-comments-input-field' }}
                error={commentDraft.length > 0 && !isCommentValid}
                helperText={commentDraft.length > 0 && !isCommentValid ? ordersUiText.validation.commentsInvalid : ' '}
              />
              <Button
                variant="contained"
                onClick={handleCreateLocalComment}
                disabled={!isCommentValid}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="order-details-comments-create-button"
              >
                {ordersUiText.detailsPage.actions.createComment}
              </Button>

              <Stack spacing={1.25}>
                {localComments.map((comment) => (
                  <Paper key={comment.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comment.text}</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="primary.main">
                          {comment.createdBy}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(comment.createdOn)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          ) : null}
        </Box>
      </Paper>

      <EditOrderCustomerDialog
        open={isCustomerEditDialogOpen}
        customers={availableCustomers}
        currentCustomerId={order.customer._id}
        search={customerEditSearch}
        selectedCustomerId={selectedCustomerId}
        isLoading={isCustomerEditLoading}
        isSubmitting={updateOrderMutation.isPending}
        onSearchChange={setCustomerEditSearch}
        onSelectCustomer={setSelectedCustomerId}
        onClose={handleCloseCustomerEditDialog}
        onSave={handleSaveEditedCustomer}
      />

      <ConfirmDialog
        open={Boolean(pendingStatusAction) && Boolean(detailsDialogCopy)}
        title={detailsDialogCopy?.title ?? ''}
        message={detailsDialogCopy?.message ?? ''}
        confirmLabel={detailsDialogCopy?.confirm}
        confirmColor={detailsDialogCopy?.confirmColor}
        cancelLabel={ordersUiText.dialogs.cancel}
        isSubmitting={statusMutation.isPending}
        onCancel={() => {
          if (statusMutation.isPending) return
          setPendingStatusAction(null)
        }}
        onConfirm={handleConfirmStatusAction}
      />
    </Stack>
  )
}
