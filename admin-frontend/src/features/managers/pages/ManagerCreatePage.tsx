import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useAuth } from '@/features/auth/useAuth'
import { ManagerCreateForm } from '@/features/managers/components/ManagerCreateForm'
import { useCreateManagerMutation } from '@/features/managers/hooks/useManagersQuery'
import { managersUiText } from '@/features/managers/managers.ui-text'

export function ManagerCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const createMutation = useCreateManagerMutation()

  const isAdmin = Boolean(user?.roles.includes('ADMIN'))

  useEffect(() => {
    if (!user || isAdmin) return
    enqueueSnackbar(managersUiText.toasts.addAccessDenied, { variant: 'warning' })
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
        enqueueSnackbar(managersUiText.toasts.created, { variant: 'success' })
        navigate('/managers')
      }}
    />
  )
}


