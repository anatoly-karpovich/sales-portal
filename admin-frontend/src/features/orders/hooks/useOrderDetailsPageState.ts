import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useNavigate, useParams } from 'react-router-dom'
import type { OrderProductRequestItem, OrderStatus } from '@/api/modules/orders.api'
import type { OrderDeliverySavePayload, OrderDetailsTab } from '@/features/orders/components/OrderDetailsTabsSection'
import { ordersQueryKeys } from '@/features/orders/hooks/ordersQueryKeys'
import {
  useAssignOrderManagerMutation,
  useCreateOrderCommentMutation,
  useDeleteOrderCommentMutation,
  useOrderDetailsQuery,
  useOrderStatusMutation,
  useReceiveOrderProductsMutation,
  useUnassignOrderManagerMutation,
  useUpdateOrderDeliveryMutation,
  useUpdateOrderMutation,
  useUpdateOrderPickupMutation,
} from '@/features/orders/hooks/useOrdersQuery'
import { ordersUiText } from '@/features/orders/orders.ui-text'
import {
  buildOrderProductDisplayRows,
  canProcessOrder,
  canReceiveOrderProducts,
  canShowCancelOrder,
  isOrderNotFoundErrorMessage,
  isOrderStateChangedErrorMessage,
  isProcessNeedsDeliveryErrorMessage,
  isValidOrderId,
  resolveApiErrorMessage,
  resolveAssignedManagerName,
  type PendingStatusAction,
} from '@/features/orders/utils/orderDetailsPage.utils'

