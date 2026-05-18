import { Stack } from '@mui/material'
import { useMemo } from 'react'
import { useMetricsQuery } from '@/features/home/hooks/useMetricsQuery'
import { normalizeMetricsForHome } from '@/features/home/mappers/homeMetrics.mapper'
import { HomeActionCards } from '@/features/home/widgets/HomeActionCards'
import { HomeChartsSection } from '@/features/home/widgets/HomeChartsSection'
import { HomeHeroSection } from '@/features/home/widgets/HomeHeroSection'
import { HomeMetricCards } from '@/features/home/widgets/HomeMetricCards'
import { HomePageSkeleton } from '@/features/home/widgets/HomePageSkeleton'
import { HomeTablesSection } from '@/features/home/widgets/HomeTablesSection'

export function HomePage() {
  const { data, isLoading } = useMetricsQuery()
  const dashboard = useMemo(() => normalizeMetricsForHome(data), [data])

  if (isLoading || !data) {
    return <HomePageSkeleton />
  }

  return (
    <Stack spacing={4} sx={{ maxWidth: 1300, mx: 'auto', width: '100%' }} data-testid="home-page">
      <HomeHeroSection />
      <HomeActionCards />
      <HomeMetricCards metricCards={dashboard.metricCards} />
      <HomeChartsSection charts={dashboard.charts} />
      <HomeTablesSection
        recentOrders={dashboard.recentOrders}
        topCustomers={dashboard.topCustomers}
      />
    </Stack>
  )
}
