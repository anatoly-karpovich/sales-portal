import { Box, Button, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined'
import { Link } from 'react-router-dom'
import numeral from 'numeral'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useMetricsQuery } from '@/features/home/hooks/useMetricsQuery'
import { formatDateTime } from '@/utils/date'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

function HomePageSkeleton() {
  return (
    <Stack spacing={4} sx={{ maxWidth: 1300, mx: 'auto', width: '100%' }}>
      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={1} alignItems="center">
          <Skeleton variant="text" width="44%" height={54} />
          <Skeleton variant="text" width="62%" height={28} />
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Paper key={`actions-skeleton-${idx}`} sx={{ p: 3 }}>
            <Stack spacing={1.1} alignItems="center">
              <Skeleton variant="circular" width={44} height={44} />
              <Skeleton variant="text" width="50%" height={30} />
              <Skeleton variant="text" width="88%" />
              <Skeleton variant="text" width="75%" />
              <Skeleton variant="rounded" width={120} height={36} />
            </Stack>
          </Paper>
        ))}
      </Box>

      <Stack spacing={1} alignItems="center">
        <Skeleton variant="text" width="34%" height={46} />
        <Skeleton variant="text" width="58%" />
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' } }}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <Paper key={`metrics-skeleton-${idx}`} sx={{ p: 2.5 }}>
            <Stack spacing={1} alignItems="center">
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="text" width="72%" />
              <Skeleton variant="text" width="58%" height={42} />
            </Stack>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <Paper key={`grid-skeleton-${idx}`} sx={{ p: 2.5, minHeight: 280 }}>
            <Skeleton variant="rounded" height={240} />
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {Array.from({ length: 2 }).map((_, idx) => (
          <Paper key={`table-skeleton-${idx}`} sx={{ p: 2.5 }}>
            <Skeleton variant="text" width="44%" height={34} />
            {Array.from({ length: 5 }).map((__, rowIdx) => (
              <Skeleton key={`table-skeleton-${idx}-row-${rowIdx}`} variant="text" width="100%" height={30} />
            ))}
          </Paper>
        ))}
      </Box>
    </Stack>
  )
}

function formatCompactNumber(value: number) {
  return numeral(value).format('0.[0]a')
}

function formatCompactCurrency(value: number) {
  return `$${numeral(value).format('0.[0]a')}`
}

function formatDateFromParts(value: { year: number; month: number; day: number }) {
  const mm = String(value.month).padStart(2, '0')
  const dd = String(value.day).padStart(2, '0')
  return `${value.year}-${mm}-${dd}`
}

