import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type User = {
  _id: string
  username: string
  firstName: string
  lastName: string
  roles: string[]
  createdOn: string
}

export type UserOrder = {
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

export type UserCreatePayload = {
  username: string
  password: string
  firstName: string
  lastName: string
}

export type UserPasswordChangePayload = {
  oldPassword: string
  newPassword: string
}

type UsersResponse = {
  Users: User[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

type UserResponse = {
  User: User
  IsSuccess: boolean
  ErrorMessage: string | null
}

type UserDetailsResponse = {
  User: User
  Orders: UserOrder[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export type UserDetailsPayload = {
  User: User
  Orders: UserOrder[]
}

export async function getUsers(requestConfig?: ApiRequestConfig) {
  const response = await apiClient.get<UsersResponse>('/users', requestConfig)
  return response.data.Users
}

export async function getUserById(userId: string, requestConfig?: ApiRequestConfig) {
  const response = await apiClient.get<UserDetailsResponse>(`/users/${userId}`, requestConfig)
  return { User: response.data.User, Orders: response.data.Orders }
}

export async function createUser(payload: UserCreatePayload, requestConfig?: ApiRequestConfig) {
  const response = await apiClient.post<UserResponse>('/users', payload, requestConfig)
  return response.data.User
}

export async function deleteUser(userId: string, requestConfig?: ApiRequestConfig) {
  await apiClient.delete(`/users/${userId}`, requestConfig)
}

export async function changeUserPassword(
  userId: string,
  payload: UserPasswordChangePayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.patch<UserResponse>(`/users/password/${userId}`, payload, requestConfig)
  return response.data.User
}
