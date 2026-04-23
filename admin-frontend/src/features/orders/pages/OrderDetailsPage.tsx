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
  Checkbox,
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
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { OrderAssignedManager, OrderStatus } from '@/api/modules/orders.api'
import type { Customer } from '@/api/modules/customers.api'
import { EditOrderCustomerDialog } from '@/features/orders/components/EditOrderCustomerDialog'
import { OrderHistoryTimeline } from '@/features/orders/components/OrderHistoryTimeline'
import { EditOrderProductsDialog } from '@/features/orders/components/EditOrderProductsDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate, formatDateTime } from '@/utils/date'
import { formatPrice } from '@/utils/number'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'
import {
  useCreateOrderCommentMutation,
  useDeleteOrderCommentMutation,
  useOrderCustomerOptionsQuery,
  useOrderDetailsQuery,
  useReceiveOrderProductsMutation,
  useOrderStatusMutation,
  useUpdateOrderMutation,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type DetailsTab = 'delivery' | 'history' | 'comments'
type PendingStatusAction = 'cancel' | 'process' | 'reopen' | null

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

function canCancelOrder(status: OrderStatus) {
  return status === 'Draft' || status === 'In Process'
}

function canReceiveOrderProducts(status: OrderStatus) {
  return status === 'In Process' || status === 'Partially Received'
}

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [activeTab, setActiveTab] = useState<DetailsTab>('delivery')
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingStatusAction>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<string | null>(null)
  const [isRefreshPending, setIsRefreshPending] = useState(false)
  const [isDetailsReloading, setIsDetailsReloading] = useState(false)
  const [isNotFoundRedirectScheduled, setIsNotFoundRedirectScheduled] = useState(false)
  const [isCustomerEditDialogOpen, setIsCustomerEditDialogOpen] = useState(false)
  const [isProductsEditDialogOpen, setIsProductsEditDialogOpen] = useState(false)
  const [isReceiveMode, setIsReceiveMode] = useState(false)
  const [selectedReceiveRowIndices, setSelectedReceiveRowIndices] = useState<number[]>([])
  const [customerEditSearch, setCustomerEditSearch] = useState('')
  const [debouncedCustomerEditSearch, setDebouncedCustomerEditSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  const shouldLoadOrder = Boolean(orderId)
  const orderDetailsQuery = useOrderDetailsQuery(orderId ?? '', shouldLoadOrder)
  const customerOptionsQuery = useOrderCustomerOptionsQuery(
    debouncedCustomerEditSearch,
    isCustomerEditDialogOpen,
  )
  const statusMutation = useOrderStatusMutation()
  const updateOrderMutation = useUpdateOrderMutation()
  const receiveOrderProductsMutation = useReceiveOrderProductsMutation()
  const createOrderCommentMutation = useCreateOrderCommentMutation()
  const deleteOrderCommentMutation = useDeleteOrderCommentMutation()
  const order = orderDetailsQuery.data
  const isNotFoundError =
    isAxiosError(orderDetailsQuery.error) && orderDetailsQuery.error.response?.status === 404
  const orderedComments = useMemo(() => [...(order?.comments ?? [])].reverse(), [order?.comments])
  const pendingReceiveRowIndices = useMemo(() => {
    if (!order) return []
    return order.products.reduce<number[]>((acc, product, index) => {
      if (!product.received) {
        acc.push(index)
      }
      return acc
    }, [])
  }, [order])
  const pendingReceiveRowIndexSet = useMemo(
    () => new Set(pendingReceiveRowIndices),
    [pendingReceiveRowIndices],
  )
  const selectedReceivePendingRowIndices = useMemo(
    () => selectedReceiveRowIndices.filter((index) => pendingReceiveRowIndexSet.has(index)),
    [pendingReceiveRowIndexSet, selectedReceiveRowIndices],
  )
  const hasPendingProductsToReceive = pendingReceiveRowIndices.length > 0
  const canStartReceive =
    Boolean(order) && canReceiveOrderProducts(order.status) && hasPendingProductsToReceive
  const isSelectAllChecked =
    hasPendingProductsToReceive &&
    selectedReceivePendingRowIndices.length === pendingReceiveRowIndices.length
  const isSelectAllIndeterminate =
    selectedReceivePendingRowIndices.length > 0 &&
    selectedReceivePendingRowIndices.length < pendingReceiveRowIndices.length
  const isReceiveSavePending = receiveOrderProductsMutation.isPending
  const isReceiveSaveEnabled = selectedReceivePendingRowIndices.length > 0 && !isReceiveSavePending

  useEffect(() => {
    setIsNotFoundRedirectScheduled(false)
  }, [orderId])

  useEffect(() => {
    if (!order) {
      setIsReceiveMode(false)
      setSelectedReceiveRowIndices([])
      return
    }

    if (
      !canReceiveOrderProducts(order.status) ||
      !order.products.some((product) => !product.received)
    ) {
      setIsReceiveMode(false)
      setSelectedReceiveRowIndices([])
      return
    }

    setSelectedReceiveRowIndices((previous) =>
      previous.filter((index) => Boolean(order.products[index]) && !order.products[index].received),
    )
  }, [order])

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

  useEffect(() => {
    if (!isCustomerEditDialogOpen) {
      setDebouncedCustomerEditSearch('')
      return
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedCustomerEditSearch(customerEditSearch.trim())
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [customerEditSearch, isCustomerEditDialogOpen])

  const availableCustomers = useMemo(() => {
    const customers = customerOptionsQuery.data?.Customers ?? []
    if (!order) return customers

    if (customers.some((customer) => customer._id === order.customer._id)) {
      return customers
    }

    const fallbackCurrentCustomer: Customer = {
      _id: order.customer._id,
      email: order.customer.email,
      name: order.customer.name,
      country: order.customer.country,
      city: order.customer.city,
      street: order.customer.street,
      house: order.customer.house,
      flat: order.customer.flat,
      phone: order.customer.phone,
      notes: order.customer.notes,
      createdOn: order.customer.createdOn,
    }

    return [fallbackCurrentCustomer, ...customers]
  }, [customerOptionsQuery.data?.Customers, order])

  const commentWithoutLineBreaks = commentDraft.replace(/[\r\n]/g, '').trim()
  const isCommentValid =
    commentWithoutLineBreaks.length > 0 &&
    commentWithoutLineBreaks.length <= 250 &&
    !/[<>]/.test(commentWithoutLineBreaks)
  const isCommentCreatePending = createOrderCommentMutation.isPending
  const isCommentDeletePending = deleteOrderCommentMutation.isPending

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
        queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() }),
      ])
    } finally {
      setIsRefreshPending(false)
    }
  }

  const handleOpenCustomerEditDialog = () => {
    if (!order || order.status !== 'Draft') return

    setCustomerEditSearch('')
    setSelectedCustomerId(order.customer._id)
    setIsCustomerEditDialogOpen(true)
  }

  const handleCloseCustomerEditDialog = () => {
    if (updateOrderMutation.isPending) return
    setIsCustomerEditDialogOpen(false)
  }

  const handleOpenProductsEditDialog = () => {
    if (!order || order.status !== 'Draft') return
    setIsProductsEditDialogOpen(true)
  }

  const handleCloseProductsEditDialog = () => {
    if (updateOrderMutation.isPending) return
    setIsProductsEditDialogOpen(false)
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

  const handleSaveEditedProducts = async (nextProducts: string[]) => {
    if (!order || !orderId) return

    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        payload: {
          customer: order.customer._id,
          products: nextProducts,
        },
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.updated, { variant: 'success' })
      setIsProductsEditDialogOpen(false)
      await reloadOrderDetailsWithSkeleton()
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.updateProductsFailed)
      if (errorMessage === 'Invalid order status') {
        enqueueSnackbar(ordersUiText.errors.orderNoLongerDraft, { variant: 'warning' })
        setIsProductsEditDialogOpen(false)
        await reloadOrderDetailsWithSkeleton()
        return
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  const handleStartReceiveMode = () => {
    if (!canStartReceive || isReceiveSavePending) return
    setSelectedReceiveRowIndices([])
    setIsReceiveMode(true)
  }

  const handleCancelReceiveMode = () => {
    if (isReceiveSavePending) return
    setSelectedReceiveRowIndices([])
    setIsReceiveMode(false)
  }

  const handleToggleReceiveProduct = (index: number) => {
    if (!order || isReceiveSavePending) return
    const product = order.products[index]
    if (!product || product.received) return

    setSelectedReceiveRowIndices((previous) =>
      previous.includes(index)
        ? previous.filter((rowIndex) => rowIndex !== index)
        : [...previous, index],
    )
  }

  const handleToggleSelectAllReceive = () => {
    if (isReceiveSavePending || !pendingReceiveRowIndices.length) return

    if (isSelectAllChecked) {
      setSelectedReceiveRowIndices([])
      return
    }

    setSelectedReceiveRowIndices([...pendingReceiveRowIndices])
  }

  const handleSaveReceivedProducts = async () => {
    if (!order || !orderId || !isReceiveSaveEnabled) return

    const products = selectedReceivePendingRowIndices
      .map((index) => order.products[index]?._id)
      .filter((productId): productId is string => Boolean(productId))

    if (!products.length) return

    try {
      await receiveOrderProductsMutation.mutateAsync({ orderId, products })
      enqueueSnackbar(ordersUiText.toasts.productsReceived, { variant: 'success' })
      setSelectedReceiveRowIndices([])
      setIsReceiveMode(false)
      await reloadOrderDetailsWithSkeleton()
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.receiveProductsFailed)
      enqueueSnackbar(errorMessage, { variant: 'error' })
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

  const handleCreateComment = async () => {
    if (!orderId || !isCommentValid || isCommentCreatePending) return

    try {
      await createOrderCommentMutation.mutateAsync({
        orderId,
        comment: commentWithoutLineBreaks,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.commentCreated, { variant: 'success' })
      setCommentDraft('')
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.commentCreateFailed)
      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  const handleDeleteComment = async (commentId: string | undefined) => {
    if (!orderId || !commentId || isCommentDeletePending) return

    setPendingDeleteCommentId(commentId)
    try {
      await deleteOrderCommentMutation.mutateAsync({
        orderId,
        commentId,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.commentDeleted, { variant: 'success' })
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.commentDeleteFailed)
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } finally {
      setPendingDeleteCommentId(null)
    }
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
  const isProductsEditable = order.status === 'Draft'
  const isReceiveStartVisible = canStartReceive && !isReceiveMode
  const isReceiveModeVisible = isReceiveMode && canStartReceive
  const isCancelVisible = canCancelOrder(order.status)
  const isProcessVisible = order.status === 'Draft'
  const isProcessDisabled = isProcessVisible && !order.delivery
  const isReopenVisible = order.status === 'Canceled'

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
  const assignedManagerDisplayValue = order.assignedManager ? assignedManagerValue : 'Not Assigned'
  const summaryMetricCardSx = {
    width: { xs: '100%', sm: 'clamp(210px, 22vw, 250px)' },
    flex: '0 0 auto',
    p: { xs: 1.25, md: 1.5 },
    border: 1,
    borderColor: 'divider',
    borderRadius: 2,
    backgroundColor: (theme: { palette: { mode: 'light' | 'dark' } }) =>
      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(25, 118, 210, 0.03)',
  }

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
              alignItems={{ xs: 'flex-start', md: 'flex-start' }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Typography color="text.secondary" sx={{ lineHeight: 1.4 }}>
                  <Typography
                    component="span"
                    variant="subtitle2"
                    sx={{ color: 'text.primary', fontWeight: 700 }}
                  >
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
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              >
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

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'stretch',
              justifyContent: { xs: 'flex-start', sm: 'space-between' },
              rowGap: 1.25,
              columnGap: { xs: 1.5, sm: 0 },
            }}
            data-testid="order-details-summary-metrics-grid"
          >
            <Stack
              spacing={0.75}
              sx={summaryMetricCardSx}
              data-testid="order-details-summary-metric-status-card"
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
                {ordersUiText.detailsPage.labels.orderStatus}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
                data-testid="order-details-summary-status-value"
              >
                {order.status}
              </Typography>
            </Stack>

            <Stack
              spacing={0.75}
              sx={summaryMetricCardSx}
              data-testid="order-details-summary-metric-delivery-card"
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
                {ordersUiText.detailsPage.labels.delivery}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
                data-testid="order-details-summary-delivery-date-value"
              >
                {order.delivery?.finalDate
                  ? formatDate(order.delivery.finalDate)
                  : ordersUiText.detailsPage.placeholders.noDelivery}
              </Typography>
            </Stack>

            <Stack
              spacing={0.75}
              sx={summaryMetricCardSx}
              data-testid="order-details-summary-metric-total-price-card"
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
                {ordersUiText.detailsPage.labels.totalPrice}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
                data-testid="order-details-summary-total-price-value"
              >
                {formatPrice(order.total_price)}
              </Typography>
            </Stack>

            <Stack
              spacing={0.75}
              sx={summaryMetricCardSx}
              data-testid="order-details-summary-metric-assigned-manager-card"
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
                {ordersUiText.detailsPage.labels.assignedManager}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
                data-testid="order-details-summary-assigned-manager-value"
              >
                {assignedManagerDisplayValue}
              </Typography>
            </Stack>

            <Stack
              spacing={0.75}
              sx={summaryMetricCardSx}
              data-testid="order-details-summary-metric-created-on-card"
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.2 }}>
                {ordersUiText.detailsPage.labels.createdOn}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
                data-testid="order-details-summary-created-on-value"
              >
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
              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.email}
              </Typography>
              <Typography data-testid="order-details-customer-email-value">
                {normalizeValue(order.customer.email)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.name}
              </Typography>
              <Typography data-testid="order-details-customer-name-value">
                {normalizeValue(order.customer.name)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.country}
              </Typography>
              <Typography data-testid="order-details-customer-country-value">
                {normalizeValue(order.customer.country)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.city}
              </Typography>
              <Typography data-testid="order-details-customer-city-value">
                {normalizeValue(order.customer.city)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.street}
              </Typography>
              <Typography data-testid="order-details-customer-street-value">
                {normalizeValue(order.customer.street)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.house}
              </Typography>
              <Typography data-testid="order-details-customer-house-value">
                {normalizeValue(order.customer.house)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.flat}
              </Typography>
              <Typography data-testid="order-details-customer-flat-value">
                {normalizeValue(order.customer.flat)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.phone}
              </Typography>
              <Typography data-testid="order-details-customer-phone-value">
                {normalizeValue(order.customer.phone)}
              </Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.createdOn}
              </Typography>
              <Typography>{formatDateTime(order.customer.createdOn)}</Typography>

              <Typography fontWeight={700}>
                {ordersUiText.detailsPage.fields.customer.notes}
              </Typography>
              <Typography
                data-testid="order-details-customer-notes-value"
                sx={{
                  maxWidth: '100%',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {normalizeValue(order.customer.notes)}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }} data-testid="order-details-products-section">
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {ordersUiText.detailsPage.labels.requestedProducts}
                </Typography>
                {isProductsEditable ? (
                  <IconButton
                    size="small"
                    onClick={() => void handleOpenProductsEditDialog()}
                    data-testid="order-details-products-edit-trigger"
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Stack>

              {isReceiveStartVisible ? (
                <Button
                  variant="contained"
                  onClick={handleStartReceiveMode}
                  disabled={isReceiveSavePending}
                  data-testid="order-details-products-receive-start-button"
                >
                  {ordersUiText.detailsPage.actions.receive}
                </Button>
              ) : null}

              {isReceiveModeVisible ? (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={handleCancelReceiveMode}
                    disabled={isReceiveSavePending}
                    data-testid="order-details-products-receive-cancel-button"
                  >
                    {ordersUiText.detailsPage.actions.cancelReceive}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => void handleSaveReceivedProducts()}
                    disabled={!isReceiveSaveEnabled}
                    data-testid="order-details-products-receive-save-button"
                  >
                    {isReceiveSavePending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      ordersUiText.detailsPage.actions.save
                    )}
                  </Button>
                </Stack>
              ) : null}
            </Stack>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />

            {isReceiveModeVisible ? (
              <Stack direction="row" justifyContent="flex-end">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box
                    sx={{ display: 'inline-flex', alignItems: 'center' }}
                    data-testid="order-details-products-receive-select-all-checkbox-field"
                  >
                    <Checkbox
                      size="small"
                      checked={isSelectAllChecked}
                      indeterminate={isSelectAllIndeterminate}
                      disabled={!hasPendingProductsToReceive || isReceiveSavePending}
                      onChange={handleToggleSelectAllReceive}
                      data-testid="order-details-products-receive-select-all-checkbox"
                    />
                  </Box>
                  <Typography>{ordersUiText.detailsPage.placeholders.selectAll}</Typography>
                </Stack>
              </Stack>
            ) : null}

            <Stack spacing={1} data-testid="order-details-products-table">
              {order.products.length ? (
                order.products.map((product, index) => (
                  <Accordion
                    key={`${product._id}-${index}`}
                    disableGutters
                    elevation={0}
                    data-testid={`order-details-products-row-${index}`}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreRoundedIcon fontSize="small" />}>
                      <Box
                        sx={{
                          width: '100%',
                          display: 'flex',
                          gap: 1,
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography data-testid={`order-details-products-row-${index}-name`}>
                          {normalizeValue(product.name)}
                        </Typography>

                        {isReceiveModeVisible ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Box
                              sx={{ display: 'inline-flex', alignItems: 'center' }}
                              data-testid={`order-details-products-row-${index}-receive-checkbox-field`}
                            >
                              <Checkbox
                                size="small"
                                checked={
                                  product.received ||
                                  selectedReceivePendingRowIndices.includes(index)
                                }
                                disabled={product.received || isReceiveSavePending}
                                onChange={() => handleToggleReceiveProduct(index)}
                                data-testid={`order-details-products-row-${index}-receive-checkbox`}
                              />
                            </Box>
                            <Typography
                              color={product.received ? 'success.main' : 'text.secondary'}
                              data-testid={`order-details-products-row-${index}-receive-state`}
                            >
                              {product.received ? 'Received' : 'Not Received'}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography
                            color={product.received ? 'success.main' : 'text.secondary'}
                            data-testid={`order-details-products-row-${index}-received`}
                          >
                            {product.received ? 'Received' : 'Not Received'}
                          </Typography>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={0.8}>
                        <Typography
                          data-testid={`order-details-products-row-${index}-manufacturer`}
                        >
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
        <Tabs
          value={activeTab}
          onChange={(_, value: DetailsTab) => setActiveTab(value)}
          sx={{ mb: 2 }}
        >
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
                  <Typography fontWeight={700}>
                    {ordersUiText.detailsPage.fields.delivery.condition}
                  </Typography>
                  <Typography>{normalizeValue(order.delivery.condition)}</Typography>

                  <Typography fontWeight={700}>
                    {ordersUiText.detailsPage.fields.delivery.finalDate}
                  </Typography>
                  <Typography>{formatDate(order.delivery.finalDate)}</Typography>

                  <Typography fontWeight={700}>
                    {ordersUiText.detailsPage.fields.delivery.country}
                  </Typography>
                  <Typography>{normalizeValue(order.delivery.address.country)}</Typography>

                  <Typography fontWeight={700}>
                    {ordersUiText.detailsPage.fields.delivery.city}
                  </Typography>
                  <Typography>{normalizeValue(order.delivery.address.city)}</Typography>

                  <Typography fontWeight={700}>
                    {ordersUiText.detailsPage.fields.delivery.street}
                  </Typography>
                  <Typography>{normalizeValue(order.delivery.address.street)}</Typography>

                  <Typography fontWeight={700}>
                    {ordersUiText.detailsPage.fields.delivery.house}
                  </Typography>
                  <Typography>{normalizeValue(order.delivery.address.house)}</Typography>

                  <Typography fontWeight={700}>
                    {ordersUiText.detailsPage.fields.delivery.flat}
                  </Typography>
                  <Typography>{normalizeValue(order.delivery.address.flat)}</Typography>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  {ordersUiText.detailsPage.placeholders.noDeliveryScheduled}
                </Typography>
              )}
            </Stack>
          ) : null}

          {activeTab === 'history' ? (
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {ordersUiText.detailsPage.labels.orderHistory}
              </Typography>
              <OrderHistoryTimeline history={order.history} />
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
                helperText={
                  commentDraft.length > 0 && !isCommentValid
                    ? ordersUiText.validation.commentsInvalid
                    : ' '
                }
                disabled={isCommentCreatePending}
              />
              <Button
                variant="contained"
                onClick={() => void handleCreateComment()}
                disabled={!isCommentValid || isCommentCreatePending}
                sx={{ alignSelf: 'flex-start' }}
                data-testid="order-details-comments-create-button"
              >
                {isCommentCreatePending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  ordersUiText.detailsPage.actions.createComment
                )}
              </Button>

              <Stack spacing={1.25}>
                {orderedComments.map((comment, index) => (
                  <Paper
                    key={comment._id ?? `${comment.createdOn}-${index}`}
                    variant="outlined"
                    sx={{ p: 1.5 }}
                    data-testid={`order-details-comments-item-${index}`}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Typography
                          sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}
                        >
                          {comment.text}
                        </Typography>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => void handleDeleteComment(comment._id)}
                          disabled={!comment._id || isCommentDeletePending}
                          data-testid={`order-details-comments-item-${index}-delete-button`}
                        >
                          {isCommentDeletePending && pendingDeleteCommentId === comment._id ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="primary.main">
                          {ordersUiText.detailsPage.placeholders.commentAuthorFallback}
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
        isInitialLoading={customerOptionsQuery.isLoading && availableCustomers.length === 0}
        isUpdating={customerOptionsQuery.isFetching && availableCustomers.length > 0}
        isSubmitting={updateOrderMutation.isPending}
        onSearchChange={setCustomerEditSearch}
        onSelectCustomer={setSelectedCustomerId}
        onClose={handleCloseCustomerEditDialog}
        onSave={handleSaveEditedCustomer}
      />

      {isProductsEditDialogOpen ? (
        <EditOrderProductsDialog
          open={isProductsEditDialogOpen}
          initialProducts={order.products}
          isSubmitting={updateOrderMutation.isPending}
          onClose={handleCloseProductsEditDialog}
          onSave={handleSaveEditedProducts}
        />
      ) : null}

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
