import { apiClient, TOKEN_STORAGE_KEY } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'
import type { AppUser } from '@/features/auth/auth.types'

export const USER_STORAGE_KEY = 'admin-frontend-user'

type LoginResponse = {
  IsSuccess: boolean
  ErrorMessage: string | null
  User: AppUser
}

type MeResponse = {
  IsSuccess: boolean
  ErrorMessage: string | null
  User: AppUser
}

function readTokenFromHeaders(headers: unknown) {
  if (!headers || typeof headers !== 'object') {
    return undefined
  }
  const typedHeaders = headers as Record<string, unknown>
  const token = typedHeaders.authorization ?? typedHeaders.Authorization
  return typeof token === 'string' ? token : undefined
}

export async function loginRequest(username: string, password: string) {
  const requestConfig: ApiRequestConfig = { skipErrorToast: true }
  const response = await apiClient.post<LoginResponse>(
    '/login',
    { username, password },
    requestConfig,
  )

  const token = readTokenFromHeaders(response.headers)
  if (!token) {
    throw new Error('Authorization token was not provided by backend')
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.User))

  return response.data.User
}

export async function meRequest() {
  const requestConfig: ApiRequestConfig = { skipErrorToast: true }
  const response = await apiClient.get<MeResponse>('/users/me', requestConfig)
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.User))
  return response.data.User
}

export async function logoutRequest() {
  const requestConfig: ApiRequestConfig = { skipErrorToast: true }
  await apiClient.post('/logout', {}, requestConfig)
}

export function clearSessionStorage() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(USER_STORAGE_KEY)
}

export function readStoredUser() {
  const raw = window.localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppUser
  } catch {
    return null
  }
}
