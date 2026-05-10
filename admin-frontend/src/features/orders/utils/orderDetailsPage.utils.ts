import { isAxiosError } from 'axios'
import type {
  OrderAssignedManager,
  OrderDeliveryStatus,
  OrderDetails,
  OrderStatus,
} from '@/api/modules/orders.api'
import noImageProduct from '@/assets/no-image-product.jpeg'
import { ordersUiText } from '@/features/orders/orders.ui-text'

export type PendingStatusAction = 'cancel' | 'process' | 'reopen' | null

const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i

const ORDER_STATE_CHANGED_ERROR_MESSAGES = new Set([
  'Invalid order status',
  "Can't reopen not canceled order",
  'Incorrect amount of received products',
])

export function resolveApiErrorMessage(error: unknown, fallback: string) {
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

export function isValidOrderId(value: string) {
  return MONGO_OBJECT_ID_REGEX.test(value)
}

export function isOrderNotFoundErrorMessage(message: string) {
  return (
    message === ordersUiText.errors.orderNotFound ||
    /^Order with id '.*' wasn't found$/.test(message)
  )
}

export function isOrderStateChangedErrorMessage(message: string) {
  return (
    ORDER_STATE_CHANGED_ERROR_MESSAGES.has(message) ||
    /^Product with Id '.*' is not requested$/.test(message)
  )
}

export function isProcessNeedsDeliveryErrorMessage(message: string) {
  return message === "Can't process order. Please, schedule delivery"
}

export function resolveAssignedManagerName(assignedManager: OrderAssignedManager | null) {
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
  return (
    deliveryStatus === 'Draft' ||
    deliveryStatus === 'Delivery Planned' ||
    deliveryStatus === 'Pickup Planned' ||
    deliveryStatus === 'Delivery Scheduled' ||
    deliveryStatus === 'Pickup Scheduled'
  )
}

export function canShowCancelOrder(status: OrderStatus, deliveryStatus: OrderDeliveryStatus) {
  return canCancelOrder(status) && canCancelOrderByDeliveryStatus(deliveryStatus)
}

export function canReceiveOrderProducts(status: OrderStatus, deliveryStatus: OrderDeliveryStatus) {
  return (
    status === 'In Process' &&
    (
      deliveryStatus === 'Delivery Scheduled' ||
      deliveryStatus === 'Pickup Scheduled' ||
      deliveryStatus === 'Partially Delivered'
    )
  )
}

export function canProcessOrder(deliveryStatus: OrderDeliveryStatus) {
  return deliveryStatus === 'Delivery Planned' || deliveryStatus === 'Pickup Planned'
}

function resolveVariantLabelFromSnapshotAttributes(attributes: Record<string, string>) {
  const parts = Object.values(attributes)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return parts.join(' | ')
}

export function buildOrderProductDisplayRows(order: OrderDetails | undefined) {
  if (!order) return []

  return order.products.map((product) => {
    const variantLabel = resolveVariantLabelFromSnapshotAttributes(product.attributes)
    const displayName = variantLabel ? `${product.name} | ${variantLabel}` : product.name
    const manufacturer = product.manufacturer?.trim() || '-'
    const imageUrl = product.imageUrl?.trim() || noImageProduct

    return {
      displayName,
      manufacturer,
      imageUrl,
    }
  })
}
