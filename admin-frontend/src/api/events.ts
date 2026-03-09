export const API_ERROR_EVENT = 'app:api-error'
export const API_UNAUTHORIZED_EVENT = 'app:unauthorized'

type ApiErrorDetail = {
  message: string
}

export function emitApiError(message: string) {
  window.dispatchEvent(new CustomEvent<ApiErrorDetail>(API_ERROR_EVENT, { detail: { message } }))
}

export function emitUnauthorized() {
  window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT))
}
