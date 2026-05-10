import { useMemo } from 'react'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'

export function useManufacturerOptions() {
  const { data: settings, isLoading, isFetching } = useSettingsQuery()

  const options = useMemo(() => {
    const fromSettings = settings?.catalog?.manufacturers?.map((item) => item.trim()).filter(Boolean) ?? []

    return [...new Set(fromSettings)].sort((left, right) => left.localeCompare(right))
  }, [settings?.catalog?.manufacturers])

  return {
    options,
    isLoading: isLoading || isFetching,
    isConfigured: options.length > 0,
  }
}
