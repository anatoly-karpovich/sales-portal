import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { TOKEN_STORAGE_KEY } from '@/api/client'

type Props = {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { state } = useAuth()
  const hasToken = Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY))

  if (state === 'initializing') {
    return hasToken ? children : <Navigate to="/login" replace />
  }

  if (state === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return children
}
