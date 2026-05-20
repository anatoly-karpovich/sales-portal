import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type OrderStatus = 'Draft' | 'In Process' | 'Completed' | 'Canceled'
export type OrderDeliveryStatus =
  | 'Draft'
  | 'Delivery Planned'
  | 'Pickup Planned'
  | 'Delivery Scheduled'
  | 'Pickup Scheduled'
  | 'Partially Delivered'
  | 'Delivered'

export type OrderCustomerSnapshot = {
  _id: string
  email: string
  name: string
}

export type OrderDeliveryCondition = 'Delivery' | 'Pickup'
export type OrderDeliveryPricingTier = 'pickup' | 'local_city' | 'same_state' | 'out_of_state'

export type OrderDeliveryAddress = {
  state: string
  city: string
  street: string
  house: number
  apartment?: number
  zipCode: string
}

export type OrderDeliverySchedule =
  | {
      express: boolean
      estimatedDays: number | null
      estimatedDate: string | null
      startsAt: string | null
      dueDate: string | null
    }
  | {
      readyInDays: number | null
      holdForDays: number | null
      availableFromDate: string | null
      pickupByDate: string | null
      startsAt: string | null
    }

export type OrderDelivery = {
  status: OrderDeliveryStatus
  condition: OrderDeliveryCondition
  address: OrderDeliveryAddress
  price: number
  pricingTier: OrderDeliveryPricingTier
  schedule: OrderDeliverySchedule
  isOverdue: boolean
  overdueByDays: number
}

export type OrderDeliveryByAddressPayload = {
  express: boolean
  address: OrderDeliveryAddress
}

export type OrderPickupPayload = {
  pickupLocationId: string
}

export type OrderAssignedManager = {
  _id: string
  username: string
  firstName: string
  lastName: string
  createdOn: string
  roles?: string[]
}

export type OrderProductSnapshot = {
  _id: string
  name: string
  manufacturer: string
}

export type OrderListProduct = {
  product: OrderProductSnapshot
  variant: {
    _id: string
  }
  unitPrice: number
  quantity: number
  received: boolean
}

export type OrderDetailsProduct = {
  productId: string
  variantId: string
  manufacturer: string
  unitPrice: number
  quantity: number
  name: string
  attributes: Record<string, string>
  received: boolean
  imageUrl?: string
}

export type OrderInventoryReservationSummaryState =
  | 'Temporary Lock'
  | 'Processing Lock'
  | 'No Active Lock'
  | 'Consumed'
  | 'Released'

export type OrderInventoryReservationSummaryType =
  | 'Admin Draft'
  | 'Customer Draft'
  | 'Order Processing'
  | null

export type OrderInventoryReservationLineState =
  | 'Fully Reserved'
  | 'Partially Reserved'
  | 'Direct Order'
  | 'No Active Lock'
  | 'Consumed'
  | 'Released'

export type OrderInventoryReservationLine = {
  productId: string
  variantId: string
  orderedQuantity: number
  reservedQuantity: number
  directOrderQuantity: number
  state: OrderInventoryReservationLineState
}

export type OrderInventoryReservation = {
  summary: {
    state: OrderInventoryReservationSummaryState
    expiresAt: string | null
    type: OrderInventoryReservationSummaryType
  }
  lines: OrderInventoryReservationLine[]
}

export type OrderListItem = {
  _id: string
  status: OrderStatus
  customer: OrderCustomerSnapshot
  products: OrderListProduct[]
  delivery: OrderDelivery
  total_price: number
  createdOn: string
  assignedManager: OrderAssignedManager | null
}

export type OrderCustomerDetails = OrderCustomerSnapshot & {
  state: string
  city: string
  street: string
  house: number
  apartment?: number
  zipCode: string
  phone: string
  createdOn: string
  notes?: string
}

export type OrderComment = {
  _id?: string
  text: string
  createdOn: string
  createdBy?: {
    _id?: string
    firstName?: string
    lastName?: string
    username?: string
  } | null
}

export type OrderHistoryCustomerRef = string | { _id?: string } | null

