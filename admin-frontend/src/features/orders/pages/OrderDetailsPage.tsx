import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { useNavigate, useParams } from 'react-router-dom'
import type {
  OrderAssignedManager,
  OrderDelivery,
  OrderDeliveryStatus,
  OrderStatus,
} from '@/api/modules/orders.api'
import type { Customer } from '@/api/modules/customers.api'
import type { User } from '@/api/modules/users.api'
import { AssignManagerDialog } from '@/features/orders/components/AssignManagerDialog'
import { EditOrderCustomerDialog } from '@/features/orders/components/EditOrderCustomerDialog'
import { EditOrderProductsDialog } from '@/features/orders/components/EditOrderProductsDialog'
import { OrderDetailsCustomerSection } from '@/features/orders/components/OrderDetailsCustomerSection'
import { OrderDetailsProductsSection } from '@/features/orders/components/OrderDetailsProductsSection'
import { OrderDetailsSummarySection } from '@/features/orders/components/OrderDetailsSummarySection'
import {
  OrderDetailsTabsSection,
  type OrderDetailsTab,
} from '@/features/orders/components/OrderDetailsTabsSection'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'
import {
  useAssignOrderManagerMutation,
  useCreateOrderCommentMutation,
  useDeleteOrderCommentMutation,
  useOrderCustomerOptionsQuery,
  useOrderDetailsQuery,
  useOrderManagerOptionsQuery,
  useReceiveOrderProductsMutation,
  useUnassignOrderManagerMutation,
  useUpdateOrderDeliveryMutation,
  useOrderStatusMutation,
  useUpdateOrderMutation,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'

type PendingStatusAction = 'cancel' | 'process' | 'reopen' | null
const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i
const ASSIGNABLE_MANAGER_ROLES = new Set(['USER', 'ADMIN'])

const ORDER_STATE_CHANGED_ERROR_MESSAGES = new Set([
  'Invalid order status',
  "Can't reopen not canceled order",
  'Incorrect amount of received products',
])

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

function isValidOrderId(value: string) {
  return MONGO_OBJECT_ID_REGEX.test(value)
}

function isOrderNotFoundErrorMessage(message: string) {
  return message === ordersUiText.errors.orderNotFound || /^Order with id '.*' wasn't found$/.test(message)
}

function isOrderStateChangedErrorMessage(message: string) {
  return (
    ORDER_STATE_CHANGED_ERROR_MESSAGES.has(message) ||
    /^Product with Id '.*' is not requested$/.test(message)
  )
}

function isProcessNeedsDeliveryErrorMessage(message: string) {
  return message === "Can't process order. Please, schedule delivery"
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

function canCancelOrderByDeliveryStatus(deliveryStatus: OrderDeliveryStatus) {
  return deliveryStatus === 'Not Scheduled' || deliveryStatus === 'Scheduled'
}

function canShowCancelOrder(status: OrderStatus, deliveryStatus: OrderDeliveryStatus) {
  return canCancelOrder(status) && canCancelOrderByDeliveryStatus(deliveryStatus)
}

function canReceiveOrderProducts(status: OrderStatus, deliveryStatus: OrderDeliveryStatus) {
  return (
    status === 'In Process' &&
    (deliveryStatus === 'Scheduled' || deliveryStatus === 'Partially Delivered')
  )
}

function isAssignableManager(user: User) {
  return user.roles.some((role) => ASSIGNABLE_MANAGER_ROLES.has(role))
}

function resolveManagerSortKey(manager: User) {
  const fullName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim()
  return (fullName || manager.username).toLocaleLowerCase()
}

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [activeTab, setActiveTab] = useState<OrderDetailsTab>('delivery')
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingStatusAction>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<string | null>(null)
  const [isRefreshPending, setIsRefreshPending] = useState(false)
  const [isDetailsReloading, setIsDetailsReloading] = useState(false)
  const [isNotFoundRedirectScheduled, setIsNotFoundRedirectScheduled] = useState(false)
  const [isCustomerEditDialogOpen, setIsCustomerEditDialogOpen] = useState(false)
  const [isProductsEditDialogOpen, setIsProductsEditDialogOpen] = useState(false)
  const [isManagerAssignDialogOpen, setIsManagerAssignDialogOpen] = useState(false)
  const [isManagerUnassignDialogOpen, setIsManagerUnassignDialogOpen] = useState(false)
  const [isReceiveMode, setIsReceiveMode] = useState(false)
  const [selectedReceiveRowIndices, setSelectedReceiveRowIndices] = useState<number[]>([])
  const [customerEditSearch, setCustomerEditSearch] = useState('')
  const [debouncedCustomerEditSearch, setDebouncedCustomerEditSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')

  const isOrderIdInvalid = Boolean(orderId) && !isValidOrderId(orderId)
  const shouldLoadOrder = Boolean(orderId) && !isOrderIdInvalid
  const orderDetailsQuery = useOrderDetailsQuery(orderId ?? '', shouldLoadOrder)
  const customerOptionsQuery = useOrderCustomerOptionsQuery(
    debouncedCustomerEditSearch,
    isCustomerEditDialogOpen,
  )
  const managerOptionsQuery = useOrderManagerOptionsQuery(isManagerAssignDialogOpen)
  const assignOrderManagerMutation = useAssignOrderManagerMutation()
  const unassignOrderManagerMutation = useUnassignOrderManagerMutation()
  const statusMutation = useOrderStatusMutation()
  const updateOrderMutation = useUpdateOrderMutation()
  const receiveOrderProductsMutation = useReceiveOrderProductsMutation()
  const updateOrderDeliveryMutation = useUpdateOrderDeliveryMutation()
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
    Boolean(order) &&
    canReceiveOrderProducts(order.status, order.deliveryStatus) &&
    hasPendingProductsToReceive
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
      !canReceiveOrderProducts(order.status, order.deliveryStatus) ||
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

  const availableManagers = useMemo(() => {
    const managers = (managerOptionsQuery.data ?? []).filter(isAssignableManager)
    const managerById = new Map(managers.map((manager) => [manager._id, manager]))

    if (
      order?.assignedManager &&
      typeof order.assignedManager._id === 'string' &&
      !managerById.has(order.assignedManager._id)
    ) {
      managerById.set(order.assignedManager._id, {
        _id: order.assignedManager._id,
        username: order.assignedManager.username,
        firstName: order.assignedManager.firstName,
        lastName: order.assignedManager.lastName,
        createdOn: order.assignedManager.createdOn,
        roles: order.assignedManager.roles ?? [],
      })
    }

    return [...managerById.values()].sort((left, right) =>
      resolveManagerSortKey(left).localeCompare(resolveManagerSortKey(right)),
    )
  }, [managerOptionsQuery.data, order?.assignedManager])

  const filteredManagers = useMemo(() => {
    const normalizedSearch = managerSearch.trim().toLocaleLowerCase()
    if (!normalizedSearch) {
      return availableManagers
    }

    return availableManagers.filter((manager) => {
      const firstName = (manager.firstName ?? '').toLocaleLowerCase()
      const lastName = (manager.lastName ?? '').toLocaleLowerCase()
      const username = (manager.username ?? '').toLocaleLowerCase()
      return (
        firstName.includes(normalizedSearch) ||
        lastName.includes(normalizedSearch) ||
        username.includes(normalizedSearch)
      )
    })
  }, [availableManagers, managerSearch])

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

  const refreshAfterStateChangeError = async (message?: string) => {
    if (message && isProcessNeedsDeliveryErrorMessage(message)) {
      enqueueSnackbar(ordersUiText.detailsPage.placeholders.processNeedsDelivery, {
        variant: 'warning',
      })
    } else {
      enqueueSnackbar(ordersUiText.errors.orderStateChanged, { variant: 'warning' })
    }

    await reloadOrderDetailsWithSkeleton()
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
      setIsCustomerEditDialogOpen(false)
      await reloadOrderDetailsWithSkeleton()
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.updateCustomerFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setIsCustomerEditDialogOpen(false)
        await reloadOrderDetailsWithSkeleton()
        return
      }

      if (isOrderStateChangedErrorMessage(errorMessage)) {
        setIsCustomerEditDialogOpen(false)
        enqueueSnackbar(ordersUiText.errors.orderNoLongerDraft, { variant: 'warning' })
        await reloadOrderDetailsWithSkeleton()
        return
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
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
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setIsProductsEditDialogOpen(false)
        await reloadOrderDetailsWithSkeleton()
        return
      }

      if (isOrderStateChangedErrorMessage(errorMessage)) {
        enqueueSnackbar(ordersUiText.errors.orderNoLongerDraft, { variant: 'warning' })
        setIsProductsEditDialogOpen(false)
        await reloadOrderDetailsWithSkeleton()
        return
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  const handleOpenManagerAssignDialog = () => {
    if (!order) return
    setManagerSearch('')
    setSelectedManagerId(order.assignedManager?._id ?? '')
    setIsManagerAssignDialogOpen(true)
  }

  const handleCloseManagerAssignDialog = () => {
    if (assignOrderManagerMutation.isPending) return
    setIsManagerAssignDialogOpen(false)
  }

  const handleSaveAssignedManager = async (nextManagerId: string) => {
    if (!orderId || !nextManagerId) return

    try {
      await assignOrderManagerMutation.mutateAsync({
        orderId,
        managerId: nextManagerId,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.managerAssigned, { variant: 'success' })
      setIsManagerAssignDialogOpen(false)
      await reloadOrderDetailsWithSkeleton()
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.assignManagerFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setIsManagerAssignDialogOpen(false)
        await reloadOrderDetailsWithSkeleton()
        return
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  const handleOpenManagerUnassignDialog = () => {
    if (!order?.assignedManager) return
    setIsManagerUnassignDialogOpen(true)
  }

  const handleCloseManagerUnassignDialog = () => {
    if (unassignOrderManagerMutation.isPending) return
    setIsManagerUnassignDialogOpen(false)
  }

  const handleConfirmManagerUnassign = async () => {
    if (!orderId) return

    try {
      await unassignOrderManagerMutation.mutateAsync({
        orderId,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.managerUnassigned, { variant: 'success' })
      setIsManagerUnassignDialogOpen(false)
      await reloadOrderDetailsWithSkeleton()
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.unassignManagerFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setIsManagerUnassignDialogOpen(false)
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
      await receiveOrderProductsMutation.mutateAsync({
        orderId,
        products,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.productsReceived, { variant: 'success' })
      setSelectedReceiveRowIndices([])
      setIsReceiveMode(false)
      await reloadOrderDetailsWithSkeleton()
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.receiveProductsFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setSelectedReceiveRowIndices([])
        setIsReceiveMode(false)
        await reloadOrderDetailsWithSkeleton()
        return
      }

      if (isOrderStateChangedErrorMessage(errorMessage)) {
        setSelectedReceiveRowIndices([])
        setIsReceiveMode(false)
        await refreshAfterStateChangeError(errorMessage)
        return
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  const handleSaveDelivery = async (delivery: OrderDelivery) => {
    if (!orderId) return false

    try {
      await updateOrderDeliveryMutation.mutateAsync({
        orderId,
        delivery,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.deliverySaved, { variant: 'success' })
      await reloadOrderDetailsWithSkeleton()
      return true
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.deliverySaveFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        await reloadOrderDetailsWithSkeleton()
        return false
      }

      if (isOrderStateChangedErrorMessage(errorMessage)) {
        await refreshAfterStateChangeError(errorMessage)
        return false
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
      return false
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
    try {
      await statusMutation.mutateAsync({
        orderId,
        status: nextStatus,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(toastByAction[pendingStatusAction], { variant: 'success' })
      setPendingStatusAction(null)
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.detailsUnavailable)

      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setPendingStatusAction(null)
        await reloadOrderDetailsWithSkeleton()
        return
      }

      if (isOrderStateChangedErrorMessage(errorMessage) || isProcessNeedsDeliveryErrorMessage(errorMessage)) {
        setPendingStatusAction(null)
        await refreshAfterStateChangeError(errorMessage)
        return
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
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

  if (isOrderIdInvalid) {
    return (
      <Paper sx={{ p: 3 }} data-testid="order-details-page-invalid-id">
        <Stack spacing={1.5} alignItems="flex-start">
          <Typography color="error">{ordersUiText.errors.invalidOrderId}</Typography>
          <Button
            variant="outlined"
            onClick={() => navigate('/orders', { replace: true })}
            data-testid="order-details-page-invalid-id-back-button"
          >
            {ordersUiText.detailsPage.backToOrders}
          </Button>
        </Stack>
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
  const isManagerAssigned = Boolean(order.assignedManager)
  const isManagerActionPending =
    assignOrderManagerMutation.isPending || unassignOrderManagerMutation.isPending
  const isCustomerEditable = order.status === 'Draft'
  const isProductsEditable = order.status === 'Draft'
  const isReceiveStartVisible = canStartReceive && !isReceiveMode
  const isReceiveModeVisible = isReceiveMode && canStartReceive
  const isCancelVisible = canShowCancelOrder(order.status, order.deliveryStatus)
  const isProcessVisible = order.status === 'Draft'
  const isProcessDisabled = isProcessVisible && order.deliveryStatus !== 'Scheduled'
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
  const assignedManagerDisplayValue = assignedManagerValue
  return (
    <Stack spacing={2.5} data-testid="order-details-page">
      <OrderDetailsSummarySection
        order={order}
        assignedManagerDisplayValue={assignedManagerDisplayValue}
        isManagerAssigned={isManagerAssigned}
        isManagerActionPending={isManagerActionPending}
        isCancelVisible={isCancelVisible}
        isCancelDisabled={false}
        isReopenVisible={isReopenVisible}
        isProcessVisible={isProcessVisible}
        isProcessDisabled={isProcessDisabled}
        isRefreshPending={isRefreshPending}
        isOrderFetching={orderDetailsQuery.isFetching}
        onAssignManager={handleOpenManagerAssignDialog}
        onEditManager={handleOpenManagerAssignDialog}
        onUnassignManager={handleOpenManagerUnassignDialog}
        onCancel={() => setPendingStatusAction('cancel')}
        onReopen={() => setPendingStatusAction('reopen')}
        onProcess={() => setPendingStatusAction('process')}
        onRefresh={() => void handleRefresh()}
      />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <OrderDetailsCustomerSection
          order={order}
          isCustomerEditable={isCustomerEditable}
          onOpenCustomerEdit={() => void handleOpenCustomerEditDialog()}
        />

        <OrderDetailsProductsSection
          order={order}
          isProductsEditable={isProductsEditable}
          isReceiveStartVisible={isReceiveStartVisible}
          isReceiveModeVisible={isReceiveModeVisible}
          isReceiveSavePending={isReceiveSavePending}
          isReceiveSaveEnabled={isReceiveSaveEnabled}
          hasPendingProductsToReceive={hasPendingProductsToReceive}
          isSelectAllChecked={isSelectAllChecked}
          isSelectAllIndeterminate={isSelectAllIndeterminate}
          selectedReceivePendingRowIndices={selectedReceivePendingRowIndices}
          onOpenProductsEdit={() => void handleOpenProductsEditDialog()}
          onStartReceiveMode={handleStartReceiveMode}
          onCancelReceiveMode={handleCancelReceiveMode}
          onSaveReceivedProducts={() => void handleSaveReceivedProducts()}
          onToggleSelectAllReceive={handleToggleSelectAllReceive}
          onToggleReceiveProduct={handleToggleReceiveProduct}
        />
      </Box>

      <OrderDetailsTabsSection
        order={order}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDeliveryEditable={order.status === 'Draft'}
        isDeliverySubmitting={updateOrderDeliveryMutation.isPending}
        onSaveDelivery={handleSaveDelivery}
        commentDraft={commentDraft}
        onCommentDraftChange={setCommentDraft}
        isCommentValid={isCommentValid}
        isCommentCreatePending={isCommentCreatePending}
        isCommentDeletePending={isCommentDeletePending}
        pendingDeleteCommentId={pendingDeleteCommentId}
        orderedComments={orderedComments}
        onCreateComment={() => void handleCreateComment()}
        onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
      />

      <EditOrderCustomerDialog
        open={isCustomerEditDialogOpen}
        customers={availableCustomers}
        currentCustomerId={order.customer._id}
        selectedCustomerId={selectedCustomerId}
        isInitialLoading={customerOptionsQuery.isLoading && availableCustomers.length === 0}
        isUpdating={customerOptionsQuery.isFetching && availableCustomers.length > 0}
        isSubmitting={updateOrderMutation.isPending}
        onSearchChange={setCustomerEditSearch}
        onSelectCustomer={setSelectedCustomerId}
        onClose={handleCloseCustomerEditDialog}
        onSave={handleSaveEditedCustomer}
      />

      <AssignManagerDialog
        open={isManagerAssignDialogOpen}
        managers={filteredManagers}
        currentManagerId={order.assignedManager?._id ?? null}
        selectedManagerId={selectedManagerId}
        isInitialLoading={managerOptionsQuery.isLoading && availableManagers.length === 0}
        isUpdating={managerOptionsQuery.isFetching && availableManagers.length > 0}
        isSubmitting={assignOrderManagerMutation.isPending}
        onSearchChange={setManagerSearch}
        onSelectManager={setSelectedManagerId}
        onClose={handleCloseManagerAssignDialog}
        onSave={handleSaveAssignedManager}
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
        open={isManagerUnassignDialogOpen}
        title={ordersUiText.dialogs.details.unassignManagerTitle}
        message={ordersUiText.dialogs.details.unassignManagerMessage}
        confirmLabel={ordersUiText.dialogs.details.unassignManagerConfirm}
        confirmColor="error"
        cancelLabel={ordersUiText.dialogs.cancel}
        isSubmitting={unassignOrderManagerMutation.isPending}
        onCancel={handleCloseManagerUnassignDialog}
        onConfirm={handleConfirmManagerUnassign}
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
