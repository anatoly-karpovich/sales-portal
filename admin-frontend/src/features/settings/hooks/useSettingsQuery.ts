import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings, type SettingsUpdatePayload } from '@/api/modules/settings.api'
import type { ApiRequestConfig } from '@/api/types'
import { settingsQueryKeys } from '@/features/settings/hooks/settingsQueryKeys'

export function useSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: settingsQueryKeys.current(),
    queryFn: () => getSettings(),
    enabled,
  })
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      requestConfig,
    }: {
      payload: SettingsUpdatePayload
      requestConfig?: ApiRequestConfig
    }) => updateSettings(payload, requestConfig),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all })
    },
  })
}
