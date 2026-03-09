import { CircularProgress, Stack } from '@mui/material'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

type Props = {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { state } = useAuth()

  if (state === 'initializing') {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Stack>
    )
  }

  if (state === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return children
}
