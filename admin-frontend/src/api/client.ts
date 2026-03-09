import axios from 'axios'
import { emitApiError, emitUnauthorized } from '@/api/events'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
export const TOKEN_STORAGE_KEY = 'admin-frontend-access-token'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.ErrorMessage ?? error?.message ?? 'Request failed'
    const skipErrorToast = Boolean(error?.config?.skipErrorToast)

    if (status === 401) {
      emitUnauthorized()
    }

    if (!skipErrorToast) {
      emitApiError(message)
    }

    return Promise.reject(error)
  },
)
