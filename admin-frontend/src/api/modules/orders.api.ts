import { apiClient } from '@/api/client'

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
  condition: string
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

export type OrderListItem = {
  _id: string
  status: OrderStatus
  customer: OrderCustomerSnapshot
  delivery: OrderDelivery | null
  total_price: number
  createdOn: string
  assignedManager: OrderAssignedManager | null
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

type OrderResponse = {
  Order: OrderListItem
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

export type OrderStatusUpdatePayload = {
  orderId: string
  status: OrderStatus
}

export type OrderQuery = OrdersQuery

export async function getOrders(query: OrdersQuery) {
  const response = await apiClient.get<OrdersListResponse>('/orders', {
    params: { ...query, status: query.status },
  })
  return response.data
}

export async function createOrder(payload: CreateOrderPayload) {
  const response = await apiClient.post<OrderResponse>('/orders', payload)
  return response.data.Order
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const response = await apiClient.put<OrderResponse>(`/orders/${orderId}/status`, { status })
  return response.data.Order
}

export async function exportOrders(payload: OrdersExportPayload) {
  return apiClient.post('/orders/export', payload, { responseType: 'blob' })
}
