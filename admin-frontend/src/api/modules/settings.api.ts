import { apiClient } from '@/api/client'
import type { ApiRequestConfig } from '@/api/types'

export type PickupLocation = {
  id: string
  city: string
  address: {
    street: string
    house: number
    apartment?: number
    zipCode: string
  }
  isActive: boolean
}

export type Settings = {
  order: {
    maxProductsInOrder: number
    maxProductQuantityInOrder: number
  }
  inventory: {
    defaultLowStockThreshold: number
  }
  shipping: {
    processing: {
      cutoffHour: number
    }
    delivery: {
      pricing: {
        localCity: {
          basePrice: number
          minDays: number
          express: {
            days: number
            extraPrice: number
          }
        }
        sameState: {
          basePrice: number
          minDays: number
          express: {
            days: number
            extraPrice: number
          }
        }
        outOfState: {
          basePrice: number
          minDays: number
          express: {
            days: number
            extraPrice: number
          }
        }
      }
    }
    pickup: {
      policy: {
        readyInDays: number
        holdForDays: number
        remindBeforeDays?: number
      }
      locations: Record<string, PickupLocation[]>
    }
  }
  catalog?: {
    manufacturers: string[]
  }
}

export type SettingsUpdatePayload = {
  order?: Partial<Settings['order']>
  inventory?: Partial<Settings['inventory']>
  shipping?: Partial<Settings['shipping']>
  catalog?: Partial<NonNullable<Settings['catalog']>>
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