export type OrderHistoryEntry = {
  action?: string
  status?: OrderStatus
  customer?: OrderHistoryCustomerRef
  products?: OrderDetailsProduct[]
  delivery: OrderDelivery
  total_price?: number
  changedOn?: string
  performer?: OrderAssignedManager | null
  assignedManager?: OrderAssignedManager | null
}

export type OrderDetails = Omit<OrderListItem, 'customer' | 'products'> & {
  customer: OrderCustomerDetails
  products: OrderDetailsProduct[]
  comments: OrderComment[]
  history: OrderHistoryEntry[]
  inventoryReservation: OrderInventoryReservation
}

export type OrderPricingResult = {
  totalPrice: number
  products: {
    subtotal: number
    linesCount: number
    unitsCount: number
  }
  delivery: {
    price: number
    pricingTier: OrderDeliveryPricingTier | null
    isExpress: boolean
    lineCount: number
    estimatedDays: number | null
    estimatedDate: string | null
    availableFromDate: string | null
    pickupByDate: string | null
    schedule?:
      | {
          express: boolean
          estimatedDays: number | null
          estimatedDate: string | null
          startsAt: string | null
          dueDate: string | null
        }
      | {
          readyInDays: number | null
          holdForDays: number | null
          availableFromDate: string | null
          pickupByDate: string | null
          startsAt: string | null
        }
    breakdown: {
      basePerLine: number
      expressExtraPerLine: number
    }
  }
}

export type OrdersListResponse = {
  Orders: OrderListItem[]
  total: number
  page: number
  limit: number
  search: string
  status: OrderStatus[]
  deliveryStatus: OrderDeliveryStatus[]
  sorting: {
    sortField: 'createdOn' | 'total_price' | 'status'
    sortOrder: 'asc' | 'desc'
  }
  IsSuccess: boolean
  ErrorMessage: string | null
}

type OrderResponse<TOrder = OrderListItem> = {
  Order: TOrder
  IsSuccess: boolean
  ErrorMessage: string | null
}

type OrderPricingResponse = {
  Pricing: OrderPricingResult
  IsSuccess: boolean
  ErrorMessage: string | null
}

function normalizeOrderPricingResult(pricing: OrderPricingResult): OrderPricingResult {
  const schedule = pricing.delivery.schedule
  const estimatedDateFromSchedule =
    schedule && 'estimatedDate' in schedule ? schedule.estimatedDate : null
  const availableFromDateFromSchedule =
    schedule && 'availableFromDate' in schedule ? schedule.availableFromDate : null
  const pickupByDateFromSchedule =
    schedule && 'pickupByDate' in schedule ? schedule.pickupByDate : null

  return {
    ...pricing,
    delivery: {
      ...pricing.delivery,
      estimatedDate: pricing.delivery.estimatedDate ?? estimatedDateFromSchedule,
      availableFromDate: pricing.delivery.availableFromDate ?? availableFromDateFromSchedule,
      pickupByDate: pricing.delivery.pickupByDate ?? pickupByDateFromSchedule,
    },
  }
}

