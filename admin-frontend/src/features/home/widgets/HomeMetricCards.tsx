import { Box, Paper, Stack, Typography } from '@mui/material'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined'
import type { HomeMetricsViewModel } from '@/features/home/mappers/homeMetrics.mapper'

type Props = {
  metricCards: HomeMetricsViewModel['metricCards']
}

export function HomeMetricCards({ metricCards }: Props) {
  const cards = [
    {
      title: 'Orders This Year',
      value: metricCards.ordersThisYear,
      icon: <ShoppingCartOutlinedIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Total Revenue',
      value: metricCards.totalRevenue,
      icon: <AttachMoneyOutlinedIcon fontSize="large" color="primary" />,
    },
    {
      title: 'New Customers',
      value: metricCards.newCustomers,
      icon: <PersonAddAltOutlinedIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Avg Order Value',
      value: metricCards.averageOrderValue,
      icon: <ReceiptLongOutlinedIcon fontSize="large" color="primary" />,
    },
    {
      title: 'Canceled Orders',
      value: metricCards.canceledOrders,
      icon: <HighlightOffOutlinedIcon fontSize="large" color="primary" />,
    },
  ]

  return (
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
      data-testid="home-metric-cards"
    >
      {cards.map((card) => (
        <Paper
          key={card.title}
          sx={{ p: 2.5, height: '100%' }}
          data-testid={`home-metric-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <Stack
            spacing={1}
            alignItems="center"
            textAlign="center"
            data-testid={`home-metric-card-${card.title.toLowerCase().replace(/\s+/g, '-')}-content`}
          >
            {card.icon}
            <Typography
              variant="body2"
              color="text.secondary"
              data-testid={`home-metric-card-${card.title.toLowerCase().replace(/\s+/g, '-')}-title`}
            >
              {card.title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ mt: 0.5, fontWeight: 700 }}
              data-testid={`home-metric-card-${card.title.toLowerCase().replace(/\s+/g, '-')}-value`}
            >
              {card.value}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Box>
  )
}
