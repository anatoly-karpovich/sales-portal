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

type UsersResponse = {
  Users: User[]
  IsSuccess: boolean
  ErrorMessage: string | null
}

export async function getUsers(requestConfig?: ApiRequestConfig) {
  const response = await apiClient.get<UsersResponse>('/users', requestConfig)
  return response.data.Users
}