export type OrdersQuery = {
  search: string
  status: OrderStatus[]
  deliveryStatus?: OrderDeliveryStatus[]
  sortField: 'createdOn' | 'total_price' | 'status'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export type OrdersExportPayload = {
  format: 'csv' | 'json'
  filters: {
    search: string
    status: OrderStatus[]
    deliveryStatus?: OrderDeliveryStatus[]
    page: number
    limit: number
    sortField: 'createdOn' | 'total_price' | 'status'
    sortOrder: 'asc' | 'desc'
  } | null
  fields: string[]
}

export type CreateOrderPayload = {
  customer: string
  products: OrderProductRequestItem[]
}

export type OrderProductRequestItem = {
  quantity: number
  id?: string
  productId?: string
  variantId?: string
}

export type OrderPricingPayload =
  | {
      products: OrderProductRequestItem[]
      delivery: OrderDeliveryByAddressPayload
      pickup?: never
    }
  | {
      products: OrderProductRequestItem[]
      pickup: OrderPickupPayload
      delivery?: never
    }
  | {
      products: OrderProductRequestItem[]
      delivery?: never
      pickup?: never
    }

export type UpdateOrderPayload =
  | {
      customer: string
      products?: OrderProductRequestItem[]
    }
  | {
      customer?: string
      products: OrderProductRequestItem[]
    }

export type OrderStatusUpdatePayload = {
  orderId: string
  status: OrderStatus
  requestConfig?: ApiRequestConfig
}

export type OrderCommentCreatePayload = {
  orderId: string
  comment: string
}

export type OrderCommentDeletePayload = {
  orderId: string
  commentId: string
}

export type OrderReceivePayload = {
  orderId: string
  products: Array<{
    productId: string
    variantId: string
  }>
  requestConfig?: ApiRequestConfig
}

export type OrderDeliveryUpdatePayload = {
  orderId: string
  delivery: OrderDeliveryByAddressPayload
}

export type OrderPickupUpdatePayload = {
  orderId: string
  pickup: OrderPickupPayload
}

export type OrderAssignManagerPayload = {
  orderId: string
  managerId: string
  requestConfig?: ApiRequestConfig
}

export type OrderUnassignManagerPayload = {
  orderId: string
  requestConfig?: ApiRequestConfig
}

export type OrderQuery = OrdersQuery

export async function getOrders(query: OrdersQuery) {
  const response = await apiClient.get<OrdersListResponse>('/orders', {
    params: { ...query, status: query.status },
  })
  return response.data
}

export async function createOrder(payload: CreateOrderPayload) {
  const response = await apiClient.post<OrderResponse<OrderDetails>>('/orders', payload)
  return response.data.Order
}

export async function calculateOrderPricing(
  payload: OrderPricingPayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.post<OrderPricingResponse>(
    '/orders/pricing',
    payload,
    requestConfig,
  )
  return normalizeOrderPricingResult(response.data.Pricing)
}

export async function updateOrder(
  orderId: string,
  payload: UpdateOrderPayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.patch<OrderResponse<OrderDetails>>(
    `/orders/${orderId}`,
    payload,
    requestConfig,
  )
  return response.data.Order
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.put<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/status`,
    { status },
    requestConfig,
  )
  return response.data.Order
}

export async function getOrderById(orderId: string) {
  const requestConfig: ApiRequestConfig = { skipErrorToast: true }
  const response = await apiClient.get<OrderResponse<OrderDetails>>(
    `/orders/${orderId}`,
    requestConfig,
  )
  return response.data.Order
}

export async function createOrderComment(
  orderId: string,
  comment: string,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.post<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/comments`,
    { comment },
    requestConfig,
  )
  return response.data.Order
}

export async function deleteOrderComment(
  orderId: string,
  commentId: string,
  requestConfig?: ApiRequestConfig,
) {
  await apiClient.delete(`/orders/${orderId}/comments/${commentId}`, requestConfig)
}

export async function receiveOrderProducts(
  orderId: string,
  products: Array<{ productId: string; variantId: string }>,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.post<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/receive`,
    { products },
    requestConfig,
  )
  return response.data.Order
}

export async function updateOrderDelivery(
  orderId: string,
  delivery: OrderDeliveryByAddressPayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.patch<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/delivery`,
    delivery,
    requestConfig,
  )
  return response.data.Order
}

export async function updateOrderPickup(
  orderId: string,
  pickup: OrderPickupPayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.patch<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/pickup`,
    pickup,
    requestConfig,
  )
  return response.data.Order
}

export async function assignOrderManager(
  orderId: string,
  managerId: string,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.put<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/assign-manager/${managerId}`,
    {},
    requestConfig,
  )
  return response.data.Order
}

export async function unassignOrderManager(orderId: string, requestConfig?: ApiRequestConfig) {
  const response = await apiClient.put<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/unassign-manager`,
    {},
    requestConfig,
  )
  return response.data.Order
}

export async function exportOrders(payload: OrdersExportPayload) {
  return apiClient.post('/orders/export', payload, { responseType: 'blob' })
}
