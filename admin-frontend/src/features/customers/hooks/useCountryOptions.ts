import { useMemo } from 'react'
import { getCountryOptions } from '@/features/customers/options/countryOptions'

export function useCountryOptions() {
  return useMemo(() => getCountryOptions(), [])
}