export function HomePage() {
  const { data, isLoading } = useMetricsQuery()

  if (isLoading || !data) {
    return <HomePageSkeleton />
  }

  const actionCards = [
    {
      title: 'Orders',
      description: 'Manage and process orders from customers and managers.',
      actionLabel: 'View Orders',
      to: '/orders',
      icon: <ChecklistOutlinedIcon sx={{ fontSize: 44 }} />,
    },
    {
      title: 'Products',
      description: 'Manage and update product listings, including editing and deleting.',
      actionLabel: 'View Products',
      to: '/products',
      icon: <Inventory2OutlinedIcon sx={{ fontSize: 44 }} />,
    },
    {
      title: 'Customers',
      description: 'View and manage customer information and interactions.',
      actionLabel: 'View Customers',
      to: '/customers',
      icon: <PeopleOutlineIcon sx={{ fontSize: 44 }} />,
    },
  ]

  const metricCards = [
    { title: 'Orders This Year', value: formatCompactNumber(data.orders.totalOrders), icon: <ShoppingCartOutlinedIcon fontSize="large" color="primary" /> },
    { title: 'Total Revenue', value: formatCompactCurrency(data.orders.totalRevenue), icon: <AttachMoneyOutlinedIcon fontSize="large" color="primary" /> },
    { title: 'New Customers', value: formatCompactNumber(data.customers.totalNewCustomers), icon: <PersonAddAltOutlinedIcon fontSize="large" color="primary" /> },
    { title: 'Avg Order Value', value: formatCompactCurrency(Math.round(data.orders.averageOrderValue)), icon: <ReceiptLongOutlinedIcon fontSize="large" color="primary" /> },
    { title: 'Canceled Orders', value: formatCompactNumber(data.orders.totalCanceledOrders), icon: <HighlightOffOutlinedIcon fontSize="large" color="primary" /> },
  ]

  const ordersByDayLabels = data.orders.ordersCountPerDay.map((item) => formatDateFromParts(item.date))
  const ordersByDayData = data.orders.ordersCountPerDay.map((item) => item.count)
  const topProductsLabels = data.products.topProducts.map((item) => item.name)
  const topProductsData = data.products.topProducts.map((item) => item.sales)
  const customerGrowthLabels = data.customers.customerGrowth.map((item) => formatDateFromParts(item.date))
  const customerGrowthData = data.customers.customerGrowth.map((item) => item.count)

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

  return (
    <Stack spacing={4} sx={{ maxWidth: 1300, mx: 'auto', width: '100%' }}>
      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={1} alignItems="center" textAlign="center">
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Welcome to Sales Management Portal
          </Typography>
          <Typography color="text.secondary">
            Monitor key metrics, manage orders, and optimize customer interactions - all in one place.
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {actionCards.map((card) => (
          <Paper key={card.title} sx={{ p: 3, textAlign: 'center', display: 'flex' }}>
            <Stack spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
              {card.icon}
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ minHeight: { xs: 'auto', md: 56 } }}>
                {card.description}
              </Typography>
              <Box sx={{ mt: 'auto', pt: 1 }}>
                <Button component={Link} to={card.to} variant="contained" sx={{ textTransform: 'none' }}>
                  {card.actionLabel}
                </Button>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Stack spacing={1} alignItems="center" textAlign="center" sx={{ py: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Business Metrics Overview
        </Typography>
        <Typography color="text.secondary">Here you can track the key metrics and performance indicators of your store.</Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
        }}
      >
        {metricCards.map((card) => (
          <Paper key={card.title} sx={{ p: 2.5, height: '100%' }}>
            <Stack spacing={1} alignItems="center" textAlign="center">
              {card.icon}
              <Typography variant="body2" color="text.secondary">
                {card.title}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
                {card.value}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Box sx={{ height: 280 }}>
            <Line
              options={lineOptions}
              data={{
                labels: ordersByDayLabels,
                datasets: [
                  {
                    data: ordersByDayData,
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
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center' }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Orders in Current Month
            </Typography>
            <Typography color="text.secondary">
              This chart shows the number of orders created by day in the current period. It helps track activity trends.
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center' }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Top Sold Products
            </Typography>
            <Typography color="text.secondary">
              This chart displays the top-selling products by sales count. It helps identify strongest performers.
            </Typography>
          </Stack>
        </Box>
        <Paper sx={{ p: 2.5 }}>
          <Box sx={{ height: 280 }}>
            <Bar
              options={barOptions}
              data={{
                labels: topProductsLabels,
                datasets: [
                  {
                    data: topProductsData,
                    backgroundColor: ['#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ef5350'],
                  },
                ],
              }}
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Box sx={{ height: 280 }}>
            <Line
              options={lineOptions}
              data={{
                labels: customerGrowthLabels,
                datasets: [
                  {
                    data: customerGrowthData,
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
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center' }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Customer Growth
            </Typography>
            <Typography color="text.secondary">
              This chart shows new customer registrations over time, so you can monitor growth dynamics.
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
            Recent Orders
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.orders.recentOrders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order.customer?.name ?? '-'}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>{formatCompactCurrency(order.total_price)}</TableCell>
                  <TableCell>{formatDateTime(order.createdOn)}</TableCell>
                  <TableCell>
                    <Link to="/orders">Open</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
            Top Customers
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Total Spent</TableCell>
                <TableCell>Orders</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.customers.topCustomers.map((customer) => (
                <TableRow key={customer._id}>
                  <TableCell>{customer.customerName}</TableCell>
                  <TableCell>{customer.customerEmail}</TableCell>
                  <TableCell>{formatCompactCurrency(customer.totalSpent)}</TableCell>
                  <TableCell>{customer.ordersCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Stack>
  )
}
