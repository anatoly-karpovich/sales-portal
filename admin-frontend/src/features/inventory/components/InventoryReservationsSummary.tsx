import { Paper, Stack, Typography } from '@mui/material'
import type { InventoryReservationsSummary as InventoryReservationsSummaryModel } from '@/api/modules/inventory.api'

type Props = {
  summary: InventoryReservationsSummaryModel
  labels: {
    activeReservations: string
    expiringSoon: string
    processing: string
    reservedUnits: string
  }
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value).toLocaleString() : '0'
}

type SummaryCard = {
  key: 'activeReservations' | 'expiringSoon' | 'processing' | 'reservedUnits'
  value: number
  label: string
}

export function InventoryReservationsSummary({ summary, labels }: Props) {
  const cards: SummaryCard[] = [
    {
      key: 'activeReservations',
      value: summary.activeReservations,
      label: labels.activeReservations,
    },
    {
      key: 'expiringSoon',
      value: summary.expiringSoon,
      label: labels.expiringSoon,
    },
    {
      key: 'processing',
      value: summary.processing,
      label: labels.processing,
    },
    {
      key: 'reservedUnits',
      value: summary.reservedUnits,
      label: labels.reservedUnits,
    },
  ]

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, md: 2 } }}
      data-testid="inventory-reservations-summary"
    >
      <Stack
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        {cards.map((card) => (
          <Paper
            key={card.key}
            variant="outlined"
            sx={{ p: 1.1 }}
            data-testid={`inventory-reservations-summary-${card.key}-card`}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              data-testid={`inventory-reservations-summary-${card.key}-label`}
            >
              {card.label}
            </Typography>
            <Typography
              sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.2 }}
              data-testid={`inventory-reservations-summary-${card.key}-value`}
            >
              {formatNumber(card.value)}
            </Typography>
          </Paper>
        ))}
      </Stack>
    </Paper>
  )
}

