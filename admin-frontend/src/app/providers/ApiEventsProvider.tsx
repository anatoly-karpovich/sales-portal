import { useEffect } from 'react'
import { useSnackbar } from 'notistack'
import { API_ERROR_EVENT } from '@/api/events'

type ApiErrorDetail = {
  message: string
}

type Props = {
  children: React.ReactNode
}

export function ApiEventsProvider({ children }: Props) {
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    const onApiError = (event: Event) => {
      const customEvent = event as CustomEvent<ApiErrorDetail>
      const message = customEvent.detail?.message || 'Request failed'
      enqueueSnackbar(message, { variant: 'error' })
    }

    window.addEventListener(API_ERROR_EVENT, onApiError)
    return () => window.removeEventListener(API_ERROR_EVENT, onApiError)
  }, [enqueueSnackbar])

  return children
}
