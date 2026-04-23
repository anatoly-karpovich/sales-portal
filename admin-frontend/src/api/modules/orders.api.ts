import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type OrderStatus = 'Draft' | 'In Process' | 'Partially Received' | 'Received' | 'Canceled'

export type OrderCustomerSnapshot = {
  _id: string
  email: string
  name: string
}

export type OrderDeliveryAddress = {
  country: string
  city: string
  street: string
  house: number
  flat: number
}

export type OrderDelivery = {
  finalDate: string
  condition: 'Delivery' | 'Pickup'
  address: OrderDeliveryAddress
}

export type OrderAssignedManager = {
  _id: string
  username: string
  firstName: string
  lastName: string
  createdOn: string
  roles?: string[]
}

export type OrderProduct = {
  _id: string
  name: string
  amount: number
  price: number
  manufacturer: string
  notes?: string
  received: boolean
}

export type OrderListItem = {
  _id: string
  status: OrderStatus
  customer: OrderCustomerSnapshot
  products: OrderProduct[]
  delivery: OrderDelivery | null
  total_price: number
  createdOn: string
  assignedManager: OrderAssignedManager | null
}

export type OrderCustomerDetails = OrderCustomerSnapshot & {
  country: string
  city: string
  street: string
  house: number
  flat: number
  phone: string
  createdOn: string
  notes?: string
}

export type OrderComment = {
  _id?: string
  text: string
  createdOn: string
  createdBy?: string | { firstName?: string; lastName?: string; username?: string }
}

export type OrderHistoryCustomerRef = string | { _id?: string } | null

export type OrderHistoryEntry = {
  action?: string
  status?: OrderStatus
  customer?: OrderHistoryCustomerRef
  products?: OrderProduct[]
  delivery?: OrderDelivery | null
  total_price?: number
  changedOn?: string
  performer?: OrderAssignedManager | null
  assignedManager?: OrderAssignedManager | null
}

export type OrderDetails = Omit<OrderListItem, 'customer'> & {
  customer: OrderCustomerDetails
  comments: OrderComment[]
  history: OrderHistoryEntry[]
}

export type OrdersListResponse = {
  Orders: OrderListItem[]
  total: number
  page: number
  limit: number
  search: string
  status: OrderStatus[]
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

export type OrdersQuery = {
  search: string
  status: OrderStatus[]
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
    page: number
    limit: number
    sortField: 'createdOn' | 'total_price' | 'status'
    sortOrder: 'asc' | 'desc'
  } | null
  fields: string[]
}

export type CreateOrderPayload = {
  customer: string
  products: string[]
}

export type UpdateOrderPayload = CreateOrderPayload

export type OrderStatusUpdatePayload = {
  orderId: string
  status: OrderStatus
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
  products: string[]
}

export type OrderDeliveryUpdatePayload = {
  orderId: string
  delivery: OrderDelivery
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

export async function updateOrder(orderId: string, payload: UpdateOrderPayload, requestConfig?: ApiRequestConfig) {
  const response = await apiClient.put<OrderResponse<OrderDetails>>(`/orders/${orderId}`, payload, requestConfig)
  return response.data.Order
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const response = await apiClient.put<OrderResponse<OrderDetails>>(`/orders/${orderId}/status`, { status })
  return response.data.Order
}

export async function getOrderById(orderId: string) {
  const requestConfig: ApiRequestConfig = { skipErrorToast: true }
  const response = await apiClient.get<OrderResponse<OrderDetails>>(`/orders/${orderId}`, requestConfig)
  return response.data.Order
}

export async function createOrderComment(orderId: string, comment: string, requestConfig?: ApiRequestConfig) {
  const response = await apiClient.post<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/comments`,
    { comment },
    requestConfig,
  )
  return response.data.Order
}

export async function deleteOrderComment(orderId: string, commentId: string, requestConfig?: ApiRequestConfig) {
  await apiClient.delete(`/orders/${orderId}/comments/${commentId}`, requestConfig)
}

export async function receiveOrderProducts(orderId: string, products: string[]) {
  const response = await apiClient.post<OrderResponse<OrderDetails>>(`/orders/${orderId}/receive`, { products })
  return response.data.Order
}

export async function updateOrderDelivery(
  orderId: string,
  delivery: OrderDelivery,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.post<OrderResponse<OrderDetails>>(
    `/orders/${orderId}/delivery`,
    delivery,
    requestConfig,
  )
  return response.data.Order
}

export async function exportOrders(payload: OrdersExportPayload) {
  return apiClient.post('/orders/export', payload, { responseType: 'blob' })
}
