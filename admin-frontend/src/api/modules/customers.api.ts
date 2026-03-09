import { apiClient } from '@/api/client'

export type CustomerQuery = {
  search: string
  country: string[]
  sortField: 'email' | 'name' | 'country' | 'createdOn'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export async function getCustomers(query: CustomerQuery) {
  return apiClient.get('/customers', { params: { ...query, country: query.country } })
}

export async function exportCustomers(payload: unknown) {
  return apiClient.post('/customers/export', payload, { responseType: 'blob' })
}
