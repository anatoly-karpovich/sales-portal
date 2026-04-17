import { BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip as ChartTooltip } from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { Box, Paper, Stack, Typography } from '@mui/material'
import type { HomeMetricsViewModel } from '@/features/home/mappers/homeMetrics.mapper'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ChartTooltip, Legend, Filler)

type Props = {
  charts: HomeMetricsViewModel['charts']
}

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
  plugins: {
    legend: { display: false },
  },
} as const

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
    },
  },
  plugins: {
    legend: { display: false },
  },
} as const

export function HomeChartsSection({ charts }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
      data-testid="home-charts-section"
    >
      <Paper sx={{ p: 2.5 }} data-testid="home-chart-orders-by-day">
        <Box sx={{ height: 280 }} data-testid="home-chart-orders-by-day-canvas">
          <Line
            options={lineOptions}
            data={{
              labels: charts.ordersByDay.labels,
              datasets: [
                {
                  data: charts.ordersByDay.data,
                  borderColor: '#1976d2',
                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  fill: true,
                  tension: 0.3,
                },
              ],
            }}
          />
        </Box>
      </Paper>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center' }} data-testid="home-chart-orders-by-day-description">
        <Stack spacing={1} data-testid="home-chart-orders-by-day-description-content">
          <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="home-chart-orders-by-day-title">
            Orders in Current Month
          </Typography>
          <Typography color="text.secondary" data-testid="home-chart-orders-by-day-text">
            This chart shows the number of orders created by day in the current period. It helps track activity trends.
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center' }} data-testid="home-chart-top-products-description">
        <Stack spacing={1} data-testid="home-chart-top-products-description-content">
          <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="home-chart-top-products-title">
            Top Sold Products
          </Typography>
          <Typography color="text.secondary" data-testid="home-chart-top-products-text">
            This chart displays the top-selling products by sales count. It helps identify strongest performers.
          </Typography>
        </Stack>
      </Box>
      <Paper sx={{ p: 2.5 }} data-testid="home-chart-top-products">
        <Box sx={{ height: 280 }} data-testid="home-chart-top-products-canvas">
          <Bar
            options={barOptions}
            data={{
              labels: charts.topProducts.labels,
              datasets: [
                {
                  data: charts.topProducts.data,
                  backgroundColor: ['#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ef5350'],
                },
              ],
            }}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2.5 }} data-testid="home-chart-customer-growth">
        <Box sx={{ height: 280 }} data-testid="home-chart-customer-growth-canvas">
          <Line
            options={lineOptions}
            data={{
              labels: charts.customerGrowth.labels,
              datasets: [
                {
                  data: charts.customerGrowth.data,
                  borderColor: '#8e24aa',
                  backgroundColor: 'rgba(142, 36, 170, 0.2)',
                  fill: true,
                  tension: 0.3,
                },
              ],
            }}
          />
        </Box>
      </Paper>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center' }} data-testid="home-chart-customer-growth-description">
        <Stack spacing={1} data-testid="home-chart-customer-growth-description-content">
          <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="home-chart-customer-growth-title">
            Customer Growth
          </Typography>
          <Typography color="text.secondary" data-testid="home-chart-customer-growth-text">
            This chart shows new customer registrations over time, so you can monitor growth dynamics.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
