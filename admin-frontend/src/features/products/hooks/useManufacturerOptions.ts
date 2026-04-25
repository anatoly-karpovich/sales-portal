import { useMemo } from 'react'
import { getManufacturerOptions } from '@/features/products/options/manufacturerOptions'

export function useManufacturerOptions() {
  return useMemo(() => getManufacturerOptions(), [])
}
