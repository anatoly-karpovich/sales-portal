import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type Manager = {
  _id: string
  username: string
  firstName: string
  lastName: string
  roles: string[]
  createdOn: string
}

export type ManagerOrder = {
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

export type ManagerCreatePayload = {
  username: string
  password: string
  firstName: string
  lastName: string
}

export type ManagerPasswordChangePayload = {
  oldPassword: string
  newPassword: string
}

type ManagersResponse = {
  Managers: Manager[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

type ManagerResponse = {
  Manager: Manager
  IsSuccess: boolean
  ErrorMessage: string | null
}

type ManagerDetailsResponse = {
  Manager: Manager
  Orders: ManagerOrder[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type ManagerDetailsPayload = {
  Manager: Manager
  Orders: ManagerOrder[]
}

export async function getManagers(requestConfig?: ApiRequestConfig) {
  const response = await apiClient.get<ManagersResponse>('/managers', requestConfig)
  return response.data.Managers
}

export async function getManagerById(managerId: string, requestConfig?: ApiRequestConfig) {
  const response = await apiClient.get<ManagerDetailsResponse>(
    `/managers/${managerId}`,
    requestConfig,
  )
  return { Manager: response.data.Manager, Orders: response.data.Orders }
}

export async function createManager(
  payload: ManagerCreatePayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.post<ManagerResponse>('/managers', payload, requestConfig)
  return response.data.Manager
}

export async function deleteManager(managerId: string, requestConfig?: ApiRequestConfig) {
  await apiClient.delete(`/managers/${managerId}`, requestConfig)
}

export async function changeManagerPassword(
  managerId: string,
  payload: ManagerPasswordChangePayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.patch<ManagerResponse>(
    `/managers/password/${managerId}`,
    payload,
    requestConfig,
  )
  return response.data.Manager
}
