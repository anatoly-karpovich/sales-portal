import { useEffect } from 'react'
import { useSnackbar } from 'notistack'
import { subscribeToApiErrors } from '@/api/events'

type Props = {
  children: React.ReactNode
}

export function ApiEventsProvider({ children }: Props) {
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    return subscribeToApiErrors(({ message }) => {
      enqueueSnackbar(message, { variant: 'error' })
    })
  }, [enqueueSnackbar])

  return children
}
