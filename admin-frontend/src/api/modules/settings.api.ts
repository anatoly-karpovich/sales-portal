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
    basePricePerItem: number
    extraPriceForOtherCity: number
    pickupLocations: Record<
      string,
      Array<{
        id: string
        city: string
        address: {
          street: string
          house: number
          apartment?: number
          zipCode: string
        }
        isActive: boolean
      }>
    >
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
