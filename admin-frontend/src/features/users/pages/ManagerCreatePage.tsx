import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useAuth } from '@/features/auth/useAuth'
import { ManagerCreateForm } from '@/features/users/components/ManagerCreateForm'
import { useCreateUserMutation } from '@/features/users/hooks/useUsersQuery'
import { usersUiText } from '@/features/users/users.ui-text'

export function ManagerCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const createMutation = useCreateUserMutation()

  const isAdmin = Boolean(user?.roles.includes('ADMIN'))

  useEffect(() => {
    if (!user || isAdmin) return
    enqueueSnackbar(usersUiText.toasts.addAccessDenied, { variant: 'warning' })
    navigate('/managers', { replace: true })
  }, [enqueueSnackbar, isAdmin, navigate, user])

  if (!user || !isAdmin) {
    return null
  }

  return (
    <ManagerCreateForm
      isSubmitting={createMutation.isPending}
      onSubmit={async (payload) => {
        await createMutation.mutateAsync(payload)
        enqueueSnackbar(usersUiText.toasts.created, { variant: 'success' })
        navigate('/managers')
      }}
    />
  )
}
