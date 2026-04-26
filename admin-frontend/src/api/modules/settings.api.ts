import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type Settings = {
  order: {
    maxProductsInOrder: number
    maxProductQuantityInOrder: number
  }
  inventory: {
    defaultLowStockThreshold: number
  }
  delivery: {
    defaultCities: string[]
    basePricePerItem: number
    extraPriceForOtherCity: number
  }
}

export type SettingsUpdatePayload = {
  order?: Partial<Settings['order']>
  inventory?: Partial<Settings['inventory']>
  delivery?: Partial<Settings['delivery']>
}

type SettingsResponse = {
  Settings: Settings
  IsSuccess: boolean
  ErrorMessage: string | null
}

export async function getSettings(requestConfig?: ApiRequestConfig) {
  const response = await apiClient.get<SettingsResponse>('/settings', requestConfig)
  return response.data.Settings
}

export async function updateSettings(
  payload: SettingsUpdatePayload,
  requestConfig?: ApiRequestConfig,
) {
  const response = await apiClient.patch<SettingsResponse>('/settings', payload, requestConfig)
  return response.data.Settings
}
