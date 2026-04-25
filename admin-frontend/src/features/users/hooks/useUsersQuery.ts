import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeUserPassword,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  type UserCreatePayload,
  type UserPasswordChangePayload,
} from '@/api/modules/users.api'
import type { ApiRequestConfig } from '@/api/types'
import { usersQueryKeys } from '@/features/users/hooks/usersQueryKeys'

export function useUsersQuery() {
  return useQuery({
    queryKey: usersQueryKeys.list(),
    queryFn: () => getUsers(),
    placeholderData: (previousData) => previousData,
  })
}

export function useUserDetailsQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.detail(userId),
    queryFn: () => getUserById(userId, { skipErrorToast: true }),
    enabled,
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserCreatePayload) => createUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersQueryKeys.all })
    },
  })
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, requestConfig }: { userId: string; requestConfig?: ApiRequestConfig }) =>
      deleteUser(userId, requestConfig),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: usersQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: usersQueryKeys.detail(variables.userId) })
    },
  })
}

export function useChangeUserPasswordMutation() {
  return useMutation({
    mutationFn: ({
      userId,
      payload,
      requestConfig,
    }: {
      userId: string
      payload: UserPasswordChangePayload
      requestConfig?: ApiRequestConfig
    }) => changeUserPassword(userId, payload, requestConfig),
  })
}
