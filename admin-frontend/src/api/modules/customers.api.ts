import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type Customer = {
  _id: string
  email: string
  name: string
  city: string
  street: string
  house: number
  flat: number
  phone: string
  notes?: string
  createdOn: string
}

export type CustomerUpsertPayload = {
  email: string
  name: string
  city: string
  street: string
  house: number
  flat: number
  phone: string
  notes?: string
}

export type CustomersListResponse = {
  Customers: Customer[]
  total: number
  page: number
  limit: number
  search: string
  sorting: {
    sortField: 'email' | 'name' | 'createdOn'
    sortOrder: 'asc' | 'desc'
  }
  IsSuccess: boolean
  ErrorMessage: string | null
}

type CustomerResponse = {
  Customer: Customer
  IsSuccess: boolean
  ErrorMessage: string | null
}

type CustomersAllResponse = {
  Customers: Customer[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type CustomerOrder = {
  _id: string
  total_price: number
  status: string
  createdOn: string
  changedOn?: string
  updatedOn?: string
  updatedAt?: string
  lastModified?: string
  history?: Array<{
    changedOn?: string
    createdOn?: string
    createdAt?: string
    updatedOn?: string
    updatedAt?: string
  }>
  History?: Array<{
    changedOn?: string
    createdOn?: string
    createdAt?: string
    updatedOn?: string
    updatedAt?: string
  }>
}

type CustomerOrdersResponse = {
  Orders: CustomerOrder[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type CustomerExportPayload = {
  format: 'csv' | 'json'
  filters: {
    search: string
    page: number
    limit: number
    sortField: 'email' | 'name' | 'createdOn'
    sortOrder: 'asc' | 'desc'
  } | null
  fields: string[]
}

export type CustomersQuery = {
  search: string
  sortField: 'email' | 'name' | 'createdOn'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export async function getCustomers(query: CustomersQuery) {
  const response = await apiClient.get<CustomersListResponse>('/customers', {
    params: query,
  })
  return response.data
}

export async function getAllCustomers() {
  const response = await apiClient.get<CustomersAllResponse>('/customers/all')
  return response.data.Customers
}

export async function getCustomerById(customerId: string, requestConfig?: ApiRequestConfig) {
  const response = await apiClient.get<CustomerResponse>(`/customers/${customerId}`, requestConfig)
  return response.data.Customer
}

export async function createCustomer(payload: CustomerUpsertPayload) {
  const response = await apiClient.post<CustomerResponse>('/customers', payload)
  return response.data.Customer
}

export async function updateCustomer(customerId: string, payload: CustomerUpsertPayload) {
  const response = await apiClient.put<CustomerResponse>(`/customers/${customerId}`, payload)
  return response.data.Customer
}

export async function deleteCustomer(customerId: string) {
  await apiClient.delete(`/customers/${customerId}`)
}

export async function getCustomerOrders(customerId: string) {
  const response = await apiClient.get<CustomerOrdersResponse>(`/customers/${customerId}/orders`)
  return response.data.Orders
}

export async function exportCustomers(payload: CustomerExportPayload) {
  const response = await apiClient.post('/customers/export', payload, {
    responseType: 'blob',
  })
  return response
}
