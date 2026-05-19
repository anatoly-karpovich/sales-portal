import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import type {
  InventoryReservationListItem,
  InventoryReservationType,
} from '@/api/modules/inventory.api'
import { formatDateTime } from '@/utils/date'

type Props = {
  reservation: InventoryReservationListItem
  index: number
  labels: {
    orderPrefix: string
    reservedProductsTitle: string
    reservationDetailsTitle: string
    customerLabel: string
    createdLabel: string
    updatedLabel: string
    expiresAtLabel: string
    noExpiration: string
    reservedQuantityLabel: string
    openOrder: string
    unknownCustomer: string
    unknownVariant: string
  }
}

function resolveTypeColor(type: InventoryReservationType) {
  if (type === 'Order Processing') return 'primary'
  if (type === 'Admin Draft') return 'warning'
  return 'success'
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value).toLocaleString() : '0'
}

function resolveOrderTitle(orderId: string, prefix: string) {
  return `${prefix}${orderId || '-'}`
}

function resolveCustomerLabel(reservation: InventoryReservationListItem, unknownCustomer: string) {
  const customerName = reservation.customer?.name?.trim()
  if (customerName) return customerName
  const customerEmail = reservation.customer?.email?.trim()
  if (customerEmail) return customerEmail
  return unknownCustomer
}

function resolveVariantLabel(variantLabel: string, unknownVariant: string) {
  const normalizedVariantLabel = variantLabel.trim()
  if (!normalizedVariantLabel) return unknownVariant
  return normalizedVariantLabel
}

function DetailRow({
  label,
  value,
  isHighlighted = false,
  testId,
}: {
  label: string
  value: string
  isHighlighted?: boolean
  testId: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 1,
      }}
      data-testid={testId}
    >
      <Typography color="text.primary">{label}</Typography>
      <Typography
        sx={{
          textAlign: 'right',
          color: isHighlighted ? 'error.main' : 'text.primary',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

export function InventoryReservationCard({ reservation, index, labels }: Props) {
  const expiresAtValue = reservation.expiresAt
    ? formatDateTime(reservation.expiresAt)
    : labels.noExpiration

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }} data-testid={`inventory-reservations-card-${index}`}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ pb: 1.25, borderBottom: 1, borderColor: 'divider' }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere' }}
              data-testid={`inventory-reservations-card-${index}-title`}
            >
              {resolveOrderTitle(reservation.orderId, labels.orderPrefix)}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              color={resolveTypeColor(reservation.type)}
              label={reservation.type}
              data-testid={`inventory-reservations-card-${index}-type-chip`}
            />
          </Stack>

          <Button
            component={Link}
            to={`/orders/${reservation.orderId}`}
            variant="outlined"
            sx={{
              alignSelf: { xs: 'flex-start', md: 'center' },
              transform: { md: 'translateY(-2px)' },
            }}
            data-testid={`inventory-reservations-card-${index}-open-order-button`}
          >
            {labels.openOrder}
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(200px, 1fr) minmax(0, 4fr)' },
          }}
          data-testid={`inventory-reservations-card-${index}-body`}
        >
          <Paper
            variant="outlined"
            sx={{ p: 1.25 }}
            data-testid={`inventory-reservations-card-${index}-reservation-details`}
          >
            <Stack spacing={1}>
              <Typography
                sx={{ fontWeight: 700 }}
                data-testid={`inventory-reservations-card-${index}-reservation-details-title`}
              >
                {labels.reservationDetailsTitle}
              </Typography>

              <Stack spacing={0.75}>
                <DetailRow
                  label={labels.customerLabel}
                  value={resolveCustomerLabel(reservation, labels.unknownCustomer)}
                  testId={`inventory-reservations-card-${index}-customer`}
                />
                <DetailRow
                  label={labels.createdLabel}
                  value={formatDateTime(reservation.createdOn)}
                  testId={`inventory-reservations-card-${index}-created-on`}
                />
                <DetailRow
                  label={labels.updatedLabel}
                  value={formatDateTime(reservation.updatedOn)}
                  testId={`inventory-reservations-card-${index}-updated-on`}
                />
                <DetailRow
                  label={labels.expiresAtLabel}
                  value={expiresAtValue}
                  isHighlighted={reservation.isExpired}
                  testId={`inventory-reservations-card-${index}-expires-at`}
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{ p: 1.25 }}
            data-testid={`inventory-reservations-card-${index}-products`}
          >
            <Stack spacing={1}>
              <Typography
                sx={{ fontWeight: 700 }}
                data-testid={`inventory-reservations-card-${index}-products-title`}
              >
                {labels.reservedProductsTitle}
              </Typography>

              <Stack spacing={1}>
                {reservation.items.map((item, itemIndex) => (
                  <Paper
                    variant="outlined"
                    key={`${item.productId}-${item.variantId}-${itemIndex}`}
                    sx={{ px: 1.25, py: 1 }}
                    data-testid={`inventory-reservations-card-${index}-item-${itemIndex}`}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={0.5}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Typography
                        sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                        data-testid={`inventory-reservations-card-${index}-item-${itemIndex}-title`}
                      >
                        {item.productName} | {resolveVariantLabel(item.variantLabel, labels.unknownVariant)}
                      </Typography>
                      <Typography
                        sx={{ fontWeight: 700 }}
                        data-testid={`inventory-reservations-card-${index}-item-${itemIndex}-qty`}
                      >
                        {labels.reservedQuantityLabel} {formatNumber(item.reservedQuantity)}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Paper>
  )
}
