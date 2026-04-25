import { useQuery } from '@tanstack/react-query'
import { getMetrics } from '@/api/modules/metrics.api'

export function useMetricsQuery() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: () => getMetrics(),
    staleTime: 60_000,
  })
}
