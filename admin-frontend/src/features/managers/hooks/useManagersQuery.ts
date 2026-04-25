import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeManagerPassword,
  createManager,
  deleteManager,
  getManagerById,
  getManagers,
  type ManagerCreatePayload,
  type ManagerPasswordChangePayload,
} from '@/api/modules/managers.api'
import type { ApiRequestConfig } from '@/api/types'
import { managersQueryKeys } from '@/features/managers/hooks/managersQueryKeys'

export function useManagersQuery() {
  return useQuery({
    queryKey: managersQueryKeys.list(),
    queryFn: () => getManagers(),
    placeholderData: (previousData) => previousData,
  })
}

export function useManagerDetailsQuery(managerId: string, enabled = true) {
  return useQuery({
    queryKey: managersQueryKeys.detail(managerId),
    queryFn: () => getManagerById(managerId, { skipErrorToast: true }),
    enabled,
  })
}

export function useCreateManagerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ManagerCreatePayload) => createManager(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: managersQueryKeys.all })
    },
  })
}

export function useDeleteManagerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      managerId,
      requestConfig,
    }: {
      managerId: string
      requestConfig?: ApiRequestConfig
    }) => deleteManager(managerId, requestConfig),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: managersQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: managersQueryKeys.detail(variables.managerId),
      })
    },
  })
}

export function useChangeManagerPasswordMutation() {
  return useMutation({
    mutationFn: ({
      managerId,
      payload,
      requestConfig,
    }: {
      managerId: string
      payload: ManagerPasswordChangePayload
      requestConfig?: ApiRequestConfig
    }) => changeManagerPassword(managerId, payload, requestConfig),
  })
}