export function useOrderDetailsPageState() {
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
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false)
  const [isProductsEditMode, setIsProductsEditMode] = useState(false)
  const [isManagerEditMode, setIsManagerEditMode] = useState(false)
  const [isManagerUnassignDialogOpen, setIsManagerUnassignDialogOpen] = useState(false)
  const [isReceiveMode, setIsReceiveMode] = useState(false)
  const [selectedReceiveRowIndices, setSelectedReceiveRowIndices] = useState<number[]>([])

  const isOrderIdInvalid = Boolean(orderId) && !isValidOrderId(orderId)
  const shouldLoadOrder = Boolean(orderId) && !isOrderIdInvalid
  const orderDetailsQuery = useOrderDetailsQuery(orderId ?? '', shouldLoadOrder)
  const assignOrderManagerMutation = useAssignOrderManagerMutation()
  const unassignOrderManagerMutation = useUnassignOrderManagerMutation()
  const statusMutation = useOrderStatusMutation()
  const updateOrderMutation = useUpdateOrderMutation()
  const receiveOrderProductsMutation = useReceiveOrderProductsMutation()
  const updateOrderDeliveryMutation = useUpdateOrderDeliveryMutation()
  const updateOrderPickupMutation = useUpdateOrderPickupMutation()
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
    canReceiveOrderProducts(order.status, order.delivery.status) &&
    hasPendingProductsToReceive
  const isSelectAllChecked =
    hasPendingProductsToReceive &&
    selectedReceivePendingRowIndices.length === pendingReceiveRowIndices.length
  const isSelectAllIndeterminate =
    selectedReceivePendingRowIndices.length > 0 &&
    selectedReceivePendingRowIndices.length < pendingReceiveRowIndices.length
  const isReceiveSavePending = receiveOrderProductsMutation.isPending
  const isReceiveSaveEnabled = selectedReceivePendingRowIndices.length > 0 && !isReceiveSavePending
  const orderProductDisplayRows = useMemo(() => buildOrderProductDisplayRows(order), [order])

  useEffect(() => {
    setIsNotFoundRedirectScheduled(false)
  }, [orderId])

  useEffect(() => {
    if (!order) {
      setIsCustomerEditMode(false)
      setIsProductsEditMode(false)
      setIsManagerEditMode(false)
      setIsReceiveMode(false)
      setSelectedReceiveRowIndices([])
      return
    }

    if (order.status !== 'Draft') {
      setIsCustomerEditMode(false)
      setIsProductsEditMode(false)
      setIsManagerEditMode(false)
    }

    if (
      !canReceiveOrderProducts(order.status, order.delivery.status) ||
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

  const handleStartCustomerEdit = () => {
    if (!order || order.status !== 'Draft') return
    setIsReceiveMode(false)
    setSelectedReceiveRowIndices([])
    setIsProductsEditMode(false)
    setIsCustomerEditMode(true)
  }

  const handleCancelCustomerEdit = () => {
    if (updateOrderMutation.isPending) return
    setIsCustomerEditMode(false)
  }

  const handleStartProductsEdit = () => {
    if (!order || order.status !== 'Draft') return
    setSelectedReceiveRowIndices([])
    setIsReceiveMode(false)
    setIsCustomerEditMode(false)
    setIsManagerEditMode(false)
    setIsProductsEditMode(true)
  }

  const handleCancelProductsEdit = () => {
    if (updateOrderMutation.isPending) return
    setIsProductsEditMode(false)
  }

  const handleSaveEditedCustomer = async (payload: { customer: string }) => {
    if (!order || !orderId) return false

    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        payload,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.updated, { variant: 'success' })
      setIsCustomerEditMode(false)
      return true
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.updateCustomerFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setIsCustomerEditMode(false)
        await reloadOrderDetailsWithSkeleton()
        return false
      }

      if (isOrderStateChangedErrorMessage(errorMessage)) {
        setIsCustomerEditMode(false)
        enqueueSnackbar(ordersUiText.errors.orderNoLongerDraft, { variant: 'warning' })
        await reloadOrderDetailsWithSkeleton()
        return false
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
      return false
    }
  }

  const handleSaveEditedProducts = async (payload: { products: OrderProductRequestItem[] }) => {
    if (!order || !orderId) return false

    try {
      await updateOrderMutation.mutateAsync({
        orderId,
        payload,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.updated, { variant: 'success' })
      setIsProductsEditMode(false)
      return true
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.updateProductsFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setIsProductsEditMode(false)
        await reloadOrderDetailsWithSkeleton()
        return false
      }

      if (isOrderStateChangedErrorMessage(errorMessage)) {
        enqueueSnackbar(ordersUiText.errors.orderNoLongerDraft, { variant: 'warning' })
        setIsProductsEditMode(false)
        await reloadOrderDetailsWithSkeleton()
        return false
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
      return false
    }
  }

  const handleStartManagerEdit = () => {
    if (!order || order.status !== 'Draft') return
    setIsReceiveMode(false)
    setSelectedReceiveRowIndices([])
    setIsCustomerEditMode(false)
    setIsProductsEditMode(false)
    setIsManagerEditMode(true)
  }

  const handleCancelManagerEdit = () => {
    if (assignOrderManagerMutation.isPending) return
    setIsManagerEditMode(false)
  }

  const handleSaveAssignedManager = async (nextManagerId: string) => {
    if (!orderId || !nextManagerId) return false

    try {
      await assignOrderManagerMutation.mutateAsync({
        orderId,
        managerId: nextManagerId,
        requestConfig: { skipErrorToast: true },
      })
      enqueueSnackbar(ordersUiText.toasts.managerAssigned, { variant: 'success' })
      setIsManagerEditMode(false)
      return true
    } catch (error) {
      const errorMessage = resolveApiErrorMessage(error, ordersUiText.errors.assignManagerFailed)
      if (isOrderNotFoundErrorMessage(errorMessage)) {
        setIsManagerEditMode(false)
        await reloadOrderDetailsWithSkeleton()
        return false
      }

      enqueueSnackbar(errorMessage, { variant: 'error' })
      return false
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
    if (
      !canStartReceive ||
      isReceiveSavePending ||
      isProductsEditMode ||
      isCustomerEditMode ||
      isManagerEditMode
    ) return
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
      .map((index) => {
        const line = order.products[index]
        if (!line) return null
        return {
          productId: line.productId,
          variantId: line.variantId,
        }
      })
      .filter((value): value is { productId: string; variantId: string } => Boolean(value))

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

  const handleSaveDelivery = async (delivery: OrderDeliverySavePayload) => {
    if (!orderId) return false

    try {
      if (delivery.mode === 'delivery') {
        await updateOrderDeliveryMutation.mutateAsync({
          orderId,
          delivery: delivery.payload,
          requestConfig: { skipErrorToast: true },
        })
      } else {
        await updateOrderPickupMutation.mutateAsync({
          orderId,
          pickup: delivery.payload,
          requestConfig: { skipErrorToast: true },
        })
      }
      enqueueSnackbar(ordersUiText.toasts.deliverySaved, { variant: 'success' })
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

      if (
        isOrderStateChangedErrorMessage(errorMessage) ||
        isProcessNeedsDeliveryErrorMessage(errorMessage)
      ) {
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

  const assignedManagerValue = resolveAssignedManagerName(order?.assignedManager ?? null)
  const isManagerAssigned = Boolean(order?.assignedManager)
  const isManagerActionPending =
    assignOrderManagerMutation.isPending || unassignOrderManagerMutation.isPending
  const isCustomerEditable = order?.status === 'Draft'
  const isProductsEditable = order?.status === 'Draft'
  const isReceiveStartVisible =
    canStartReceive &&
    !isReceiveMode &&
    !isProductsEditMode &&
    !isCustomerEditMode &&
    !isManagerEditMode
  const isReceiveModeVisible =
    isReceiveMode &&
    canStartReceive &&
    !isProductsEditMode &&
    !isCustomerEditMode &&
    !isManagerEditMode
  const isCancelVisible = order ? canShowCancelOrder(order.status, order.delivery.status) : false
  const isProcessVisible = order?.status === 'Draft'
  const isProcessDisabled =
    Boolean(isProcessVisible && order) && !canProcessOrder(order.delivery.status)
  const isReopenVisible = order?.status === 'Canceled'
  const productsSubtotal = order ? Math.max(order.total_price - order.delivery.price, 0) : 0

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

  const handleBackToOrders = () => {
    navigate('/orders', { replace: true })
  }

  return {
    orderId,
    order,
    orderDetailsQuery,
    isOrderIdInvalid,
    isDetailsReloading,
    isNotFoundError,
    activeTab,
    setActiveTab,
    isRefreshPending,
    isCustomerEditMode,
    isProductsEditMode,
    isManagerEditMode,
    isManagerUnassignDialogOpen,
    pendingStatusAction,
    setPendingStatusAction,
    detailsDialogCopy,
    commentDraft,
    setCommentDraft,
    isCommentValid,
    isCommentCreatePending,
    isCommentDeletePending,
    pendingDeleteCommentId,
    orderedComments,
    assignedManagerDisplayValue: assignedManagerValue,
    isManagerAssigned,
    isManagerActionPending,
    isCustomerEditable,
    isProductsEditable,
    isReceiveStartVisible,
    isReceiveModeVisible,
    isReceiveSavePending,
    isReceiveSaveEnabled,
    hasPendingProductsToReceive,
    isSelectAllChecked,
    isSelectAllIndeterminate,
    selectedReceivePendingRowIndices,
    isCancelVisible,
    isProcessVisible,
    isProcessDisabled,
    isReopenVisible,
    productsSubtotal,
    isDeliverySubmitting: updateOrderDeliveryMutation.isPending || updateOrderPickupMutation.isPending,
    isStatusSubmitting: statusMutation.isPending,
    isCustomerEditSavePending: updateOrderMutation.isPending,
    isProductsEditSavePending: updateOrderMutation.isPending,
    isManagerUnassignSubmitting: unassignOrderManagerMutation.isPending,
    orderProductDisplayRows,
    handleBackToOrders,
    handleRefresh,
    handleStartCustomerEdit,
    handleCancelCustomerEdit,
    handleSaveEditedCustomer,
    handleStartProductsEdit,
    handleCancelProductsEdit,
    handleSaveEditedProducts,
    handleStartManagerEdit,
    handleCancelManagerEdit,
    handleSaveAssignedManager,
    handleOpenManagerUnassignDialog,
    handleCloseManagerUnassignDialog,
    handleConfirmManagerUnassign,
    handleStartReceiveMode,
    handleCancelReceiveMode,
    handleToggleReceiveProduct,
    handleToggleSelectAllReceive,
    handleSaveReceivedProducts,
    handleSaveDelivery,
    handleConfirmStatusAction,
    handleCreateComment,
    handleDeleteComment,
  }
}
