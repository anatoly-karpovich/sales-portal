import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { AuthRouteFallback } from '@/app/router/AuthRouteFallback'

type Props = {
  children: React.ReactNode
}

export function PublicOnlyRoute({ children }: Props) {
  const { state } = useAuth()

  if (state === 'initializing') {
    return <AuthRouteFallback />
  }

  if (state === 'authenticated') {
    return <Navigate to="/home" replace />
  }

  return children
}
