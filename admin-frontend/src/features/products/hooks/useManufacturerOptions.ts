import { useMemo } from 'react'
import { useSettingsQuery } from '@/features/settings/hooks/useSettingsQuery'
import { getManufacturerOptions } from '@/features/products/options/manufacturerOptions'

export function useManufacturerOptions() {
  const { data: settings } = useSettingsQuery()

  return useMemo(() => {
    const fromSettings =
      settings?.catalog?.manufacturers
        ?.map((item) => item.trim())
        .filter(Boolean) ?? []

    if (fromSettings.length > 0) {
      return [...new Set(fromSettings)].sort((left, right) => left.localeCompare(right))
    }

    return getManufacturerOptions()
  }, [settings?.catalog?.manufacturers])
}
