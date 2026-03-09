import { apiClient } from '@/api/client'

export type Product = {
  _id: string
  name: string
  amount: number
  price: number
  manufacturer: string
  createdOn: string
  notes?: string
}

export type ProductsListResponse = {
  Products: Product[]
  total: number
  page: number
  limit: number
  search: string
  manufacturer: string[]
  sorting: {
    sortField: 'name' | 'price' | 'manufacturer' | 'createdOn'
    sortOrder: 'asc' | 'desc'
  }
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type ProductExportPayload = {
  format: 'csv' | 'json'
  filters: {
    search: string
    manufacturer: string[]
    page: number
    limit: number
    sortField: 'name' | 'price' | 'manufacturer' | 'createdOn'
    sortOrder: 'asc' | 'desc'
  } | null
  fields: string[]
}

export type ProductsQuery = {
  search: string
  manufacturer: string[]
  sortField: 'name' | 'price' | 'manufacturer' | 'createdOn'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export async function getProducts(query: ProductsQuery) {
  const response = await apiClient.get<ProductsListResponse>('/products', {
    params: {
      ...query,
      manufacturer: query.manufacturer,
    },
  })
  return response.data
}

export async function exportProducts(payload: ProductExportPayload) {
  const response = await apiClient.post('/products/export', payload, {
    responseType: 'blob',
  })
  return response
}
