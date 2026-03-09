import { apiClient } from '@/api/client'

export type OrderQuery = {
  search: string
  status: string[]
  sortField: 'createdOn' | 'total_price' | 'status'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export async function getOrders(query: OrderQuery) {
  return apiClient.get('/orders', { params: { ...query, status: query.status } })
}

export async function exportOrders(payload: unknown) {
  return apiClient.post('/orders/export', payload, { responseType: 'blob' })
}
