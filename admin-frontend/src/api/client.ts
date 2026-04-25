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

async function extractApiErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text()
      const parsed = JSON.parse(text) as { ErrorMessage?: string }
      if (parsed?.ErrorMessage) {
        return parsed.ErrorMessage
      }
      return text || 'Request failed'
    } catch {
      return 'Request failed'
    }
  }

  if (responseData && typeof responseData === 'object') {
    const message = (responseData as { ErrorMessage?: unknown }).ErrorMessage
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  const fallbackMessage = (error as { message?: unknown })?.message
  return typeof fallbackMessage === 'string' && fallbackMessage.trim().length > 0 ? fallbackMessage : 'Request failed'
}

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const message = await extractApiErrorMessage(error)
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
