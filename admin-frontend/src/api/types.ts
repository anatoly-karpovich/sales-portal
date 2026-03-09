import type { AxiosRequestConfig } from 'axios'

export type ApiRequestConfig = AxiosRequestConfig & {
  skipErrorToast?: boolean
}
