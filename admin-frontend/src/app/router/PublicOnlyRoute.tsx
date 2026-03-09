import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { TOKEN_STORAGE_KEY } from '@/api/client'

type Props = {
  children: React.ReactNode
}

export function PublicOnlyRoute({ children }: Props) {
  const { state } = useAuth()
  const hasToken = Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY))

  if (state === 'initializing') {
    return hasToken ? null : children
  }

  if (state === 'authenticated') {
    return <Navigate to="/home" replace />
  }

  return children
}
